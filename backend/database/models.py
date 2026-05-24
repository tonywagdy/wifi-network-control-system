import datetime
from backend.database.sqlite_orm import FieldDescriptor, TABLE_MAP

class DBDevice:
    mac = FieldDescriptor('mac')
    ip = FieldDescriptor('ip')
    hostname = FieldDescriptor('hostname')
    vendor = FieldDescriptor('vendor')
    device_type = FieldDescriptor('device_type')
    connection_type = FieldDescriptor('connection_type')
    signal_strength = FieldDescriptor('signal_strength')
    status = FieldDescriptor('status')
    blocked = FieldDescriptor('blocked')
    paused = FieldDescriptor('paused')
    bandwidth_limit = FieldDescriptor('bandwidth_limit')
    is_whitelisted = FieldDescriptor('is_whitelisted')
    is_blacklisted = FieldDescriptor('is_blacklisted')
    nickname = FieldDescriptor('nickname')
    notes = FieldDescriptor('notes')
    first_seen = FieldDescriptor('first_seen')
    last_seen = FieldDescriptor('last_seen')
    current_download_kbps = FieldDescriptor('current_download_kbps')
    current_upload_kbps = FieldDescriptor('current_upload_kbps')

    def __init__(self, **kwargs):
        self.mac = kwargs.get('mac', '')
        self.ip = kwargs.get('ip', '192.168.1.100')
        self.hostname = kwargs.get('hostname', 'unknown-host')
        self.vendor = kwargs.get('vendor', 'Unknown Vendor')
        self.device_type = kwargs.get('device_type', 'unknown')
        self.connection_type = kwargs.get('connection_type', 'wifi')
        self.signal_strength = kwargs.get('signal_strength', None)
        self.status = kwargs.get('status', 'offline')
        self.blocked = bool(kwargs.get('blocked', False))
        self.paused = bool(kwargs.get('paused', False))
        self.bandwidth_limit = int(kwargs.get('bandwidth_limit', 0))
        self.is_whitelisted = bool(kwargs.get('is_whitelisted', False))
        self.is_blacklisted = bool(kwargs.get('is_blacklisted', False))
        self.nickname = kwargs.get('nickname', None)
        self.notes = kwargs.get('notes', None)
        seen_now = datetime.datetime.utcnow()
        self.first_seen = kwargs.get('first_seen', seen_now)
        self.last_seen = kwargs.get('last_seen', seen_now)
        self.current_download_kbps = float(kwargs.get('current_download_kbps', 0.0))
        self.current_upload_kbps = float(kwargs.get('current_upload_kbps', 0.0))

    def to_dict(self):
        return {
            "id": self.mac,
            "mac": self.mac,
            "ip": self.ip,
            "hostname": self.hostname,
            "vendor": self.vendor,
            "deviceType": self.device_type,
            "connectionType": self.connection_type,
            "signalStrength": self.signal_strength,
            "status": self.status,
            "blocked": self.blocked,
            "paused": self.paused,
            "bandwidthLimit": self.bandwidth_limit,
            "isWhiteListed": self.is_whitelisted,
            "isBlackListed": self.is_blacklisted,
            "nickname": self.nickname,
            "notes": self.notes,
            "firstSeen": self.first_seen.isoformat() if isinstance(self.first_seen, datetime.datetime) else self.first_seen,
            "lastSeen": self.last_seen.isoformat() if isinstance(self.last_seen, datetime.datetime) else self.last_seen,
            "currentDownloadKbps": self.current_download_kbps,
            "currentUploadKbps": self.current_upload_kbps
        }

