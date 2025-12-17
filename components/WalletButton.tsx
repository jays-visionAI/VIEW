import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { Wallet, ChevronDown, ExternalLink, Copy, Check, LogOut } from 'lucide-react';
import { useState } from 'react';

interface WalletButtonProps {
    className?: string;
    showBalance?: boolean;
}

export const WalletButton: React.FC<WalletButtonProps> = ({
    className = '',
    showBalance = false
}) => {
    const [copied, setCopied] = useState(false);
    const { address, isConnected } = useAccount();
    const { data: balance } = useBalance({ address });

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
            }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            style: {
                                opacity: 0,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            },
                        })}
                    >
                        {(() => {
                            if (!connected) {
                                return (
                                    <button
                                        onClick={openConnectModal}
                                        className={`
                      flex items-center justify-center space-x-2 
                      bg-gradient-to-r from-brand-500 to-brand-600 
                      text-white font-bold rounded-xl px-4 py-3 
                      shadow-lg shadow-brand-500/30 
                      hover:from-brand-600 hover:to-brand-700 
                      active:scale-[0.98] transition-all
                      ${className}
                    `}
                                    >
                                        <Wallet size={18} />
                                        <span>지갑 연결</span>
                                    </button>
                                );
                            }

                            if (chain.unsupported) {
                                return (
                                    <button
                                        onClick={openChainModal}
                                        className={`
                      flex items-center justify-center space-x-2 
                      bg-red-500 text-white font-bold rounded-xl px-4 py-3
                      hover:bg-red-600 active:scale-[0.98] transition-all
                      ${className}
                    `}
                                    >
                                        <span>네트워크 변경</span>
                                        <ChevronDown size={16} />
                                    </button>
                                );
                            }

                            return (
                                <div className="flex items-center space-x-2">
                                    {/* Chain Button */}
                                    <button
                                        onClick={openChainModal}
                                        className="flex items-center space-x-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2.5 hover:bg-white/20 transition-all"
                                    >
                                        {chain.hasIcon && (
                                            <div
                                                className="w-5 h-5 rounded-full overflow-hidden"
                                                style={{ background: chain.iconBackground }}
                                            >
                                                {chain.iconUrl && (
                                                    <img
                                                        alt={chain.name ?? 'Chain icon'}
                                                        src={chain.iconUrl}
                                                        className="w-5 h-5"
                                                    />
                                                )}
                                            </div>
                                        )}
                                        <ChevronDown size={14} className="text-gray-400" />
                                    </button>

                                    {/* Account Button */}
                                    <button
                                        onClick={openAccountModal}
                                        className="flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2.5 hover:bg-white/20 transition-all"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-400 to-brand-600" />
                                        <div className="flex flex-col items-start">
                                            <span className="text-white text-sm font-bold">
                                                {account.displayName}
                                            </span>
                                            {showBalance && account.displayBalance && (
                                                <span className="text-gray-400 text-xs">
                                                    {account.displayBalance}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
};

// Compact version for header
export const WalletButtonCompact: React.FC = () => {
    return (
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openAccountModal,
                openConnectModal,
                mounted,
            }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                        })}
                    >
                        {!connected ? (
                            <button
                                onClick={openConnectModal}
                                className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 hover:bg-white/20 transition-colors"
                            >
                                <Wallet className="text-white" size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={openAccountModal}
                                className="flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-2 hover:bg-white/20 transition-all"
                            >
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-400 to-brand-600" />
                                <span className="text-white text-xs font-bold">
                                    {account.displayName}
                                </span>
                            </button>
                        )}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
};

export default WalletButton;
