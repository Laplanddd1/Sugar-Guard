import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_ARTICLES } from '../constants';
import { ArrowLeft, User, Calendar } from 'lucide-react';

export const ArticleDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const article = MOCK_ARTICLES.find(a => a.id === id);

  if (!article) {
    return <div className="p-8 text-center text-slate-500">文章未找到</div>;
  }

  return (
    <div className="bg-white min-h-screen pb-10">
      <div className="relative h-60">
        <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-white/80 p-2 rounded-full backdrop-blur-sm text-slate-800 shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
      </div>
      <div className="p-5 -mt-6 bg-white rounded-t-3xl relative">
        <h1 className="text-2xl font-bold text-slate-900 mb-4 leading-tight">{article.title}</h1>

        <div className="flex items-center text-xs text-slate-500 space-x-4 mb-6 pb-6 border-b border-slate-100">
          <div className="flex items-center">
            <User size={14} className="mr-1" />
            {article.author}
          </div>
          <div className="flex items-center">
            <Calendar size={14} className="mr-1" />
            {article.date}
          </div>
        </div>

        <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed space-y-4">
           <p className="font-medium text-slate-800">{article.summary}</p>
           <p>{article.content}</p>
        </div>
      </div>
    </div>
  );
};
