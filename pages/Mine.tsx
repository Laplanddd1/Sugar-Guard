import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types';
import { LogOut, Save, User as UserIcon, Shield, Lock, Eye, EyeOff, UserPlus, Activity } from 'lucide-react';

export const Mine: React.FC = () => {
  const { user, login, register, logout, updateProfile } = useAuth();
  
  // Login/Register Form State
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile>({
    age: 0, sex: '男', height: 0, weight: 0, familyHistory: '', disease: '否', waistline: 0, systolicPressure: 0, isPregnancy: '否'
  });

  useEffect(() => {
    if (user && user.profile) {
      setProfileData(user.profile);
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }

    if (isLoginMode) {
      const success = login(username, password);
      if (!success) setError('用户名或密码错误');
    } else {
      const success = register(username, password);
      if (!success) setError('用户名已存在');
    }
  };

  const handleSaveProfile = () => {
    updateProfile(profileData);
    setIsEditing(false);
    alert('个人健康档案已更新，AI助手将基于新数据为您服务。');
  };

  // Logged In View
  if (user) {
    return (
      <div className="p-4 md:p-8 animate-fadeIn pb-24">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-6 rounded-2xl shadow-lg mb-6 text-white flex items-center">
          <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover mr-4 border-2 border-white/50" />
          <div className="flex-1">
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-teal-100 text-sm">ID: {user.id}</p>
          </div>
          <button onClick={logout} className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition">
            <LogOut size={20} />
          </button>
        </div>

        {/* Health Profile Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center text-slate-700 font-bold">
              <Activity className="mr-2 text-teal-600" size={20} />
              健康档案 (AI分析必填)
            </div>
            <button 
              onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
              className={`text-sm px-3 py-1 rounded-full font-medium transition ${isEditing ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-600'}`}
            >
              {isEditing ? <span className="flex items-center"><Save size={14} className="mr-1"/> 保存</span> : '编辑'}
            </button>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Age */}
             <div>
               <label className="text-xs text-slate-400 block mb-1">年龄</label>
               <input 
                 type="number" 
                 disabled={!isEditing}
                 value={profileData.age}
                 onChange={e => setProfileData({...profileData, age: Number(e.target.value)})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm disabled:opacity-70 disabled:bg-slate-100"
               />
             </div>
             {/* Sex */}
             <div>
               <label className="text-xs text-slate-400 block mb-1">性别</label>
               <select 
                 disabled={!isEditing}
                 value={profileData.sex}
                 onChange={e => setProfileData({...profileData, sex: e.target.value})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm disabled:opacity-70 disabled:bg-slate-100"
               >
                 <option value="男">男</option>
                 <option value="女">女</option>
               </select>
             </div>
             {/* Height */}
             <div>
               <label className="text-xs text-slate-400 block mb-1">身高 (cm)</label>
               <input 
                 type="number" 
                 disabled={!isEditing}
                 value={profileData.height}
                 onChange={e => setProfileData({...profileData, height: Number(e.target.value)})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm disabled:opacity-70 disabled:bg-slate-100"
               />
             </div>
             {/* Weight */}
             <div>
               <label className="text-xs text-slate-400 block mb-1">体重 (kg)</label>
               <input 
                 type="number" 
                 disabled={!isEditing}
                 value={profileData.weight}
                 onChange={e => setProfileData({...profileData, weight: Number(e.target.value)})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm disabled:opacity-70 disabled:bg-slate-100"
               />
             </div>
             {/* Waistline */}
             <div>
               <label className="text-xs text-slate-400 block mb-1">腰围 (cm)</label>
               <input 
                 type="number" 
                 disabled={!isEditing}
                 value={profileData.waistline || ''}
                 onChange={e => setProfileData({...profileData, waistline: Number(e.target.value)})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm disabled:opacity-70 disabled:bg-slate-100"
               />
             </div>
             {/* Systolic Pressure */}
             <div>
               <label className="text-xs text-slate-400 block mb-1">收缩压 (mmHg)</label>
               <input 
                 type="number" 
                 disabled={!isEditing}
                 value={profileData.systolicPressure || ''}
                 onChange={e => setProfileData({...profileData, systolicPressure: Number(e.target.value)})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm disabled:opacity-70 disabled:bg-slate-100"
               />
             </div>
             {/* Disease Status */}
             <div>
               <label className="text-xs text-slate-400 block mb-1">是否已确诊糖尿病</label>
               <select 
                 disabled={!isEditing}
                 value={profileData.disease}
                 onChange={e => setProfileData({...profileData, disease: e.target.value})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm disabled:opacity-70 disabled:bg-slate-100"
               >
                 <option value="否">否 (仅预测风险)</option>
                 <option value="是">是</option>
               </select>
             </div>
             {/* Family History */}
             <div className="md:col-span-2">
               <label className="text-xs text-slate-400 block mb-1">家族病史</label>
               <input 
                 type="text" 
                 disabled={!isEditing}
                 value={profileData.familyHistory}
                 onChange={e => setProfileData({...profileData, familyHistory: e.target.value})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm disabled:opacity-70 disabled:bg-slate-100"
                 placeholder="例如：父亲患有2型糖尿病"
               />
             </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">请务必填写真实信息，这将直接影响AI分析的准确性。</p>
      </div>
    );
  }

  // Not Logged In View (Login/Register Form)
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 md:p-8">
       <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full max-w-sm">
         <div className="flex justify-center mb-6">
            <div className="bg-teal-100 p-4 rounded-full">
                <Shield className="w-10 h-10 text-teal-600" />
            </div>
         </div>
         
         <h2 className="text-2xl font-bold text-slate-800 text-center mb-1">
           {isLoginMode ? '欢迎回来' : '创建账号'}
         </h2>
         <p className="text-slate-400 text-sm text-center mb-6">
           {isLoginMode ? '请登录以继续使用 SugarGuard' : '注册以开启您的健康管理之旅'}
         </p>

         <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
               <UserIcon className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
               <input 
                 type="text" 
                 placeholder="用户名"
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 transition"
               />
            </div>
            <div className="relative">
               <Lock className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
               <input 
                 type={showPassword ? "text" : "password"} 
                 placeholder="密码"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 transition"
               />
               <button 
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
               >
                 {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
               </button>
            </div>
            {error && <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</div>}
            <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-teal-700 transition flex items-center justify-center">
              {isLoginMode ? '登录' : '立即注册'} {!isLoginMode && <UserPlus size={18} className="ml-2" />}
            </button>
         </form>

         <div className="mt-6 text-center">
            <button onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }} className="text-sm text-slate-500 hover:text-teal-600 transition">
              {isLoginMode ? '还没有账号？ 去注册' : '已有账号？ 去登录'}
            </button>
         </div>
       </div>
    </div>
  );
};