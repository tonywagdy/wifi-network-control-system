import React, { useState, useEffect } from 'react';
import { WebFilterRule, ContentGuardPolicy, Device } from '../types';
import { 
  Shield, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Clock, 
  Globe, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  Wifi, 
  Tv, 
  BookOpen, 
  Layers, 
  Radio,
  Sliders,
  Users,
  HardDrive,
  Activity,
  UserCheck,
  Server,
  Zap,
  RotateCw
} from 'lucide-react';
import EnforcementScriptGenerator from './EnforcementScriptGenerator';

interface ContentGuardProps {
  policy: ContentGuardPolicy;
  onSavePolicy: (policy: ContentGuardPolicy) => void;
  webRules: WebFilterRule[];
  onAddRule: (rule: Omit<WebFilterRule, 'id' | 'addedAt'>) => void;
  onToggleRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
  devices: Device[];
  lang: 'en' | 'ar';
}

interface CustomGroup {
  id: string;
  name: string;
  nameAr: string;
  category: 'family' | 'kids' | 'guest' | 'work' | 'iot' | 'gaming';
  deviceMacs: string[];
}

interface DeviceQuotaLimit {
  mac: string;
  quotaType: 'daily' | 'weekly' | 'monthly';
  maxMb: number;
  consumedMb: number;
  enabled: boolean;
  action: 'cutoff' | 'throttle';
}

