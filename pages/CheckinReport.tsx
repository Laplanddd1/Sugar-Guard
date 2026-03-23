import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SchemeItem } from '../types';
import { runDifyWorkflow } from '../services/difyService';
import { DIFY_APPS } from '../config';

export const CheckinReport: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [monthCursor, setMonthCursor] = useState<{ year: number; monthIndex: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), monthIndex: d.getMonth() };
  });
  const [schemeItems, setSchemeItems] = useState<SchemeItem[]>([]);
  const [aiText, setAiText] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const aiSummary = useMemo(() => {
    if (!aiText) return null;
    const raw = aiText.trim().replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      const obj: any = parsed;
      const summary = typeof obj.summary === 'string' ? obj.summary : '';
      const keyIssues = Array.isArray(obj.keyIssues) ? obj.keyIssues.filter((x: any) => typeof x === 'string') : [];
      const actions = Array.isArray(obj.actions) ? obj.actions.filter((x: any) => typeof x === 'string') : [];
      const nextGoals = Array.isArray(obj.nextGoals) ? obj.nextGoals.filter((x: any) => typeof x === 'string') : [];
      if (!summary && keyIssues.length === 0 && actions.length === 0 && nextGoals.length === 0) return null;
      return { summary, keyIssues, actions, nextGoals };
    } catch {
      return null;
    }
  }, [aiText]);

  const monthKey = useMemo(() => {
    const mm = `${monthCursor.monthIndex + 1}`.padStart(2, '0');
    return `${monthCursor.year}-${mm}`;
  }, [monthCursor]);

  useEffect(() => {
    if (!user) return;
    const schemeStorageKey = `sugar_guard_scheme_items_${user.id}`;
    const rawScheme = localStorage.getItem(schemeStorageKey);
    if (!rawScheme) {
      setSchemeItems([]);
      return;
    }
    try {
      const parsed = JSON.parse(rawScheme);
      const arr = Array.isArray(parsed) ? parsed : parsed?.items;
      if (Array.isArray(arr)) setSchemeItems(arr);
      else setSchemeItems([]);
    } catch {
      setSchemeItems([]);
    }
  }, [user]);

  const buildId = (it: SchemeItem) => `${it.type}|${it.order}|${it.time}|${it.title}`;

  const taskIds = useMemo(() => schemeItems.map(buildId), [schemeItems]);

  const monthDates = useMemo(() => {
    const daysInMonth = new Date(monthCursor.year, monthCursor.monthIndex + 1, 0).getDate();
    const keys: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const mm = `${monthCursor.monthIndex + 1}`.padStart(2, '0');
      const dd = `${day}`.padStart(2, '0');
      keys.push(`${monthCursor.year}-${mm}-${dd}`);
    }
    return keys;
  }, [monthCursor]);

  const monthStats = useMemo(() => {
    if (!user || taskIds.length === 0) {
      return {
        avg: 0,
        activeDays: 0,
        targetDays: 0,
        streak: 0,
        dayScores: {} as Record<string, number>,
        missedCounts: {} as Record<string, number>,
      };
    }

    const missedCounts: Record<string, number> = {};
    const dayScores: Record<string, number> = {};
    for (const id of taskIds) missedCounts[id] = 0;

    const scoreOf = (dateKey: string) => {
      const k = `sugar_guard_scheme_checkins_${user.id}_${dateKey}`;
      const raw = localStorage.getItem(k);
      if (!raw) {
        for (const id of taskIds) missedCounts[id] += 1;
        return 0;
      }
      try {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        let done = 0;
        for (const id of taskIds) {
          if (parsed?.[id]) done += 1;
          else missedCounts[id] += 1;
        }
        return Math.round((done / taskIds.length) * 100);
      } catch {
        for (const id of taskIds) missedCounts[id] += 1;
        return 0;
      }
    };

    for (const dateKey of monthDates) {
      dayScores[dateKey] = scoreOf(dateKey);
    }

    const avg = monthDates.length === 0 ? 0 : Math.round(Object.values(dayScores).reduce((a, b) => a + b, 0) / monthDates.length);
    const activeDays = Object.values(dayScores).filter(v => v > 0).length;
    const targetDays = Object.values(dayScores).filter(v => v >= 80).length;

    const todayKey = (() => {
      const d = new Date();
      const mm = `${d.getMonth() + 1}`.padStart(2, '0');
      const dd = `${d.getDate()}`.padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    })();

    let streak = 0;
    for (let i = monthDates.length - 1; i >= 0; i--) {
      const k = monthDates[i];
      if (k > todayKey) continue;
      if ((dayScores[k] ?? 0) >= 80) streak += 1;
      else break;
    }

    return { avg, activeDays, targetDays, streak, dayScores, missedCounts };
  }, [user, taskIds, monthDates]);

  const topMissed = useMemo(() => {
    if (schemeItems.length === 0) return [];
    const pairs = schemeItems.map((it) => {
      const id = buildId(it);
      return { id, title: it.title, time: it.time, type: it.type, missed: monthStats.missedCounts[id] ?? 0 };
    });
    return pairs
      .slice()
      .sort((a, b) => b.missed - a.missed)
      .slice(0, 6)
      .filter((x) => x.missed > 0);
  }, [schemeItems, monthStats.missedCounts]);

  const localSummary = useMemo(() => {
    const lines: string[] = [];
    lines.push(`${monthCursor.year}.${monthCursor.monthIndex + 1} 月打卡概览：平均完成度 ${monthStats.avg}%，达标 ${monthStats.targetDays} 天，已打卡 ${monthStats.activeDays} 天，连续达标 ${monthStats.streak} 天。`);
    if (topMissed.length > 0) {
      lines.push('');
      lines.push('本月最容易漏掉的项目：');
      for (const item of topMissed) {
        lines.push(`- ${item.title}（${item.time}，${item.type}）：漏打 ${item.missed} 天`);
      }
    }
    return lines.join('\n');
  }, [monthCursor, monthStats, topMissed]);

  const generateAi = async () => {
    if (!user) {
      alert('请先登录');
      return;
    }
    if (!user.profile) {
      alert('请先完善个人档案');
      navigate('/mine');
      return;
    }
    if (schemeItems.length === 0) {
      alert('请先生成方案');
      navigate('/get-scheme');
      return;
    }

    setLoadingAi(true);
    try {
      const safeStringify = (v: any) => {
        try {
          return JSON.stringify(v);
        } catch {
          return '';
        }
      };

      const inputs = {
        userId: parseInt(user.id) || 0,
        type: 'checkin_month',
        month: monthKey,
        profile: safeStringify({
          age: user.profile.age,
          sex: user.profile.sex,
          height: user.profile.height,
          weight: user.profile.weight,
          waistline: user.profile.waistline || 0,
          systolicPressure: user.profile.systolicPressure || 0,
          familyHistory: user.profile.familyHistory,
          disease: user.profile.disease,
          isPregnancy: user.profile.isPregnancy || '否',
        }),
        stats: safeStringify({
          avg: monthStats.avg,
          activeDays: monthStats.activeDays,
          targetDays: monthStats.targetDays,
          streak: monthStats.streak,
        }),
        mostMissed: safeStringify(
          topMissed.map((x) => ({
            title: x.title,
            time: x.time,
            type: x.type,
            missedDays: x.missed,
          }))
        ),
        baseSummary: localSummary,
      };

      const outputs = await runDifyWorkflow(DIFY_APPS.CHECKIN_ANALYSIS, inputs, user.id);
      const raw = outputs?.text ?? outputs?.result ?? outputs?.body ?? outputs;
      const text = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
      setAiText(text);
    } catch {
      setAiText(localSummary);
    } finally {
      setLoadingAi(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center text-slate-500">
        请先登录后再查看总结
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-20 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-slate-600 hover:text-teal-600 flex items-center">
          <ArrowLeft size={20} className="mr-2" /> 返回
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthCursor({ year: monthCursor.monthIndex === 0 ? monthCursor.year - 1 : monthCursor.year, monthIndex: monthCursor.monthIndex === 0 ? 11 : monthCursor.monthIndex - 1 })}
            className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium"
          >
            上个月
          </button>
          <div className="text-sm text-slate-600 w-24 text-center">
            {monthCursor.year}.{monthCursor.monthIndex + 1}
          </div>
          <button
            onClick={() => setMonthCursor({ year: monthCursor.monthIndex === 11 ? monthCursor.year + 1 : monthCursor.year, monthIndex: monthCursor.monthIndex === 11 ? 0 : monthCursor.monthIndex + 1 })}
            className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium"
          >
            下个月
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center text-slate-800 font-bold mb-4">
          <FileText className="mr-2" /> 本月总结
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="text-xs text-slate-400">平均完成度</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{monthStats.avg}%</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="text-xs text-slate-400">已打卡天数</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{monthStats.activeDays} 天</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="text-xs text-slate-400">达标(≥80%)</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{monthStats.targetDays} 天</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="text-xs text-slate-400">连续达标</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{monthStats.streak} 天</div>
          </div>
        </div>

        {topMissed.length > 0 && (
          <div className="mt-6">
            <div className="text-sm font-bold text-slate-800 mb-3">本月易漏项目</div>
            <div className="space-y-2">
              {topMissed.map((x) => (
                <div key={x.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 text-sm truncate">{x.title}</div>
                    <div className="text-xs text-slate-400 mt-1 truncate">{x.time} · {x.type}</div>
                  </div>
                  <div className="text-xs font-bold text-slate-700 flex-shrink-0">
                    漏打 {x.missed} 天
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-teal-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-teal-800 font-bold">
            <Sparkles className="mr-2" /> 智能总结
          </div>
          <button
            onClick={generateAi}
            disabled={loadingAi}
            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-sm disabled:opacity-50 flex items-center"
          >
            {loadingAi ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
            生成
          </button>
        </div>

        {aiSummary ? (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-700 space-y-4">
            {aiSummary.summary ? (
              <div>
                <div className="text-slate-900 font-bold mb-2">概览</div>
                <div className="whitespace-pre-wrap">{aiSummary.summary}</div>
              </div>
            ) : null}
            {aiSummary.keyIssues.length > 0 ? (
              <div>
                <div className="text-slate-900 font-bold mb-2">主要问题</div>
                <div className="space-y-2">
                  {aiSummary.keyIssues.map((t: string, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3">
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {aiSummary.actions.length > 0 ? (
              <div>
                <div className="text-slate-900 font-bold mb-2">本月改进建议</div>
                <div className="space-y-2">
                  {aiSummary.actions.map((t: string, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3">
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {aiSummary.nextGoals.length > 0 ? (
              <div>
                <div className="text-slate-900 font-bold mb-2">下月目标</div>
                <div className="space-y-2">
                  {aiSummary.nextGoals.map((t: string, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3">
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap">
            {aiText || localSummary}
          </div>
        )}
      </div>
    </div>
  );
};
