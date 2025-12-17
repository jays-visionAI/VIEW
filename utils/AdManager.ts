export { };

import { GET_AD_UNIT_ID } from '../constants/adConfig';

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

    initialize() {
        if (this.initialized) return;

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
                // Destroy and recreate? Or just ready for next?
                // Usually for rewarded ads, you might need to refresh or ensure it's loaded again.
            });
        });

        this.initialized = true;
        console.log("AdManager Initialized");
    }

    loadRewardedAd(targeting: Record<string, string>) {
        window.googletag.cmd.push(() => {
            const pubads = window.googletag.pubads();
            // Clear previous targeting
            pubads.clearTargeting();

            // Set new targeting
            Object.entries(targeting).forEach(([key, value]) => {
                pubads.setTargeting(key, value);
            });

            console.log("Ad Request with Targeting:", targeting);

            // Refresh the slot to fetch a new ad with updated targeting
            if (this.rewardedSlot) {
                pubads.refresh([this.rewardedSlot]);
            }
        });
    }

    showRewardedAd(): Promise<boolean> {
        return new Promise((resolve) => {
            this.onRewardGranted = () => {
                resolve(true); // Success
            };
            this.onAdClosed = () => {
                // If closed without reward, this might be called. 
                // Note: 'rewardedSlotGranted' fires BEFORE 'rewardedSlotClosed' if successful.
                // So we need to be careful not to resolve false if we already resolved true.
                // For simplicity, we can set a timeout or check boolean flag.
                // Actually GPT docs say granted event is the key.
                // If closed happens and no granted, then false.
                setTimeout(() => resolve(false), 500);
            };

            window.googletag.cmd.push(() => {
                if (this.rewardedSlot) {
                    // GPT Rewarded ads are usually auto-displayed by the library once ready/refreshed 
                    // if configured as such, or we might need a specific 'display' call if it's out of page.
                    // For Rewarded Ads (GPT), they often use a specific method or just appear.
                    // Note: Web Rewarded Ads usually trigger via display() of the div, but defineOutOfPageSlot logic differs.
                    // Standard pattern: define -> refresh -> it shows modal.
                    window.googletag.display(this.rewardedSlot);
                } else {
                    resolve(false);
                }
            });
        });
    }
}

export const adManager = AdManager.getInstance();
