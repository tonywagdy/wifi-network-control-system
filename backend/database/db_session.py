import os
import sqlite3
import datetime
from backend.database.sqlite_orm import SQLiteSession

# Ensure data directory exists
data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data'))
os.makedirs(data_dir, exist_ok=True)

db_path = os.path.join(data_dir, 'netcontrol.db')

def init_db():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # 1. devices
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS devices (
        mac TEXT PRIMARY KEY,
        ip TEXT NOT NULL,
        hostname TEXT NOT NULL,
        vendor TEXT NOT NULL,
        device_type TEXT NOT NULL,
        connection_type TEXT NOT NULL,
        signal_strength INTEGER,
        status TEXT NOT NULL,
        blocked INTEGER NOT NULL DEFAULT 0,
        paused INTEGER NOT NULL DEFAULT 0,
        bandwidth_limit INTEGER NOT NULL DEFAULT 0,
        is_whitelisted INTEGER NOT NULL DEFAULT 0,
        is_blacklisted INTEGER NOT NULL DEFAULT 0,
        nickname TEXT,
        notes TEXT,
        first_seen TEXT,
        last_seen TEXT,
        current_download_kbps REAL NOT NULL DEFAULT 0.0,
        current_upload_kbps REAL NOT NULL DEFAULT 0.0
    );
    """)
    # 2. network_stats
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS network_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        total_devices INTEGER NOT NULL DEFAULT 0,
        online_devices INTEGER NOT NULL DEFAULT 0,
        offline_devices INTEGER NOT NULL DEFAULT 0,
        blocked_devices INTEGER NOT NULL DEFAULT 0,
        current_download_speed REAL NOT NULL DEFAULT 0.0,
        current_upload_speed REAL NOT NULL DEFAULT 0.0,
        total_downloaded_mb REAL NOT NULL DEFAULT 0.0,
        total_uploaded_mb REAL NOT NULL DEFAULT 0.0,
        router_ping INTEGER NOT NULL DEFAULT 10,
        internet_status TEXT NOT NULL DEFAULT 'connected',
        router_model TEXT NOT NULL,
        router_ip TEXT NOT NULL,
        public_ip TEXT NOT NULL,
        cpu_usage INTEGER NOT NULL DEFAULT 5,
        ram_usage INTEGER NOT NULL DEFAULT 30
    );
    """)
    # 3. system_logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        level TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL
    );
    """)
    # 4. network_alerts
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS network_alerts (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        device_mac TEXT,
        "read" INTEGER NOT NULL DEFAULT 0,
        mutated_by_admin INTEGER NOT NULL DEFAULT 0
    );
    """)
    # 5. system_settings
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_interval INTEGER NOT NULL DEFAULT 15,
        auto_block_unknown INTEGER NOT NULL DEFAULT 0,
        enable_alerts INTEGER NOT NULL DEFAULT 1,
        alert_on_new_device INTEGER NOT NULL DEFAULT 1,
        alert_on_high_bandwidth INTEGER NOT NULL DEFAULT 1,
        bandwidth_cap_kbps INTEGER NOT NULL DEFAULT 20000,
        dark_theme INTEGER NOT NULL DEFAULT 1,
        language TEXT NOT NULL DEFAULT 'en',
        router_ssid TEXT NOT NULL,
        router_gateway TEXT NOT NULL,
        scan_ip_range TEXT NOT NULL
    );
    """)
    # 6. web_filter_rules
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS web_filter_rules (
        id TEXT PRIMARY KEY,
        domain TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        action TEXT NOT NULL DEFAULT 'block',
        active INTEGER NOT NULL DEFAULT 1,
        added_at TEXT
    );
    """)
    # 7. content_guard_policies
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS content_guard_policies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adult_filtering_enabled INTEGER NOT NULL DEFAULT 1,
        youtube_quality_ceiling TEXT NOT NULL DEFAULT '480p',
        tiktok_limit_enabled INTEGER NOT NULL DEFAULT 1,
        facebook_limit_enabled INTEGER NOT NULL DEFAULT 0,
        tiktok_speed_limit_kbps INTEGER NOT NULL DEFAULT 800,
        bedtime_start TEXT NOT NULL DEFAULT '22:00',
        bedtime_end TEXT NOT NULL DEFAULT '06:00',
        bedtime_enabled INTEGER NOT NULL DEFAULT 0,
        default_download_limit_kbps INTEGER NOT NULL DEFAULT 0,
        default_upload_limit_kbps INTEGER NOT NULL DEFAULT 0,
        default_auto_block_new INTEGER NOT NULL DEFAULT 0
    );
    """)
    # 8. custom_groups
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS custom_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'family',
        device_macs TEXT NOT NULL DEFAULT ''
    );
    """)
    # 9. traffic_quotas
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS traffic_quotas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mac TEXT NOT NULL,
        quota_type TEXT NOT NULL DEFAULT 'daily',
        max_mb INTEGER NOT NULL DEFAULT 2048,
        consumed_mb REAL NOT NULL DEFAULT 0.0,
        enabled INTEGER NOT NULL DEFAULT 1,
        action TEXT NOT NULL DEFAULT 'throttle'
    );
    """)
    # 10. packet_telemetries
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS packet_telemetries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        protocol TEXT NOT NULL,
        payload_bytes INTEGER NOT NULL,
        source_ip TEXT NOT NULL,
        dest_domain TEXT NOT NULL,
        flag TEXT
    );
    """)
    conn.commit()
    conn.close()
    seed_database()

