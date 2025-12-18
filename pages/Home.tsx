import React, { useState } from 'react';
import { Bell, ChevronRight, Share2, Ticket, Zap, Wallet, ArrowUpRight, PlayCircle, TrendingUp, Sparkles, Plus, X, Lock, Unlock } from 'lucide-react';
import { useApp, getCurrentTier, STAKING_TIERS } from '../context/AppContext';
import { Tab } from '../types';

const StakingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { userState, stake, unstake } = useApp();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake');

  const currentTier = getCurrentTier(userState.staked);
  const nextTier = [...STAKING_TIERS].find(t => t.threshold > userState.staked);

  const handleAction = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    if (mode === 'stake') stake(val);
    else unstake(val);

    setAmount('');
  };

  const setMax = () => {
    if (mode === 'stake') setAmount(userState.balance.toString());
    else setAmount(userState.staked.toString());
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow only numbers and decimal point
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmount(val);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm md:max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="relative bg-[#1a1b2e] text-white p-6 pb-8">
          <div className="absolute top-0 right-0 p-4">
            <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-white/20 text-white border border-white/10`}>
              {currentTier.label} 등급
            </div>
            <span className="text-xs text-brand-300 font-medium">{currentTier.multiplier}x 광고 적립</span>
          </div>
          <h2 className="text-3xl font-black">
            {userState.staked.toLocaleString()} <span className="text-sm font-medium text-gray-400">VIEW 스테이킹됨</span>
          </h2>

          {/* Progress to next tier */}
          {nextTier && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>다음 등급: {nextTier.label} ({nextTier.multiplier}x)</span>
                <span>{nextTier.threshold - userState.staked} VIEW 남음</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-400 to-brand-300 transition-all duration-500"
                  style={{ width: `${Math.min(100, (userState.staked / nextTier.threshold) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('stake'); setAmount(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center space-x-1.5 transition-all ${mode === 'stake' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              <Lock size={14} /> <span>예치 (Stake)</span>
            </button>
            <button
              onClick={() => { setMode('unstake'); setAmount(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center space-x-1.5 transition-all ${mode === 'unstake' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              <Unlock size={14} /> <span>출금 (Unstake)</span>
            </button>
          </div>

          <div className="mb-2 flex justify-between text-xs font-medium text-gray-500">
            <span>수량 입력</span>
            <span>가능: {mode === 'stake' ? userState.balance.toLocaleString() : userState.staked.toLocaleString()} VIEW</span>
          </div>

          <div className="relative mb-6">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className="w-full text-2xl font-bold p-4 pr-20 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
            <button
              onClick={setMax}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition-colors z-10"
            >
              최대
            </button>
          </div>

          <button
            onClick={handleAction}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-[0.98] transition-all flex items-center justify-center space-x-2 ${mode === 'stake' ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/30' : 'bg-gray-800 hover:bg-gray-900 shadow-gray-500/30'
              }`}
          >
            {mode === 'stake' ? <Lock size={18} /> : <Unlock size={18} />}
            <span>{mode === 'stake' ? 'VIEW 예치하기' : 'VIEW 출금하기'}</span>
          </button>

          <p className="text-center text-[10px] text-gray-400 mt-4 leading-relaxed">
            스테이킹된 VIEW는 언제든지 언스테이킹 할 수 있습니다.<br />
            등급에 따라 광고 시청 보상이 증가합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

const Home: React.FC = () => {
  const { userState, setActiveTab, inviteFriend, showToast } = useApp();
  const [showStaking, setShowStaking] = useState(false);

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen pb-32">
      {/* Responsive Container */}
      <div className="w-full max-w-4xl mx-auto">

        {showStaking && <StakingModal onClose={() => setShowStaking(false)} />}

        {/* 1. Hero / Wallet Section (Dark Theme) */}
        <div className="relative bg-[#1a1b2e] text-white pt-8 pb-10 px-6 rounded-b-[40px] shadow-2xl overflow-hidden">
          {/* Abstract Background Shapes */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-600/30 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-600/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4"></div>

          {/* Header Top Row */}
          <div className="relative z-10 flex justify-between items-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 p-0.5">
                <img src={userState.photoURL || "https://picsum.photos/100/100"} alt="Profile" className="w-full h-full rounded-full object-cover border-2 border-[#1a1b2e]" />
              </div>
              <div>
                <p className="text-gray-400 text-xs font-medium">환영합니다,</p>
                <h2 className="text-white font-bold text-lg leading-none">{userState.displayName || '게스트'}님</h2>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => showToast('새로운 알림이 없습니다.', 'info')}
                className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              >
                <Bell className="text-white" size={20} />
              </button>
              <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1a1b2e]"></div>
            </div>
          </div>

          {/* Glassmorphic Wallet Card */}
          <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>

            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-gray-300 text-xs font-medium mb-1 flex items-center">
                  <Wallet size={12} className="mr-1.5" /> 나의 자산
                </p>
                <h1 className="text-4xl font-black text-white tracking-tight flex items-baseline">
                  {userState.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  <span className="text-lg text-brand-300 font-medium ml-1.5">VIEW</span>
                </h1>
                <p className="text-green-400 text-xs font-medium mt-1 flex items-center">
                  <ArrowUpRight size={12} className="mr-1" />
                  오늘 +{userState.todayEarnings} VIEW 획득
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowStaking(true)}
                className="bg-white text-brand-900 rounded-xl py-3 px-4 flex items-center justify-center font-bold text-sm shadow-lg active:scale-95 transition-transform"
              >
                <Lock size={16} className="mr-2" /> 스테이킹
              </button>
              <button
                onClick={inviteFriend}
                className="bg-white/10 text-white border border-white/20 rounded-xl py-3 px-4 flex items-center justify-center font-bold text-sm hover:bg-white/20 active:scale-95 transition-all"
              >
                <Share2 size={16} className="mr-2" /> 친구초대
              </button>
            </div>
          </div>

          {/* Mini Stats Floating Below Card - Increased Font Sizes */}
          <div className="flex justify-between px-6 mt-6 text-center relative z-10">
            <div onClick={() => setShowStaking(true)} className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity flex-1">
              <span className="text-gray-400 text-xs font-medium mb-1">스테이킹</span>
              <span className="text-white font-bold text-xl tracking-tight">{userState.staked.toLocaleString()}</span>
            </div>
            <div className="w-px h-10 bg-white/10 self-center"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-gray-400 text-xs font-medium mb-1">지급 대기</span>
              <span className="text-white font-bold text-xl tracking-tight">{userState.pending.toFixed(1)}</span>
            </div>
            <div className="w-px h-10 bg-white/10 self-center"></div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-gray-400 text-xs font-medium mb-1">초대 수</span>
              <span className="text-white font-bold text-xl tracking-tight">{userState.invited}명</span>
            </div>
          </div>
        </div>

        {/* 2. Main Action Grid (Bento Box Style) */}
        <div className="px-5 -mt-6 relative z-20 space-y-3">

          {/* Ad Card (Full Width) */}
          <button
            onClick={() => setActiveTab(Tab.Ad)}
            className="w-full relative h-40 md:h-48 rounded-[32px] overflow-hidden shadow-2xl shadow-brand-500/40 active:scale-[0.98] transition-all duration-300 group ring-4 ring-transparent hover:ring-brand-500/20"
          >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9]"></div>

            {/* Decorative circles */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-brand-400/20 rounded-full blur-2xl"></div>

            <div className="absolute inset-0 p-6 flex items-center justify-between z-10">
              <div className="flex flex-col items-start justify-center h-full space-y-3">
                <div className="bg-white/20 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center shadow-lg">
                  <Sparkles size={10} className="mr-1 text-yellow-300 fill-yellow-300" />
                  추천
                </div>
                <div className="text-left">
                  <h3 className="text-3xl font-black text-white mb-2 tracking-tight drop-shadow-md">광고 보고 적립</h3>
                  <div className="bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 inline-flex items-center">
                    <span className="text-brand-100 text-sm font-bold">최대 {5 * getCurrentTier(userState.staked).multiplier} VIEW / 회</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                {/* Pulsing rings */}
                <div className="absolute inset-0 bg-white/30 rounded-full animate-ping opacity-75"></div>
                <div className="absolute -inset-2 bg-white/10 rounded-full animate-pulse"></div>

                <div className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.4)] group-hover:scale-110 transition-transform duration-300 group-active:scale-95">
                  <PlayCircle size={32} className="text-brand-600 fill-brand-600 ml-1" />
                </div>
              </div>
            </div>

            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none transform translate-x-full group-hover:translate-x-[-100%]"></div>
          </button>

          {/* Secondary Cards Grid (2 columns) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Jackpot Card */}
            <button
              onClick={() => setActiveTab(Tab.Jackpot)}
              className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all active:scale-[0.98] flex flex-col justify-between h-36 md:h-40"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600 group-hover:rotate-12 transition-transform">
                  <Ticket size={20} fill="currentColor" className="text-yellow-500" />
                </div>
                <div className="bg-gray-50 px-2 py-0.5 rounded text-[9px] font-bold text-gray-400">이번주</div>
              </div>
              <div className="text-left mt-2">
                <h4 className="font-bold text-gray-900 text-lg leading-tight mb-0.5">VIEW 잭팟</h4>
                <p className="text-gray-400 text-xs">150만 VIEW 상금</p>
              </div>
            </button>

            {/* Crypto Game Card */}
            <button
              onClick={() => setActiveTab(Tab.Reward)}
              className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all active:scale-[0.98] flex flex-col justify-between h-36 md:h-40"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:rotate-12 transition-transform">
                  <TrendingUp size={20} />
                </div>
                <div className="bg-red-50 text-red-500 px-2 py-0.5 rounded text-[9px] font-bold flex items-center">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1 animate-pulse"></span>LIVE
                </div>
              </div>
              <div className="text-left mt-2">
                <h4 className="font-bold text-gray-900 text-lg leading-tight mb-0.5">BTC 예측</h4>
                <p className="text-gray-400 text-xs">시세 맞추고 보상</p>
              </div>
            </button>
          </div>

        </div>

        {/* 3. Featured Campaigns (Horizontal Scroll) */}
        <div className="mt-8">
          <div className="flex items-center justify-between px-6 mb-3">
            <h3 className="text-gray-900 font-bold text-lg flex items-center">
              <Sparkles size={16} className="text-yellow-500 mr-1.5" />
              이벤트
            </h3>
            <button onClick={() => showToast('준비 중인 기능입니다.', 'info')} className="text-xs text-gray-400 hover:text-brand-600">
              전체보기
            </button>
          </div>

          <div className="flex overflow-x-auto no-scrollbar px-5 pb-4 space-x-3 snap-x md:grid md:grid-cols-3 md:gap-4 md:space-x-0">
            {[
              { title: '더블 적립 타임', desc: '오늘 오후 8시, 보상 2배!', color: 'from-purple-500 to-indigo-600', img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=500&q=80' },
              { title: '친구 초대 대항전', desc: '총 상금 50,000 VIEW', color: 'from-blue-400 to-cyan-500', img: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=500&q=80' },
              { title: '신규 가입 혜택', desc: '웰컴 보너스 100 VIEW', color: 'from-pink-500 to-rose-500', img: 'https://images.unsplash.com/photo-1512358958014-b651a7ee1773?auto=format&fit=crop&w=500&q=80' },
            ].map((item, i) => (
              <button key={i} onClick={() => showToast('이벤트 상세페이지 준비 중입니다.')} className="min-w-[260px] h-36 rounded-2xl relative overflow-hidden snap-center group shadow-md text-left">
                <img src={item.img} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h4 className="text-white font-bold text-lg">{item.title}</h4>
                  <p className="text-white/80 text-xs mt-0.5">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Menu List */}
        <div className="px-5 mt-2 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {[
              { label: '미션 센터', icon: Zap, color: 'text-yellow-500', onClick: () => setActiveTab(Tab.Reward) },
              { label: 'VIEW 스테이킹', icon: Wallet, color: 'text-brand-500', onClick: () => setShowStaking(true) },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.onClick}
                className={`w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${i === 0 ? 'border-b border-gray-50' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gray-50 ${item.color}`}>
                    <item.icon size={18} />
                  </div>
                  <span className="font-bold text-sm text-gray-700">{item.label}</span>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </button>
            ))}
          </div>
        </div>

      </div>{/* End Responsive Container */}
    </div>
  );
};

export default Home;