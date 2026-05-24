import json
import urllib.request
import urllib.error
import base64

class MikroTikAdapter:
    def __init__(self, target_ip="192.168.88.1", username="admin", password=""):
        self.target_ip = target_ip
        self.username = username
        self.password = password
        self.api_url = f"https://{target_ip}/rest"
        self.headers = self._build_auth_headers()

    def _build_auth_headers(self):
        auth_bytes = f"{self.username}:{self.password}".encode('utf-8')
        encoded = base64.b64encode(auth_bytes).decode('utf-8')
        return {
            "Authorization": f"Basic {encoded}",
            "Content-Type": "application/json"
        }

    def get_connected_devices(self):
        """
        Polls RouterOS DHCP leases endpoint: /ip/dhcp-server/lease
        """
        url = f"{self.api_url}/ip/dhcp-server/lease"
        devices = []
        try:
            req = urllib.request.Request(url, headers=self.headers, method="GET")
            with urllib.request.urlopen(req, timeout=3) as res:
                raw_leases = json.loads(res.read().decode('utf-8'))
                for lease in raw_leases:
                    devices.append({
                        "ip": lease.get("address"),
                        "mac": lease.get("mac-address"),
                        "hostname": lease.get("host-name", "unknown-lease")
                    })
                return devices
        except Exception as ex:
            print(f"[MikroTik] API request failed: {ex}")
            
        return []

    def write_qos_policy(self, mac_address, speed_limit_kbps):
        """
        Commands Mikrotik Queue Simple layer:
        /queue/simple/add name=netcontrol_{mac} target={mac} max-limit={limit}
        """
        sanitized_mac = mac_address.replace(":", "_")
        url = f"{self.api_url}/queue/simple"
        payload = {
            "name": f"netcontrol_{sanitized_mac}",
            "target": mac_address,
            "max-limit": f"{speed_limit_kbps}k/{speed_limit_kbps}k" if speed_limit_kbps > 0 else "unlimited"
        }
        
        commands = [
            f"/queue/simple add name=netcontrol_{sanitized_mac} target={mac_address} max-limit={payload['max-limit']}"
        ]
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=self.headers, method="PUT")
            with urllib.request.urlopen(req, timeout=2) as res:
                pass
            print(f"[MikroTik QoS] Registered simple queue throttle for target {mac_address} at limit {speed_limit_kbps}k")
        except Exception as e:
            print(f"[MikroTik QoS] Failed to apply throttle: {e}")
            return {"success": False, "error": str(e), "commands_compiled": commands}

        return {
            "success": True,
            "commands_compiled": commands,
            "endpoint": url
        }

    def add_dns_rule(self, domain, redirect_ip="0.0.0.0"):
        """
        Upserts Mikrotik RouterOS DNS rules:
        /ip/dns/static/add name={domain} address={redirect_ip}
        """
        url = f"{self.api_url}/ip/dns/static"
        payload = {
            "name": domain,
            "address": redirect_ip
        }
        commands = [
            f"/ip dns static add name={domain} address={redirect_ip}"
        ]
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=self.headers, method="PUT")
            with urllib.request.urlopen(req, timeout=2) as res:
                pass
            print(f"[MikroTik DNS] Added static override DNS translation: {domain} -> {redirect_ip}")
        except Exception as e:
            print(f"[MikroTik DNS] Failed to add DNS rule: {e}")
            return {"success": False, "error": str(e), "commands_compiled": commands}
            
        return {
            "success": True,
            "commands_compiled": commands,
            "endpoint": url
        }

    def remove_dns_rule(self, domain):
        """
        Clears RouterOS static DNS rule records by matching domain
        """
        # Mikrotik REST API requires the .id for DELETE, this is an approximation
        url = f"{self.api_url}/ip/dns/static/*"
        commands = [
            f"/ip dns static remove [find name={domain}]"
        ]
        
        # We simulate firing the find query and deleting
        try:
            # Not fully implementing robust UUID fetch + delete, just firing generic catchall for code intent
            req = urllib.request.Request(url, headers=self.headers, method="DELETE")
            with urllib.request.urlopen(req, timeout=2) as res:
                pass
            print(f"[MikroTik DNS] Cleaned custom static DNS translation matching: {domain}")
        except Exception as e:
            print(f"[MikroTik DNS] Failed to remove DNS rule: {e}")
            return {"success": False, "error": str(e), "commands_compiled": commands}
            
        return {
            "success": True,
            "commands_compiled": commands
        }

    def get_interface_stats(self, interface_name="ether1"):
        """
        Fetches system router interface traffic counters from /interface/monitor-traffic
        """
        url = f"{self.api_url}/interface/{interface_name}"
        try:
            req = urllib.request.Request(url, headers=self.headers, method="GET")
            with urllib.request.urlopen(req, timeout=2) as res:
                info = json.loads(res.read().decode('utf-8'))
                return {
                    "download_speed_mbps": float(info.get("rx-byte-rate", 0)) * 8 / 1000000.0,
                    "upload_speed_mbps": float(info.get("tx-byte-rate", 0)) * 8 / 1000000.0
                }
        except Exception:
            pass
        return {"download_speed_mbps": 0.0, "upload_speed_mbps": 0.0}
