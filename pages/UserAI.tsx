import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { sendDifyMessage } from '../services/difyService';
import { DIFY_APPS } from '../config';
import { useAuth } from '../contexts/AuthContext';

interface ChatMsg {
  role: 'user' | 'model';
  text: string;
}

export const UserAI: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'model', text: '你好！我是你的糖尿病健康助手。你可以问我关于饮食、运动或糖尿病知识的问题。' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(''); // 保存会话ID以维持上下文
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      // 1. 处理 userId: 必须是数字，且不能为 NaN (防止 JSON 序列化为 null 导致 "is required" 错误)
      let numericUserId = parseInt(user?.id || '1', 10);
      if (isNaN(numericUserId)) {
        numericUserId = 1;
      }

      // 2. 获取用户档案 (使用 any 绕过潜在的 TS 类型检查，确保取值不报错)
      const p = (user?.profile || {}) as any;

      // 3. 准备 API 输入参数
      // 修复：添加后端必填的 familyHistory，并确保 userId 是有效数字
      const inputs = {
        userId: numericUserId,
        sex: p.sex || '男',
        age: String(p.age || 0),
        height: String(p.height || 0),
        weight: String(p.weight || 0),
        disease: p.disease || '否',
        familyHistory: p.familyHistory || '无' // 补充必填项
      };

      const response = await sendDifyMessage(
        DIFY_APPS.SMART_ASSISTANT,
        userText,
        inputs,
        user?.id || 'guest',
        conversationId
      );

      setMessages(prev => [...prev, { role: 'model', text: response.text }]);
      setConversationId(response.conversationId); // 更新会话ID

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "抱歉，连接服务器时出现问题，请检查网络或后端状态。" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mx-2 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-teal-100 text-teal-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-teal-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="flex items-center ml-12 bg-white border border-slate-100 px-4 py-2 rounded-2xl rounded-tl-none shadow-sm">
                <Loader2 size={16} className="animate-spin text-teal-600 mr-2" />
                <span className="text-xs text-slate-500">正在思考...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="询问关于饮食、运动或血糖的问题..."
            className="w-full bg-slate-100 text-slate-800 rounded-xl py-3 pl-4 pr-12 outline-none focus:ring-2 focus:ring-teal-100 transition"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-2 bg-teal-600 text-white p-1.5 rounded-lg disabled:opacity-50 hover:bg-teal-700 transition"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
