import React from 'react';
import { Device, NetworkStats } from '../types';
import { Network, Cpu, HardDrive, ShieldAlert, Wifi, Globe, Play, Square, Settings as SettingsIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

interface DashboardProps {
  stats: NetworkStats;
  devices: Device[];
  bandwidthData: { time: string; download: number; upload: number }[];
  onTriggerScan: () => void;
  lang: 'en' | 'ar';
}

const Dashboard: React.FC<DashboardProps> = ({ stats, devices, bandwidthData, onTriggerScan, lang }) => {
  const onlineDevicesCount = devices.filter(d => d.status === 'online').length;
  const blockedDevicesCount = devices.filter(d => d.blocked).length;

  const topDownloadingDevices = [...devices]
    .filter(d => d.status === 'online')
    .sort((a, b) => b.currentDownloadKbps - a.currentDownloadKbps)
    .slice(0, 5);

  const formatBps = (kbps: number) => {
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(1)} Mbps`;
    }
    return `${kbps.toFixed(0)} Kbps`;
  };

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Upper bar with dynamic scan trigger */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {lang === 'en' ? 'System Overview' : 'نظرة عامة على النظام'}
          </h2>
          <p className="text-slate-400 text-sm">
            {lang === 'en' ? 'Live status & network telemetries from local router gateway' : 'الحالة المباشرة والاتصالات اللاسلكية من بوابة الموجه المحلي'}
          </p>
        </div>
        <button
          id="btn-scan-network"
          onClick={onTriggerScan}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all shadow-lg shadow-indigo-600/30"
        >
          <Network className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
          <span>{lang === 'en' ? 'Quick Target ARP Scan' : 'مسح ARP سريع'}</span>
        </button>
      </div>

      {/* Grid Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wifi className="w-16 h-16 text-cyan-400" />
          </div>
          <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">
            {lang === 'en' ? 'DEVICES ONLINE' : 'الأجهزة النشطة'}
          </span>
          <p className="text-4xl font-extrabold text-white mt-1">{onlineDevicesCount}</p>
          <p className="text-xs text-slate-400 mt-2">
            <span>{devices.length} {lang === 'en' ? 'Total IP mappings cached' : 'إجمالي تعيينات العناوين المكتشفة'}</span>
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Globe className="w-16 h-16 text-indigo-400" />
          </div>
          <span className="text-xs font-semibold text-indigo-400 tracking-wider uppercase">
            {lang === 'en' ? 'DOWNLOAD INTERNET' : 'سرعة التنزيل'}
          </span>
          <p className="text-4xl font-extrabold text-white mt-1">{stats.currentDownloadSpeed.toFixed(2)} <span className="text-lg">Mbps</span></p>
          <p className="text-xs text-slate-400 mt-2">
            <span>{lang === 'en' ? 'Total DL: ' : 'إجمالي التنزيل: '} {(stats.totalDownloadedMb / 1024).toFixed(1)} GB</span>
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Globe className="w-16 h-16 text-purple-400" />
          </div>
          <span className="text-xs font-semibold text-purple-400 tracking-wider uppercase">
            {lang === 'en' ? 'UPLOAD INTERNET' : 'سرعة الرفع'}
          </span>
          <p className="text-4xl font-extrabold text-white mt-1">{stats.currentUploadSpeed.toFixed(2)} <span className="text-lg">Mbps</span></p>
          <p className="text-xs text-slate-400 mt-2">
            <span>{lang === 'en' ? 'Total UL: ' : 'إجمالي الرفع: '} {(stats.totalUploadedMb / 1024).toFixed(1)} GB</span>
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert className="w-16 h-16 text-rose-500" />
          </div>
          <span className="text-xs font-semibold text-rose-400 tracking-wider uppercase">
            {lang === 'en' ? 'BLOCKED TARGETS' : 'الأجهزة المحظورة'}
          </span>
          <p className="text-4xl font-extrabold text-white mt-1">{blockedDevicesCount}</p>
          <p className="text-xs text-slate-400 mt-2">
            <span className="text-rose-400">{lang === 'en' ? 'ARP Filter enforcement active' : 'تنفيذ تصفية ARP نشط'}</span>
          </p>
        </div>
      </div>

      {/* Graphs Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-Time Live Bandwidth Chart */}
        <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {lang === 'en' ? 'Real-Time Bandwidth Usage' : 'استهلاك حزمة النطاق المباشر'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'en' ? 'Monitored via raw socket packet inspector counters' : 'مراقب عبر عدادات فحص حزم المقابس الخام'}
              </p>
            </div>
            <div className="flex space-x-3 text-xs">
              <span className="flex items-center text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 mr-1.5 inline-block" />
                {lang === 'en' ? 'Download' : 'تنزيل'}
              </span>
              <span className="flex items-center text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 mr-1.5 inline-block" />
                {lang === 'en' ? 'Upload' : 'رفع'}
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bandwidthData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="downloadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" strokeWidth={1} style={{ fontSize: '10px' }} />
                <YAxis stroke="#475569" strokeWidth={1} style={{ fontSize: '10px' }} label={{ value: 'Kbps', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: '10px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="download" stroke="#22d3ee" fillOpacity={1} fill="url(#downloadGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="upload" stroke="#6366f1" fillOpacity={1} fill="url(#uploadGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top consuming list */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">
            {lang === 'en' ? 'Top Bandwidth Consumers' : 'الأجهزة الأكثر استهلاكاً'}
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            {lang === 'en' ? 'Clients with highest live traffic rate' : 'العملاء الأكثر نقلاً للبيانات بالوقت الحالي'}
          </p>

          <div className="space-y-4">
            {topDownloadingDevices.map((dev) => (
              <div key={dev.id} className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-slate-200 truncate max-w-[120px]">
                    {dev.nickname || dev.hostname}
                  </span>
                  <span className="text-xs font-semibold font-mono text-cyan-400">
                    {formatBps(dev.currentDownloadKbps)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-2">
                  <span>{dev.vendor}</span>
                  <span className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-400">{dev.ip}</span>
                </div>
                {/* Visual meter bar */}
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                    style={{
                      width: `${Math.min(100, (dev.currentDownloadKbps / 25000) * 100)}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Internal Server Statistics and Hardware telemetry */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-1">
          {lang === 'en' ? 'Local System Resource Usage' : 'استهلاك موارد النظام المحلي'}
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          {lang === 'en' ? 'Hardware telemetries reported by daemon psutil process API' : 'القياسات العتادية المبلغ عنها من واجهة برمجة تطبيقات psutil'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex items-center space-x-4 rtl:space-x-reverse">
            <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">CPU Usage</span>
                <span className="font-mono text-cyan-400">{stats.cpuUsage}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${stats.cpuUsage}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex items-center space-x-4 rtl:space-x-reverse">
            <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
              <HardDrive className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">RAM Usage</span>
                <span className="font-mono text-indigo-400">{stats.ramUsage}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400" style={{ width: `${stats.ramUsage}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex items-center space-x-4 rtl:space-x-reverse">
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
              <Wifi className="w-6 h-6" />
            </div>
            <div className="space-y-0.5 text-xs">
              <span className="text-slate-400 block font-semibold">{lang === 'en' ? 'ROUTER GATEWAY' : 'موجه العبور'}</span>
              <span className="text-white font-mono block">{stats.routerIp} ({stats.routerPing}ms)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
