import React, { useState } from 'react';
import { Device } from '../types';
import { Search, SlidersHorizontal, ShieldAlert, Ban, Star, StarOff, Wifi, WifiOff, Edit3, Save, Info, Key, Power, AlertTriangle } from 'lucide-react';

interface DevicesListProps {
  devices: Device[];
  onToggleBlock: (mac: string) => void;
  onTogglePause: (mac: string) => void;
  onUpdateNickname: (mac: string, name: string) => void;
  onUpdateBandwidthLimit: (mac: string, limitKbps: number) => void;
  onToggleWhitelist: (mac: string) => void;
  onToggleBlacklist: (mac: string) => void;
  onSaveNotes: (mac: string, notes: string) => void;
  lang: 'en' | 'ar';
}

const DevicesList: React.FC<DevicesListProps> = ({
  devices,
  onToggleBlock,
  onTogglePause,
  onUpdateNickname,
  onUpdateBandwidthLimit,
  onToggleWhitelist,
  onToggleBlacklist,
  onSaveNotes,
  lang
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingMac, setEditingMac] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBandwidth, setEditBandwidth] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop': return '💻';
      case 'mobile': return '📱';
      case 'smart-tv': return '📺';
      case 'iot': return '🔌';
      case 'router': return '🌐';
      case 'game-console': return '🎮';
      case 'printer': return '🖨️';
      default: return '❓';
    }
  };

  const filtered = devices.filter((dev) => {
    const matchesSearch =
      dev.hostname.toLowerCase().includes(search.toLowerCase()) ||
      dev.mac.toLowerCase().includes(search.toLowerCase()) ||
      dev.ip.includes(search) ||
      (dev.vendor && dev.vendor.toLowerCase().includes(search.toLowerCase())) ||
      (dev.nickname && dev.nickname.toLowerCase().includes(search.toLowerCase()));

    const matchesType = filterType === 'all' ? true : dev.deviceType === filterType;
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'online'
          ? dev.status === 'online'
          : filterStatus === 'offline'
            ? dev.status === 'offline'
            : filterStatus === 'blocked'
              ? dev.blocked
              : dev.paused;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleStartEdit = (dev: Device) => {
    setEditingMac(dev.mac);
    setEditName(dev.nickname || dev.hostname);
    setEditBandwidth(dev.bandwidthLimit);
    setEditNotes(dev.notes || '');
  };

  const handleSaveEdit = (mac: string) => {
    onUpdateNickname(mac, editName);
    onUpdateBandwidthLimit(mac, editBandwidth);
    onSaveNotes(mac, editNotes);
    setEditingMac(null);
    if (selectedDevice?.mac === mac) {
      setSelectedDevice({
        ...selectedDevice,
        nickname: editName,
        bandwidthLimit: editBandwidth,
        notes: editNotes
      });
    }
  };

  return (
    <div id="devices-view-host" className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {lang === 'en' ? 'ARP & Active DHCP Table' : 'جدول ARP و DHCP النشط'}
          </h2>
          <p className="text-slate-400 text-sm">
            {lang === 'en' ? 'Manage internet connectivity, QoS parameters, and whitelists' : 'إدارة الاتصال بشبكة الإنترنت، معايير جودة الخدمة، والقوائم البيضاء'}
          </p>
        </div>
      </div>

      {/* Action Filters Bar */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            id="device-search-input"
            type="text"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pr-4 pl-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            placeholder={lang === 'en' ? 'IP, MAC, Hostname, Nickname...' : 'ابحث برقم الآي بي، الماك، اسم المضيف...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap w-full md:w-auto items-center gap-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="text-xs text-slate-400 font-semibold uppercase">{lang === 'en' ? 'Type' : 'النوع'}:</span>
            <select
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">{lang === 'en' ? 'All Types' : 'الكل'}</option>
              <option value="desktop">{lang === 'en' ? 'Desktop / Workstation' : 'كمبيوتر مكتبي'}</option>
              <option value="mobile">{lang === 'en' ? 'Smartphone / Tablet' : 'هاتف ذكي'}</option>
              <option value="smart-tv">{lang === 'en' ? 'Smart TV' : 'تلفاز ذكي'}</option>
              <option value="game-console">{lang === 'en' ? 'Console' : 'جهاز ألعاب'}</option>
              <option value="iot">{lang === 'en' ? 'Smart IoT' : 'إنترنت الأشياء'}</option>
              <option value="router">{lang === 'en' ? 'Router' : 'الموجه'}</option>
              <option value="unknown">{lang === 'en' ? 'Unknown' : 'غير معروف'}</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="text-xs text-slate-400 font-semibold uppercase">{lang === 'en' ? 'Status' : 'الحالة'}:</span>
            <select
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">{lang === 'en' ? 'All Status' : 'كل الحالات'}</option>
              <option value="online">{lang === 'en' ? 'Online' : 'متصل'}</option>
              <option value="offline">{lang === 'en' ? 'Offline' : 'غير متصل'}</option>
              <option value="blocked">{lang === 'en' ? 'Blocked' : 'محظور'}</option>
              <option value="paused">{lang === 'en' ? 'Paused' : 'موقوف مؤقتا'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Layout: Left side cards list, Right side detail side cabinet */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {filtered.length === 0 ? (
            <div className="bg-slate-900/40 p-12 text-center rounded-2xl border border-dashed border-slate-800">
              <span className="text-4xl">📡</span>
              <p className="text-slate-300 mt-2 font-medium">{lang === 'en' ? 'No devices match filters' : 'لا توجد أجهزة مطابقة لخيارات الفلترة'}</p>
              <p className="text-slate-500 text-xs mt-1">{lang === 'en' ? 'Try relaxing searched keywords or settings' : 'يرجى مراجعة الكلمات أو خيارات التصفية'}</p>
            </div>
          ) : (
            filtered.map((dev) => {
              const isActiveLocal = selectedDevice?.mac === dev.mac;
              return (
                <div
                  key={dev.id}
                  onClick={() => setSelectedDevice(dev)}
                  className={`border rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden ${
                    isActiveLocal
                      ? 'bg-slate-900 border-indigo-500/80 shadow-indigo-500/10 shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/30'
                  }`}
                >
                  {/* Status Indicator Bar */}
                  <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                    dev.blocked
                      ? 'bg-rose-500'
                      : dev.paused
                        ? 'bg-amber-500'
                        : dev.status === 'online'
                          ? 'bg-emerald-500'
                          : 'bg-slate-600'
                  }`} />

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center pl-3.5 gap-4">
                    {/* Device Visual Title */}
                    <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
                      <span className="text-3xl p-1.5 bg-slate-950 border border-slate-800/80 rounded-xl leading-none">
                        {getDeviceIcon(dev.deviceType)}
                      </span>
                      <div>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <h4 className="text-base font-bold text-white">
                            {dev.nickname || dev.hostname}
                          </h4>
                          {dev.isWhiteListed && (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
                              {lang === 'en' ? 'Whitelisted' : 'موثوق'}
                            </span>
                          )}
                          {dev.isBlackListed && (
                            <span className="bg-rose-500/10 text-rose-400 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-rose-500/20">
                              {lang === 'en' ? 'Blacklisted' : 'محظور دائما'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-semibold font-mono space-x-3 mt-1 flex flex-wrap">
                          <span className="text-indigo-400">{dev.ip}</span>
                          <span className="text-slate-500">|</span>
                          <span>{dev.mac}</span>
                          {dev.signalStrength !== undefined && (
                            <>
                              <span className="text-slate-500">|</span>
                              <span className={`${dev.signalStrength > -60 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                📶 {dev.signalStrength} dBm
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick controls status indicators */}
                    <div className="flex items-center space-x-3 rtl:space-x-reverse self-end md:self-auto">
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] text-slate-500 block uppercase font-mono">{lang === 'en' ? 'Speed limits' : 'سرعة محددة'}</span>
                        <span className="text-xs font-semibold font-mono text-cyan-400">
                          {dev.bandwidthLimit > 0 ? `${dev.bandwidthLimit} Kbps` : 'Unlimited'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <button
                          id={`btn-block-${dev.mac}`}
                          title="Instant Block"
                          onClick={(e) => { e.stopPropagation(); onToggleBlock(dev.mac); }}
                          className={`p-2 rounded-xl border transition-all ${
                            dev.blocked
                              ? 'bg-rose-500 border-rose-600 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-slate-700'
                          }`}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-pause-${dev.mac}`}
                          title="Pause internet"
                          onClick={(e) => { e.stopPropagation(); onTogglePause(dev.mac); }}
                          className={`p-2 rounded-xl border transition-all ${
                            dev.paused
                              ? 'bg-amber-500 border-amber-600 text-white animate-pulse'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-400 hover:border-slate-700'
                          }`}
                        >
                          {dev.paused ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected device details profile drawer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit space-y-6">
          {selectedDevice ? (
            <>
              {/* Profile Card Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-3.5 rtl:space-x-reverse">
                  <span className="text-4xl p-2 bg-slate-950 rounded-xl leading-none border border-slate-800 flex items-center justify-center">
                    {getDeviceIcon(selectedDevice.deviceType)}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {selectedDevice.nickname || selectedDevice.hostname}
                    </h3>
                    <span className="text-slate-400 text-xs font-semibold block">{selectedDevice.vendor}</span>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      if (selectedDevice.isWhiteListed) {
                        onToggleWhitelist(selectedDevice.mac);
                        setSelectedDevice({ ...selectedDevice, isWhiteListed: false });
                      } else {
                        onToggleWhitelist(selectedDevice.mac);
                        setSelectedDevice({ ...selectedDevice, isWhiteListed: true, isBlackListed: false });
                      }
                    }}
                    title="Whitelist device"
                    className={`p-1.5 rounded-lg border text-xs ${
                      selectedDevice.isWhiteListed ? 'bg-amber-600/20 text-yellow-400 border-yellow-500/40' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Star className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (selectedDevice.isBlackListed) {
                        onToggleBlacklist(selectedDevice.mac);
                        setSelectedDevice({ ...selectedDevice, isBlackListed: false });
                      } else {
                        onToggleBlacklist(selectedDevice.mac);
                        setSelectedDevice({ ...selectedDevice, isBlackListed: true, isWhiteListed: false });
                      }
                    }}
                    title="Blacklist device"
                    className={`p-1.5 rounded-lg border text-xs ${
                      selectedDevice.isBlackListed ? 'bg-rose-600/20 text-rose-400 border-rose-500/40' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <StarOff className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editing controls block */}
              {editingMac === selectedDevice.mac ? (
                <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold">{lang === 'en' ? 'Modify parameters' : 'تعديل الخصائص'}</h4>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">{lang === 'en' ? 'Nickname' : 'الاسم المستعار'}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      {lang === 'en' ? 'Bandwidth QoS Ceiling (Kbps)' : 'الحد الأقصى لجودة النطاق (Kbps)'}
                    </label>
                    <div className="flex space-x-2 items-center">
                      <input
                        type="number"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                        value={editBandwidth}
                        onChange={(e) => setEditBandwidth(parseInt(e.target.value) || 0)}
                      />
                      <span className="text-xs text-slate-400">Kbps</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">0 {lang === 'en' ? 'means unlimited connection speed' : 'تعني سرعة غير محدودة'}</span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">{lang === 'en' ? 'Notes' : 'ملاحظات إضافية'}</label>
                    <textarea
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => handleSaveEdit(selectedDevice.mac)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center space-x-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Save Settings' : 'حفظ الإعدادات'}</span>
                    </button>
                    <button
                      onClick={() => setEditingMac(null)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-lg"
                    >
                      {lang === 'en' ? 'Cancel' : 'إلغاء'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs">
                      <span className="text-slate-500 block">{lang === 'en' ? 'Network Policy Enforced' : 'سياسة الاتصال المفروضة'}</span>
                      <span className={`font-semibold mt-0.5 inline-block ${
                        selectedDevice.blocked ? 'text-rose-400' : selectedDevice.paused ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {selectedDevice.blocked ? '🚫 Completely Blocked' : selectedDevice.paused ? '⏸ Temp Paused' : '🟢 Full Access allowed'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleStartEdit(selectedDevice)}
                      className="p-2 bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 rounded-lg text-xs flex items-center gap-1 font-semibold"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Modify' : 'تعديل'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">IPv4 Address</span>
                      <span className="text-xs font-bold text-white font-mono mt-0.5 block">{selectedDevice.ip}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">Mac Hardware ID</span>
                      <span className="text-xs font-bold text-slate-300 font-mono mt-0.5 block">{selectedDevice.mac}</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">First Mapped</span>
                      <span className="text-xs font-semibold text-slate-300 mt-0.5 block">
                        {new Date(selectedDevice.firstSeen).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">Last Active Seen</span>
                      <span className="text-xs font-semibold text-slate-300 mt-0.5 block">
                        {new Date(selectedDevice.lastSeen).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {selectedDevice.notes && (
                    <div className="bg-indigo-950/20 border border-indigo-900/40 p-4 rounded-xl">
                      <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-tight flex items-center gap-1 mb-1">
                        <Info className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Administrator Notes' : 'ملاحظات المشرف'}</span>
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono">
                        {selectedDevice.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <span className="text-5xl block text-slate-700">📋</span>
              <p className="text-sm font-semibold text-slate-400 mt-3">{lang === 'en' ? 'No Device Selected' : 'لم يتم تحديد جهاز'}</p>
              <p className="text-slate-600 text-xs mt-1 leading-normal max-w-[200px] mx-auto">
                {lang === 'en' ? 'Click on any IP client on the list to map advanced rules & speed caps.' : 'انقر على أي جهاز في جدول ARP للتحكم بالسرعات والحظر.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevicesList;
