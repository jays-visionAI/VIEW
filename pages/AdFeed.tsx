import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Volume2, CheckCircle2, MoreHorizontal, Music2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getCurrentTier } from '../context/AppContext';

const ADS = [
  {
    id: 1,
    title: '크립토 거래소 프로',
    brand: '코인마스터',
    color: 'bg-gradient-to-br from-indigo-900 to-purple-800',
    desc: '오늘 수수료 0%로 거래를 시작하세요.',
    // Sample video placeholder - replace with actual ad videos
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  },
  {
    id: 2,
    title: '지속 가능한 에너지',
    brand: '그린퓨처',
    color: 'bg-gradient-to-br from-emerald-800 to-teal-900',
    desc: '더 깨끗한 지구를 위한 투자.',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
  },
  {
    id: 3,
    title: '모바일 게임',
    brand: '픽셀플레이',
    color: 'bg-gradient-to-br from-orange-800 to-red-900',
    desc: '지금 다운로드하고 특별 보상을 받으세요.',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
  },
];

const AdFeed: React.FC = () => {
  const { completeAd, userState, showToast } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [likedAds, setLikedAds] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentTier = getCurrentTier(userState.staked);
  const currentReward = 5 * currentTier.multiplier;

  // Reset state when swiping to a new ad
  useEffect(() => {
    setProgress(0);
    setIsComplete(false);
  }, [currentIndex]);

  // Auto-play logic
  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsComplete(true);
          completeAd();
          return 100;
        }
        return prev + 0.5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [currentIndex, isComplete, completeAd]);

  const handleScroll = () => {
    if (containerRef.current) {
      const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
      if (index !== currentIndex) {
        setCurrentIndex(index);
      }
    }
  };

  const toggleLike = (id: number) => {
    if (likedAds.includes(id)) {
      setLikedAds(prev => prev.filter(adId => adId !== id));
    } else {
      setLikedAds(prev => [...prev, id]);
      showToast('좋아요를 눌렀습니다!', 'success');
    }
  };

  const handleShare = () => {
    showToast('공유 링크가 복사되었습니다!');
  };

  return (
    <div className="fixed inset-0 bg-black z-40">
      {/* Feed Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {ADS.map((ad, index) => {
          const isActive = index === currentIndex;
          const isLiked = likedAds.includes(ad.id);

          return (
            <div key={ad.id} className={`h-full w-full snap-center relative flex items-center justify-center overflow-hidden`}>
              {/* Video Background */}
              <video
                className="absolute inset-0 w-full h-full object-cover"
                src={ad.videoUrl}
                muted
                playsInline
                loop
                autoPlay={isActive}
                onEnded={() => {
                  if (isActive && !isComplete) {
                    setIsComplete(true);
                    completeAd();
                  }
                }}
              />

              {/* Fallback Color Overlay */}
              <div className={`absolute inset-0 ${ad.color} opacity-30`}></div>

              {/* Content Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8 w-full max-w-sm transition-all duration-700 transform z-10" style={{ opacity: isActive ? 1 : 0.4, scale: isActive ? '1' : '0.95' }}>
                  <h3 className="text-4xl font-black text-white mb-4 drop-shadow-2xl leading-tight">{ad.title}</h3>
                  <p className="text-white/90 text-lg font-medium drop-shadow-lg leading-relaxed">{ad.desc}</p>
                </div>
              </div>

              {/* Bottom Gradient Overlay */}
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>

              {/* Bottom Info Area */}
              <div className="absolute bottom-0 left-0 w-full p-5 pb-24">
                <div className="flex justify-between items-end mb-4">
                  <div className="flex-1 pr-12">
                    <h4 className="font-bold text-lg text-white flex items-center mb-2">
                      @{ad.brand}
                      <CheckCircle2 size={14} className="ml-1 text-blue-400 fill-white" />
                    </h4>
                    <p className="text-sm text-gray-200 line-clamp-2 font-light leading-snug">
                      {ad.desc} <span className="font-bold text-white">#VIEW #Ad</span>
                    </p>
                    <div className="flex items-center mt-3 text-xs text-white/70">
                      <Music2 size={12} className="mr-1.5 animate-spin-slow" />
                      <span className="marquee">Original Sound - {ad.brand} Official</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="absolute bottom-24 right-2 flex flex-col space-y-5 items-center pb-4">
                <button
                  onClick={() => toggleLike(ad.id)}
                  className="flex flex-col items-center space-y-1 group"
                >
                  <div className={`p-3 rounded-full backdrop-blur-md border border-white/10 group-active:scale-90 transition-all ${isLiked ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white'}`}>
                    <Heart size={26} className={isLiked ? "fill-current" : ""} />
                  </div>
                  <span className="text-[10px] font-bold text-white drop-shadow-md">12.5K</span>
                </button>
                <button
                  onClick={() => showToast('댓글 기능은 준비 중입니다.', 'info')}
                  className="flex flex-col items-center space-y-1 group"
                >
                  <div className="bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/10 group-active:scale-90 transition-transform">
                    <MessageCircle size={26} className="text-white" />
                  </div>
                  <span className="text-[10px] font-bold text-white drop-shadow-md">402</span>
                </button>
                <button
                  onClick={handleShare}
                  className="bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/10 group-active:scale-90 transition-transform"
                >
                  <Share2 size={26} className="text-white" />
                </button>
                <button
                  onClick={() => showToast('더보기 메뉴', 'info')}
                  className="bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/10 group-active:scale-90 transition-transform"
                >
                  <MoreHorizontal size={26} className="text-white" />
                </button>
              </div>

              {/* Progress Bar (TikTok style thin line) */}
              <div className="absolute bottom-[80px] left-2 right-2 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 shadow-[0_0_10px_rgba(139,92,246,0.8)] transition-all duration-75 ease-linear"
                  style={{ width: `${isActive ? progress : 0}%` }}
                />
              </div>

              {/* Reward Notification */}
              {isComplete && isActive && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center animate-in slide-in-from-top-4 duration-500 z-50">
                  <div className="bg-white/90 backdrop-blur-md text-gray-900 px-5 py-2.5 rounded-full flex items-center shadow-2xl border border-white/40">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-2 shadow-sm">
                      <CheckCircle2 size={14} className="text-white" />
                    </div>
                    <span className="font-bold text-sm">+{currentReward.toFixed(1)} VIEW</span>
                  </div>
                  {currentTier.multiplier > 1 && (
                    <div className="mt-1 bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg">
                      {currentTier.label} Bonus x{currentTier.multiplier}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* End Feed State */}
        <div className="h-full w-full snap-center flex items-center justify-center bg-[#1a1b2e]">
          <div className="text-center p-8 opacity-50">
            <Volume2 size={40} className="mx-auto mb-4 text-white" />
            <h3 className="text-xl font-bold text-white mb-2">No more ads</h3>
            <p className="text-gray-400">Check back later for more rewards.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdFeed;