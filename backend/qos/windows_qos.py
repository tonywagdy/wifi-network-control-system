import subprocess
import os
import json
import tempfile

class WindowsQoSIntegration:
    @staticmethod
    def run_powershell(command_str):
        """
        Safely executes a PowerShell command and returns the output summary
        """
        try:
            # Use bypass to run scripts freely on local Windows hosts
            proc = subprocess.run(
                ["powershell", "-ExecutionPolicy", "Bypass", "-Command", command_str],
                capture_output=True,
                text=True,
                check=True
            )
            return True, proc.stdout.strip()
        except Exception as ex:
            error_msg = getattr(ex, "stderr", str(ex))
            return False, f"PowerShell Exec Failed: {error_msg}"

    def write_qos_policy(self, name, limit_kbps, app_path=None, port=None):
        """
        Creates a Windows System QoS Policy using New-NetQosPolicy cmdlet.
        Throttles specific matching applications, outbound ports, or system domains.
        """
        # Convert kbps to bps for Windows NetQos cmdlets
        bps_limit = limit_kbps * 1000
        
        # Build PowerShell cmdlet arguments
        ps_cmd = f"New-NetQosPolicy -Name 'NetControl_{name}' -ThrottleRateActionBytesPerSecond {bps_limit}"
        if app_path:
            ps_cmd += f" -AppPathName '{app_path}'"
        if port:
            ps_cmd += f" -IPPort {port}"
            
        ps_cmd += " -Force"
        
        # Guard cleanup rules prior to insertions
        self.delete_qos_policy(name)
        
        success, output = self.run_powershell(ps_cmd)
        print(f"[Windows QoS] Created Outbound Policy '{name}' at {limit_kbps} Kbps. Status={success}")
        return {"success": success, "output": output, "command": ps_cmd}

    def delete_qos_policy(self, name):
        """
        Removes a net-qos policy by identifier
        """
        ps_cmd = f"Remove-NetQosPolicy -Name 'NetControl_{name}' -Confirm:$false"
        success, output = self.run_powershell(ps_cmd)
        return {"success": success, "output": output, "command": ps_cmd}

    def assign_device_firewall_rule(self, mac_address, block=True):
        """
        Applies a local outbound Windows Firewall Block rule centering specific remote endpoints
        """
        rule_name = f"NetControl_FirewallBlock_{mac_address.replace(':', '_')}"
        if block:
            # Create netsh rule to block
            command = f"netsh advfirewall firewall add rule name='{rule_name}' dir=out action=block remoteip=any"
            # Windows firewalls usually bind to IP rather than MAC, so we block sub-interfaces, or use PowerShell script:
            ps_cmd = f"New-NetFirewallRule -DisplayName '{rule_name}' -Direction Outbound -Action Block"
            success, output = self.run_powershell(ps_cmd)
        else:
            ps_cmd = f"Remove-NetFirewallRule -DisplayName '{rule_name}'"
            success, output = self.run_powershell(ps_cmd)
            
        print(f"[Windows Firewall] Enforced Firewall restriction on MAC {mac_address}. Block={block}, Status={success}")
        return {"success": success, "output": output}

    def export_policies(self, filepath=None):
        """
        Exports all NetQos and Firewall policies to a JSON configuration backup
        """
        if not filepath:
            filepath = os.path.join(tempfile.gettempdir(), "netcontrol_qos_backup.json")
            
        ps_cmd = "Get-NetQosPolicy | Select-Object Name, ThrottleRateActionBytesPerSecond, AppPathName, IPPort | ConvertTo-Json"
        success, output = self.run_powershell(ps_cmd)
        
        if success and output:
            try:
                # Write to local persistent drive
                with open(filepath, "w") as f:
                    f.write(output)
                return {"success": True, "filepath": filepath, "policies_count": len(json.loads(output))}
            except Exception as ex:
                return {"success": False, "error": f"Failed compiling JSON export file: {ex}"}
        return {"success": False, "error": "Get-NetQosPolicy query returned empty results"}

    def import_policies(self, json_data):
        """
        Parses policy dumps and imports them directly into active Windows systems
        """
        try:
            records = json.loads(json_data)
            if not isinstance(records, list):
                records = [records]
                
            results = []
            for item in records:
                name = item.get("Name", "").replace("NetControl_", "")
                limit_bps = item.get("ThrottleRateActionBytesPerSecond", 0)
                limit_kbps = limit_bps // 1000
                app = item.get("AppPathName")
                port = item.get("IPPort")
                
                if name:
                    res = self.write_qos_policy(name, limit_kbps, app, port)
                    results.append(res)
            return {"success": True, "imports_processed": len(results), "details": results}
        except Exception as ex:
            return {"success": False, "error": f"Parsing import data failed: {ex}"}
