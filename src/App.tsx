import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DevicesList from './components/DevicesList';
import ContentGuard from './components/ContentGuard';
import Analytics from './components/Analytics';
import Alerts from './components/Alerts';
import Settings from './components/Settings';
import RouterSync from './components/RouterSync';
import SystemLogs from './components/SystemLogs';
import Login from './components/Login';

import { Device, NetworkStats, SystemLog, NetworkAlert, SystemSettings, WebFilterRule, ContentGuardPolicy } from './types';
import {
  INITIAL_DEVICES,
  INITIAL_STATS,
  INITIAL_LOGS,
  INITIAL_ALERTS,
  INITIAL_SETTINGS,
  INITIAL_WEB_RULES,
  INITIAL_GUARD_POLICY
} from './data';

import { Bell, User, LogOut, ShieldAlert, Globe, Languages } from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lang, setLang] = useState<'en' | 'ar'>('en');

  // Core application state with LocalStorage persistence layer
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<NetworkStats>(INITIAL_STATS);
  const [logs, setLogs] = useState<SystemLog[]>(() => {
    const cached = localStorage.getItem('NET_GATEWAY_LOGS');
    return cached ? JSON.parse(cached) : INITIAL_LOGS;
  });
  const [alerts, setAlerts] = useState<NetworkAlert[]>(() => {
    const cached = localStorage.getItem('NET_GATEWAY_ALERTS');
    return cached ? JSON.parse(cached) : INITIAL_ALERTS;
  });
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const cached = localStorage.getItem('NET_GATEWAY_SETTINGS');
    return cached ? JSON.parse(cached) : INITIAL_SETTINGS;
  });
  const [webRules, setWebRules] = useState<WebFilterRule[]>(() => {
    const cached = localStorage.getItem('NET_GATEWAY_WEBRULES');
    return cached ? JSON.parse(cached) : INITIAL_WEB_RULES;
  });
  const [policy, setPolicy] = useState<ContentGuardPolicy>(() => {
    const cached = localStorage.getItem('NET_GATEWAY_POLICY');
    return cached ? JSON.parse(cached) : INITIAL_GUARD_POLICY;
  });

  // Server-side active synchronization engine & WebSocket connector
  useEffect(() => {
    let ws: WebSocket | null = null;
    let pollInterval: any = null;

    const startPolling = () => {
      if (pollInterval) return;
      console.log('Establishing REST polling backup channel...');
      const fetchAllData = async () => {
        try {
          const [devsRes, statsRes, rulesRes, policyRes, settingsRes, logsRes, alertsRes] = await Promise.all([
            fetch('/api/devices'),
            fetch('/api/stats'),
            fetch('/api/webrules'),
            fetch('/api/guardpolicy'),
            fetch('/api/settings'),
            fetch('/api/logs'),
            fetch('/api/alerts')
          ]);
          
          if (devsRes.ok) setDevices(await devsRes.json());
          if (statsRes.ok) setStats(await statsRes.json());
          if (rulesRes.ok) setWebRules(await rulesRes.json());
          if (policyRes.ok) setPolicy(await policyRes.json());
          if (settingsRes.ok) setSettings(await settingsRes.json());
          if (logsRes.ok) setLogs(await logsRes.json());
          if (alertsRes.ok) setAlerts(await alertsRes.json());
        } catch (err) {
          console.warn('REST API service not ready yet.', err);
        }
      };
      fetchAllData();
      pollInterval = setInterval(fetchAllData, 3500);
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);

        ws.onopen = () => {
          console.log('[WebSocket Handshake] Connected securely. Transitioning to real-time stream active...');
          stopPolling();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'telemetry') {
              if (data.stats) setStats(data.stats);
              if (data.devices) setDevices(data.devices);
            } else if (data.type === 'devices_update') {
              setDevices(data.devices);
            } else if (data.type === 'rules_update') {
              setWebRules(data.rules);
            } else if (data.type === 'policy_update') {
              setPolicy(data.policy);
            } else if (data.type === 'settings_update') {
              setSettings(data.settings);
            } else if (data.type === 'groups_update') {
              // we don't store groups explicitly in state here but if needed in future
            }
          } catch (e) {
            console.error('Error decoding WebSocket frame data:', e);
          }
        };

        ws.onclose = () => {
          console.warn('[WebSocket Handshake] Stream closed. Activating REST polling fallback...');
          startPolling();
          setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (err) {
        startPolling();
      }
    };

    connectWebSocket();

    return () => {
      stopPolling();
      if (ws) ws.close();
    };
  }, []);

  const syncDeviceToBackend = async (mac: string, patch: any) => {
    try {
      const res = await fetch('/api/devices/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac, ...patch })
      });
      if (res.ok) {
        const updated = await res.json();
        setDevices(prev => prev.map(d => d.mac === mac ? updated : d));
      }
    } catch (err) {
      console.error('API Sync Error updating device:', err);
    }
  };

  // Bandwidth history logs
  const [bandwidthHistory, setBandwidthHistory] = useState<{ time: string; download: number; upload: number }[]>([]);

  // Update bandwidth graph from real backend stats whenever they change
  useEffect(() => {
    if (!stats || (stats.currentDownloadSpeed === 0 && stats.currentUploadSpeed === 0 && bandwidthHistory.length === 0)) return;
    
    setBandwidthHistory((prev) => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour12: false });
      
      const nextDl = stats.currentDownloadSpeed * 1024; // convert to Kbps for the graph scale
      const nextUl = stats.currentUploadSpeed * 1024;

      const newEntry = { time: timeStr, download: nextDl, upload: nextUl };
      
      // Limit to 20 data points
      const nextHist = [...prev, newEntry];
      if (nextHist.length > 20) {
        return nextHist.slice(1);
      }
      return nextHist;
    });
  }, [stats.currentDownloadSpeed, stats.currentUploadSpeed]);

  // Quick manually triggered Network scan
  const triggerScan = () => {
    // Write starting scan log line
    const startTimestamp = new Date().toISOString();
    const newLogs: SystemLog[] = [
      {
        id: `log_${Date.now()}`,
        timestamp: startTimestamp,
        level: 'info',
        category: 'system',
        message: `Network controller sweep triggered manually over subnet target: ${settings.scanIpRange}`,
      },
    ];

    setLogs((prev) => [newLogs[0], ...prev]);

    // Perform actual API ping instead of faking it
    setTimeout(() => {
      fetch('/api/devices')
        .then(async res => {
          if (!res.ok) throw new Error("API not ready");
          return res.json();
        })
        .then(realDevices => {
           setDevices(realDevices);
           const finishLogs: SystemLog[] = [
             {
               id: `log_${Date.now()}_end`,
               timestamp: new Date().toISOString(),
               level: 'info',
               category: 'system',
               message: `Manual network scan completed successfully. Real devices re-synced.`,
             },
           ];
           setLogs((prev) => [finishLogs[0], ...prev]);
        })
        .catch(err => {
           console.warn("Scan deferred: Backend API stabilizing");
        });
    }, 2000);
  };

  // Block handler
  const handleToggleBlock = (mac: string) => {
    const dev = devices.find(d => d.mac === mac);
    if (!dev) return;
    const nextBlocked = !dev.blocked;
    setDevices(prev => prev.map(d => d.mac === mac ? { ...d, blocked: nextBlocked } : d));
    syncDeviceToBackend(mac, { blocked: nextBlocked });
  };

  // Pause temporary internet connection
  const handleTogglePause = (mac: string) => {
    const dev = devices.find(d => d.mac === mac);
    if (!dev) return;
    const nextPaused = !dev.paused;
    setDevices(prev => prev.map(d => d.mac === mac ? { ...d, paused: nextPaused } : d));
    syncDeviceToBackend(mac, { paused: nextPaused });
  };

  // Whitelist toggle
  const handleToggleWhitelist = (mac: string) => {
    const dev = devices.find(d => d.mac === mac);
    if (!dev) return;
    const nextVal = !dev.isWhiteListed;
    setDevices(prev => prev.map(d => d.mac === mac ? { ...d, isWhiteListed: nextVal, isBlackListed: false } : d));
    syncDeviceToBackend(mac, { isWhiteListed: nextVal, isBlackListed: false });
  };

  // Blacklist toggle
  const handleToggleBlacklist = (mac: string) => {
    const dev = devices.find(d => d.mac === mac);
    if (!dev) return;
    const nextVal = !dev.isBlackListed;
    setDevices(prev => prev.map(d => d.mac === mac ? { ...d, isBlackListed: nextVal, isWhiteListed: false } : d));
    syncDeviceToBackend(mac, { isBlackListed: nextVal, isWhiteListed: false });
  };

  // Notes update
  const handleSaveNotes = (mac: string, notes: string) => {
    setDevices(prev => prev.map(d => d.mac === mac ? { ...d, notes } : d));
    syncDeviceToBackend(mac, { notes });
  };

  // Update dynamic nicknames of targets
  const handleUpdateNickname = (mac: string, nickName: string) => {
    setDevices(prev => prev.map(d => d.mac === mac ? { ...d, nickname: nickName } : d));
    syncDeviceToBackend(mac, { nickname: nickName });
  };

  // Speed limits QoS setup
  const handleUpdateLimit = (mac: string, limit: number) => {
    setDevices(prev => prev.map(d => d.mac === mac ? { ...d, bandwidthLimit: limit } : d));
    syncDeviceToBackend(mac, { bandwidthLimit: limit });
  };

  const handleMarkAlertRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((al) => (al.id === id ? { ...al, read: true } : al))
    );
    // Mark on backend
    fetch('/api/alerts/readall', { method: 'POST' }).catch(() => {});
  };

  const handleClearAlerts = () => {
    setAlerts((prev) => prev.map((al) => ({ ...al, read: true })));
    fetch('/api/alerts/readall', { method: 'POST' }).catch(() => {});
  };

  const handleLoginSuccess = (userRole: 'admin' | 'viewer') => {
    setRole(userRole);
    setIsLoggedIn(true);

    const loginAudit: SystemLog = {
      id: `log_${Date.now()}_auth`,
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'auth',
      message: `User sessions authenticated successfully with role level: ${userRole.toUpperCase()}`,
    };
    setLogs((l) => [loginAudit, ...l]);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleSaveSettings = (nextSettings: SystemSettings) => {
    setSettings(nextSettings);
    fetch('/api/settings/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextSettings)
    }).catch(err => console.error('Error saving settings to backend:', err));
  };

  const handleSavePolicy = (nextPolicy: ContentGuardPolicy) => {
    setPolicy(nextPolicy);
    fetch('/api/guardpolicy/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextPolicy)
    }).catch(err => console.error('Error saving global content policy to backend:', err));
  };

  const handleAddRule = (nextRule: Omit<WebFilterRule, 'id' | 'addedAt'>) => {
    fetch('/api/webrules/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextRule)
    })
    .then((res) => {
      if (res.ok) return res.json();
      throw new Error('API creation failed');
    })
    .then((fresh) => {
      setWebRules((prev) => [fresh, ...prev]);
    })
    .catch((err) => console.error('Error creating domain filter rule:', err));
  };

  const handleToggleRule = (id: string) => {
    setWebRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
    fetch('/api/webrules/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).catch((err) => console.error('Error toggling rule:', err));
  };

  const handleDeleteRule = (id: string) => {
    setWebRules((prev) => prev.filter((r) => r.id !== id));
    fetch('/api/webrules/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).catch((err) => console.error('Error deleting rule:', err));
  };

  const unreadAlertsCount = alerts.filter((al) => !al.read).length;

  if (!isLoggedIn) {
    return <Login onLogin={handleLoginSuccess} lang={lang} />;
  }

  return (
    <div id="application-layout-context" className={`min-h-screen bg-slate-950 text-slate-100 flex ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Navbar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md px-6 flex justify-between items-center relative z-20">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <span className="text-sm font-semibold text-slate-300">
              {lang === 'en' ? 'SSID WiFi' : 'شبكة الموجه'}: <span className="text-cyan-400 font-mono">{settings.routerSsid}</span>
            </span>
            <span className="text-slate-700">|</span>
            <div className="flex items-center text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse inline-block" />
              <span className="text-slate-400">{lang === 'en' ? 'Gateway Synced' : 'بوابة العبور متصلة'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {/* Quick alert indicator button */}
            <button
              onClick={() => setActiveTab('alerts')}
              className="relative p-2 bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-slate-100 rounded-xl transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-500 text-[10px] text-white font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* Language switcher */}
            <button
              onClick={() => {
                const nextLang = lang === 'en' ? 'ar' : 'en';
                setLang(nextLang);
                setSettings({ ...settings, language: nextLang });
              }}
              className="px-3 py-1.5 text-xs font-bold font-mono bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-700/80 rounded-xl flex items-center gap-1 text-slate-300"
            >
              <Languages className="w-3.5 h-3.5" />
              {lang === 'en' ? 'العربية' : 'English'}
            </button>

            {/* Profile control menu */}
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-2 rtl:space-x-reverse">
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white font-bold">
                A
              </div>
              <span className="text-xs font-semibold text-slate-200 hidden sm:inline">{role === 'admin' ? 'Administrator' : 'Viewer Seat'}</span>
            </div>

            {/* Logout */}
            <button
              id="top-logout-btn"
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-slate-100 bg-rose-950/10 hover:bg-rose-900/30 border border-rose-900/20 rounded-xl transition-all"
              title="Logout session"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
            </button>
          </div>
        </header>

        {/* Dynamic Nested Content Views Panels */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              devices={devices}
              bandwidthData={bandwidthHistory}
              onTriggerScan={triggerScan}
              lang={lang}
            />
          )}

          {activeTab === 'devices' && (
            <DevicesList
              devices={devices}
              onToggleBlock={handleToggleBlock}
              onTogglePause={handleTogglePause}
              onUpdateNickname={handleUpdateNickname}
              onUpdateBandwidthLimit={handleUpdateLimit}
              onToggleWhitelist={handleToggleWhitelist}
              onToggleBlacklist={handleToggleBlacklist}
              onSaveNotes={handleSaveNotes}
              lang={lang}
            />
          )}

          {activeTab === 'guard' && (
            <ContentGuard
              policy={policy}
              onSavePolicy={handleSavePolicy}
              webRules={webRules}
              onAddRule={handleAddRule}
              onToggleRule={handleToggleRule}
              onDeleteRule={handleDeleteRule}
              devices={devices}
              lang={lang}
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics
              devices={devices}
              stats={stats}
              lang={lang}
            />
          )}

          {activeTab === 'alerts' && (
            <Alerts
              alerts={alerts}
              onMarkRead={handleMarkAlertRead}
              onClearAll={handleClearAlerts}
              lang={lang}
            />
          )}

          {activeTab === 'settings' && (
            <Settings
              settings={settings}
              onSaveSettings={handleSaveSettings}
              lang={lang}
              setLang={setLang}
            />
          )}

          {activeTab === 'router' && (
            <RouterSync
              stats={stats}
              lang={lang}
            />
          )}

          {activeTab === 'logs' && (
            <SystemLogs
              logs={logs}
              lang={lang}
            />
          )}
        </main>
      </div>
    </div>
  );
}
