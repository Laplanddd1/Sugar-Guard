import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, CalendarDays, Loader2, Plus, Sparkles, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { runDifyWorkflow } from '../services/difyService';
import { DIFY_APPS } from '../config';

type MetricKey = 'weight' | 'waistline' | 'systolicPressure' | 'fastingGlucose';

type VitalLog = {
  dateKey: string;
  weight?: number;
  waistline?: number;
  systolicPressure?: number;
  fastingGlucose?: number;
  note?: string;
};

export const Trends: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [metric, setMetric] = useState<MetricKey>('weight');
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['weight']);
  const [showTargetBand, setShowTargetBand] = useState(true);
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [logs, setLogs] = useState<VitalLog[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingDateKey, setEditingDateKey] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<'dify' | 'local' | null>(null);

  const todayKey = useMemo(() => {
    const d = new Date();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, []);

  const storageKey = user ? `sugar_guard_vitals_${user.id}` : '';

  const toFiniteNumberOrUndefined = (value: string) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setLogs([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setLogs(parsed);
      else setLogs([]);
    } catch {
      setLogs([]);
    }
  }, [user, storageKey]);

  const normalizedLogs = useMemo(() => {
    const map = new Map<string, VitalLog>();
    for (const l of logs) {
      if (!l?.dateKey) continue;
      map.set(l.dateKey, l);
    }
    const arr = Array.from(map.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return arr;
  }, [logs]);

  const dateKeysInRange = useMemo(() => {
    const keys: string[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const mm = `${d.getMonth() + 1}`.padStart(2, '0');
      const dd = `${d.getDate()}`.padStart(2, '0');
      keys.push(`${d.getFullYear()}-${mm}-${dd}`);
    }
    return keys;
  }, [rangeDays]);

  const seriesMap = useMemo(() => {
    const byDate = new Map(normalizedLogs.map(l => [l.dateKey, l]));
    const palette: Record<MetricKey, string> = {
      weight: '#0ea5e9',
      waistline: '#22c55e',
      systolicPressure: '#f59e0b',
      fastingGlucose: '#14b8a6',
    };
    const unitLabel: Record<MetricKey, { unit: string; label: string }> = {
      weight: { unit: 'kg', label: '体重' },
      waistline: { unit: 'cm', label: '腰围' },
      systolicPressure: { unit: 'mmHg', label: '收缩压' },
      fastingGlucose: { unit: 'mmol/L', label: '空腹血糖' },
    };
    const bandFor = (k: MetricKey) => {
      if (k === 'fastingGlucose') return { min: 3.9, max: 6.1 };
      if (k === 'systolicPressure') return { min: 110, max: 130 };
      if (k === 'waistline') {
        const threshold = user?.profile?.sex === '女' ? 85 : 90;
        return { min: 0, max: threshold };
      }
      return null;
    };
    const map: Record<MetricKey, { values: Array<{ dateKey: string; value: number | null }>; color: string; unit: string; label: string; band: { min: number; max: number } | null }> = {
      weight: { values: [], color: palette.weight, unit: unitLabel.weight.unit, label: unitLabel.weight.label, band: null },
      waistline: { values: [], color: palette.waistline, unit: unitLabel.waistline.unit, label: unitLabel.waistline.label, band: bandFor('waistline') },
      systolicPressure: { values: [], color: palette.systolicPressure, unit: unitLabel.systolicPressure.unit, label: unitLabel.systolicPressure.label, band: bandFor('systolicPressure') },
      fastingGlucose: { values: [], color: palette.fastingGlucose, unit: unitLabel.fastingGlucose.unit, label: unitLabel.fastingGlucose.label, band: bandFor('fastingGlucose') },
    };
    for (const k of dateKeysInRange) {
      const row = byDate.get(k);
      map.weight.values.push({ dateKey: k, value: Number.isFinite(row?.weight) ? (row!.weight as number) : null });
      map.waistline.values.push({ dateKey: k, value: Number.isFinite(row?.waistline) ? (row!.waistline as number) : null });
      map.systolicPressure.values.push({ dateKey: k, value: Number.isFinite(row?.systolicPressure) ? (row!.systolicPressure as number) : null });
      map.fastingGlucose.values.push({ dateKey: k, value: Number.isFinite(row?.fastingGlucose) ? (row!.fastingGlucose as number) : null });
    }
    return map;
  }, [normalizedLogs, dateKeysInRange, user]);

  const chartMeta = useMemo(() => {
    const allVals: number[] = [];
    for (const k of selectedMetrics) {
      for (const p of seriesMap[k].values) if (typeof p.value === 'number') allVals.push(p.value as number);
    }
    if (allVals.length === 0) return { min: 0, max: 1, unit: seriesMap[metric].unit, label: seriesMap[metric].label };
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const pad = (max - min) * 0.15 || 1;
    return { min: min - pad, max: max + pad, unit: seriesMap[metric].unit, label: seriesMap[metric].label };
  }, [seriesMap, selectedMetrics, metric]);

  const compare14 = useMemo(() => {
    const valuesByKey = new Map(seriesMap[metric].values.map(p => [p.dateKey, p.value]));
    const validKeys = dateKeysInRange.filter(k => k <= todayKey);
    const last7 = validKeys.slice(Math.max(0, validKeys.length - 7));
    const prev7 = validKeys.slice(Math.max(0, validKeys.length - 14), Math.max(0, validKeys.length - 7));
    const avg = (keys: string[]) => {
      const vals = keys.map(k => valuesByKey.get(k)).filter((v): v is number => typeof v === 'number');
      if (vals.length === 0) return null;
      const s = vals.reduce((a, b) => a + b, 0);
      return s / vals.length;
    };
    const a = avg(last7);
    const b = avg(prev7);
    const delta = a !== null && b !== null ? a - b : null;
    return { last7Avg: a, prev7Avg: b, delta };
  }, [seriesMap, metric, dateKeysInRange, todayKey]);

  const MultiLineChart: React.FC<{ series: Array<{ key: MetricKey; values: Array<{ dateKey: string; value: number | null }>; color: string; band: { min: number; max: number } | null }> }> = ({ series }) => {
    const w = 320;
    const h = 96;
    const anyValid = series.some(s => s.values.some(v => typeof v.value === 'number'));
    if (!anyValid) {
      return (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center text-slate-400 text-sm">
          暂无数据，添加一条记录后会显示趋势
        </div>
      );
    }
    const min = chartMeta.min;
    const max = chartMeta.max;
    const scaleY = (v: number) => {
      const t = (v - min) / (max - min);
      return h - Math.max(0, Math.min(1, t)) * h;
    };
    const scaleX = (i: number, count: number) => (count === 1 ? 0 : (i / (count - 1)) * w);
    const bands = series.filter(s => s.band && showTargetBand);
    const isOutOfBand = (s: { band: { min: number; max: number } | null }, v: number) => {
      if (!s.band) return false;
      return v < s.band.min || v > s.band.max;
    };
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">近 {rangeDays} 天</div>
          <div className="text-xs text-slate-500">{chartMeta.unit}</div>
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {series.map((s) => (
            <div key={`lg-${s.key}`} className="flex items-center gap-2 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              {seriesMap[s.key].label}
            </div>
          ))}
          {showTargetBand && bands.length > 0 && (
            <div className="text-xs text-slate-500 ml-auto">
              目标区间已显示
            </div>
          )}
        </div>
        <svg className="w-full h-24 mt-2" viewBox={`0 0 ${w} ${h}`}>
          {bands.map((s, idx) => {
            const y1 = scaleY(s.band!.max);
            const y2 = scaleY(s.band!.min);
            return <rect key={`band-${idx}`} x={0} y={Math.min(y1, y2)} width={w} height={Math.abs(y2 - y1)} fill={`${s.color}22`} />;
          })}
          {series.map((s) => {
            const pts = s.values.map((p, i) => {
              const x = scaleX(i, s.values.length);
              const y = p.value === null ? null : scaleY(p.value);
              return { x, y, dateKey: p.dateKey, value: p.value };
            });
            const poly = pts.filter(p => p.y !== null).map(p => `${p.x},${p.y}`).join(' ');
            const lastPoint = [...pts].reverse().find(p => p.y !== null);
            return (
              <g key={`line-${s.key}`}>
                <polyline points={poly} fill="none" stroke={s.color} strokeWidth="2" />
                {pts.map((p) => {
                  if (p.y === null || p.value === null) return null;
                  const out = isOutOfBand(s, p.value as number);
                  return (
                    <circle
                      key={`pt-${s.key}-${p.dateKey}`}
                      cx={p.x}
                      cy={p.y!}
                      r="2"
                      fill={s.color}
                      stroke={out ? '#ef4444' : 'transparent'}
                      strokeWidth={out ? 2 : 0}
                    />
                  );
                })}
                {lastPoint?.y !== null ? <circle cx={lastPoint!.x} cy={lastPoint!.y!} r="4" fill={s.color} /> : null}
              </g>
            );
          })}
        </svg>
        <div className="flex items-center justify-between mt-2">
          <div className="text-[10px] text-slate-400">{dateKeysInRange[0]}</div>
          <div className="text-[10px] text-slate-400">{dateKeysInRange[dateKeysInRange.length - 1]}</div>
        </div>
      </div>
    );
  };

  const todayLog = useMemo(() => normalizedLogs.find(l => l.dateKey === todayKey) || null, [normalizedLogs, todayKey]);
  const [form, setForm] = useState<{ weight: string; waistline: string; systolicPressure: string; fastingGlucose: string; note: string }>({
    weight: '',
    waistline: '',
    systolicPressure: '',
    fastingGlucose: '',
    note: '',
  });

  useEffect(() => {
    if (!user) return;
    if (!editingDateKey) setEditingDateKey(todayKey);
    const targetLog = normalizedLogs.find(l => l.dateKey === (editingDateKey || todayKey)) || null;
    const base = targetLog || user.profile || null;
    setForm({
      weight: typeof ((targetLog as any)?.weight ?? user.profile?.weight) === 'number' ? String((targetLog as any)?.weight ?? user.profile?.weight) : '',
      waistline: typeof ((targetLog as any)?.waistline ?? user.profile?.waistline) === 'number' ? String((targetLog as any)?.waistline ?? user.profile?.waistline) : '',
      systolicPressure: typeof ((targetLog as any)?.systolicPressure ?? user.profile?.systolicPressure) === 'number' ? String((targetLog as any)?.systolicPressure ?? user.profile?.systolicPressure) : '',
      fastingGlucose: typeof (targetLog as any)?.fastingGlucose === 'number' ? String((targetLog as any)?.fastingGlucose) : '',
      note: typeof (base as any)?.note === 'string' ? (base as any).note : '',
    });
  }, [user, todayLog, todayKey, normalizedLogs, editingDateKey]);

  const saveLog = () => {
    if (!user) return;
    const next: VitalLog = {
      dateKey: editingDateKey || todayKey,
      weight: form.weight ? toFiniteNumberOrUndefined(form.weight) : undefined,
      waistline: form.waistline ? toFiniteNumberOrUndefined(form.waistline) : undefined,
      systolicPressure: form.systolicPressure ? toFiniteNumberOrUndefined(form.systolicPressure) : undefined,
      fastingGlucose: form.fastingGlucose ? toFiniteNumberOrUndefined(form.fastingGlucose) : undefined,
      note: form.note?.trim() ? form.note.trim() : undefined,
    };
    if (!next.weight && !next.waistline && !next.systolicPressure && !next.fastingGlucose && !next.note) {
      alert('请至少填写一项数值或备注');
      return;
    }
    const filtered = normalizedLogs.filter(l => l.dateKey !== next.dateKey);
    const updated = [...filtered, next].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    setLogs(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setShowAdd(false);
  };

  const deleteLog = (dateKey: string) => {
    if (!user) return;
    const updated = normalizedLogs.filter(l => l.dateKey !== dateKey);
    setLogs(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    if (editingDateKey === dateKey) setEditingDateKey(todayKey);
  };

  const localInsights = useMemo(() => {
    const label = seriesMap[metric].label;
    const unit = seriesMap[metric].unit;
    const band = seriesMap[metric].band;
    const vals = seriesMap[metric].values.filter(v => v.value !== null).map(v => v.value as number);
    const last = [...seriesMap[metric].values].reverse().find(v => v.value !== null);
    const min = vals.length ? Math.min(...vals) : null;
    const max = vals.length ? Math.max(...vals) : null;
    const outCount = band ? seriesMap[metric].values.filter(v => typeof v.value === 'number' && ((v.value as number) < band.min || (v.value as number) > band.max)).length : 0;
    const delta = compare14.delta;
    const deltaText = delta === null ? '暂无' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} ${unit}`;
    const outText = band ? `超出目标区间 ${outCount} 天` : '无目标区间';
    const parts: string[] = [];
    parts.push(`${label}近7天均值：${compare14.last7Avg !== null ? compare14.last7Avg.toFixed(1) : '暂无'} ${unit}`);
    parts.push(`对比前7天：${compare14.prev7Avg !== null ? compare14.prev7Avg.toFixed(1) : '暂无'} ${unit}（变化 ${deltaText}）`);
    if (last?.value !== null && last?.dateKey) parts.push(`最近一次：${last.dateKey} · ${Number(last.value).toFixed(1)} ${unit}`);
    if (min !== null && max !== null) parts.push(`区间：${min.toFixed(1)}~${max.toFixed(1)} ${unit}（近${rangeDays}天）`);
    parts.push(outText);
    const actions: string[] = [];
    if (metric === 'fastingGlucose') actions.push('优先保证测量时间一致（起床后、进食前），并记录前一晚睡眠/晚餐情况。');
    if (metric === 'systolicPressure') actions.push('同一时间段测量并保持坐位休息 5 分钟；盐摄入与睡眠对波动影响很大。');
    if (metric === 'waistline') actions.push('每周固定 2–3 次在同一位置测量腰围，搭配餐后步行更容易看到趋势下降。');
    if (metric === 'weight') actions.push('把体重记录与“前一日运动/晚餐主食量”一起记录，能更快找到波动原因。');
    actions.push('本周优先把“最容易坚持的一件事”做到每天都执行，再逐步加量。');
    return { summary: parts.join('\n'), actions };
  }, [seriesMap, metric, compare14, rangeDays]);

  const normalizeAiOutputToText = (outputs: any) => {
    const raw = outputs?.text ?? outputs?.result ?? outputs?.body ?? outputs;
    if (typeof raw === 'string') return { text: raw, kind: 'text' as const };
    if (!raw || typeof raw !== 'object') return { text: null, kind: 'empty' as const };

    const obj = raw as any;
    if (typeof obj.completionStatus === 'string' || typeof obj.evaluate === 'string' || typeof obj.suggestion === 'string') {
      const lines: string[] = [];
      if (obj.process) lines.push(`完成度：${obj.process}`);
      if (obj.completionStatus) lines.push(String(obj.completionStatus));
      if (obj.evaluate) lines.push(`\n评价：\n${obj.evaluate}`);
      if (obj.suggestion) lines.push(`\n建议：\n${obj.suggestion}`);
      return { text: lines.filter(Boolean).join('\n'), kind: 'checkin' as const };
    }

    if (
      typeof obj.overview === 'string' ||
      typeof obj.change === 'string' ||
      Array.isArray(obj.risks) ||
      Array.isArray(obj.actions)
    ) {
      const lines: string[] = [];
      if (obj.overview) lines.push(`概览：\n${obj.overview}`);
      if (obj.change) lines.push(`\n变化解读：\n${obj.change}`);
      if (Array.isArray(obj.risks) && obj.risks.length) lines.push(`\n风险点：\n- ${obj.risks.filter(Boolean).join('\n- ')}`);
      if (Array.isArray(obj.actions) && obj.actions.length) lines.push(`\n本周重点改进3件事：\n- ${obj.actions.filter(Boolean).slice(0, 3).join('\n- ')}`);
      return { text: lines.filter(Boolean).join('\n'), kind: 'vitals' as const };
    }

    return { text: JSON.stringify(raw, null, 2), kind: 'json' as const };
  };

  const aiInputs = useMemo(() => {
    if (!user?.profile) return null;
    const safeStringify = (v: any) => {
      try {
        return JSON.stringify(v);
      } catch {
        return '';
      }
    };
    const compact = seriesMap[metric].values
      .filter(p => p.value !== null)
      .slice(-14)
      .map(p => ({ date: p.dateKey, value: p.value }));
    return {
      type: 'vitals_trend',
      userId: parseInt(user.id) || 0,
      metric,
      metricLabel: seriesMap[metric].label,
      unit: seriesMap[metric].unit,
      profile: safeStringify(user.profile),
      last14: safeStringify({ points: compact }),
      compare: safeStringify({
        last7Avg: compare14.last7Avg ?? undefined,
        prev7Avg: compare14.prev7Avg ?? undefined,
        delta: compare14.delta ?? undefined,
      }),
      derived: {
        rangeDays,
        localSummary: localInsights.summary,
        suggestedActions: localInsights.actions,
      },
      outputFormat: {
        language: 'zh-CN',
        sections: ['概览', '变化解读', '风险点', '本周重点改进3件事'],
      },
    };
  }, [user, seriesMap, metric, compare14, rangeDays, localInsights]);

  const generateAi = async () => {
    if (!user) {
      alert('请先登录');
      navigate('/mine');
      return;
    }
    if (!user.profile) {
      alert('请先完善个人档案');
      navigate('/mine');
      return;
    }
    if (!aiInputs) return;
    setLoadingAi(true);
    try {
      const outputs = await runDifyWorkflow(DIFY_APPS.CHECKIN_ANALYSIS, aiInputs, user.id);
      
      const normalized = normalizeAiOutputToText(outputs);
      if (normalized.kind === 'checkin') {
        setAiText(`${localInsights.summary}\n\n提示：当前工作流仍是“打卡分析”，尚未配置“趋势解读”。\n\n${normalized.text || ''}`.trim());
        setAiSource('local');
      } else {
        setAiText(normalized.text || `${localInsights.summary}\n\n本周重点改进3件事：\n- ${localInsights.actions.slice(0, 3).join('\n- ')}`);
        setAiSource('dify');
      }
    } catch {
      setAiText(`${localInsights.summary}\n\n本周重点改进3件事：\n- ${localInsights.actions[0] || '保持记录频率，每周至少 3 次测量。'}\n- ${localInsights.actions[1] || '把餐后轻活动固定下来（10–15 分钟步行）。'}\n- ${localInsights.actions[2] || '把睡眠时长与晚餐主食量作为优先变量稳定下来。'}`);
      setAiSource('local');
    } finally {
      setLoadingAi(false);
    }
  };

  const metricTabs: Array<{ key: MetricKey; label: string; unit: string }> = [
    { key: 'weight', label: '体重', unit: 'kg' },
    { key: 'waistline', label: '腰围', unit: 'cm' },
    { key: 'systolicPressure', label: '收缩压', unit: 'mmHg' },
    { key: 'fastingGlucose', label: '空腹血糖', unit: 'mmol/L' },
  ];

  const bmiInfo = useMemo(() => {
    const h = user?.profile?.height ? user!.profile!.height! / 100 : null;
    const latestW = [...seriesMap.weight.values].reverse().find(v => typeof v.value === 'number')?.value ?? null;
    if (!h || !latestW) return null;
    const bmi = latestW / (h * h);
    const level = bmi < 18.5 ? '偏低' : bmi < 24 ? '正常' : bmi < 28 ? '超重' : '肥胖';
    return { bmi: Number(bmi.toFixed(1)), level };
  }, [seriesMap, user]);

  const recentLogs = useMemo(() => normalizedLogs.slice().reverse().slice(0, 14), [normalizedLogs]);

  return (
    <div className="p-4 md:p-8 pb-20 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-slate-600 hover:text-teal-600 flex items-center">
          <ArrowLeft size={20} className="mr-2" /> 返回
        </button>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-sm flex items-center"
        >
          <Plus size={16} className="mr-2" /> 记录今日
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center text-slate-800 font-bold mb-4">
          <BarChart3 className="mr-2" /> 趋势
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {metricTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setMetric(t.key)}
              className={`px-3 py-2 rounded-xl text-sm font-bold border ${
                metric === t.key ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={`rng-${d}`}
                onClick={() => setRangeDays(d as 7 | 30 | 90)}
                className={`px-3 py-2 rounded-xl text-sm font-bold border ${
                  rangeDays === d ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                {d}天
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          {metricTabs.map((t) => (
            <label key={`chk-${t.key}`} className="text-xs text-slate-700 flex items-center gap-1">
              <input
                type="checkbox"
                checked={selectedMetrics.includes(t.key)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? Array.from(new Set([...selectedMetrics, t.key]))
                    : selectedMetrics.filter(k => k !== t.key);
                  setSelectedMetrics(next.length ? next : [t.key]);
                }}
              />
              {t.label}
            </label>
          ))}
          <label className="text-xs text-slate-700 flex items-center gap-1 ml-4">
            <input type="checkbox" checked={showTargetBand} onChange={(e) => setShowTargetBand(e.target.checked)} />
            显示目标区间
          </label>
        </div>

        <MultiLineChart
          series={selectedMetrics.map((k) => ({
            key: k,
            values: seriesMap[k].values,
            color: seriesMap[k].color,
            band: seriesMap[k].band,
          }))}
        />

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="text-xs text-slate-400">最近 7 天均值</div>
            <div className="text-xl font-bold text-slate-800 mt-1">
              {compare14.last7Avg !== null ? compare14.last7Avg.toFixed(1) : '--'} {chartMeta.unit}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="text-xs text-slate-400">之前 7 天均值</div>
            <div className="text-xl font-bold text-slate-800 mt-1">
              {compare14.prev7Avg !== null ? compare14.prev7Avg.toFixed(1) : '--'} {chartMeta.unit}
            </div>
          </div>
        </div>
        {bmiInfo && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="text-xs text-slate-400">BMI</div>
              <div className="text-xl font-bold text-slate-800 mt-1">{bmiInfo.bmi}</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="text-xs text-slate-400">水平</div>
              <div className="text-xl font-bold text-slate-800 mt-1">{bmiInfo.level}</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-teal-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-teal-800 font-bold">
            <Sparkles className="mr-2" /> 智能解读
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
        <div className="text-[10px] text-slate-400 mb-2">
          {aiSource === 'dify' ? '来源：智能工作流' : aiSource === 'local' ? '来源：本地分析（工作流异常时自动回退）' : '点击生成'}
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap">
          {aiText || '点击“生成”获取本周解读与建议。'}
        </div>
        <div className="text-[10px] text-slate-400 mt-3 flex items-center">
          <CalendarDays size={12} className="mr-1" /> 使用近 14 天记录生成建议
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-slate-800">历史记录</div>
          <div className="text-xs text-slate-500">最近 14 条</div>
        </div>
        {recentLogs.length === 0 ? (
          <div className="text-sm text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
            暂无记录
          </div>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((l) => (
              <div key={`row-${l.dateKey}`} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 text-sm">{l.dateKey}</div>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
                    {typeof l.weight === 'number' ? <span>体重 {l.weight}kg</span> : null}
                    {typeof l.waistline === 'number' ? <span>腰围 {l.waistline}cm</span> : null}
                    {typeof l.systolicPressure === 'number' ? <span>收缩压 {l.systolicPressure}mmHg</span> : null}
                    {typeof l.fastingGlucose === 'number' ? <span>空腹血糖 {l.fastingGlucose}mmol/L</span> : null}
                  </div>
                  {l.note ? <div className="text-xs text-slate-400 mt-1 truncate">{l.note}</div> : null}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      setEditingDateKey(l.dateKey);
                      setShowAdd(true);
                    }}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700"
                    aria-label="编辑"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`确定删除 ${l.dateKey} 的记录吗？`)) deleteLog(l.dateKey);
                    }}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-rose-600"
                    aria-label="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="font-bold text-slate-800">记录（{editingDateKey || todayKey}）</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">日期</label>
              <input
                type="date"
                value={editingDateKey || todayKey}
                onChange={(e) => setEditingDateKey(e.target.value)}
                className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="text-xs text-slate-500 flex items-end">
              支持补录历史数据
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">体重 (kg)</label>
              <input
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">腰围 (cm)</label>
              <input
                value={form.waistline}
                onChange={(e) => setForm({ ...form, waistline: e.target.value })}
                className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">收缩压 (mmHg)</label>
              <input
                value={form.systolicPressure}
                onChange={(e) => setForm({ ...form, systolicPressure: e.target.value })}
                className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">空腹血糖 (mmol/L)</label>
              <input
                value={form.fastingGlucose}
                onChange={(e) => setForm({ ...form, fastingGlucose: e.target.value })}
                className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500"
                inputMode="decimal"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">备注（可选）</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 h-24"
              placeholder="例如：昨晚睡眠不足、今天运动量增加、饮食偏咸..."
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 py-3 rounded-xl font-bold border border-slate-200 text-slate-600"
            >
              取消
            </button>
            <button
              onClick={saveLog}
              className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
