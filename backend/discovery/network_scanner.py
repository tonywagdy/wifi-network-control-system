import os
import subprocess
import re
import socket
import datetime
import asyncio
from backend.database.db_session import get_session
from backend.database.models import DBDevice
from backend.database.repository import DeviceRepository
from backend.websocket_manager import ws_broadcaster

class NetworkScanner:
    def __init__(self, subnet="192.168.1.0/24"):
        self.subnet = subnet
        self.running = False

    async def start(self):
        self.running = True
        print("[NetworkScanner] Real-time device discovery service started.")
        while self.running:
            try:
                self._run_scan()
            except Exception as e:
                print(f"[NetworkScanner] Error during scan: {e}")
            await asyncio.sleep(20)  # Scan every 20 seconds
            
    async def stop(self):
        self.running = False
        print("[NetworkScanner] Stopped.")

    def _run_scan(self):
        devices_found = []
        
        # 1. Try parsing /proc/net/arp (Linux native, works in containers without `arp` utility)
        try:
            if os.path.exists("/proc/net/arp"):
                with open("/proc/net/arp", "r") as f:
                    lines = f.readlines()[1:] # Skip header
                    for line in lines:
                        parts = line.split()
                        if len(parts) >= 4:
                            ip = parts[0]
                            mac = parts[3].lower()
                            if mac != "00:00:00:00:00:00" and not mac.startswith("ff:ff:ff"):
                                devices_found.append({"ip": ip, "mac": mac, "source": "arp_table"})
        except Exception as e:
            print(f"[NetworkScanner] Failed to read /proc/net/arp: {e}")

        # 2. Try `ip neighbor` or `arp -a` if tools exist
        if not devices_found:
            try:
                output = subprocess.check_output(["arp", "-a"]).decode(errors="ignore")
                matches = re.findall(r'(\d{1,3}(?:\.\d{1,3}){3})\s+at\s+([0-9a-fA-F:]{17})', output, re.IGNORECASE)
                if not matches:
                    matches = re.findall(r'(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F-]{17})', output, re.IGNORECASE)
                for ip, mac in matches:
                    mac = mac.replace('-', ':').lower()
                    if mac != "00:00:00:00:00:00" and not mac.startswith("ff:ff:ff"):
                        devices_found.append({"ip": ip, "mac": mac, "source": "arp_cmd"})
            except Exception as e:
                pass

            try:
                if not devices_found:
                    ip_out = subprocess.check_output(["ip", "neighbor"]).decode(errors="ignore")
                    matches = re.findall(r'(\d{1,3}(?:\.\d{1,3}){3})\s+dev\s+\S+\s+lladdr\s+([0-9a-fA-F:]{17})', ip_out, re.IGNORECASE)
                    for ip, mac in matches:
                        mac = mac.lower()
                        if mac != "00:00:00:00:00:00" and not mac.startswith("ff:ff:ff"):
                            devices_found.append({"ip": ip, "mac": mac, "source": "ip_cmd"})
            except Exception as e:
                pass


        # 3. Last fallback: Use Node.js OS module to get true interfaces in rigid container environments
        if not devices_found:
            try:
                import json
                out = subprocess.check_output(["node", "-e", "console.log(JSON.stringify(require('os').networkInterfaces()))"]).decode('utf-8')
                interfaces = json.loads(out)
                for iface_name, addrs in interfaces.items():
                    for addr in addrs:
                        mac = addr.get("mac", "").strip().lower()
                        ip = addr.get("address", "")
                        if mac and mac != "00:00:00:00:00:00":
                            devices_found.append({"ip": ip, "mac": mac, "source": "node_net"})
            except Exception as e:
                print(f"[NetworkScanner] Node.js interface scan failed: {e}")

        # 4. Fallback if absolutely nothing works
        if not devices_found:
            try:
                # Just add local loopback to avoid zero UI issue? No, only REAL. But if we can't find real, we show 0.
                pass
            except Exception:
                pass

        print(f"[NetworkScanner] Found {len(devices_found)} raw MAC entries.")

        # Deduplicate and resolve hostnames
        unique_devices = {}
        for dev in devices_found:
            mac = dev["mac"]
            if mac not in unique_devices:
                ip = dev["ip"]
                if "255.255.255" in ip or ip.startswith("224.") or ip.startswith("239.") or ip.startswith("127."):
                    continue
                
                hostname = "Unknown Device"
                try:
                    socket.setdefaulttimeout(0.1)
                    hostname = socket.gethostbyaddr(ip)[0]
                except Exception:
                    # Generic fallback hostname
                    hostname = f"Device-{ip.split('.')[-1]}"
                
                dev["hostname"] = hostname
                unique_devices[mac] = dev
        
        final_devices = list(unique_devices.values())
        print(f"[NetworkScanner] Processed {len(final_devices)} valid connected devices.")

        # Sync with Database
        db = get_session()
        changed = False
        try:
            for dev_info in final_devices:
                mac = dev_info["mac"]
                ip = dev_info["ip"]
                hostname = dev_info["hostname"]
                
                device = DeviceRepository.get_by_mac(db, mac)
                if device:
                    if device.ip != ip or device.status != "online":
                        changed = True
                        device.ip = ip
                        device.status = "online"
                    device.last_seen = datetime.datetime.utcnow()
                    if hostname != "Unknown Device" and "Device-" not in hostname and device.hostname != hostname:
                        device.hostname = hostname
                        changed = True
                    # Re-add to session to ensure custom ORM commits updates
                    db.add(device)
                else:
                    new_dev = DBDevice(
                        mac=mac,
                        ip=ip,
                        hostname=hostname,
                        vendor="Generic Vendor",
                        device_type="unknown",
                        connection_type="ethernet",
                        status="online",
                        first_seen=datetime.datetime.utcnow(),
                        last_seen=datetime.datetime.utcnow(),
                        nickname=f"Host {ip}"
                    )
                    db.add(new_dev)
                    changed = True
            
            # Offline Checking Check (anything not seen in last 3 minutes is offline)
            cutoff = datetime.datetime.utcnow() - datetime.timedelta(minutes=3)
            all_devs = DeviceRepository.get_all(db)
            
            online_count = 0
            offline_count = 0
            blocked_count = 0
            
            for dev in all_devs:
                if dev.last_seen and dev.last_seen < cutoff and dev.status != "offline":
                    dev.status = "offline"
                    changed = True
                    db.add(dev)
                
                if dev.blocked:
                    blocked_count += 1
                if dev.status == "online":
                    online_count += 1
                else:
                    offline_count += 1

            # Update stats
            from backend.database.models import DBNetworkStats
            stats = db.query(DBNetworkStats).first()
            if stats:
                if (stats.total_devices != len(all_devs) or 
                    stats.online_devices != online_count or
                    stats.offline_devices != offline_count or
                    stats.blocked_devices != blocked_count):
                    stats.total_devices = len(all_devs)
                    stats.online_devices = online_count
                    stats.offline_devices = offline_count
                    stats.blocked_devices = blocked_count
                    changed = True
                    db.add(stats)

            db.commit()

            if changed or True:
                # Force broadcast occasionally to ensure UI is in sync.
                stats_dict = db.query(DBNetworkStats).first().to_dict() if stats else {}
                devices_list = [d.to_dict() for d in DeviceRepository.get_all(db)]
                print(f"[NetworkScanner] Broadcasting updated telemetry state to UI.")
                
                payload = {
                    "type": "telemetry",
                    "stats": stats_dict,
                    "devices": devices_list
                }
                ws_broadcaster.broadcast_telemetry(payload)
                
        except Exception as e:
            db.rollback()
            print(f"[NetworkScanner] DB Sync Error: {e}")
        finally:
            db.close()
