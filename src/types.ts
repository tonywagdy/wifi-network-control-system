export interface Device {
  id: string; // MAC address as unique ID
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  deviceType: 'desktop' | 'mobile' | 'smart-tv' | 'iot' | 'router' | 'game-console' | 'printer' | 'unknown';
  connectionType: 'wifi' | 'ethernet';
  signalStrength?: number; // dBm, e.g. -45
  status: 'online' | 'offline';
  blocked: boolean;
  paused: boolean;
  pauseDurationActive?: boolean;
  pauseTimeRemaining?: number; // seconds
  bandwidthLimit: number; // kbps, 0 means unlimited
  isWhiteListed: boolean;
  isBlackListed: boolean;
  nickname?: string;
  notes?: string;
  firstSeen: string;
  lastSeen: string;
  currentDownloadKbps: number;
  currentUploadKbps: number;
}

export interface NetworkStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  blockedDevices: number;
  currentDownloadSpeed: number; // Mbps
  currentUploadSpeed: number; // Mbps
  totalDownloadedMb: number;
  totalUploadedMb: number;
  routerPing: number; // ms
  internetStatus: 'connected' | 'disconnected' | 'limited';
  routerModel: string;
  routerIp: string;
  publicIp: string;
  cpuUsage: number;
  ramUsage: number;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'security';
  category: 'system' | 'auth' | 'device' | 'traffic' | 'router';
  message: string;
}

export interface NetworkAlert {
  id: string;
  timestamp: string;
  type: 'new_device' | 'high_bandwidth' | 'suspicious_activity' | 'offline' | 'disconnect';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  deviceMac?: string;
  read: boolean;
  muatatedByAdmin?: boolean;
}

export interface SystemSettings {
  scanInterval: number; // seconds
  autoBlockUnknown: boolean;
  enableAlerts: boolean;
  alertOnNewDevice: boolean;
  alertOnHighBandwidth: boolean;
  bandwidthCapKbps: number; // threshold for alerts
  darkTheme: boolean;
  language: 'en' | 'ar';
  routerSsid: string;
  routerGateway: string;
  scanIpRange: string;
}

export interface WebFilterRule {
  id: string;
  domain: string;
  category: 'malware' | 'social-media' | 'adult' | 'distraction' | 'custom';
  action: 'block' | 'bypass' | 'limit';
  active: boolean;
  addedAt: string;
}

export interface ContentGuardPolicy {
  adultFilteringEnabled: boolean;
  youtubeQualityCeiling: 'auto' | '1080p' | '720p' | '480p' | '240p';
  tiktokLimitEnabled: boolean;
  facebookLimitEnabled: boolean;
  tiktokSpeedLimitKbps: number;
  bedtimeStart: string; // e.g., "22:00"
  bedtimeEnd: string;   // e.g., "06:00"
  bedtimeEnabled: boolean;
  defaultDownloadLimitKbps: number;
  defaultUploadLimitKbps: number;
  defaultAutoBlockNew: boolean;
}

export interface UserSession {
  token: string;
  role: 'admin' | 'viewer';
  username: string;
}
