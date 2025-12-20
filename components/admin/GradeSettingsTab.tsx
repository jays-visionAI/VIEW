import React, { useState, useEffect } from 'react';
import { Save, Loader2, RefreshCw, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

interface GradeTier {
    id: string;
    name: string;
    nameKo: string;
    icon: string;
    color: string;
    bgColor: string;
    requiredActiveDays: number;
    requiredActivityScore: number;
    requiredStreak: number;
    requiredReferrals: number;
    vpMultiplier: number;
    stakingBoost: number;
    referralBonus: number;
}

interface ActivityScoreConfig {
    dailyCheckIn: number;
    adWatch: number;
    adWatchDailyMax: number;
    swipePer10: number;
    swipeDailyMax: number;
    prediction: number;
    surveyAnswer: number;
    surveyDailyMax: number;
    referral: number;
}

const GradeSettingsTab: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [expandedSection, setExpandedSection] = useState<'tiers' | 'scores' | null>('tiers');

    const [tiers, setTiers] = useState<GradeTier[]>([]);
    const [activityScores, setActivityScores] = useState<ActivityScoreConfig>({
        dailyCheckIn: 10,
        adWatch: 5,
        adWatchDailyMax: 25,
        swipePer10: 1,
        swipeDailyMax: 5,
        prediction: 10,
        surveyAnswer: 3,
        surveyDailyMax: 30,
        referral: 50,
    });

    // Load settings
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const getSettingsFn = httpsCallable(functions, 'getGradeSettings');
            const result = await getSettingsFn();
            const data = result.data as { success: boolean; settings: any };

            if (data.success && data.settings) {
                setTiers(data.settings.tiers || []);
                setActivityScores(data.settings.activityScores || activityScores);
            }
        } catch (error) {
            console.error('Failed to load grade settings:', error);
            setMessage({ type: 'error', text: '설정 로드 실패' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updateSettingsFn = httpsCallable(functions, 'updateGradeSettings');
            await updateSettingsFn({ tiers, activityScores });
            setMessage({ type: 'success', text: '설정이 저장되었습니다.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: '저장 실패: ' + error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const updateTier = (index: number, field: keyof GradeTier, value: any) => {
        const newTiers = [...tiers];
        (newTiers[index] as any)[field] = value;
        setTiers(newTiers);
    };

    const updateActivityScore = (field: keyof ActivityScoreConfig, value: number) => {
        setActivityScores({ ...activityScores, [field]: value });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">등급 시스템 설정</h2>
                    <p className="text-sm text-gray-500 mt-1">등급별 조건과 활동 점수를 설정합니다</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadSettings}
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        저장
                    </button>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            {/* Grade Tiers Section */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button
                    onClick={() => setExpandedSection(expandedSection === 'tiers' ? null : 'tiers')}
                    className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🏆</span>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-900">등급 체계</h3>
                            <p className="text-sm text-gray-500">{tiers.length}개 등급</p>
                        </div>
                    </div>
                    {expandedSection === 'tiers' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {expandedSection === 'tiers' && (
                    <div className="p-4 space-y-4">
                        {tiers.map((tier, index) => (
                            <div key={tier.id} className={`p-4 rounded-xl border-2 ${tier.bgColor} border-gray-200`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-3xl">{tier.icon}</span>
                                    <div>
                                        <input
                                            type="text"
                                            value={tier.nameKo}
                                            onChange={(e) => updateTier(index, 'nameKo', e.target.value)}
                                            className="font-bold text-lg bg-transparent border-b border-gray-300 focus:border-brand-500 outline-none"
                                        />
                                        <p className="text-xs text-gray-500">{tier.name}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500">활성 사용일</label>
                                        <input
                                            type="number"
                                            value={tier.requiredActiveDays}
                                            onChange={(e) => updateTier(index, 'requiredActiveDays', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">활동 점수</label>
                                        <input
                                            type="number"
                                            value={tier.requiredActivityScore}
                                            onChange={(e) => updateTier(index, 'requiredActivityScore', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">연속 출석</label>
                                        <input
                                            type="number"
                                            value={tier.requiredStreak}
                                            onChange={(e) => updateTier(index, 'requiredStreak', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">추천인 수</label>
                                        <input
                                            type="number"
                                            value={tier.requiredReferrals}
                                            onChange={(e) => updateTier(index, 'requiredReferrals', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-200">
                                    <div>
                                        <label className="text-xs text-gray-500">VP 배수</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={tier.vpMultiplier}
                                            onChange={(e) => updateTier(index, 'vpMultiplier', parseFloat(e.target.value) || 1)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">스테이킹 부스트 (%)</label>
                                        <input
                                            type="number"
                                            value={tier.stakingBoost}
                                            onChange={(e) => updateTier(index, 'stakingBoost', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">추천 보너스 (%)</label>
                                        <input
                                            type="number"
                                            value={tier.referralBonus}
                                            onChange={(e) => updateTier(index, 'referralBonus', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Activity Scores Section */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button
                    onClick={() => setExpandedSection(expandedSection === 'scores' ? null : 'scores')}
                    className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚡</span>
                        <div className="text-left">
                            <h3 className="font-bold text-gray-900">활동 점수</h3>
                            <p className="text-sm text-gray-500">활동별 점수 배분</p>
                        </div>
                    </div>
                    {expandedSection === 'scores' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {expandedSection === 'scores' && (
                    <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Check-in */}
                            <div className="p-4 bg-blue-50 rounded-xl">
                                <h4 className="font-bold text-blue-800 mb-3">📅 출석 체크</h4>
                                <div>
                                    <label className="text-xs text-gray-500">일일 출석 점수</label>
                                    <input
                                        type="number"
                                        value={activityScores.dailyCheckIn}
                                        onChange={(e) => updateActivityScore('dailyCheckIn', parseInt(e.target.value) || 0)}
                                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Ad Watch */}
                            <div className="p-4 bg-green-50 rounded-xl">
                                <h4 className="font-bold text-green-800 mb-3">📺 광고 시청</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500">개당 점수</label>
                                        <input
                                            type="number"
                                            value={activityScores.adWatch}
                                            onChange={(e) => updateActivityScore('adWatch', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">일일 최대</label>
                                        <input
                                            type="number"
                                            value={activityScores.adWatchDailyMax}
                                            onChange={(e) => updateActivityScore('adWatchDailyMax', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Swipe */}
                            <div className="p-4 bg-purple-50 rounded-xl">
                                <h4 className="font-bold text-purple-800 mb-3">👆 스와이프</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500">10회당 점수</label>
                                        <input
                                            type="number"
                                            value={activityScores.swipePer10}
                                            onChange={(e) => updateActivityScore('swipePer10', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">일일 최대</label>
                                        <input
                                            type="number"
                                            value={activityScores.swipeDailyMax}
                                            onChange={(e) => updateActivityScore('swipeDailyMax', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Prediction */}
                            <div className="p-4 bg-orange-50 rounded-xl">
                                <h4 className="font-bold text-orange-800 mb-3">📊 가격 예측</h4>
                                <div>
                                    <label className="text-xs text-gray-500">참여당 점수</label>
                                    <input
                                        type="number"
                                        value={activityScores.prediction}
                                        onChange={(e) => updateActivityScore('prediction', parseInt(e.target.value) || 0)}
                                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Survey */}
                            <div className="p-4 bg-teal-50 rounded-xl">
                                <h4 className="font-bold text-teal-800 mb-3">📝 설문 응답</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500">문항당 점수</label>
                                        <input
                                            type="number"
                                            value={activityScores.surveyAnswer}
                                            onChange={(e) => updateActivityScore('surveyAnswer', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">일일 최대</label>
                                        <input
                                            type="number"
                                            value={activityScores.surveyDailyMax}
                                            onChange={(e) => updateActivityScore('surveyDailyMax', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Referral */}
                            <div className="p-4 bg-pink-50 rounded-xl">
                                <h4 className="font-bold text-pink-800 mb-3">👥 추천인 유치</h4>
                                <div>
                                    <label className="text-xs text-gray-500">추천당 점수</label>
                                    <input
                                        type="number"
                                        value={activityScores.referral}
                                        onChange={(e) => updateActivityScore('referral', parseInt(e.target.value) || 0)}
                                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-bold text-gray-700 mb-2">📊 일일 최대 활동 점수</h4>
                <p className="text-2xl font-bold text-brand-600">
                    {activityScores.dailyCheckIn + activityScores.adWatchDailyMax + activityScores.swipeDailyMax + activityScores.prediction + activityScores.surveyDailyMax} 점
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    출석({activityScores.dailyCheckIn}) + 광고({activityScores.adWatchDailyMax}) + 스와이프({activityScores.swipeDailyMax}) + 예측({activityScores.prediction}) + 설문({activityScores.surveyDailyMax})
                </p>
            </div>
        </div>
    );
};

export default GradeSettingsTab;
