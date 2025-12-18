import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { X, Lock, Unlock, Loader2, CheckCircle, AlertCircle, Wallet } from 'lucide-react';
import { CONTRACTS, VIEW_TOKEN_ABI, VIEW_STAKING_ABI } from '../lib/wagmi';
import { STAKING_TIERS, getCurrentTier } from '../context/AppContext';
import { useApp } from '../context/AppContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface OnChainStakingModalProps {
    onClose: () => void;
}

const TIER_LABELS = ['Bronze', 'Silver', 'Gold', 'Platinum'];
const TIER_MULTIPLIERS = ['1.0x', '1.2x', '1.5x', '2.0x'];

export const OnChainStakingModal: React.FC<OnChainStakingModalProps> = ({ onClose }) => {
    const { address, chainId, isConnected } = useAccount();
    const { showToast } = useApp();

    const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState<'idle' | 'approving' | 'staking' | 'pending' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    // Get contract addresses
    const contractAddresses = chainId ? CONTRACTS[chainId as keyof typeof CONTRACTS] : null;
    const stakingAddress = contractAddresses?.VIEW_STAKING;
    const tokenAddress = contractAddresses?.VIEW_TOKEN;

    // Read wallet VIEW balance
    const { data: walletBalance, refetch: refetchBalance } = useReadContract({
        address: tokenAddress,
        abi: VIEW_TOKEN_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    // Read staked balance
    const { data: stakedBalance, refetch: refetchStaked } = useReadContract({
        address: stakingAddress,
        abi: VIEW_STAKING_ABI,
        functionName: 'getStakedBalance',
        args: address ? [address] : undefined,
    });

    // Read user tier
    const { data: userTier } = useReadContract({
        address: stakingAddress,
        abi: VIEW_STAKING_ABI,
        functionName: 'getTier',
        args: address ? [address] : undefined,
    });

    // Read allowance
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: tokenAddress,
        abi: VIEW_TOKEN_ABI,
        functionName: 'allowance',
        args: address && stakingAddress ? [address, stakingAddress] : undefined,
    });

    // Write hooks
    const { writeContract: approve, data: approveHash } = useWriteContract();
    const { writeContract: stake, data: stakeHash } = useWriteContract();
    const { writeContract: unstake, data: unstakeHash } = useWriteContract();

    // Wait for transactions
    const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
    const { isSuccess: isStakeSuccess } = useWaitForTransactionReceipt({ hash: stakeHash });
    const { isSuccess: isUnstakeSuccess } = useWaitForTransactionReceipt({ hash: unstakeHash });

    // Handle approve success
    useEffect(() => {
        if (isApproveSuccess && status === 'approving') {
            refetchAllowance();
            // Now stake
            handleStakeTransaction();
        }
    }, [isApproveSuccess]);

    // Handle stake/unstake success
    useEffect(() => {
        if (isStakeSuccess || isUnstakeSuccess) {
            setStatus('success');
            refetchBalance();
            refetchStaked();
            showToast(mode === 'stake' ? '스테이킹 완료!' : '언스테이킹 완료!', 'success');
        }
    }, [isStakeSuccess, isUnstakeSuccess]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9.]/g, '');
        setAmount(value);
    };

    const setMax = () => {
        if (mode === 'stake' && walletBalance) {
            setAmount(formatEther(walletBalance));
        } else if (mode === 'unstake' && stakedBalance) {
            setAmount(formatEther(stakedBalance as bigint));
        }
    };

    const handleStakeTransaction = () => {
        if (!stakingAddress || !amount) return;

        setStatus('staking');
        try {
            stake({
                address: stakingAddress,
                abi: VIEW_STAKING_ABI,
                functionName: 'stake',
                args: [parseEther(amount)],
            });
        } catch (e: any) {
            setStatus('error');
            setError(e.message);
        }
    };

    const handleAction = async () => {
        if (!address || !stakingAddress || !tokenAddress) {
            setError('지갑을 연결해주세요.');
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setError('올바른 수량을 입력해주세요.');
            return;
        }

        setError(null);
        const amountWei = parseEther(amount);

        if (mode === 'stake') {
            // Check if approval is needed
            const currentAllowance = allowance as bigint || BigInt(0);
            if (currentAllowance < amountWei) {
                setStatus('approving');
                try {
                    approve({
                        address: tokenAddress,
                        abi: VIEW_TOKEN_ABI,
                        functionName: 'approve',
                        args: [stakingAddress, amountWei],
                    });
                } catch (e: any) {
                    setStatus('error');
                    setError(e.message);
                }
            } else {
                handleStakeTransaction();
            }
        } else {
            // Unstake
            setStatus('staking');
            try {
                unstake({
                    address: stakingAddress,
                    abi: VIEW_STAKING_ABI,
                    functionName: 'unstake',
                    args: [amountWei],
                });
            } catch (e: any) {
                setStatus('error');
                setError(e.message);
            }
        }
    };

    const stakedAmount = stakedBalance ? Number(formatEther(stakedBalance as bigint)) : 0;
    const walletAmount = walletBalance ? Number(formatEther(walletBalance)) : 0;
    const tierIndex = userTier !== undefined ? Number(userTier) : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative bg-gradient-to-br from-brand-600 to-purple-700 text-white p-6 pb-8">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X size={16} />
                    </button>

                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Lock size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">온체인 스테이킹</h2>
                            <p className="text-brand-200 text-sm">VIEW 토큰을 스테이킹하세요</p>
                        </div>
                    </div>

                    {/* Current Tier & Staked */}
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-brand-200 text-xs mb-1">스테이킹 잔액</p>
                                <p className="text-2xl font-black">
                                    {stakedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    <span className="text-sm ml-1 text-brand-200">VIEW</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-brand-200 text-xs mb-1">등급</p>
                                <p className="text-lg font-bold">{TIER_LABELS[tierIndex]} ({TIER_MULTIPLIERS[tierIndex]})</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    {!isConnected ? (
                        <div className="text-center py-8">
                            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">지갑을 연결해주세요</p>
                            <ConnectButton />
                        </div>
                    ) : status === 'idle' ? (
                        <>
                            {/* Mode Toggle */}
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

                            {/* Balance Info */}
                            <div className="mb-2 flex justify-between text-xs font-medium text-gray-500">
                                <span>수량 입력</span>
                                <span>
                                    가능: {mode === 'stake'
                                        ? walletAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                        : stakedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} VIEW
                                </span>
                            </div>

                            {/* Amount Input */}
                            <div className="relative mb-4">
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

                            {error && (
                                <p className="text-red-500 text-xs mb-4">{error}</p>
                            )}

                            <button
                                onClick={handleAction}
                                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg active:scale-[0.98] transition-all flex items-center justify-center space-x-2 ${mode === 'stake' ? 'bg-brand-600 hover:bg-brand-700' : 'bg-gray-800 hover:bg-gray-900'}`}
                            >
                                {mode === 'stake' ? <Lock size={18} /> : <Unlock size={18} />}
                                <span>{mode === 'stake' ? 'VIEW 예치하기' : 'VIEW 출금하기'}</span>
                            </button>
                        </>
                    ) : status === 'approving' || status === 'staking' || status === 'pending' ? (
                        <div className="text-center py-8">
                            <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
                            <p className="font-bold text-gray-800">
                                {status === 'approving' ? '승인 요청 중...' : '트랜잭션 처리 중...'}
                            </p>
                            <p className="text-sm text-gray-500">지갑에서 확인해주세요</p>
                        </div>
                    ) : status === 'success' ? (
                        <div className="text-center py-8">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                            <p className="font-bold text-gray-800 mb-2">완료!</p>
                            <p className="text-sm text-gray-500 mb-4">
                                {mode === 'stake' ? '스테이킹이 완료되었습니다.' : '언스테이킹이 완료되었습니다.'}
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                            >
                                닫기
                            </button>
                        </div>
                    ) : status === 'error' ? (
                        <div className="text-center py-8">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <p className="font-bold text-gray-800 mb-2">실패</p>
                            <p className="text-sm text-red-500 mb-4">{error}</p>
                            <button
                                onClick={() => setStatus('idle')}
                                className="w-full py-3 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 transition-all"
                            >
                                다시 시도
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default OnChainStakingModal;
