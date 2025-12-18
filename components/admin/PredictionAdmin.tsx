import React, { useState, useEffect } from 'react';
import {
    TrendingUp, Settings, RefreshCw, Loader2, Save, Users,
    DollarSign, Trophy, Calendar, ChevronRight, Eye, X
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

interface PredictionRound {
    id: string;
    roundId?: number;
    date: string;
    status: 'open' | 'closed' | 'settled';
    actualPrice?: number;
    winningRange?: string;
    totalPool: number;
    jackpotPool?: number;
    jackpotCarriedOver?: number;
    participantCount: number;
    totalWinners: number;
    totalDistributed: number;
    winnerPoolPercent: number;
    winners?: {
        userId: string;
        displayName: string;
        betAmount: number;
        reward: number;
        isJackpot?: boolean;
    }[];
    jackpotWinners?: {
        userId: string;
        displayName: string;
        amount: number;
    }[];
}

interface PredictionSettings {
    enabled: boolean;
    winnerPoolPercent: number;
    minBetAmount: number;
    maxBetAmount: number;
    priceRangeStep: number;
}

const PredictionAdmin: React.FC = () => {
    const [settings, setSettings] = useState<PredictionSettings>({
        enabled: true,
        winnerPoolPercent: 70,
        minBetAmount: 1,
        maxBetAmount: 10000,
        priceRangeStep: 500,
    });
    const [rounds, setRounds] = useState<PredictionRound[]>([]);
    const [selectedRound, setSelectedRound] = useState<PredictionRound | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [currentJackpot, setCurrentJackpot] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (!functions) return;
        setIsLoading(true);
        try {
            // Load settings
            const getSettings = httpsCallable(functions, 'getPredictionSettings');
            const settingsResult: any = await getSettings({});
            if (settingsResult.data.success) {
                setSettings(settingsResult.data.settings);
            }

            // Load rounds
            const getRounds = httpsCallable(functions, 'getPredictionRounds');
            const roundsResult: any = await getRounds({ limit: 30 });
            if (roundsResult.data.success) {
                setRounds(roundsResult.data.rounds);
            }

            // Load Jackpot
            const getJackpot = httpsCallable(functions, 'getJackpotStatus');
            const jackpotRes: any = await getJackpot();
            if (jackpotRes.data.success) {
                setCurrentJackpot(jackpotRes.data.currentAmount);
            }
        } catch (error) {
            console.error('Failed to load prediction data:', error);
        }
        setIsLoading(false);
    };

    const handleSaveSettings = async () => {
        if (!functions) return;
        setIsSaving(true);
        setSaveMessage(null);
        try {
            const updateSettings = httpsCallable(functions, 'updatePredictionSettings');
            const result: any = await updateSettings(settings);
            if (result.data.success) {
                setSaveMessage('설정이 저장되었습니다!');
                setTimeout(() => setSaveMessage(null), 3000);
            }
        } catch (error: any) {
            setSaveMessage('저장 실패: ' + error.message);
        }
        setIsSaving(false);
    };

    const handleManualSettle = async (date: string) => {
        if (!functions) return;
        if (!confirm(`${date} 라운드를 수동 정산하시겠습니까?`)) return;

        try {
            const manualSettle = httpsCallable(functions, 'manualSettlePrediction');
            const result: any = await manualSettle({ date });
            alert(result.data.message);
            loadData();
        } catch (error: any) {
            alert('정산 실패: ' + error.message);
        }
    };

    const loadRoundDetail = async (date: string) => {
        if (!functions) return;
        try {
            const getDetail = httpsCallable(functions, 'getPredictionRoundDetail');
            const result: any = await getDetail({ date });
            if (result.data.success) {
                setSelectedRound(result.data.round);
            }
        } catch (error) {
            console.error('Failed to load round detail:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <TrendingUp size={20} className="text-orange-500" />
                        BTC 예측 게임 관리
                    </h2>
                    <p className="text-sm text-gray-500">배분율 설정 및 라운드 히스토리</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-yellow-50 px-4 py-2 rounded-xl flex items-center gap-2 border border-yellow-200">
                        <Trophy size={16} className="text-yellow-600" />
                        <div>
                            <p className="text-[10px] text-yellow-600 font-bold uppercase">Current Jackpot</p>
                            <p className="text-lg font-black text-yellow-800">{currentJackpot.toLocaleString()} VIEW</p>
                        </div>
                    </div>
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-sm"
                    >
                        <RefreshCw size={16} />
                        새로고침
                    </button>
                </div>
            </div>

            {/* Settings Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Settings size={18} />
                    게임 설정
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Winner Pool Percent */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            승자 배분율 (%)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={settings.winnerPoolPercent}
                                onChange={(e) => setSettings({ ...settings, winnerPoolPercent: Number(e.target.value) })}
                                className="flex-1"
                            />
                            <span className="text-lg font-bold text-brand-600 w-16 text-right">
                                {settings.winnerPoolPercent}%
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            총 풀의 {settings.winnerPoolPercent}%가 승자들에게 1/N 배분됩니다
                        </p>
                    </div>

                    {/* Min Bet */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            최소 베팅 (VIEW)
                        </label>
                        <input
                            type="number"
                            value={settings.minBetAmount}
                            onChange={(e) => setSettings({ ...settings, minBetAmount: Number(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500"
                        />
                    </div>

                    {/* Max Bet */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            최대 베팅 (VIEW)
                        </label>
                        <input
                            type="number"
                            value={settings.maxBetAmount}
                            onChange={(e) => setSettings({ ...settings, maxBetAmount: Number(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500"
                        />
                    </div>

                    {/* Price Range Step */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            가격 구간 단위 ($)
                        </label>
                        <input
                            type="number"
                            value={settings.priceRangeStep}
                            onChange={(e) => setSettings({ ...settings, priceRangeStep: Number(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500"
                        />
                    </div>

                    {/* Enabled Toggle */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            게임 활성화
                        </label>
                        <button
                            onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                            className={`w-16 h-8 rounded-full transition-colors relative ${settings.enabled ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                        >
                            <span className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow ${settings.enabled ? 'left-9' : 'left-1'
                                }`} />
                        </button>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-4">
                    <button
                        onClick={handleSaveSettings}
                        disabled={isSaving}
                        className="px-6 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save size={18} />
                        {isSaving ? '저장 중...' : '설정 저장'}
                    </button>
                    {saveMessage && (
                        <span className={`text-sm ${saveMessage.includes('실패') ? 'text-red-500' : 'text-green-500'}`}>
                            {saveMessage}
                        </span>
                    )}
                </div>
            </div>

            {/* Round History */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Calendar size={18} />
                        라운드 히스토리
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold text-gray-600">날짜</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-600">참여자</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-600">총 풀</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-600">승자</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-600">배분액</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-600">상태</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-600">액션</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rounds.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-gray-400">
                                        아직 라운드 기록이 없습니다
                                    </td>
                                </tr>
                            ) : (
                                rounds.map((round) => (
                                    <tr key={round.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-500">
                                                    #{round.roundId || '?'}
                                                </span>
                                                <div className="font-medium text-gray-800">{round.date}</div>
                                            </div>
                                            {round.winningRange && (
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    {round.winningRange} ({round.actualPrice?.toLocaleString()})
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Users size={14} className="text-gray-400" />
                                                {round.participantCount}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium">
                                            {round.totalPool.toLocaleString()} VIEW
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Trophy size={14} className="text-yellow-500" />
                                                {round.totalWinners}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-green-600">
                                            {round.totalDistributed.toLocaleString()} VIEW
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${round.status === 'settled'
                                                ? 'bg-green-100 text-green-700'
                                                : round.status === 'closed'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {round.status === 'settled' ? '정산완료' : round.status === 'closed' ? '마감' : '진행중'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => loadRoundDetail(round.date)}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                                                    title="상세보기"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {round.status !== 'settled' && (
                                                    <button
                                                        onClick={() => handleManualSettle(round.date)}
                                                        className="p-1.5 hover:bg-orange-50 rounded-lg text-orange-500"
                                                        title="수동정산"
                                                    >
                                                        <DollarSign size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Round Detail Modal */}
            {selectedRound && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold">{selectedRound.date} 라운드</h3>
                                <p className="text-sm text-gray-500">당첨 범위: {selectedRound.winningRange}</p>
                            </div>
                            <button onClick={() => setSelectedRound(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-100 grid grid-cols-4 gap-4">
                            <div className="text-center">
                                <p className="text-2xl font-black text-gray-800">{selectedRound.participantCount}</p>
                                <p className="text-xs text-gray-500">참여자</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-gray-800">{selectedRound.totalPool.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">총 풀 (VIEW)</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-yellow-600">{selectedRound.totalWinners}</p>
                                <p className="text-xs text-gray-500">승자</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-black text-green-600">{selectedRound.totalDistributed.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">배분액 (VIEW)</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4">
                            {selectedRound.jackpotWinners && selectedRound.jackpotWinners.length > 0 && (
                                <div className="mb-6 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                    <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                                        <Trophy size={16} />
                                        잭팟 당첨자 ({selectedRound.jackpotWinners.length}명)
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedRound.jackpotWinners.map((winner, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm">
                                                <span className="font-bold text-gray-800">{winner.displayName}</span>
                                                <span className="font-black text-yellow-600">+{winner.amount.toLocaleString()} VIEW</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <h4 className="font-bold text-gray-800 mb-3">승자 목록 (Range)</h4>
                            {selectedRound.winners && selectedRound.winners.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedRound.winners.map((winner, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center font-bold text-sm">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 flex items-center gap-2">
                                                        {winner.displayName}
                                                        {winner.isJackpot && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">JP</span>}
                                                    </p>
                                                    <p className="text-xs text-gray-400">베팅: {winner.betAmount} VIEW</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-green-600">+{winner.reward.toLocaleString()} VIEW</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-400 py-8">승자가 없습니다</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PredictionAdmin;