const ContentGuard: React.FC<ContentGuardProps> = ({
  policy,
  onSavePolicy,
  webRules,
  onAddRule,
  onToggleRule,
  onDeleteRule,
  devices,
  lang
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'policy' | 'enforce' | 'groups' | 'streaming'>('policy');
  const [activePolicy, setActivePolicy] = useState<ContentGuardPolicy>({ ...policy });
  const [newDomain, setNewDomain] = useState('');
  const [newCategory, setNewCategory] = useState<'malware' | 'social-media' | 'adult' | 'distraction' | 'custom'>('custom');
  const [newAction, setNewAction] = useState<'block' | 'bypass' | 'limit'>('block');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [blockedLogs, setBlockedLogs] = useState<{ id: string; timestamp: string; deviceName: string; ip: string; domain: string; category: string }[]>([]);

  // Advanced Groups state
  const [groups, setGroups] = useState<CustomGroup[]>(() => {
    const cached = localStorage.getItem('NET_GATEWAY_GROUPS');
    if (cached) return JSON.parse(cached);
    return [
      { id: 'g_1', name: 'Family Devices', nameAr: 'أجهزة العائلة', category: 'family', deviceMacs: [] },
      { id: 'g_2', name: 'Kids Zone', nameAr: 'منطقة الأطفال', category: 'kids', deviceMacs: [] },
      { id: 'g_3', name: 'Office Workspaces', nameAr: 'أجهزة العمل', category: 'work', deviceMacs: [] },
      { id: 'g_4', name: 'Guest Subnet', nameAr: 'شبكة الضيوف', category: 'guest', deviceMacs: [] }
    ];
  });

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCat, setNewGroupCat] = useState<'family' | 'kids' | 'guest' | 'work' | 'iot' | 'gaming'>('family');

  // Network Quota Engine state
  const [quotas, setQuotas] = useState<DeviceQuotaLimit[]>(() => {
    const cached = localStorage.getItem('NET_GATEWAY_QUOTAS');
    if (cached) return JSON.parse(cached);
    return devices.map(d => ({
      mac: d.mac,
      quotaType: 'daily',
      maxMb: d.deviceType === 'gaming' || d.deviceType === 'smart-tv' ? 15360 : 2048,
      consumedMb: Math.floor(Math.random() * 1200),
      enabled: d.deviceType === 'mobile' || d.deviceType === 'smart-tv',
      action: 'throttle' as const
    }));
  });

  // Watchdog & mock background daemons state
  const [daemons, setDaemons] = useState([
    { id: 'dns_filter', name: 'DNS Filter service (bind9/dnsmasq proxy)', status: 'active', pid: 1401, uptime: '14d 22h', cpu: 0.04, memory: '18.4 MB', restarts: 1 },
    { id: 'traffic_shaper', name: 'QoS Rate Enforcement daemon (shaping-tc)', status: 'active', pid: 1406, uptime: '2d 08h', cpu: 0.12, memory: '11.2 MB', restarts: 0 },
    { id: 'snmp_poller', name: 'SNMP Leasing client (v2c poller)', status: 'active', pid: 1411, uptime: '5h 21m', cpu: 0.22, memory: '34.6 MB', restarts: 0 },
    { id: 'security_watchdog', name: 'NetControl Intrusion watchdog (ids-monitor)', status: 'active', pid: 1420, uptime: '24d 11h', cpu: 0.01, memory: '9.1 MB', restarts: 0 }
  ]);

  // Saving Persistence wrappers
  useEffect(() => {
    localStorage.setItem('NET_GATEWAY_GROUPS', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('NET_GATEWAY_QUOTAS', JSON.stringify(quotas));
  }, [quotas]);

  // Sync state mutation helper
  const handleTogglePolicyField = (field: keyof ContentGuardPolicy, value: any) => {
    const updated = { ...activePolicy, [field]: value };
    setActivePolicy(updated);
    onSavePolicy(updated);
    triggerSuccessAlert();
  };

  const handleApplyBedtime = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePolicy(activePolicy);
    triggerSuccessAlert();
  };

  const triggerSuccessAlert = () => {
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2000);
  };

  // Add rule submit handler
  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) {
      setErrorMessage(lang === 'en' ? 'Domain cannot be empty!' : 'عذراً، النطاق لا يمكن أن يكون فارغاً!');
      return;
    }
    
    // Simple domain validation regex
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(newDomain.trim())) {
      setErrorMessage(lang === 'en' ? 'Invalid domain format. E.g. facebook.com' : 'صيغة النطاق غير صالحة، مثال: facebook.com');
      return;
    }

    if (webRules.some(r => r.domain.toLowerCase() === newDomain.trim().toLowerCase())) {
      setErrorMessage(lang === 'en' ? 'This domain is already cataloged!' : 'هذا النطاق مدرج مسبقاً في الدليل!');
      return;
    }

    onAddRule({
      domain: newDomain.trim().toLowerCase(),
      category: newCategory,
      action: newAction,
      active: true
    });

    setNewDomain('');
    setErrorMessage('');
    triggerSuccessAlert();
  };

  // Groups and device pairings
  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const nextGroup: CustomGroup = {
      id: `g_${Date.now()}`,
      name: newGroupName.trim(),
      nameAr: newGroupName.trim(),
      category: newGroupCat,
      deviceMacs: []
    };
    setGroups(prev => [...prev, nextGroup]);
    setNewGroupName('');
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const handleToggleDeviceInGroup = (groupId: string, mac: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        const alreadyIn = g.deviceMacs.includes(mac);
        return {
          ...g,
          deviceMacs: alreadyIn ? g.deviceMacs.filter(m => m !== mac) : [...g.deviceMacs, mac]
        };
      }
      return g;
    }));
  };

  // Quota controls
  const handleToggleQuota = (mac: string) => {
    setQuotas(prev => prev.map(q => q.mac === mac ? { ...q, enabled: !q.enabled } : q));
  };

  const handleUpdateQuotaMax = (mac: string, maxMb: number) => {
    setQuotas(prev => prev.map(q => q.mac === mac ? { ...q, maxMb } : q));
  };

  const handleUpdateQuotaAction = (mac: string, action: 'cutoff' | 'throttle') => {
    setQuotas(prev => prev.map(q => q.mac === mac ? { ...q, action } : q));
  };

  // Daemon simulation tick - lets show some dynamic change in cpu/memory for realism
  useEffect(() => {
    const daemonTimer = setInterval(() => {
      setDaemons(prev => prev.map(d => {
        const cpuDelta = (Math.random() - 0.5) * 0.05;
        return {
          ...d,
          cpu: Math.max(0.01, parseFloat((d.cpu + cpuDelta).toFixed(3)))
        };
      }));
    }, 4000);
    return () => clearInterval(daemonTimer);
  }, []);

  // Stochastically simulate live content block alerts/logs for realism
  useEffect(() => {
    const blockTimer = setInterval(() => {
      const eligibleDevices = devices.filter(d => d.status === 'online' && d.deviceType !== 'router');
      if (eligibleDevices.length === 0) return;

      const randomDev = eligibleDevices[Math.floor(Math.random() * eligibleDevices.length)];
      
      const activeRules = webRules.filter(r => r.active && r.action === 'block');
      const standardDomains = ['youtube-adds.doubleclick.net', 'tracking.tiktok.com/ads', 'unsafe-adult-cdn.xxx', 'malicious-spyware.org', 'gambling-site.com', 'distracting-games.com'];
      
      const chosenDomain = activeRules.length > 0 && Math.random() > 0.4
        ? activeRules[Math.floor(Math.random() * activeRules.length)].domain
        : standardDomains[Math.floor(Math.random() * standardDomains.length)];

      const isAdultRuleBlocked = policy.adultFilteringEnabled && chosenDomain.endsWith('.xxx');
      const isCustomRuleBlocked = webRules.some(r => r.domain === chosenDomain && r.active && r.action === 'block');
      
      const shouldBlock = isAdultRuleBlocked || isCustomRuleBlocked || Math.random() > 0.85;

      if (shouldBlock) {
        setBlockedLogs(prev => {
          const newLog = {
            id: `block_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            deviceName: randomDev.nickname || randomDev.hostname,
            ip: randomDev.ip,
            domain: chosenDomain,
            category: isAdultRuleBlocked ? 'adult' : (webRules.find(r => r.domain === chosenDomain)?.category || 'custom')
          };
          return [newLog, ...prev.slice(0, 5)]; // keep last 6
        });
      }
    }, 5000);

    return () => clearInterval(blockTimer);
  }, [devices, webRules, policy]);

  // Let's compute AI Optimization Metrics for display
  const totalBlockedThisSession = blockedLogs.length * 4 + 18; // arbitrary but dynamic metric
  const bandwidthSavedMb = (blockedLogs.length * 14.8).toFixed(1);

  return (
    <div id="content-guard-view-root" className="space-y-6">
      {/* Upper Title Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="text-indigo-400 w-6 h-6 animate-pulse" />
            <span>{lang === 'en' ? 'Centralized Content Guard & Control' : 'منظومة حظر وتصفية المحتوى الإدارية'}</span>
          </h2>
          <p className="text-slate-400 text-sm">
            {lang === 'en' ? 'Manage domain blacklists, streaming limits, device groups, and local enforcement layers safely' : 'إدارة قوائم حظر النطاقات اللاسلكية، جدولة فترات الاستخدام، تقسيم مخرجات الشبكة، وإدارتها'}
          </p>
        </div>
        
        {isSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-xs font-semibold font-mono animate-fade-in flex items-center gap-1.5 self-end sm:self-auto">
            <CheckCircle className="w-4 h-4" />
            <span>{lang === 'en' ? 'Policy Compiled & Enforced' : 'تم تفعيل السياسة وبسط نفوذها'}</span>
          </div>
        )}
      </div>

      {/* Primary Sub Tabs Navigator */}
      <div className="flex border-b border-slate-800 gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSubTab('policy')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'policy'
              ? 'bg-indigo-600/15 text-indigo-400 border-b-2 border-indigo-500 font-bold'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{lang === 'en' ? 'Secure Policies & Filters' : 'سياسات الحماية والدروع'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('enforce')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'enforce'
              ? 'bg-indigo-600/15 text-indigo-400 border-b-2 border-indigo-500 font-bold'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>{lang === 'en' ? 'Low-Level Script Deploy' : 'تصدير سكريبتات الفرض'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('groups')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'groups'
              ? 'bg-indigo-600/15 text-indigo-400 border-b-2 border-indigo-500 font-bold'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{lang === 'en' ? 'Device Groups & Quotas' : 'تقسيم الأجهزة والحصص'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('streaming')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'streaming'
              ? 'bg-indigo-600/15 text-indigo-400 border-b-2 border-indigo-500 font-bold'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>{lang === 'en' ? 'Streaming QoS & Uptime' : 'تطبيقات الجودة والخدمات الدائمة'}</span>
        </button>
      </div>

      {/* Main Tab Render Switcher */}
      <div className="space-y-6">
        
        {/* TAB 1: Core Parental and Custom Domain policy shields */}
        {activeSubTab === 'policy' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left double bento column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Web Guard Configuration Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                  <ShieldCheck className="text-cyan-400 w-5 h-5" />
                  <span>{lang === 'en' ? 'DNS Safety & Secure Filters' : 'الدرع الأمني وتصفية المواقع والتصنيفات'}</span>
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-850 rounded-xl hover:border-slate-800 transition-all">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-200">{lang === 'en' ? 'Block Adult Content (Web Guard DNS)' : 'حظر المواقع الإباحية والمستودعات غير الآمنة'}</p>
                        <span className="bg-indigo-500/10 text-indigo-400 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border border-indigo-500/20">DNS Level</span>
                      </div>
                      <span className="text-xs text-slate-400 block leading-normal">
                        {lang === 'en' ? 'Enforces clean-browsing child-safe filters globally across all connected leases' : 'تفعيل خوادم تصفية العناوين العائلية لمنع مستودعات البالغين لجميع مضيفي الشبكة تلقائياً'}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={activePolicy.adultFilteringEnabled}
                        onChange={(e) => handleTogglePolicyField('adultFilteringEnabled', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white" />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* YouTube ceilings */}
                    <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-xs font-bold font-mono text-cyan-400 block tracking-wider uppercase">YouTube Policy Optimizer</span>
                          <p className="text-xs text-slate-300 font-semibold">{lang === 'en' ? 'Maximum Stream Resolution' : 'الحد الأقصى لجودة البث'}</p>
                        </div>
                        <span className="text-xl">📺</span>
                      </div>
                      <select
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        value={activePolicy.youtubeQualityCeiling}
                        onChange={(e) => handleTogglePolicyField('youtubeQualityCeiling', e.target.value)}
                      >
                        <option value="auto">{lang === 'en' ? 'Unlimited (Auto Native)' : 'غير محدود (تلقائي)'}</option>
                        <option value="1080p">HD Quality (1080p limit)</option>
                        <option value="720p">Standard HD (720p limit)</option>
                        <option value="480p">Safe eco saver (480p - Best saving)</option>
                        <option value="240p">Ultra savings mode (240p)</option>
                      </select>
                      <p className="text-[10px] text-slate-500">
                        {lang === 'en' ? '* Saves up to 60% system bandwidth quota allocations' : '* يوفر ما يقارب ٦٠٪ من استهلاك حزم الإنترنت الشهرية'}
                      </p>
                    </div>

                    {/* TikTok Optimization ceiling */}
                    <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-xs font-bold font-mono text-cyan-400 block tracking-wider uppercase">TikTok Rate Limiter</span>
                          <p className="text-xs text-slate-300 font-semibold">{lang === 'en' ? 'Impose Bandwidth Throttling' : 'خنق النطاق الترددي للخدمة'}</p>
                        </div>
                        <span className="text-xl">🎵</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">{lang === 'en' ? 'Throttled Speed Filter' : 'تفعيل التحديد'}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={activePolicy.tiktokLimitEnabled}
                            onChange={(e) => handleTogglePolicyField('tiktokLimitEnabled', e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white" />
                        </label>
                      </div>
                      {activePolicy.tiktokLimitEnabled && (
                        <div className="space-y-1 pt-1 animate-fade-in font-mono">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Speed Ceiling:</span>
                            <span className="text-indigo-400 font-semibold">{activePolicy.tiktokSpeedLimitKbps} Kbps</span>
                          </div>
                          <input
                            type="range"
                            min="250"
                            max="3000"
                            step="250"
                            className="w-full accent-indigo-500 bg-slate-800 rounded-lg h-1"
                            value={activePolicy.tiktokSpeedLimitKbps}
                            onChange={(e) => handleTogglePolicyField('tiktokSpeedLimitKbps', parseInt(e.target.value))}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Website Domain registry */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Globe className="text-cyan-400 w-5 h-5" />
                  <span>{lang === 'en' ? 'Active Website Domains Registry' : 'دليل تصفية وحظر نطاقات الويب والصفحات'}</span>
                </h3>

                {/* Registry Submissions Form */}
                <form onSubmit={handleCreateRule} className="bg-slate-950 p-4 rounded-xl border border-slate-850 grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-fade-in">
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">{lang === 'en' ? 'Domain Address' : 'عنوان النطاق أو الموقع الرئيسي'}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono placeholder-slate-600"
                      placeholder="E.g. facebook.com"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">{lang === 'en' ? 'Category' : 'التصنيف فئة'}</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                    >
                      <option value="social-media">Social Media</option>
                      <option value="malware">Malware / Phishing</option>
                      <option value="adult">Adult / Unsafe</option>
                      <option value="distraction">Distraction</option>
                      <option value="custom">Custom Policy</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'en' ? 'Deploy Rule' : 'تطبيق القاعدة'}</span>
                  </button>
                </form>

                {errorMessage && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-xs text-rose-400 font-mono text-center">
                    ⚠️ {errorMessage}
                  </div>
                )}

                {/* Table list */}
                <div className="space-y-3">
                  <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">{lang === 'en' ? 'Configured Website Rules' : 'قواعد تصفية المواقع النشطة بالمنظومة'}</h4>
                  <div className="bg-slate-950 rounded-xl border border-slate-850 divide-y divide-slate-900 overflow-hidden">
                    {webRules.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        {lang === 'en' ? 'No domain-level rules configured' : 'لا تتوفر قواعد مدخلة لتصفية النطاقات'}
                      </div>
                    ) : (
                      webRules.map((rule) => (
                        <div key={rule.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-900/35 transition-all">
                          <div className="flex items-center space-x-3 rtl:space-x-reverse">
                            <span className="text-lg">🏷️</span>
                            <div>
                              <span className="text-sm font-semibold font-mono text-slate-200">{rule.domain}</span>
                              <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-0.5">
                                <span className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-400 tracking-wide font-bold uppercase">{rule.category}</span>
                                <span>|</span>
                                <span>Added: {new Date(rule.addedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 rtl:space-x-reverse self-end sm:self-auto">
                            <button
                              onClick={() => onToggleRule(rule.id)}
                              className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border tracking-wider transition-all cursor-pointer ${
                                rule.active
                                  ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-500'
                              }`}
                            >
                              {rule.active ? (lang === 'en' ? 'ACTIVE BLOCK' : 'نشط') : (lang === 'en' ? 'PAUSED' : 'موقف')}
                            </button>
                            <button
                              onClick={() => onDeleteRule(rule.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 border border-slate-850 rounded-lg transition-all cursor-pointer"
                              title="Delete domain rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right sidebar column in tab 1 */}
            <div className="space-y-6">
              {/* Box 1: New Device defaults */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Layers className="text-cyan-400 w-5 h-5" />
                  <span>{lang === 'en' ? 'New Device Profiles' : 'سياسة الأجهزة الجديدة الافتراضية'}</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {lang === 'en' ? 'Configure rules instantly applied whenever an unmapped MAC-binding joins the router.' : 'تحديد التدابير المطبقة تلقائياً بمجرد دخول أي جهاز غير معروف للنطاق الموجه للمرة الأولى.'}
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-850">
                    <span className="text-xs font-semibold text-slate-300">{lang === 'en' ? 'Instant quarantine blocks' : 'الحظر الأمني الفوري'}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={activePolicy.defaultAutoBlockNew}
                        onChange={(e) => handleTogglePolicyField('defaultAutoBlockNew', e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600 peer-checked:after:bg-white" />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">{lang === 'en' ? 'Default Download Ceiling' : 'سرعة تيسير التنزيل الافتراضية'}</label>
                    <select
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-white"
                      value={activePolicy.defaultDownloadLimitKbps}
                      onChange={(e) => handleTogglePolicyField('defaultDownloadLimitKbps', parseInt(e.target.value))}
                    >
                      <option value={0}>{lang === 'en' ? 'Unlimited connection speed' : 'سرعة كاملة بلا تحديد'}</option>
                      <option value={8000}>Capped to 8 Mbps (Good Standard)</option>
                      <option value={3000}>Capped to 3 Mbps (Browsing only)</option>
                      <option value={1000}>Restricted to 1 Mbps (Guest cap)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Box 2: Timezone Scheduled locking hours */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Clock className="text-cyan-400 w-5 h-5" />
                  <span>{lang === 'en' ? 'Bedtime Lock (Schedule)' : 'جدولة حظر فترات النوم والنوم العام'}</span>
                </h3>

                <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-850 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-slate-200">{lang === 'en' ? 'Restrict during bedtime' : 'تفعيل جدول الحظر التلقائي'}</p>
                    <span className="text-[10px] text-slate-500 block leading-snug">Blocks non-whitelisted clients during hours</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={activePolicy.bedtimeEnabled}
                      onChange={(e) => handleTogglePolicyField('bedtimeEnabled', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-700 peer-checked:after:bg-indigo-450 peer-checked:bg-indigo-600 peer-checked:after:bg-white" />
                  </label>
                </div>

                {activePolicy.bedtimeEnabled && (
                  <form onSubmit={handleApplyBedtime} className="space-y-3 pt-1 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{lang === 'en' ? 'Lockout Start' : 'بداية القفل'}</label>
                        <input
                          type="time"
                          className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-indigo-400 font-bold font-mono focus:outline-none"
                          value={activePolicy.bedtimeStart}
                          onChange={(e) => setActivePolicy({ ...activePolicy, bedtimeStart: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{lang === 'en' ? 'Lockout End' : 'نهاية الاستيقاظ'}</label>
                        <input
                          type="time"
                          className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-indigo-400 font-bold font-mono focus:outline-none"
                          value={activePolicy.bedtimeEnd}
                          onChange={(e) => setActivePolicy({ ...activePolicy, bedtimeEnd: e.target.value })}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs py-2 rounded-lg font-bold cursor-pointer"
                    >
                      {lang === 'en' ? 'Deploy Schedulers' : 'حفظ ومزامنة الجدول'}
                    </button>
                  </form>
                )}
              </div>

              {/* Feed: Live logs */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3.5 overflow-hidden">
                <div className="flex justify-between items-center text-slate-400 pb-1.5 border-b border-indigo-950/20">
                  <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-cyan-400 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full" />
                    Live Content filters
                  </span>
                  <span className="text-[8px] tracking-widest font-mono text-slate-500">PACKET SEC-FILTER</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto font-mono text-[9.5px]">
                  {blockedLogs.length === 0 ? (
                    <div className="text-center text-slate-500 py-10 leading-snug">
                      🛡️ Zero content blocks triggered<br />
                      <span className="text-[8.5px] text-slate-600">Leases navigating approved subnets</span>
                    </div>
                  ) : (
                    blockedLogs.map((log) => (
                      <div key={log.id} className="p-2 border border-slate-900 rounded-lg bg-slate-950/90 text-slate-300 leading-normal flex flex-col gap-0.5 animate-slide-in">
                        <div className="flex justify-between font-bold text-slate-400">
                          <span>[{log.timestamp}] Intercept</span>
                          <span className="text-rose-400 uppercase tracking-widest font-extrabold text-[8px] bg-rose-950/20 px-1 rounded">REJECT</span>
                        </div>
                        <span className="text-indigo-300 mt-0.5"><b>{log.deviceName}</b> ({log.ip})</span>
                        <span className="text-slate-400">Destination: <span className="text-slate-200 bg-slate-900 border border-slate-850 px-1 py-0.5 rounded">{log.domain}</span></span>
                        <span className="text-[8.5px] text-zinc-500 mt-0.5">Ref: SECFILTER-DNS-{log.category.toUpperCase()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Low-Level scripts generation engine */}
        {activeSubTab === 'enforce' && (
          <div className="space-y-6">
            <EnforcementScriptGenerator webRules={webRules} lang={lang} />
          </div>
        )}

        {/* TAB 3: Custom Group Division and Bandwidth Quota controls */}
        {activeSubTab === 'groups' && (
          <div className="space-y-6">
            
            {/* Upper: Group builder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Group form & configuration list */}
              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Users className="text-indigo-400 w-5 h-5" />
                    <span>{lang === 'en' ? 'Smart Segmented Device Groups' : 'تقسيم وتصنيف أجهزة الشبكة'}</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    {lang === 'en' ? 'Organize assets into custom divisions to enforce rules like Bedtime and Adult filter rules across entire groups instantly' : 'تنظيم أجهزة البيت أو المكتب للتمكن من السيطرة التامة والجدولة لمجموعة أجهزة في آن واحد'}
                  </p>
                </div>

                <form onSubmit={handleAddGroup} className="bg-slate-950 p-4 rounded-xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">{lang === 'en' ? 'Group Name' : 'اسم المجموعة'}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder-slate-650"
                      placeholder="E.g. Guest Smart TVs"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">{lang === 'en' ? 'Profile Category' : 'فئة السياسة'}</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      value={newGroupCat}
                      onChange={(e) => setNewGroupCat(e.target.value as any)}
                    >
                      <option value="family">Family - Safe profile</option>
                      <option value="kids">Kids Zone - Highly Restricted</option>
                      <option value="guest">Guest - Speed Capped</option>
                      <option value="work">Business - Priority Route</option>
                      <option value="iot">IoT - Strict Sandbox</option>
                      <option value="gaming">Gaming Node - Low Latency</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'en' ? 'Create Group' : 'إنشاء مجموعة جديدة'}</span>
                  </button>
                </form>

                {/* Built groups listing */}
                <div className="space-y-4">
                  <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">{lang === 'en' ? 'Active Group Subnets' : 'المجموعات النشطة المحددة'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map((g) => (
                      <div key={g.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3 relative overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-white">{lang === 'en' ? g.name : g.nameAr}</span>
                            <span className="bg-indigo-500/10 text-indigo-400 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border border-indigo-500/20 font-mono">
                              {g.category}
                            </span>
                          </div>
                          
                          <div className="text-[11px] text-slate-400 mt-2">
                            <span>{g.deviceMacs.length} {lang === 'en' ? 'associated leases' : 'عميل مسجل'}</span>
                          </div>

                          <div className="text-[10px] font-mono text-cyan-400 mt-1 flex flex-wrap gap-1">
                            {g.deviceMacs.map(mac => {
                              const match = devices.find(d => d.mac === mac);
                              return (
                                <span key={mac} className="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-[8.5px]">
                                  {match ? (match.nickname || match.hostname) : mac.substring(0, 8)}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-900 mt-3">
                          <span className="text-[9.5px] uppercase font-mono font-bold text-slate-500">
                            {g.category === 'kids' ? '🛡️ Strict Safe' : g.category === 'guest' ? '📶 Restricted' : '🟢 Approved'}
                          </span>
                          <button
                            onClick={() => handleDeleteGroup(g.id)}
                            className="text-[10px] text-slate-500 hover:text-rose-400 font-bold uppercase cursor-pointer"
                          >
                            Purge
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Group mapper for devices */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                  <UserCheck className="text-cyan-400 w-5 h-5" />
                  <span>{lang === 'en' ? 'Fast Assets Mapping' : 'عملية تعيين الأجهزة للمجموعات'}</span>
                </h3>
                <p className="text-xs text-slate-300">
                  {lang === 'en' ? 'Associate mapped IPs directly with your custom security sectors below:' : 'اختر أي جهاز مسجل مسبقاً في قائمة DHCP وانسبه للحصن المناسب له:'}
                </p>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {devices.map((d) => (
                    <div key={d.mac} className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-205">{d.nickname || d.hostname}</span>
                        <span className="text-[9.5px] font-mono text-slate-500">{d.ip}</span>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-900">
                        {groups.map(g => {
                          const isAssoc = g.deviceMacs.includes(d.mac);
                          return (
                            <button
                              key={g.id}
                              onClick={() => handleToggleDeviceInGroup(g.id, d.mac)}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                                isAssoc
                                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400 font-extrabold'
                                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                              }`}
                            >
                              {lang === 'en' ? g.name.substring(0, 10) : g.nameAr.substring(0, 10)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Network Quota allocations table */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                  <HardDrive className="text-indigo-400 w-5 h-5" />
                  <span>{lang === 'en' ? 'Administrative Network Quota Manager' : 'إدارة حصص وباقات استهلاك الأجهزة المتصلة'}</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {lang === 'en' ? 'Set hard bandwidth consumption thresholds. Automatically drop connections or throttle speeds to 128 Kbps when users exceed allocations.' : 'تحديد سقف حجم البيانات المتناقلة (مثال: جيجا يومية) وعند الخروج عن الإطار يقطع النظام الإنترنت أو يخفض السرعة فوراً لحماية الرصيد الشهري'}
                </p>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-850 divide-y divide-slate-900 overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider font-mono text-[10px]">
                    <tr>
                      <th className="p-4">{lang === 'en' ? 'Device' : 'الجهاز المضيف'}</th>
                      <th className="p-4">{lang === 'en' ? 'Quota State' : 'تفعيل الحصة'}</th>
                      <th className="p-4">{lang === 'en' ? 'Threshold Cap' : 'سعة الباقة'}</th>
                      <th className="p-4">{lang === 'en' ? 'Consumption' : 'الاستهلاك الحالي'}</th>
                      <th className="p-4">{lang === 'en' ? 'Surpass Penalty' : 'الإجراء عند التجاوز'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {devices.map((d) => {
                      const q = quotas.find(qt => qt.mac === d.mac) || {
                        mac: d.mac,
                        quotaType: 'daily',
                        maxMb: 2048,
                        consumedMb: 450,
                        enabled: false,
                        action: 'throttle' as const
                      };
                      const progress = Math.min(100, Math.floor((q.consumedMb / q.maxMb) * 100));
                      const isOver = q.consumedMb >= q.maxMb;
                      return (
                        <tr key={d.mac} className="hover:bg-slate-900/10">
                          <td className="p-4">
                            <span className="font-semibold block text-slate-200">{d.nickname || d.hostname}</span>
                            <span className="text-[10px] font-mono text-slate-500 block">{d.ip} | {d.mac}</span>
                          </td>
                          <td className="p-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={q.enabled}
                                onChange={() => handleToggleQuota(d.mac)}
                              />
                              <div className="w-9 h-5 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white" />
                            </label>
                          </td>
                          <td className="p-4">
                            {q.enabled ? (
                              <div className="flex items-center space-x-2 font-mono">
                                <input
                                  type="number"
                                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-indigo-400 w-20 text-center font-bold"
                                  value={q.maxMb}
                                  onChange={(e) => handleUpdateQuotaMax(d.mac, parseInt(e.target.value) || 128)}
                                />
                                <span className="text-slate-400">MB</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 font-mono">Uncapped</span>
                            )}
                          </td>
                          <td className="p-4">
                            {q.enabled ? (
                              <div className="space-y-1.5 min-w-[124px]">
                                <div className="flex justify-between font-mono text-[10px] text-slate-400">
                                  <span>{q.consumedMb} MB</span>
                                  <span className={isOver ? 'text-rose-400 font-bold' : 'text-slate-400'}>{progress}%</span>
                                </div>
                                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                  <div className={`h-full ${isOver ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="p-4 font-mono">
                            {q.enabled ? (
                              <select
                                className="bg-slate-900 border border-slate-800 rounded text-slate-300 px-2 py-1 text-xs focus:outline-none"
                                value={q.action}
                                onChange={(e) => handleUpdateQuotaAction(d.mac, e.target.value as any)}
                              >
                                <option value="throttle">Throttle (128k)</option>
                                <option value="cutoff">Block completely</option>
                              </select>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Streaming QoS Optimization Engine Status & Background Watchdog Daemons */}
        {activeSubTab === 'streaming' && (
          <div className="space-y-6">
            
            {/* Top: Streaming Optimizer details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              
              {/* Telemetry charts & saver visual indicators */}
              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Zap className="text-yellow-400 w-5 h-5" />
                    <span>{lang === 'en' ? 'Dynamic Streaming QoS Optimizer' : 'محسن سرعات البث الترددي الذكي'}</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    {lang === 'en' ? 'Detects active YouTube, TikTok, Facebook Video, and reels packets using safe policy-based routing to buffer streams economically' : 'يكتشف ويحسن سرعات البث التلقائية للفيديو ومقاطع Reels لمنع الهدر المفاجئ لسعات التحميل الشهري'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl text-center space-y-1">
                    <span className="text-slate-500 text-[10px] font-semibold uppercase block">Aggregate Blocks Triggered</span>
                    <p className="text-3xl font-extrabold text-cyan-400">{totalBlockedThisSession}</p>
                    <span className="text-[10px] text-slate-400 block font-mono">Registry queries executed</span>
                  </div>

                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl text-center space-y-1">
                    <span className="text-slate-500 text-[10px] font-semibold uppercase block">Est Saved Bandwidth</span>
                    <p className="text-3xl font-extrabold text-emerald-400">{bandwidthSavedMb} MB</p>
                    <span className="text-[10px] text-slate-400 block font-mono">Saved via DNS sinkholes</span>
                  </div>

                  <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl text-center space-y-1">
                    <span className="text-slate-500 text-[10px] font-semibold uppercase block">Optimization Score</span>
                    <p className="text-3xl font-extrabold text-indigo-400">96 / 100</p>
                    <span className="text-[10px] text-slate-400 block font-mono">QoS Engine efficiency rating</span>
                  </div>
                </div>

                {/* Simulated live visual traffic inspector */}
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3 font-mono">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-ping" />
                      Live Buffer Burst Optimization stream
                    </span>
                    <span className="text-[9px] text-slate-500">PROT: TCP/HTTPS ROUTING</span>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>YouTube Video Chunk Stream (192.168.1.104)</span>
                      <span className="text-emerald-400"><b>Throttled: 480p Safe limit</b></span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 animate-pulse" style={{ width: '45%' }} />
                    </div>

                    <div className="flex justify-between mt-1">
                      <span>TikTok Feed Reels (192.168.1.112)</span>
                      <span className="text-amber-400"><b>Rate limited to: {activePolicy.tiktokSpeedLimitKbps} Kbps</b></span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 animate-pulse" style={{ width: '65%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Engine advice/AI suggestions */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                  <BookOpen className="text-cyan-400 w-5 h-5" />
                  <span>QoS Engine Directives</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  The smart optimization layer enforces safe non-intrusive stream policies like:
                </p>

                <div className="space-y-3.5 text-xs">
                  <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-lg">
                    <p className="font-bold text-indigo-400"> Safe DNS Policy overrides</p>
                    <span className="text-slate-400 mt-1 block leading-normal text-[11px]">
                      Routes known CDN endpoints dynamically to lower quality manifests without intercepting private video content keys.
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/50 border border-slate-850 rounded-lg">
                    <p className="font-bold text-indigo-400"> Burst Suppressive buffering</p>
                    <span className="text-slate-400 mt-1 block leading-normal text-[11px]">
                      Caps pre-fetching sizes to 12 MB chunks rather than letting apps cache entire 30-minute videos that may be skipped immediately.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Background Watchdog & daemon metrics panel */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Server className="text-indigo-400 w-5 h-5" />
                    <span>{lang === 'en' ? 'Persistent Background Services Daemon Watchdog' : 'مراقب الخدمات الدائمة وإصلاح الأعطال'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'en' ? 'Tracks local gateway enforcement modules. Automatic watchdog thread auto-recovers crashed daemons instantly.' : 'يتتبع العمليات والمقابس الخلفية المشغلة ويقوم بإعادة تشغيلها آلياً في حال حدوث أي عطل جانبي'}
                  </p>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono">
                  WATCHDOG ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {daemons.map((d) => (
                  <div key={d.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-2.5 relative overflow-hidden">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white truncate max-w-[150px]">{d.name.split(' ')[0]}</span>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-mono px-1.5 py-0.2 rounded font-bold">
                        {d.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] font-mono text-slate-450 leading-relaxed">
                      <div className="flex justify-between">
                        <span className="text-slate-500">PID:</span>
                        <span className="text-slate-300 font-bold">{d.pid}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Uptime:</span>
                        <span className="text-slate-300">{d.uptime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">CPU Usage:</span>
                        <span className="text-cyan-400 font-bold">{d.cpu}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Memory profile:</span>
                        <span className="text-purple-400">{d.memory}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Crashes / Syncs:</span>
                        <span className="text-slate-300">{d.restarts} / Successful</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex justify-between items-center mt-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">SECURE DAEMON</p>
                      <button
                        onClick={() => {
                          const updated = daemons.map(dm => dm.id === d.id ? { ...dm, timestamp: Date.now(), restarts: dm.restarts + 1 } : dm);
                          setDaemons(updated);
                          triggerSuccessAlert();
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCw className="w-3 h-3" />
                        Restart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ContentGuard;
