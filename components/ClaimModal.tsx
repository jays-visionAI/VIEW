import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { X, Coins, Loader2, CheckCircle, AlertCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { CONTRACTS, REWARD_VAULT_ABI } from '../lib/wagmi';
import { useApp } from '../context/AppContext';
import { useSettings } from '../context/SettingsContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

interface ClaimModalProps {
    onClose: () => void;
    claimableAmount: number; // Amount in VIEW (not wei)
}

export const ClaimModal: React.FC<ClaimModalProps> = ({ onClose, claimableAmount }) => {
    const { address, chainId } = useAccount();
    const { showToast } = useApp();
    const { settings, calculateTokenAmount } = useSettings();

    const [status, setStatus] = useState<'idle' | 'signing' | 'pending' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
    const [claimInput, setClaimInput] = useState<string>(claimableAmount.toString());

    // Validate input amount
    const inputAmount = Number(claimInput) || 0;
    const isValidAmount = inputAmount >= 10 && inputAmount <= claimableAmount;

    // Calculate expected tokens using settings
    const expectedTokens = calculateTokenAmount(inputAmount);

    // Get contract address based on chain
    const contractAddresses = chainId ? CONTRACTS[chainId as keyof typeof CONTRACTS] : null;

    // Read total claimed for user
    const { data: totalClaimed } = useReadContract({
        address: contractAddresses?.REWARD_VAULT,
        abi: REWARD_VAULT_ABI,
        functionName: 'totalClaimed',
        args: address ? [address] : undefined,
    });

    // Write contract hook
    const { writeContract, data: hash, isPending, isError, error: writeError } = useWriteContract();

    // Wait for transaction
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    useEffect(() => {
        if (hash) {
            setTxHash(hash);
            setStatus('pending');
        }
    }, [hash]);

    useEffect(() => {
        if (isConfirmed) {
            setStatus('success');
            showToast(`${inputAmount} VIEW 클레임 완료!`, 'success');
        }
    }, [isConfirmed]);

    useEffect(() => {
        if (isError && writeError) {
            setStatus('error');
            setError(writeError.message);
        }
    }, [isError, writeError]);

    const handleClaim = async () => {
        if (!address || !contractAddresses) {
            setError('지갑이 연결되지 않았습니다.');
            return;
        }

        setStatus('signing');
        setError(null);

        try {
            // 1. Call Firebase Cloud Function to get signature
            const generateClaimSignature = httpsCallable(functions, 'generateClaimSignature');

            const result = await generateClaimSignature({
                address,
                amount: inputAmount,  // Use user-input amount
                chainId,
            });

            const { signature, nonce, expiry, amountWei } = result.data as {
                signature: string;
                nonce: string;
                expiry: number;
                amountWei: string;
            };

            // 2. Submit on-chain claim transaction
            writeContract({
                address: contractAddresses.REWARD_VAULT,
                abi: REWARD_VAULT_ABI,
                functionName: 'claim',
                args: [BigInt(amountWei), nonce as `0x${string}`, BigInt(expiry), signature as `0x${string}`],
            } as any);

        } catch (err: any) {
            setStatus('error');
            // Handle Firebase function errors
            const errorMessage = err.message || err.details || '클레임에 실패했습니다.';
            setError(errorMessage);
        }
    };

    const getPolygonscanUrl = (hash: string) => {
        if (chainId === 137) {
            return `https://polygonscan.com/tx/${hash}`;
        }
        return `https://amoy.polygonscan.com/tx/${hash}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative bg-gradient-to-br from-brand-600 to-brand-700 text-white p-6 pb-8">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X size={16} />
                    </button>

                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Coins size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">VIEW 클레임</h2>
                            <p className="text-brand-200 text-sm">포인트를 토큰으로 전환</p>
                        </div>
                    </div>

                    {/* Claimable Amount */}
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                        <p className="text-brand-200 text-xs mb-1">클레임 가능</p>
                        <p className="text-3xl font-black">
                            {claimableAmount.toLocaleString()}
                            <span className="text-lg ml-1 text-brand-200">VIEW</span>
                        </p>
                    </div>

                    {/* Previously Claimed */}
                    {totalClaimed !== undefined && (
                        <p className="text-brand-200 text-xs mt-3">
                            총 클레임 완료: {formatEther(totalClaimed)} VIEW
                        </p>
                    )}
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Status Display */}
                    {status === 'idle' && (
                        <>
                            {/* Amount Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    클레임할 수량
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={claimInput}
                                        onChange={(e) => setClaimInput(e.target.value)}
                                        min={10}
                                        max={claimableAmount}
                                        className={`w-full px-4 py-3 pr-20 rounded-xl border-2 text-lg font-bold 
                                            ${isValidAmount
                                                ? 'border-brand-300 focus:border-brand-500'
                                                : 'border-red-300 focus:border-red-500'
                                            } outline-none transition-colors`}
                                        placeholder="클레임할 VIEW 수량"
                                    />
                                    <button
                                        onClick={() => setClaimInput(claimableAmount.toString())}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-brand-100 text-brand-600 text-sm font-bold rounded-lg hover:bg-brand-200 transition-colors"
                                    >
                                        MAX
                                    </button>
                                </div>
                                {/* Validation Messages */}
                                {inputAmount > 0 && !isValidAmount && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {inputAmount < 10
                                            ? '최소 10 VIEW 이상 입력해주세요.'
                                            : `최대 ${claimableAmount} VIEW까지 클레임 가능합니다.`}
                                    </p>
                                )}
                            </div>

                            {/* Conversion Rate Preview */}
                            {isValidAmount && (
                                <div className="mb-4 bg-gradient-to-r from-brand-50 to-purple-50 rounded-xl p-4 border border-brand-100">
                                    <div className="flex items-center justify-between">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 mb-1">포인트</p>
                                            <p className="text-lg font-bold text-gray-800">{inputAmount.toLocaleString()}</p>
                                        </div>
                                        <ArrowRight className="text-brand-400 mx-2" size={20} />
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 mb-1">받을 VIEW 토큰</p>
                                            <p className="text-lg font-black text-brand-600">{expectedTokens.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-brand-100 text-center">
                                        <p className="text-[10px] text-gray-400">
                                            환율: 1 포인트 = {(settings.tokenomics.pointValueUsd / settings.tokenomics.tokenPriceUsd).toFixed(4)} VIEW
                                            &nbsp;(${settings.tokenomics.pointValueUsd}/pt ÷ ${settings.tokenomics.tokenPriceUsd}/VIEW)
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <h4 className="font-bold text-gray-800 mb-2">클레임 안내</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• 클레임 시 가스비(MATIC)가 필요합니다</li>
                                    <li>• 하루에 한 번만 클레임 가능합니다</li>
                                    <li>• 최소 10 VIEW부터 클레임 가능합니다</li>
                                </ul>
                            </div>

                            <button
                                onClick={handleClaim}
                                disabled={!isValidAmount || !address}
                                className="w-full py-4 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                                <Coins size={18} />
                                <span>{isValidAmount ? `${inputAmount.toLocaleString()} VIEW 클레임하기` : '클레임하기'}</span>
                            </button>
                        </>
                    )}

                    {status === 'signing' && (
                        <div className="text-center py-8">
                            <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
                            <p className="font-bold text-gray-800">서명 요청 중...</p>
                            <p className="text-sm text-gray-500">잠시만 기다려주세요</p>
                        </div>
                    )}

                    {status === 'pending' && (
                        <div className="text-center py-8">
                            <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
                            <p className="font-bold text-gray-800">트랜잭션 처리 중...</p>
                            <p className="text-sm text-gray-500 mb-4">블록체인에서 확인 중입니다</p>
                            {txHash && (
                                <a
                                    href={getPolygonscanUrl(txHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-sm text-brand-600 hover:underline"
                                >
                                    Polygonscan에서 보기
                                    <ExternalLink size={14} className="ml-1" />
                                </a>
                            )}
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center py-8">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                            <p className="font-bold text-gray-800 mb-2">클레임 완료!</p>
                            <p className="text-sm text-gray-500 mb-4">
                                {claimableAmount} VIEW가 지갑으로 전송되었습니다
                            </p>
                            {txHash && (
                                <a
                                    href={getPolygonscanUrl(txHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-sm text-brand-600 hover:underline"
                                >
                                    트랜잭션 확인
                                    <ExternalLink size={14} className="ml-1" />
                                </a>
                            )}
                            <button
                                onClick={onClose}
                                className="w-full mt-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                            >
                                닫기
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center py-8">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <p className="font-bold text-gray-800 mb-2">클레임 실패</p>
                            <p className="text-sm text-red-500 mb-4">{error}</p>
                            <button
                                onClick={() => setStatus('idle')}
                                className="w-full py-3 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 transition-all"
                            >
                                다시 시도
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClaimModal;
