import React, { useState } from 'react';
import { WebFilterRule } from '../types';
import { Shield, FileCode, Download, Copy, Check, Terminal, Server, HelpCircle, HardDrive } from 'lucide-react';

interface EnforcementScriptGeneratorProps {
  webRules: WebFilterRule[];
  lang: 'en' | 'ar';
}

const EnforcementScriptGenerator: React.FC<EnforcementScriptGeneratorProps> = ({ webRules, lang }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<'windows' | 'dnsmasq' | 'hosts' | 'openwrt' | 'mikrotik'>('windows');
  const [copied, setCopied] = useState(false);

  const activeBlockedDomains = webRules
    .filter(r => r.active && r.action === 'block')
    .map(r => r.domain);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPowerShellScript = () => {
    if (activeBlockedDomains.length === 0) {
      return `# No domains blocked. Add active blacklisted rules in the Domain Registry above.`;
    }
    let script = `# ==========================================================\n`;
    script += `# WINDOWS FIREWALL ADMINISTRATIVE ENFORCEMENT SCRIPT\n`;
    script += `# Run in elevated Administrator PowerShell terminal\n`;
    script += `# Generated at: ${new Date().toLocaleString()}\n`;
    script += `# ==========================================================\n\n`;
    
    activeBlockedDomains.forEach((domain, idx) => {
      script += `# Rule [${idx + 1}] - Block traffic to/from: ${domain}\n`;
      script += `Write-Host "Enforcing DNS/Firewall sinkhole rule for ${domain}..." -ForegroundColor Cyan\n`;
      script += `New-NetFirewallRule -DisplayName "NETCONTROL_BLOCK_${domain.replace(/[^a-zA-Z0-9]/g, '_')}" \\\n`;
      script += `  -Direction Outbound -Action Block -RemoteAddress "${domain}" \\\n`;
      script += `  -Description "Enforced by NetControl Parental Safety Policy" -Enabled True\n\n`;
    });
    
    script += `Write-Host "All outbound block rules loaded successfully!" -ForegroundColor Green\n`;
    return script;
  };

  const getDnsmasqConfig = () => {
    if (activeBlockedDomains.length === 0) {
      return `# No domains blocked. Add active blacklisted rules in the Domain Registry above.`;
    }
    let script = `# ==========================================================\n`;
    script += `# DNSMASQ SINKHOLE ROUTING CONFIGURATION\n`;
    script += `# Paste at the bottom of /etc/dnsmasq.conf or /etc/dnsmasq.d/netcontrol.conf\n`;
    script += `# Generated at: ${new Date().toLocaleString()}\n`;
    script += `# ==========================================================\n\n`;
    
    activeBlockedDomains.forEach((domain) => {
      script += `address=/${domain}/0.0.0.0\n`;
      script += `address=/*.${domain}/0.0.0.0\n`;
    });
    
    script += `\n# SafeSearch enforcement DNS redirects\n`;
    script += `address=/google.com/182.50.136.242 # SafeSearch VIP\n`;
    script += `address=/youtube.com/216.239.38.120 # SafeSearch Restricted VIP\n`;
    return script;
  };

  const getHostsFile = () => {
    if (activeBlockedDomains.length === 0) {
      return `# No domains blocked. Add active blacklisted rules in the Domain Registry above.`;
    }
    let script = `# ==========================================================\n`;
    script += `# NETCONTROL STATIC HOSTS SINKHOLE FILE\n`;
    script += `# Append to /etc/hosts (Linux/macOS) or C:\\Windows\\System32\\drivers\\etc\\hosts (Windows)\n`;
    script += `# Generated at: ${new Date().toLocaleString()}\n`;
    script += `# ==========================================================\n\n`;
    script += `127.0.0.1  localhost\n`;
    script += `::1        localhost\n\n`;
    script += `# ---- BEGIN NETCONTROL BLOCKLISTS ----\n`;
    
    activeBlockedDomains.forEach((domain) => {
      script += `0.0.0.0    ${domain}\n`;
      script += `0.0.0.0    www.${domain}\n`;
    });
    
    script += `# ---- END NETCONTROL BLOCKLISTS ----\n`;
    return script;
  };

  const getOpenWrtScript = () => {
    if (activeBlockedDomains.length === 0) {
      return `# No domains blocked. Add active blacklisted rules in the Domain Registry above.`;
    }
    let script = `#!/bin/sh\n`;
    script += `# ==========================================================\n`;
    script += `# OPENWRT LUCI STANDARD FIREWALL SYNC TRIGGER SCRIPT\n`;
    script += `# Run safely over local SSH root login\n`;
    script += `# ==========================================================\n\n`;
    
    activeBlockedDomains.forEach((domain) => {
      script += `# Blocking traffic target: ${domain}\n`;
      script += `uci add firewall rule\n`;
      script += `uci set firewall.@rule[-1].name='Block_${domain.replace(/[^a-zA-Z0-9]/g, '_')}'\n`;
      script += `uci set firewall.@rule[-1].src='lan'\n`;
      script += `uci set firewall.@rule[-1].dest='wan'\n`;
      script += `uci set firewall.@rule[-1].dest_ip='${domain}'\n`;
      script += `uci set firewall.@rule[-1].target='DROP'\n`;
      script += `uci set firewall.@rule[-1].enabled='1'\n\n`;
    });
    
    script += `uci commit firewall\n`;
    script += `/etc/init.d/firewall restart\n`;
    script += `echo "[NetControl] OpenWRT rules synced and firewall restarted successfully!"\n`;
    return script;
  };

  const getMikroTikScript = () => {
    if (activeBlockedDomains.length === 0) {
      return `# No domains blocked. Add active blacklisted rules in the Domain Registry above.`;
    }
    let script = `# ==========================================================\n`;
    script += `# MIKROTIK ROUTEROS CLI ACCESS RULES GENERATOR\n`;
    script += `# Paste into WinBox New Terminal or WebFig RouterOS terminal\n`;
    script += `# ==========================================================\n\n`;
    script += `/ip dns static\n`;
    
    activeBlockedDomains.forEach((domain) => {
      script += `:do { add name="${domain}" address="0.0.0.0" comment="Blocked by NetControl" } on-error={}\n`;
      script += `:do { add name="*.${domain}" address="0.0.0.0" comment="Blocked by NetControl" } on-error={}\n`;
    });
    
    script += `\n/ip firewall filter\n`;
    script += `add chain=forward action=drop dst-address-list=Blocked_Domains comment="NetControl outbound policy enforcement"\n`;
    return script;
  };

  const getActiveScriptContent = () => {
    switch (selectedPlatform) {
      case 'windows': return getPowerShellScript();
      case 'dnsmasq': return getDnsmasqConfig();
      case 'hosts': return getHostsFile();
      case 'openwrt': return getOpenWrtScript();
      case 'mikrotik': return getMikroTikScript();
      default: return '';
    }
  };

  const getScriptFilename = () => {
    switch (selectedPlatform) {
      case 'windows': return 'BlockRules_WindowsFirewall.ps1';
      case 'dnsmasq': return 'dnsmasq_blocklists.conf';
      case 'hosts': return 'hosts';
      case 'openwrt': return 'openwrt_sync.sh';
      case 'mikrotik': return 'mikrotik_commands.rsc';
      default: return 'script.txt';
    }
  };

  const handleDownload = () => {
    const text = getActiveScriptContent();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getScriptFilename();
    link.click();
    URL.revokeObjectURL(url);
  };

  // Human descriptive text
  const platformDescs = {
    windows: {
      title: 'PowerShell Outbound Rules',
      desc: lang === 'en' ? 'Enforces domain-interception and routing blockades locally via native Windows Defender Firewall rules.' : 'يفيد في فرض حظر العناوين محلياً على أجهزة ويندوز عبر جدار الحماية الأصلي.'
    },
    dnsmasq: {
      title: 'DNSmasq Client Routing',
      desc: lang === 'en' ? 'Generates clean sub-address blocks. Paste directly in Pi-hole or network dnsmasq config sub-directories.' : 'توليد ملفات تصفية متوافقة مع موجهات dnsmasq وأجهزة Pi-hole المنزلية.'
    },
    hosts: {
      title: 'Static /etc/hosts Registry',
      desc: lang === 'en' ? 'Direct secure address-loopback bypass. Perfect for local servers or standalone workstation restrictions.' : 'إعادة توجيه العناوين بنظام حلقة مفرغة 0.0.0.0، مثالي للأجهزة المفردة بدون بوابة.'
    },
    openwrt: {
      title: 'OpenWRT UCI Script',
      desc: lang === 'en' ? 'Pure administrative commands to instantly program OpenWRT-certified LuCI firewalls directly via SSH.' : 'أوامر تنصيب وحظر مرافقة لتثبيت القواعد بجدار نيران OpenWRT مباشرة.'
    },
    mikrotik: {
      title: 'MikroTik static IP/DNS',
      desc: lang === 'en' ? 'Generates static local routing drop directives for RouterOS level filters.' : 'توليد موجهات حظر ثابتة خاصة بوحدات توجيه مايكروتيك المنزلية.'
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileCode className="text-indigo-400 w-5 h-5" />
            <span>{lang === 'en' ? 'Low-Level Policy Deployment Generator' : 'مولد سكريبتات فرض السياسات المباشرة'}</span>
          </h3>
          <p className="text-xs text-slate-400">
            {lang === 'en' ? 'Export current firewall blacklist regulations directly to valid router configurations' : 'تصدير قيود التصفية الحالية وحظر العناوين لملفات إعداد قابلة للتشغيل المباشر'}
          </p>
        </div>
        <span className="bg-indigo-500/10 text-indigo-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-indigo-500/20">
          {lang === 'en' ? 'Safe Admin Methods Only' : 'طرق إدارية مصرحة'}
        </span>
      </div>

      {/* Tabs with selector */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(['windows', 'dnsmasq', 'hosts', 'openwrt', 'mikrotik'] as const).map((plat) => (
          <button
            key={plat}
            onClick={() => setSelectedPlatform(plat)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all truncate text-center uppercase tracking-wider font-mono ${
              selectedPlatform === plat
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200'
            }`}
          >
            {plat}
          </button>
        ))}
      </div>

      {/* Description metadata */}
      <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex items-start gap-3">
        <Server className="text-indigo-400 w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-slate-200">{platformDescs[selectedPlatform].title}</p>
          <span className="text-xs text-slate-400 block leading-relaxed">{platformDescs[selectedPlatform].desc}</span>
        </div>
      </div>

      {/* Code viewer console block */}
      <div className="space-y-2 relative group">
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase px-2">
          <span>{getScriptFilename()} ({activeBlockedDomains.length} block rules)</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleCopy(getActiveScriptContent())}
              className="hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer font-bold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 font-mono text-[10.5px] text-zinc-300 overflow-x-auto max-h-64 leading-relaxed whitespace-pre scrollbar-thin scrollbar-thumb-slate-800">
          {getActiveScriptContent()}
        </div>
      </div>

      <div className="text-[10px] text-slate-500 flex items-center gap-1">
        <HelpCircle className="w-3.5 h-3.5 shrink-0 text-slate-600" />
        <span>{lang === 'en' ? '* These configurations perform native system routing and require safe administrator credentials to run locally.' : '* تتطلب هذه الإعدادات الصلاحيات الإدارية الكاملة لتشغيلها والتحكم بالنطاق.'}</span>
      </div>
    </div>
  );
};

export default EnforcementScriptGenerator;
