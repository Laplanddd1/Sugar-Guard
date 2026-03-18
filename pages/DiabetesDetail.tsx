import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DIABETES_TYPES } from '../constants';
import { ArrowLeft, Activity, AlertCircle, Pill } from 'lucide-react';

export const DiabetesDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const info = DIABETES_TYPES.find(d => d.id === id);

  if (!info) return <div className="p-8 text-center">未知类型</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="mr-4 text-slate-600 hover:text-teal-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{info.name}</h1>
      </div>

      <div className="space-y-6">
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center mb-3 text-teal-600">
            <Activity className="mr-2" />
            <h2 className="font-bold text-lg">发病机制</h2>
          </div>
          <p className="text-slate-600 leading-relaxed">{info.mechanism}</p>
        </section>

        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center mb-3 text-orange-500">
            <AlertCircle className="mr-2" />
            <h2 className="font-bold text-lg">临床表现</h2>
          </div>
          <ul className="list-disc list-inside text-slate-600 space-y-1">
            {info.symptoms.map((sym, idx) => (
              <li key={idx}>{sym}</li>
            ))}
          </ul>
        </section>

        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center mb-3 text-blue-500">
            <Pill className="mr-2" />
            <h2 className="font-bold text-lg">治疗方法</h2>
          </div>
          <ul className="list-disc list-inside text-slate-600 space-y-1">
            {info.treatment.map((t, idx) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};