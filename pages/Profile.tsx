import React, { useState, useEffect } from 'react';
import { Settings, LogOut, ChevronRight, Shield, Globe, Bell, Wallet, Award, Clock, Copy, Sparkles, X, Check, AlertTriangle, Coins, ExternalLink, RefreshCw, Lock, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { auth, functions } from '../firebase';
import { deleteUser } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { WalletButton } from '../components/WalletButton';
import { ClaimModal } from '../components/ClaimModal';
import { CONTRACTS, VIEW_TOKEN_ABI } from '../lib/wagmi';
import AdminPage from './Admin';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

// Persona Dashboard Component
const PersonaDashboard: React.FC<{ userData: any; onRefresh: () => void }> = ({ userData, onRefresh }) => {
  const [isCalculating, setIsCalculating] = useState(false);

  if (!userData?.persona) {
    return (
      <div className="mx-5 mt-6 bg-gradient-to-br from-indigo-900 to-violet-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

        <div className="relative z-10 text-center py-4">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Sparkles size={32} className="text-yellow-300" />
          </div>
          <h3 className="text-xl font-bold mb-2">나만의 페르소나 찾기</h3>
          <p className="text-indigo-200 text-sm mb-6 max-w-xs mx-auto">
            설문과 활동을 통해 나의 소비 성향을 분석하고<br />특별한 페르소나 카드를 획득하세요!
          </p>
          <button
            onClick={async () => {
              setIsCalculating(true);
              await onRefresh();
              setIsCalculating(false);
            }}
            disabled={isCalculating}
            className="px-6 py-3 bg-white text-indigo-700 rounded-xl font-bold font-sm hover:bg-indigo-50 transition-colors shadow-lg active:scale-95 disabled:opacity-70 flex items-center justify-center space-x-2 mx-auto"
          >
            {isCalculating ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>분석 중...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>페르소나 분석 시작</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const { persona } = userData;
  const traits = persona.traits || {};

  // Data for Radar Chart - 10 Traits Model
  const chartData = [
    { subject: '가격중시', A: (1 - (traits.priceVsBrand || 0.5)) * 100, fullMark: 100 },
    { subject: '충동성', A: (traits.impulseBuying || 0.5) * 100, fullMark: 100 },
    { subject: '얼리어답터', A: (traits.earlyAdopter || 0.5) * 100, fullMark: 100 },
    { subject: '온라인', A: (traits.onlinePreference || 0.5) * 100, fullMark: 100 },
    { subject: '소비력', A: (traits.purchasingPower || 0.5) * 100, fullMark: 100 },
    { subject: '브랜드충성', A: (traits.brandLoyalty || 0.5) * 100, fullMark: 100 },
    { subject: '사회적영향', A: (traits.socialInfluence || 0.5) * 100, fullMark: 100 },
    { subject: 'ESG가치', A: (traits.sustainabilityValue || 0.5) * 100, fullMark: 100 },
    { subject: '경험추구', A: (traits.experienceSeeker || 0.5) * 100, fullMark: 100 },
    { subject: '계획구매', A: (traits.planningHorizon || 0.5) * 100, fullMark: 100 },
  ];

  return (
    <div className="mx-5 mt-6 space-y-4">
      {/* 1. Main Persona Card */}
      <div className="bg-gradient-to-br from-[#1a1b2e] to-[#2d2e42] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-brand-300 text-xs font-bold tracking-wider uppercase mb-1 block">Data Value</span>
              <h2 className="text-3xl font-bold flex items-baseline gap-1">
                ₩ {persona.dataValue?.toLocaleString() || 0}
                <span className="text-xs text-gray-400 font-normal">/월 예측</span>
              </h2>
            </div>
            <button
              onClick={async () => {
                setIsCalculating(true);
                await onRefresh();
                setIsCalculating(false);
              }}
              disabled={isCalculating}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              <RefreshCw size={18} className={`text-white ${isCalculating ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex gap-4">
            {/* Radar Chart */}
            <div className="flex-1 h-[140px] -ml-6">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="60%" data={chartData}>
                  <PolarGrid stroke="#ffffff30" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="My Traits"
                    dataKey="A"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="#8b5cf6"
                    fillOpacity={0.4}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Traits */}
            <div className="w-1/3 flex flex-col justify-center space-y-2">
              <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                <span className="text-[10px] text-gray-400 block mb-1">Top Interest</span>
                <span className="text-sm font-bold text-brand-300">
                  {persona.interests?.primary || '-'}
                </span>
              </div>
              <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                <span className="text-[10px] text-gray-400 block mb-1">Style</span>
                <span className="text-sm font-bold text-brand-300">
                  {traits.earlyAdopter > 0.6 ? 'Trend Setter' : 'Classic'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Attribute Scores Section - NEW */}
      {persona.attributeScores && Object.keys(persona.attributeScores).length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">나의 속성 프로필</h3>
                <p className="text-xs text-gray-500">광고 매칭에 활용되는 속성 점수</p>
              </div>
            </div>
            <span className="text-xs text-gray-400">
              {userData.attributeScoresCount || Object.keys(persona.attributeScores).length}개 속성
            </span>
          </div>

          {/* Top Attributes Tags */}
          {userData.topAttributes && userData.topAttributes.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Top 속성</p>
              <div className="flex flex-wrap gap-1.5">
                {userData.topAttributes.slice(0, 5).map((attr: string, i: number) => {
                  const [type, value] = attr.split('.');
                  const colors = [
                    'bg-purple-100 text-purple-700',
                    'bg-blue-100 text-blue-700',
                    'bg-green-100 text-green-700',
                    'bg-orange-100 text-orange-700',
                    'bg-pink-100 text-pink-700',
                  ];
                  return (
                    <span key={attr} className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[i]}`}>
                      {value?.replace(/_/g, ' ') || attr}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attribute Categories */}
          <div className="space-y-3">
            {/* Price Positioning */}
            {Object.entries(persona.attributeScores)
              .filter(([key]) => key.startsWith('Price_Positioning'))
              .length > 0 && (
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xs font-medium text-purple-700 mb-2">💰 가격 포지셔닝</p>
                  <div className="space-y-2">
                    {Object.entries(persona.attributeScores)
                      .filter(([key]) => key.startsWith('Price_Positioning'))
                      .map(([key, score]) => {
                        const value = key.split('.')[1];
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-16">{value?.replace(/_/g, ' ')}</span>
                            <div className="flex-1 h-2 bg-purple-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                                style={{ width: `${(score as number) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-purple-600 font-medium w-10">
                              {Math.round((score as number) * 100)}%
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

            {/* Sustainability */}
            {Object.entries(persona.attributeScores)
              .filter(([key]) => key.startsWith('Sustainability'))
              .length > 0 && (
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs font-medium text-green-700 mb-2">🌱 지속가능성</p>
                  <div className="space-y-2">
                    {Object.entries(persona.attributeScores)
                      .filter(([key]) => key.startsWith('Sustainability'))
                      .map(([key, score]) => {
                        const value = key.split('.')[1];
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-16">{value?.replace(/_/g, ' ')}</span>
                            <div className="flex-1 h-2 bg-green-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                                style={{ width: `${(score as number) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-green-600 font-medium w-10">
                              {Math.round((score as number) * 100)}%
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

            {/* Channel Preference */}
            {Object.entries(persona.attributeScores)
              .filter(([key]) => key.startsWith('Channel_Preference'))
              .length > 0 && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs font-medium text-blue-700 mb-2">📱 채널 선호</p>
                  <div className="space-y-2">
                    {Object.entries(persona.attributeScores)
                      .filter(([key]) => key.startsWith('Channel_Preference'))
                      .map(([key, score]) => {
                        const value = key.split('.')[1];
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-16">{value?.replace(/_/g, ' ')}</span>
                            <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                                style={{ width: `${(score as number) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-blue-600 font-medium w-10">
                              {Math.round((score as number) * 100)}%
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

            {/* Purchase Decision Style */}
            {Object.entries(persona.attributeScores)
              .filter(([key]) => key.startsWith('Purchase_Decision_Style'))
              .length > 0 && (
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-xs font-medium text-orange-700 mb-2">🛒 구매 스타일</p>
                  <div className="space-y-2">
                    {Object.entries(persona.attributeScores)
                      .filter(([key]) => key.startsWith('Purchase_Decision_Style'))
                      .map(([key, score]) => {
                        const value = key.split('.')[1];
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-16">{value?.replace(/_/g, ' ')}</span>
                            <div className="flex-1 h-2 bg-orange-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                                style={{ width: `${(score as number) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-orange-600 font-medium w-10">
                              {Math.round((score as number) * 100)}%
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

            {/* Business Model */}
            {Object.entries(persona.attributeScores)
              .filter(([key]) => key.startsWith('Business_Model'))
              .length > 0 && (
                <div className="bg-indigo-50 rounded-xl p-3">
                  <p className="text-xs font-medium text-indigo-700 mb-2">🏢 비즈니스 모델</p>
                  <div className="space-y-2">
                    {Object.entries(persona.attributeScores)
                      .filter(([key]) => key.startsWith('Business_Model'))
                      .map(([key, score]) => {
                        const value = key.split('.')[1];
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 w-16">{value?.replace(/_/g, ' ')}</span>
                            <div className="flex-1 h-2 bg-indigo-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full"
                                style={{ width: `${(score as number) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-indigo-600 font-medium w-10">
                              {Math.round((score as number) * 100)}%
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
          </div>

          {/* Last Updated */}
          {persona.attributeScoresUpdatedAt && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              마지막 업데이트: {new Date(persona.attributeScoresUpdatedAt?.seconds * 1000 || Date.now()).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
      )}

      {/* 3. Persona Collection */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3 px-1 ml-1 flex items-center justify-between">
          <span>보유 페르소나</span>
          <span className="text-xs text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">Coming Soon</span>
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {(persona.cards || []).map((card: any, idx: number) => (
            <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shadow-inner">
                {card.icon}
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">{card.name}</h4>
                <div className="flex items-center space-x-1 mt-0.5">
                  <div className="h-1.5 w-12 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-400 to-purple-400"
                      style={{ width: `${(card.level || 1) * 10}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">Lv.{card.level}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Locked Slots */}
          {[...Array(Math.max(0, 4 - (persona.cards?.length || 0)))].map((_, i) => (
            <div key={`locked-${i}`} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 border-dashed flex items-center justify-center space-x-2 text-gray-300">
              <Lock size={16} />
              <span className="text-xs font-bold">Locked</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Profile: React.FC = () => {
  const { userState, logout, showToast } = useApp();
  const [language, setLanguage] = useState('한국어');
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [personaData, setPersonaData] = useState<any>(null);
  const [gradeData, setGradeData] = useState<any>(null);

  // Fetch Persona Data
  const fetchPersona = async () => {
    try {
      const getPersonaFn = httpsCallable(functions, 'getPersona');
      const result = await getPersonaFn();
      const data = result.data as any;
      console.log("Persona fetched:", data);

      if (data.persona) {
        // Merge user-level attributes with persona data
        const enrichedPersona = {
          ...data.persona,
          attributeScores: data.attributeScores || data.persona.attributeScores || {},
          attributeScoresUpdatedAt: data.attributeScoresUpdatedAt || data.persona.attributeScoresUpdatedAt,
        };
        setPersonaData({
          persona: enrichedPersona,
          topAttributes: data.topAttributes || [],
          attributeScoresCount: data.attributeScoresCount || 0,
        });
      } else if (data.needsCalculation) {
        // Auto calculate if needed
        const calcPersonaFn = httpsCallable(functions, 'calculatePersona');
        const calcResult = await calcPersonaFn();
        const calcData = calcResult.data as any;
        if (calcData.success) {
          setPersonaData({
            persona: calcData.persona,
            topAttributes: calcData.topAttributes || [],
            attributeScoresCount: calcData.attributeScoresCount || 0,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching persona:", error);
    }
  };

  // Fetch Grade Data
  const fetchGrade = async () => {
    try {
      // Record daily activity (check-in)
      const recordActivityFn = httpsCallable(functions, 'recordDailyActivity');
      await recordActivityFn({});

      // Get user grade
      const getGradeFn = httpsCallable(functions, 'getUserGrade');
      const result = await getGradeFn();
      const data = result.data as any;

      if (data.success) {
        setGradeData(data);
      }
    } catch (error) {
      console.warn("Error fetching grade:", error);
      // Set default grade
      setGradeData({
        grade: { id: 'bronze', name: 'Bronze', nameKo: '브론즈', icon: '🥉', color: 'text-orange-700', bgColor: 'bg-orange-100' },
        daysSinceJoin: 0,
        activity: { activeDays: 0, currentStreak: 0, totalActivityScore: 0 },
      });
    }
  };

  useEffect(() => {
    if (userState.uid) {
      fetchPersona();
      fetchGrade();
    }
  }, [userState.uid]);


  // Referral state
  const [referrerCodeInput, setReferrerCodeInput] = useState('');
  const [isSettingReferrer, setIsSettingReferrer] = useState(false);

  // Handle setting referrer
  const handleSetReferrer = async () => {
    if (!referrerCodeInput || referrerCodeInput.length < 10) {
      showToast('올바른 추천 코드를 입력해주세요.', 'error');
      return;
    }

    if (!functions) {
      showToast('서비스 초기화 중입니다.', 'error');
      return;
    }

    setIsSettingReferrer(true);
    try {
      const setReferrerFn = httpsCallable(functions, 'setReferrer');
      const result = await setReferrerFn({ referralCode: referrerCodeInput });
      const data = result.data as any;

      if (data.success) {
        showToast('추천인이 등록되었습니다! 🎉', 'success');
        setReferrerCodeInput('');
      }
    } catch (error: any) {
      console.error('setReferrer error:', error);
      const message = error.message || '추천인 등록에 실패했습니다.';
      if (message.includes('not-found')) {
        showToast('존재하지 않는 추천 코드입니다.', 'error');
      } else if (message.includes('already-exists')) {
        showToast('이미 추천인이 등록되어 있습니다.', 'error');
      } else {
        showToast(message, 'error');
      }
    }
    setIsSettingReferrer(false);
  };

  // Web3 Wallet Hooks
  const { address, isConnected, chainId } = useAccount();
  const { data: maticBalance } = useBalance({ address });

  // Get contract addresses based on chain
  const contractAddresses = chainId ? CONTRACTS[chainId as keyof typeof CONTRACTS] : null;

  // Read VIEW token balance from blockchain
  const { data: viewTokenBalance } = useReadContract({
    address: contractAddresses?.VIEW_TOKEN,
    abi: VIEW_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Claimable amount from Firestore (off-chain points are liquid and claimable)
  const claimableAmount = userState.balance ?? 0;

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;

    try {
      await deleteUser(auth.currentUser);
      showToast("회원탈퇴가 완료되었습니다.", "success");
      // AppContext will detect auth change and calling logout() locally might be redundant but safe
      // Actually deleteUser signs out automatically.
      // We rely on onAuthStateChanged in AppContext to clear state.
    } catch (error: any) {
      console.error("Delete account error:", error);
      if (error.code === 'auth/requires-recent-login') {
        showToast("보안을 위해 다시 로그인 후 시도해주세요.", "error");
        // Optionally force logout here so they can re-login
        logout();
      } else {
        showToast("회원탈퇴 중 오류가 발생했습니다.", "error");
      }
    }
  };

  const handleCopyUid = () => {
    navigator.clipboard.writeText(userState.uid || "Guest");
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

  const refreshPersona = async () => {
    try {
      const calcPersonaFn = httpsCallable(functions, 'calculatePersona');
      const result = await calcPersonaFn();
      const data = result.data as any;
      if (data.success) {
        setPersonaData({ persona: data.persona });
        showToast("페르소나 분석이 완료되었습니다!", "success");
      }
    } catch (error) {
      console.error("Refresh persona error:", error);
      showToast("분석 중 오류가 발생했습니다.", "error");
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-32 bg-gray-50">
      {/* Responsive Container */}
      <div className="w-full max-w-4xl mx-auto">

        {/* Language Selection Modal */}
        {isLangModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm md:max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
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

        {/* Delete Account Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm md:max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">정말 떠나시겠어요?</h3>
                <p className="text-gray-500 text-sm mb-6">
                  회원 탈퇴 시 모든 포인트와 계정 정보가<br />영구적으로 삭제되며 복구할 수 없습니다.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full py-3.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                  >
                    네, 탈퇴하겠습니다
                  </button>
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                  >
                    취소하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. Header Section */}
        <div className="relative bg-gradient-to-br from-indigo-900 to-violet-900 text-white pt-10 pb-24 px-6 rounded-b-[40px] shadow-2xl overflow-hidden">
          {/* Abstract Background */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-brand-600/20 rounded-full blur-[80px]"></div>
            <div className="absolute bottom-[-10%] left-[10%] w-60 h-60 bg-blue-500/20 rounded-full blur-[60px]"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="relative group cursor-pointer">
              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-brand-400 to-blue-500 shadow-xl shadow-brand-500/30">
                <img src={userState.photoURL || "https://picsum.photos/200/200"} alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-[#1a1b2e]" />
              </div>
              <div className="absolute bottom-1 right-1 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#1a1b2e] shadow-lg">
                LV.{personaData?.persona?.dataValue ? Math.floor(personaData.persona.dataValue / 1000) + 1 : 1}
              </div>
            </div>

            <h1 className="text-2xl font-bold mt-4 mb-1 flex items-center">
              {userState.displayName || "게스트"}
              <Sparkles size={16} className="text-yellow-400 ml-2" fill="currentColor" />
            </h1>

            {userState.referralCode ? (
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}?ref=${userState.referralCode}`;
                  navigator.clipboard.writeText(shareUrl);
                  showToast('추천 링크가 복사되었습니다!', 'success');
                }}
                className="flex items-center space-x-2 text-emerald-300 text-xs bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors cursor-pointer"
              >
                <span>🔗 {userState.referralCode}</span>
                <Copy size={12} />
              </button>
            ) : (
              <button
                onClick={async () => {
                  try {
                    const generateFn = httpsCallable(functions, 'generateReferralCode');
                    const res = await generateFn();
                    const data = res.data as any;
                    if (data.success) {
                      showToast('초대 코드가 생성되었습니다!', 'success');
                      window.location.reload();
                    }
                  } catch (e: any) {
                    showToast('코드 생성 실패', 'error');
                  }
                }}
                className="flex items-center space-x-2 text-gray-400 text-xs bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span>초대 코드 생성하기</span>
                <Plus size={12} />
              </button>
            )}
          </div>

        </div>

        {/* 2. Stats Dashboard (Floating) */}
        <div className="px-5 -mt-16 relative z-20">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-4 shadow-xl border border-white/40 grid grid-cols-3 divide-x divide-gray-100">
            <div className="flex flex-col items-center justify-center p-2">
              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-2">
                <Wallet size={16} />
              </div>
              <span className="text-gray-900 font-bold text-sm">{userState.balance.toLocaleString()} VP</span>
              <span className="text-gray-400 text-[10px]">View Point</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2">
              <div className={`w-8 h-8 rounded-full ${gradeData?.grade?.bgColor || 'bg-yellow-50'} flex items-center justify-center mb-2 text-lg`}>
                {gradeData?.grade?.icon || '🥉'}
              </div>
              <span className={`font-bold text-sm ${gradeData?.grade?.color || 'text-yellow-600'}`}>
                {gradeData?.grade?.nameKo || '브론즈'}
              </span>
              <span className="text-gray-400 text-[10px]">현재 등급</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Clock size={16} />
              </div>
              <span className="text-gray-900 font-bold text-sm">
                {gradeData?.activity?.activeDays || 0}일
              </span>
              <span className="text-gray-400 text-[10px]">활성 사용</span>
            </div>
          </div>

        </div>

        {/* 2.5 Persona Dashboard */}
        <PersonaDashboard userData={personaData} onRefresh={refreshPersona} />


        {/* 3. Web3 Wallet Section */}
        <div className="px-5 mt-6">
          <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-3xl p-5 shadow-xl text-white overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Coins size={20} />
                  <h3 className="text-sm font-bold">Web3 지갑</h3>
                </div>
                {isConnected && chainId && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    {chainId === 137 ? 'Polygon' : chainId === 80002 ? 'Amoy Testnet' : `Chain ${chainId}`}
                  </span>
                )}
              </div>

              {!isConnected ? (
                <div className="text-center py-4">
                  <p className="text-brand-200 text-sm mb-4">
                    지갑을 연결하여 VIEW 토큰을 클레임하세요
                  </p>
                  <WalletButton className="w-full" />

                  {/* Claim Button */}
                  {isConnected && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-gray-400 text-xs">토큰 전환 가능</span>
                        <span className="text-brand-300 font-medium text-xs">{claimableAmount.toLocaleString()} VP → VIEW</span>
                      </div>
                      <button
                        onClick={() => {
                          if (typeof setIsClaimModalOpen === 'function') {
                            setIsClaimModalOpen(true);
                          } else {
                            console.error("claimModal state is missing");
                            // Fallback or alert if state missing
                            (window as any).alert("Claim Modal State Error");
                          }
                        }}
                        className="w-full bg-brand-600/20 border border-brand-500/30 text-brand-200 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-brand-600/30 transition-all"
                      >
                        <Coins size={16} />
                        <span>토큰으로 전환하기 (Claim)</span>
                      </button>
                    </div>
                  )}

                  {typeof isClaimModalOpen !== 'undefined' && isClaimModalOpen && (
                    <ClaimModal
                      onClose={() => setIsClaimModalOpen(false)}
                      claimableAmount={claimableAmount}
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Wallet Address */}
                  <div className="bg-white/10 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-brand-200 text-xs">연결된 지갑</p>
                      <p className="font-mono text-sm">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(address || '');
                        showToast('주소가 복사되었습니다.');
                      }}
                      className="p-2 bg-white/10 rounded-lg hover:bg-white/20"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  {/* Balances */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-xl p-3">
                      <p className="text-brand-200 text-xs mb-1">VIEW 토큰</p>
                      <p className="font-bold text-lg">
                        {viewTokenBalance
                          ? Number(formatEther(viewTokenBalance)).toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : '0'
                        }
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3">
                      <p className="text-brand-200 text-xs mb-1">MATIC (가스)</p>
                      <p className="font-bold text-lg">
                        {maticBalance
                          ? Number(formatEther(maticBalance.value)).toLocaleString(undefined, { maximumFractionDigits: 4 })
                          : '0'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Claim Button */}
                  {claimableAmount >= 10 && (
                    <button
                      onClick={() => setIsClaimModalOpen(true)}
                      className="w-full py-3 bg-white text-brand-600 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-brand-50 active:scale-[0.98] transition-all shadow-lg"
                    >
                      <Coins size={18} />
                      <span>{claimableAmount.toLocaleString()} VP → VIEW 토큰 전환</span>
                    </button>
                  )}

                  {/* Polygonscan Link */}
                  <a
                    href={`https://${chainId === 137 ? '' : 'amoy.'}polygonscan.com/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-1 text-brand-200 text-xs hover:text-white"
                  >
                    <span>Polygonscan에서 보기</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Claim Modal */}
        {isClaimModalOpen && (
          <ClaimModal
            onClose={() => setIsClaimModalOpen(false)}
            claimableAmount={claimableAmount}
          />
        )}

        {/* 3.5 Referral Section */}
        <div className="px-5 mt-6">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 shadow-xl text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Sparkles size={20} />
                  <h3 className="text-sm font-bold">친구 초대</h3>
                </div>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                  {(userState.directReferrals ?? 0) + (userState.indirectReferrals ?? 0)} 명 초대
                </span>
              </div>

              {/* My Referral Code */}
              {userState.referralCode ? (
                <div className="bg-white/10 rounded-xl p-4 mb-4">
                  <p className="text-emerald-200 text-xs mb-1">내 추천 코드</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl font-bold tracking-wider">
                      {userState.referralCode}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(userState.referralCode || '');
                          showToast('추천 코드가 복사되었습니다!');
                        }}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => {
                          const shareUrl = `${window.location.origin}?ref=${userState.referralCode}`;
                          if (navigator.share) {
                            navigator.share({
                              title: 'VIEW 앱 추천',
                              text: `친구 추천 코드: ${userState.referralCode}`,
                              url: shareUrl,
                            });
                          } else {
                            navigator.clipboard.writeText(shareUrl);
                            showToast('추천 링크가 복사되었습니다!');
                          }
                        }}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/10 rounded-xl p-4 mb-4 text-center">
                  <p className="text-emerald-200 text-xs mb-2">아직 초대 코드가 없으신가요?</p>
                  <button
                    onClick={async () => {
                      try {
                        const generateFn = httpsCallable(functions, 'generateReferralCode');
                        const res = await generateFn();
                        const data = res.data as any;
                        if (data.success) {
                          showToast('초대 코드가 생성되었습니다! 새로고침 해주세요.');
                          // In a real app, update userState context here
                          window.location.reload();
                        }
                      } catch (e: any) {
                        console.error(e);
                        showToast('코드 생성 실패: ' + e.message, 'error');
                      }
                    }}
                    className="px-4 py-2 bg-white text-emerald-600 rounded-lg font-bold text-sm hover:bg-emerald-50 transition-colors shadow-sm"
                  >
                    초대 코드 생성하기
                  </button>
                </div>
              )}

              {/* Referral Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{userState.directReferrals ?? 0}</p>
                  <p className="text-[10px] text-emerald-200">직접 추천</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{userState.indirectReferrals ?? 0}</p>
                  <p className="text-[10px] text-emerald-200">간접 추천</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{(userState.paidReferralRewards ?? 0).toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-200">받은 보상</p>
                </div>
              </div>

              {/* Enter Referrer Code (if no referrer yet) */}
              {!userState.referrerL1 && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/20">
                  <p className="text-xs text-emerald-200 mb-2">추천인이 있으신가요?</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="추천 코드 입력 (VIEW-XXXXXX)"
                      className="flex-1 bg-white/10 text-white placeholder-white/50 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                      onChange={(e) => setReferrerCodeInput(e.target.value.toUpperCase())}
                      value={referrerCodeInput}
                      maxLength={11}
                    />
                    <button
                      onClick={handleSetReferrer}
                      disabled={isSettingReferrer || referrerCodeInput.length < 10}
                      className="px-4 py-2 bg-white text-emerald-600 rounded-lg font-bold text-sm hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSettingReferrer ? '...' : '등록'}
                    </button>
                  </div>
                </div>
              )}

              {/* Already has referrer */}
              {userState.referrerL1 && (
                <div className="bg-white/10 rounded-lg p-3 flex items-center gap-2">
                  <Check size={16} className="text-emerald-200" />
                  <span className="text-xs text-emerald-200">추천인이 등록되어 있습니다</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3.1 Prediction History */}
        <div className="px-5 mt-6">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-500" />
              <span>BTC 예측 기록</span>
            </h3>

            {userState.predictions.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">
                아직 참여한 기록이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {userState.predictions.slice().reverse().map((pred: any) => (
                  <div key={pred.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-700">라운드 #{pred.roundId || '?'}</span>
                        <span className="text-[10px] text-gray-400">{pred.predictedAt?.toDate ? pred.predictedAt.toDate().toLocaleDateString() : new Date(pred.predictedAt || Date.now()).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        예측: <span className="font-medium text-gray-800">${pred.predictedPrice?.toLocaleString() || '-'}</span>
                      </div>
                      {pred.status !== 'Pending' && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          실제: ${pred.actualPrice?.toLocaleString() || '-'}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      {pred.status === 'Pending' ? (
                        <span className="px-2 py-1 bg-gray-200 text-gray-500 text-[10px] rounded-full font-bold">진행중</span>
                      ) : pred.status === 'Won' ? (
                        <div className="flex flex-col items-end">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] rounded-full font-bold mb-1">성공!</span>
                          <span className="text-xs font-bold text-yellow-600">+{pred.reward?.toLocaleString()} VIEW</span>
                          {pred.jackpotWon && <span className="text-[10px] font-black text-red-500 animate-pulse">JACKPOT!!</span>}
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-400 text-[10px] rounded-full font-bold">실패</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. Settings & Menu */}
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

          {/* Delete Account Button */}
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full py-2 text-gray-300 text-xs hover:text-red-400 underline decoration-gray-300 hover:decoration-red-400 transition-colors"
          >
            회원탈퇴
          </button>

          {/* Admin Settings (for development) */}
          <button
            onClick={() => setIsAdminOpen(true)}
            className="w-full py-4 rounded-2xl border border-brand-100 text-brand-600 font-bold text-sm bg-brand-50/50 hover:bg-brand-50 transition-colors flex items-center justify-center space-x-2"
          >
            <Settings size={16} />
            <span>Admin Settings</span>
          </button>

          <div className="text-center pb-8 pt-2">
            <p className="text-[10px] text-gray-300">
              VIEW App v1.0.2 (Build 20231027)<br />
              Powered by Web3 Technology
            </p>
          </div>
        </div>

        {/* Admin Modal */}
        {isAdminOpen && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setIsAdminOpen(false)}
                className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            <div className="h-full overflow-y-auto">
              <AdminPage />
            </div>
          </div>
        )}
      </div>{/* End Responsive Container */}
    </div>
  );
};

export default Profile;