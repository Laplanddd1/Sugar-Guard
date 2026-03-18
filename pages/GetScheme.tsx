import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, Save, FileText } from 'lucide-react';
import { runDifyWorkflow } from '../services/difyService';
import { DIFY_APPS } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { SchemeItem } from '../types';

export const GetScheme: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Custom inputs for Scheme Customization API
  const [habit, setHabit] = useState('');
  const [suggestion, setSuggestion] = useState('');
  
  const [items, setItems] = useState<SchemeItem[] | null>(null);
  const [rawResult, setRawResult] = useState<string | null>(null);

  const formattedDate = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  }, []);

  const buildUserInfo = () => {
    const p = user?.profile;
    if (!p) return '';
    const parts: string[] = [];
    parts.push(`年龄:${p.age}`);
    parts.push(`性别:${p.sex}`);
    parts.push(`身高:${p.height}cm`);
    parts.push(`体重:${p.weight}kg`);
    if (typeof p.waistline === 'number') parts.push(`腰围:${p.waistline}cm`);
    if (typeof p.systolicPressure === 'number') parts.push(`收缩压:${p.systolicPressure}mmHg`);
    parts.push(`家族史:${p.familyHistory}`);
    parts.push(`已确诊糖尿病:${p.disease}`);
    if (p.sex === '女') parts.push(`是否妊娠:${p.isPregnancy || '否'}`);
    return parts.join('，');
  };

  const tryParseJson = (value: string) => {
    const trimmed = value.trim();
    const withoutFence = trimmed
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    try {
      return JSON.parse(withoutFence);
    } catch {
      return null;
    }
  };

  const normalizeSchemeItems = (outputs: any): { items: SchemeItem[] | null; raw: string | null } => {
    const candidate = outputs?.body ?? outputs?.result ?? outputs?.text ?? outputs;
    if (Array.isArray(candidate)) return { items: candidate as SchemeItem[], raw: null };
    if (typeof candidate === 'string') {
      const parsed = tryParseJson(candidate);
      if (Array.isArray(parsed)) return { items: parsed as SchemeItem[], raw: null };
      return { items: null, raw: candidate };
    }
    if (candidate && typeof candidate === 'object') {
      if (Array.isArray(candidate.items)) return { items: candidate.items as SchemeItem[], raw: null };
      if (Array.isArray(candidate.data)) return { items: candidate.data as SchemeItem[], raw: null };
      return { items: null, raw: JSON.stringify(candidate, null, 2) };
    }
    return { items: null, raw: null };
  };

  const generateLocalScheme = (): SchemeItem[] => {
    const p = user?.profile;
    const heightM = p?.height ? p.height / 100 : 1.7;
    const weightKg = p?.weight ?? 65;
    const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
    const habitText = (habit || '').trim();
    const suggestionText = (suggestion || '').trim();
    const likesSweet = /甜|奶茶|蛋糕|巧克力|饼干|饮料/.test(habitText + suggestionText);
    const wantsSwim = /游泳/.test(habitText + suggestionText);
    const wantsWalk = /快走|走路|散步/.test(habitText + suggestionText);

    const dietTips = [
      likesSweet
        ? '把“甜点/奶茶”改成低糖替代：无糖酸奶、少量坚果、无糖茶饮；想吃甜时先吃一份蔬菜或蛋白质再少量尝。'
        : '主食优先全谷物与杂豆，蔬菜占半盘；含糖饮料和零食尽量改成无糖/低糖替代。',
      bmi >= 24 ? '每餐控制主食份量，优先选择高纤维主食；晚餐尽量比午餐更清淡。' : '三餐规律，避免空腹时间过长导致暴食；加餐优先蛋白质与坚果。',
    ].join('');

    const exercisePlan = wantsSwim
      ? '每周 3–4 次游泳，每次 30–45 分钟；其余天做 20–30 分钟快走或骑行。'
      : wantsWalk
        ? '每天快走 30 分钟，饭后加 10–15 分钟轻步行；每周 2 次力量训练。'
        : '每周累计 150 分钟中等强度有氧（快走/骑行/游泳任选），并每周 2 次力量训练。';

    const items: SchemeItem[] = [
      {
        time: '7:30-8:00',
        title: '早餐建议',
        content: `推荐：全麦主食 + 高蛋白 + 蔬菜（例如全麦吐司/燕麦 + 鸡蛋/无糖酸奶 + 番茄黄瓜）。${likesSweet ? '避免含糖面包、甜味咖啡和奶茶。' : ''}`,
        order: 1,
        type: '饮食',
        userId: user ? parseInt(user.id) : undefined,
      },
      {
        time: '12:00-13:00',
        title: '午餐建议',
        content: '一份优质蛋白（鸡胸/鱼/豆制品）+ 大量蔬菜 + 少量全谷物主食（糙米/藜麦/荞麦）。酱料尽量少糖少油。',
        order: 2,
        type: '饮食',
        userId: user ? parseInt(user.id) : undefined,
      },
      {
        time: '15:00-16:00',
        title: '加餐建议',
        content: likesSweet ? '想吃甜时先喝水或无糖茶，选择一小把坚果/无糖酸奶；少量黑巧克力可作为偶尔替代。' : '可选一小把坚果/一杯无糖酸奶/黄瓜番茄，避免饼干蛋糕等精制糖零食。',
        order: 3,
        type: '饮食',
        userId: user ? parseInt(user.id) : undefined,
      },
      {
        time: '18:00-19:00',
        title: '晚餐建议',
        content: '以蔬菜和蛋白质为主，主食量比午餐更少；晚餐后 1 小时内避免高糖水果和夜宵。',
        order: 4,
        type: '饮食',
        userId: user ? parseInt(user.id) : undefined,
      },
      {
        time: '每天',
        title: '饮食要点',
        content: dietTips,
        order: 5,
        type: '饮食',
        userId: user ? parseInt(user.id) : undefined,
      },
      {
        time: '7:00-7:30',
        title: '晨间活动',
        content: '起床后做 5 分钟热身拉伸，再进行 20–25 分钟轻快步行或原地踏步，帮助唤醒代谢。',
        order: 1,
        type: '运动',
        userId: user ? parseInt(user.id) : undefined,
      },
      {
        time: '饭后',
        title: '餐后轻活动',
        content: '每次正餐后步行 10–15 分钟，强度以“能说话但略喘”为宜，有助于稳定餐后血糖。',
        order: 2,
        type: '运动',
        userId: user ? parseInt(user.id) : undefined,
      },
      {
        time: '每周 3-4 次',
        title: wantsSwim ? '游泳训练' : '有氧训练',
        content: exercisePlan,
        order: 3,
        type: '运动',
        userId: user ? parseInt(user.id) : undefined,
      },
    ];

    return items;
  };

  const handleGenerate = async () => {
    if (!user) return;
    if (!user.profile) {
      alert('请先完善个人档案');
      navigate('/mine');
      return;
    }
    setLoading(true);
    try {
      const userInfoStr = buildUserInfo();
      const inputs = {
        userId: parseInt(user.id) || 48,
        userInfo: userInfoStr,
        habit: habit || '无',
        suggestion: suggestion || '无'
      };

      const outputs = await runDifyWorkflow(
        DIFY_APPS.SCHEME_CUSTOMIZATION,
        inputs,
        user.id
      );

      const normalized = normalizeSchemeItems(outputs);
      if (normalized.items && normalized.items.length > 0) {
        setItems(normalized.items);
        setRawResult(null);
        return;
      }
      if (normalized.raw) {
        setItems(null);
        setRawResult(normalized.raw);
        return;
      }

      const fallback = generateLocalScheme();
      setItems(fallback);
      setRawResult(null);
    } catch (e) {
      const fallback = generateLocalScheme();
      setItems(fallback);
      setRawResult(null);
    } finally {
      setLoading(false);
    }
  };

  const saveToLocal = () => {
    if (!user || !items || items.length === 0) return;
    const key = `sugar_guard_scheme_items_${user.id}`;
    localStorage.setItem(key, JSON.stringify({ createdAt: Date.now(), items }));
    navigate('/scheme');
  };

  const groupedItems = useMemo(() => {
    if (!items) return null;
    const groups: Record<string, SchemeItem[]> = {};
    for (const item of items) {
      const k = item.type || '其他';
      if (!groups[k]) groups[k] = [];
      groups[k].push(item);
    }
    for (const k of Object.keys(groups)) {
      groups[k] = groups[k].slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return groups;
  }, [items]);

  return (
    <div className="p-4 md:p-8 pb-20">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">生活方案定制</h1>

      {!items && !rawResult ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 mb-4">
                 系统将读取您的健康档案并结合填写内容，生成适合近期执行的饮食与运动建议（更新时间：{formattedDate}）。
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">生活习惯描述</label>
                <textarea
                  value={habit}
                  onChange={e => setHabit(e.target.value)}
                  className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 h-32"
                  placeholder="例如：平时喜欢吃甜食，经常熬夜，每周运动一次..."
                />
              </div>
              
              <button
                onClick={() => setStep(2)}
                className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold mt-4 flex justify-center items-center"
              >
                下一步 <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">您的期望或已有建议</label>
                <textarea
                  value={suggestion}
                  onChange={e => setSuggestion(e.target.value)}
                  className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:border-teal-500 h-32"
                  placeholder="例如：希望方案包含游泳，或者医生建议我少吃碳水..."
                />
              </div>
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl font-bold border border-slate-200 text-slate-600"
                >
                  上一步
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold flex justify-center items-center disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : '开始生成'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-teal-100">
             <div className="flex items-center mb-4 text-teal-800 font-bold">
               <FileText className="mr-2" /> 个性化方案
             </div>
             
             {groupedItems ? (
               <div className="space-y-6">
                 {Object.entries(groupedItems).map(([groupName, groupList]) => (
                   <div key={groupName}>
                     <div className="text-sm font-bold text-slate-800 mb-3">{groupName}</div>
                     <div className="space-y-3">
                       {groupList.map((it, idx) => (
                         <div key={`${it.type}-${it.order}-${idx}`} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                           <div className="flex items-center justify-between gap-3">
                             <div className="font-bold text-slate-800 text-sm">{it.title}</div>
                             <div className="text-xs text-slate-500 flex-shrink-0">{it.time}</div>
                           </div>
                           <div className="text-sm text-slate-600 leading-relaxed mt-2 whitespace-pre-wrap">{it.content}</div>
                         </div>
                       ))}
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="prose prose-sm text-slate-700">
                 <pre className="whitespace-pre-wrap font-sans bg-slate-50 p-4 rounded-lg overflow-x-auto">{rawResult}</pre>
               </div>
             )}
          </div>
          {items && items.length > 0 && (
            <button
              onClick={saveToLocal}
              className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center"
            >
              <Save size={18} className="mr-2" /> 保存并进入今日打卡
            </button>
          )}
          <button
            onClick={() => {
              setItems(null);
              setRawResult(null);
              setStep(1);
              setHabit('');
              setSuggestion('');
            }}
            className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold"
          >
            重新生成
          </button>
        </div>
      )}
    </div>
  );
};
