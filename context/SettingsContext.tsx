import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Settings Types
export interface TokenomicsSettings {
    pointValueUsd: number;      // 1 point = $X
    tokenPriceUsd: number;      // 1 VIEW = $X
    tokenPriceSource: 'manual' | 'api';
    tokenPriceUpdatedAt: Date | null;
}

export interface BoosterTier {
    minAchievement: number;     // % of daily threshold achieved
    rewardRate: number;         // % of booster APY to apply
}

export interface StakingSettings {
    baseApy: number;            // Base APY %
    boosterApy: number;         // Booster APY %
    dailyAdThreshold: number;   // Seconds of ads to watch for 100%
    boosterTiers: BoosterTier[];
    lockupDays: number;
    earlyWithdrawPenalty: 'forfeit_interest' | 'percentage';
}

export interface ReferralRewardConfig {
    enabled: boolean;
    tier1Rate: number;          // % of base amount
    tier2Rate: number;          // % of Tier1 reward
}

export interface ReferralSettings {
    enabled: boolean;
    monthlyCap: number;         // Max points per month
    paymentDelayDays: number;   // Days to wait before paying
    minActivityRequired: boolean;
    rewards: {
        purchase: ReferralRewardConfig;
        adViewing: ReferralRewardConfig;
        staking: ReferralRewardConfig;
    };
}

export interface AppSettings {
    tokenomics: TokenomicsSettings;
    staking: StakingSettings;
    referral: ReferralSettings;
}

// Default Settings
export const DEFAULT_SETTINGS: AppSettings = {
    tokenomics: {
        pointValueUsd: 0.001,
        tokenPriceUsd: 0.01,
        tokenPriceSource: 'manual',
        tokenPriceUpdatedAt: null,
    },
    staking: {
        baseApy: 5,
        boosterApy: 12,
        dailyAdThreshold: 300,  // 5 minutes
        boosterTiers: [
            { minAchievement: 50, rewardRate: 30 },
        ],
        lockupDays: 7,
        earlyWithdrawPenalty: 'forfeit_interest',
    },
    referral: {
        enabled: true,
        monthlyCap: 100000,
        paymentDelayDays: 7,
        minActivityRequired: true,
        rewards: {
            purchase: { enabled: true, tier1Rate: 5, tier2Rate: 5 },
            adViewing: { enabled: true, tier1Rate: 5, tier2Rate: 5 },
            staking: { enabled: true, tier1Rate: 5, tier2Rate: 5 },
        },
    },
};

// Context Type
interface SettingsContextType {
    settings: AppSettings;
    isLoading: boolean;
    error: string | null;
    updateTokenomics: (updates: Partial<TokenomicsSettings>) => Promise<void>;
    updateStaking: (updates: Partial<StakingSettings>) => Promise<void>;
    updateReferral: (updates: Partial<ReferralSettings>) => Promise<void>;
    calculateTokenAmount: (points: number) => number;
    calculateBoosterRate: (achievementPercent: number) => number;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
};

interface SettingsProviderProps {
    children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Subscribe to settings documents
    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const unsubscribers: (() => void)[] = [];

