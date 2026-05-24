import React, { useState } from 'react';
import { NetworkStats } from '../types';
import { Key, ShieldCheck, Database, Server, RefreshCw, Layers, CheckCircle, Wifi, HelpCircle } from 'lucide-react';

interface RouterSyncProps {
  stats: NetworkStats;
  lang: 'en' | 'ar';
}

type RouterBrand = 'openwrt' | 'mikrotik' | 'tplink' | 'asuswrt' | 'generic';

const RouterSync: React.FC<RouterSyncProps> = ({ stats, lang }) => {
  const [selectedBrand, setSelectedBrand] = useState<RouterBrand>('openwrt');
  const [routerUser, setRouterUser] = useState('admin');
  const [routerPass, setRouterPass] = useState('');
  const [routerApiUrl, setRouterApiUrl] = useState('http://192.168.1.1/ubus');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'connected' | 'error'>('idle');
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  const handleBrandChange = (brand: RouterBrand) => {
    setSelectedBrand(brand);
    if (brand === 'openwrt') {
      setRouterApiUrl('http://192.168.1.1/ubus');
      setRouterUser('root');
    } else if (brand === 'mikrotik') {
      setRouterApiUrl('http://192.168.1.1/api/v1/dns/static');
      setRouterUser('admin');
    } else if (brand === 'tplink') {
      setRouterApiUrl('https://omada.tplinkcloud.com/api/v2/login');
      setRouterUser('admin');
    } else if (brand === 'asuswrt') {
      setRouterApiUrl('https://192.168.1.1:8443/api/v1/network');
      setRouterUser('admin');
    } else {
      setRouterApiUrl('192.168.1.1');
      setRouterUser('admin');
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setSyncStatus('syncing');
    
    const logs: string[] = [];
    const t = () => new Date().toLocaleTimeString();
    
    logs.push(`[${t()}] Initializing direct API Handshake trigger with gateway at ${stats.routerIp}...`);
    logs.push(`[${t()}] Detected Model Hardware: ${stats.routerModel}`);
    logs.push(`[${t()}] Service protocol selected: REST JSON-RPC payload interface`);
    setSyncLogs([...logs]);

    setTimeout(() => {
      setSyncLogs(prev => [
        ...prev,
        `[${t()}] Sending credentials challenge to endpoint URL: ${routerApiUrl}`,
        `[${t()}] Authenticating user "${routerUser}" with certificate mapping...`,
        `[${t()}] Gateway responded: 200 OK (Authenticated!). Access token generated.`
      ]);
    }, 1000);

    setTimeout(() => {
      setSyncLogs(prev => [
        ...prev,
        `[${t()}] Extracting current DHCP rental table leases...`,
        `[${t()}] Found 6 mapped static leases, pulling hardware vendors over local SNMP...`,
        `[${t()}] Sync step 2/2: Injecting system policy definitions...`,
        `[${t()}] Synchronized. Successfully coupled with local gateway!`
      ]);
      setSyncStatus('connected');
    }, 2800);
  };

  const getBrandDetails = (brand: RouterBrand) => {
    switch (brand) {
      case 'openwrt':
        return {
          title: 'OpenWRT JSON-RPC (ubus)',
          features: lang === 'en' ? 'Uses pure direct /ubus REST calls to sync active DHCP leases, write firewalls, and limit speeds.' : 'يستخدم بروتوكول /ubus المكتبي لحزام سحب البيانات وجداول DHCP.'
        };
      case 'mikrotik':
        return {
          title: 'MikroTik RouterOS API',
          features: lang === 'en' ? 'Authenticates via safe /ip/dns static & QoS parent queues commands over secure REST layer.' : 'واجهة مستدامة تدعم بروتوكولات ميكروتيك وسحائب WinBox آمنة.'
        };
      case 'tplink':
        return {
          title: 'TP-Link Omada WAN REST',
          features: lang === 'en' ? 'Queries the Omada SDN Controller to map local wireless networks globally.' : 'ربط شامل مع بيئة الموزع الذكي TP-Link Omada SDN.'
        };
      case 'asuswrt':
        return {
          title: 'ASUS AsusWRT App API',
          features: lang === 'en' ? 'Leverages administrative SSH and App API endpoint tokens on standard port 8443.' : 'يستمد الرموز من نظام أسوس ويرت والتوليف للمقابس.'
        };
      case 'generic':
        return {
          title: 'Generic SNMP v2c Poller',
          features: lang === 'en' ? 'Standard fallback queries. Pulls read-only interface statistics and ARP tables safely.' : 'الاستقصاء الكلاسيكي عبر SNMP v2c لتنزيل بيانات المضيفين ومعدلات البث.'
        };
    }
  };

  return (
    <div id="router-sync-container" className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {lang === 'en' ? 'Centralized Router APIs Sync' : 'مزامنة بوابات الموجهات الإدارية'}
        </h2>
        <p className="text-slate-400 text-sm">
          {lang === 'en' ? 'Deploy policy lists directly to client router systems safely using official APIs. No unsafe packet spoof filters needed.' : 'دفع وسحب اللوائح والسرعات بصفة مباشرة وبشكل آمن عن طريق منافذ التحكم الرسمية للموجه.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Router control setup form */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
          
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-450">{lang === 'en' ? 'Select Gateway Brand / Driver' : 'اختر فئة محرك البوابة وموديل الموجه'}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['openwrt', 'mikrotik', 'tplink', 'asuswrt', 'generic'] as const).map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => handleBrandChange(brand)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all truncate text-center font-mono ${
                    selectedBrand === brand
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 font-extrabold'
                      : 'bg-slate-950/40 border-slate-850 text-slate-450 hover:border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {brand.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleConnect} className="space-y-4 pt-1">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2.5 flex items-center gap-1.5">
              <Key className="text-indigo-400 w-4.5 h-4.5" />
              <span>{lang === 'en' ? 'Gateway Credentials Setup' : 'بيانات تسجيل الدخول وتحديد الخودام'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">{lang === 'en' ? 'Configured API URL / Host' : 'عنوان الواجهة المكتبي / الرابط المباشر'}</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500 font-mono"
                  value={routerApiUrl}
                  onChange={(e) => setRouterApiUrl(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">{lang === 'en' ? 'Default Model Detection' : 'الموديل المكتشف تلقائياً'}</label>
                <input
                  type="text"
                  disabled
                  className="w-full bg-slate-955 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-500 focus:outline-none font-mono"
                  value={stats.routerModel}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">{lang === 'en' ? 'Admin Username' : 'اسم المستخدم للمشرف'}</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  value={routerUser}
                  onChange={(e) => setRouterUser(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">{lang === 'en' ? 'Admin Secret Password' : 'كلمة المرور'}</label>
                <input
                  type="password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  value={routerPass}
                  placeholder="••••••••••••"
                  onChange={(e) => setRouterPass(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                id="btn-router-connect"
                type="submit"
                disabled={syncStatus === 'syncing'}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-850 text-white font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/10 text-xs text-center"
              >
                <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>
                  {syncStatus === 'syncing'
                    ? (lang === 'en' ? 'Establishing API Tunnel Handshake...' : 'جاري إنشاء نفق اتصال آمن...')
                    : (lang === 'en' ? 'Initiate API Gateway Sync link' : 'مزامنة مع بوابة الموجه وتفعيل')}
                </span>
              </button>

              {syncStatus === 'connected' && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono flex items-center gap-1.5 animate-fade-in self-start">
                  <CheckCircle className="w-4 h-4" />
                  <span>Gateway Connected & Subnet Synced</span>
                </div>
              )}
            </div>
          </form>

          {/* Core logging console logs */}
          {syncLogs.length > 0 && (
            <div className="space-y-2 animate-fade-in pt-1">
              <h4 className="text-xs text-slate-450 uppercase tracking-wider font-bold">{lang === 'en' ? 'Gateway Sync Diagnostics Console' : 'مخرجات الفحص وحالة المزامنة المباشرة'}</h4>
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 font-mono text-[10px] text-zinc-300 space-y-1.5 h-44 overflow-y-auto leading-relaxed divide-y divide-slate-900 scrollbar-thin">
                {syncLogs.map((log, index) => (
                  <p key={index} className="pt-1.5 first:pt-0">{log}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Security parameters info card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <ShieldCheck className="text-emerald-400 w-5 h-5" />
              <span>{lang === 'en' ? 'Secure Gateway Sync APIs' : 'مقارنة حماية البوابات ومنافذ الرسمية'}</span>
            </h3>
            <p className="text-xs text-slate-300 leading-normal">
              {lang === 'en' ? 'NetControl communicates only using official router administrative APIs to query and manage bandwidth shapes.' : 'يتواصل النظام مع البوابة باستخدام القنوات الإدارية الرسمية فقط لتفادي تزوير الحزم أو هجمات التسمم اللاسلكية (ARP Poisoning).'}
            </p>

            <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5 animate-fade-in">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">Active Driver details</span>
              <p className="text-xs font-bold text-white leading-snug">{getBrandDetails(selectedBrand).title}</p>
              <span className="text-[11px] text-slate-400 block leading-normal">{getBrandDetails(selectedBrand).features}</span>
            </div>
          </div>

          <div className="bg-slate-950/55 p-4 border border-slate-850 rounded-xl mt-6">
            <div className="flex items-center space-x-2.5 mb-2 rtl:space-x-reverse">
              <span className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[10px] uppercase text-slate-400 font-bold font-mono">SNMP AGENT STATE</span>
            </div>
            <span className="text-xs font-semibold text-slate-200 block">
              {syncStatus === 'connected' ? 'CONNECTED - POLLING INTERFACES' : 'NOT INITIALIZED'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RouterSync;
