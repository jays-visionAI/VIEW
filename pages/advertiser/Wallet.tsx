import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { CONTRACTS, VIEW_TOKEN_ABI } from '../../lib/wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Wallet: React.FC = () => {
    const { address, chainId, isConnected } = useAccount();
    const [depositAmount, setDepositAmount] = useState('');
    const [isDepositing, setIsDepositing] = useState(false);

    // Get contract addresses
    const contractAddresses = chainId ? CONTRACTS[chainId as keyof typeof CONTRACTS] : null;

    // Read wallet VIEW balance
    const { data: walletBalance, refetch: refetchBalance } = useReadContract({
        address: contractAddresses?.VIEW_TOKEN,
        abi: VIEW_TOKEN_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    // Mock ad budget data (would come from Firestore in production)
    const [adBudget] = useState(50000);
    const [spent] = useState(12500);

    // Mock transaction history
    const transactions = [
        { id: 1, type: 'deposit', amount: 25000, date: '2025-12-15', status: 'completed' },
        { id: 2, type: 'spend', amount: -5000, date: '2025-12-14', campaign: 'Summer Sale' },
        { id: 3, type: 'deposit', amount: 50000, date: '2025-12-10', status: 'completed' },
        { id: 4, type: 'spend', amount: -7500, date: '2025-12-08', campaign: 'Black Friday' },
    ];

    const walletAmount = walletBalance ? Number(formatEther(walletBalance)) : 0;
    const remaining = adBudget - spent;

    const handleDeposit = async () => {
        if (!depositAmount || parseFloat(depositAmount) <= 0) return;
        setIsDepositing(true);

        // In production: Transfer to escrow contract or record in Firestore
        // For now, simulate with a delay
        setTimeout(() => {
            setIsDepositing(false);
            setDepositAmount('');
            refetchBalance();
            alert('Deposit functionality will be connected to smart contract in production.');
        }, 1500);
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Ad Wallet</h2>
                    <p className="text-gray-500">Manage your advertising budget and VIEW tokens.</p>
                </div>
                <ConnectButton />
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Wallet Balance */}
                <div className="bg-gradient-to-br from-brand-600 to-purple-700 text-white p-6 rounded-2xl shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <WalletIcon size={20} />
                        </div>
                        <span className="text-brand-100 text-sm font-medium">Wallet Balance</span>
                    </div>
                    <p className="text-3xl font-black">
                        {isConnected ? walletAmount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                        <span className="text-lg ml-1 opacity-70">VIEW</span>
                    </p>
                    {!isConnected && (
                        <p className="text-brand-200 text-xs mt-2">Connect wallet to view balance</p>
                    )}
                </div>

                {/* Ad Budget */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                            <ArrowDownCircle size={20} />
                        </div>
                        <span className="text-gray-500 text-sm font-medium">Ad Budget</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">
                        {adBudget.toLocaleString()}
                        <span className="text-lg ml-1 text-gray-400">VIEW</span>
                    </p>
                    <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all"
                            style={{ width: `${(remaining / adBudget) * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{remaining.toLocaleString()} VIEW remaining</p>
                </div>

                {/* Total Spent */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                            <ArrowUpCircle size={20} />
                        </div>
                        <span className="text-gray-500 text-sm font-medium">Total Spent</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">
                        {spent.toLocaleString()}
                        <span className="text-lg ml-1 text-gray-400">VIEW</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Across all campaigns</p>
                </div>
            </div>

            {/* Deposit Section */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Deposit VIEW for Ads</h3>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                            placeholder="Enter amount to deposit"
                            className="w-full px-4 py-3 pr-20 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-lg font-medium"
                            disabled={!isConnected}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">VIEW</span>
                    </div>
                    <button
                        onClick={handleDeposit}
                        disabled={!isConnected || isDepositing || !depositAmount}
                        className="px-8 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        {isDepositing ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <ArrowDownCircle size={18} />
                                Deposit
                            </>
                        )}
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                    Deposited VIEW will be available for your ad campaigns. Unused funds can be withdrawn anytime.
                </p>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Transaction History</h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {transactions.map((tx) => (
                        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                                    }`}>
                                    {tx.type === 'deposit' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {tx.type === 'deposit' ? 'Deposit' : `Ad Spend - ${tx.campaign}`}
                                    </p>
                                    <p className="text-xs text-gray-400">{tx.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} VIEW
                                </p>
                                {tx.status === 'completed' && (
                                    <span className="text-xs text-green-500 flex items-center justify-end gap-1">
                                        <CheckCircle size={12} /> Completed
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Wallet;
