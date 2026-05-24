import React, { useState } from 'react';
import { SystemSettings } from '../types';
import { Save, RefreshCw, Eye, Languages, Network, EyeOff, Radio, Smartphone } from 'lucide-react';

interface SettingsProps {
  settings: SystemSettings;
  onSaveSettings: (settings: SystemSettings) => void;
  lang: 'en' | 'ar';
  setLang: (lang: 'en' | 'ar') => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSaveSettings, lang, setLang }) => {
  const [form, setForm] = useState<SystemSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setLang(form.language);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div id="settings-view-root" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {lang === 'en' ? 'System Configurations' : 'إعدادات المنظومة والشبكة'}
        </h2>
        <p className="text-slate-400 text-sm">
          {lang === 'en' ? 'Fine-tune ARP scan rates, daemon parameters, SSIDs, and local interface bounds' : 'تعديل وتخصيص فترات فحص ARP، إطارات بوابة الموجه، وأمن العبور'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core daemon scan bounds parameters */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Radio className="text-indigo-400 w-5 h-5" />
            <span>{lang === 'en' ? 'ARP Engine Bounds' : 'خصائص محرك فحص ARP والشبكة'}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                {lang === 'en' ? 'Scan IP Range Target' : 'نطاق فحص الآي بي المستهدف'}
              </label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                value={form.scanIpRange}
                onChange={(e) => setForm({ ...form, scanIpRange: e.target.value })}
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Local Gateway network domain. E.g. 192.168.1.1/24</span>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                {lang === 'en' ? 'Active Sweep Interval' : 'فترة تكرار الفحص النشط'}
              </label>
              <div className="flex space-x-2 items-center">
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  value={form.scanInterval}
                  onChange={(e) => setForm({ ...form, scanInterval: parseInt(e.target.value) || 15 })}
                />
                <span className="text-xs text-slate-400">{lang === 'en' ? 'Seconds' : 'ثانية'}</span>
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                {lang === 'en' ? 'Active Router SSID' : 'اسم شبكة الوايفاي النشط'}
              </label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={form.routerSsid}
                onChange={(e) => setForm({ ...form, routerSsid: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                {lang === 'en' ? 'Router Gateway Address' : 'عنوان بوابة العبور الافتراضية'}
              </label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                value={form.routerGateway}
                onChange={(e) => setForm({ ...form, routerGateway: e.target.value })}
              />
            </div>
          </div>

          <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3 pt-3 flex items-center gap-2">
            <Smartphone className="text-indigo-400 w-5 h-5" />
            <span>{lang === 'en' ? 'Security & Active Threshold Policy' : 'الأمان وتأكيدات فحص النطاق العريض'}</span>
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-slate-200">{lang === 'en' ? 'Auto block unknown connected macs' : 'الحظر التلقائي للأجهزة غير المعروفة'}</p>
                <span className="text-xs text-slate-500 leading-normal block">
                  {lang === 'en' ? 'Flag any device not inside local whitelist and deploy immediate passive ARP spoof' : 'حظر أي جهاز فور دخوله الشبكة إذا لن يكن ضمن القائمة الموثوقة'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.autoBlockUnknown}
                  onChange={(e) => setForm({ ...form, autoBlockUnknown: e.target.checked })}
                />
                <div className="w-11 h-6 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white" />
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-slate-200">{lang === 'en' ? 'Enable Live alert notification triggers' : 'تفعيل إطلاق التنبيهات المباشرة'}</p>
                <span className="text-xs text-slate-500 leading-normal block">
                  {lang === 'en' ? 'Trigger alert cards inside telemetry console for new MAC bindings' : 'إطلاق لوحات تنبيهات مخصصة بصفحة التنبيهات مع ظهور أي عناوين جديدة'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.enableAlerts}
                  onChange={(e) => setForm({ ...form, enableAlerts: e.target.checked })}
                />
                <div className="w-11 h-6 bg-slate-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white" />
              </label>
            </div>
          </div>
        </div>

        {/* Global localized and display settings */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <Languages className="text-indigo-400 w-5 h-5" />
              <span>{lang === 'en' ? 'Localization' : 'اللغة والمظهر'}</span>
            </h3>

            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">
                {lang === 'en' ? 'Select Domain Interface Language' : 'لغة واجهة الاستخدام'}
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value as 'en' | 'ar' })}
              >
                <option value="en">English (US Standard)</option>
                <option value="ar">العربية (Arabic Localized)</option>
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">
                {lang === 'en' ? 'Theme Mode' : 'السمة والمظهر'}
              </label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={form.darkTheme ? 'dark' : 'light'}
                onChange={(e) => setForm({ ...form, darkTheme: e.target.value === 'dark' })}
              >
                <option value="dark">{lang === 'en' ? 'Enigma Dark Theme (Recommended)' : 'المظهر الغامق (موصى به)'}</option>
                <option value="light">{lang === 'en' ? 'Clean Professional Light' : 'المظهر المضيء'}</option>
              </select>
            </div>
          </div>

          {/* Action triggers for state retention */}
          <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">{lang === 'en' ? 'Commit changes' : 'حفظ الخيارات'}</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {lang === 'en' ? 'All local settings will compile down to SQLite state and align daemon loop variables on key update.' : 'سيتم المزامنة الفورية لكافة المتغيرات وحفظها في قاعدة SQLite المحلية.'}
            </p>

            <button
              id="btn-save-settings-form"
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-indigo-600/30"
            >
              <Save className="w-5 h-5" />
              <span>{lang === 'en' ? 'Compile & Save Settings' : 'حفظ ومزامنة المتغيرات'}</span>
            </button>

            {saveSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-850 p-3 rounded-lg text-xs text-emerald-400 text-center font-semibold font-mono">
                {lang === 'en' ? '✓ Compiled successfully to SQLite file system' : '✓ تم المزامنة والحفظ بنجاح لقاعدة البيانات المجهّزة'}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
