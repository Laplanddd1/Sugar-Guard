import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Chat } from './pages/Chat';
import { Scheme } from './pages/Scheme';
import { GetScheme } from './pages/GetScheme';
import { LifeAdvice } from './pages/LifeAdvice';
import { UserAI } from './pages/UserAI';
import { Mine } from './pages/Mine';
import { ArticleDetail } from './pages/ArticleDetail';
import { DiabetesDetail } from './pages/DiabetesDetail';
import { RiskAssessment } from './pages/RiskAssessment';
import { CheckinReport } from './pages/CheckinReport';
import { Trends } from './pages/Trends';
import { Reminders } from './pages/Reminders';
import { useAuth } from './contexts/AuthContext';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/mine" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="chat" element={<Chat />} />
            <Route path="scheme" element={<RequireAuth><Scheme /></RequireAuth>} />
            <Route path="get-scheme" element={<RequireAuth><GetScheme /></RequireAuth>} />
            <Route path="risk-assessment" element={<RequireAuth><RiskAssessment /></RequireAuth>} />
            <Route path="ai-assistant" element={<RequireAuth><UserAI /></RequireAuth>} />
            <Route path="life-advice" element={<RequireAuth><LifeAdvice /></RequireAuth>} />
            <Route path="life-advice/:id" element={<div className="p-8 text-center text-slate-500">建议详情内容开发中...</div>} />
            <Route path="checkin-report" element={<RequireAuth><CheckinReport /></RequireAuth>} />
            <Route path="trends" element={<RequireAuth><Trends /></RequireAuth>} />
            <Route path="reminders" element={<RequireAuth><Reminders /></RequireAuth>} />
            <Route path="mine" element={<Mine />} />
            <Route path="article/:id" element={<ArticleDetail />} />
            <Route path="diabetes/:id" element={<DiabetesDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