        // Tokenomics settings listener
        const tokenomicsRef = doc(db, 'settings', 'tokenomics');
        unsubscribers.push(
            onSnapshot(tokenomicsRef, (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setSettings(prev => ({
                        ...prev,
                        tokenomics: {
                            pointValueUsd: data.pointValueUsd ?? DEFAULT_SETTINGS.tokenomics.pointValueUsd,
                            tokenPriceUsd: data.tokenPriceUsd ?? DEFAULT_SETTINGS.tokenomics.tokenPriceUsd,
                            tokenPriceSource: data.tokenPriceSource ?? DEFAULT_SETTINGS.tokenomics.tokenPriceSource,
                            tokenPriceUpdatedAt: data.tokenPriceUpdatedAt?.toDate() ?? null,
                        },
                    }));
                }
            }, (err) => {
                console.error('Tokenomics settings error:', err);
                setError('Failed to load tokenomics settings');
            })
        );

        // Staking settings listener
        const stakingRef = doc(db, 'settings', 'staking');
        unsubscribers.push(
            onSnapshot(stakingRef, (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setSettings(prev => ({
                        ...prev,
                        staking: {
                            baseApy: data.baseApy ?? DEFAULT_SETTINGS.staking.baseApy,
                            boosterApy: data.boosterApy ?? DEFAULT_SETTINGS.staking.boosterApy,
                            dailyAdThreshold: data.dailyAdThreshold ?? DEFAULT_SETTINGS.staking.dailyAdThreshold,
                            boosterTiers: data.boosterTiers ?? DEFAULT_SETTINGS.staking.boosterTiers,
                            lockupDays: data.lockupDays ?? DEFAULT_SETTINGS.staking.lockupDays,
                            earlyWithdrawPenalty: data.earlyWithdrawPenalty ?? DEFAULT_SETTINGS.staking.earlyWithdrawPenalty,
                        },
                    }));
                }
            }, (err) => {
                console.error('Staking settings error:', err);
                setError('Failed to load staking settings');
            })
        );

        // Referral settings listener
        const referralRef = doc(db, 'settings', 'referral');
        unsubscribers.push(
            onSnapshot(referralRef, (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setSettings(prev => ({
                        ...prev,
                        referral: {
                            enabled: data.enabled ?? DEFAULT_SETTINGS.referral.enabled,
                            monthlyCap: data.monthlyCap ?? DEFAULT_SETTINGS.referral.monthlyCap,
                            paymentDelayDays: data.paymentDelayDays ?? DEFAULT_SETTINGS.referral.paymentDelayDays,
                            minActivityRequired: data.minActivityRequired ?? DEFAULT_SETTINGS.referral.minActivityRequired,
                            rewards: data.rewards ?? DEFAULT_SETTINGS.referral.rewards,
                        },
                    }));
                }
                setIsLoading(false);
            }, (err) => {
                console.error('Referral settings error:', err);
                setError('Failed to load referral settings');
                setIsLoading(false);
            })
        );

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, []);

    // Update functions
    const updateTokenomics = async (updates: Partial<TokenomicsSettings>) => {
        if (!db) return;
        const ref = doc(db, 'settings', 'tokenomics');
        await setDoc(ref, { ...settings.tokenomics, ...updates }, { merge: true });
    };

    const updateStaking = async (updates: Partial<StakingSettings>) => {
        if (!db) return;
        const ref = doc(db, 'settings', 'staking');
        await setDoc(ref, { ...settings.staking, ...updates }, { merge: true });
    };

    const updateReferral = async (updates: Partial<ReferralSettings>) => {
        if (!db) return;
        const ref = doc(db, 'settings', 'referral');
        await setDoc(ref, { ...settings.referral, ...updates }, { merge: true });
    };

    // Utility functions
    const calculateTokenAmount = (points: number): number => {
        const { pointValueUsd, tokenPriceUsd } = settings.tokenomics;
        if (tokenPriceUsd === 0) return 0;
        return (points * pointValueUsd) / tokenPriceUsd;
    };

    const calculateBoosterRate = (achievementPercent: number): number => {
        const { boosterTiers } = settings.staking;
        // Sort tiers descending by minAchievement
        const sortedTiers = [...boosterTiers].sort((a, b) => b.minAchievement - a.minAchievement);

        for (const tier of sortedTiers) {
            if (achievementPercent >= tier.minAchievement) {
                return tier.rewardRate;
            }
        }
        return 0; // No tier matched
    };

    return (
        <SettingsContext.Provider
            value={{
                settings,
                isLoading,
                error,
                updateTokenomics,
                updateStaking,
                updateReferral,
                calculateTokenAmount,
                calculateBoosterRate,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
};
