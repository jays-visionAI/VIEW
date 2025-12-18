export const GOOGLE_GPT_AD_UNIT_ID = '/6355419/Travel/Europe/France/Paris'; // Test ID

// AdMob Test IDs
export const ADMOB_ANDROID_REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917';
export const ADMOB_IOS_REWARDED_ID = 'ca-app-pub-3940256099942544/1712485313';

import { Capacitor } from '@capacitor/core';

export const GET_AD_UNIT_ID = () => {
    // For Web (GPT)
    return GOOGLE_GPT_AD_UNIT_ID;
};

export const GET_MOBILE_AD_UNIT_ID = () => {
    if (Capacitor.getPlatform() === 'android') {
        return ADMOB_ANDROID_REWARDED_ID;
    }
    return ADMOB_IOS_REWARDED_ID;
};
