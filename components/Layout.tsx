import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Activity, Bot, User, Stethoscope, Smartphone, Monitor } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [reminder, setReminder] = useState<{
    id: 'checkin' | 'vitals' | 'summary';
    title: string;
    message: string;
    actionLabel: string;
    actionPath: string;
  } | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);

  const isActive = (path: string) => location.pathname === path ? "text-teal-600" : "text-slate-400";

  const navItems = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/scheme', icon: Activity, label: '方案', role: UserRole.PATIENT },
    { path: '/ai-assistant', icon: Bot, label: 'AI助手', role: UserRole.PATIENT },
    { path: '/chat', icon: MessageCircle, label: '咨询' },
    { path: '/mine', icon: User, label: '我的' },
  ];

  const filteredNavItems = navItems.filter(item => {
      if (item.role && user?.role !== item.role && item.role !== UserRole.GUEST && !(item.role === UserRole.PATIENT && !user)) return false;
      if (item.role === UserRole.PATIENT && user?.role === UserRole.DOCTOR) return false;
      return true;
  });

  const reminderSettingsKey = useMemo(() => (user ? `sugar_guard_reminders_${user.id}` : ''), [user]);
  const reminderRuntimeKey = useMemo(() => (user ? `sugar_guard_reminders_runtime_${user.id}` : ''), [user]);

  useEffect(() => {
    if (!user) return;

    const nowKey = (() => {
      const d = new Date();
      const mm = `${d.getMonth() + 1}`.padStart(2, '0');
      const dd = `${d.getDate()}`.padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    })();

    const loadRuntime = () => {
      const raw = localStorage.getItem(reminderRuntimeKey);
      if (!raw) return { shown: {} as Record<string, string>, snoozeUntil: null as number | null };
      try {
        const parsed = JSON.parse(raw);
        return {
          shown: parsed?.shown && typeof parsed.shown === 'object' ? parsed.shown : {},
          snoozeUntil: typeof parsed?.snoozeUntil === 'number' ? parsed.snoozeUntil : null,
        };
      } catch {
        return { shown: {} as Record<string, string>, snoozeUntil: null as number | null };
      }
    };

    const saveRuntime = (next: { shown: Record<string, string>; snoozeUntil: number | null }) => {
      localStorage.setItem(reminderRuntimeKey, JSON.stringify(next));
    };

    const isDue = (targetTime: string) => {
      const d = new Date();
      const hh = `${d.getHours()}`.padStart(2, '0');
      const mm = `${d.getMinutes()}`.padStart(2, '0');
      return `${hh}:${mm}` === targetTime;
    };

    const tick = () => {
      if (reminder) return;
      const runtime = loadRuntime();
      if (runtime.snoozeUntil && Date.now() < runtime.snoozeUntil) return;

      const rawSettings = localStorage.getItem(reminderSettingsKey);
      let settings: any = null;
      if (rawSettings) {
        try { settings = JSON.parse(rawSettings); } catch { settings = null; }
      }

      const shown = runtime.shown || {};
      const alreadyShown = (id: string) => shown[id] === nowKey;
      const markShown = (id: string) => {
        const next = { ...shown, [id]: nowKey };
        saveRuntime({ shown: next, snoozeUntil: null });
      };

      const day = new Date().getDay();

      if (settings?.vitalsEnabled && typeof settings.vitalsTime === 'string' && isDue(settings.vitalsTime) && !alreadyShown('vitals')) {
        markShown('vitals');
        setReminder({
          id: 'vitals',
          title: '记录提醒',
          message: '花 30 秒记录体重/血压/血糖，趋势会更准确。',
          actionLabel: '去记录',
          actionPath: '/trends',
        });
        return;
      }

      if (settings?.checkinEnabled && typeof settings.checkinTime === 'string' && isDue(settings.checkinTime) && !alreadyShown('checkin')) {
        markShown('checkin');
        setReminder({
          id: 'checkin',
          title: '打卡提醒',
          message: '完成今天的任务，让进度条更稳一点。',
          actionLabel: '去打卡',
          actionPath: '/scheme',
        });
        return;
      }

      if (settings?.summaryEnabled && typeof settings.summaryTime === 'string' && Number.isFinite(settings.summaryDay) && day === settings.summaryDay && isDue(settings.summaryTime) && !alreadyShown('summary')) {
        markShown('summary');
        setReminder({
          id: 'summary',
          title: '周回顾提醒',
          message: '现在生成一份总结，下一周更好调整策略。',
          actionLabel: '去查看',
          actionPath: '/checkin-report',
        });
      }
    };

    const runtime = loadRuntime();
    if (typeof runtime.snoozeUntil === 'number') setSnoozeUntil(runtime.snoozeUntil);
    const interval = setInterval(tick, 30 * 1000);
    tick();
    return () => clearInterval(interval);
  }, [user, reminder, reminderSettingsKey, reminderRuntimeKey]);

  const snooze = (minutes: number) => {
    if (!user) return;
    const until = Date.now() + minutes * 60 * 1000;
    setSnoozeUntil(until);
    const raw = localStorage.getItem(reminderRuntimeKey);
    let parsed: any = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
    const shown = parsed?.shown && typeof parsed.shown === 'object' ? parsed.shown : {};
    localStorage.setItem(reminderRuntimeKey, JSON.stringify({ shown, snoozeUntil: until }));
    setReminder(null);
  };

  const dismissReminder = () => {
    setReminder(null);
    setSnoozeUntil(null);
    if (!user) return;
    const raw = localStorage.getItem(reminderRuntimeKey);
    let parsed: any = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
    const shown = parsed?.shown && typeof parsed.shown === 'object' ? parsed.shown : {};
    localStorage.setItem(reminderRuntimeKey, JSON.stringify({ shown, snoozeUntil: null }));
  };

  // Root container: Mobile mode centers the app with a grey background; Desktop mode fills the screen
  const rootClass = isMobileMode
    ? "min-h-screen bg-gray-100 flex justify-center"
    : "min-h-screen bg-slate-50 flex flex-col";

  // App container: Mobile mode limits width; Desktop mode is fluid/responsive
  const appClass = isMobileMode
    ? "w-full max-w-[480px] h-screen bg-slate-50 shadow-xl flex flex-col relative border-x border-gray-200"
    : "w-full h-screen flex flex-col relative max-w-7xl mx-auto";

  return (
    <div className={rootClass}>
      <div className={appClass}>
        
        {/* Header */}
        <header className="bg-white shadow-sm px-4 py-3 sticky top-0 z-10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
             {/* UI Toggle Button */}
            <button 
              onClick={() => setIsMobileMode(!isMobileMode)}
              className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition text-slate-600"
              title={isMobileMode ? "切换到电脑模式" : "切换到手机模式"}
            >
              {isMobileMode ? <Monitor size={18} /> : <Smartphone size={18} />}
            </button>

            <div className="flex items-center space-x-2">
              <div className="bg-teal-600 p-1.5 rounded-lg">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-teal-800 tracking-tight">SugarGuard</h1>
            </div>
          </div>

          {/* Desktop Navigation - Hidden in Mobile Mode, Visible on MD screens in Desktop Mode */}
          <div className={`hidden md:flex items-center space-x-6 ${isMobileMode ? '!hidden' : ''}`}>
             {filteredNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center space-x-1.5 font-medium hover:text-teal-600 transition text-sm ${isActive(item.path)}`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
             ))}
          </div>
          
          {/* Right side role text removed to prevent overlap */}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-hide w-full bg-slate-50 relative">
           {/* Add padding bottom for nav bar space in mobile mode or small screens */}
           <div className={`w-full ${isMobileMode ? 'pb-20' : 'pb-20 md:pb-8 md:px-4'}`}>
             <Outlet />
           </div>
        </main>

        {reminder && (
          <div className="absolute left-0 right-0 bottom-16 md:bottom-6 px-4 z-30">
            <div className="bg-white border border-slate-200 shadow-lg rounded-2xl p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-sm">{reminder.title}</div>
                <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{reminder.message}</div>
                {snoozeUntil && Date.now() < snoozeUntil && (
                  <div className="text-[10px] text-slate-400 mt-2">已稍后提醒</div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => snooze(10)}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  稍后
                </button>
                <button
                  onClick={() => {
                    navigate(reminder.actionPath);
                    dismissReminder();
                  }}
                  className="px-3 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold"
                >
                  {reminder.actionLabel}
                </button>
                <button
                  onClick={dismissReminder}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        {/* Logic: Show if Mobile Mode is ON (regardless of screen size) OR if screen is small (standard responsive) */}
        <nav className={`bg-white border-t border-slate-200 py-2 px-6 flex justify-between items-center z-20 absolute bottom-0 left-0 right-0 ${
          isMobileMode ? 'flex' : 'md:hidden'
        }`}>
          {filteredNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center space-y-1 ${isActive(item.path)}`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

      </div>
    </div>
  );
};
