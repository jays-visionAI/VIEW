import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Ticket, ChevronRight, Sparkles, History, CheckCircle2, User, Check, Square, CheckSquare, X, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LottoGame } from '../types';

// Helper component for 3D Ball
const LottoBall: React.FC<{ number: number; isBonus?: boolean; size?: 'sm' | 'md' }> = ({ number, isBonus = false, size = 'md' }) => {
  let colorClass = 'from-gray-100 to-gray-300 text-gray-800 border-gray-300';
  if (number <= 10) colorClass = 'from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-400';
  else if (number <= 20) colorClass = 'from-blue-300 to-blue-500 text-blue-900 border-blue-400';
  else if (number <= 30) colorClass = 'from-red-300 to-red-500 text-red-900 border-red-400';
  else if (number <= 40) colorClass = 'from-gray-700 to-gray-900 text-gray-100 border-gray-600';
  else colorClass = 'from-green-300 to-green-500 text-green-900 border-green-400';

  if (isBonus) colorClass = 'from-red-500 to-red-700 text-white border-red-600 ring-2 ring-red-200';

  const sizeClass = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-lg';

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center font-black shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),inset_0_-4px_4px_rgba(0,0,0,0.2)] border relative`}>
      <div className="absolute top-1 left-2 w-3 h-2 bg-white rounded-full opacity-40 blur-[1px]"></div>
      {number}
    </div>
  );
};

// Game Label (A~E)
const GameLabel: React.FC<{ gameNo: number }> = ({ gameNo }) => {
  const labels = ['A', 'B', 'C', 'D', 'E'];
  return (
    <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center">
      {labels[gameNo - 1] || gameNo}
    </span>
  );
};

// Game Row Component (for selection)
const GameRow: React.FC<{
  game: LottoGame;
  selected: boolean;
  onToggle: () => void;
}> = ({ game, selected, onToggle }) => (
  <div
    onClick={onToggle}
    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selected ? 'bg-brand-50 border-2 border-brand-400' : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
      }`}
  >
    <div className="flex-shrink-0">
      {selected ? (
        <CheckSquare size={20} className="text-brand-600" />
      ) : (
        <Square size={20} className="text-gray-400" />
      )}
    </div>
    <GameLabel gameNo={game.gameNo} />
    <div className="flex gap-1.5 flex-wrap">
      {game.numbers.map((n, i) => (
        <LottoBall key={i} number={n} size="sm" />
      ))}
    </div>
  </div>
);

