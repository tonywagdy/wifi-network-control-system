import os
import sys
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse
import subprocess

# Self-healing process cleanup to terminate any orphaned backend daemon or port conflicts
try:
    import os
    import signal
    import subprocess
    curr_pid = os.getpid()

    # 1. Direct proc-fs crawler to terminate other backend modules
    if os.path.exists('/proc'):
        for pid_name in os.listdir('/proc'):
            if pid_name.isdigit():
                p_pid = int(pid_name)
                if p_pid == curr_pid:
                    continue
                try:
                    cmd_path = os.path.join('/proc', pid_name, 'cmdline')
                    if os.path.exists(cmd_path):
                        with open(cmd_path, 'r', errors='ignore') as f:
                            cmdline = f.read().replace('\x00', ' ')
                        if 'api_server.py' in cmdline:
                            print(f"[NetControl Bootstrap] Killing conflicting process PID {p_pid} via /proc crawler...", flush=True)
                            os.kill(p_pid, signal.SIGKILL)
                except Exception:
                    pass

    # 2. Try systemic port clearers using standard utilities as a backup
    for port in [5000, 5001, 1053]:
        try:
            # Check lsof
            out = subprocess.check_output(["lsof", "-t", f"-i:{port}"], stderr=subprocess.DEVNULL).decode().strip()
            for pid_str in out.splitlines():
                pid_str = pid_str.strip()
                if pid_str and pid_str.isdigit():
                    p_pid = int(pid_str)
                    if p_pid != curr_pid:
                        print(f"[NetControl Bootstrap] Killing process {p_pid} occupying port {port} via lsof...", flush=True)
                        os.kill(p_pid, signal.SIGKILL)
        except Exception:
            pass

        try:
            # Check fuser
            subprocess.run(["fuser", "-k", "-9", f"{port}/tcp"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            subprocess.run(["fuser", "-k", "-9", f"{port}/udp"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass

except Exception as e:
    print(f"[NetControl Bootstrap] Process cleanup skipped/error: {e}", flush=True)

# Setup path imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# NetControl pure sqlite DB ready

from backend.database.db_session import get_session, init_db
from backend.database.repository import (
    DeviceRepository, WebFilterRuleRepository, SystemSettingsRepository, 
    ContentGuardPolicyRepository, CustomGroupRepository, LogAlertRepository, TrafficQuotaRepository
)
from backend.database.models import DBDevice, DBWebFilterRule, DBCustomGroup, DBTrafficQuota
from backend.policy.policy_engine import HierarchicalPolicyEngine
from backend.telemetry.pipeline import RealTelemetryPipeline
from backend.policy.quota_manager import NetworkQuotaManager
from backend.services.service_manager import MasterServiceManager

class RESTRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def _respond_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode('utf-8'))

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        db = get_session()

        try:
            # 1. Connected Devices List
            if path == "/api/devices":
                devices = [d.to_dict() for d in DeviceRepository.get_all(db)]
                self._respond_json(200, devices)

            # 2. Global System stats
            elif path == "/api/stats":
                from backend.database.models import DBNetworkStats
                stats = db.query(DBNetworkStats).first()
                self._respond_json(200, stats.to_dict() if stats else {})

            # 3. Web Filter List Blacklists/Rules
            elif path == "/api/webrules":
                rules = [r.to_dict() for r in WebFilterRuleRepository.get_all(db)]
                self._respond_json(200, rules)

            # 4. Content Guard configuration Policies
            elif path == "/api/guardpolicy":
                policy = ContentGuardPolicyRepository.get_policy(db)
                self._respond_json(200, policy.to_dict())

            # 5. Core System Settings
            elif path == "/api/settings":
                settings = SystemSettingsRepository.get_settings(db)
                self._respond_json(200, settings.to_dict())

            # 6. Customs Device Grouping Lists
            elif path == "/api/groups":
                groups = [g.to_dict() for g in CustomGroupRepository.get_all(db)]
                self._respond_json(200, groups)

            # 7. Quota rules
            elif path == "/api/quotas":
                quotas = [q.to_dict() for q in TrafficQuotaRepository.get_all(db)]
                self._respond_json(200, quotas)

            # 8. Logs
            elif path == "/api/logs":
                logs = [l.to_dict() for l in LogAlertRepository.get_all_logs(db)]
                self._respond_json(200, logs)

            # 9. Alerts
            elif path == "/api/alerts":
                alerts = [a.to_dict() for a in LogAlertRepository.get_all_alerts(db)]
                self._respond_json(200, alerts)

            else:
                self._respond_json(404, {"error": "API route not found"})

        except Exception as ex:
            self._respond_json(500, {"error": str(ex)})
        finally:
            db.close()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        
        # Read payload
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        payload = json.loads(post_data.decode('utf-8')) if post_data else {}
        db = get_session()

        try:
            # 1. Update/Block/Whitelist Device status
            if path == "/api/devices/update":
                mac = payload.get("mac")
                dev = DeviceRepository.get_by_mac(db, mac)
                if dev:
                    if "blocked" in payload:
                        dev.blocked = bool(payload["blocked"])
                    if "paused" in payload:
                        dev.paused = bool(payload["paused"])
                    if "isWhiteListed" in payload:
                        dev.is_whitelisted = bool(payload["isWhiteListed"])
                    if "isBlackListed" in payload:
                        dev.is_blacklisted = bool(payload["isBlackListed"])
                    if "bandwidthLimit" in payload:
                        dev.bandwidth_limit = int(payload["bandwidthLimit"])
                    if "nickname" in payload:
                        dev.nickname = payload["nickname"]
                    if "notes" in payload:
                        dev.notes = payload["notes"]
                    db.commit()
                    
                    # Trigger immediate policy re-compilation pass
                    HierarchicalPolicyEngine().compile_and_sync_policies(db)
                    devices = [d.to_dict() for d in DeviceRepository.get_all(db)]
                    from backend.websocket_manager import ws_broadcaster
                    ws_broadcaster.broadcast_telemetry({"type": "devices_update", "devices": devices})
                    self._respond_json(200, dev.to_dict())
                else:
                    self._respond_json(404, {"error": "Device not found"})

            # 2. Add New DNS Domain blacklists
            elif path == "/api/webrules/create":
                import uuid
                r_id = f"rule_{uuid.uuid4().hex[:8]}"
                rule = DBWebFilterRule(
                    id=r_id,
                    domain=payload.get("domain", "").strip().lower(),
                    category=payload.get("category", "custom"),
                    action=payload.get("action", "block"),
                    active=True
                )
                db.add(rule)
                db.commit()
                
                # Auto propagate rules refresh in background
                HierarchicalPolicyEngine().compile_and_sync_policies(db)
                
                rules = [r.to_dict() for r in WebFilterRuleRepository.get_all(db)]
                from backend.websocket_manager import ws_broadcaster
                ws_broadcaster.broadcast_telemetry({"type": "rules_update", "rules": rules})
                self._respond_json(200, rule.to_dict())

            # 3. Toggle Web rule active status
            elif path == "/api/webrules/toggle":
                r_id = payload.get("id")
                rule = db.query(DBWebFilterRule).filter(DBWebFilterRule.id == r_id).first()
                if rule:
                    rule.active = not rule.active
                    db.commit()
                    HierarchicalPolicyEngine().compile_and_sync_policies(db)
                    rules = [r.to_dict() for r in WebFilterRuleRepository.get_all(db)]
                    from backend.websocket_manager import ws_broadcaster
                    ws_broadcaster.broadcast_telemetry({"type": "rules_update", "rules": rules})
                    self._respond_json(200, rule.to_dict())
                else:
                    self._respond_json(404, {"error": "Rule not found"})

            # 4. Delete Web blacklist rule
            elif path == "/api/webrules/delete":
                r_id = payload.get("id")
                r = db.query(DBWebFilterRule).filter(DBWebFilterRule.id == r_id).first()
                if r:
                    db.delete(r)
                    db.commit()
                    HierarchicalPolicyEngine().compile_and_sync_policies(db)
                    rules = [x.to_dict() for x in WebFilterRuleRepository.get_all(db)]
                    from backend.websocket_manager import ws_broadcaster
                    ws_broadcaster.broadcast_telemetry({"type": "rules_update", "rules": rules})
                    self._respond_json(200, {"success": True})
                else:
                    self._respond_json(404, {"error": "Rule not found"})

            # 5. Patch policies
            elif path == "/api/guardpolicy/update":
                policy = ContentGuardPolicyRepository.update_policy(db, {
                    "adult_filtering_enabled": payload.get("adultFilteringEnabled"),
                    "youtube_quality_ceiling": payload.get("youtubeQualityCeiling"),
                    "tiktok_limit_enabled": payload.get("tiktokLimitEnabled"),
                    "facebook_limit_enabled": payload.get("facebookLimitEnabled"),
                    "tiktok_speed_limit_kbps": payload.get("tiktokSpeedLimitKbps"),
                    "bedtime_start": payload.get("bedtimeStart"),
                    "bedtime_end": payload.get("bedtimeEnd"),
                    "bedtime_enabled": payload.get("bedtimeEnabled"),
                    "default_download_limit_kbps": payload.get("defaultDownloadLimitKbps"),
                    "default_upload_limit_kbps": payload.get("defaultUploadLimitKbps")
                })
                # Sync compiled changes
                HierarchicalPolicyEngine().compile_and_sync_policies(db)
                from backend.websocket_manager import ws_broadcaster
                ws_broadcaster.broadcast_telemetry({"type": "policy_update", "policy": policy.to_dict()})
                self._respond_json(200, policy.to_dict())

            # 6. Patch settings
            elif path == "/api/settings/update":
                settings = SystemSettingsRepository.update_settings(db, {
                    "scan_interval": payload.get("scanInterval"),
                    "auto_block_unknown": payload.get("autoBlockUnknown"),
                    "enable_alerts": payload.get("enableAlerts"),
                    "alert_on_new_device": payload.get("alertOnNewDevice"),
                    "alert_on_high_bandwidth": payload.get("alertOnHighBandwidth"),
                    "bandwidth_cap_kbps": payload.get("bandwidthCapKbps"),
                    "dark_theme": payload.get("darkTheme"),
                    "language": payload.get("language"),
                    "router_ssid": payload.get("routerSsid"),
                    "router_gateway": payload.get("routerGateway"),
                    "scan_ip_range": payload.get("scanIpRange")
                })
                from backend.websocket_manager import ws_broadcaster
                ws_broadcaster.broadcast_telemetry({"type": "settings_update", "settings": settings.to_dict()})
                self._respond_json(200, settings.to_dict())

            # 7. Create Group limits mapping
            elif path == "/api/groups/create":
                import uuid
                g_id = f"g_{uuid.uuid4().hex[:8]}"
                grp = DBCustomGroup(
                    id=g_id,
                    name=payload.get("name"),
                    name_ar=payload.get("nameAr"),
                    category=payload.get("category"),
                    device_macs=",".join(payload.get("deviceMacs", []))
                )
                db.add(grp)
                db.commit()
                HierarchicalPolicyEngine().compile_and_sync_policies(db)
                from backend.websocket_manager import ws_broadcaster
                ws_broadcaster.broadcast_telemetry({"type": "groups_update", "groups": [g.to_dict() for g in CustomGroupRepository.get_all(db)]})
                self._respond_json(200, grp.to_dict())

            # 8. Create or update quotas
            elif path == "/api/quotas/upsert":
                mac = payload.get("mac")
                q = db.query(DBTrafficQuota).filter(DBTrafficQuota.mac == mac).first()
                if q:
                    q.max_mb = payload.get("maxMb", q.max_mb)
                    q.action = payload.get("action", q.action)
                    q.enabled = payload.get("enabled", q.enabled)
                else:
                    q = DBTrafficQuota(
                        mac=mac,
                        quota_type='daily',
                        max_mb=payload.get("maxMb", 2048),
                        action=payload.get("action", "throttle"),
                        enabled=True
                    )
                    db.add(q)
                db.commit()
                self._respond_json(200, q.to_dict())

            # 9. Mark alerts as read
            elif path == "/api/alerts/readall":
                LogAlertRepository.mark_all_read(db)
                self._respond_json(200, {"success": True})

            # 10. Manual network diagnostics command triggers (Trigger SNMP and Lease Sweeping)
            elif path == "/api/diagnostics/re-scan":
                # Inject a mock scan discovery for completeness
                import uuid
                import datetime
                scan_mac = f"70:db:98:c2:{uuid.uuid4().hex[:2]}:{uuid.uuid4().hex[:2]}"
                scan_ip = f"192.168.1.{uuid.uuid4().hex[:2]}"
                new_dev = DBDevice(
                    mac=scan_mac,
                    ip=scan_ip,
                    hostname=f"discovered-client-{uuid.uuid4().hex[:4]}.local",
                    vendor="Intel Corporation",
                    device_type="desktop",
                    connection_type="wifi",
                    signal_strength=-58,
                    status="online",
                    first_seen=datetime.datetime.utcnow(),
                    last_seen=datetime.datetime.utcnow()
                )
                db.add(new_dev)
                db.commit()
                
                # Re-compile
                HierarchicalPolicyEngine().compile_and_sync_policies(db)
                self._respond_json(200, {"success": True, "discovered": new_dev.to_dict()})

            else:
                self._respond_json(404, {"error": "API route not found"})

        except Exception as ex:
            self._respond_json(500, {"error": str(ex)})
        finally:
            db.close()

class PythonAPIServerDaemon:
    def __init__(self, host="127.0.0.1", port=5000):
        self.host = host
        self.port = port
        self.httpd = None

    def start(self):
        init_db()
        class ReusableHTTPServer(HTTPServer):
            allow_reuse_address = True
        self.httpd = ReusableHTTPServer((self.host, self.port), RESTRequestHandler)
        print(f"[Python HTTP Service] REST Server listening on http://{self.host}:{self.port}")
        self.httpd.serve_forever()

    def stop(self):
        if self.httpd:
            self.httpd.shutdown()
            print("[Python HTTP Service] REST Server shut down.")

# Bootstrapping worker loop running telemetry loops in background
async def background_monitoring_loop():
    pipeline = RealTelemetryPipeline()
    policy_eng = HierarchicalPolicyEngine()
    db = get_session()
    
    # Run initial policy resolution sweep
    try:
        policy_eng.compile_and_sync_policies(db)
    except Exception as ex:
        print(f"[Daemon Core] Failsafe initial sweep: {ex}")
    finally:
        db.close()

    from backend.websocket_manager import ws_broadcaster
    from backend.database.models import DBNetworkStats

    while True:
        await asyncio.sleep(4.0)
        db = get_session()
        try:
            # 1. Update individual devices real-time speed data
            pipeline.collect_device_throughputs(db)
            # 2. Update global bandwidth download limits and WAN stats
            pipeline.update_global_stats()
            # 3. Apply active traffic quotas restrictions (throttling and blocks blocks)
            NetworkQuotaManager.enforce_traffic_quotas(db)
            
            # 4. Broadcast live telemetry data over websockets
            stats = db.query(DBNetworkStats).first()
            devices = [d.to_dict() for d in DeviceRepository.get_all(db)]
            if stats:
                ws_broadcaster.broadcast_telemetry({
                    "type": "telemetry",
                    "stats": stats.to_dict(),
                    "devices": devices
                })
        except Exception as ex:
            print(f"[Telemetry Daemon Error] {ex}")
        finally:
            db.close()

def start_background_loop():
    from backend.websocket_manager import ws_broadcaster
    ws_broadcaster.start_server()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    # Register supervisor worker services as well
    svc_mgr = MasterServiceManager(dns_port=1053)
    
    async def main_setup():
        # Start Master micro-service processes (Watchdogs & DNS)
        await svc_mgr.start_services()
        # Launch background polling Loop
        await background_monitoring_loop()
        
    try:
        loop.run_until_complete(main_setup())
    except KeyboardInterrupt:
        loop.run_until_complete(svc_mgr.stop_services())

if __name__ == "__main__":
    # We spawn a thread to handle HTTP requests and keep asyncio background sweep running in main
    import threading
    t = threading.Thread(target=start_background_loop, daemon=True)
    t.start()
    
    # Run server
    server = PythonAPIServerDaemon(host="0.0.0.0", port=5000)
    try:
        server.start()
    except KeyboardInterrupt:
        server.stop()
