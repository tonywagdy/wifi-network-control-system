import React, { useState } from 'react';
import { SystemLog } from '../types';
import { Terminal, Search, AlertCircle, Info, ShieldAlert, Wifi } from 'lucide-react';

interface SystemLogsProps {
  logs: SystemLog[];
  lang: 'en' | 'ar';
}

const SystemLogs: React.FC<SystemLogsProps> = ({ logs, lang }) => {
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const filtered = logs.filter((log) => {
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase()) || log.category.includes(search);
    const matchesLevel = filterLevel === 'all' ? true : log.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const getLevelStyle = (lvl: string) => {
    switch (lvl) {
      case 'security': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'error': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'warning': return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      default: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  return (
    <div id="logs-view-root" className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="text-indigo-400" />
            <span>{lang === 'en' ? 'System Telemetry Logs' : 'سجلات وفحوصات النظام'}</span>
          </h2>
          <p className="text-slate-400 text-sm">
            {lang === 'en' ? 'Daemon output events, firewall filters, and target scan reports' : 'سجل أحداث العملية الخلفية، تصفية جدار الحماية، وفحص المضيفين'}
          </p>
        </div>
      </div>

      {/* Logger search parameters */}
      <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-white focus:outline-none focus:border-indigo-500"
            placeholder={lang === 'en' ? 'Filter messages...' : 'ابحث بالسجلات...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="text-xs text-slate-400 font-semibold uppercase">{lang === 'en' ? 'Severity' : 'الخطورة'}:</span>
          <select
            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
          >
            <option value="all">{lang === 'en' ? 'All Severity' : 'كل السجلات'}</option>
            <option value="info">INFO</option>
            <option value="warning">WARNING</option>
            <option value="error">ERROR</option>
            <option value="security">SECURITY ALARM</option>
          </select>
        </div>
      </div>

      {/* Terminal logs stack client output */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center text-slate-400">
          <span className="text-xs font-semibold tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            LIVE DIAGNOSTICS DEPLOYMENT CONSOLE
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-500">SQLite Log Storage active</span>
        </div>

        <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto leading-normal">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <span className="text-xl">🛠️</span>
              <p className="mt-2 text-xs">{lang === 'en' ? 'No log lines match current filters' : 'لا تتوفر سجلات مطابقة للبحث'}</p>
            </div>
          ) : (
            filtered.map((log) => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-start gap-2.5 pb-3 border-b border-slate-900/60 text-[11px]">
                <span className="text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toISOString()}</span>
                <span className={`text-[9px] uppercase font-bold border rounded px-1.5 py-0.5 whitespace-nowrap select-none ${getLevelStyle(log.level)}`}>
                  {log.level}
                </span>
                <span className="text-purple-400 font-bold uppercase tracking-wide">[{log.category}]</span>
                <span className="text-slate-350">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;
