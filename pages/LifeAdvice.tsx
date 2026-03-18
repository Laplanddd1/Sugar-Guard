import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, Dumbbell, Brain, Coffee } from 'lucide-react';

export const LifeAdvice: React.FC = () => {
  const navigate = useNavigate();

  const categories = [
    { id: 'diet', title: '饮食建议', icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-100', desc: '低GI、控糖、营养均衡' },
    { id: 'exercise', title: '运动指导', icon: Dumbbell, color: 'text-blue-500', bg: 'bg-blue-100', desc: '有氧、力量、柔韧性' },
    { id: 'mental', title: '心理调节', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-100', desc: '减压、睡眠、情绪管理' },
    { id: 'habit', title: '生活习惯', icon: Coffee, color: 'text-teal-500', bg: 'bg-teal-100', desc: '戒烟限酒、规律作息' },
  ];

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">生活建议</h1>
      <div className="grid grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => navigate(`/life-advice/${cat.id}`)}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center cursor-pointer hover:shadow-md hover:scale-[1.02] transition-transform duration-200"
          >
            <div className={`w-14 h-14 ${cat.bg} rounded-full flex items-center justify-center mb-3`}>
              <cat.icon size={28} className={cat.color} />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">{cat.title}</h3>
            <p className="text-xs text-slate-400">{cat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};