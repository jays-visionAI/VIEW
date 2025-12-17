// Google Ad Manager Configuration
// Replace PRODUCTION_AD_UNIT_ID with your real ID from Google Ad Manager

export const AD_CONFIG = {
    // Google's official Test Ad Unit ID for Rewarded Ads
    TEST_AD_UNIT_ID: '/22639388115/rewarded_web_example',

    // YOUR Real Ad Unit ID (e.g., '/12345678/view_app_reward')
    // TODO: Replace this string when you are ready to earn revenue
    PRODUCTION_AD_UNIT_ID: '/22639388115/rewarded_web_example',

    // Set to true to use the Production ID
    IS_PRODUCTION: false
};

export const GET_AD_UNIT_ID = () => {
    return AD_CONFIG.IS_PRODUCTION ? AD_CONFIG.PRODUCTION_AD_UNIT_ID : AD_CONFIG.TEST_AD_UNIT_ID;
};
