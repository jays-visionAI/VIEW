import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Ticket, Trophy, Info, Timer, ChevronRight, Sparkles, ScanLine, History, CheckCircle2, User } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Helper component for 3D Ball
const LottoBall: React.FC<{ number: number; isBonus?: boolean }> = ({ number, isBonus = false }) => {
  let colorClass = 'from-gray-100 to-gray-300 text-gray-800 border-gray-300';
  if (number <= 10) colorClass = 'from-yellow-300 to-yellow-500 text-yellow-900 border-yellow-400';
  else if (number <= 20) colorClass = 'from-blue-300 to-blue-500 text-blue-900 border-blue-400';
  else if (number <= 30) colorClass = 'from-red-300 to-red-500 text-red-900 border-red-400';
  else if (number <= 40) colorClass = 'from-gray-700 to-gray-900 text-gray-100 border-gray-600';
  else colorClass = 'from-green-300 to-green-500 text-green-900 border-green-400';

  if (isBonus) colorClass = 'from-red-500 to-red-700 text-white border-red-600 ring-2 ring-red-200';

  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center font-black text-lg shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),inset_0_-4px_4px_rgba(0,0,0,0.2)] border relative`}>
      <div className="absolute top-1 left-2 w-3 h-2 bg-white rounded-full opacity-40 blur-[1px]"></div>
      {number}
    </div>
  );
};

// Helper for Ticket Shape
const TicketCard: React.FC<{ numbers: number[]; date: string; status: string; drawNo: string }> = ({ numbers, date, status, drawNo }) => (
  <div className="relative w-full bg-white rounded-xl shadow-md overflow-hidden mb-4 group hover:-translate-y-1 transition-transform duration-300">
    <div className={`absolute left-0 top-0 bottom-0 w-2 ${status === 'Registered' ? 'bg-brand-500' : status === 'Won' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
    <div className="pl-6 pr-4 py-5 flex flex-col relative">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-black text-xl text-gray-900">제 {drawNo}회</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${status === 'Won' ? 'bg-green-50 text-green-600 border-green-200' :
              status === 'Registered' ? 'bg-brand-50 text-brand-600 border-brand-200' :
                'bg-gray-50 text-gray-400 border-gray-200'
              }`}>
              {status === 'Won' ? '당첨' : status === 'Registered' ? '추첨 대기' : '낙첨'}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-medium mt-0.5">{date}</p>
        </div>
      </div>
      <div className="flex justify-between items-center bg-gray-50 rounded-lg p-3 border border-gray-100 border-dashed">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {numbers.map((n, i) => (
            <span key={i} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-800 text-sm shadow-sm">
              {n}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full"></div>
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full"></div>
    </div>
  </div>
);

const Jackpot: React.FC = () => {
  const { userState, registerTicket, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'tickets'>('scan');

  // Countdown Logic
  const [timeLeft, setTimeLeft] = useState({ d: 2, h: 14, m: 32, s: 45 });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { d, h, m, s } = prev;
        if (s > 0) s--;
        else {
          s = 59;
          if (m > 0) m--;
          else {
            m = 59;
            if (h > 0) h--;
            else {
              h = 23;
              if (d > 0) d--;
            }
          }
        }
        return { d, h, m, s };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [scannedNumbers, setScannedNumbers] = useState<number[] | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setScannedImage(url);
      processImageWithOCR(url);
    }
  };

  const processImageWithOCR = async (url: string) => {
    setIsScanning(true);
    setScanStatus('이미지 분석 중...');
    setScannedNumbers(null);

    try {
      if (!(window as any).Tesseract) {
        throw new Error("OCR engine not loaded");
      }

      setScanStatus('텍스트 추출 중...');
      const { data: { text } } = await (window as any).Tesseract.recognize(url, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setScanStatus(`스캔 중... ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      console.log("OCR Result:", text);

      // Parse numbers from 1 to 45
      const foundNumbers = (text.match(/\b([1-9]|[1-3][0-9]|4[0-5])\b/g) || [])
        .map(Number)
        .filter((v: number, i: number, a: number[]) => a.indexOf(v) === i); // Unique

      // If we found at least 6 valid numbers, pick the first 6. 
      // Otherwise, fallback to simulation for demo purposes so user isn't stuck.
      if (foundNumbers.length >= 6) {
        setScannedNumbers(foundNumbers.slice(0, 6).sort((a: number, b: number) => a - b));
        showToast("번호 인식 성공!", "success");
      } else {
        // Fallback for demo if OCR fails (e.g. bad photo or non-ticket image)
        setScanStatus("번호를 찾을 수 없어 임의 번호를 생성합니다.");
        setTimeout(() => {
          const numbers = Array.from({ length: 6 }, () => Math.floor(Math.random() * 45) + 1).sort((a, b) => a - b);
          setScannedNumbers(numbers);
          showToast("자동 번호 생성 완료 (OCR 실패 대체)", "info");
        }, 1000);
      }
    } catch (error) {
      console.error(error);
      showToast("이미지 인식 오류. 다시 시도해주세요.", "error");
      setScannedImage(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirm = () => {
    if (scannedNumbers && scannedImage) {
      registerTicket(scannedNumbers, scannedImage);
      setScannedImage(null);
      setScannedNumbers(null);
      setActiveTab('tickets');
    }
  };

  return (
    <div className="flex flex-col pb-32 bg-gray-50 min-h-screen font-sans">
      {/* Responsive Container */}
      <div className="w-full max-w-4xl mx-auto">
        <style>{`
        @keyframes scan-beam {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>

        {/* 1. Ultra Premium Header */}
        <div className="w-full relative bg-[#1a1b2e] text-white pt-12 pb-16 px-6 rounded-b-[40px] shadow-2xl overflow-hidden">
          {/* Abstract Background Shapes */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-600/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-600/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/5 mb-6">
              <Sparkles size={14} className="text-yellow-400" />
              <span className="text-[11px] font-bold text-gray-200">매주 토요일 추첨</span>
            </div>

            <h1 className="text-5xl font-black mb-2 tracking-tight text-center bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
              1,500,000
            </h1>
            <p className="text-brand-300 font-bold text-lg mb-8 tracking-widest">VIEW JACKPOT</p>

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

        {/* 2. Floating Winning Numbers Card */}
        <div className="relative z-20 mx-4 md:mx-6 -mt-10 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-xl border border-gray-100/50">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center">
                  <History size={14} className="mr-1.5 text-gray-400" />
                  지난주 당첨 결과 (1125회)
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

        {/* 3. Main Action Section */}
        <div className="px-4 md:px-6">
          {/* Custom Segmented Control */}
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
                  {/* Simulated Camera UI */}
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
                    <h3 className="text-white font-bold text-lg">티켓 촬영하기</h3>
                    <p className="text-gray-300 text-xs mt-2">QR코드 또는 번호가 잘 보이게<br />정면에서 촬영해주세요</p>
                  </div>

                  <div className="absolute bottom-10 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold text-white border border-white/20">
                    참가 비용: 5 VIEW
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-4 shadow-xl border border-gray-100">
                  <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden mb-6">
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
                    {!isScanning && (
                      <div className="absolute bottom-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center shadow-lg">
                        <CheckCircle2 size={12} className="mr-1" /> 인식 완료
                      </div>
                    )}
                  </div>

                  {scannedNumbers && (
                    <div className="animate-in slide-in-from-bottom-2 duration-300">
                      <div className="mb-6 text-center">
                        <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">인식된 번호</p>
                        <div className="flex justify-center gap-2 flex-wrap">
                          {scannedNumbers.map(n => <LottoBall key={n} number={n} />)}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setScannedImage(null)}
                          className="flex-1 py-3.5 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200"
                        >
                          재촬영
                        </button>
                        <button
                          onClick={handleConfirm}
                          className="flex-1 py-3.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-600/30"
                        >
                          제출 (5 VIEW)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-4 fade-in duration-500 min-h-[400px]">
              {userState.tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <Ticket size={40} className="text-gray-300" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">아직 티켓이 없어요</h3>
                  <p className="text-gray-400 text-sm mt-2 mb-6">
                    지난주 낙첨된 로또 티켓이 있다면<br />
                    지금 바로 등록해보세요!
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
                  {userState.tickets.map(ticket => (
                    <TicketCard
                      key={ticket.id}
                      numbers={ticket.numbers}
                      date={ticket.drawDate}
                      status={ticket.status}
                      drawNo="1126"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Winners Stats Table (Replaces old card view) */}
          <div className="mt-8 mb-10">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 text-lg">지난 회차 당첨 현황</h3>
                <span className="text-xs text-gray-400">제 1125회 (2023.10.21 추첨)</span>
              </div>
              <button onClick={() => showToast("지난 당첨 내역 전체보기 준비중")} className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full">
                전체보기
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="flex bg-gray-50/80 border-b border-gray-100 py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <div className="w-16">순위</div>
                <div className="flex-1 text-center">1인당 당첨금</div>
                <div className="w-20 text-right">당첨자</div>
              </div>

              {[
                { rank: '1등', match: '6개 일치', prize: '이월', winners: '0명', color: 'text-gray-400', prizeColor: 'text-gray-400' },
                { rank: '2등', match: '5개 + 보너스', prize: '350,000 VIEW', winners: '3명', color: 'text-gray-500', prizeColor: 'text-gray-900' },
                { rank: '3등', match: '5개 일치', prize: '50,000 VIEW', winners: '45명', color: 'text-gray-500', prizeColor: 'text-gray-900' },
                { rank: '4등', match: '4개 일치', prize: '5,000 VIEW', winners: '1,284명', color: 'text-gray-500', prizeColor: 'text-gray-900' },
                { rank: '5등', match: '3개 일치', prize: '500 VIEW', winners: '24,502명', color: 'text-gray-500', prizeColor: 'text-gray-900' },
              ].map((item, i) => (
                <div key={i} className="flex items-center py-4 px-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <div className="w-16 flex flex-col">
                    <span className={`font-bold text-sm ${i === 0 ? 'text-yellow-600' : 'text-gray-700'}`}>{item.rank}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">{item.match}</span>
                  </div>
                  <div className={`flex-1 text-center font-bold text-sm ${item.prizeColor}`}>
                    {item.prize}
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-600 flex items-center justify-end">
                    {item.winners}
                    {i < 3 && <User size={12} className="ml-1 text-gray-300" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>{/* End Responsive Container */}
    </div>
  );
};

export default Jackpot;