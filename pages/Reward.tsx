import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Bitcoin, Trophy, Check, TrendingUp, Clock, Target, ArrowRight, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Custom Ethereum Icon Component
const EthereumIcon = ({ size = 24, className = "" }: { size?: number | string, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 2L5 13L12 17L19 13L12 2Z" />
    <path d="M12 22L5 13L12 17L19 13L12 22Z" />
  </svg>
);

const TIME_RANGES = [
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '12H', value: '12h' },
  { label: '1D', value: '1d' },
  { label: '7D', value: '7d' },
];

type CoinType = 'bitcoin' | 'ethereum';

const Reward: React.FC = () => {
  const { userState, addTransaction, claimMission } = useApp();
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("04:23:10");
  
  // State
  const [activeCoin, setActiveCoin] = useState<CoinType>('bitcoin');
  const [activeTimeRange, setActiveTimeRange] = useState('1d');
  const [chartData, setChartData] = useState<{time: string, price: number}[]>([]);
  const [percentChange, setPercentChange] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(66450);
  const [isLoading, setIsLoading] = useState(false);

  // Configuration map for coins
  const coinConfig = {
    bitcoin: {
      id: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      icon: Bitcoin,
      themeColor: 'orange',
      textColor: 'text-orange-500',
      bgColor: 'bg-orange-500',
      borderColor: 'border-orange-500',
      shadowColor: 'shadow-orange-500/30',
      lightBg: 'bg-orange-50',
      hoverLight: 'hover:bg-orange-50',
      gradientStop: '#f97316',
      blurColor: 'bg-orange-600/20'
    },
    ethereum: {
      id: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      icon: EthereumIcon,
      themeColor: 'indigo',
      textColor: 'text-indigo-500',
      bgColor: 'bg-indigo-500',
      borderColor: 'border-indigo-500',
      shadowColor: 'shadow-indigo-500/30',
      lightBg: 'bg-indigo-50',
      hoverLight: 'hover:bg-indigo-50',
      gradientStop: '#6366f1',
      blurColor: 'bg-indigo-600/20'
    }
  };

  const currentConfig = coinConfig[activeCoin];

  // Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const date = new Date();
      const h = 23 - date.getHours();
      const m = 59 - date.getMinutes();
      const s = 59 - date.getSeconds();
      setTimeLeft(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Live Data
  useEffect(() => {
    let isMounted = true;
    
    const fetchMarketData = async () => {
      setIsLoading(true);
      try {
        // CoinGecko API params
        // For 1h, 4h, 12h, 1d we can use '1' day and filter
        // For 7d we use '7'
        let days = '1';
        if (activeTimeRange === '7d') days = '7';

        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${currentConfig.id}/market_chart?vs_currency=usd&days=${days}`);
        
        if (!response.ok) {
           throw new Error(`Rate limit or error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!isMounted) return;

        if (!data.prices || !Array.isArray(data.prices)) {
             throw new Error("Invalid data format");
        }

        let prices: [number, number][] = data.prices;

        // Filter for specific time ranges if days=1
        const now = Date.now();
        let cutoff = 0;
        if (activeTimeRange === '1h') cutoff = now - 60 * 60 * 1000;
        else if (activeTimeRange === '4h') cutoff = now - 4 * 60 * 60 * 1000;
        else if (activeTimeRange === '12h') cutoff = now - 12 * 60 * 60 * 1000;
        else if (activeTimeRange === '1d') cutoff = now - 24 * 60 * 60 * 1000;
        else if (activeTimeRange === '7d') cutoff = now - 7 * 24 * 60 * 60 * 1000;

        const filteredPrices = prices.filter(p => p[0] >= cutoff);
        
        // Format for Chart
        const formattedData = filteredPrices.map(([timestamp, price]) => {
           const date = new Date(timestamp);
           let label = '';
           
           if (activeTimeRange === '7d') {
               label = `${date.getMonth()+1}/${date.getDate()}`;
           } else if (activeTimeRange === '1d' || activeTimeRange === '12h') {
               label = `${date.getHours()}시`;
           } else {
               label = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
           }
           return { time: label, price };
        });

        // Calculate Stats
        if (formattedData.length > 0) {
           const startPrice = formattedData[0].price;
           const endPrice = formattedData[formattedData.length - 1].price;
           const change = ((endPrice - startPrice) / startPrice) * 100;
           
           setChartData(formattedData);
           setCurrentPrice(endPrice);
           setPercentChange(parseFloat(change.toFixed(2)));
        }

      } catch (error) {
        console.warn("Using mock data due to API error:", error);
        if (isMounted) generateMockData();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const generateMockData = () => {
      const points = 24;
      const data = [];
      const now = new Date();
      // Approximate fallback base prices if API fails
      const basePrice = activeCoin === 'bitcoin' ? 66450 : 3520; 
      
      let volatility = 0;
      let timeStepMinutes = 0;
      let trendBias = 0;
      const volatilityScale = activeCoin === 'bitcoin' ? 1 : 0.05;

      switch (activeTimeRange) {
        case '1h': volatility = 20 * volatilityScale; timeStepMinutes = 2.5; trendBias = 5 * volatilityScale; break;
        case '4h': volatility = 80 * volatilityScale; timeStepMinutes = 10; trendBias = 10 * volatilityScale; break;
        case '12h': volatility = 150 * volatilityScale; timeStepMinutes = 30; trendBias = -5 * volatilityScale; break;
        case '1d': volatility = 300 * volatilityScale; timeStepMinutes = 60; trendBias = 20 * volatilityScale; break;
        case '7d': volatility = 1200 * volatilityScale; timeStepMinutes = 60 * 7; trendBias = 50 * volatilityScale; break;
      }

      let price = basePrice - (trendBias * points) + ((Math.random() - 0.5) * volatility * 2);
      
      for (let i = 0; i < points; i++) {
        price = price + (Math.random() - 0.5) * volatility + trendBias;
        const pointTime = new Date(now.getTime() - ((points - 1 - i) * timeStepMinutes * 60 * 1000));
        let label = '';
        if (activeTimeRange === '7d') label = `${pointTime.getMonth()+1}/${pointTime.getDate()}`;
        else if (activeTimeRange === '1d' || activeTimeRange === '12h') label = `${pointTime.getHours()}시`;
        else label = `${pointTime.getHours()}:${String(pointTime.getMinutes()).padStart(2, '0')}`;

        data.push({ time: label, price: price });
      }
      
      setChartData(data);
      setCurrentPrice(data[data.length - 1].price);
      // Mock percent change
      setPercentChange(activeCoin === 'bitcoin' ? 2.4 : 1.8); 
    };

    fetchMarketData();

    return () => { isMounted = false; };
  }, [activeTimeRange, activeCoin, currentConfig.id]);

  const handlePredict = () => {
    if (!selectedRange) return;
    if (userState.balance < 2) {
      alert("VIEW가 부족합니다!");
      return;
    }
    
    addTransaction({
      type: 'BTC Game',
      amount: -2,
      description: `${currentConfig.symbol} 예측: ${selectedRange}`
    });
    alert("예측이 제출되었습니다! 행운을 빕니다.");
    setSelectedRange(null);
  };

  // Generate dynamic ranges based on current live price
  const getPredictionRanges = () => {
    const p = currentPrice;
    const format = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    // Create tight ranges around the base price
    const step = activeCoin === 'bitcoin' ? 500 : 50; // Smaller steps for live prediction

    return [
        { label: `< ${format(p - step)}`, participants: 120 + Math.floor(Math.random() * 50) },
        { label: `${format(p - step)} - ${format(p)}`, participants: 450 + Math.floor(Math.random() * 50) },
        { label: `${format(p)} - ${format(p + step)}`, participants: 310 + Math.floor(Math.random() * 50) },
        { label: `> ${format(p + step)}`, participants: 85 + Math.floor(Math.random() * 50) },
    ];
  };

  const predictionRanges = getPredictionRanges();

  return (
    <div className="flex flex-col min-h-screen pb-32 bg-gray-50">
      
      {/* 1. Header & Game Section */}
      <div className="relative bg-[#1a1b2e] text-white pt-10 pb-20 px-6 rounded-b-[40px] shadow-2xl overflow-hidden transition-all duration-500">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className={`absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full blur-[80px] transition-colors duration-500 ${currentConfig.blurColor}`}></div>
           <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-purple-600/20 rounded-full blur-[80px]"></div>
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className={`px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-300 text-[10px] font-bold uppercase tracking-wider flex items-center`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse mr-1.5 ${currentConfig.bgColor}`}></span>
                  Live
                </span>
                <span className="text-gray-400 text-xs font-medium">Next Round in {timeLeft}</span>
              </div>
              
              {/* Coin Toggle */}
              <div className="flex items-center space-x-2 mt-2">
                <button 
                  onClick={() => setActiveCoin('bitcoin')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${activeCoin === 'bitcoin' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 font-bold' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                >
                  <Bitcoin size={16} />
                  <span className="text-sm">BTC</span>
                </button>
                <button 
                  onClick={() => setActiveCoin('ethereum')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${activeCoin === 'ethereum' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 font-bold' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                >
                  <EthereumIcon size={16} />
                  <span className="text-sm">ETH</span>
                </button>
              </div>
            </div>

            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-lg">
               <currentConfig.icon className={currentConfig.textColor} size={24} />
            </div>
          </div>

          {/* Chart Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-0 overflow-hidden shadow-2xl relative min-h-[260px]">
             
             {isLoading && (
               <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-sm">
                 <Loader2 size={32} className={`animate-spin ${currentConfig.textColor}`} />
               </div>
             )}

             <div className="p-5 pb-0">
               <div className="flex flex-col mb-4">
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <p className="text-gray-400 text-xs font-medium mb-1 flex items-center">
                       <TrendingUp size={12} className="mr-1" /> {currentConfig.symbol}/USD Index
                     </p>
                     <p className="text-3xl font-bold text-white tracking-tight">
                       ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </p>
                     <p className={`text-xs font-bold mt-1 ${percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                       {percentChange >= 0 ? '+' : ''}{percentChange}% ({activeTimeRange.toUpperCase()})
                     </p>
                   </div>
                 </div>
                 
                 {/* Time Range Tabs */}
                 <div className="flex bg-white/10 p-1 rounded-xl backdrop-blur-md self-start">
                   {TIME_RANGES.map((range) => (
                     <button
                       key={range.value}
                       onClick={() => setActiveTimeRange(range.value)}
                       className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                         activeTimeRange === range.value 
                         ? 'bg-white text-gray-900 shadow-sm' 
                         : 'text-gray-400 hover:text-white hover:bg-white/5'
                       }`}
                     >
                       {range.label}
                     </button>
                   ))}
                 </div>
               </div>
             </div>
             
             <div className="h-48 w-full -ml-2 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={currentConfig.gradientStop} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={currentConfig.gradientStop} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="time" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      interval="preserveStartEnd"
                      minTickGap={30}
                      dy={-5}
                    />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#9ca3af', marginBottom: '0.25rem' }}
                      formatter={(value: number) => [`$${value.toLocaleString(undefined, {maximumFractionDigits: 2})}`, 'Price']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={currentConfig.gradientStop} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>

      {/* 2. Prediction Controls (Overlapping) */}
      <div className="px-5 -mt-12 relative z-20">
         <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-5 flex items-center">
              <Target size={16} className="mr-2 text-gray-400" />
              오늘의 {currentConfig.symbol} 종가를 예측하세요
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {predictionRanges.map((range) => {
                const isSelected = selectedRange === range.label;
                return (
                  <button
                    key={range.label}
                    onClick={() => setSelectedRange(range.label)}
                    className={`
                      relative flex flex-col items-center justify-center py-5 px-2 rounded-2xl transition-all duration-300 ease-out border-2
                      ${isSelected 
                        ? `${currentConfig.bgColor} ${currentConfig.borderColor} text-white shadow-lg scale-[1.02]` // Active State
                        : `bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50 hover:shadow-md` // Inactive State
                      }
                    `}
                  >
                    {/* Checkmark Badge for Selected */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-white/20 rounded-full p-0.5 backdrop-blur-sm animate-in zoom-in duration-200">
                        <Check size={12} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                    
                    <span className={`text-[15px] font-bold tracking-tight mb-1 ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                      {range.label}
                    </span>
                    
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {range.participants}명 선택
                    </span>
                  </button>
                );
              })}
            </div>

            <button 
              disabled={!selectedRange}
              onClick={handlePredict}
              className={`
                w-full font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2
                ${!selectedRange 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                  : 'bg-gray-900 text-white hover:bg-black shadow-gray-900/20'
                }
              `}
            >
              <span>{currentConfig.symbol} 예측 제출하기</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${!selectedRange ? 'bg-gray-200 text-gray-400' : 'bg-white/20 text-white'}`}>-2 VIEW</span>
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