class DBNetworkStats:
    id = FieldDescriptor('id')
    timestamp = FieldDescriptor('timestamp')
    total_devices = FieldDescriptor('total_devices')
    online_devices = FieldDescriptor('online_devices')
    offline_devices = FieldDescriptor('offline_devices')
    blocked_devices = FieldDescriptor('blocked_devices')
    current_download_speed = FieldDescriptor('current_download_speed')
    current_upload_speed = FieldDescriptor('current_upload_speed')
    total_downloaded_mb = FieldDescriptor('total_downloaded_mb')
    total_uploaded_mb = FieldDescriptor('total_uploaded_mb')
    router_ping = FieldDescriptor('router_ping')
    internet_status = FieldDescriptor('internet_status')
    router_model = FieldDescriptor('router_model')
    router_ip = FieldDescriptor('router_ip')
    public_ip = FieldDescriptor('public_ip')
    cpu_usage = FieldDescriptor('cpu_usage')
    ram_usage = FieldDescriptor('ram_usage')

    def __init__(self, **kwargs):
        self.id = kwargs.get('id', 1)
        self.timestamp = kwargs.get('timestamp', datetime.datetime.utcnow())
        self.total_devices = int(kwargs.get('total_devices', 0))
        self.online_devices = int(kwargs.get('online_devices', 0))
        self.offline_devices = int(kwargs.get('offline_devices', 0))
        self.blocked_devices = int(kwargs.get('blocked_devices', 0))
        self.current_download_speed = float(kwargs.get('current_download_speed', 0.0))
        self.current_upload_speed = float(kwargs.get('current_upload_speed', 0.0))
        self.total_downloaded_mb = float(kwargs.get('total_downloaded_mb', 0.0))
        self.total_uploaded_mb = float(kwargs.get('total_uploaded_mb', 0.0))
        self.router_ping = int(kwargs.get('router_ping', 10))
        self.internet_status = kwargs.get('internet_status', 'connected')
        self.router_model = kwargs.get('router_model', 'Cisco Enterprise-X')
        self.router_ip = kwargs.get('router_ip', '192.168.1.1')
        self.public_ip = kwargs.get('public_ip', '203.0.113.82')
        self.cpu_usage = int(kwargs.get('cpu_usage', 5))
        self.ram_usage = int(kwargs.get('ram_usage', 30))

    def to_dict(self):
        return {
            "totalDevices": self.total_devices,
            "onlineDevices": self.online_devices,
            "offlineDevices": self.offline_devices,
            "blockedDevices": self.blocked_devices,
            "currentDownloadSpeed": self.current_download_speed,
            "currentUploadSpeed": self.current_upload_speed,
            "totalDownloadedMb": self.total_downloaded_mb,
            "totalUploadedMb": self.total_uploaded_mb,
            "routerPing": self.router_ping,
            "internetStatus": self.internet_status,
            "routerModel": self.router_model,
            "routerIp": self.router_ip,
            "publicIp": self.public_ip,
            "cpuUsage": self.cpu_usage,
            "ramUsage": self.ram_usage
        }

class DBSystemLog:
    id = FieldDescriptor('id')
    timestamp = FieldDescriptor('timestamp')
    level = FieldDescriptor('level')
    category = FieldDescriptor('category')
    message = FieldDescriptor('message')

    def __init__(self, **kwargs):
        self.id = kwargs.get('id', '')
        self.timestamp = kwargs.get('timestamp', datetime.datetime.utcnow())
        self.level = kwargs.get('level', 'info')
        self.category = kwargs.get('category', 'system')
        self.message = kwargs.get('message', '')

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime.datetime) else self.timestamp,
            "level": self.level,
            "category": self.category,
            "message": self.message
        }

class DBNetworkAlert:
    id = FieldDescriptor('id')
    timestamp = FieldDescriptor('timestamp')
    type = FieldDescriptor('type')
    severity = FieldDescriptor('severity')
    title = FieldDescriptor('title')
    message = FieldDescriptor('message')
    device_mac = FieldDescriptor('device_mac')
    read = FieldDescriptor('read')
    mutated_by_admin = FieldDescriptor('mutated_by_admin')

    def __init__(self, **kwargs):
        self.id = kwargs.get('id', '')
        self.timestamp = kwargs.get('timestamp', datetime.datetime.utcnow())
        self.type = kwargs.get('type', 'new_device')
        self.severity = kwargs.get('severity', 'low')
        self.title = kwargs.get('title', '')
        self.message = kwargs.get('message', '')
        self.device_mac = kwargs.get('device_mac', None)
        self.read = bool(kwargs.get('read', False))
        self.mutated_by_admin = bool(kwargs.get('mutated_by_admin', False))

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime.datetime) else self.timestamp,
            "type": self.type,
            "severity": self.severity,
            "title": self.title,
            "message": self.message,
            "deviceMac": self.device_mac,
            "read": self.read,
            "muatatedByAdmin": self.mutated_by_admin
        }

