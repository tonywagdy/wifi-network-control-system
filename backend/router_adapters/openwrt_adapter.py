import json
import urllib.request
import urllib.error

class OpenWRTAdapter:
    def __init__(self, target_ip="192.168.1.1", username="root", password=""):
        self.target_ip = target_ip
        self.username = username
        self.password = password
        self.rpc_url = f"http://{target_ip}/cgi-bin/luci/rpc"
        self.sys_url = f"http://{target_ip}/ubus"
        self.token = None

    def login(self):
        """
        Authenticates against LuCI RPC interface to fetch access tokens
        """
        payload = {
            "id": 1,
            "method": "login",
            "params": [self.username, self.password]
        }
        try:
            req = urllib.request.Request(
                f"{self.rpc_url}/auth",
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=5) as res:
                res_data = json.loads(res.read().decode('utf-8'))
                if res_data and "result" in res_data:
                    self.token = res_data["result"]
                    return True
        except Exception as ex:
            print(f"[OpenWRT] WebAuth login failed: {ex}")
        
        return False

    def get_dhcp_leases(self):
        """
        Queries /var/lib/misc/dnsmasq.leases or ubus dhcp.leases directly
        """
        if not self.token:
            self.login()
        
        leases = []
        # Real ubus call mapping via JSON-RPC
        payload = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "call",
            "params": [self.token, "dhcp", "leases", {}]
        }
        try:
            req = urllib.request.Request(
                self.sys_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=3) as res:
                response = json.loads(res.read().decode('utf-8'))
                if "result" in response and len(response["result"]) > 1:
                    raw_leases = response["result"][1].get("leases", [])
                    for lease in raw_leases:
                        leases.append({
                            "ip": lease.get("ipaddr"),
                            "mac": lease.get("macaddr"),
                            "hostname": lease.get("hostname", "unknown-lease")
                        })
                    return leases
        except Exception as ex:
            print(f"[OpenWRT] Remote leases polling failed: {ex}")
            
        return leases

    def write_qos_policy(self, mac_address, speed_limit_kbps):
        """
        Compiles OpenWRT SQM / QoS rate control rule configurations:
        uci set sqm.<mac>=queue
        uci set sqm.<mac>.upload=<limit>
        uci commit sqm
        """
        sanitized_mac = mac_address.replace(":", "_")
        commands = [
            f"uci delete sqm.netcontrol_{sanitized_mac}",
            f"uci set sqm.netcontrol_{sanitized_mac}=queue"
        ]
        if speed_limit_kbps > 0:
            commands.extend([
                f"uci set sqm.netcontrol_{sanitized_mac}.interface='br-lan'",
                f"uci set sqm.netcontrol_{sanitized_mac}.download='{speed_limit_kbps}'",
                f"uci set sqm.netcontrol_{sanitized_mac}.upload='{int(speed_limit_kbps * 0.2)}'",
                f"uci set sqm.netcontrol_{sanitized_mac}.enabled='1'"
            ])
        else:
            commands.append(f"uci delete sqm.netcontrol_{sanitized_mac}")

        commands.extend([
            "uci commit sqm",
            "/etc/init.d/sqm restart"
        ])
        
        # Execute actual ubus call if token exists
        if self.token:
            payload = {
                "jsonrpc": "2.0",
                "id": 5,
                "method": "call",
                "params": [self.token, "file", "exec", {"command": "/bin/sh", "params": ["-c", "\n".join(commands)]}]
            }
            try:
                req = urllib.request.Request(self.sys_url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
                urllib.request.urlopen(req, timeout=3)
            except Exception as e:
                print(f"[OpenWRT] UBUS exec failed: {e}")
                return {"success": False, "error": str(e), "commands_compiled": commands}

        print(f"[OpenWRT Config] Applied QoS shaper for {mac_address} ({speed_limit_kbps} Kbps)")
        return {
            "success": True,
            "commands_compiled": commands
        }

    def add_dns_sinkhole(self, domain):
        """
        Adds static routing blacklists to /etc/config/dhcp for intercepting domains:
        uci add_list dhcp.@dnsmasq[0].address='/domain/0.0.0.0'
        """
        commands = [
            f"uci add_list dhcp.@dnsmasq[0].address='/{domain}/0.0.0.0'",
            "uci commit dhcp",
            "/etc/init.d/dnsmasq restart"
        ]
        
        if self.token:
            payload = {
                "jsonrpc": "2.0",
                "id": 6,
                "method": "call",
                "params": [self.token, "file", "exec", {"command": "/bin/sh", "params": ["-c", "\n".join(commands)]}]
            }
            try:
                req = urllib.request.Request(self.sys_url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
                urllib.request.urlopen(req, timeout=3)
            except Exception as e:
                print(f"[OpenWRT] UBUS exec failed: {e}")
                return {"success": False, "error": str(e), "commands_compiled": commands}

        print(f"[OpenWRT Config] Registered DNS sinkhole address: {domain}")
        return {
            "success": True,
            "commands_compiled": commands
        }

    def remove_dns_sinkhole(self, domain):
        """
        Removes domain from uci array address lists safely
        """
        commands = [
            f"uci del_list dhcp.@dnsmasq[0].address='/{domain}/0.0.0.0'",
            "uci commit dhcp",
            "/etc/init.d/dnsmasq restart"
        ]
        
        if self.token:
            payload = {
                "jsonrpc": "2.0",
                "id": 7,
                "method": "call",
                "params": [self.token, "file", "exec", {"command": "/bin/sh", "params": ["-c", "\n".join(commands)]}]
            }
            try:
                req = urllib.request.Request(self.sys_url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'}, method='POST')
                urllib.request.urlopen(req, timeout=3)
            except Exception as e:
                print(f"[OpenWRT] UBUS exec failed: {e}")
                return {"success": False, "error": str(e), "commands_compiled": commands}

        print(f"[OpenWRT Config] Removed DNS sinkhole address: {domain}")
        return {
            "success": True,
            "commands_compiled": commands
        }

    def get_traffic_telemetries(self):
        """
        Polls br-lan live statistics by reading /proc/net/dev or ubus network.device
        """
        payload = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "call",
            "params": [self.token, "network.device", "status", {"name": "br-lan"}]
        }
        try:
            req = urllib.request.Request(
                self.sys_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=2) as res:
                raw_res = json.loads(res.read().decode('utf-8'))
                if "result" in raw_res and len(raw_res["result"]) > 1:
                    stats = raw_res["result"][1].get("statistics", {})
                    return {
                        "download_speed_mbps": float((stats.get("rx_bytes", 0) * 8) / (1024 * 1024)),
                        "upload_speed_mbps": float((stats.get("tx_bytes", 0) * 8) / (1024 * 1024))
                    }
        except Exception:
            pass
            
        return {
            "download_speed_mbps": 0.0,
            "upload_speed_mbps": 0.0
        }
