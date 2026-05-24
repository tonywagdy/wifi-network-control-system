import React from 'react';
import { NetworkAlert } from '../types';
import { ShieldCheck, Octagon, Bell, CheckCheck, Landmark, ShieldX } from 'lucide-react';

interface AlertsProps {
  alerts: NetworkAlert[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  lang: 'en' | 'ar';
}

const Alerts: React.FC<AlertsProps> = ({ alerts, onMarkRead, onClearAll, lang }) => {
  const getSeverityStyle = (v: string) => {
    switch (v) {
      case 'critical': return 'bg-rose-950/40 text-rose-400 border-rose-800';
      case 'high': return 'bg-orange-950/40 text-orange-400 border-orange-800';
      case 'medium': return 'bg-amber-950/40 text-amber-300 border-amber-800';
      default: return 'bg-sky-950/40 text-sky-400 border-sky-800';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'new_device': return '📡';
      case 'high_bandwidth': return '⚡';
      case 'suspicious_activity': return '☠️';
      default: return '⚠️';
    }
  };

  return (
    <div id="alerts-view-root" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {lang === 'en' ? 'Network Security Alerts' : 'تنبيهات أمن الشبكة والمراقبة'}
          </h2>
          <p className="text-slate-400 text-sm">
            {lang === 'en' ? 'Real-time security triggers, suspicious hosts behavior and state flags' : 'حوافز أمنية بالوقت الفعلي، رصد سلوك المضيفين المريب'}
          </p>
        </div>
        {alerts.length > 0 && (
          <button
            id="btn-clear-alerts"
            onClick={onClearAll}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 rtl:space-x-reverse transition-all border border-slate-700"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{lang === 'en' ? 'Acknowledge & Dismiss All' : 'تأكيد وقراءة الكل'}</span>
          </button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="bg-slate-900/40 p-16 text-center rounded-2xl border border-dashed border-slate-800 space-y-3.5">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 mx-auto rounded-full flex items-center justify-center border border-emerald-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <p className="text-slate-200 font-bold text-lg">{lang === 'en' ? 'Network security pristine' : 'حالة أمن الشبكة ممتازة'}</p>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            {lang === 'en' ? 'All active daemon rules compiled. Zero policy breach, unknown sweep attempts or bandwidth overflows detected recently.' : 'تم تجميع قواعد الحماية النشطة. لم يتم الكشف مؤخراً عن أي خروق، محاولات مسح غريبة أو استهلاك زائد للنطاق.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((al) => (
            <div
              key={al.id}
              className={`border p-5 rounded-2xl transition-all relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                al.read ? 'bg-slate-900/30 border-slate-800/80' : 'bg-slate-900 border-indigo-500/20'
              }`}
            >
              {/* Unread indicator light dot */}
              {!al.read && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              )}

              <div className="flex items-start space-x-4 rtl:space-x-reverse">
                <span className="text-4xl p-2 bg-slate-950 rounded-xl leading-none border border-slate-800">
                  {getAlertIcon(al.type)}
                </span>
                <div>
                  <div className="flex items-center space-x-2.5 rtl:space-x-reverse flex-wrap">
                    <h3 className="text-base font-bold text-white">{al.title}</h3>
                    <span className={`text-[10px] border uppercase px-1.5 py-0.5 rounded font-extrabold ${getSeverityStyle(al.severity)}`}>
                      {al.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-1.5 leading-normal max-w-2xl">{al.message}</p>
                  <div className="flex items-center space-x-4 text-[10px] text-slate-500 font-mono mt-2 flex-wrap">
                    <span>{new Date(al.timestamp).toLocaleString()}</span>
                    {al.deviceMac && (
                      <>
                        <span>|</span>
                        <span>Client MAC: {al.deviceMac}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {!al.read && (
                <button
                  id={`btn-ack-alert-${al.id}`}
                  onClick={() => onMarkRead(al.id)}
                  className="bg-indigo-600/15 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-400 font-bold text-xs px-3.5 py-2 rounded-lg scroll-px-0.5"
                >
                  {lang === 'en' ? 'Acknowledge' : 'قراءة وتأكيد'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Alerts;
