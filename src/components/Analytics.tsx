import React, { useState, useEffect } from 'react';
import { Device, NetworkStats } from '../types';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, Upload, Activity, ShieldCheck, ShieldAlert, Cpu, Terminal, TrendingUp, AlertTriangle, Play, HelpCircle, Shuffle } from 'lucide-react';

interface AnalyticsProps {
  devices: Device[];
  stats: NetworkStats;
  lang: 'en' | 'ar';
}

interface PacketTelemetry {
  id: number;
  protocol: 'TCP' | 'UDP' | 'DNS' | 'HTTPS' | 'QUIC';
  payloadBytes: number;
  sourceIp: string;
  destDomain: string;
  flag: string;
}

const Analytics: React.FC<AnalyticsProps> = ({ devices, stats, lang }) => {
  const [packetQueue, setPacketQueue] = useState<PacketTelemetry[]>([]);
  const [securityStatus, setSecurityStatus] = useState({
    rogueScansActive: true,
    portScansDetected: 0,
    macSpoofingAlerts: 1,
    unauthorizedHandshakes: 0
  });

  const onlineDevices = devices.filter(d => d.status === 'online');

  // Prepare device bandwidth distribution data
  const chartData = onlineDevices.map((d) => ({
    name: d.nickname || d.hostname,
    download: parseFloat((d.currentDownloadKbps / 1024).toFixed(2)), // in Mbps
    upload: parseFloat((d.currentUploadKbps / 1024).toFixed(2)), // in Mbps
  })).sort((a, b) => b.download - a.download);

  // Device types break-down metrics
  const typeCounts = devices.reduce((acc: { [key: string]: number }, d) => {
    acc[d.deviceType] = (acc[d.deviceType] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(typeCounts).map((key) => ({
    name: key.toUpperCase(),
    value: typeCounts[key],
  }));

  const COLORS = ['#22d3ee', '#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

  // Predictive traffic forecasting data
  const forecastData = [
    { day: 'Mon', historical: 18.4, forecasted: 18.4 },
    { day: 'Tue', historical: 22.1, forecasted: 22.1 },
    { day: 'Wed', historical: 19.5, forecasted: 19.5 },
    { day: 'Thu', historical: 24.8, forecasted: 24.8 },
    { day: 'Fri', historical: null, forecasted: 26.2 },
    { day: 'Sat', historical: null, forecasted: 29.5 },
    { day: 'Sun', historical: null, forecasted: 27.8 }
  ];

  // System-wide AI Recommendations list
  const aiRecommendations = [
    {
      id: 'rec_1',
      score: 94,
      badge: 'Gaming Priority Conflict',
      desc: lang === 'en' 
        ? 'Desktop streaming on 192.168.1.105 demands high bandwidth while Playstation on 192.168.1.110 experiences latency jitter. Dynamic QoS rate limiting of 5 Mbps is recommended for background downloads.'
        : 'يعاني جهاز الألعاب من تفاوت في زمن الاستجابة (Jitter) بسبب تحميل بالخلفية على جهاز 192.168.1.105. يوصى بتطبيق تنظيم ذكي للسرعة بمعدل 5 Mbps.'
    },
    {
      id: 'rec_2',
      score: 88,
      badge: 'Unused IoT Isolation',
      desc: lang === 'en' 
        ? 'Rogue smart thermostat exhibits periodic outgoing handshakes outside timezone profile. Restricting outward gateways via OpenWRT sandbox UCI rule is advised.'
        : 'لوحظت طلبات مكررة خارج المنطقة الزمنية من جهاز التكييف الذكي. يوصى بعزله عن المضيفين الخارجيين عبر سكريبت OpenWRT المتاح.'
    }
  ];

  // Dynamic packet generator simulation
  useEffect(() => {
    const protocols: ('TCP' | 'UDP' | 'DNS' | 'HTTPS' | 'QUIC')[] = ['TCP', 'UDP', 'DNS', 'HTTPS', 'QUIC'];
    const domains = ['google.com', 'microsoft.com', 'netflix.com', 'github.com', 'apple.com', 'cloudflare.com'];
    
    const packetTimer = setInterval(() => {
      const eligibleDevices = onlineDevices.filter(d => d.deviceType !== 'router');
      if (eligibleDevices.length === 0) return;

      const randomDev = eligibleDevices[Math.floor(Math.random() * eligibleDevices.length)];
      const randomProt = protocols[Math.floor(Math.random() * protocols.length)];
      const randomBytes = Math.floor(Math.random() * 1200) + 40;
      const randomDomain = domains[Math.floor(Math.random() * domains.length)];

      const freshPacket: PacketTelemetry = {
        id: Date.now() + Math.random(),
        protocol: randomProt,
        payloadBytes: randomBytes,
        sourceIp: randomDev.ip,
        destDomain: randomDomain,
        flag: randomProt === 'TCP' ? 'SYN' : randomProt === 'HTTPS' ? 'ACK' : 'NONE'
      };

      setPacketQueue(prev => [freshPacket, ...prev.slice(0, 15)]); // Keep trailing 16
    }, 1800);

    return () => clearInterval(packetTimer);
  }, [devices]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + ["IP Address,MAC Address,Hostname,Nickname,Vendor,Status,Blocked,Limit Kbps"].join("\n") + "\n"
    + devices.map(d => `${d.ip},${d.mac},${d.hostname},${d.nickname || ''},${d.vendor || ''},${d.status},${d.blocked},${d.bandwidthLimit}`).join("\n");

  const encodedUri = encodeURI(csvContent);

  return (
    <div id="analytics-view-root" className="space-y-6">
      
      {/* Title section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {lang === 'en' ? 'Traffic Analytics & ISP Reports' : 'تحليلات نقل البيانات والتقارير'}
          </h2>
          <p className="text-slate-400 text-sm">
            {lang === 'en' ? 'Active packet inspection, system security scanners, and resource telemetry charts' : 'فحص الحزم الآمن، مؤشرات الحماية من الاختراق، ومقاييس جودة الخدمة لجميع المضيفين'}
          </p>
        </div>
        <a
          id="btn-export-csv"
          href={encodedUri}
          download="Network_Control_System_Report.csv"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
        >
          <Download className="w-5 h-5" />
          <span>{lang === 'en' ? 'Export Local Device CSV' : 'تصدير بيانات الأجهزة CSV'}</span>
        </a>
      </div>

      {/* Stats summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center space-x-4 rtl:space-x-reverse">
          <div className="p-3 bg-cyan-600/15 text-cyan-400 rounded-xl">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold">{lang === 'en' ? 'ACCUMULATED DOWNLOAD' : 'إجمالي التنزيل التراكمي'}</span>
            <span className="text-xl font-bold text-white block">{(stats.totalDownloadedMb / 1024).toFixed(2)} GB</span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center space-x-4 rtl:space-x-reverse">
          <div className="p-3 bg-indigo-600/15 text-indigo-400 rounded-xl">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold">{lang === 'en' ? 'ACCUMULATED UPLOAD' : 'إجمالي الرفع التراكمي'}</span>
            <span className="text-xl font-bold text-white block">{(stats.totalUploadedMb / 1024).toFixed(2)} GB</span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center space-x-4 rtl:space-x-reverse">
          <div className="p-3 bg-purple-600/15 text-purple-400 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold">{lang === 'en' ? 'ACTIVE LEASE ALLOCATION' : 'إجمالي توزيع العناوين النشطة'}</span>
            <span className="text-xl font-bold text-white block">{onlineDevices.length} / {devices.length}</span>
          </div>
        </div>
      </div>

      {/* Grid: Bar chart + Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main speed consumption chart */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {lang === 'en' ? 'Active Speed Consumption per Host (Mbps)' : 'معدل استهلاك السرعة المباشر لكل جهاز (ميغابت/ثانية)'}
          </h3>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} tickLine={false} />
                <YAxis stroke="#64748b" style={{ fontSize: '10px' }} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="download" name="Download (Mbps)" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                <Bar dataKey="upload" name="Upload (Mbps)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Pie Chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              {lang === 'en' ? 'Device Categories Profile' : 'التقسيم الفئوي للأجهزة'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {lang === 'en' ? 'Breakdown of host fingerprinter rules' : 'مخطط فئات أجهزة ومضيفي الشبكة بالكامل'}
            </p>
          </div>

          <div className="h-56 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-xs uppercase text-slate-400 tracking-wider font-semibold">{lang === 'en' ? 'Total cached' : 'الإجمالي'}</span>
              <span className="text-2xl font-black text-white block">{devices.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center space-x-2 rtl:space-x-reverse text-slate-300">
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span>{item.name}: <b>{item.value}</b></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid 2: Advanced AI Recommendations & Adaptive Traffic Forecasting */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dynamic Traffic Forecasting */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="text-emerald-400 w-5 h-5" />
                <span>{lang === 'en' ? 'Adaptive Bandwidth Predictive Forecasting' : 'توقعات استهلاك حزم النطاقات المجدولة'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'en' ? 'Machine learning local linear regression modeling based on historical daily leases' : 'نمذجة التوقعات القادمة لباقة الإنترنت المتبقية لحساب فترات الذروة آلياً'}
              </p>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border border-emerald-500/20">
              ACCURATE FORECAST
            </span>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" style={{ fontSize: '10px' }} />
                <YAxis label={{ value: 'Daily MB', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: '9px' }} stroke="#64748b" style={{ fontSize: '10px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="historical" name="Historical Actual (MB)" stroke="#22d3ee" strokeWidth={2} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="forecasted" name="Future Forecasted (MB)" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Recommendations Panel */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-1.5">
              <Cpu className="text-cyan-400 w-5 h-5" />
              <span>{lang === 'en' ? 'Bandwidth AI Optimizer' : 'محسن النطاق بالذكاء الاصطناعي'}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              {lang === 'en' ? 'Live network telemetry diagnosis & heuristics recommendations:' : 'توصيات ذكية لتحسين معدلات النطاقات للأجهزة المتزاحمة:'}
            </p>

            <div className="space-y-4">
              {aiRecommendations.map(rec => (
                <div key={rec.id} className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-indigo-500/25">
                      {rec.badge}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-bold font-mono">Score: {rec.score}/100</span>
                  </div>
                  <p className="text-[11.5px] text-slate-300 leading-normal font-mono">
                    {rec.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 border border-slate-850 rounded-xl mt-4 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold font-mono">EST SAVINGS</span>
            <span className="text-emerald-400 font-extrabold font-mono text-sm">~ 45 GB / month</span>
          </div>
        </div>
      </div>

      {/* Grid 3: Live Safe Packet inspection and Intrusion Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Safe network packets list */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="text-indigo-400 w-5 h-5" />
                <span>{lang === 'en' ? 'DNS & Outbound Local Socket Inspector' : 'فاحص حزم ومقابس الشبكة المباشر'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'en' ? 'Safe read-only snmp & netstat logs representing telemetry activities' : 'قراءة آمنة لسجلات الحزم والبروتوكولات النشطة دون انتهاك الخصوصية'}
              </p>
            </div>
            <span className="bg-indigo-505/10 text-indigo-400 text-[10.5px] uppercase font-mono font-bold flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
              LIVE PROBE
            </span>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-850 p-4 font-mono text-[10.5px] divide-y divide-slate-900 max-h-64 overflow-y-auto leading-relaxed">
            {packetQueue.length === 0 ? (
              <div className="text-slate-500 text-center py-10">
                ⌛ Querying DHCP tables for live packet telemetries...
              </div>
            ) : (
              packetQueue.map((pkt) => (
                <div key={pkt.id} className="py-2 flex justify-between items-center gap-4 animate-slide-in text-slate-300">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${
                      pkt.protocol === 'DNS' ? 'bg-amber-600/10 border-amber-500/30 text-yellow-400' :
                      pkt.protocol === 'HTTPS' ? 'bg-cyan-600/10 border-cyan-500/30 text-cyan-400' :
                      'bg-indigo-600/10 border-indigo-500/30 text-indigo-400'
                    }`}>
                      {pkt.protocol}
                    </span>
                    <span className="text-indigo-200 font-bold">{pkt.sourceIp}</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-slate-400">{pkt.destDomain}</span>
                  </div>
                  <div className="text-right text-[10px] text-slate-450 space-x-2">
                    <span>{pkt.payloadBytes} bytes</span>
                    {pkt.flag !== 'NONE' && <span className="bg-slate-900 px-1 rounded text-[8.5px] uppercase font-bold tracking-wider">{pkt.flag}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Advanced Intrusion Security controls */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <ShieldAlert className="text-rose-400 w-5 h-5 animate-pulse" />
            <span>{lang === 'en' ? 'Administrative Intrusion Monitor' : 'لوحة حماية جدار الحماية والأمان'}</span>
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">Rogue device blocker:</span>
              <span className="text-emerald-400 font-bold uppercase text-[10px] bg-emerald-950/20 px-1 rounded">ACTIVE</span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">Port Scan attempts:</span>
              <span className="text-slate-300 font-bold">{securityStatus.portScansDetected} detected</span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">Arp/MAC spoof alerts:</span>
              <span className="text-amber-500 font-bold bg-amber-950/15 px-1 rounded">1 alert cached</span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">Brute-force attempts:</span>
              <span className="text-slate-300 font-bold">0 detected</span>
            </div>
          </div>

          <div className="bg-slate-950 p-4 border border-rose-900/35 bg-rose-950/10 rounded-xl flex gap-2.5 items-start">
            <AlertTriangle className="text-rose-400 w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10.5px] font-bold text-rose-400 leading-snug">Rogue MAC Address notification</p>
              <span className="text-[9.5px] text-slate-300 leading-normal block">
                Warning: Host with signature <b>(E8:02:AA:7B:0F:CC)</b> did not issue DHCP lease before ARP entry injection. Automatic isolation quarantine active.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
