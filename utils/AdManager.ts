export { };

import { GET_AD_UNIT_ID, GET_MOBILE_AD_UNIT_ID } from '../constants/adConfig';
import { AdMob, RewardAdOptions, RewardAdPluginEvents, AdMobRewardItem } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

declare global {
    interface Window {
        googletag: any;
    }
}

class AdManager {
    private static instance: AdManager;
    private initialized: boolean = false;
    private rewardedSlot: any = null;
    private onRewardGranted: ((reward: any) => void) | null = null;
    private onAdClosed: (() => void) | null = null;

    private constructor() { }

    static getInstance(): AdManager {
        if (!AdManager.instance) {
            AdManager.instance = new AdManager();
        }
        return AdManager.instance;
    }

    async initialize() {
        if (this.initialized) return;

        if (Capacitor.isNativePlatform()) {
            // Mobile (AdMob)
            try {
                await AdMob.initialize({
                    testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'], // Optional: Add test device IDs
                    initializeForTesting: true,
                });
                console.log("AdMob Initialized");
            } catch (e) {
                console.error("AdMob Init Error:", e);
            }
        } else {
            // Web (GPT)
            window.googletag = window.googletag || { cmd: [] };

            window.googletag.cmd.push(() => {
                // Define a rewarded ad slot (Test Ad Unit ID)
                this.rewardedSlot = window.googletag.defineOutOfPageSlot(
                    GET_AD_UNIT_ID(), // Use Configured ID
                    window.googletag.enums.OutOfPageFormat.REWARDED
                ).addService(window.googletag.pubads());

                window.googletag.pubads().enableSingleRequest();
                window.googletag.enableServices();

                // Event Listeners
                window.googletag.pubads().addEventListener('rewardedSlotGranted', (event: any) => {
                    console.log('Reward granted', event);
                    if (this.onRewardGranted) {
                        this.onRewardGranted(event.payload);
                    }
                });

                window.googletag.pubads().addEventListener('rewardedSlotClosed', () => {
                    console.log('Ad closed');
                    if (this.onAdClosed) {
                        this.onAdClosed();
                    }
                });
            });
        }

        this.initialized = true;
        console.log("AdManager Initialized");
    }

    async loadRewardedAd(targeting: Record<string, string>) {
        if (Capacitor.isNativePlatform()) {
            // Mobile: Prepare Ad
            try {
                const options: RewardAdOptions = {
                    adId: GET_MOBILE_AD_UNIT_ID(),
                    // isTesting: true // handled by initializeForTesting or ID
                };
                await AdMob.prepareRewardVideoAd(options);
                console.log("AdMob Reward Video Prepared");
            } catch (e) {
                console.error("AdMob Prepare Error:", e);
            }
        } else {
            // Web: GPT
            window.googletag = window.googletag || { cmd: [] };
            window.googletag.cmd.push(() => {
                const pubads = window.googletag.pubads();
                pubads.clearTargeting();
                Object.entries(targeting).forEach(([key, value]) => {
                    pubads.setTargeting(key, value);
                });
                console.log("Ad Request with Targeting:", targeting);
                if (this.rewardedSlot) {
                    pubads.refresh([this.rewardedSlot]);
                }
            });
        }
    }

    showRewardedAd(): Promise<boolean> {
        return new Promise(async (resolve) => {
            if (Capacitor.isNativePlatform()) {
                // Mobile Implementation
                let earnedReward = false;

                // Setup Listeners
                const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
                    console.log("AdMob Reward Earned:", reward);
                    earnedReward = true;
                });

                const closeListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
                    console.log("AdMob Ad Dismissed");
                    // Cleanup listeners
                    rewardListener.remove();
                    closeListener.remove();

                    resolve(earnedReward);
                });

                // Show Ad
                try {
                    await AdMob.showRewardVideoAd();
                } catch (e) {
                    console.error("Show AdMob Error:", e);
                    // Cleanup just in case
                    rewardListener.remove();
                    closeListener.remove();
                    resolve(false);
                }

            } else {
                // Web Implementation
                this.onRewardGranted = () => {
                    resolve(true);
                };
                this.onAdClosed = () => {
                    setTimeout(() => resolve(false), 500);
                };

                window.googletag = window.googletag || { cmd: [] };
                window.googletag.cmd.push(() => {
                    if (this.rewardedSlot) {
                        window.googletag.display(this.rewardedSlot);
                    } else {
                        resolve(false);
                    }
                });
            }
        });
    }
}

export const adManager = AdManager.getInstance();
