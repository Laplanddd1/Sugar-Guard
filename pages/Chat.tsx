import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Message } from '../types';
import { Send, Loader2, Info, Stethoscope, User, ChevronRight } from 'lucide-react';
import { sendDifyMessage } from '../services/difyService'; 
import { DIFY_APPS } from '../config';
import { useNavigate } from 'react-router-dom';

// 定义医生类型
interface AIDoctor {
  id: string;
  name: string;
  title: string;
  department: string;
  description: string;
  app: string;
  avatarColor: string;
}

// 医生数据配置
const DOCTORS: AIDoctor[] = [
  {
    id: 'zhao',
    name: '赵晓峰',
    department: '内分泌科',
    title: '主任医师',
    description: '25年临床经验，擅长糖尿病综合治疗与并发症控制。',
    app: DIFY_APPS.DOCTOR_ZHAO,
    avatarColor: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'li',
    name: '李雅琴',
    department: '内分泌科',
    title: '副主任医师',
    description: '专注药物治疗与饮食管理，知识体系新颖。',
    app: DIFY_APPS.DOCTOR_LI,
    avatarColor: 'bg-rose-100 text-rose-600'
  },
  {
    id: 'zhang',
    name: '张伟',
    department: '内分泌科',
    title: '主治医师',
    description: '耐心细致，擅长解答日常护理与基础病情疑问。',
    app: DIFY_APPS.DOCTOR_ZHANG,
    avatarColor: 'bg-emerald-100 text-emerald-600'
  }
];

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 当前选中的医生 ID
  const [currentDoctorId, setCurrentDoctorId] = useState<string>(DOCTORS[0].id);
  
  // 聊天输入框
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // 多会话历史记录: { [doctorId]: Message[] }
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>({
    zhao: [{ id: 'init-zhao', senderId: 'ai-zhao', receiverId: 'user', text: '您好，我是赵晓峰主任。请把您的检查单或者症状告诉我，我来为您分析。', timestamp: Date.now(), isSelf: false }],
    li: [{ id: 'init-li', senderId: 'ai-li', receiverId: 'user', text: '您好，我是李雅琴医生。关于饮食控制和药物使用方面的问题，可以随时问我。', timestamp: Date.now(), isSelf: false }],
    zhang: [{ id: 'init-zhang', senderId: 'ai-zhang', receiverId: 'user', text: '你好，我是张伟医生。身体哪里不舒服？别担心，慢慢说。', timestamp: Date.now(), isSelf: false }]
  });

  // 多会话 Conversation ID (用于维持 Dify 上下文): { [doctorId]: string }
  const [difyConversationIds, setDifyConversationIds] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取当前医生对象
  const currentDoctor = DOCTORS.find(d => d.id === currentDoctorId) || DOCTORS[0];
  // 获取当前医生的消息列表
  const currentMessages = chatHistories[currentDoctorId] || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, currentDoctorId]);

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;

    if (!user.profile || user.profile.age === 0) {
       alert("为了医生能准确诊断，请先完善您的健康档案。");
       navigate('/mine');
       return;
    }

    // 1. 添加用户消息
    const userMsg: Message = {
      id: Date.now().toString(),
      senderId: user.id,
      receiverId: `ai-${currentDoctorId}`,
      text: input,
      timestamp: Date.now(),
      isSelf: true
    };
    
    // 更新对应医生的聊天记录
    setChatHistories(prev => ({
      ...prev,
      [currentDoctorId]: [...(prev[currentDoctorId] || []), userMsg]
    }));

    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      // 2. 准备参数
      // 关键修正：
      // (1) 医生 Agent 要求 userId 为 Number (根据 "must be a valid number" 报错)
      // (2) 必须防止 NaN，否则 JSON 序列化为 null，会导致 "userId is required" 报错
      let numericUserId = parseInt(user.id || '0', 10);
      if (isNaN(numericUserId)) {
         numericUserId = 48; // 使用默认有效 ID
      }

      const inputs = {
        userId: numericUserId,
        
        // 其他身体指标维持为字符串 (String)
        age: String(user.profile.age),
        sex: user.profile.sex,
        height: String(user.profile.height),
        weight: String(user.profile.weight),
        familyHistory: user.profile.familyHistory,
        waistline: String(user.profile.waistline || 0),
        systolicPressure: String(user.profile.systolicPressure || 0),
        isPregnancy: user.profile.isPregnancy || '否',
        disease: user.profile.disease
      };

      // 3. 调用 Dify API (使用医生应用标识，由后端持有真实 Key)
      const response = await sendDifyMessage(
        currentDoctor.app,
        currentInput,
        inputs,
        user.id,
        difyConversationIds[currentDoctorId] || '' // 传入当前医生对应的会话ID
      );

      // 4. 更新会话ID
      if (response.conversationId) {
        setDifyConversationIds(prev => ({
          ...prev,
          [currentDoctorId]: response.conversationId
        }));
      }

      // 5. 添加 AI 回复
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        senderId: `ai-${currentDoctorId}`,
        receiverId: user.id,
        text: response.text,
        timestamp: Date.now(),
        isSelf: false
      };
      
      setChatHistories(prev => ({
        ...prev,
        [currentDoctorId]: [...(prev[currentDoctorId] || []), aiMsg]
      }));

    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        senderId: 'system',
        receiverId: user.id,
        text: '连接医生服务失败，请检查网络或稍后再试。',
        timestamp: Date.now(),
        isSelf: false
      };
      setChatHistories(prev => ({
        ...prev,
        [currentDoctorId]: [...(prev[currentDoctorId] || []), errorMsg]
      }));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-10 text-center text-slate-500">请先登录以咨询医生。</div>;
  }

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] overflow-hidden">
      
      {/* 侧边栏/顶部栏 (医生列表) */}
      <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-row md:flex-col flex-shrink-0 overflow-x-auto md:overflow-y-auto scrollbar-hide">
        <div className="p-3 md:p-4 font-bold text-slate-700 hidden md:block border-b border-slate-100 mb-2">
          在线专家团队
        </div>
        
        {DOCTORS.map(doc => (
          <button
            key={doc.id}
            onClick={() => setCurrentDoctorId(doc.id)}
            className={`flex items-center p-3 md:px-4 md:py-3 min-w-[160px] md:min-w-0 transition text-left ${
              currentDoctorId === doc.id 
                ? 'bg-teal-50 border-b-2 md:border-b-0 md:border-r-2 border-teal-500' 
                : 'hover:bg-slate-50 border-b md:border-b-0 border-transparent'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${doc.avatarColor}`}>
              <User size={20} />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center">
                <h3 className={`font-bold text-sm truncate ${currentDoctorId === doc.id ? 'text-teal-900' : 'text-slate-700'}`}>
                  {doc.name}
                </h3>
                <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded">
                  {doc.title.replace('医师', '')}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {doc.department}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* 聊天主区域 */}
      <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
        
        {/* 顶部信息栏 */}
        <div className="bg-white p-3 border-b border-slate-100 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${currentDoctor.avatarColor}`}>
               <Stethoscope size={16} />
             </div>
             <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center">
                  {currentDoctor.name} 
                  <span className="text-xs font-normal text-slate-500 ml-2">| {currentDoctor.title}</span>
                </h3>
                <p className="text-[10px] text-slate-400 truncate max-w-[200px] md:max-w-md">
                  {currentDoctor.description}
                </p>
             </div>
          </div>
          <button onClick={() => navigate('/mine')} className="text-slate-400 hover:text-teal-600 ml-2" title="我的档案">
             <Info size={18} />
          </button>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}>
               {!msg.isSelf && (
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 self-start mt-1 flex-shrink-0 ${currentDoctor.avatarColor}`}>
                   <Stethoscope size={14} />
                 </div>
               )}
               <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                 msg.isSelf 
                  ? 'bg-teal-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
               }`}>
                 {msg.text}
               </div>
            </div>
          ))}
          {loading && (
             <div className="flex justify-start animate-fadeIn">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 self-start mt-1 ${currentDoctor.avatarColor}`}>
                   <Loader2 size={14} className="animate-spin" />
               </div>
               <div className="bg-white border border-slate-100 px-4 py-2 rounded-2xl rounded-tl-none shadow-sm flex items-center">
                  <span className="text-xs text-slate-500">对方正在输入...</span>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div className="p-3 bg-white border-t border-slate-100 flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`向${currentDoctor.name}医生提问...`}
              className="w-full bg-slate-100 text-slate-800 rounded-xl py-3 pl-4 pr-12 outline-none focus:ring-2 focus:ring-teal-100 transition text-sm"
              disabled={loading}
            />
            <button 
              onClick={handleSend} 
              disabled={loading || !input.trim()}
              className="absolute right-2 top-2 text-teal-600 p-1.5 hover:bg-teal-50 rounded-lg transition disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