// Multi-Game Ticket Card for tickets list
const LottoTicketCard: React.FC<{
  drawRound: number;
  drawDate: string;
  games: LottoGame[];
  status: string;
  totalPrize?: number;
}> = ({ drawRound, drawDate, games, status, totalPrize }) => (
  <div className="relative w-full bg-white rounded-xl shadow-md overflow-hidden mb-4">
    <div className={`absolute left-0 top-0 bottom-0 w-2 ${status === 'won' ? 'bg-green-500' :
      status === 'pending' ? 'bg-brand-500' : 'bg-gray-300'
      }`}></div>
    <div className="pl-6 pr-4 py-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-black text-lg text-gray-900">제 {drawRound}회</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${status === 'won' ? 'bg-green-50 text-green-600 border-green-200' :
              status === 'pending' ? 'bg-brand-50 text-brand-600 border-brand-200' :
                'bg-gray-50 text-gray-400 border-gray-200'
              }`}>
              {status === 'won' ? `🎉 당첨 ${totalPrize?.toLocaleString()} VIEW` :
                status === 'pending' ? '추첨 대기' : '미당첨'}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-medium mt-0.5">{drawDate} | {games.length}게임</p>
        </div>
      </div>
      <div className="space-y-2">
        {games.map((game, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
            <GameLabel gameNo={game.gameNo} />
            <div className="flex gap-1 flex-wrap">
              {game.numbers.map((n, i) => (
                <span key={i} className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-800 text-xs shadow-sm">
                  {n}
                </span>
              ))}
            </div>
            {game.rank && game.rank > 0 && (
              <span className="ml-auto text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                {game.rank}등
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full"></div>
    <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full"></div>
  </div>
);

const Jackpot: React.FC = () => {
  const { userState, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'tickets'>('scan');

  // Countdown Logic (다음 토요일까지)
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const calcTimeLeft = () => {
      const now = new Date();
      const saturday = new Date();
      saturday.setDate(now.getDate() + (6 - now.getDay()));
      saturday.setHours(21, 0, 0, 0); // 토요일 21시
      if (now > saturday) saturday.setDate(saturday.getDate() + 7);

      const diff = saturday.getTime() - now.getTime();
      return {
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / (1000 * 60)) % 60),
        s: Math.floor((diff / 1000) % 60)
      };
    };
    setTimeLeft(calcTimeLeft());
    const timer = setInterval(() => setTimeLeft(calcTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Current draw round (approximate)
  const currentRound = 1127; // TODO: Fetch from server

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [scannedGames, setScannedGames] = useState<LottoGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<number[]>([]);

  // Resize image for optimal OCR
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64Image = await resizeImage(file);
        setScannedImage(base64Image);
        processImageWithOCR(base64Image);
      } catch (error) {
        console.error('Failed to process image:', error);
        showToast('이미지 처리 오류', 'error');
      }
    }
  };

  const processImageWithOCR = async (base64Image: string) => {
    setIsScanning(true);
    setScanStatus('이미지 분석 중...');
    setScannedGames([]);
    setSelectedGames([]);

    try {
      // Try Cloud Vision API first (server-side)
      setScanStatus('Cloud Vision 분석 중...');

      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const extractLottoNumbers = httpsCallable(functions, 'extractLottoNumbers');

      const result = await extractLottoNumbers({ image: base64Image });
      const data = result.data as any;

      if (data.success && data.games && data.games.length > 0) {
        setScannedGames(data.games);
        setSelectedGames(data.games.map((g: LottoGame) => g.gameNo));
        showToast(`${data.games.length}개 게임 인식 성공!`, 'success');
        return;
      } else if (data.numbers && data.numbers.length >= 6) {
        // Fallback: single game from legacy response
        const singleGame: LottoGame = {
          gameNo: 1,
          numbers: data.numbers.slice(0, 6),
          status: 'pending'
        };
        setScannedGames([singleGame]);
        setSelectedGames([1]);
        showToast('1개 게임 인식됨 (단일 모드)', 'info');
        return;
      }

      throw new Error(data.error || 'OCR failed');

    } catch (cloudVisionError) {
      console.warn('Cloud Vision failed, trying Tesseract:', cloudVisionError);

      // Fallback to Tesseract.js
      try {
        setScanStatus('로컬 OCR 시도 중...');

        if (!(window as any).Tesseract) {
          throw new Error('OCR engine not loaded');
        }

        const { data: { text } } = await (window as any).Tesseract.recognize(base64Image, 'eng', {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              setScanStatus(`스캔 중... ${Math.round(m.progress * 100)}%`);
            }
          }
        });

        // Parse 5 games from text
        const games = parseMultipleGames(text);

        if (games.length > 0) {
          setScannedGames(games);
          setSelectedGames(games.map(g => g.gameNo));
          showToast(`${games.length}개 게임 인식됨 (로컬 OCR)`, 'success');
        } else {
          // Final fallback: generate random games
          setScanStatus('번호를 찾을 수 없어 임의 번호를 생성합니다.');
          const randomGames = generateRandomGames(5);
          setScannedGames(randomGames);
          setSelectedGames([1, 2, 3, 4, 5]);
          showToast('자동 번호 생성 (OCR 실패)', 'info');
        }
      } catch (tesseractError) {
        console.error('Tesseract also failed:', tesseractError);
        showToast('이미지 인식 오류. 다시 시도해주세요.', 'error');
        setScannedImage(null);
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Parse multiple games from OCR text
  const parseMultipleGames = (text: string): LottoGame[] => {
    const games: LottoGame[] = [];
    const lines = text.split('\n');
    let gameNo = 1;

    for (const line of lines) {
      // Find all numbers 1-45 in this line
      const numbers = (line.match(/\b([1-9]|[1-3][0-9]|4[0-5])\b/g) || [])
        .map(Number)
        .filter((v, i, a) => a.indexOf(v) === i); // Unique

      if (numbers.length >= 6) {
        games.push({
          gameNo,
          numbers: numbers.slice(0, 6).sort((a, b) => a - b),
          status: 'pending'
        });
        gameNo++;
        if (gameNo > 5) break; // Max 5 games
      }
    }

    return games;
  };

  // Generate random games for fallback
  const generateRandomGames = (count: number): LottoGame[] => {
    const games: LottoGame[] = [];
    for (let i = 1; i <= count; i++) {
      const nums = new Set<number>();
      while (nums.size < 6) {
        nums.add(Math.floor(Math.random() * 45) + 1);
      }
      games.push({
        gameNo: i,
        numbers: Array.from(nums).sort((a, b) => a - b),
        status: 'pending'
      });
    }
    return games;
  };

  const toggleGame = (gameNo: number) => {
    setSelectedGames(prev =>
      prev.includes(gameNo)
        ? prev.filter(g => g !== gameNo)
        : [...prev, gameNo].sort((a, b) => a - b)
    );
  };

  const selectAll = () => {
    setSelectedGames(scannedGames.map(g => g.gameNo));
  };

  const deselectAll = () => {
    setSelectedGames([]);
  };

  const handleConfirm = async () => {
    if (selectedGames.length === 0) {
      showToast('최소 1개 게임을 선택해주세요.', 'error');
      return;
    }

    const cost = selectedGames.length * 5; // 5 VIEW per game
    if (userState.balance < cost) {
      showToast(`잔액이 부족합니다. (필요: ${cost} VIEW)`, 'error');
      return;
    }

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const registerLottoTicket = httpsCallable(functions, 'registerLottoTicket');

      const gamesToRegister = scannedGames.filter(g => selectedGames.includes(g.gameNo));

      const result = await registerLottoTicket({
        drawRound: currentRound,
        games: gamesToRegister.map(g => ({
          gameNo: g.gameNo,
          numbers: g.numbers
        }))
      });

      const data = result.data as any;
      if (data.success) {
        showToast(`${selectedGames.length}개 게임 등록 완료! (-${cost} VIEW)`, 'success');
        setScannedImage(null);
        setScannedGames([]);
        setSelectedGames([]);
        setActiveTab('tickets');
      } else {
        throw new Error(data.error || '등록 실패');
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      showToast(error.message || '티켓 등록 실패', 'error');
    }
  };

  const handleRetake = () => {
    setScannedImage(null);
    setScannedGames([]);
    setSelectedGames([]);
  };

  return (
    <div className="flex flex-col pb-32 bg-gray-50 min-h-screen font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <style>{`
        @keyframes scan-beam {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>

        {/* Header */}
        <div className="w-full relative bg-[#1a1b2e] text-white pt-12 pb-16 px-6 rounded-b-[40px] shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-600/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-600/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/5 mb-6">
              <Sparkles size={14} className="text-yellow-400" />
              <span className="text-[11px] font-bold text-gray-200">제 {currentRound}회 | 매주 토요일 추첨</span>
            </div>

            <h1 className="text-4xl font-black mb-2 tracking-tight text-center bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
              VIEW 로또
            </h1>
            <p className="text-brand-300 font-bold text-sm mb-8">로또 티켓으로 VIEW 잭팟 도전!</p>

            {/* Countdown Timer */}
            <div className="flex space-x-3 mb-4">
              {[
                { val: timeLeft.d, label: '일' },
                { val: timeLeft.h, label: '시간' },
                { val: timeLeft.m, label: '분' },
                { val: timeLeft.s, label: '초' }
              ].map((t, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-lg">
                    <span className="text-2xl font-bold font-mono text-white">{String(t.val).padStart(2, '0')}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1.5 font-medium">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Winning Numbers Card */}
        <div className="relative z-20 mx-4 md:mx-6 -mt-10 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-xl border border-gray-100/50">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center">
                  <History size={14} className="mr-1.5 text-gray-400" />
                  지난주 당첨 결과 ({currentRound - 1}회)
                </h3>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {[8, 12, 18, 25, 34, 41].map(n => <LottoBall key={n} number={n} />)}
              </div>
              <div className="h-8 w-px bg-gray-200 mx-1"></div>
              <LottoBall number={30} isBonus />
            </div>
          </div>
        </div>

        {/* Tab Control */}
        <div className="px-4 md:px-6">
          <div className="bg-gray-200/80 p-1 rounded-xl flex mb-6 relative">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out ${activeTab === 'scan' ? 'left-1' : 'left-[calc(50%+4px)]'}`}
            />
            <button
              onClick={() => setActiveTab('scan')}
              className={`relative z-10 flex-1 py-2.5 text-sm font-bold transition-colors ${activeTab === 'scan' ? 'text-gray-900' : 'text-gray-500'}`}
            >
              티켓 등록하기
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`relative z-10 flex-1 py-2.5 text-sm font-bold transition-colors ${activeTab === 'tickets' ? 'text-gray-900' : 'text-gray-500'}`}
            >
              나의 티켓함
            </button>
          </div>

          {activeTab === 'scan' ? (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
              {!scannedImage ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative overflow-hidden bg-black rounded-[32px] aspect-[4/5] flex flex-col items-center justify-center text-center cursor-pointer shadow-2xl border-4 border-gray-900"
                >
                  <div className="absolute inset-0 opacity-50 bg-[url('https://images.unsplash.com/photo-1555617778-02518510b9fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80')] bg-cover bg-center mix-blend-overlay"></div>
                  <div className="absolute inset-4 border-2 border-white/30 rounded-2xl border-dashed"></div>

                  <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                  <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                  <div className="absolute bottom-8 left-8 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                  <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>

                  <div className="relative z-10 bg-black/60 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
                    <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(124,58,237,0.5)] group-hover:scale-110 transition-transform">
                      <Camera size={28} className="text-white" />
                    </div>
                    <h3 className="text-white font-bold text-lg">로또 티켓 촬영하기</h3>
                    <p className="text-gray-300 text-xs mt-2">QR코드 또는 번호가 잘 보이게<br />정면에서 촬영해주세요</p>
                  </div>

                  <div className="absolute bottom-10 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold text-white border border-white/20">
                    게임당 5 VIEW | 최대 5게임
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-4 shadow-xl border border-gray-100">
                  {/* Scanned Image Preview */}
                  <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden mb-4">
                    <img src={scannedImage} alt="Scanned" className="w-full h-full object-cover opacity-80" />
                    {isScanning && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-500/20 to-transparent h-1/4 animate-[scan-beam_2s_linear_infinite]"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black/70 backdrop-blur px-4 py-2 rounded-lg flex items-center space-x-2 border border-white/10">
                            <RefreshCw className="animate-spin text-brand-400" size={16} />
                            <span className="text-white font-bold text-xs">{scanStatus}</span>
                          </div>
                        </div>
                      </>
                    )}
                    {!isScanning && scannedGames.length > 0 && (
                      <div className="absolute bottom-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center shadow-lg">
                        <CheckCircle2 size={12} className="mr-1" /> {scannedGames.length}개 게임 인식
                      </div>
                    )}
                  </div>

                  {/* Game Selection */}
                  {scannedGames.length > 0 && (
                    <div className="animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-gray-700">게임 선택</p>
                        <div className="flex gap-2">
                          <button
                            onClick={selectAll}
                            className="text-xs text-brand-600 font-medium hover:text-brand-700"
                          >
                            전체 선택
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={deselectAll}
                            className="text-xs text-gray-500 font-medium hover:text-gray-700"
                          >
                            전체 해제
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        {scannedGames.map(game => (
                          <GameRow
                            key={game.gameNo}
                            game={game}
                            selected={selectedGames.includes(game.gameNo)}
                            onToggle={() => toggleGame(game.gameNo)}
                          />
                        ))}
                      </div>

                      {/* Cost Summary */}
                      <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">선택 게임</span>
                          <span className="font-bold text-gray-900">{selectedGames.length}개</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-600">등록 비용</span>
                          <span className="font-bold text-brand-600">{selectedGames.length * 5} VIEW</span>
                        </div>
                        {userState.balance < selectedGames.length * 5 && (
                          <div className="flex items-center gap-1 mt-2 text-red-500 text-xs">
                            <AlertCircle size={12} />
                            잔액 부족 (현재: {userState.balance} VIEW)
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={handleRetake}
                          className="flex-1 py-3.5 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200"
                        >
                          재촬영
                        </button>
                        <button
                          onClick={handleConfirm}
                          disabled={selectedGames.length === 0 || userState.balance < selectedGames.length * 5}
                          className="flex-1 py-3.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          등록하기 ({selectedGames.length * 5} VIEW)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-4 fade-in duration-500 min-h-[400px]">
              {(userState.lottoTickets || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <Ticket size={40} className="text-gray-300" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">아직 티켓이 없어요</h3>
                  <p className="text-gray-400 text-sm mt-2 mb-6">
                    낙첨된 로또 티켓을 촬영해서<br />
                    VIEW 잭팟에 도전해보세요!
                  </p>
                  <button
                    onClick={() => setActiveTab('scan')}
                    className="bg-brand-50 text-brand-600 px-6 py-2.5 rounded-full font-bold text-sm hover:bg-brand-100 transition-colors"
                  >
                    티켓 등록하러 가기
                  </button>
                </div>
              ) : (
                <div>
                  {(userState.lottoTickets || []).map(ticket => (
                    <LottoTicketCard
                      key={ticket.id}
                      drawRound={ticket.drawRound}
                      drawDate={ticket.drawDate}
                      games={ticket.games}
                      status={ticket.status}
                      totalPrize={ticket.totalPrize}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prize Table */}
          <div className="mt-8 mb-10">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 text-lg">등위별 당첨금 안내</h3>
                <span className="text-xs text-gray-500">1~3등 당첨자 없을 시 상금 전액 이월</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex bg-gray-50/80 border-b border-gray-100 py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <div className="w-16">등위</div>
                <div className="flex-1 text-center">조건</div>
                <div className="w-28 text-right">당첨금 구조</div>
              </div>

              {[
                { rank: '1등', match: '6개 일치', prize: '총 상금의 75% (+이월)', color: 'text-brand-600' },
                { rank: '2등', match: '5개 + 보너스', prize: '총 상금의 12.5%', color: 'text-gray-700' },
                { rank: '3등', match: '5개 일치', prize: '총 상금의 12.5%', color: 'text-gray-700' },
                { rank: '4등', match: '4개 일치', prize: '500 VIEW (고정)', color: 'text-gray-700' },
                { rank: '5등', match: '3개 일치', prize: '50 VIEW (고정)', color: 'text-gray-700' },
              ].map((item, i) => (
                <div key={i} className="flex items-center py-4 px-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <div className="w-16">
                    <span className={`font-bold text-sm ${item.color}`}>{item.rank}</span>
                  </div>
                  <div className="flex-1 text-center text-sm text-gray-600">
                    {item.match}
                  </div>
                  <div className="w-28 text-right text-xs font-bold text-gray-900 break-keep">
                    {item.prize}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Jackpot;