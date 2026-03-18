import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, Plus, Edit3, ChevronDown, ChevronUp, RotateCcw, ChevronLeft, ChevronRight, FileText, BarChart3, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SchemeItem } from '../types';

export const Scheme: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [schemeItems, setSchemeItems] = useState<SchemeItem[]>([]);
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string>('');
  const [monthCursor, setMonthCursor] = useState<{ year: number; monthIndex: number } | null>(null);
  const [checkinVersion, setCheckinVersion] = useState(0);

  const todayKey = useMemo(() => {
    const d = new Date();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, []);

  const dateLabelOf = (dateKey: string) => {
    const [y, m, d] = dateKey.split('-');
    if (!y || !m || !d) return dateKey;
    return `${y}.${parseInt(m, 10)}.${parseInt(d, 10)}`;
  };

  const selectedLabel = useMemo(() => dateLabelOf(selectedDateKey || todayKey), [selectedDateKey, todayKey]);

  const schemeStorageKey = user ? `sugar_guard_scheme_items_${user.id}` : '';
  const checkinStorageKey = user ? `sugar_guard_scheme_checkins_${user.id}_${selectedDateKey || todayKey}` : '';

  useEffect(() => {
    if (!user) return;

    if (!selectedDateKey) setSelectedDateKey(todayKey);
    if (!monthCursor) {
      const now = new Date();
      setMonthCursor({ year: now.getFullYear(), monthIndex: now.getMonth() });
    }

    const rawScheme = localStorage.getItem(schemeStorageKey);
    if (rawScheme) {
      try {
        const parsed = JSON.parse(rawScheme);
        const arr = Array.isArray(parsed) ? parsed : parsed?.items;
        if (Array.isArray(arr)) {
          setSchemeItems(arr);
        } else {
          setSchemeItems([]);
        }
      } catch {
        setSchemeItems([]);
      }
    } else {
      setSchemeItems([]);
    }

    const rawCheckins = localStorage.getItem(checkinStorageKey);
    if (rawCheckins) {
      try {
        const parsed = JSON.parse(rawCheckins);
        if (parsed && typeof parsed === 'object') {
          setDoneMap(parsed);
        } else {
          setDoneMap({});
        }
      } catch {
        setDoneMap({});
      }
    } else {
      setDoneMap({});
    }
  }, [user, schemeStorageKey, checkinStorageKey, todayKey, selectedDateKey, monthCursor, checkinVersion]);

  const mapType = (t: string) => {
    if (t.includes('饮食')) return 'diet';
    if (t.includes('运动')) return 'exercise';
    if (t.includes('监测') || t.includes('用药') || t.includes('血糖')) return 'medical';
    return 'other';
  };

  const buildId = (it: SchemeItem) => `${it.type}|${it.order}|${it.time}|${it.title}`;

  const taskIdList = useMemo(() => schemeItems.map(buildId), [schemeItems]);

  const tasks = useMemo(() => {
    const mapType = (t: string) => {
      if (t.includes('饮食')) return 'diet';
      if (t.includes('运动')) return 'exercise';
      if (t.includes('监测') || t.includes('用药') || t.includes('血糖')) return 'medical';
      return 'other';
    };

    const buildId = (it: SchemeItem) => `${it.type}|${it.order}|${it.time}|${it.title}`;

    return schemeItems
      .slice()
      .sort((a, b) => {
        const ta = mapType(a.type);
        const tb = mapType(b.type);
        if (ta !== tb) return ta.localeCompare(tb);
        return (a.order ?? 0) - (b.order ?? 0);
      })
      .map((it) => {
        const id = buildId(it);
        const type = mapType(it.type);
        return {
          id,
          time: it.time,
          title: it.title,
          content: it.content,
          type,
          done: !!doneMap[id],
        };
      });
  }, [schemeItems, doneMap]);

  const hasScheme = tasks.length > 0;

  const toggleTask = (id: string) => {
    const next = { ...doneMap, [id]: !doneMap[id] };
    setDoneMap(next);
    if (checkinStorageKey) localStorage.setItem(checkinStorageKey, JSON.stringify(next));
    setCheckinVersion(v => v + 1);
  };

  const resetCheckins = () => {
    setDoneMap({});
    if (checkinStorageKey) localStorage.removeItem(checkinStorageKey);
    setExpandedId(null);
    setCheckinVersion(v => v + 1);
  };

  const progress = tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.done).length / tasks.length) * 100);

  const monthMeta = useMemo(() => {
    if (!monthCursor) return null;
    const first = new Date(monthCursor.year, monthCursor.monthIndex, 1);
    const daysInMonth = new Date(monthCursor.year, monthCursor.monthIndex + 1, 0).getDate();
    const startWeekday = (first.getDay() + 6) % 7;
    const cells: Array<{ dateKey: string; day: number } | null> = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const mm = `${monthCursor.monthIndex + 1}`.padStart(2, '0');
      const dd = `${day}`.padStart(2, '0');
      cells.push({ dateKey: `${monthCursor.year}-${mm}-${dd}`, day });
    }
    return { ...monthCursor, daysInMonth, cells };
  }, [monthCursor]);

  const monthSummary = useMemo(() => {
    if (!user || !monthMeta) return null;
    const getDayDoneMap = (dateKey: string) => {
      const k = `sugar_guard_scheme_checkins_${user.id}_${dateKey}`;
      const raw = localStorage.getItem(k);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed as Record<string, boolean>;
        return null;
      } catch {
        return null;
      }
    };

    const scoreOf = (dateKey: string) => {
      if (taskIdList.length === 0) return 0;
      const dm = getDayDoneMap(dateKey);
      if (!dm) return 0;
      let done = 0;
      for (const id of taskIdList) if (dm[id]) done++;
      return Math.round((done / taskIdList.length) * 100);
    };

    const scores: Record<string, number> = {};
    const activeDates: string[] = [];
    for (const cell of monthMeta.cells) {
      if (!cell) continue;
      const s = scoreOf(cell.dateKey);
      scores[cell.dateKey] = s;
      if (s > 0) activeDates.push(cell.dateKey);
    }

    const avg = monthMeta.daysInMonth === 0 ? 0 : Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / monthMeta.daysInMonth);
    const activeDays = activeDates.length;
    const targetDays = Object.values(scores).filter(v => v >= 80).length;

    const dateInMonthKeys = Object.keys(scores).sort();
    let streak = 0;
    for (let i = dateInMonthKeys.length - 1; i >= 0; i--) {
      const k = dateInMonthKeys[i];
      const isFuture = k > todayKey;
      if (isFuture) continue;
      if ((scores[k] ?? 0) >= 80) streak++;
      else break;
    }

    return { scores, avg, activeDays, targetDays, streak };
  }, [user, monthMeta, taskIdList, checkinVersion, todayKey]);

  const weekMeta = useMemo(() => {
    const baseKey = selectedDateKey || todayKey;
    const [y, m, d] = baseKey.split('-').map((v) => parseInt(v, 10));
    if (!y || !m || !d) return null;
    const base = new Date(y, m - 1, d);
    const weekday = (base.getDay() + 6) % 7;
    const start = new Date(base);
    start.setDate(base.getDate() - weekday);
    const keys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);
      const mm = `${cur.getMonth() + 1}`.padStart(2, '0');
      const dd = `${cur.getDate()}`.padStart(2, '0');
      keys.push(`${cur.getFullYear()}-${mm}-${dd}`);
    }
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end, keys };
  }, [selectedDateKey, todayKey]);

  const weekSummary = useMemo(() => {
    if (!user || !weekMeta) return null;
    if (taskIdList.length === 0) return { avg: 0, targetDays: 0, streak: 0, scores: {} as Record<string, number> };
    const scores: Record<string, number> = {};
    for (const dateKey of weekMeta.keys) {
      const k = `sugar_guard_scheme_checkins_${user.id}_${dateKey}`;
      const raw = localStorage.getItem(k);
      if (!raw) {
        scores[dateKey] = 0;
        continue;
      }
      try {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        let done = 0;
        for (const id of taskIdList) if (parsed?.[id]) done++;
        scores[dateKey] = Math.round((done / taskIdList.length) * 100);
      } catch {
        scores[dateKey] = 0;
      }
    }
    const vals = Object.values(scores);
    const avg = vals.length === 0 ? 0 : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const targetDays = vals.filter(v => v >= 80).length;
    let streak = 0;
    const keys = weekMeta.keys.slice().reverse();
    for (const k of keys) {
      if (k > todayKey) continue;
      if ((scores[k] ?? 0) >= 80) streak++;
      else break;
    }
    return { avg, targetDays, streak, scores };
  }, [user, weekMeta, taskIdList, todayKey, checkinVersion]);

  const weeklyGoalKey = user ? `sugar_guard_weekly_goal_${user.id}` : '';
  const [weeklyGoal, setWeeklyGoal] = useState<number>(5);

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(weeklyGoalKey);
    if (!raw) {
      setWeeklyGoal(5);
      return;
    }
    const v = parseInt(raw, 10);
    setWeeklyGoal(Number.isFinite(v) ? Math.min(7, Math.max(1, v)) : 5);
  }, [user, weeklyGoalKey]);

  const saveWeeklyGoal = (v: number) => {
    const next = Math.min(7, Math.max(1, v));
    setWeeklyGoal(next);
    if (weeklyGoalKey) localStorage.setItem(weeklyGoalKey, String(next));
  };

  const colorClassFor = (score: number) => {
    if (score >= 80) return 'bg-teal-600 border-teal-600';
    if (score >= 50) return 'bg-teal-400 border-teal-400';
    if (score > 0) return 'bg-teal-200 border-teal-200';
    return 'bg-slate-100 border-slate-200';
  };

  const selectDate = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setExpandedId(null);
  };

  const monthDateKeys = useMemo(() => {
    if (!monthMeta) return [];
    const keys: string[] = [];
    for (const cell of monthMeta.cells) {
      if (cell) keys.push(cell.dateKey);
    }
    return keys;
  }, [monthMeta]);

  const trendValues = useMemo(() => {
    if (!monthSummary || monthDateKeys.length === 0) return [];
    return monthDateKeys.map((k) => monthSummary.scores[k] ?? 0);
  }, [monthSummary, monthDateKeys]);

  const weeklyCompare = useMemo(() => {
    if (trendValues.length === 0 || monthDateKeys.length === 0) return { last7: 0, prev7: 0 };
    const today = todayKey;
    const validKeys = monthDateKeys.filter(k => k <= today);
    const n = validKeys.length;
    const last7Keys = validKeys.slice(Math.max(0, n - 7), n);
    const prev7Keys = validKeys.slice(Math.max(0, n - 14), Math.max(0, n - 7));
    const avg = (keys: string[]) => {
      if (keys.length === 0) return 0;
      const s = keys.reduce((acc, k) => acc + (monthSummary!.scores[k] ?? 0), 0);
      return Math.round(s / keys.length);
    };
    return { last7: avg(last7Keys), prev7: avg(prev7Keys) };
  }, [monthSummary, monthDateKeys, todayKey, trendValues]);

  const TrendChart: React.FC<{ values: number[] }> = ({ values }) => {
    const count = values.length;
    if (count === 0) return <div className="text-xs text-slate-400">暂无数据</div>;
    const w = 300;
    const h = 80;
    const points = values.map((v, i) => {
      const x = (count === 1 ? 0 : (i / (count - 1))) * w;
      const y = h - (Math.min(100, Math.max(0, v)) / 100) * h;
      return `${x},${y}`;
    }).join(' ');
    return (
      <svg className="w-full h-[80px]" viewBox={`0 0 ${w} ${h}`}>
        <polyline points={points} fill="none" stroke="#14b8a6" strokeWidth="2" />
      </svg>
    );
  };

  if (!hasScheme) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-6 text-center">
        <div className="bg-teal-100 p-4 rounded-full mb-6">
            <Edit3 className="w-12 h-12 text-teal-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">暂无健康方案</h2>
        <p className="text-slate-500 mb-8">您还没有生成个性化的饮食与运动方案。</p>
        <button
          onClick={() => navigate('/get-scheme')}
          className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-teal-700 transition w-full max-w-xs flex items-center justify-center"
        >
          <Plus className="mr-2" /> 立即生成方案
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">打卡</h1>
          <div className="text-xs text-slate-400 mt-1">{selectedLabel}</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={resetCheckins} className="text-sm text-slate-500 font-medium flex items-center">
            <RotateCcw size={14} className="mr-1" /> 重置
          </button>
          <button onClick={() => navigate('/trends')} className="text-sm text-slate-500 font-medium flex items-center">
            <BarChart3 size={14} className="mr-1" /> 趋势
          </button>
          <button onClick={() => navigate('/reminders')} className="text-sm text-slate-500 font-medium flex items-center">
            <Bell size={14} className="mr-1" /> 提醒
          </button>
          <button onClick={() => navigate('/checkin-report')} className="text-sm text-slate-500 font-medium flex items-center">
            <FileText size={14} className="mr-1" /> 本月总结
          </button>
          <button onClick={() => navigate('/get-scheme')} className="text-sm text-teal-600 font-medium">
            调整方案
          </button>
        </div>
      </div>

      {monthMeta && monthSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex justify-between items-end mb-2">
               <div>
                 <p className="text-indigo-100 text-sm">当日完成度</p>
                 <h2 className="text-4xl font-bold">{progress}%</h2>
               </div>
               <div className="text-right">
                 <p className="text-sm font-medium">{selectedDateKey === todayKey ? '坚持就是胜利！' : '查看历史打卡记录'}</p>
               </div>
            </div>
            <div className="w-full bg-black/20 rounded-full h-2 mt-4">
              <div className="bg-white/90 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800">本月</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMonthCursor({ year: monthMeta.monthIndex === 0 ? monthMeta.year - 1 : monthMeta.year, monthIndex: monthMeta.monthIndex === 0 ? 11 : monthMeta.monthIndex - 1 })}
                  className="p-2 rounded-lg bg-slate-100 text-slate-600"
                  aria-label="上个月"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-sm text-slate-600 w-20 text-center">
                  {monthMeta.year}.{monthMeta.monthIndex + 1}
                </div>
                <button
                  onClick={() => setMonthCursor({ year: monthMeta.monthIndex === 11 ? monthMeta.year + 1 : monthMeta.year, monthIndex: monthMeta.monthIndex === 11 ? 0 : monthMeta.monthIndex + 1 })}
                  className="p-2 rounded-lg bg-slate-100 text-slate-600"
                  aria-label="下个月"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mt-3">
              {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
                <div key={w} className="text-[10px] text-slate-400 text-center">{w}</div>
              ))}
              {monthMeta.cells.map((cell, idx) => {
                if (!cell) return <div key={`empty-${idx}`} className="w-full aspect-square" />;
                const score = monthSummary.scores[cell.dateKey] ?? 0;
                const isSelected = cell.dateKey === (selectedDateKey || todayKey);
                const isToday = cell.dateKey === todayKey;
                return (
                  <button
                    key={cell.dateKey}
                    onClick={() => selectDate(cell.dateKey)}
                    className={`w-full aspect-square rounded-md border text-[10px] font-medium flex items-center justify-center ${colorClassFor(score)} ${
                      isSelected ? 'ring-2 ring-slate-900/10' : ''
                    } ${isToday ? 'outline outline-1 outline-slate-300' : ''} text-slate-800`}
                    title={`${cell.dateKey} 完成度 ${score}%`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">平均</div>
                <div className="text-sm font-bold text-slate-800">{monthSummary.avg}%</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">打卡</div>
                <div className="text-sm font-bold text-slate-800">{monthSummary.activeDays} 天</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                <div className="text-[10px] text-slate-400">达标</div>
                <div className="text-sm font-bold text-slate-800">{monthSummary.targetDays} 天</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {trendValues.length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-slate-800">完成度趋势</div>
            <div className="text-xs text-slate-500">本月</div>
          </div>
          <TrendChart values={trendValues} />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="text-xs text-slate-400">最近 7 天</div>
              <div className="text-xl font-bold text-slate-800 mt-1">{weeklyCompare.last7}%</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="text-xs text-slate-400">之前 7 天</div>
              <div className="text-xl font-bold text-slate-800 mt-1">{weeklyCompare.prev7}%</div>
            </div>
          </div>
        </div>
      )}

      {weekMeta && weekSummary && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-800">本周视图</div>
            <div className="text-xs text-slate-500">
              {`${weekMeta.keys[0]} ~ ${weekMeta.keys[6]}`}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 mt-3">
            {weekMeta.keys.map((k) => {
              const score = weekSummary.scores[k] ?? 0;
              const isSelected = k === (selectedDateKey || todayKey);
              const isToday = k === todayKey;
              const day = parseInt(k.split('-')[2] || '0', 10);
              return (
                <button
                  key={k}
                  onClick={() => selectDate(k)}
                  className={`w-full aspect-square rounded-lg border text-[10px] font-bold flex items-center justify-center ${colorClassFor(score)} ${
                    isSelected ? 'ring-2 ring-slate-900/10' : ''
                  } ${isToday ? 'outline outline-1 outline-slate-300' : ''} text-slate-800`}
                  title={`${k} 完成度 ${score}%`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="text-xs text-slate-400">本周平均完成度</div>
              <div className="text-xl font-bold text-slate-800 mt-1">{weekSummary.avg}%</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="text-xs text-slate-400">本周达标(≥80%)</div>
              <div className="text-xl font-bold text-slate-800 mt-1">{weekSummary.targetDays} 天</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="text-xs text-slate-400">连续达标</div>
              <div className="text-xl font-bold text-slate-800 mt-1">{weekSummary.streak} 天</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="text-xs text-slate-400">本周目标(达标天数)</div>
              <div className="flex items-center justify-between mt-1">
                <button
                  onClick={() => saveWeeklyGoal(weeklyGoal - 1)}
                  className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold"
                >
                  -
                </button>
                <div className="text-xl font-bold text-slate-800">
                  {weeklyGoal}
                  <span className="text-xs text-slate-400 ml-1">/7</span>
                </div>
                <button
                  onClick={() => saveWeeklyGoal(weeklyGoal + 1)}
                  className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold"
                >
                  +
                </button>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                进度：{Math.min(weekSummary.targetDays, weeklyGoal)}/{weeklyGoal}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`p-4 rounded-xl border flex items-center cursor-pointer transition ${task.done ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 shadow-sm hover:border-teal-300'}`}
          >
            <div className={`mr-4 ${task.done ? 'text-teal-500' : 'text-slate-300'}`}>
              {task.done ? <CheckCircle size={24} className="fill-teal-100" /> : <Circle size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-medium truncate ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                {task.title}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center justify-between gap-3">
                <span className="truncate">{task.time}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedId(expandedId === task.id ? null : task.id);
                  }}
                  className="text-slate-500 flex items-center flex-shrink-0"
                >
                  {expandedId === task.id ? (
                    <>
                      收起 <ChevronUp size={14} className="ml-1" />
                    </>
                  ) : (
                    <>
                      详情 <ChevronDown size={14} className="ml-1" />
                    </>
                  )}
                </button>
              </div>
              {expandedId === task.id && (
                <div className="text-sm text-slate-600 leading-relaxed mt-3 whitespace-pre-wrap">
                  {task.content}
                </div>
              )}
            </div>
            <span className={`text-[10px] px-2 py-1 rounded flex-shrink-0 ${
              task.type === 'diet' ? 'bg-green-100 text-green-700' :
              task.type === 'exercise' ? 'bg-orange-100 text-orange-700' :
              task.type === 'medical' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {task.type === 'diet' ? '饮食' : task.type === 'exercise' ? '运动' : task.type === 'medical' ? '监测' : '其他'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
