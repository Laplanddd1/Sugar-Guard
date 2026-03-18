import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type ReminderSettings = {
  checkinEnabled: boolean;
  checkinTime: string;
  vitalsEnabled: boolean;
  vitalsTime: string;
  summaryEnabled: boolean;
  summaryDay: number;
  summaryTime: string;
};

export const Reminders: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const storageKey = useMemo(() => (user ? `sugar_guard_reminders_${user.id}` : ''), [user]);

  const [settings, setSettings] = useState<ReminderSettings>({
    checkinEnabled: true,
    checkinTime: '20:30',
    vitalsEnabled: false,
    vitalsTime: '08:00',
    summaryEnabled: true,
    summaryDay: 0,
    summaryTime: '21:00',
  });

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setSettings({
          checkinEnabled: !!parsed.checkinEnabled,
          checkinTime: typeof parsed.checkinTime === 'string' ? parsed.checkinTime : '20:30',
          vitalsEnabled: !!parsed.vitalsEnabled,
          vitalsTime: typeof parsed.vitalsTime === 'string' ? parsed.vitalsTime : '08:00',
          summaryEnabled: !!parsed.summaryEnabled,
          summaryDay: Number.isFinite(parsed.summaryDay) ? parsed.summaryDay : 0,
          summaryTime: typeof parsed.summaryTime === 'string' ? parsed.summaryTime : '21:00',
        });
      }
    } catch {}
  }, [user, storageKey]);

  const save = () => {
    if (!user) return;
    localStorage.setItem(storageKey, JSON.stringify(settings));
    navigate(-1);
  };

  if (!user) {
    return (
      <div className="p-6 text-center text-slate-500">
        请先登录后再设置提醒
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-20 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-slate-600 hover:text-teal-600 flex items-center">
          <ArrowLeft size={20} className="mr-2" /> 返回
        </button>
        <button
          onClick={save}
          className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-sm flex items-center"
        >
          <Save size={16} className="mr-2" /> 保存
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center text-slate-800 font-bold mb-4">
          <Bell className="mr-2" /> 提醒设置
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-slate-800 text-sm">打卡提醒</div>
              <div className="text-xs text-slate-400 mt-1">在设定时间提醒你完成当日任务</div>
            </div>
            <input
              type="checkbox"
              checked={settings.checkinEnabled}
              onChange={(e) => setSettings({ ...settings, checkinEnabled: e.target.checked })}
              className="w-5 h-5 accent-teal-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">提醒时间</label>
              <input
                type="time"
                value={settings.checkinTime}
                onChange={(e) => setSettings({ ...settings, checkinTime: e.target.value })}
                className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="text-xs text-slate-500 flex items-end">
              建议晚饭后 1–2 小时
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-slate-800 text-sm">指标记录提醒</div>
              <div className="text-xs text-slate-400 mt-1">提醒你记录体重/血压/血糖等</div>
            </div>
            <input
              type="checkbox"
              checked={settings.vitalsEnabled}
              onChange={(e) => setSettings({ ...settings, vitalsEnabled: e.target.checked })}
              className="w-5 h-5 accent-teal-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">提醒时间</label>
              <input
                type="time"
                value={settings.vitalsTime}
                onChange={(e) => setSettings({ ...settings, vitalsTime: e.target.value })}
                className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="text-xs text-slate-500 flex items-end">
              建议早起或固定晨间时间
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-slate-800 text-sm">周总结提醒</div>
              <div className="text-xs text-slate-400 mt-1">提醒你生成本周总结与调整策略</div>
            </div>
            <input
              type="checkbox"
              checked={settings.summaryEnabled}
              onChange={(e) => setSettings({ ...settings, summaryEnabled: e.target.checked })}
              className="w-5 h-5 accent-teal-600"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">星期</label>
              <select
                value={settings.summaryDay}
                onChange={(e) => setSettings({ ...settings, summaryDay: parseInt(e.target.value, 10) })}
                className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value={0}>周日</option>
                <option value={1}>周一</option>
                <option value={2}>周二</option>
                <option value={3}>周三</option>
                <option value={4}>周四</option>
                <option value={5}>周五</option>
                <option value={6}>周六</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">时间</label>
              <input
                type="time"
                value={settings.summaryTime}
                onChange={(e) => setSettings({ ...settings, summaryTime: e.target.value })}
                className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="text-xs text-slate-500 flex items-end">
              建议周末晚间回顾
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-sm text-slate-600 leading-relaxed">
        提醒会在你打开网页时触发弹窗提示（不依赖浏览器系统通知）。如果你希望离线也能提醒，可以后续接入系统通知或小程序推送。
      </div>
    </div>
  );
};

