import React, { useState } from 'react';
import { Settings, LogOut, ChevronRight, Shield, Globe, Bell, Wallet, Award, Clock, Copy, Sparkles, X, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Profile: React.FC = () => {
  const { userState, logout, showToast } = useApp();
  const [language, setLanguage] = useState('한국어');
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const handleCopyUid = () => {
    navigator.clipboard.writeText("82940192");
    showToast("UID가 복사되었습니다.");
  };

  const handleSettingClick = (setting: string) => {
    showToast(`${setting} 페이지는 준비 중입니다.`, 'info');
  };

  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    setIsLangModalOpen(false);
    showToast(`Language changed to ${lang}`, 'success');
  };

  return (
    <div className="flex flex-col min-h-screen pb-32 bg-gray-50">
      
      {/* Language Selection Modal */}
      {isLangModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">언어 선택 (Language)</h3>
                <button onClick={() => setIsLangModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => changeLanguage('한국어')}
                  className={`w-full p-4 rounded-xl flex items-center justify-between border transition-all ${language === '한국어' ? 'bg-brand-50 border-brand-500 text-brand-700 ring-1 ring-brand-500' : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🇰🇷</span>
                    <span className="font-bold">한국어</span>
                  </div>
                  {language === '한국어' && <Check size={20} className="text-brand-600" />}
                </button>
                <button 
                  onClick={() => changeLanguage('English')}
                  className={`w-full p-4 rounded-xl flex items-center justify-between border transition-all ${language === 'English' ? 'bg-brand-50 border-brand-500 text-brand-700 ring-1 ring-brand-500' : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'}`}
                >
                   <div className="flex items-center space-x-3">
                    <span className="text-2xl">🇺🇸</span>
                    <span className="font-bold">English</span>
                  </div>
                  {language === 'English' && <Check size={20} className="text-brand-600" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="relative bg-[#1a1b2e] text-white pt-10 pb-24 px-6 rounded-b-[40px] shadow-2xl overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-brand-600/20 rounded-full blur-[80px]"></div>
           <div className="absolute bottom-[-10%] left-[10%] w-60 h-60 bg-blue-500/20 rounded-full blur-[60px]"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative group cursor-pointer">
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-brand-400 to-blue-500 shadow-xl shadow-brand-500/30">
              <img src="https://picsum.photos/200/200" alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-[#1a1b2e]" />
            </div>
            <div className="absolute bottom-1 right-1 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#1a1b2e] shadow-lg">
              LV.5
            </div>
          </div>
          
          <h1 className="text-2xl font-bold mt-4 mb-1 flex items-center">
            알렉스 게이머
            <Sparkles size={16} className="text-yellow-400 ml-2" fill="currentColor" />
          </h1>
          
          <div className="flex items-center space-x-2 text-gray-400 text-xs bg-white/5 px-3 py-1 rounded-full border border-white/5">
             <span>UID: 82940192</span>
             <button onClick={handleCopyUid} className="cursor-pointer hover:text-white">
               <Copy size={10} />
             </button>
          </div>
        </div>
      </div>

      {/* 2. Stats Dashboard (Floating) */}
      <div className="px-5 -mt-16 relative z-20">
         <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-4 shadow-xl border border-white/40 grid grid-cols-3 divide-x divide-gray-100">
            <div className="flex flex-col items-center justify-center p-2">
               <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-2">
                 <Wallet size={16} />
               </div>
               <span className="text-gray-900 font-bold text-sm">{userState.balance.toLocaleString()} V</span>
               <span className="text-gray-400 text-[10px]">보유 자산</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2">
               <div className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center mb-2">
                 <Award size={16} />
               </div>
               <span className="text-gray-900 font-bold text-sm">Gold</span>
               <span className="text-gray-400 text-[10px]">현재 등급</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2">
               <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                 <Clock size={16} />
               </div>
               <span className="text-gray-900 font-bold text-sm">34일</span>
               <span className="text-gray-400 text-[10px]">함께한 시간</span>
            </div>
         </div>
      </div>

      {/* 3. Settings & Menu */}
      <div className="px-5 mt-6 space-y-6">
        
        {/* Account Settings */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">계정 설정</h3>
          
          {/* Language Setting Button (Dynamic) */}
          <button 
            onClick={() => setIsLangModalOpen(true)}
            className="w-full bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.99]"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                <Globe size={18} />
              </div>
              <span className="font-bold text-sm text-gray-700">언어 설정</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <span className="text-xs font-medium bg-gray-50 px-2 py-0.5 rounded">{language}</span>
              <ChevronRight size={16} />
            </div>
          </button>

          {[
            { icon: Bell, label: '알림 설정', value: 'ON' },
            { icon: Shield, label: '개인정보 및 보안' },
          ].map((item, i) => (
            <button 
              key={i} 
              onClick={() => handleSettingClick(item.label)}
              className="w-full bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                  <item.icon size={18} />
                </div>
                <span className="font-bold text-sm text-gray-700">{item.label}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                {item.value && <span className="text-xs font-medium bg-gray-50 px-2 py-0.5 rounded">{item.value}</span>}
                <ChevronRight size={16} />
              </div>
            </button>
          ))}
        </div>

        {/* Support */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">지원</h3>
          <button 
            onClick={() => handleSettingClick('고객센터')}
            className="w-full bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-gray-100 hover:shadow-md transition-all"
          >
             <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                  <Settings size={18} />
                </div>
                <span className="font-bold text-sm text-gray-700">고객센터 / 도움말</span>
             </div>
             <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Logout */}
        <button 
          onClick={logout}
          className="w-full py-4 rounded-2xl border border-red-100 text-red-500 font-bold text-sm bg-red-50/50 hover:bg-red-50 transition-colors flex items-center justify-center space-x-2"
        >
           <LogOut size={16} />
           <span>로그아웃</span>
        </button>

        <div className="text-center pb-8 pt-2">
           <p className="text-[10px] text-gray-300">
             VIEW App v1.0.2 (Build 20231027)<br/>
             Powered by Web3 Technology
           </p>
        </div>
      </div>

    </div>
  );
};

export default Profile;