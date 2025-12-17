// Firestore Settings Initialization Script
// Run with: cd functions && GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json npx ts-node src/init-settings.ts

import * as admin from 'firebase-admin';

const PROJECT_ID = 'view-web3-official-1765899415';

// Initialize Firebase Admin with project ID
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: PROJECT_ID,
    });
}

const db = admin.firestore();

const DEFAULT_SETTINGS = {
    tokenomics: {
        pointValueUsd: 0.001,       // 1 point = $0.001
        tokenPriceUsd: 0.01,        // 1 VIEW = $0.01
        tokenPriceSource: 'manual',
        tokenPriceUpdatedAt: null,
    },
    staking: {
        baseApy: 5,                 // 5% base APY
        boosterApy: 12,             // 12% booster APY
        dailyAdThreshold: 300,      // 5 minutes in seconds
        boosterTiers: [
            { minAchievement: 50, rewardRate: 30 },
        ],
        lockupDays: 7,
        earlyWithdrawPenalty: 'forfeit_interest',
    },
    referral: {
        enabled: true,
        monthlyCap: 100000,         // 100,000 points max per month
        paymentDelayDays: 7,        // 7 days delay
        minActivityRequired: true,
        rewards: {
            purchase: { enabled: true, tier1Rate: 5, tier2Rate: 5 },
            adViewing: { enabled: true, tier1Rate: 5, tier2Rate: 5 },
            staking: { enabled: true, tier1Rate: 5, tier2Rate: 5 },
        },
    },
};

export async function initializeSettings() {
    console.log('Initializing Firestore settings...\n');

    const settingsRef = db.collection('settings');

    // Initialize tokenomics
    const tokenomicsDoc = await settingsRef.doc('tokenomics').get();
    if (!tokenomicsDoc.exists) {
        await settingsRef.doc('tokenomics').set(DEFAULT_SETTINGS.tokenomics);
        console.log('✅ Created /settings/tokenomics');
    } else {
        console.log('⏩ /settings/tokenomics already exists');
    }

    // Initialize staking
    const stakingDoc = await settingsRef.doc('staking').get();
    if (!stakingDoc.exists) {
        await settingsRef.doc('staking').set(DEFAULT_SETTINGS.staking);
        console.log('✅ Created /settings/staking');
    } else {
        console.log('⏩ /settings/staking already exists');
    }

    // Initialize referral
    const referralDoc = await settingsRef.doc('referral').get();
    if (!referralDoc.exists) {
        await settingsRef.doc('referral').set(DEFAULT_SETTINGS.referral);
        console.log('✅ Created /settings/referral');
    } else {
        console.log('⏩ /settings/referral already exists');
    }

    console.log('\n🎉 Settings initialization complete!');
    return DEFAULT_SETTINGS;
}

// Run if executed directly
if (require.main === module) {
    initializeSettings()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Error:', error);
            process.exit(1);
        });
}