class DBSystemSettings:
    id = FieldDescriptor('id')
    scan_interval = FieldDescriptor('scan_interval')
    auto_block_unknown = FieldDescriptor('auto_block_unknown')
    enable_alerts = FieldDescriptor('enable_alerts')
    alert_on_new_device = FieldDescriptor('alert_on_new_device')
    alert_on_high_bandwidth = FieldDescriptor('alert_on_high_bandwidth')
    bandwidth_cap_kbps = FieldDescriptor('bandwidth_cap_kbps')
    dark_theme = FieldDescriptor('dark_theme')
    language = FieldDescriptor('language')
    router_ssid = FieldDescriptor('router_ssid')
    router_gateway = FieldDescriptor('router_gateway')
    scan_ip_range = FieldDescriptor('scan_ip_range')

    def __init__(self, **kwargs):
        self.id = kwargs.get('id', 1)
        self.scan_interval = int(kwargs.get('scan_interval', 15))
        self.auto_block_unknown = bool(kwargs.get('auto_block_unknown', False))
        self.enable_alerts = bool(kwargs.get('enable_alerts', True))
        self.alert_on_new_device = bool(kwargs.get('alert_on_new_device', True))
        self.alert_on_high_bandwidth = bool(kwargs.get('alert_on_high_bandwidth', True))
        self.bandwidth_cap_kbps = int(kwargs.get('bandwidth_cap_kbps', 20000))
        self.dark_theme = bool(kwargs.get('dark_theme', True))
        self.language = kwargs.get('language', 'en')
        self.router_ssid = kwargs.get('router_ssid', 'NetControl_Gateway_5G')
        self.router_gateway = kwargs.get('router_gateway', '192.168.1.1')
        self.scan_ip_range = kwargs.get('scan_ip_range', '192.168.1.1/24')

    def to_dict(self):
        return {
            "scanInterval": self.scan_interval,
            "autoBlockUnknown": self.auto_block_unknown,
            "enableAlerts": self.enable_alerts,
            "alertOnNewDevice": self.alert_on_new_device,
            "alertOnHighBandwidth": self.alert_on_high_bandwidth,
            "bandwidthCapKbps": self.bandwidth_cap_kbps,
            "darkTheme": self.dark_theme,
            "language": self.language,
            "routerSsid": self.router_ssid,
            "routerGateway": self.router_gateway,
            "scanIpRange": self.scan_ip_range
        }

class DBWebFilterRule:
    id = FieldDescriptor('id')
    domain = FieldDescriptor('domain')
    category = FieldDescriptor('category')
    action = FieldDescriptor('action')
    active = FieldDescriptor('active')
    added_at = FieldDescriptor('added_at')

    def __init__(self, **kwargs):
        self.id = kwargs.get('id', '')
        self.domain = kwargs.get('domain', '')
        self.category = kwargs.get('category', 'custom')
        self.action = kwargs.get('action', 'block')
        self.active = bool(kwargs.get('active', True))
        self.added_at = kwargs.get('added_at', datetime.datetime.utcnow())

    def to_dict(self):
        return {
            "id": self.id,
            "domain": self.domain,
            "category": self.category,
            "action": self.action,
            "active": self.active,
            "addedAt": self.added_at.isoformat() if isinstance(self.added_at, datetime.datetime) else self.added_at
        }

class DBContentGuardPolicy:
    id = FieldDescriptor('id')
    adult_filtering_enabled = FieldDescriptor('adult_filtering_enabled')
    youtube_quality_ceiling = FieldDescriptor('youtube_quality_ceiling')
    tiktok_limit_enabled = FieldDescriptor('tiktok_limit_enabled')
    facebook_limit_enabled = FieldDescriptor('facebook_limit_enabled')
    tiktok_speed_limit_kbps = FieldDescriptor('tiktok_speed_limit_kbps')
    bedtime_start = FieldDescriptor('bedtime_start')
    bedtime_end = FieldDescriptor('bedtime_end')
    bedtime_enabled = FieldDescriptor('bedtime_enabled')
    default_download_limit_kbps = FieldDescriptor('default_download_limit_kbps')
    default_upload_limit_kbps = FieldDescriptor('default_upload_limit_kbps')
    default_auto_block_new = FieldDescriptor('default_auto_block_new')

    def __init__(self, **kwargs):
        self.id = kwargs.get('id', 1)
        self.adult_filtering_enabled = bool(kwargs.get('adult_filtering_enabled', True))
        self.youtube_quality_ceiling = kwargs.get('youtube_quality_ceiling', '480p')
        self.tiktok_limit_enabled = bool(kwargs.get('tiktok_limit_enabled', True))
        self.facebook_limit_enabled = bool(kwargs.get('facebook_limit_enabled', False))
        self.tiktok_speed_limit_kbps = int(kwargs.get('tiktok_speed_limit_kbps', 800))
        self.bedtime_start = kwargs.get('bedtime_start', '22:00')
        self.bedtime_end = kwargs.get('bedtime_end', '06:00')
        self.bedtime_enabled = bool(kwargs.get('bedtime_enabled', False))
        self.default_download_limit_kbps = int(kwargs.get('default_download_limit_kbps', 0))
        self.default_upload_limit_kbps = int(kwargs.get('default_upload_limit_kbps', 0))
        self.default_auto_block_new = bool(kwargs.get('default_auto_block_new', False))

    def to_dict(self):
        return {
            "adultFilteringEnabled": self.adult_filtering_enabled,
            "youtubeQualityCeiling": self.youtube_quality_ceiling,
            "tiktokLimitEnabled": self.tiktok_limit_enabled,
            "facebookLimitEnabled": self.facebook_limit_enabled,
            "tiktokSpeedLimitKbps": self.tiktok_speed_limit_kbps,
            "bedtimeStart": self.bedtime_start,
            "bedtimeEnd": self.bedtime_end,
            "bedtimeEnabled": self.bedtime_enabled,
            "defaultDownloadLimitKbps": self.default_download_limit_kbps,
            "defaultUploadLimitKbps": self.default_upload_limit_kbps,
            "defaultAutoBlockNew": self.default_auto_block_new
        }

