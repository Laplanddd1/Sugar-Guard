import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { runDifyWorkflow } from '../services/difyService';
import { DIFY_APPS } from '../config';
import { Loader2, Activity, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RiskAssessment: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showRaw, setShowRaw] = useState(false);

  const parsed = useMemo(() => {
    const normalizeUserFacingText = (text: string) => {
      let t = String(text || '').trim();
      if (!t) return t;
      t = t.replace(/```json/gi, '```').trim();
      t = t.replace(/```/g, '').trim();
      if (t.includes('</details>')) {
        const parts = t.split('</details>');
        t = (parts[parts.length - 1] || '').trim();
      }
      t = t.replace(/<details[\s\S]*?<\/details>/gi, '').trim();
      t = t.replace(/<\/?[^>]+>/g, '').trim();
      const lastBracket = t.lastIndexOf('【');
      if (lastBracket !== -1) t = t.slice(lastBracket).trim();
      t = t.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      const lines = t.split('\n').map(s => s.trim()).filter(Boolean);
      if (lines.length > 2) return lines.slice(0, 2).join('\n');
      return lines.join('\n');
    };

    const tryParseJson = (text: string) => {
      const cleaned = text.trim().replace(/```json/g, '').replace(/```/g, '').trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    };

    const value = result;
    if (!value) return null;
    if (typeof value === 'string') {
      const asJson = tryParseJson(value);
      if (asJson) return asJson;
      const cleanedText = normalizeUserFacingText(value);
      const asJsonAfterClean = cleanedText ? tryParseJson(cleanedText) : null;
      return asJsonAfterClean ?? cleanedText;
    }
    return value;
  }, [result]);

  const report = useMemo(() => {
    if (!parsed) return null;
    if (typeof parsed === 'string') {
      return {
        title: '评估结果',
        level: '',
        probabilityText: '',
        content: parsed,
      };
    }
    if (parsed && typeof parsed === 'object') {
      const level = parsed.risk_level || parsed.riskLevel || parsed.level || '';
      const prob = parsed.risk_probability ?? parsed.probability ?? parsed.risk ?? parsed.score ?? null;
      const probText =
        typeof prob === 'number'
          ? (prob > 1 ? `${Math.round(prob)}%` : `${Math.round(prob * 100)}%`)
          : typeof prob === 'string'
            ? prob
            : '';
      const summary = parsed.summary || parsed.conclusion || parsed.result || '';
      const suggestions = parsed.suggestions || parsed.advice || parsed.recommendations || [];
      const adviceText = Array.isArray(suggestions) ? suggestions.filter(Boolean).join('\n') : '';
      const content = [summary, adviceText].filter(Boolean).join('\n\n') || JSON.stringify(parsed, null, 2);

      return {
        title: '评估报告',
        level: String(level || ''),
        probabilityText: probText,
        content,
      };
    }
    return {
      title: '评估结果',
      level: '',
      probabilityText: '',
      content: String(parsed),
    };
  }, [parsed]);

  const handleAssessment = async () => {
    if (!user || !user.profile) {
      alert("请先完善个人档案");
      navigate('/mine');
      return;
    }
    
    setLoading(true);
    try {
      const inputs = {
        userId: parseInt(user.id) || 48,
        age: user.profile.age,
        sex: user.profile.sex,
        height: user.profile.height,
        weight: user.profile.weight,
        familyHistory: user.profile.familyHistory,
        waistline: user.profile.waistline || 0,
        systolicPressure: user.profile.systolicPressure || 0,
        isPregnancy: user.profile.isPregnancy || '否',
        disease: '否' // Mandatory 'No' for risk prediction per docs
      };

      const outputs = await runDifyWorkflow(
        DIFY_APPS.RISK_PREDICTION,
        inputs,
        user.id
      );

      setResult(outputs.body || outputs);
      setShowRaw(false);

    } catch (e) {
      console.error(e);
      alert("评估失败，请检查网络");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">糖尿病风险智能预测</h1>
      
      {!result ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-500">
            <Activity size={40} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">基于指标的风险分析</h2>
          <p className="text-slate-500 text-sm mb-8 px-4">
            系统将综合您的身体指标（BMI、腰围、血压等）及家族病史，给出风险水平与可执行的生活方式建议。
          </p>
          
          <button
            onClick={handleAssessment}
            disabled={loading}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-orange-600 transition flex justify-center items-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : '开始评估'}
          </button>
          
          <p className="text-xs text-slate-300 mt-4">评估结果仅供参考，不可作为医疗诊断依据。</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
             <div className="flex items-center mb-4 text-orange-600 font-bold">
               <AlertTriangle className="mr-2" /> {report?.title || '评估报告'}
             </div>
             {report && (
               <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                 <div className="flex items-center justify-between gap-3">
                   <div className="flex items-center gap-2">
                     {report.level && (
                       <span className="text-xs px-2 py-1 rounded bg-white border border-slate-200 text-slate-700">
                         风险：{report.level}
                       </span>
                     )}
                     {report.probabilityText && (
                       <span className="text-xs px-2 py-1 rounded bg-white border border-slate-200 text-slate-700">
                         概率：{report.probabilityText}
                       </span>
                     )}
                   </div>
                   <button
                     onClick={() => setShowRaw(v => !v)}
                     className="text-xs text-slate-500 flex items-center"
                   >
                     {showRaw ? (
                       <>
                         收起原始数据 <ChevronUp size={14} className="ml-1" />
                       </>
                     ) : (
                       <>
                         查看原始数据 <ChevronDown size={14} className="ml-1" />
                       </>
                     )}
                   </button>
                 </div>
                 <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mt-3">
                   {report.content}
                 </div>
                 {showRaw && (
                   <pre className="whitespace-pre-wrap font-mono text-xs text-slate-600 mt-4 bg-white p-3 rounded border border-slate-200 overflow-x-auto">
                     {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                   </pre>
                 )}
               </div>
             )}
          </div>
          <button
            onClick={() => {
              setResult(null);
              setShowRaw(false);
            }}
            className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold"
          >
            重新评估
          </button>
        </div>
      )}
    </div>
  );
};
