import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Bitcoin, Trophy, Check, TrendingUp, Clock, Target, ArrowRight, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BTC_CHART_DATA, MOCK_BTC_ROUND } from '../constants';

const Reward: React.FC = () => {
  const { userState, addTransaction, claimMission } = useApp();
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("04:23:10");

  useEffect(() => {
    const timer = setInterval(() => {
      // Mock timer countdown logic
      const date = new Date();
      const h = 23 - date.getHours();
      const m = 59 - date.getMinutes();
      const s = 59 - date.getSeconds();
      setTimeLeft(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePredict = () => {
    if (!selectedRange) return;
    if (userState.balance < 2) {
      alert("VIEW가 부족합니다!");
      return;
    }
    
    addTransaction({
      type: 'BTC Game',
      amount: -2,
      description: `예측: ${selectedRange}`
    });
    alert("예측이 제출되었습니다! 행운을 빕니다.");
    setSelectedRange(null);
  };

  return (
    <div className="flex flex-col min-h-screen pb-32 bg-gray-50">
      
      {/* 1. Header & BTC Game Section */}
      <div className="relative bg-[#1a1b2e] text-white pt-10 pb-20 px-6 rounded-b-[40px] shadow-2xl overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-orange-600/20 rounded-full blur-[80px]"></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-purple-600/20 rounded-full blur-[80px]"></div>
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="px-2 py-0.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-bold uppercase tracking-wider flex items-center">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse mr-1.5"></span>
                  Live
                </span>
                <span className="text-gray-400 text-xs font-medium">Next Round in {timeLeft}</span>
              </div>
              <h1 className="text-3xl font-black">BTC Prediction</h1>
              <p className="text-gray-400 text-sm">Win up to 10,000 VIEW</p>
            </div>
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
               <Bitcoin className="text-orange-400" size={24} />
            </div>
          </div>

          {/* Chart Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-0 overflow-hidden shadow-2xl">
             <div className="p-5 pb-0 flex justify-between items-end">
               <div>
                 <p className="text-gray-400 text-xs font-medium mb-1 flex items-center">
                   <TrendingUp size={12} className="mr-1" /> BTC/USD Index
                 </p>
                 <p className="text-3xl font-bold text-white">$66,450.00</p>
               </div>
               <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs font-bold border border-green-500/20">
                 +2.4%
               </div>
             </div>
             
             <div className="h-40 w-full -ml-1 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={BTC_CHART_DATA}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#f97316" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>

      {/* 2. Prediction Controls (Overlapping) */}
      <div className="px-5 -mt-12 relative z-20">
         <div className="bg-white rounded-3xl p-5 shadow-xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
              <Target size={16} className="mr-2 text-gray-400" />
              오늘의 종가를 예측하세요
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-5">
              {MOCK_BTC_ROUND.ranges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => setSelectedRange(range.label)}
                  className={`py-6 px-3 rounded-2xl border transition-all duration-200 relative overflow-hidden group flex flex-col items-center justify-center ${
                    selectedRange === range.label 
                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30' 
                    : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700'
                  }`}
                >
                  <span className="relative z-10 text-lg font-black">{range.label}</span>
                  {selectedRange === range.label && (
                    <div className="absolute top-2 right-2">
                      <Check size={18} className="text-white/80" />
                    </div>
                  )}
                  <p className={`text-sm mt-1.5 font-bold relative z-10 ${selectedRange === range.label ? 'text-white/90' : 'text-gray-400'}`}>
                    {range.participants}명 선택
                  </p>
                </button>
              ))}
            </div>

            <button 
              disabled={!selectedRange}
              onClick={handlePredict}
              className="w-full bg-gray-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center"
            >
              <span>예측 제출하기</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] ml-2">-2 VIEW</span>
            </button>
         </div>
      </div>

      {/* 3. Missions Section */}
      <div className="px-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="text-yellow-500" size={20} fill="currentColor" />
            <h2 className="font-bold text-xl text-gray-900">데일리 퀘스트</h2>
          </div>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {userState.missions.filter(m => m.completed && !m.claimed).length}개 완료
          </span>
        </div>
        
        <div className="space-y-4">
          {userState.missions.map((mission, index) => (
            <div 
              key={mission.id} 
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="flex justify-between items-start relative z-10">
                 <div className="flex-1 mr-4">
                    <div className="flex items-center mb-1">
                       <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold mr-2 border border-brand-100">
                         {index + 1}
                       </span>
                       <h4 className="font-bold text-gray-900">{mission.title}</h4>
                    </div>
                    <p className="text-xs text-gray-500 ml-8 mb-3">{mission.description}</p>
                 </div>
                 <div className="text-right">
                    <span className="inline-block bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg text-xs font-black border border-yellow-100">
                      +{mission.reward} V
                    </span>
                 </div>
              </div>

              {/* Progress & Action Row */}
              <div className="flex items-center justify-between pl-8 relative z-10">
                 <div className="flex-1 mr-4">
                   <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                     <div 
                       className={`h-full rounded-full transition-all duration-1000 ${mission.completed ? 'bg-green-500' : 'bg-brand-500'}`}
                       style={{ width: `${(mission.progress / mission.total) * 100}%` }}
                     />
                   </div>
                   <div className="mt-1 text-[10px] text-gray-400 font-medium flex justify-between">
                     <span>진행도</span>
                     <span>{mission.progress} / {mission.total}</span>
                   </div>
                 </div>

                 <button
                    onClick={() => claimMission(mission.id)}
                    disabled={!mission.completed || mission.claimed}
                    className={`min-w-[80px] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                      mission.claimed 
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : mission.completed 
                        ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 active:scale-95' 
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {mission.claimed ? (
                      <span className="flex items-center"><Check size={14} className="mr-1" /> 완료</span>
                    ) : mission.completed ? (
                      "보상 받기"
                    ) : (
                      "진행 중"
                    )}
                  </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Reward;