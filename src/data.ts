import { Device, NetworkStats, SystemLog, NetworkAlert, SystemSettings, WebFilterRule, ContentGuardPolicy } from './types';

// Let's seed initial devices
export const INITIAL_DEVICES: Device[] = [];

export const INITIAL_STATS: NetworkStats = {
  totalDevices: 0,
  onlineDevices: 0,
  offlineDevices: 0,
  blockedDevices: 0,
  currentDownloadSpeed: 35.91, // Mbps
  currentUploadSpeed: 1.48, // Mbps
  totalDownloadedMb: 128450,
  totalUploadedMb: 14850,
  routerPing: 14,
  internetStatus: "connected",
  routerModel: "Cisco Catalyst 9300 / ISR 4331 WiFi Enterprise Gateway",
  routerIp: "192.168.1.1",
  publicIp: "203.0.113.82",
  cpuUsage: 14,
  ramUsage: 42,
};

export const INITIAL_LOGS: SystemLog[] = [
  {
    id: "log_1",
    timestamp: "2026-05-23T14:45:10Z",
    level: "security",
    category: "device",
    message: "New device detected at IP 192.168.1.199 with MAC 44:a2:bb:cc:dd:ee. Automatically flagged as suspicious.",
  },
  {
    id: "log_2",
    timestamp: "2026-05-23T14:46:11Z",
    level: "warning",
    category: "system",
    message: "Admin action initiated: Host with MAC 44:a2:bb:cc:dd:ee placed on local block list.",
  },
  {
    id: "log_3",
    timestamp: "2026-05-23T15:20:00Z",
    level: "info",
    category: "router",
    message: "Local gateway interface successfully scanned all DHCP clients. 8 devices matched database schema.",
  },
  {
    id: "log_4",
    timestamp: "2026-05-23T18:00:15Z",
    level: "info",
    category: "traffic",
    message: "Automatic Speedtest completed. Downward Bandwidth: 45.1 Mbps. Upward: 12.2 Mbps. Latency: 14ms.",
  },
  {
    id: "log_5",
    timestamp: "2026-05-23T19:12:44Z",
    level: "error",
    category: "system",
    message: "Windows raw socket network control driver (Npcap) returned code 0: scanner running in fallback simulation mode.",
  }
];

export const INITIAL_ALERTS: NetworkAlert[] = [
  {
    id: "alert_1",
    timestamp: "2026-05-23T14:45:10Z",
    type: "new_device",
    severity: "high",
    title: "Suspicious Device Connected",
    message: "A device with MAC 44:a2:bb:cc:dd:ee and unknown vendor joined the networks.",
    deviceMac: "44:a2:bb:cc:dd:ee",
    read: false,
  },
  {
    id: "alert_2",
    timestamp: "2026-05-23T19:00:22Z",
    type: "high_bandwidth",
    severity: "medium",
    title: "High Bandwidth Usage Alert",
    message: "Samsung Smart TV is consuming more than 15,000 Kbps (Streaming HD/4K Content).",
    deviceMac: "fc:a6:67:89:bc:de",
    read: false,
  },
  {
    id: "alert_3",
    timestamp: "2026-05-23T19:10:00Z",
    type: "offline",
    severity: "low",
    title: "LG Smart Fridge Disconnected",
    message: "Smart Fridge is no longer responding to ping sweep. Connection status set to offline.",
    deviceMac: "a4:cf:12:0a:3b:cc",
    read: true,
  }
];

export const INITIAL_SETTINGS: SystemSettings = {
  scanInterval: 15,
  autoBlockUnknown: false,
  enableAlerts: true,
  alertOnNewDevice: true,
  alertOnHighBandwidth: true,
  bandwidthCapKbps: 20000,
  darkTheme: true,
  language: "en",
  routerSsid: "Enigma_Enterprise_5G",
  routerGateway: "192.168.1.1",
  scanIpRange: "192.168.1.1/24"
};

export const INITIAL_WEB_RULES: WebFilterRule[] = [
  { id: "rule_1", domain: "pornography-example.xxx", category: "adult", action: "block", active: true, addedAt: "2026-05-21T08:00:00Z" },
  { id: "rule_2", domain: "facebook.com", category: "social-media", action: "limit", active: true, addedAt: "2026-05-22T09:15:00Z" },
  { id: "rule_3", domain: "tiktok.com", category: "social-media", action: "block", active: false, addedAt: "2026-05-22T10:30:00Z" },
  { id: "rule_4", domain: "gambling-site.com", category: "malware", action: "block", active: true, addedAt: "2026-05-23T11:00:00Z" },
  { id: "rule_5", domain: "malicious-spyware.org", category: "malware", action: "block", active: true, addedAt: "2026-05-23T12:00:00Z" }
];

export const INITIAL_GUARD_POLICY: ContentGuardPolicy = {
  adultFilteringEnabled: true,
  youtubeQualityCeiling: "480p",
  tiktokLimitEnabled: true,
  facebookLimitEnabled: false,
  tiktokSpeedLimitKbps: 800,
  bedtimeStart: "22:00",
  bedtimeEnd: "06:00",
  bedtimeEnabled: false,
  defaultDownloadLimitKbps: 0,
  defaultUploadLimitKbps: 0,
  defaultAutoBlockNew: false
};
