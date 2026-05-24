import React, { useState } from 'react';
import { Key, ShieldAlert, Wifi, Globe, Lock, UserCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (role: 'admin' | 'viewer') => void;
  lang: 'en' | 'ar';
}

const Login: React.FC<LoginProps> = ({ onLogin, lang }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic standard mock auth check for safe deployment simulation
    if (username === 'admin' && password === 'admin') {
      onLogin('admin');
    } else if (username === 'viewer' && password === 'viewer') {
      onLogin('viewer');
    } else {
      setErrorMsg(lang === 'en' ? 'Authentication mismatch! Use admin/admin' : 'خطأ ببيانات تسجيل الدخول! يرجى استخدام admin/admin');
    }
  };

  return (
    <div id="login-container-root" className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Visual neon backdrops */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 blur-3xl rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 blur-3xl rounded-full" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-800 p-8 rounded-3xl space-y-6 relative z-10 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl shadow-lg shadow-indigo-500/20">
            ⚡
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {lang === 'en' ? 'NETCONTROL GATEWAY' : 'بوابة نظام تحكم الشبكة'}
          </h1>
          <p className="text-slate-400 text-xs tracking-wide">
            {lang === 'en' ? 'WiFi Router Management & Local Packet Inspector Console' : 'منظومة إدارة موجه الوايفاي وفحص حزم المقابس المباشرة'}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl text-xs text-rose-400 text-center font-semibold font-mono">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
              {lang === 'en' ? 'User Identity' : 'اسم المستخدم للمشرف'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <UserCheck className="w-4 h-4" />
              </span>
              <input
                id="login-username"
                type="text"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={username}
                placeholder="E.g. admin"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
              {lang === 'en' ? 'System Keyphrase' : 'كلمة المرور'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="login-password"
                type="password"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                value={password}
                placeholder="••••••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <span className="text-[10px] text-slate-500 block mt-1 tracking-wide font-mono">
              ★ {lang === 'en' ? 'Enter default username/pass: admin / admin' : 'بيانات الدخول الافتراضية: admin / admin'}
            </span>
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-indigo-600/30"
          >
            <Key className="w-4 h-4" />
            <span>{lang === 'en' ? 'Authenticate Identity' : 'تسجيل دخول آمن'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