def get_session():
    return SQLiteSession(db_path)

def seed_database():
    from backend.database.models import (
        DBDevice, DBNetworkStats, DBSystemSettings, DBWebFilterRule, 
        DBContentGuardPolicy, DBCustomGroup, DBTrafficQuota, DBSystemLog, DBNetworkAlert
    )

    session = get_session()
    try:
        # Check if settings exist, if yes, we are seeded
        if session.query(DBSystemSettings).first() is not None:
            return

        print("[Seed] Initializing seed data in local NetControl DB...")

        # 1. System Settings
        settings = DBSystemSettings(
            scan_interval=15,
            auto_block_unknown=False,
            enable_alerts=True,
            alert_on_new_device=True,
            alert_on_high_bandwidth=True,
            bandwidth_cap_kbps=20000,
            dark_theme=True,
            language='en',
            router_ssid='NetControl_Enterprise_5G',
            router_gateway='192.168.1.1',
            scan_ip_range='192.168.1.1/24'
        )
        session.add(settings)

        # 2. Content Guard Policy
        policy = DBContentGuardPolicy(
            adult_filtering_enabled=True,
            youtube_quality_ceiling='480p',
            tiktok_limit_enabled=True,
            facebook_limit_enabled=False,
            tiktok_speed_limit_kbps=800,
            bedtime_start='22:00',
            bedtime_end='06:00',
            bedtime_enabled=False,
            default_download_limit_kbps=0,
            default_upload_limit_kbps=0,
            default_auto_block_new=False
        )
        session.add(policy)

        # 3. Router stats
        stats = DBNetworkStats(
            total_devices=0,
            online_devices=0,
            offline_devices=0,
            blocked_devices=0,
            current_download_speed=0.0,
            current_upload_speed=0.0,
            total_downloaded_mb=0.0,
            total_uploaded_mb=0.0,
            router_ping=0,
            internet_status='connected',
            router_model='Real-time Discovery Node',
            router_ip='192.168.1.1',
            public_ip='203.0.113.82',
            cpu_usage=0,
            ram_usage=0
        )
        session.add(stats)

        # 4. Default Devices
        # Removed all seed data for devices so the interface only uses actual network discovery data.

        # 5. Default Web Rules
        web_rules_data = [
            {"id": "rule_1", "domain": "pornography-example.xxx", "category": "adult", "action": "block", "active": True},
            {"id": "rule_2", "domain": "facebook.com", "category": "social-media", "action": "limit", "active": True},
            {"id": "rule_3", "domain": "tiktok.com", "category": "social-media", "action": "block", "active": False},
            {"id": "rule_4", "domain": "gambling-site.com", "category": "malware", "action": "block", "active": True},
            {"id": "rule_5", "domain": "malicious-spyware.org", "category": "malware", "action": "block", "active": True}
        ]
        for r_info in web_rules_data:
            rule = DBWebFilterRule(
                id=r_info["id"],
                domain=r_info["domain"],
                category=r_info["category"],
                action=r_info["action"],
                active=r_info["active"],
                added_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
            )
            session.add(rule)

        # 6. Default Groups
        groups_data = [
            {"id": "g_1", "name": "Family Devices", "name_ar": "أجهزة العائلة", "category": "family", "macs": "3c:15:c2:d4:ff:09"},
            {"id": "g_2", "name": "Kids Zone", "name_ar": "منطقة الأطفال", "category": "kids", "macs": ""},
            {"id": "g_3", "name": "Office Workspaces", "name_ar": "أجهزة العمل", "category": "work", "macs": "bc:d1:d3:dc:f6:7e"},
            {"id": "g_4", "name": "Guest Subnet", "name_ar": "شبكة الضيوف", "category": "guest", "macs": ""}
        ]
        for g_info in groups_data:
            grp = DBCustomGroup(
                id=g_info["id"],
                name=g_info["name"],
                name_ar=g_info["name_ar"],
                category=g_info["category"],
                device_macs=g_info["macs"]
            )
            session.add(grp)

        # 7. System Logs seeding
        logs_data = [
            {"id": "log_1", "level": "security", "category": "device", "msg": "New device detected at IP 192.168.1.199 with MAC 44:a2:bb:cc:dd:ee. Automatically flagged as suspicious."},
            {"id": "log_2", "level": "warning", "category": "system", "msg": "Admin action initiated: Host with MAC 44:a2:bb:cc:dd:ee placed on local block list."},
            {"id": "log_3", "level": "info", "category": "router", "msg": "Local gateway interface successfully scanned all DHCP clients. 8 devices matched database schema."},
            {"id": "log_4", "level": "info", "category": "traffic", "msg": "Automatic Speedtest completed. Downward Bandwidth: 45.1 Mbps. Upward: 12.2 Mbps. Latency: 14ms."},
            {"id": "log_5", "level": "error", "category": "system", "msg": "Windows raw socket network control driver (Npcap) returned code 0: scanner running in fallback simulation mode."}
        ]
        for l_info in logs_data:
            log = DBSystemLog(
                id=l_info["id"],
                level=l_info["level"],
                category=l_info["category"],
                message=l_info["msg"],
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=2)
            )
            session.add(log)

        # 8. Alerts seeding
        alerts_data = [
            {"id": "alert_1", "type": "new_device", "severity": "high", "title": "Suspicious Device Connected", "msg": "A device with MAC 44:a2:bb:cc:dd:ee and unknown vendor joined the networks.", "mac": "44:a2:bb:cc:dd:ee", "read": False},
            {"id": "alert_2", "type": "high_bandwidth", "severity": "medium", "title": "High Bandwidth Usage Alert", "msg": "Samsung Smart TV is consuming more than 15,000 Kbps (Streaming HD/4K Content).", "mac": "fc:a6:67:89:bc:de", "read": False},
            {"id": "alert_3", "type": "offline", "severity": "low", "title": "LG Smart Fridge Disconnected", "msg": "Smart Fridge is no longer responding to ping sweep. Connection status set to offline.", "mac": "a4:cf:12:0a:3b:cc", "read": True}
        ]
        for a_info in alerts_data:
            alt = DBNetworkAlert(
                id=a_info["id"],
                type=a_info["type"],
                severity=a_info["severity"],
                title=a_info["title"],
                message=a_info["msg"],
                device_mac=a_info["mac"],
                read=a_info["read"],
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=1)
            )
            session.add(alt)

        session.commit()
        print("[Seed] Seeding completed beautifully!")
    except Exception as ex:
        session.rollback()
        print(f"[Seed] Error seeding data: {ex}")
    finally:
        session.close()

if __name__ == "__main__":
    init_db()
