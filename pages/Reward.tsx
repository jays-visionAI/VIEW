import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Bitcoin, Trophy, Check, TrendingUp, Clock, Target, ArrowRight, Sparkles, RefreshCw, Loader2, ClipboardList, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

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

// Survey Modal Component
const SurveyModal: React.FC<{
  survey: any;
  currentIndex: number;
  onAnswer: (questionId: string, answer: any, reward: number) => void;
  onClose: () => void;
}> = ({ survey, currentIndex, onAnswer, onClose }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [sliderValue, setSliderValue] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = survey.questions?.[currentIndex];

  if (!question) return null;

  const handleSubmit = async () => {
    if (!selectedAnswer && question.type !== 'slider') return;
    setIsSubmitting(true);

    const answer = question.type === 'slider' ? sliderValue : selectedAnswer;
    await onAnswer(question.id, answer, question.reward || 10);

    setSelectedAnswer(null);
    setSliderValue(3);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-brand-100 text-sm font-medium mb-1">{survey.categoryNameKo}</p>
              <h3 className="font-bold text-lg">문항 {currentIndex + 1} / {survey.questions.length}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Progress */}
          <div className="mt-4 h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / survey.questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="p-5">
          <h4 className="font-bold text-gray-800 text-lg mb-4">{question.question}</h4>

          {/* Options based on type */}
          {question.type === 'single' && (
            <div className="space-y-2">
              {question.options?.map((option: string) => (
                <button
                  key={option}
                  onClick={() => setSelectedAnswer(option)}
                  className={`w-full p-3 rounded-xl text-left font-medium transition-all ${selectedAnswer === option
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {question.type === 'multiple' && (
            <div className="space-y-2">
              {question.options?.map((option: string) => {
                const isSelected = Array.isArray(selectedAnswer) && selectedAnswer.includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => {
                      setSelectedAnswer((prev: string[] | null) => {
                        const arr = prev || [];
                        return isSelected
                          ? arr.filter((o) => o !== option)
                          : [...arr, option];
                      });
                    }}
                    className={`w-full p-3 rounded-xl text-left font-medium transition-all flex items-center gap-2 ${isSelected
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-white border-white' : 'border-gray-300'}`}>
                      {isSelected && <span className="text-brand-500 text-xs">✓</span>}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {question.type === 'slider' && (
            <div className="py-4">
              <input
                type="range"
                min={question.min || 1}
                max={question.max || 5}
                value={sliderValue}
                onChange={(e) => setSliderValue(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{question.sliderLabels?.[0] || '낮음'}</span>
                <span className="font-bold text-brand-500 text-lg">{sliderValue}</span>
                <span>{question.sliderLabels?.[1] || '높음'}</span>
              </div>
            </div>
          )}

          {/* Reward & Submit */}
          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              보상: <span className="font-bold text-brand-500">+{question.reward} VIEW</span>
            </span>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!selectedAnswer && question.type !== 'slider')}
              className="px-6 py-3 bg-brand-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-600 transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={16} />
              ) : currentIndex + 1 === survey.questions.length ? (
                '완료하기'
              ) : (
                '다음'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Swipe Game Component
const SwipeGame: React.FC<{
  onComplete: () => void;
  onSwipe: (item: any, direction: 'left' | 'right') => void;
}> = ({ onComplete, onSwipe }) => {
  // Sample swipe items with product images (could be fetched from Firestore)
  const swipeItems = [
    { id: '1', name: 'Nike Air Max', brand: 'Nike', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', category: 'Fashion.Footwear', taxonomyTags: ['Fashion', 'Fashion.Footwear'] },
    { id: '2', name: 'iPhone 15 Pro', brand: 'Apple', imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400', category: 'Technology.Consumer_Electronics', taxonomyTags: ['Technology', 'Technology.Consumer_Electronics', 'Technology.Consumer_Electronics.Smartphone'] },
    { id: '3', name: 'Premium Coffee', brand: 'Starbucks', imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400', category: 'Food_Beverage', taxonomyTags: ['Food_Beverage', 'Food_Beverage.Beverages'] },
    { id: '4', name: 'Travel to Bali', brand: '', imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400', category: 'Travel', taxonomyTags: ['Travel', 'Travel.International'] },
    { id: '5', name: 'Gaming Console', brand: 'PlayStation', imageUrl: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400', category: 'Entertainment.Gaming', taxonomyTags: ['Entertainment', 'Entertainment.Gaming'] },
    { id: '6', name: 'Luxury Watch', brand: 'Omega', imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', category: 'Fashion.Accessories', taxonomyTags: ['Fashion', 'Fashion.Accessories'] },
    { id: '7', name: 'Electric Car', brand: 'Tesla', imageUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=400', category: 'Automotive', taxonomyTags: ['Automotive', 'Automotive.EV'] },
    { id: '8', name: 'Skincare Set', brand: 'Lush', imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400', category: 'Beauty', taxonomyTags: ['Beauty', 'Beauty.Skincare'] },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);
  const [showReward, setShowReward] = useState(false);

  const currentItem = swipeItems[currentIndex];

  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
  };

  const handleDragMove = (clientX: number, startX: number) => {
    if (!isDragging) return;
    setDragOffset(clientX - startX);
  };

  const handleDragEnd = () => {
    setIsDragging(false);

    if (Math.abs(dragOffset) > 100) {
      const direction = dragOffset > 0 ? 'right' : 'left';
      onSwipe(currentItem, direction);

      const newCount = swipeCount + 1;
      setSwipeCount(newCount);

      // Show reward every 10 swipes
      if (newCount % 10 === 0) {
        setShowReward(true);
        setTimeout(() => setShowReward(false), 1500);
      }

      if (currentIndex < swipeItems.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete();
      }
    }

    setDragOffset(0);
  };

  // Touch handlers
  const touchStartRef = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX, touchStartRef.current);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Quick buttons
  const quickSwipe = (direction: 'left' | 'right') => {
    setDragOffset(direction === 'right' ? 150 : -150);
    setTimeout(() => {
      onSwipe(currentItem, direction);

      const newCount = swipeCount + 1;
      setSwipeCount(newCount);

      if (newCount % 10 === 0) {
        setShowReward(true);
        setTimeout(() => setShowReward(false), 1500);
      }

      if (currentIndex < swipeItems.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete();
      }

      setDragOffset(0);
    }, 150);
  };

  if (!currentItem) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="text-4xl mb-3">🎉</span>
        <h4 className="font-bold text-gray-800">오늘의 스와이프 완료!</h4>
        <p className="text-sm text-gray-500 mt-1">총 {swipeCount}개 스와이프, +{Math.floor(swipeCount / 10)} VIEW 획득</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Reward Toast */}
      {showReward && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-4 py-2 rounded-full shadow-lg animate-bounce">
          🎁 +1 VIEW 획득!
        </div>
      )}

      {/* Card Stack */}
      <div className="relative h-[320px] flex items-center justify-center">
        {/* Background card preview */}
        {currentIndex < swipeItems.length - 1 && (
          <div className="absolute w-[85%] h-[280px] bg-gray-100 rounded-3xl shadow-sm" />
        )}

        {/* Main Card */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
          className="relative w-[90%] bg-white rounded-3xl shadow-xl overflow-hidden cursor-grab active:cursor-grabbing"
        >
          {/* Swipe Indicators */}
          <div
            className="absolute inset-0 bg-green-500/20 flex items-center justify-center z-10 transition-opacity"
            style={{ opacity: Math.max(0, dragOffset / 150) }}
          >
            <span className="text-6xl">👍</span>
          </div>
          <div
            className="absolute inset-0 bg-red-500/20 flex items-center justify-center z-10 transition-opacity"
            style={{ opacity: Math.max(0, -dragOffset / 150) }}
          >
            <span className="text-6xl">👎</span>
          </div>

          {/* Product Image */}
          <div className="h-[200px] bg-gray-100 flex items-center justify-center overflow-hidden">
            <img
              src={currentItem.imageUrl}
              alt={currentItem.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>

          {/* Product Info */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-gray-800">{currentItem.name}</h4>
              {currentItem.brand && (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {currentItem.brand}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {currentItem.taxonomyTags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] font-medium text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">
                  #{tag.split('.').pop()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <button
          onClick={() => quickSwipe('left')}
          className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center text-2xl active:scale-95 transition-transform shadow-sm border border-red-100"
        >
          ✕
        </button>
        <div className="text-center">
          <p className="text-xs text-gray-400">{currentIndex + 1} / {swipeItems.length}</p>
          <p className="text-xs font-bold text-brand-500">{swipeCount}회 스와이프</p>
        </div>
        <button
          onClick={() => quickSwipe('right')}
          className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center text-2xl active:scale-95 transition-transform shadow-sm border border-green-100"
        >
          ❤️
        </button>
      </div>
    </div>
  );
};

type CoinType = 'bitcoin' | 'ethereum';

const Reward: React.FC = () => {
  const { userState, addTransaction, claimMission, submitPrediction } = useApp();
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [timeLeft, setTimeLeft] = useState("04:23:10");

  // State
  const [activeCoin, setActiveCoin] = useState<CoinType>('bitcoin');
  const [activeTimeRange, setActiveTimeRange] = useState('1d');
  const [chartData, setChartData] = useState<{ time: string, price: number }[]>([]);
  const [percentChange, setPercentChange] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(66450);

  // Survey Quest State
  const [surveys, setSurveys] = useState<any[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<Record<string, any>>({});
  const [surveysLoading, setSurveysLoading] = useState(true);
  const [activeSurvey, setActiveSurvey] = useState<any | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Survey category icons and colors
  const surveyCategories: Record<string, { icon: string; color: string; bgColor: string }> = {
    demographics: { icon: '👤', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    spending: { icon: '💰', color: 'text-green-600', bgColor: 'bg-green-100' },
    shopping: { icon: '🛒', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    power: { icon: '⚡', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    history: { icon: '📊', color: 'text-red-600', bgColor: 'bg-red-100' },
    lifecycle: { icon: '🌱', color: 'text-teal-600', bgColor: 'bg-teal-100' },
  };

  // Swipe Game State
  const [showSwipeGame, setShowSwipeGame] = useState(false);
  const [swipeCompleted, setSwipeCompleted] = useState(false);

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

  // Check if today's prediction exists for this coin
  const hasPredictedToday = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return userState.predictions.some(p => {
      const pDate = p.predictedAt?.toDate ? p.predictedAt.toDate() : new Date(p.predictedAt || Date.now());
      return p.coin === activeCoin && pDate >= today;
    });
  }, [userState.predictions, activeCoin]);

  // Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const date = new Date();
      const h = 23 - date.getHours();
      const m = 59 - date.getMinutes();
      const s = 59 - date.getSeconds();
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Surveys from Firebase
  useEffect(() => {
    const fetchSurveys = async () => {
      setSurveysLoading(true);
      try {
        const functions = getFunctions();
        const getSurveysFunc = httpsCallable(functions, 'getSurveys');
        const result = await getSurveysFunc({});
        const data = result.data as { success: boolean; surveys: any[]; responses: Record<string, any> };

        if (data.success) {
          setSurveys(data.surveys || []);
          setSurveyResponses(data.responses || {});
        }
      } catch (error) {
        console.warn('Failed to load surveys:', error);
        // Set empty state on error
        setSurveys([]);
      } finally {
        setSurveysLoading(false);
      }
    };

    fetchSurveys();
  }, []);

  // Prediction Handler
  const handlePredict = async () => {
    if (!selectedRange || hasPredictedToday || betAmount <= 0) return;
    if (betAmount > userState.balance) {
      return;
    }
    await submitPrediction(activeCoin, selectedRange, currentPrice, betAmount);
    setSelectedRange(null);
  };

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
            label = `${date.getMonth() + 1}/${date.getDate()}`;
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
        if (activeTimeRange === '7d') label = `${pointTime.getMonth() + 1}/${pointTime.getDate()}`;
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
      {/* Responsive Container */}
      <div className="w-full max-w-4xl mx-auto">

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
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${activeTimeRange === range.value
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
                        <stop offset="5%" stopColor={currentConfig.gradientStop} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={currentConfig.gradientStop} stopOpacity={0} />
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
                      formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Price']}
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
        <div className="px-5 md:px-6 -mt-12 relative z-20">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 mb-5 flex items-center">
              <Target size={16} className="mr-2 text-gray-400" />
              오늘의 {currentConfig.symbol} 종가를 예측하세요
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-400'
                      }`}>
                      {range.participants}명 선택
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bet Amount Input */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-2">베팅 금액 (VIEW)</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 0))}
                    min="1"
                    max={userState.balance}
                    disabled={hasPredictedToday}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none text-lg font-bold disabled:bg-gray-50 disabled:text-gray-400"
                    placeholder="베팅 금액"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">VIEW</span>
                </div>
                <button
                  onClick={() => setBetAmount(Math.floor(userState.balance * 0.5))}
                  disabled={hasPredictedToday}
                  className="px-3 py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 disabled:opacity-50"
                >
                  50%
                </button>
                <button
                  onClick={() => setBetAmount(Math.floor(userState.balance))}
                  disabled={hasPredictedToday}
                  className="px-3 py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 disabled:opacity-50"
                >
                  MAX
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">보유: {userState.balance.toLocaleString()} VIEW</p>
            </div>

            <button
              disabled={!selectedRange || hasPredictedToday || betAmount <= 0 || betAmount > userState.balance}
              onClick={handlePredict}
              className={`
                w-full font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2
                ${(!selectedRange && !hasPredictedToday) || hasPredictedToday || betAmount <= 0 || betAmount > userState.balance
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-gray-900 text-white hover:bg-black shadow-gray-900/20'
                }
              `}
            >
              <span>{hasPredictedToday ? '이미 참여 완료' : `${currentConfig.symbol} 예측 제출하기`}</span>
              {!hasPredictedToday && <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${!selectedRange || betAmount <= 0 ? 'bg-gray-200 text-gray-400' : 'bg-white/20 text-white'}`}>-{betAmount.toLocaleString()} VIEW</span>}
            </button>
          </div>
        </div>

        {/* 3. Missions Section */}
        <div className="px-6 md:px-8 mt-8">
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
                    className={`min-w-[80px] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${mission.claimed
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

        {/* 4. Survey Quest Section */}
        <div className="px-6 md:px-8 mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ClipboardList className="text-brand-500" size={20} />
              <h2 className="font-bold text-xl text-gray-900">설문 퀘스트</h2>
            </div>
            <span className="text-xs font-bold text-brand-500 bg-brand-100 px-2 py-1 rounded-full">
              최대 1,500 VIEW
            </span>
          </div>

          {surveysLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-brand-500" size={24} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {surveys.map((survey) => {
                const response = surveyResponses[survey.id];
                const progress = response?.progress?.completed || 0;
                const total = survey.questions?.length || 10;
                const isComplete = progress >= total;
                const category = surveyCategories[survey.id] || { icon: '📋', color: 'text-gray-600', bgColor: 'bg-gray-100' };

                return (
                  <button
                    key={survey.id}
                    onClick={() => {
                      setActiveSurvey(survey);
                      setCurrentQuestionIndex(progress);
                    }}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${isComplete
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-100 hover:border-brand-200 hover:shadow-sm'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${category.bgColor} flex items-center justify-center text-xl mb-2`}>
                      {isComplete ? '✅' : category.icon}
                    </div>
                    <h4 className="font-bold text-sm text-gray-800 mb-1">{survey.categoryNameKo}</h4>
                    <p className="text-xs text-gray-500 mb-2">{progress}/{total} 문항</p>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-brand-500'}`}
                        style={{ width: `${(progress / total) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-medium text-brand-500">
                        +{survey.completionBonus} VIEW
                      </span>
                      {!isComplete && (
                        <ChevronRight size={14} className="text-gray-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Swipe Game Section */}
        <div className="px-6 md:px-8 mt-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-xl">💖</span>
              <h2 className="font-bold text-xl text-gray-900">취향 스와이프</h2>
            </div>
            <span className="text-xs font-bold text-pink-500 bg-pink-50 px-2 py-1 rounded-full">
              10회당 +1 VIEW
            </span>
          </div>

          {!showSwipeGame ? (
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-3xl p-6 text-center border border-pink-100">
              <span className="text-5xl block mb-3">💕</span>
              <h3 className="font-bold text-gray-800 text-lg mb-2">취향을 알려주세요!</h3>
              <p className="text-sm text-gray-500 mb-4">
                좌우로 스와이프하며 관심사를 표시하고<br />
                나만의 페르소나를 완성해보세요
              </p>
              <button
                onClick={() => setShowSwipeGame(true)}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/30 active:scale-95 transition-transform"
              >
                스와이프 시작하기
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
              <SwipeGame
                onComplete={() => {
                  setSwipeCompleted(true);
                  setShowSwipeGame(false);
                }}
                onSwipe={(item, direction) => {
                  console.log(`Swiped ${direction} on:`, item.name, item.taxonomyTags);
                  // TODO: Call Firebase function to track preference
                }}
              />
            </div>
          )}
        </div>

        {/* Survey Modal */}
        {activeSurvey && (
          <SurveyModal
            survey={activeSurvey}
            currentIndex={currentQuestionIndex}
            onAnswer={async (questionId: string, answer: any, reward: number) => {
              const functions = getFunctions();
              const submitAnswer = httpsCallable(functions, 'submitSurveyAnswer');
              await submitAnswer({
                categoryId: activeSurvey.id,
                questionId,
                answer,
                reward
              });

              // Update local state
              setSurveyResponses(prev => ({
                ...prev,
                [activeSurvey.id]: {
                  ...prev[activeSurvey.id],
                  progress: {
                    ...prev[activeSurvey.id]?.progress,
                    completed: (prev[activeSurvey.id]?.progress?.completed || 0) + 1
                  }
                }
              }));

              if (currentQuestionIndex + 1 < activeSurvey.questions.length) {
                setCurrentQuestionIndex(prev => prev + 1);
              } else {
                setActiveSurvey(null);
                setCurrentQuestionIndex(0);
              }
            }}
            onClose={() => {
              setActiveSurvey(null);
              setCurrentQuestionIndex(0);
            }}
          />
        )}
      </div>{/* End Responsive Container */}
    </div>
  );
};

export default Reward;