import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_ARTICLES, MOCK_DOCTORS, DIABETES_TYPES } from '../constants';
import { ArrowRight, BookOpen, Activity, Zap, Loader2 } from 'lucide-react';
import { fetchDataFromManagement } from '../services/difyService';
import { Article, Doctor } from '../types';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  
  // State for dynamic data
  const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES);
  const [doctors, setDoctors] = useState<Doctor[]>(MOCK_DOCTORS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadRealData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Articles
        const articlesData = await fetchDataFromManagement('查询所有科普文章');
        if (Array.isArray(articlesData) && articlesData.length > 0) {
          // Map DB columns to Frontend Types
          const mappedArticles: Article[] = articlesData.map((item: any) => ({
            id: item.article_id?.toString() || Math.random().toString(),
            title: item.title || '无标题',
            summary: item.summary || item.content?.substring(0, 50) + '...' || '',
            content: item.content || '',
            author: item.author || '未知作者',
            date: item.publish_time || new Date().toISOString().split('T')[0],
            category: item.category === 'diet' ? 'diet' : item.category === 'exercise' ? 'exercise' : 'medical', // Simple mapping
            imageUrl: item.cover_url || 'https://picsum.photos/400/200'
          }));
          setArticles(mappedArticles);
        }

        // 2. Fetch Doctors (Optional display in home? currently using logic for static list but let's log it for verification)
        // You can enable this if you have a section displaying doctors on Home
        /* 
        const doctorsData = await fetchDataFromManagement('查询所有医生信息');
        if (Array.isArray(doctorsData)) {
           // map logic...
        }
        */

      } catch (error) {
        console.error("Failed to load real data, using mocks.", error);
      } finally {
        setLoading(false);
      }
    };

    // Uncomment the line below to enable real data fetching
    // loadRealData();
    
    // Note: Since we are not sure about the exact JSON format returned by the workflow yet,
    // keeping it commented or calling it safely is better. 
    // Let's call it:
    loadRealData();

  }, []);

  return (
    <div className="space-y-8 p-4 md:pt-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">您的健康，我们守护</h2>
          <p className="text-teal-100 mb-4 text-sm max-w-[80%]">专业的糖尿病管理方案，结合健康档案与智能建议，让控糖更简单。</p>
          <button
            onClick={() => navigate('/chat')}
            className="bg-white text-teal-600 px-4 py-2 rounded-lg font-semibold text-sm shadow-sm hover:bg-teal-50 transition"
          >
            咨询智能助手
          </button>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
          <Activity size={120} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <div 
          onClick={() => navigate('/risk-assessment')}
          className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-center cursor-pointer hover:bg-orange-100 transition"
        >
          <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center mr-3 text-orange-600">
             <Zap size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">风险预测</h3>
            <p className="text-xs text-slate-500">综合指标评估风险</p>
          </div>
        </div>
        
        <div 
          onClick={() => navigate('/get-scheme')}
          className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center cursor-pointer hover:bg-blue-100 transition"
        >
           <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mr-3 text-blue-600">
             <Activity size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">方案定制</h3>
            <p className="text-xs text-slate-500">个性化生活指导</p>
          </div>
        </div>
      </div>

      {/* Diabetes Types Quick Access */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">了解糖尿病</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {DIABETES_TYPES.map((type) => (
            <div
              key={type.id}
              onClick={() => navigate(`/diabetes/${type.id}`)}
              className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition"
            >
              <div className="bg-teal-100 p-2 rounded-full mb-2 text-teal-600">
                <BookOpen size={18} />
              </div>
              <span className="text-xs font-medium text-slate-700">{type.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Articles */}
      <div>
         <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">健康科普</h3>
          {loading && <Loader2 size={16} className="animate-spin text-teal-600" />}
        </div>
        <div className="space-y-4">
          {articles.map((article) => (
            <div
              key={article.id}
              onClick={() => navigate(`/article/${article.id}`)}
              className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex gap-4 cursor-pointer hover:shadow-md transition"
            >
              <img src={article.imageUrl} alt={article.title} className="w-24 h-24 rounded-lg object-cover flex-shrink-0 bg-slate-200" />
              <div className="flex flex-col justify-between py-1 flex-1">
                <div>
                  <span className={`inline-block px-2 py-0.5 text-[10px] rounded mb-1 font-medium ${
                     article.category === 'diet' ? 'bg-green-50 text-green-600' : 
                     article.category === 'exercise' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {article.category === 'diet' ? '饮食' : article.category === 'exercise' ? '运动' : '医疗'}
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm line-clamp-2 leading-tight">{article.title}</h4>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400">{article.date}</span>
                  <span className="text-xs text-slate-400">{article.author}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