class DBCustomGroup:
    id = FieldDescriptor('id')
    name = FieldDescriptor('name')
    name_ar = FieldDescriptor('name_ar')
    category = FieldDescriptor('category')
    device_macs = FieldDescriptor('device_macs')

    def __init__(self, **kwargs):
        self.id = kwargs.get('id', '')
        self.name = kwargs.get('name', '')
        self.name_ar = kwargs.get('name_ar', '')
        self.category = kwargs.get('category', 'family')
        self.device_macs = kwargs.get('device_macs', '')

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "nameAr": self.name_ar,
            "category": self.category,
            "deviceMacs": [mac.strip() for mac in self.device_macs.split(",") if mac.strip()] if self.device_macs else []
        }

class DBTrafficQuota:
    id = FieldDescriptor('id')
    mac = FieldDescriptor('mac')
    quota_type = FieldDescriptor('quota_type')
    max_mb = FieldDescriptor('max_mb')
    consumed_mb = FieldDescriptor('consumed_mb')
    enabled = FieldDescriptor('enabled')
    action = FieldDescriptor('action')

    def __init__(self, **kwargs):
        self.id = kwargs.get('id', None)
        self.mac = kwargs.get('mac', '')
        self.quota_type = kwargs.get('quota_type', 'daily')
        self.max_mb = int(kwargs.get('max_mb', 2048))
        self.consumed_mb = float(kwargs.get('consumed_mb', 0.0))
        self.enabled = bool(kwargs.get('enabled', True))
        self.action = kwargs.get('action', 'throttle')

    def to_dict(self):
        return {
            "mac": self.mac,
            "quotaType": self.quota_type,
            "maxMb": self.max_mb,
            "consumedMb": self.consumed_mb,
            "enabled": self.enabled,
            "action": self.action
        }

class DBPacketTelemetry:
    id = FieldDescriptor('id')
    timestamp = FieldDescriptor('timestamp')
    protocol = FieldDescriptor('protocol')
    payload_bytes = FieldDescriptor('payload_bytes')
    source_ip = FieldDescriptor('source_ip')
    dest_domain = FieldDescriptor('dest_domain')
    flag = FieldDescriptor('flag')

    def __init__(self, **kwargs):
        self.id = kwargs.get('id', None)
        self.timestamp = kwargs.get('timestamp', datetime.datetime.utcnow())
        self.protocol = kwargs.get('protocol', '')
        self.payload_bytes = int(kwargs.get('payload_bytes', 0))
        self.source_ip = kwargs.get('source_ip', '')
        self.dest_domain = kwargs.get('dest_domain', '')
        self.flag = kwargs.get('flag', None)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime.datetime) else self.timestamp,
            "protocol": self.protocol,
            "payloadBytes": self.payload_bytes,
            "sourceIp": self.source_ip,
            "destDomain": self.dest_domain,
            "flag": self.flag
        }

TABLE_MAP[DBDevice] = 'devices'
TABLE_MAP[DBNetworkStats] = 'network_stats'
TABLE_MAP[DBSystemLog] = 'system_logs'
TABLE_MAP[DBNetworkAlert] = 'network_alerts'
TABLE_MAP[DBSystemSettings] = 'system_settings'
TABLE_MAP[DBWebFilterRule] = 'web_filter_rules'
TABLE_MAP[DBContentGuardPolicy] = 'content_guard_policies'
TABLE_MAP[DBCustomGroup] = 'custom_groups'
TABLE_MAP[DBTrafficQuota] = 'traffic_quotas'
TABLE_MAP[DBPacketTelemetry] = 'packet_telemetries'
