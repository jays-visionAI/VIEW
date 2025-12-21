import * as functions from "firebase-functions/v1";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { UserProfile } from "./types";
import { ethers } from "ethers";

admin.initializeApp();

// Global Admin emails whitelist
const ADMIN_EMAILS = ["jays@visai.io"];

// ============================================
// Web3 Claim Signature Configuration
// ============================================
const CLAIM_CONFIG = {
    // Minimum claim amount in VIEW tokens
    MIN_CLAIM: 10,
    // Maximum claim amount per transaction
    MAX_CLAIM: 10000,
    // Signature validity duration (1 hour)
    SIGNATURE_EXPIRY_SECONDS: 3600,
    // Chain IDs
    POLYGON_MAINNET: 137,
    POLYGON_AMOY: 80002,
};

// ============================================
// generateClaimSignature - Callable Function (Gen 2)
// ============================================
// Generates a signed message that authorizes a user to claim VIEW tokens
// from the RewardVault smart contract on Polygon.
export const generateClaimSignature = onCall({
    cors: true,  // Allow all origins for development
}, async (request) => {
    // 1. Verify authentication
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be authenticated to claim tokens."
        );
    }

    const uid = request.auth.uid;
    const { address, amount, chainId } = request.data;

    // 2. Validate input parameters
    if (!address || !ethers.isAddress(address)) {
        throw new HttpsError(
            "invalid-argument",
            "Invalid wallet address."
        );
    }

    if (!amount || typeof amount !== "number" || amount < CLAIM_CONFIG.MIN_CLAIM) {
        throw new HttpsError(
            "invalid-argument",
            `Minimum claim amount is ${CLAIM_CONFIG.MIN_CLAIM} VIEW.`
        );
    }

    if (amount > CLAIM_CONFIG.MAX_CLAIM) {
        throw new HttpsError(
            "invalid-argument",
            `Maximum claim amount is ${CLAIM_CONFIG.MAX_CLAIM} VIEW per transaction.`
        );
    }

    if (chainId !== CLAIM_CONFIG.POLYGON_MAINNET && chainId !== CLAIM_CONFIG.POLYGON_AMOY) {
        throw new HttpsError(
            "invalid-argument",
            "Invalid chain ID. Must be Polygon Mainnet or Amoy Testnet."
        );
    }

    // 3. Get signer private key from environment
    const signerPrivateKey = process.env.SIGNER_PRIVATE_KEY;
    let wallet;
    if (!signerPrivateKey) {
        functions.logger.warn("SIGNER_PRIVATE_KEY not configured. Using MOCK signer for test.");
        // Random private key for testing
        wallet = ethers.Wallet.createRandom();
    } else {
        wallet = new ethers.Wallet(signerPrivateKey);
    }

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);

    try {
        // 4. Run as transaction to prevent race conditions
        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw new HttpsError(
                    "not-found",
                    "User profile not found."
                );
            }

            const userData = userDoc.data()!;

            // 5. Check claimable balance (now using 'balance' as the source of claimable points)
            const claimableBalance = userData.balance ?? 0;

            if (amount > claimableBalance) {
                throw new HttpsError(
                    "failed-precondition",
                    `Insufficient balance. Available: ${claimableBalance} VIEW`
                );
            }

            // 6. Check last claim time (optional: enforce cooldown)
            const lastClaimTime = userData.lastClaimTime?.toMillis() ?? 0;
            const now = Date.now();
            const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours

            if (now - lastClaimTime < cooldownMs) {
                const remainingHours = Math.ceil((cooldownMs - (now - lastClaimTime)) / (60 * 60 * 1000));
                throw new HttpsError(
                    "failed-precondition",
                    `Claim cooldown active. Please wait ${remainingHours} hours.`
                );
            }

            // 6.5. Fetch tokenomics settings for dynamic conversion rate
            const tokenomicsDoc = await db.collection("settings").doc("tokenomics").get();
            const tokenomicsSettings = tokenomicsDoc.exists ? tokenomicsDoc.data() : null;

            // Default values if settings not found
            const pointValueUsd = tokenomicsSettings?.pointValueUsd ?? 0.001;  // 1 point = $0.001
            const tokenPriceUsd = tokenomicsSettings?.tokenPriceUsd ?? 0.01;   // 1 VIEW = $0.01

            // Calculate token amount: tokens = (points * pointValueUsd) / tokenPriceUsd
            // Example: 1000 points * $0.001 / $0.01 = 100 VIEW tokens
            const tokenAmount = (amount * pointValueUsd) / tokenPriceUsd;

            // Round to 6 decimal places to avoid precision issues
            const roundedTokenAmount = Math.round(tokenAmount * 1000000) / 1000000;

            // 7. Generate signature
            // wallet already initialized above
            const nonce = ethers.hexlify(ethers.randomBytes(32));
            const expiry = Math.floor(Date.now() / 1000) + CLAIM_CONFIG.SIGNATURE_EXPIRY_SECONDS;
            const amountWei = ethers.parseEther(roundedTokenAmount.toString());

            // Create message hash matching the smart contract's verification logic
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "bytes32", "uint256", "uint256"],
                [address, amountWei, nonce, expiry, chainId]
            );

            // Sign the message
            const signature = await wallet.signMessage(ethers.getBytes(messageHash));

            // 8. Update user document
            transaction.update(userRef, {
                // Decrease balance (points used for claim)
                balance: admin.firestore.FieldValue.increment(-amount),
                // Record last claim time
                lastClaimTime: admin.firestore.FieldValue.serverTimestamp(),
                // Store connected wallet address
                walletAddress: address,
                // Add to pending claims for tracking
                pendingClaims: admin.firestore.FieldValue.arrayUnion({
                    nonce,
                    amount,
                    amountWei: amountWei.toString(),
                    address,
                    chainId,
                    expiry,
                    createdAt: new Date().toISOString(),
                    status: "pending",
                }),
            });

            // 9. Log claim attempt
            functions.logger.info(`Claim signature generated for user ${uid}`, {
                address,
                amount,
                chainId,
                nonce,
            });

            return {
                signature,
                nonce,
                expiry,
                amountWei: amountWei.toString(),
                signerAddress: wallet.address,
                // Conversion info for UI display
                pointsUsed: amount,
                tokensReceived: roundedTokenAmount,
                conversionRate: pointValueUsd / tokenPriceUsd,  // Points to tokens ratio
            };
        });

        return result;
    } catch (error: any) {
        if (error instanceof HttpsError) {
            throw error;
        }
        functions.logger.error("Claim signature generation failed", error);
        throw new HttpsError(
            "internal",
            "Failed to generate claim signature. Please try again."
        );
    }
});

// ============================================
// confirmClaimSuccess - Callable Function (Gen 2)
// ============================================
// Called after successful on-chain claim to update user records
export const confirmClaimSuccess = onCall({
    cors: true,  // Allow all origins for development
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { nonce, txHash } = request.data;
    const uid = request.auth.uid;

    if (!nonce || !txHash) {
        throw new HttpsError("invalid-argument", "Missing nonce or txHash.");
    }

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);

    try {
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new HttpsError("not-found", "User not found.");
        }

        const userData = userDoc.data()!;
        const pendingClaims = userData.pendingClaims || [];

        // Find and update the claim with this nonce
        const updatedClaims = pendingClaims.map((claim: any) => {
            if (claim.nonce === nonce) {
                return { ...claim, status: "completed", txHash, completedAt: new Date().toISOString() };
            }
            return claim;
        });

        // Update the claim record
        await userRef.update({
            pendingClaims: updatedClaims,
            totalClaimed: admin.firestore.FieldValue.increment(
                pendingClaims.find((c: any) => c.nonce === nonce)?.amount || 0
            ),
        });

        // Add transaction record
        await userRef.collection("transactions").add({
            type: "Claim",
            amount: pendingClaims.find((c: any) => c.nonce === nonce)?.amount || 0,
            date: new Date().toISOString(),
            description: "VIEW 토큰 클레임 완료",
            txHash,
            nonce,
        });

        functions.logger.info(`Claim confirmed for user ${uid}`, { nonce, txHash });

        return { success: true };
    } catch (error: any) {
        functions.logger.error("Claim confirmation failed", error);
        throw new HttpsError("internal", "Failed to confirm claim.");
    }
});

// ============================================
// Existing Functions (Gen 1 Triggers)
// ============================================

// Trigger: Runs automatically when a new user is created in Authentication
export const createUserProfile = functions.auth.user().onCreate(async (user) => {
    const db = admin.firestore();

    const newUser: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        balance: 0,
        claimableBalance: 0, // New field for Web3 claims
        totalClaimed: 0, // New field for tracking total claimed
        role: "user",
    };


    try {
        // Determine the document path (users/{uid})
        await db.collection("users").doc(user.uid).set(newUser);

        // Create a sub-collection 'transactions' with an initial welcome document
        // This ensures the sub-collection exists and is visible in the console
        await db.collection("users").doc(user.uid).collection("transactions").add({
            type: "Mission",
            amount: 0,
            date: new Date().toISOString(),
            description: "Welcome to VIEW! Account created.",
        });

        functions.logger.info(`User Profile and initial sub-collection created for ${user.uid}`);
    } catch (error) {
        functions.logger.error("Error creating user profile", error);
    }
});

// Trigger: Runs automatically when a user is deleted from Authentication
export const deleteUserProfile = functions.auth.user().onDelete(async (user) => {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(user.uid);

    try {
        // 1. Delete transactions subcollection
        // Note: Firestore doesn't automatically delete subcollections. We need to delete documents manually or use a recursive delete tool.
        // For simple use cases with limited documents (or robust recursive delete), we can fetch and delete.
        // For production apps with large subcollections, consider using 'firebase-tools' recursive delete or specific recursive function.
        // Since we didn't install extra tools, we'll do a simple batch delete for now (assuming reasonable size).

        const batch = db.batch();

        // Delete transactions
        const transactionsSnapshot = await userRef.collection("transactions").get();
        transactionsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // Delete tickets
        const ticketsSnapshot = await userRef.collection("tickets").get();
        ticketsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // Delete predictions
        const predictionsSnapshot = await userRef.collection("predictions").get();
        predictionsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        // 2. Delete the user document itself
        await userRef.delete();

        functions.logger.info(`User Profile and sub-collections deleted for ${user.uid}`);
    } catch (error) {
        functions.logger.error("Error deleting user profile", error);
    }
});

// ============================================
// setReferrer - Set referrer for a user
// ============================================
// Called when a user registers via a referral link
export const setReferrer = onCall({
    cors: true,
}, async (request) => {
    const { referralCode } = request.data;
    const uid = request.auth?.uid;

    if (!uid) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    if (!referralCode || typeof referralCode !== "string") {
        throw new HttpsError("invalid-argument", "Referral code is required");
    }

    const db = admin.firestore();

    try {
        // 1. Find the referrer by referral code
        const referrerQuery = await db
            .collection("users")
            .where("referralCode", "==", referralCode.toUpperCase())
            .limit(1)
            .get();

        if (referrerQuery.empty) {
            throw new HttpsError("not-found", "Invalid referral code");
        }

        const referrerDoc = referrerQuery.docs[0];
        const referrerUid = referrerDoc.id;
        const referrerData = referrerDoc.data();

        // 2. Prevent self-referral
        if (referrerUid === uid) {
            throw new HttpsError("invalid-argument", "Cannot refer yourself");
        }

        // 3. Get current user's document
        const userRef = db.collection("users").doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new HttpsError("not-found", "User profile not found");
        }

        const userData = userDoc.data();

        // 4. Check if already has a referrer
        if (userData?.referrerL1) {
            throw new HttpsError("already-exists", "Already have a referrer");
        }

        // 5. Prevent circular referral (check if referrer's L1 or L2 is this user)
        if (referrerData?.referrerL1 === uid || referrerData?.referrerL2 === uid) {
            throw new HttpsError("invalid-argument", "Circular referral not allowed");
        }

        // 6. Set up referral chain
        const referrerL2 = referrerData?.referrerL1 || null;

        // 7. Update current user with referrer info
        await userRef.update({
            referrerL1: referrerUid,
            referrerL2: referrerL2,
            referredAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 8. Increment referrer's direct referral count
        await db.collection("users").doc(referrerUid).update({
            directReferrals: admin.firestore.FieldValue.increment(1),
        });

        // 9. Increment L2 referrer's indirect referral count if exists
        if (referrerL2) {
            await db.collection("users").doc(referrerL2).update({
                indirectReferrals: admin.firestore.FieldValue.increment(1),
            });
        }

        functions.logger.info(`Referral set: ${uid} -> L1: ${referrerUid}, L2: ${referrerL2}`);

        return {
            success: true,
            referrerL1: referrerUid,
            referrerL2: referrerL2,
        };
    } catch (error: any) {
        functions.logger.error("setReferrer error:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Failed to set referrer");
    }
});

// ============================================
// processReferralReward - Called when rewards should be distributed
// ============================================
// This function creates pending referral rewards that will be paid after 7 days
export const processReferralReward = onCall({
    cors: true,
}, async (request) => {
    const { sourceUserUid, rewardType, baseAmount } = request.data;

    // Can be called internally or with service account
    // For now, we'll allow authenticated users for testing
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "Authentication required");
    }

    if (!sourceUserUid || !rewardType || baseAmount === undefined) {
        throw new HttpsError("invalid-argument", "Missing required fields");
    }

    const validTypes = ["purchase", "adViewing", "staking"];
    if (!validTypes.includes(rewardType)) {
        throw new HttpsError("invalid-argument", "Invalid reward type");
    }

    const db = admin.firestore();

    try {
        // 1. Get referral settings
        const settingsDoc = await db.collection("settings").doc("referral").get();
        const settings = settingsDoc.exists ? settingsDoc.data() : null;

        if (!settings || !settings.enabled) {
            return { success: false, reason: "Referral system disabled" };
        }

        const rewardConfig = settings.rewards?.[rewardType];
        if (!rewardConfig?.enabled) {
            return { success: false, reason: `${rewardType} rewards disabled` };
        }

        // 2. Get source user's referrers
        const sourceUserDoc = await db.collection("users").doc(sourceUserUid).get();
        if (!sourceUserDoc.exists) {
            throw new HttpsError("not-found", "Source user not found");
        }

        const sourceUser = sourceUserDoc.data();
        const referrerL1Uid = sourceUser?.referrerL1;
        const referrerL2Uid = sourceUser?.referrerL2;

        if (!referrerL1Uid) {
            return { success: false, reason: "No referrer" };
        }

        const payableAt = new Date();
        payableAt.setDate(payableAt.getDate() + (settings.paymentDelayDays || 7));

        // 3. Calculate and create Tier 1 reward
        const tier1Reward = baseAmount * (rewardConfig.tier1Rate / 100);

        // Check monthly cap
        const referrerL1Doc = await db.collection("users").doc(referrerL1Uid).get();
        const referrerL1Data = referrerL1Doc.data();
        const currentMonth = new Date().toISOString().slice(0, 7);

        let tier1Monthly = referrerL1Data?.monthlyReferralRewards ?? 0;
        if (referrerL1Data?.monthlyRewardResetDate !== currentMonth) {
            tier1Monthly = 0;
        }

        const monthlyCap = settings.monthlyCap || 100000;
        const adjustedTier1Reward = Math.min(tier1Reward, monthlyCap - tier1Monthly);

        if (adjustedTier1Reward > 0) {
            // Create pending reward document
            await db.collection("pendingRewards").add({
                recipientUid: referrerL1Uid,
                sourceUid: sourceUserUid,
                type: rewardType,
                tier: 1,
                amount: adjustedTier1Reward,
                status: "pending",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                payableAt: payableAt,
            });

            // Update monthly tracking
            await db.collection("users").doc(referrerL1Uid).update({
                pendingReferralRewards: admin.firestore.FieldValue.increment(adjustedTier1Reward),
                monthlyReferralRewards: admin.firestore.FieldValue.increment(adjustedTier1Reward),
                monthlyRewardResetDate: currentMonth,
            });
        }

        // 4. Calculate and create Tier 2 reward if L2 referrer exists
        if (referrerL2Uid && adjustedTier1Reward > 0) {
            const tier2Reward = adjustedTier1Reward * (rewardConfig.tier2Rate / 100);

            // Check L2's monthly cap
            const referrerL2Doc = await db.collection("users").doc(referrerL2Uid).get();
            const referrerL2Data = referrerL2Doc.data();

            let tier2Monthly = referrerL2Data?.monthlyReferralRewards ?? 0;
            if (referrerL2Data?.monthlyRewardResetDate !== currentMonth) {
                tier2Monthly = 0;
            }

            const adjustedTier2Reward = Math.min(tier2Reward, monthlyCap - tier2Monthly);

            if (adjustedTier2Reward > 0) {
                await db.collection("pendingRewards").add({
                    recipientUid: referrerL2Uid,
                    sourceUid: sourceUserUid,
                    type: rewardType,
                    tier: 2,
                    amount: adjustedTier2Reward,
                    status: "pending",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    payableAt: payableAt,
                });

                await db.collection("users").doc(referrerL2Uid).update({
                    pendingReferralRewards: admin.firestore.FieldValue.increment(adjustedTier2Reward),
                    monthlyReferralRewards: admin.firestore.FieldValue.increment(adjustedTier2Reward),
                    monthlyRewardResetDate: currentMonth,
                });
            }
        }

        functions.logger.info(`Referral rewards processed for ${sourceUserUid} (${rewardType}): L1=${adjustedTier1Reward}`);

        return {
            success: true,
            tier1Reward: adjustedTier1Reward,
        };
    } catch (error: any) {
        functions.logger.error("processReferralReward error:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "Failed to process referral reward");
    }
});

// ============================================
// dailyStakingSettlement - Scheduled Function (runs daily)
// ============================================
// Calculates and distributes staking rewards for all users
// Formula: Daily Interest = (Staked Amount × APY) / 365
// Booster APY is applied based on daily ad watch time achievement
import { onSchedule } from "firebase-functions/v2/scheduler";

export const dailyStakingSettlement = onSchedule({
    schedule: "0 0 * * *",  // Run at midnight every day (UTC)
    timeZone: "Asia/Seoul",
    retryCount: 3,
}, async (event) => {
    const db = admin.firestore();
    const today = new Date().toISOString().slice(0, 10);

    functions.logger.info(`Starting daily staking settlement for ${today}`);

    try {
        // 1. Get staking settings
        const stakingDoc = await db.collection("settings").doc("staking").get();
        const stakingSettings = stakingDoc.exists ? stakingDoc.data() : null;

        const baseApy = stakingSettings?.baseApy ?? 5;           // 5% default
        const boosterApy = stakingSettings?.boosterApy ?? 12;    // 12% default
        const dailyAdThreshold = stakingSettings?.dailyAdThreshold ?? 300;  // 5 min default
        const boosterTiers = stakingSettings?.boosterTiers ?? [
            { minAchievement: 50, rewardRate: 30 },
        ];

        // 2. Get all users with staked balance
        const usersSnapshot = await db.collection("users")
            .where("staked", ">", 0)
            .get();

        functions.logger.info(`Processing ${usersSnapshot.size} users with staked balance`);

        let totalRewardsDistributed = 0;
        let usersProcessed = 0;

        // 3. Process each user
        const batch = db.batch();
        const rewardPromises: Promise<any>[] = [];

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const stakedAmount = userData.staked || 0;

            if (stakedAmount <= 0) continue;

            // 3a. Calculate base daily interest
            // Daily Interest = (Staked × Base APY) / 365
            const baseDailyRate = baseApy / 100 / 365;
            const baseReward = stakedAmount * baseDailyRate;

            // 3b. Calculate booster reward based on ad watch time
            let boosterReward = 0;
            const dailyAdWatchTime = userData.dailyAdWatchTime ?? 0;
            const dailyAdWatchDate = userData.dailyAdWatchDate;

            // Only apply booster if user watched ads today
            if (dailyAdWatchDate === today && dailyAdWatchTime > 0) {
                const achievementPercent = Math.min(100, (dailyAdWatchTime / dailyAdThreshold) * 100);

                // Find applicable tier (sorted descending)
                const sortedTiers = [...boosterTiers].sort((a: any, b: any) => b.minAchievement - a.minAchievement);
                let boosterRate = 0;

                for (const tier of sortedTiers) {
                    if (achievementPercent >= tier.minAchievement) {
                        boosterRate = tier.rewardRate;
                        break;
                    }
                }

                if (boosterRate > 0) {
                    // Apply booster: Booster Reward = (Staked × Booster APY × Tier Rate%) / 365
                    const boosterDailyRate = (boosterApy / 100 / 365) * (boosterRate / 100);
                    boosterReward = stakedAmount * boosterDailyRate;
                }
            }

            const totalReward = baseReward + boosterReward;

            // 3c. Update user's pending rewards and claimable balance
            batch.update(userDoc.ref, {
                pending: admin.firestore.FieldValue.increment(totalReward),
                claimableBalance: admin.firestore.FieldValue.increment(totalReward),
                todayEarnings: totalReward,
                lastStakingRewardDate: today,
                // Reset daily ad watch time for tomorrow
                dailyAdWatchTime: 0,
                dailyAdWatchDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            });

            // 3d. Record transaction
            const txRef = userDoc.ref.collection("transactions").doc();
            batch.set(txRef, {
                type: "Staking",
                amount: totalReward,
                description: `스테이킹 보상 (Base: ${baseReward.toFixed(4)}, Booster: ${boosterReward.toFixed(4)})`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // 3e. Process referral rewards for staking
            if (userData.referrerL1 && totalReward > 0) {
                // Defer to avoid batch size limits
                rewardPromises.push(
                    processStakingReferralReward(db, userDoc.id, totalReward)
                );
            }

            totalRewardsDistributed += totalReward;
            usersProcessed++;
        }

        // 4. Commit batch
        await batch.commit();

        // 5. Process referral rewards (outside batch)
        await Promise.all(rewardPromises);

        functions.logger.info(`Daily staking settlement complete: ${usersProcessed} users, ${totalRewardsDistributed.toFixed(4)} VIEW total`);

        // onSchedule must return void
    } catch (error) {
        functions.logger.error("dailyStakingSettlement error:", error);
        throw error;
    }
});

// Helper function for staking referral rewards
async function processStakingReferralReward(
    db: FirebaseFirestore.Firestore,
    sourceUserUid: string,
    stakingReward: number
): Promise<void> {
    try {
        // Get referral settings
        const settingsDoc = await db.collection("settings").doc("referral").get();
        const settings = settingsDoc.exists ? settingsDoc.data() : null;

        if (!settings?.enabled || !settings?.rewards?.staking?.enabled) {
            return;
        }

        const tier1Rate = settings.rewards.staking.tier1Rate ?? 5;
        const tier2Rate = settings.rewards.staking.tier2Rate ?? 5;
        const monthlyCap = settings.monthlyCap ?? 100000;
        const paymentDelayDays = settings.paymentDelayDays ?? 7;

        // Get source user's referrers
        const sourceUserDoc = await db.collection("users").doc(sourceUserUid).get();
        const sourceUser = sourceUserDoc.data();

        if (!sourceUser?.referrerL1) return;

        const currentMonth = new Date().toISOString().slice(0, 7);
        const payableAt = new Date();
        payableAt.setDate(payableAt.getDate() + paymentDelayDays);

        // Process Tier 1 reward
        const tier1Reward = stakingReward * (tier1Rate / 100);

        const referrerL1Doc = await db.collection("users").doc(sourceUser.referrerL1).get();
        const referrerL1Data = referrerL1Doc.data();

        let tier1Monthly = referrerL1Data?.monthlyReferralRewards ?? 0;
        if (referrerL1Data?.monthlyRewardResetDate !== currentMonth) {
            tier1Monthly = 0;
        }

        const adjustedTier1 = Math.min(tier1Reward, monthlyCap - tier1Monthly);

        if (adjustedTier1 > 0) {
            await db.collection("pendingRewards").add({
                recipientUid: sourceUser.referrerL1,
                sourceUid: sourceUserUid,
                type: "staking",
                tier: 1,
                amount: adjustedTier1,
                status: "pending",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                payableAt: payableAt,
            });

            await db.collection("users").doc(sourceUser.referrerL1).update({
                pendingReferralRewards: admin.firestore.FieldValue.increment(adjustedTier1),
                monthlyReferralRewards: admin.firestore.FieldValue.increment(adjustedTier1),
                monthlyRewardResetDate: currentMonth,
            });

            // Process Tier 2 if exists
            if (sourceUser.referrerL2) {
                const tier2Reward = adjustedTier1 * (tier2Rate / 100);

                const referrerL2Doc = await db.collection("users").doc(sourceUser.referrerL2).get();
                const referrerL2Data = referrerL2Doc.data();

                let tier2Monthly = referrerL2Data?.monthlyReferralRewards ?? 0;
                if (referrerL2Data?.monthlyRewardResetDate !== currentMonth) {
                    tier2Monthly = 0;
                }

                const adjustedTier2 = Math.min(tier2Reward, monthlyCap - tier2Monthly);

                if (adjustedTier2 > 0) {
                    await db.collection("pendingRewards").add({
                        recipientUid: sourceUser.referrerL2,
                        sourceUid: sourceUserUid,
                        type: "staking",
                        tier: 2,
                        amount: adjustedTier2,
                        status: "pending",
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        payableAt: payableAt,
                    });

                    await db.collection("users").doc(sourceUser.referrerL2).update({
                        pendingReferralRewards: admin.firestore.FieldValue.increment(adjustedTier2),
                        monthlyReferralRewards: admin.firestore.FieldValue.increment(adjustedTier2),
                        monthlyRewardResetDate: currentMonth,
                    });
                }
            }
        }
    } catch (error) {
        functions.logger.error("processStakingReferralReward error:", error);
    }
}

// ============================================
// updateTokenPrice - Scheduled Function (runs hourly)
// ============================================
// Fetches VIEW token price from exchange APIs and updates Firestore
// Supports MEXC and LBANK with automatic fallback
export const updateTokenPrice = onSchedule({
    schedule: "0 * * * *",  // Run every hour at minute 0
    timeZone: "Asia/Seoul",
    retryCount: 2,
}, async (event) => {
    const db = admin.firestore();

    functions.logger.info("Starting token price update");

    try {
        // 1. Get current tokenomics settings
        const settingsDoc = await db.collection("settings").doc("tokenomics").get();
        const settings = settingsDoc.exists ? settingsDoc.data() : null;

        // Check if API mode is enabled
        if (settings?.tokenPriceSource !== "api") {
            functions.logger.info("Token price source is manual, skipping API update");
            return;
        }

        let price: number | null = null;
        let source: string = "";

        // 2. Try MEXC API first (VIEW/USDT)
        try {
            const mexcResponse = await fetch(
                "https://api.mexc.com/api/v3/ticker/price?symbol=VIEWUSDT"
            );

            if (mexcResponse.ok) {
                const data = await mexcResponse.json();
                if (data.price) {
                    price = parseFloat(data.price);
                    source = "MEXC";
                    functions.logger.info(`MEXC price fetched: $${price}`);
                }
            }
        } catch (error) {
            functions.logger.warn("MEXC API failed:", error);
        }

        // 3. Fallback to LBANK API if MEXC fails
        if (!price) {
            try {
                // LBANK API format: GET /v2/ticker.do?symbol=view_usdt
                const lbankResponse = await fetch(
                    "https://api.lbank.me/v2/ticker.do?symbol=view_usdt"
                );

                if (lbankResponse.ok) {
                    const data = await lbankResponse.json();
                    if (data.data?.[0]?.ticker?.latest) {
                        price = parseFloat(data.data[0].ticker.latest);
                        source = "LBANK";
                        functions.logger.info(`LBANK price fetched: $${price}`);
                    }
                }
            } catch (error) {
                functions.logger.warn("LBANK API failed:", error);
            }
        }

        // 4. Fallback to CoinGecko API (if VIEW is listed)
        if (!price) {
            try {
                const coingeckoResponse = await fetch(
                    "https://api.coingecko.com/api/v3/simple/price?ids=view-token&vs_currencies=usd"
                );

                if (coingeckoResponse.ok) {
                    const data = await coingeckoResponse.json();
                    if (data["view-token"]?.usd) {
                        price = data["view-token"].usd;
                        source = "CoinGecko";
                        functions.logger.info(`CoinGecko price fetched: $${price}`);
                    }
                }
            } catch (error) {
                functions.logger.warn("CoinGecko API failed:", error);
            }
        }

        // 5. Update Firestore if price was fetched
        if (price && price > 0) {
            await db.collection("settings").doc("tokenomics").update({
                tokenPriceUsd: price,
                tokenPriceUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                tokenPriceSource: "api",
                lastPriceApiSource: source,
            });

            functions.logger.info(`Token price updated to $${price} from ${source}`);
        } else {
            functions.logger.warn("Could not fetch price from any API, keeping current price");

            // Record the failure but don't change the price
            await db.collection("settings").doc("tokenomics").update({
                lastPriceFetchError: new Date().toISOString(),
                lastPriceFetchMessage: "All API sources failed",
            });
        }
    } catch (error) {
        functions.logger.error("updateTokenPrice error:", error);
        throw error;
    }
});

// ============================================
// manualUpdateTokenPrice - Callable Function
// ============================================
// Allows admin to manually trigger a price update
export const manualUpdateTokenPrice = onCall({
    cors: true,
}, async (request) => {
    // Only allow authenticated users (admin check could be added)
    if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "Authentication required");
    }

    const db = admin.firestore();

    try {
        let price: number | null = null;
        let source: string = "";
        const errors: string[] = [];

        // Try MEXC
        try {
            const mexcResponse = await fetch(
                "https://api.mexc.com/api/v3/ticker/price?symbol=VIEWUSDT"
            );
            if (mexcResponse.ok) {
                const data = await mexcResponse.json();
                if (data.price) {
                    price = parseFloat(data.price);
                    source = "MEXC";
                }
            }
        } catch (e: any) {
            errors.push(`MEXC: ${e.message}`);
        }

        // Try LBANK
        if (!price) {
            try {
                const lbankResponse = await fetch(
                    "https://api.lbank.me/v2/ticker.do?symbol=view_usdt"
                );
                if (lbankResponse.ok) {
                    const data = await lbankResponse.json();
                    if (data.data?.[0]?.ticker?.latest) {
                        price = parseFloat(data.data[0].ticker.latest);
                        source = "LBANK";
                    }
                }
            } catch (e: any) {
                errors.push(`LBANK: ${e.message}`);
            }
        }

        if (price && price > 0) {
            await db.collection("settings").doc("tokenomics").update({
                tokenPriceUsd: price,
                tokenPriceUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                lastPriceApiSource: source,
            });

            return {
                success: true,
                price,
                source,
            };
        } else {
            return {
                success: false,
                errors,
                message: "Could not fetch price from any exchange API",
            };
        }
    } catch (error: any) {
        functions.logger.error("manualUpdateTokenPrice error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// uploadTaxonomy - Admin callable function
// Supports both legacy format and new Industry/Attribute separation
// ============================================
export const uploadTaxonomy = onCall({
    cors: true,
}, async (request) => {
    // 관리자 권한 확인
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const userEmail = request.auth.token.email;
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
        throw new HttpsError("permission-denied", "관리자만 접근 가능합니다.");
    }

    const db = admin.firestore();
    const { industryData, attributeData, legacyMode } = request.data || {};

    try {
        const results: string[] = [];

        // New format: Industry/Attribute separation
        if (industryData) {
            await db.doc('settings/taxonomy_industry').set({
                version: industryData.version || '1.1',
                type: 'industry',
                lastUpdated: industryData.lastUpdated || new Date().toISOString().split('T')[0],
                taxonomy: industryData.taxonomy,
                uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            results.push(`Industry taxonomy v${industryData.version || '1.1'} uploaded`);
        }

        if (attributeData) {
            await db.doc('settings/taxonomy_attributes').set({
                version: attributeData.version || '1.0',
                type: 'attributes',
                lastUpdated: attributeData.lastUpdated || new Date().toISOString().split('T')[0],
                attributes: attributeData.attributes,
                uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            results.push(`Attribute taxonomy v${attributeData.version || '1.0'} uploaded`);
        }

        // Update metadata if new format data was provided
        if (industryData || attributeData) {
            await db.doc('settings/taxonomy_meta').set({
                industryVersion: industryData?.version || '1.1',
                attributeVersion: attributeData?.version || '1.0',
                lastSync: admin.firestore.FieldValue.serverTimestamp(),
                status: 'active',
            });
            results.push('Metadata updated');
        }

        // Legacy format support (for backward compatibility)
        if (legacyMode || (!industryData && !attributeData)) {
            const taxonomyData = {
                version: "1.0",
                lastUpdated: "2025-11-06",
                maintainer: "VIEW Protocol – CODEX Advertising Intelligence",
                industries: {
                    Fashion: { displayName: "패션", icon: "👗", products: { Apparel: { displayName: "의류", subcategories: ["Menswear", "Womenswear", "Sportswear", "Outdoorwear", "Kidswear"] }, Footwear: { displayName: "신발", subcategories: ["Sneakers", "Sandals", "Boots", "High Heels"] }, Accessories: { displayName: "액세서리", subcategories: ["Bags", "Watches", "Jewelry", "Belts", "Glasses"] } } },
                    Beauty: { displayName: "뷰티", icon: "💄", products: { Skincare: { displayName: "스킨케어", subcategories: ["Anti-aging", "Whitening", "Moisturizing", "Sunscreen", "Serum"] }, Makeup: { displayName: "메이크업", subcategories: ["Lipstick", "Foundation", "Mascara", "Eyeliner"] } } },
                    Technology: { displayName: "기술", icon: "📱", products: { Consumer_Electronics: { displayName: "가전", subcategories: ["Smartphone", "Laptop", "Tablet", "Smartwatch"] }, Software: { displayName: "소프트웨어", subcategories: ["Productivity", "Security", "Cloud Service"] } } },
                }
            };
            await db.doc("taxonomy/v1").set(taxonomyData);
            results.push("Legacy taxonomy v1 uploaded");
        }

        functions.logger.info("Taxonomy upload complete", { results, admin: userEmail });

        return {
            success: true,
            message: "분류 체계가 성공적으로 업로드되었습니다.",
            results
        };
    } catch (error: any) {
        functions.logger.error("uploadTaxonomy error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// uploadSurveys - 설문 데이터 업로드 (Admin Only)
// ============================================
export const uploadSurveys = onCall({
    cors: true,
}, async (request) => {
    // Admin check
    if (!request.auth?.token.email || !ADMIN_EMAILS.includes(request.auth.token.email)) {
        throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    const db = admin.firestore();

    // 6개 카테고리 x 10문항 = 60문항
    const surveyData = {
        demographics: {
            id: "demographics",
            category: "demographics",
            categoryNameKo: "기본 정보",
            order: 1,
            completionBonus: 50,
            isActive: true,
            questions: [
                { id: "d1", order: 1, question: "연령대를 선택해주세요", type: "single", options: ["10대", "20대 초반", "20대 후반", "30대 초반", "30대 후반", "40대", "50대 이상"], reward: 5, required: true },
                { id: "d2", order: 2, question: "성별을 선택해주세요", type: "single", options: ["남성", "여성", "기타/응답거부"], reward: 5, required: true },
                { id: "d3", order: 3, question: "거주 지역을 선택해주세요", type: "single", options: ["서울", "경기/인천", "부산/울산/경남", "대구/경북", "광주/전라", "대전/충청", "강원", "제주", "해외"], reward: 5, required: true },
                { id: "d4", order: 4, question: "직업을 선택해주세요", type: "single", options: ["학생", "직장인", "자영업", "프리랜서", "주부", "무직/구직중", "기타"], reward: 5, required: true },
                { id: "d5", order: 5, question: "최종 학력을 선택해주세요", type: "single", options: ["고졸 이하", "대학 재학", "대졸", "대학원 이상"], reward: 5, required: true },
                { id: "d6", order: 6, question: "월 평균 소득 범위를 선택해주세요", type: "single", options: ["없음", "100만원 미만", "100-200만원", "200-300만원", "300-500만원", "500만원 이상"], reward: 10, required: true },
                { id: "d7", order: 7, question: "결혼 여부를 선택해주세요", type: "single", options: ["미혼", "기혼(자녀없음)", "기혼(자녀있음)", "기타"], reward: 5, required: true },
                { id: "d8", order: 8, question: "주로 사용하는 스마트폰은?", type: "single", options: ["iPhone", "삼성 갤럭시", "기타 안드로이드", "기타"], reward: 5, required: true },
                { id: "d9", order: 9, question: "하루 평균 스마트폰 사용 시간은?", type: "single", options: ["1시간 미만", "1-3시간", "3-5시간", "5시간 이상"], reward: 5, required: true },
                { id: "d10", order: 10, question: "주로 사용하는 SNS를 모두 선택해주세요", type: "multiple", options: ["인스타그램", "유튜브", "틱톡", "페이스북", "트위터/X", "네이버 블로그", "기타"], reward: 10, required: true }
            ]
        },
        spending: {
            id: "spending",
            category: "spending",
            categoryNameKo: "소비 성향",
            order: 2,
            completionBonus: 100,
            isActive: true,
            questions: [
                { id: "s1", order: 1, question: "구매 시 가격과 브랜드 중 어느 것을 더 중시하나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["가격 중시", "브랜드 중시"] },
                { id: "s2", order: 2, question: "할인/세일에 얼마나 민감하게 반응하나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["무관심", "매우 민감"] },
                { id: "s3", order: 3, question: "충동구매를 얼마나 자주 하나요?", type: "single", options: ["거의 안함", "가끔", "보통", "자주", "매우 자주"], reward: 10, required: true },
                { id: "s4", order: 4, question: "쇼핑 스타일은 어떤가요?", type: "single", options: ["계획적 구매", "비교 후 구매", "즉흥적 구매", "추천따라 구매"], reward: 10, required: true },
                { id: "s5", order: 5, question: "구매 전 리뷰를 얼마나 확인하나요?", type: "single", options: ["거의 안봄", "간단히 확인", "꼼꼼히 확인", "리뷰가 결정적"], reward: 10, required: true },
                { id: "s6", order: 6, question: "신제품이 나오면 빨리 사보는 편인가요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["기다림", "바로 구매"] },
                { id: "s7", order: 7, question: "온라인/오프라인 중 선호하는 쇼핑 방식은?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["오프라인", "온라인"] },
                { id: "s8", order: 8, question: "친환경/지속가능성 제품을 선호하나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["무관심", "매우 중요"] },
                { id: "s9", order: 9, question: "구독 서비스(넷플릭스, 밀키트 등)를 이용하나요?", type: "single", options: ["없음", "1-2개", "3-4개", "5개 이상"], reward: 10, required: true },
                { id: "s10", order: 10, question: "지인 추천이 구매에 미치는 영향은?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["영향 없음", "결정적"] }
            ]
        },
        shopping: {
            id: "shopping",
            category: "shopping",
            categoryNameKo: "쇼핑 패턴",
            order: 3,
            completionBonus: 100,
            isActive: true,
            questions: [
                { id: "sh1", order: 1, question: "주로 쇼핑하는 시간대는?", type: "single", options: ["오전", "점심-오후", "저녁", "밤/새벽", "불규칙"], reward: 10, required: true },
                { id: "sh2", order: 2, question: "자주 이용하는 쇼핑 플랫폼을 선택해주세요", type: "multiple", options: ["쿠팡", "네이버쇼핑", "무신사", "SSG/G마켓", "11번가", "오프라인매장", "해외직구"], reward: 15, required: true, taxonomyMapping: { "쿠팡": ["Food_Beverage", "Home_Living"], "무신사": ["Fashion.Apparel", "Fashion.Footwear"], "네이버쇼핑": ["Technology", "Beauty"] } },
                { id: "sh3", order: 3, question: "주로 구매하는 결제 수단은?", type: "single", options: ["신용카드", "체크카드", "간편결제(카카오페이 등)", "무통장입금", "페이후결제"], reward: 10, required: true },
                { id: "sh4", order: 4, question: "쇼핑 시 주로 사용하는 기기는?", type: "single", options: ["스마트폰", "PC/노트북", "태블릿", "모두 비슷하게"], reward: 10, required: true },
                { id: "sh5", order: 5, question: "배송 속도를 위해 추가 비용을 내시나요?", type: "single", options: ["절대 안낸다", "가끔", "자주", "항상 빠른배송"], reward: 10, required: true },
                { id: "sh6", order: 6, question: "멤버십/유료회원 서비스에 가입되어 있나요?", type: "multiple", options: ["쿠팡 로켓와우", "네이버플러스", "SSG머니", "아마존프라임", "없음"], reward: 10, required: true },
                { id: "sh7", order: 7, question: "최근 1개월 내 온라인 쇼핑 횟수는?", type: "single", options: ["0회", "1-2회", "3-5회", "6-10회", "10회 이상"], reward: 10, required: true },
                { id: "sh8", order: 8, question: "장바구니에 담고 구매하지 않는 경우가 있나요?", type: "single", options: ["거의 없음", "가끔", "자주", "대부분 그렇다"], reward: 10, required: true },
                { id: "sh9", order: 9, question: "앱 푸시알림으로 구매한 경험이 있나요?", type: "single", options: ["없음", "가끔", "자주", "대부분 그렇게 구매"], reward: 10, required: true },
                { id: "sh10", order: 10, question: "반품/교환 경험은?", type: "single", options: ["거의 없음", "가끔", "자주"], reward: 5, required: true }
            ]
        },
        power: {
            id: "power",
            category: "power",
            categoryNameKo: "소비력",
            order: 4,
            completionBonus: 150,
            isActive: true,
            questions: [
                { id: "p1", order: 1, question: "월 평균 쇼핑 지출액은?", type: "single", options: ["10만원 미만", "10-30만원", "30-50만원", "50-100만원", "100만원 이상"], reward: 15, required: true },
                { id: "p2", order: 2, question: "가장 많이 지출하는 카테고리는?", type: "single", options: ["패션/뷰티", "식품/식료품", "전자제품", "여행/레저", "취미/엔터테인먼트", "생활용품"], reward: 15, required: true, taxonomyMapping: { "패션/뷰티": ["Fashion", "Beauty"], "식품/식료품": ["Food_Beverage"], "전자제품": ["Technology.Consumer_Electronics"], "여행/레저": ["Travel"], "취미/엔터테인먼트": ["Entertainment"] } },
                { id: "p3", order: 3, question: "한 번 구매 시 평균 결제 금액은?", type: "single", options: ["1만원 미만", "1-3만원", "3-5만원", "5-10만원", "10만원 이상"], reward: 15, required: true },
                { id: "p4", order: 4, question: "대기업 브랜드 vs 중소기업 브랜드 선호도는?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["중소기업", "대기업"] },
                { id: "p5", order: 5, question: "명품/프리미엄 제품 구매 경험은?", type: "single", options: ["없음", "가끔", "자주", "주로 명품 구매"], reward: 15, required: true },
                { id: "p6", order: 6, question: "'비싸면 품질이 좋다'에 동의하나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["동의안함", "매우 동의"] },
                { id: "p7", order: 7, question: "신용카드 할부 이용 빈도는?", type: "single", options: ["사용안함", "가끔 2-3개월", "자주 6개월 이상", "무이자할부만"], reward: 10, required: true },
                { id: "p8", order: 8, question: "투자/재테크에 관심이 있나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["무관심", "매우 관심"] },
                { id: "p9", order: 9, question: "자동차를 소유하고 있나요?", type: "single", options: ["없음", "소형차", "중형차", "대형차/SUV", "수입차"], reward: 15, required: true },
                { id: "p10", order: 10, question: "본인의 소비 수준을 평가한다면?", type: "slider", min: 1, max: 5, reward: 15, required: true, sliderLabels: ["절약형", "고소비형"] }
            ]
        },
        history: {
            id: "history",
            category: "history",
            categoryNameKo: "구매 이력",
            order: 5,
            completionBonus: 150,
            isActive: true,
            questions: [
                { id: "h1", order: 1, question: "최근 3개월 내 가장 큰 지출은?", type: "single", options: ["10만원 미만", "10-30만원", "30-50만원", "50-100만원", "100만원 이상"], reward: 15, required: true },
                { id: "h2", order: 2, question: "최근 구매한 전자제품은?", type: "multiple", options: ["스마트폰", "노트북/PC", "태블릿", "이어폰/헤드폰", "스마트워치", "없음"], reward: 15, required: true, taxonomyMapping: { "스마트폰": ["Technology.Consumer_Electronics.Smartphone"], "노트북/PC": ["Technology.Consumer_Electronics.Computer"], "스마트워치": ["Technology.Wearables"] } },
                { id: "h3", order: 3, question: "최근 6개월 내 여행 경험은?", type: "single", options: ["없음", "국내 1-2회", "국내 3회 이상", "해외 1회", "해외 2회 이상"], reward: 15, required: true, taxonomyMapping: { "해외 1회": ["Travel.International"], "해외 2회 이상": ["Travel.International"] } },
                { id: "h4", order: 4, question: "정기적으로 구매하는 소모품은?", type: "multiple", options: ["화장품/스킨케어", "건강보조식품", "식료품", "반려동물용품", "없음"], reward: 10, required: true },
                { id: "h5", order: 5, question: "최근 1년 내 대형가전 구매 경험은?", type: "single", options: ["없음", "1개", "2-3개", "3개 이상"], reward: 15, required: true },
                { id: "h6", order: 6, question: "온라인 쇼핑 비중은 전체의 몇 %?", type: "single", options: ["20% 미만", "20-40%", "40-60%", "60-80%", "80% 이상"], reward: 10, required: true },
                { id: "h7", order: 7, question: "패션 아이템 구매 빈도는?", type: "single", options: ["월 1회 미만", "월 1-2회", "월 3회 이상", "시즌마다"], reward: 10, required: true },
                { id: "h8", order: 8, question: "외식/배달 빈도는?", type: "single", options: ["거의 안함", "주 1-2회", "주 3-4회", "거의 매일"], reward: 10, required: true },
                { id: "h9", order: 9, question: "헬스/피트니스 관련 지출은?", type: "single", options: ["없음", "월 10만원 미만", "월 10-30만원", "월 30만원 이상"], reward: 10, required: true },
                { id: "h10", order: 10, question: "최근 구독 시작한 서비스는?", type: "multiple", options: ["OTT(넷플릭스 등)", "음악(멜론 등)", "뉴스/잡지", "클라우드/생산성", "없음"], reward: 10, required: true }
            ]
        },
        lifecycle: {
            id: "lifecycle",
            category: "lifecycle",
            categoryNameKo: "생애 주기",
            order: 6,
            completionBonus: 150,
            isActive: true,
            questions: [
                { id: "l1", order: 1, question: "현재 주거 형태는?", type: "single", options: ["부모님과 동거", "자취/원룸", "아파트/자가", "아파트/전월세", "기타"], reward: 15, required: true },
                { id: "l2", order: 2, question: "향후 1년 내 계획은?", type: "multiple", options: ["이직/취업", "결혼", "출산", "이사", "차량구매", "해외여행", "없음"], reward: 15, required: true },
                { id: "l3", order: 3, question: "자녀가 있다면 연령대는?", type: "single", options: ["자녀 없음", "영유아(0-6세)", "초등학생", "중고등학생", "성인 자녀"], reward: 10, required: true },
                { id: "l4", order: 4, question: "반려동물을 키우고 있나요?", type: "single", options: ["없음", "강아지", "고양이", "기타 동물", "2마리 이상"], reward: 10, required: true, taxonomyMapping: { "강아지": ["Home_Living.Pet_Supplies"], "고양이": ["Home_Living.Pet_Supplies"] } },
                { id: "l5", order: 5, question: "가장 관심있는 취미/여가는?", type: "multiple", options: ["운동/피트니스", "게임", "독서", "음악/공연", "여행", "요리", "투자/재테크"], reward: 15, required: true, taxonomyMapping: { "운동/피트니스": ["Health_Wellness.Fitness"], "게임": ["Entertainment.Gaming"], "여행": ["Travel"], "요리": ["Food_Beverage"] } },
                { id: "l6", order: 6, question: "건강 관리에 얼마나 투자하나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["거의 안함", "많이 투자"] },
                { id: "l7", order: 7, question: "보험 가입 상태는?", type: "single", options: ["없음", "기본만", "여러 개", "종합보험"], reward: 10, required: true },
                { id: "l8", order: 8, question: "자기계발에 투자하는 편인가요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["거의 안함", "적극 투자"] },
                { id: "l9", order: 9, question: "환경/사회 문제에 관심이 있나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["무관심", "매우 관심"] },
                { id: "l10", order: 10, question: "향후 가장 큰 예상 지출은?", type: "single", options: ["주거(전월세/매매)", "자동차", "결혼/육아", "교육/자기계발", "여행", "특별히 없음"], reward: 15, required: true }
            ]
        }
    };

    try {
        const batch = db.batch();

        for (const [categoryId, survey] of Object.entries(surveyData)) {
            const ref = db.doc(`surveys/${categoryId}`);
            batch.set(ref, survey);
        }

        await batch.commit();

        functions.logger.info("Surveys uploaded successfully", { categories: Object.keys(surveyData).length });

        return {
            success: true,
            message: "✅ 60문항 설문 데이터가 업로드되었습니다.",
            stats: {
                categories: Object.keys(surveyData).length,
                totalQuestions: 60
            }
        };
    } catch (error: any) {
        functions.logger.error("uploadSurveys error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// Survey CRUD Operations (Admin Only)
// ============================================

// Create new survey category
export const createSurveyCategory = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth?.token.email || !ADMIN_EMAILS.includes(request.auth.token.email)) {
        throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    const { categoryId, categoryNameKo, completionBonus, order } = request.data;

    if (!categoryId || !categoryNameKo) {
        throw new HttpsError("invalid-argument", "카테고리 ID와 이름이 필요합니다.");
    }

    const db = admin.firestore();

    try {
        const existingDoc = await db.doc(`surveys/${categoryId}`).get();
        if (existingDoc.exists) {
            throw new HttpsError("already-exists", "이미 존재하는 카테고리 ID입니다.");
        }

        await db.doc(`surveys/${categoryId}`).set({
            id: categoryId,
            category: categoryId,
            categoryNameKo,
            order: order || 999,
            completionBonus: completionBonus || 50,
            isActive: true,
            questions: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, message: "카테고리가 생성되었습니다." };
    } catch (error: any) {
        functions.logger.error("createSurveyCategory error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// Update survey category
export const updateSurveyCategory = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth?.token.email || !ADMIN_EMAILS.includes(request.auth.token.email)) {
        throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    const { categoryId, updates } = request.data;

    if (!categoryId) {
        throw new HttpsError("invalid-argument", "카테고리 ID가 필요합니다.");
    }

    const db = admin.firestore();

    try {
        const docRef = db.doc(`surveys/${categoryId}`);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new HttpsError("not-found", "카테고리를 찾을 수 없습니다.");
        }

        // Filter allowed fields
        const allowedUpdates: Record<string, any> = {};
        if (updates.categoryNameKo !== undefined) allowedUpdates.categoryNameKo = updates.categoryNameKo;
        if (updates.order !== undefined) allowedUpdates.order = updates.order;
        if (updates.completionBonus !== undefined) allowedUpdates.completionBonus = updates.completionBonus;
        if (updates.isActive !== undefined) allowedUpdates.isActive = updates.isActive;

        allowedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        await docRef.update(allowedUpdates);

        return { success: true, message: "카테고리가 수정되었습니다." };
    } catch (error: any) {
        functions.logger.error("updateSurveyCategory error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// Delete survey category
export const deleteSurveyCategory = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth?.token.email || !ADMIN_EMAILS.includes(request.auth.token.email)) {
        throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    const { categoryId } = request.data;

    if (!categoryId) {
        throw new HttpsError("invalid-argument", "카테고리 ID가 필요합니다.");
    }

    const db = admin.firestore();

    try {
        await db.doc(`surveys/${categoryId}`).delete();
        return { success: true, message: "카테고리가 삭제되었습니다." };
    } catch (error: any) {
        functions.logger.error("deleteSurveyCategory error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// Add question to category
export const addSurveyQuestion = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth?.token.email || !ADMIN_EMAILS.includes(request.auth.token.email)) {
        throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    const { categoryId, question } = request.data;

    if (!categoryId || !question) {
        throw new HttpsError("invalid-argument", "카테고리 ID와 질문 데이터가 필요합니다.");
    }

    const db = admin.firestore();

    try {
        const docRef = db.doc(`surveys/${categoryId}`);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new HttpsError("not-found", "카테고리를 찾을 수 없습니다.");
        }

        const data = doc.data();
        const questions = data?.questions || [];

        // Validate question structure
        const newQuestion = {
            id: question.id || `q${Date.now()}`,
            order: question.order || questions.length + 1,
            question: question.question,
            type: question.type || 'single',
            options: question.options || [],
            min: question.min,
            max: question.max,
            sliderLabels: question.sliderLabels,
            reward: question.reward || 10,
            required: question.required !== false,
        };

        questions.push(newQuestion);

        await docRef.update({
            questions,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, message: "질문이 추가되었습니다.", questionId: newQuestion.id };
    } catch (error: any) {
        functions.logger.error("addSurveyQuestion error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// Update question in category
export const updateSurveyQuestion = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth?.token.email || !ADMIN_EMAILS.includes(request.auth.token.email)) {
        throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    const { categoryId, questionId, updates } = request.data;

    if (!categoryId || !questionId) {
        throw new HttpsError("invalid-argument", "카테고리 ID와 질문 ID가 필요합니다.");
    }

    const db = admin.firestore();

    try {
        const docRef = db.doc(`surveys/${categoryId}`);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new HttpsError("not-found", "카테고리를 찾을 수 없습니다.");
        }

        const data = doc.data();
        const questions = data?.questions || [];
        const questionIndex = questions.findIndex((q: any) => q.id === questionId);

        if (questionIndex === -1) {
            throw new HttpsError("not-found", "질문을 찾을 수 없습니다.");
        }

        // Merge updates
        questions[questionIndex] = {
            ...questions[questionIndex],
            ...updates,
            id: questionId, // Preserve ID
        };

        await docRef.update({
            questions,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, message: "질문이 수정되었습니다." };
    } catch (error: any) {
        functions.logger.error("updateSurveyQuestion error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// Delete question from category
export const deleteSurveyQuestion = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth?.token.email || !ADMIN_EMAILS.includes(request.auth.token.email)) {
        throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    const { categoryId, questionId } = request.data;

    if (!categoryId || !questionId) {
        throw new HttpsError("invalid-argument", "카테고리 ID와 질문 ID가 필요합니다.");
    }

    const db = admin.firestore();

    try {
        const docRef = db.doc(`surveys/${categoryId}`);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new HttpsError("not-found", "카테고리를 찾을 수 없습니다.");
        }

        const data = doc.data();
        const questions = (data?.questions || []).filter((q: any) => q.id !== questionId);

        // Re-order remaining questions
        questions.forEach((q: any, idx: number) => {
            q.order = idx + 1;
        });

        await docRef.update({
            questions,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, message: "질문이 삭제되었습니다." };
    } catch (error: any) {
        functions.logger.error("deleteSurveyQuestion error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// submitSurveyAnswer - 설문 응답 제출
// ============================================
export const submitSurveyAnswer = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const { categoryId, questionId, answer, reward } = request.data;

    if (!categoryId || !questionId || answer === undefined) {
        throw new HttpsError("invalid-argument", "필수 정보가 누락되었습니다.");
    }

    const db = admin.firestore();

    try {
        // 1. 설문 응답 저장
        const responseRef = db.doc(`users/${uid}/surveyResponses/${categoryId}`);
        const responseDoc = await responseRef.get();

        const existingData = responseDoc.data();
        const responseData: {
            categoryId: string;
            responses: Record<string, any>;
            progress: { completed: number; total: number; completionRate?: number };
            totalReward: number;
            startedAt: any;
        } = existingData ? {
            categoryId: existingData.categoryId || categoryId,
            responses: existingData.responses || {},
            progress: existingData.progress || { completed: 0, total: 10 },
            totalReward: existingData.totalReward || 0,
            startedAt: existingData.startedAt || admin.firestore.FieldValue.serverTimestamp()
        } : {
                categoryId,
                responses: {},
                progress: { completed: 0, total: 10 },
                totalReward: 0,
                startedAt: admin.firestore.FieldValue.serverTimestamp()
            };

        responseData.responses[questionId] = {
            answer,
            answeredAt: admin.firestore.FieldValue.serverTimestamp(),
            reward: reward || 10
        };
        responseData.progress.completed = Object.keys(responseData.responses).length;
        responseData.progress.completionRate = (responseData.progress.completed / responseData.progress.total) * 100;
        responseData.totalReward = Object.values(responseData.responses).reduce((sum: number, r: any) => sum + (r.reward || 0), 0);

        await responseRef.set(responseData, { merge: true });

        // 2. 보상 지급
        if (reward && reward > 0) {
            await db.doc(`users/${uid}`).update({
                balance: admin.firestore.FieldValue.increment(reward)
            });
        }

        // 3. 활동 로그 기록
        await db.collection(`users/${uid}/activities`).add({
            type: "survey",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            reward: reward || 0,
            details: {
                categoryId,
                questionId
            }
        });

        return {
            success: true,
            progress: responseData.progress,
            totalReward: responseData.totalReward
        };
    } catch (error: any) {
        functions.logger.error("submitSurveyAnswer error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// getSurveys - 설문 목록 조회
// ============================================
export const getSurveys = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    try {
        // 설문 정의 조회 (정렬은 클라이언트에서)
        const surveysSnap = await db.collection("surveys").get();
        const surveys = surveysSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        // 유저 응답 조회
        const responsesSnap = await db.collection(`users/${uid}/surveyResponses`).get();
        const responses: Record<string, any> = {};
        responsesSnap.docs.forEach(doc => {
            responses[doc.id] = doc.data();
        });

        return {
            success: true,
            surveys,
            responses
        };
    } catch (error: any) {
        functions.logger.error("getSurveys error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// calculatePersona - 페르소나 계산/갱신
// ============================================
export const calculatePersona = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    try {
        // 1. 설문 응답 조회
        const responsesSnap = await db.collection(`users/${uid}/surveyResponses`).get();
        const responses: Record<string, any> = {};
        responsesSnap.docs.forEach(doc => {
            responses[doc.id] = doc.data();
        });

        // 2. 활동 로그 조회
        const activitiesSnap = await db.collection(`users/${uid}/activities`)
            .orderBy("createdAt", "desc")
            .limit(500)
            .get();
        const activities = activitiesSnap.docs.map(doc => doc.data());

        // 3. 특성 점수 계산 (0-1 scale) - 10 Traits Model
        const traits = {
            // 기존 5가지
            priceVsBrand: 0.5,       // 가격 중시(0) ↔ 브랜드 중시(1)
            impulseBuying: 0.5,      // 신중한 구매(0) ↔ 충동 구매(1)
            earlyAdopter: 0.5,       // 안정 추구(0) ↔ 얼리어답터(1)
            onlinePreference: 0.5,   // 오프라인(0) ↔ 온라인(1)
            purchasingPower: 0.5,    // 저예산(0) ↔ 고예산(1)
            // 확장 5가지
            brandLoyalty: 0.5,       // 다양한 브랜드(0) ↔ 충성 고객(1)
            socialInfluence: 0.5,    // 독립적 결정(0) ↔ 사회적 영향(1)
            sustainabilityValue: 0.5,// 무관심(0) ↔ ESG/친환경 중시(1)
            experienceSeeker: 0.5,   // 소유 중시(0) ↔ 경험 중시(1)
            planningHorizon: 0.5,    // 즉시 구매(0) ↔ 장기 계획(1)
        };

        // spending 카테고리 응답 분석
        const spending = responses['spending']?.responses || {};

        // s1: 가격 vs 브랜드 (slider 1-5)
        if (spending['s1']?.answer) {
            traits.priceVsBrand = (spending['s1'].answer - 1) / 4;
        }

        // s3: 충동구매 빈도
        const impulseMap: Record<string, number> = { '거의 안함': 0.1, '가끔': 0.3, '보통': 0.5, '자주': 0.7, '매우 자주': 0.9 };
        if (spending['s3']?.answer && impulseMap[spending['s3'].answer]) {
            traits.impulseBuying = impulseMap[spending['s3'].answer];
        }

        // s6: 신제품 (slider 1-5)
        if (spending['s6']?.answer) {
            traits.earlyAdopter = (spending['s6'].answer - 1) / 4;
        }

        // s7: 온/오프라인 (slider 1-5)
        if (spending['s7']?.answer) {
            traits.onlinePreference = (spending['s7'].answer - 1) / 4;
        }

        // power 카테고리 분석
        const power = responses['power']?.responses || {};

        // p10: 소비 수준 (slider 1-5)
        if (power['p10']?.answer) {
            traits.purchasingPower = (power['p10'].answer - 1) / 4;
        }

        // lifestyle 카테고리 분석 (확장 특성용)
        const lifestyle = responses['lifestyle']?.responses || {};
        const values = responses['values']?.responses || {};

        // 브랜드 충성도 - 활동 로그에서 반복 구매 패턴 분석
        const brandCounts: Record<string, number> = {};
        for (const activity of activities) {
            if (activity.brand) {
                brandCounts[activity.brand] = (brandCounts[activity.brand] || 0) + 1;
            }
        }
        const brandValues = Object.values(brandCounts);
        if (brandValues.length > 0) {
            const maxBrandPurchase = Math.max(...brandValues);
            const totalPurchases = brandValues.reduce((a, b) => a + b, 0);
            traits.brandLoyalty = Math.min(1, (maxBrandPurchase / totalPurchases) * 1.5);
        }

        // 사회적 영향력 수용도 - 리뷰/인플루언서 반응 기반
        if (lifestyle['l1']?.answer) { // 구매 전 리뷰 확인 빈도
            traits.socialInfluence = (lifestyle['l1'].answer - 1) / 4;
        }

        // 지속가능성 가치 - ESG/친환경 관심도
        if (values['v1']?.answer) { // 친환경 제품 선호도
            traits.sustainabilityValue = (values['v1'].answer - 1) / 4;
        }
        // 활동 로그에서 ESG 태그 비율 반영
        const esgActivities = activities.filter(a =>
            (a.taxonomyTags || []).some((t: string) => t.includes('ESG') || t.includes('Sustainability'))
        );
        if (activities.length > 0) {
            const esgRatio = esgActivities.length / activities.length;
            traits.sustainabilityValue = (traits.sustainabilityValue + esgRatio) / 2;
        }

        // 경험 추구 성향 - 여행/체험 vs 물건 구매 비율
        const experienceCategories = ['Travel', 'Entertainment', 'Health_Wellness'];
        const experienceActivities = activities.filter(a =>
            (a.taxonomyTags || []).some((t: string) =>
                experienceCategories.some(cat => t.startsWith(cat))
            )
        );
        if (activities.length > 0) {
            traits.experienceSeeker = Math.min(1, (experienceActivities.length / activities.length) * 2);
        }

        // 계획 기간 - 구매 결정까지 걸리는 시간
        const planningMap: Record<string, number> = { '즉시': 0.1, '하루': 0.3, '일주일': 0.5, '한달': 0.7, '그 이상': 0.9 };
        if (spending['s8']?.answer && planningMap[spending['s8'].answer]) {
            traits.planningHorizon = planningMap[spending['s8'].answer];
        }


        // 4. Taxonomy 점수 집계
        const taxonomyScores: Record<string, number> = {};

        // 활동 로그에서 taxonomy 태그 집계
        for (const activity of activities) {
            const tags = activity.taxonomyTags || [];
            for (const tag of tags) {
                taxonomyScores[tag] = (taxonomyScores[tag] || 0) + 1;
            }
        }

        // 정규화
        const maxScore = Math.max(...Object.values(taxonomyScores), 1);
        for (const key in taxonomyScores) {
            taxonomyScores[key] = Math.round((taxonomyScores[key] / maxScore) * 100) / 100;
        }

        // 상위 관심사 추출
        const sortedInterests = Object.entries(taxonomyScores)
            .sort(([, a], [, b]) => b - a);

        const primary = sortedInterests[0]?.[0]?.split('.')[0] || 'Technology';
        const secondary = sortedInterests
            .slice(1, 4)
            .map(([k]) => k.split('.')[0])
            .filter((v, i, arr) => arr.indexOf(v) === i);

        // 5. 페르소나 카드 부여 (확장된 30카드 시스템)
        const cards: any[] = [];
        const now = new Date().toISOString();

        // === 카테고리 1: 소비 성향 (Spending Style) ===

        // 프리미엄 웨일 (legendary)
        if (traits.purchasingPower >= 0.9 && traits.priceVsBrand >= 0.8) {
            cards.push({ id: 'premium_whale', name: '프리미엄 웨일', icon: '🐋', level: 10, rarity: 'legendary', category: 'spending', earnedAt: now });
        }
        // 럭셔리 러버 (epic)
        else if (traits.purchasingPower >= 0.7 && traits.priceVsBrand >= 0.6) {
            cards.push({ id: 'luxury_lover', name: '럭셔리 러버', icon: '💎', level: Math.round(traits.purchasingPower * 10), rarity: 'epic', category: 'spending', earnedAt: now });
        }

        // 스마트 세이버 vs 딜 헌터
        if (traits.priceVsBrand < 0.3) {
            cards.push({ id: 'smart_saver', name: '스마트 세이버', icon: '🎯', level: Math.round((1 - traits.priceVsBrand) * 10), rarity: 'common', category: 'spending', earnedAt: now });
        } else if (traits.priceVsBrand < 0.4 && traits.planningHorizon >= 0.6) {
            cards.push({ id: 'deal_hunter', name: '딜 헌터', icon: '🏷️', level: 7, rarity: 'uncommon', category: 'spending', earnedAt: now });
        }

        // 충동구매러 vs 계획적 구매자
        if (traits.impulseBuying >= 0.7) {
            cards.push({ id: 'impulse_buyer', name: '충동구매러', icon: '⚡', level: Math.round(traits.impulseBuying * 10), rarity: 'uncommon', category: 'spending', earnedAt: now });
        } else if (traits.planningHorizon >= 0.8 && traits.impulseBuying < 0.3) {
            cards.push({ id: 'calculated_planner', name: '계획적 구매자', icon: '📊', level: Math.round(traits.planningHorizon * 10), rarity: 'uncommon', category: 'spending', earnedAt: now });
        }

        // 브랜드 충성파 vs 브랜드 탐험가
        if (traits.brandLoyalty >= 0.8) {
            cards.push({ id: 'brand_loyalist', name: '브랜드 충성파', icon: '🏆', level: Math.round(traits.brandLoyalty * 10), rarity: 'rare', category: 'spending', earnedAt: now });
        } else if (traits.brandLoyalty < 0.3 && traits.earlyAdopter >= 0.5) {
            cards.push({ id: 'brand_explorer', name: '브랜드 탐험가', icon: '🧭', level: 6, rarity: 'uncommon', category: 'spending', earnedAt: now });
        }

        // === 카테고리 2: 라이프스타일 (Lifestyle) ===

        // 에코 워리어
        if (traits.sustainabilityValue >= 0.7) {
            cards.push({ id: 'eco_warrior', name: '에코 워리어', icon: '🌱', level: Math.round(traits.sustainabilityValue * 10), rarity: 'rare', category: 'lifestyle', earnedAt: now });
        }

        // 경험 추구자
        if (traits.experienceSeeker >= 0.7) {
            cards.push({ id: 'experience_seeker', name: '경험 추구자', icon: '🎭', level: Math.round(traits.experienceSeeker * 10), rarity: 'rare', category: 'lifestyle', earnedAt: now });
        }

        // 소셜 버터플라이
        if (traits.socialInfluence >= 0.7) {
            cards.push({ id: 'social_butterfly', name: '소셜 버터플라이', icon: '🦋', level: Math.round(traits.socialInfluence * 10), rarity: 'uncommon', category: 'lifestyle', earnedAt: now });
        }

        // 미니멀리스트
        if (traits.impulseBuying < 0.2 && traits.planningHorizon >= 0.7) {
            cards.push({ id: 'minimalist', name: '미니멀리스트', icon: '🧘', level: 7, rarity: 'rare', category: 'lifestyle', earnedAt: now });
        }

        // === 카테고리 3: 채널/테크 (Channel & Tech) ===

        // 디지털 네이티브 vs 오프라인 탐험가
        if (traits.onlinePreference >= 0.8) {
            cards.push({ id: 'digital_native', name: '디지털 네이티브', icon: '📱', level: Math.round(traits.onlinePreference * 10), rarity: 'common', category: 'channel', earnedAt: now });
        } else if (traits.onlinePreference < 0.3) {
            cards.push({ id: 'offline_explorer', name: '오프라인 탐험가', icon: '🏬', level: 6, rarity: 'uncommon', category: 'channel', earnedAt: now });
        } else if (traits.onlinePreference >= 0.4 && traits.onlinePreference <= 0.6) {
            cards.push({ id: 'omni_shopper', name: '옴니 쇼퍼', icon: '🔄', level: 6, rarity: 'uncommon', category: 'channel', earnedAt: now });
        }

        // 테크 얼리어답터
        if (traits.earlyAdopter >= 0.7 && (taxonomyScores['Technology'] || 0) > 0.3) {
            cards.push({ id: 'tech_early_adopter', name: '테크 얼리어답터', icon: '🚀', level: Math.round(traits.earlyAdopter * 10), rarity: 'epic', category: 'channel', earnedAt: now });
        }

        // 소셜커머스 팬
        if (traits.socialInfluence >= 0.6 && traits.onlinePreference >= 0.7) {
            cards.push({ id: 'social_commerce_fan', name: '소셜커머스 팬', icon: '📲', level: 7, rarity: 'uncommon', category: 'channel', earnedAt: now });
        }

        // === 카테고리 4: 산업 관심사 (Industry Interest) ===
        const industryCards = [
            { key: 'Fashion', id: 'fashionista', name: '패셔니스타', icon: '👗', rarity: 'uncommon' },
            { key: 'Beauty', id: 'beauty_maven', name: '뷰티 메이븐', icon: '💄', rarity: 'uncommon' },
            { key: 'Food_Beverage', id: 'foodie', name: '푸디', icon: '🍽️', rarity: 'common' },
            { key: 'Travel', id: 'travel_lover', name: '여행 러버', icon: '✈️', rarity: 'rare' },
            { key: 'Technology', id: 'tech_geek', name: '테크 긱', icon: '💻', rarity: 'uncommon' },
            { key: 'Entertainment', id: 'gamer', name: '게이머', icon: '🎮', rarity: 'uncommon' },
            { key: 'Home_Living', id: 'homemaker', name: '홈메이커', icon: '🏠', rarity: 'common' },
            { key: 'Finance', id: 'investor', name: '투자자', icon: '📈', rarity: 'rare' },
            { key: 'Health_Wellness', id: 'health_conscious', name: '헬스 컨셔스', icon: '💪', rarity: 'uncommon' },
        ];

        for (const ic of industryCards) {
            const score = taxonomyScores[ic.key] || 0;
            if (score > 0.5) {
                cards.push({
                    id: ic.id,
                    name: ic.name,
                    icon: ic.icon,
                    level: Math.round(score * 10),
                    rarity: ic.rarity,
                    category: 'interest',
                    earnedAt: now
                });
            }
        }

        // === 카테고리 5: 특별 등급 (Special Tier) ===
        const completionRate = Object.keys(responses).length / 6;
        const activityCount = activities.length;
        const estimatedDataValue = Math.round((completionRate * 3000) + (activityCount * 10) + (cards.length * 500));

        // VIP 멤버 (설문 80% 이상 + 높은 데이터 가치)
        if (completionRate >= 0.8 && estimatedDataValue >= 10000) {
            cards.push({ id: 'vip_member', name: 'VIP 멤버', icon: '👑', level: 10, rarity: 'legendary', category: 'special', earnedAt: now });
        }

        // 기본 카드 (아무것도 없을 때)
        if (cards.length === 0) {
            cards.push({ id: 'rising_star', name: '라이징 스타', icon: '⭐', level: 1, rarity: 'common', category: 'special', earnedAt: now });
        }

        // 6. 데이터 가치 계산 (월 예상 수익, 원) - estimatedDataValue 재사용
        const dataValue = estimatedDataValue;

        // 7. 페르소나 저장
        const persona = {
            traits,
            interests: {
                primary,
                secondary,
                scores: taxonomyScores,
            },
            cards,
            dataValue,
            lastCalculated: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.doc(`users/${uid}/persona/current`).set(persona, { merge: true });

        // 8. 유저 프로필에 요약 저장
        await db.doc(`users/${uid}`).update({
            personaLevel: Math.max(...cards.map(c => c.level)),
            personaTags: [primary, ...secondary].slice(0, 3),
            dataValue,
            surveyCompletion: Math.round(completionRate * 100),
        });

        functions.logger.info("Persona calculated", { uid, cards: cards.length, dataValue });

        return {
            success: true,
            persona,
        };
    } catch (error: any) {
        functions.logger.error("calculatePersona error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// getPersona - 페르소나 조회
// ============================================
export const getPersona = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    try {
        // Get both persona and user docs
        const [personaDoc, userDoc] = await Promise.all([
            db.doc(`users/${uid}/persona/current`).get(),
            db.doc(`users/${uid}`).get(),
        ]);

        const userData = userDoc.data() || {};

        if (!personaDoc.exists) {
            return {
                success: true,
                persona: null,
                needsCalculation: true,
                topAttributes: userData.topAttributes || [],
                attributeScoresCount: userData.attributeScoresCount || 0,
            };
        }

        const personaData = personaDoc.data() || {};

        return {
            success: true,
            persona: personaData,
            needsCalculation: false,
            // Include user-level attribute data
            topAttributes: userData.topAttributes || [],
            attributeScoresCount: userData.attributeScoresCount || 0,
            attributeScores: personaData.attributeScores || {},
            attributeScoresUpdatedAt: personaData.attributeScoresUpdatedAt,
        };
    } catch (error: any) {
        functions.logger.error("getPersona error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// getPersonaStats - 어드민용 페르소나 통계
// ============================================
export const getPersonaStats = onCall({
    cors: true,
}, async (request) => {
    // Pure Mock for Debugging - bypassing DB completely
    const stats = {
        totalAnalyzed: 124,
        avgDataValue: 4500,
        personaDistribution: { "Trend Setter (Fixed)": 40, "Smart Saver": 30, "Impulsive": 20, "Whale": 10, "Other": 24 },
        interestDistribution: { "Fashion": 50, "Tech": 30, "Food": 20, "Travel": 10, "Beauty": 14 }
    };

    return {
        success: true,
        stats,
        message: "Mock Data (Fallback)"
    };
});
// createCampaign - 광고 캠페인 생성
// ============================================
export const createCampaign = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    // In production, check if user is an advertiser
    const uid = request.auth.uid;
    const campaignData = request.data;
    const db = admin.firestore();

    try {
        // Validate Inputs
        if (!campaignData.name || !campaignData.budget) {
            throw new HttpsError("invalid-argument", "필수 정보가 누락되었습니다.");
        }

        const newCampaign = {
            advertiserId: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending_approval',
            ...campaignData
        };

        const docRef = await db.collection('campaigns').add(newCampaign);

        return {
            success: true,
            campaignId: docRef.id,
            message: "캠페인이 생성되었습니다. 승인 대기 중입니다."
        };
    } catch (error: any) {
        functions.logger.error("createCampaign error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// estimateReach - 타겟 도달 범위 예측
// ============================================
export const estimateReach = onCall({
    cors: true,
}, async (request) => {
    // No auth required for estimation? Maybe yes.
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { targetPersonas, productCategory } = request.data;

    // Logic: In real app, query users collection with filters.
    // Here, we simulate based on some heuristic or stats from getPersonaStats logic.

    // Mock Logic
    let baseUsers = 1000;
    let multiplier = 1.0;

    if (productCategory) multiplier += 0.2;
    if (targetPersonas && targetPersonas.length > 0) {
        // Assume each persona adds some distinct users
        baseUsers += targetPersonas.length * 450;
    }

    const estimatedUsers = Math.round(baseUsers * multiplier);
    const recommendedBid = 12; // VIEW token

    return {
        success: true,
        estimatedUsers,
        recommendedBid
    };
});

// ============================================
// checkReferralCode - 추천인 코드 유효성 검사
// ============================================
export const checkReferralCode = onCall({
    cors: true,
}, async (request) => {
    const { code } = request.data;
    if (!code) return { valid: false };

    const db = admin.firestore();
    const snapshot = await db.collection('users').where('referralCode', '==', code).get();

    const data = !snapshot.empty ? snapshot.docs[0].data() : null;
    return {
        valid: !snapshot.empty,
        referrerName: data ? (data as any).displayName || 'Unknown' : null
    };
});

// ============================================
// generateReferralCode - 내 추천 코드 생성
// ============================================
export const generateReferralCode = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);

    try {
        // Check if already exists
        const doc = await userRef.get();
        const userData = doc.data() as any;
        if (doc.exists && userData?.referralCode) {
            return { success: true, code: userData.referralCode };
        }

        // Generate Random Code (6 chars)
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Ensure Uniqueness (skip for MVP simple logic, but normally loop check)

        await userRef.set({
            referralCode: code,
            referralCount: 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return { success: true, code };
    } catch (error: any) {
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// registerReferral - 추천인 등록 및 보상 지급
// ============================================
export const registerReferral = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid; // Me
    const { code } = request.data;
    const db = admin.firestore();

    if (!code) {
        throw new HttpsError("invalid-argument", "코드가 없습니다.");
    }

    try {
        await db.runTransaction(async (t) => {
            // 1. Find Referrer
            const snapshot = await t.get(db.collection('users').where('referralCode', '==', code));
            if (snapshot.empty) {
                throw new HttpsError("not-found", "유효하지 않은 코드입니다.");
            }
            const referrerDoc = snapshot.docs[0];
            const referrerId = referrerDoc.id;

            // Self-referral check
            if (referrerId === uid) {
                throw new HttpsError("invalid-argument", "자기 자신을 추천할 수 없습니다.");
            }

            // 2. Check Me (Already referred?)
            const meRef = db.collection('users').doc(uid);
            const meDoc = await t.get(meRef);

            if (meDoc.exists && meDoc.data()?.referredBy) {
                throw new HttpsError("already-exists", "이미 추천인을 등록했습니다.");
            }

            // 3. Update & Give Reward -> Update 'dataValue' or 'points'
            const REWARD_AMOUNT = 500; // VIEW Points/Tokens

            // Update Referrer
            t.update(referrerDoc.ref, {
                referralCount: admin.firestore.FieldValue.increment(1),
                dataValue: admin.firestore.FieldValue.increment(REWARD_AMOUNT) // Using dataValue as Point for now
            });

            // Update Me
            t.set(meRef, {
                referredBy: referrerId,
                referredAt: admin.firestore.FieldValue.serverTimestamp(),
                dataValue: admin.firestore.FieldValue.increment(REWARD_AMOUNT)
            }, { merge: true });
        });

        return { success: true, message: "추천인 등록 완료! 500 Point 지급됨." };
    } catch (error: any) {
        functions.logger.error("registerReferral error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// BTC PREDICTION GAME
// ============================================

// settlePredictionGame - Scheduled Daily at 9 AM KST (0 AM UTC)
export const settlePredictionGame = functions.pubsub
    .schedule("0 0 * * *")
    .timeZone("Asia/Seoul")
    .onRun(async (context) => {
        const db = admin.firestore();

        // Get yesterday's date (since we run at 9 AM, we settle yesterday's game)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

        functions.logger.info(`Settling prediction game for ${dateStr}`);

        try {
            // 1. Get prediction game settings
            const settingsDoc = await db.doc('settings/predictionGame').get();
            const settings = settingsDoc.exists ? settingsDoc.data() : {};
            // 2. Get or create round document
            const roundRef = db.doc(`predictionRounds/${dateStr}`);
            const roundDoc = await roundRef.get();

            if (roundDoc.exists && roundDoc.data()?.status === 'settled') {
                functions.logger.info(`Round ${dateStr} already settled`);
                return null;
            }

            // 3. Fetch current BTC price
            let btcPrice = 0;
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
                const data = await response.json();
                btcPrice = data.bitcoin?.usd || 0;
            } catch (e) {
                functions.logger.error("Failed to fetch BTC price", e);
                return null;
            }

            if (btcPrice === 0) {
                functions.logger.error("BTC price is 0, skipping settlement");
                return null;
            }

            // 4. Find winning range (based on $500 steps)
            const rangeStep = settings?.priceRangeStep || 500;
            const lowerBound = Math.floor(btcPrice / rangeStep) * rangeStep;
            const upperBound = lowerBound + rangeStep;
            const winningRange = `$${lowerBound.toLocaleString()} ~ $${upperBound.toLocaleString()}`;

            // 5. Query all predictions for this date
            const predictionsQuery = await db.collectionGroup('predictions')
                .where('coin', '==', 'bitcoin')
                .get();

            // Filter by date (predictedAt within yesterday)
            const startOfDay = new Date(dateStr);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(dateStr);
            endOfDay.setHours(23, 59, 59, 999);

            const todayPredictions: any[] = [];
            let totalPool = 0;

            predictionsQuery.docs.forEach(doc => {
                const data = doc.data();
                const predictedAt = data.predictedAt?.toDate?.() || new Date(0);
                if (predictedAt >= startOfDay && predictedAt <= endOfDay) {
                    todayPredictions.push({
                        id: doc.id,
                        ref: doc.ref,
                        userId: doc.ref.parent.parent?.id,
                        ...data
                    });
                    totalPool += data.betAmount || 2;
                }
            });

            // ----------------------------------------
            // NEW LOGIC: Round Numbering & Jackpot
            // ----------------------------------------

            // Get Next Round ID
            const counterRef = db.doc('counters/predictionRound');
            let roundId = 1;

            await db.runTransaction(async (t) => {
                const doc = await t.get(counterRef);
                if (doc.exists) {
                    roundId = (doc.data()?.lastRoundId || 0) + 1;
                    t.update(counterRef, { lastRoundId: roundId });
                } else {
                    t.set(counterRef, { lastRoundId: 1 });
                }
            });

            // If no participants
            if (todayPredictions.length === 0) {
                functions.logger.info(`No predictions for ${dateStr}`);
                await roundRef.set({
                    roundId,
                    date: dateStr,
                    coin: 'bitcoin',
                    status: 'settled',
                    actualPrice: btcPrice,
                    winningRange,
                    totalPool: 0,
                    participantCount: 0,
                    winners: [],
                    totalWinners: 0,
                    totalDistributed: 0,
                    winnerPoolPercent: 50,
                    settledAt: admin.firestore.FieldValue.serverTimestamp()
                });
                return null;
            }

            // 6. Find Winners & Jackpot Winners
            const winningRangeWinners: any[] = [];
            const jackpotWinners: any[] = [];
            const actualPriceInt = Math.floor(btcPrice);

            todayPredictions.forEach(pred => {
                // Check Range Winner
                if (pred.range === winningRange) {
                    winningRangeWinners.push(pred);
                }
                // Check Jackpot Winner (Exact Integer Match)
                if (pred.predictedPrice !== undefined && Math.floor(pred.predictedPrice) === actualPriceInt) {
                    jackpotWinners.push(pred);
                }
            });

            // 7. Calculate Pools (50/10/40 Split)
            // If winnerPoolPercent is customized in settings, use it, otherwise 50%
            const rangeWinnerPercent = 50;
            const jackpotPercent = 10;
            // platform takes the rest (40%)

            const rangePool = Math.floor(totalPool * rangeWinnerPercent / 100);
            const jackpotPool = Math.floor(totalPool * jackpotPercent / 100);

            // 8. Distribute Range Rewards
            const rangeRewardPerWinner = winningRangeWinners.length > 0 ? Math.floor(rangePool / winningRangeWinners.length) : 0;

            // 9. Handle Jackpot
            const jackpotRef = db.doc('settings/jackpot');
            const jackpotDoc = await jackpotRef.get();
            const currentJackpot = jackpotDoc.data()?.currentAmount || 0;

            let totalJackpotPayout = 0;
            let jackpotRewardPerWinner = 0;
            let jackpotCarriedOver = currentJackpot;
            let nextJackpotAmount = currentJackpot + jackpotPool; // Default: accumulate

            if (jackpotWinners.length > 0) {
                // Jackpot Hit! Distribute Accumulated + Current 10%
                const totalDistributable = currentJackpot + jackpotPool;
                jackpotRewardPerWinner = Math.floor(totalDistributable / jackpotWinners.length);
                totalJackpotPayout = totalDistributable;
                nextJackpotAmount = 0; // Reset
            }

            // 10. Execute Transaction Batch
            // REFACTORING LOGIC TO SINGLE PASS
            // Map of predictionID -> { rangeReward, jackpotReward, doc, userId, userName }
            const resultMap = new Map<string, any>();

            // Add all participants to map
            for (const pred of todayPredictions) {
                resultMap.set(pred.id, {
                    ...pred,
                    rangeReward: 0,
                    jackpotReward: 0,
                    isRangeWinner: false,
                    isJackpotWinner: false
                });
            }

            // Mark Range Winners
            winningRangeWinners.forEach(w => {
                const r = resultMap.get(w.id);
                if (r) {
                    r.isRangeWinner = true;
                    r.rangeReward = rangeRewardPerWinner;
                }
            });

            // Mark Jackpot Winners
            jackpotWinners.forEach(w => {
                const r = resultMap.get(w.id);
                if (r) {
                    r.isJackpotWinner = true;
                    r.jackpotReward = jackpotRewardPerWinner;
                }
            });

            // Clear previous batch and rebuild
            // We need a fresh batch because we might have added ops above (in my previous thinking process).
            // Actually, I haven't executed the batch, just defined it. I'll just clear the `batch` object? 
            // TS doesn't support clearing batch. I will just create a NEW batch instance variable to be safe 
            // or just ensure I don't use the previous loop's batch ops.
            // Since this is inside the function, I'll essentially rewrite the batch logic below.

            const finalBatch = db.batch(); // Use this one
            const finalWinnerList: any[] = [];
            const finalJackpotList: any[] = [];

            // Iterate all predictions
            for (const pred of resultMap.values()) {
                const totalReward = pred.rangeReward + pred.jackpotReward;

                if (totalReward > 0) {
                    // Winner (Range or Both)
                    if (!pred.userId) continue;
                    const userRef = db.doc(`users/${pred.userId}`);

                    finalBatch.update(userRef, {
                        balance: admin.firestore.FieldValue.increment(totalReward)
                    });

                    finalBatch.update(pred.ref, {
                        status: 'Won',
                        reward: totalReward,
                        rangeWon: pred.isRangeWinner,
                        jackpotWon: pred.isJackpotWinner,
                        rangeReward: pred.rangeReward,
                        jackpotReward: pred.jackpotReward,
                        roundId,
                        actualPrice: btcPrice,
                        actualPriceInt,
                        winningRange
                    });

                    // Transaction
                    const txRef = db.collection(`users/${pred.userId}/transactions`).doc();
                    let desc = `BTC 예측 성공! (라운드 #${roundId})`;
                    if (pred.isJackpotWinner) desc += " + 잭팟 당첨!! 🎰";

                    finalBatch.set(txRef, {
                        type: 'BTC Game',
                        amount: totalReward,
                        date: new Date().toLocaleDateString('ko-KR'),
                        description: desc,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    const userDoc = await userRef.get();
                    const dName = userDoc.data()?.displayName || 'Unknown';

                    finalWinnerList.push({
                        userId: pred.userId,
                        displayName: dName,
                        betAmount: pred.betAmount || 2,
                        reward: totalReward,
                        isJackpot: pred.isJackpotWinner
                    });

                    if (pred.isJackpotWinner) {
                        finalJackpotList.push({
                            userId: pred.userId,
                            displayName: dName,
                            amount: pred.jackpotReward
                        });
                    }

                } else {
                    // Looser
                    finalBatch.update(pred.ref, {
                        status: 'Lost',
                        reward: 0,
                        roundId,
                        actualPrice: btcPrice,
                        actualPriceInt,
                        winningRange
                    });
                }
            }

            // Update Jackpot Settings
            finalBatch.set(jackpotRef, {
                currentAmount: nextJackpotAmount,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Save Round Results
            finalBatch.set(roundRef, {
                roundId,
                date: dateStr,
                coin: 'bitcoin',
                status: 'settled',
                actualPrice: btcPrice,
                winningRange,

                totalPool,
                winnerPool: rangePool,
                jackpotPool: jackpotPool,
                platformPool: totalPool - rangePool - jackpotPool,

                participantCount: todayPredictions.length,

                winners: finalWinnerList,
                jackpotWinners: finalJackpotList,

                rangeRewardPerWinner,
                jackpotRewardPerWinner,

                jackpotCarriedOver: jackpotCarriedOver,
                totalJackpotPayout: totalJackpotPayout,
                nextJackpotAmount: nextJackpotAmount,

                totalDistributed: (rangeRewardPerWinner * winningRangeWinners.length) + totalJackpotPayout,

                settledAt: admin.firestore.FieldValue.serverTimestamp()
            });

            await finalBatch.commit();

            // Send winner notification emails
            if (finalWinnerList.length > 0) {
                const emailBatch = db.batch();
                for (const winner of finalWinnerList) {
                    try {
                        const userDoc = await db.doc(`users/${winner.userId}`).get();
                        const userData = userDoc.data();
                        const email = userData?.email;

                        if (email) {
                            const mailRef = db.collection('mail').doc();
                            emailBatch.set(mailRef, {
                                to: email,
                                message: {
                                    subject: winner.isJackpot
                                        ? `🎰 VP 잭팟 당첨! +${winner.reward} VP`
                                        : `🎉 BTC 예측 성공! +${winner.reward} VP`,
                                    html: `
                                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                            <h1 style="color: #8B5CF6;">🎉 축하합니다, ${winner.displayName}님!</h1>
                                            <p>BTC 가격 예측 게임에서 <strong style="color: #22C55E;">승리</strong>하셨습니다!</p>
                                            
                                            <div style="background: #F3F4F6; border-radius: 12px; padding: 20px; margin: 20px 0;">
                                                <p><strong>라운드:</strong> #${roundId} (${dateStr})</p>
                                                <p><strong>실제 BTC 가격:</strong> $${btcPrice.toLocaleString()}</p>
                                                <p><strong>당첨 범위:</strong> ${winningRange}</p>
                                                <p><strong>베팅 금액:</strong> ${winner.betAmount} VP</p>
                                                <p style="font-size: 24px; color: #8B5CF6;"><strong>획득 보상:</strong> +${winner.reward} VP</p>
                                                ${winner.isJackpot ? '<p style="color: #F59E0B; font-weight: bold;">🎰 잭팟 당첨!!</p>' : ''}
                                            </div>
                                            
                                            <p>VIEW 앱에서 보상을 확인하세요!</p>
                                            <a href="https://view-adt.pages.dev" style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">앱 열기</a>
                                        </div>
                                    `
                                }
                            });
                        }
                    } catch (emailError) {
                        functions.logger.error(`Failed to queue email for ${winner.userId}:`, emailError);
                    }
                }
                try {
                    await emailBatch.commit();
                    functions.logger.info(`Queued ${finalWinnerList.length} winner notification emails`);
                } catch (emailBatchError) {
                    functions.logger.error('Failed to commit email batch:', emailBatchError);
                }
            }

            functions.logger.info(`Settlement complete Round #${roundId}: Winners=${finalWinnerList.length}, Jackpot=${jackpotWinners.length}, NextJackpot=${nextJackpotAmount}`);
            return null;


        } catch (error) {
            functions.logger.error("Settlement error:", error);
            return null;
        }
    });

// manualSettlePrediction - Admin callable for manual settlement
export const manualSettlePrediction = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth?.token.email || !ADMIN_EMAILS.includes(request.auth.token.email)) {
        throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    const { date } = request.data;
    if (!date) {
        throw new HttpsError("invalid-argument", "날짜를 입력해주세요.");
    }

    const db = admin.firestore();
    const dateStr = date;

    try {
        const roundRef = db.doc(`predictionRounds/${dateStr}`);
        const roundDoc = await roundRef.get();

        if (roundDoc.exists && roundDoc.data()?.status === 'settled') {
            throw new HttpsError("already-exists", "이미 정산된 라운드입니다.");
        }

        // Fetch current BTC price
        let btcPrice = 0;
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
            const data = await response.json();
            btcPrice = data.bitcoin?.usd || 0;
        } catch (e) {
            throw new HttpsError("internal", "BTC 가격 조회 실패");
        }

        if (btcPrice === 0) {
            throw new HttpsError("internal", "BTC 가격이 0입니다");
        }

        // Find winning range
        const settingsDoc = await db.doc('settings/predictionGame').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : {};
        const rangeStep = settings?.priceRangeStep || 500;
        const lowerBound = Math.floor(btcPrice / rangeStep) * rangeStep;
        const upperBound = lowerBound + rangeStep;
        const winningRange = `$${lowerBound.toLocaleString()} ~ $${upperBound.toLocaleString()}`;

        // Query predictions for this date
        const startOfDay = new Date(dateStr);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateStr);
        endOfDay.setHours(23, 59, 59, 999);

        const predictionsQuery = await db.collectionGroup('predictions')
            .where('coin', '==', 'bitcoin')
            .get();

        const todayPredictions: any[] = [];
        let totalPool = 0;

        predictionsQuery.docs.forEach(doc => {
            const data = doc.data();
            const predictedAt = data.predictedAt?.toDate?.() || new Date(0);
            if (predictedAt >= startOfDay && predictedAt <= endOfDay) {
                todayPredictions.push({
                    id: doc.id,
                    ref: doc.ref,
                    userId: doc.ref.parent.parent?.id,
                    ...data
                });
                totalPool += data.betAmount || 2;
            }
        });

        // Get Round ID
        const counterRef = db.doc('counters/predictionRound');
        let roundId = 1;
        await db.runTransaction(async (t) => {
            const doc = await t.get(counterRef);
            if (doc.exists) {
                roundId = (doc.data()?.lastRoundId || 0) + 1;
                t.update(counterRef, { lastRoundId: roundId });
            } else {
                t.set(counterRef, { lastRoundId: 1 });
            }
        });

        // If no participants
        if (todayPredictions.length === 0) {
            await roundRef.set({
                roundId,
                date: dateStr,
                coin: 'bitcoin',
                status: 'settled',
                actualPrice: btcPrice,
                winningRange,
                totalPool: 0,
                participantCount: 0,
                winners: [],
                totalWinners: 0,
                totalDistributed: 0,
                settledAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, message: `${dateStr} 라운드 정산 완료 (참여자 0명)` };
        }

        // Find winners
        const winningRangeWinners: any[] = [];
        const jackpotWinners: any[] = [];
        const actualPriceInt = Math.floor(btcPrice);

        todayPredictions.forEach(pred => {
            if (pred.range === winningRange) {
                winningRangeWinners.push(pred);
            }
            if (pred.predictedPrice !== undefined && Math.floor(pred.predictedPrice) === actualPriceInt) {
                jackpotWinners.push(pred);
            }
        });

        // Calculate pools
        const rangePool = Math.floor(totalPool * 50 / 100);
        const jackpotPool = Math.floor(totalPool * 10 / 100);
        const rangeRewardPerWinner = winningRangeWinners.length > 0 ? Math.floor(rangePool / winningRangeWinners.length) : 0;

        // Handle Jackpot
        const jackpotRef = db.doc('settings/jackpot');
        const jackpotDoc = await jackpotRef.get();
        const currentJackpot = jackpotDoc.data()?.currentAmount || 0;

        let jackpotRewardPerWinner = 0;
        let nextJackpotAmount = currentJackpot + jackpotPool;

        if (jackpotWinners.length > 0) {
            const totalDistributable = currentJackpot + jackpotPool;
            jackpotRewardPerWinner = Math.floor(totalDistributable / jackpotWinners.length);
            nextJackpotAmount = 0;
        }

        // Execute batch
        const finalBatch = db.batch();
        const finalWinnerList: any[] = [];
        let totalDistributed = 0;

        for (const pred of todayPredictions) {
            let rangeReward = 0;
            let jackpotReward = 0;
            const isRangeWinner = winningRangeWinners.some(w => w.id === pred.id);
            const isJackpotWinner = jackpotWinners.some(w => w.id === pred.id);

            if (isRangeWinner) rangeReward = rangeRewardPerWinner;
            if (isJackpotWinner) jackpotReward = jackpotRewardPerWinner;

            const totalReward = rangeReward + jackpotReward;

            if (totalReward > 0 && pred.userId) {
                const userRef = db.doc(`users/${pred.userId}`);
                finalBatch.update(userRef, {
                    balance: admin.firestore.FieldValue.increment(totalReward)
                });

                finalBatch.update(pred.ref, {
                    status: 'Won',
                    reward: totalReward,
                    roundId,
                    actualPrice: btcPrice,
                    winningRange
                });

                const userDoc = await userRef.get();
                const dName = userDoc.data()?.displayName || 'Unknown';

                finalWinnerList.push({
                    userId: pred.userId,
                    displayName: dName,
                    betAmount: pred.betAmount || 2,
                    reward: totalReward,
                    isJackpot: isJackpotWinner
                });

                totalDistributed += totalReward;
            } else {
                finalBatch.update(pred.ref, {
                    status: 'Lost',
                    reward: 0,
                    roundId,
                    actualPrice: btcPrice,
                    winningRange
                });
            }
        }

        // Update Jackpot
        finalBatch.set(jackpotRef, {
            currentAmount: nextJackpotAmount,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Save Round
        finalBatch.set(roundRef, {
            roundId,
            date: dateStr,
            coin: 'bitcoin',
            status: 'settled',
            actualPrice: btcPrice,
            winningRange,
            totalPool,
            participantCount: todayPredictions.length,
            totalWinners: finalWinnerList.length,
            totalDistributed,
            winners: finalWinnerList,
            settledAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await finalBatch.commit();

        // Send winner notification emails
        if (finalWinnerList.length > 0) {
            const emailBatch = db.batch();
            for (const winner of finalWinnerList) {
                try {
                    const userDoc = await db.doc(`users/${winner.userId}`).get();
                    const userData = userDoc.data();
                    const email = userData?.email;

                    if (email) {
                        const mailRef = db.collection('mail').doc();
                        emailBatch.set(mailRef, {
                            to: email,
                            template: {
                                name: 'prediction-winner',
                                data: {
                                    displayName: winner.displayName,
                                    roundId,
                                    date: dateStr,
                                    actualPrice: btcPrice.toLocaleString(),
                                    winningRange,
                                    betAmount: winner.betAmount,
                                    reward: winner.reward,
                                    isJackpot: winner.isJackpot || false,
                                }
                            },
                            // Fallback if template doesn't exist
                            message: {
                                subject: winner.isJackpot
                                    ? `🎰 VP 잭팟 당첨! +${winner.reward} VP`
                                    : `🎉 BTC 예측 성공! +${winner.reward} VP`,

                                html: `
                                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                                        <h1 style="color: #8B5CF6;">🎉 축하합니다, ${winner.displayName}님!</h1>
                                        <p>BTC 가격 예측 게임에서 <strong style="color: #22C55E;">승리</strong>하셨습니다!</p>
                                        
                                        <div style="background: #F3F4F6; border-radius: 12px; padding: 20px; margin: 20px 0;">
                                            <p><strong>라운드:</strong> #${roundId} (${dateStr})</p>
                                            <p><strong>실제 BTC 가격:</strong> $${btcPrice.toLocaleString()}</p>
                                            <p><strong>당첨 범위:</strong> ${winningRange}</p>
                                            <p><strong>베팅 금액:</strong> ${winner.betAmount} VP</p>
                                            <p style="font-size: 24px; color: #8B5CF6;"><strong>획득 보상:</strong> +${winner.reward} VP</p>
                                            ${winner.isJackpot ? '<p style="color: #F59E0B; font-weight: bold;">🎰 잭팟 당첨!!</p>' : ''}
                                        </div>
                                        
                                        <p>VIEW 앱에서 보상을 확인하세요!</p>
                                        <a href="https://view-adt.pages.dev" style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">앱 열기</a>
                                    </div>
                                `
                            }
                        });
                    }
                } catch (emailError) {
                    console.error(`Failed to queue email for ${winner.userId}:`, emailError);
                }
            }
            try {
                await emailBatch.commit();
                console.log(`Queued ${finalWinnerList.length} winner notification emails`);
            } catch (emailBatchError) {
                console.error('Failed to commit email batch:', emailBatchError);
            }
        }

        return {
            success: true,
            message: `${dateStr} 라운드 정산 완료! 참여자 ${todayPredictions.length}명, 승자 ${finalWinnerList.length}명, 배분 ${totalDistributed} VP`,
            roundId,
            actualPrice: btcPrice,
            winningRange,
            participantCount: todayPredictions.length,
            winnersCount: finalWinnerList.length,
            totalDistributed

        };
    } catch (error: any) {
        throw new HttpsError("internal", error.message);
    }
});


// getPredictionSettings - Get prediction game settings
export const getPredictionSettings = onCall({
    cors: true,
}, async (request) => {
    const db = admin.firestore();
    const settingsDoc = await db.doc('settings/predictionGame').get();

    return {
        success: true,
        settings: settingsDoc.exists ? settingsDoc.data() : {
            enabled: true,
            winnerPoolPercent: 70,
            minBetAmount: 1,
            maxBetAmount: 10000,
            priceRangeStep: 500,
        }
    };
});

// updatePredictionSettings - Admin only
export const updatePredictionSettings = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth?.token.email || !ADMIN_EMAILS.includes(request.auth.token.email)) {
        throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    const { winnerPoolPercent, minBetAmount, maxBetAmount, priceRangeStep, enabled } = request.data;
    const db = admin.firestore();

    await db.doc('settings/predictionGame').set({
        winnerPoolPercent: winnerPoolPercent ?? 70,
        minBetAmount: minBetAmount ?? 1,
        maxBetAmount: maxBetAmount ?? 10000,
        priceRangeStep: priceRangeStep ?? 500,
        enabled: enabled ?? true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { success: true, message: "설정이 저장되었습니다." };
});

// getPredictionRounds - Get round history
export const getPredictionRounds = onCall({
    cors: true,
}, async (request) => {
    const db = admin.firestore();
    const { limit: queryLimit = 30 } = request.data || {};

    const roundsQuery = await db.collection('predictionRounds')
        .orderBy('date', 'desc')
        .limit(queryLimit)
        .get();

    const rounds = roundsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    return { success: true, rounds };
});

// getPredictionRoundDetail - Get specific round with winners
export const getPredictionRoundDetail = onCall({
    cors: true,
}, async (request) => {
    const { date } = request.data;
    if (!date) {
        throw new HttpsError("invalid-argument", "날짜를 입력해주세요.");
    }

    const db = admin.firestore();
    const roundDoc = await db.doc(`predictionRounds/${date}`).get();

    if (!roundDoc.exists) {
        throw new HttpsError("not-found", "해당 날짜의 라운드를 찾을 수 없습니다.");
    }

    return { success: true, round: roundDoc.data() };
});

// getJackpotStatus
export const getJackpotStatus = onCall({
    cors: true,
}, async (request) => {
    try {
        const db = admin.firestore();
        const doc = await db.doc('settings/jackpot').get();
        return {
            success: true,
            currentAmount: doc.data()?.currentAmount || 0,
            lastUpdated: doc.data()?.lastUpdated
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

// ============================================
// getTaxonomy - Fetch Industry/Attribute taxonomy from Firestore
// ============================================
export const getTaxonomy = onCall({
    cors: true,
}, async (request) => {
    const db = admin.firestore();
    const { type } = request.data || {};

    try {
        if (type === 'industry') {
            const doc = await db.doc('settings/taxonomy_industry').get();
            if (!doc.exists) {
                throw new HttpsError("not-found", "Industry taxonomy not found");
            }
            return { success: true, data: doc.data() };
        }

        if (type === 'attributes') {
            const doc = await db.doc('settings/taxonomy_attributes').get();
            if (!doc.exists) {
                throw new HttpsError("not-found", "Attribute taxonomy not found");
            }
            return { success: true, data: doc.data() };
        }

        // Return both if no type specified
        const [industryDoc, attrDoc, metaDoc] = await Promise.all([
            db.doc('settings/taxonomy_industry').get(),
            db.doc('settings/taxonomy_attributes').get(),
            db.doc('settings/taxonomy_meta').get(),
        ]);

        return {
            success: true,
            industry: industryDoc.exists ? industryDoc.data() : null,
            attributes: attrDoc.exists ? attrDoc.data() : null,
            meta: metaDoc.exists ? metaDoc.data() : null,
        };
    } catch (error: any) {
        functions.logger.error("getTaxonomy error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// saveAudience - Save advertiser's target audience configuration
// ============================================
export const saveAudience = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    const {
        name,
        industryPaths,      // ["Fashion.Apparel.Womenswear", ...]
        attributes,         // { Price_Positioning: ["Premium"], Sustainability: ["Eco_Friendly"] }
        targetTraits,       // { priceVsBrand: [0.3, 0.7], ... }
        regions,
        estimatedReach,
    } = request.data;

    if (!name || !industryPaths || industryPaths.length === 0) {
        throw new HttpsError("invalid-argument", "필수 정보가 누락되었습니다.");
    }

    try {
        const audienceRef = db.collection('audiences').doc();
        await audienceRef.set({
            advertiserId: uid,
            name,
            industryPaths,
            attributes: attributes || {},
            targetTraits: targetTraits || {},
            regions: regions || [],
            estimatedReach: estimatedReach || 0,
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info("Audience saved", { audienceId: audienceRef.id, uid });

        return {
            success: true,
            audienceId: audienceRef.id,
            message: '오디언스가 저장되었습니다.'
        };
    } catch (error: any) {
        functions.logger.error("saveAudience error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// getMyAudiences - Get advertiser's saved audiences
// ============================================
export const getMyAudiences = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    try {
        const snapshot = await db.collection('audiences')
            .where('advertiserId', '==', uid)
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const audiences = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return { success: true, audiences };
    } catch (error: any) {
        functions.logger.error("getMyAudiences error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// calculateAttributeScores - Calculate user's attribute affinity scores
// ============================================
export const calculateAttributeScores = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    try {
        // 1. Get user's activities
        const activitiesSnap = await db.collection(`users/${uid}/activities`)
            .orderBy("createdAt", "desc")
            .limit(500)
            .get();
        const activities = activitiesSnap.docs.map(doc => doc.data());

        // 2. Get survey responses
        const responsesSnap = await db.collection(`users/${uid}/surveyResponses`).get();
        const responses: Record<string, any> = {};
        responsesSnap.docs.forEach(doc => {
            responses[doc.id] = doc.data();
        });

        // 3. Calculate attribute scores
        const attributeScores: Record<string, number> = {};

        // Price Positioning - based on purchasing power and brand preference
        const spending = responses['spending']?.responses || {};
        const power = responses['power']?.responses || {};

        if (power['p10']?.answer) {
            const purchasingPower = (power['p10'].answer - 1) / 4;
            if (purchasingPower >= 0.8) attributeScores['Price_Positioning.Luxury'] = 0.8;
            else if (purchasingPower >= 0.6) attributeScores['Price_Positioning.Premium'] = 0.7;
            else if (purchasingPower >= 0.4) attributeScores['Price_Positioning.Mid'] = 0.6;
            else attributeScores['Price_Positioning.Value'] = 0.6;
        }

        // Sustainability - based on eco activities and survey
        const values = responses['values']?.responses || {};
        if (values['v1']?.answer) {
            const ecoScore = (values['v1'].answer - 1) / 4;
            if (ecoScore >= 0.7) {
                attributeScores['Sustainability.Eco_Friendly'] = ecoScore;
                attributeScores['Sustainability.Cruelty_Free'] = ecoScore * 0.8;
            }
        }

        // Check ESG activities
        const esgActivities = activities.filter(a =>
            (a.taxonomyTags || []).some((t: string) =>
                t.includes('ESG') || t.includes('Sustainability') || t.includes('Environment')
            )
        );
        if (esgActivities.length > 10) {
            attributeScores['Sustainability.Eco_Friendly'] = Math.max(
                attributeScores['Sustainability.Eco_Friendly'] || 0,
                0.75
            );
        }

        // Channel Preference - based on online preference
        if (spending['s7']?.answer) {
            const onlinePref = (spending['s7'].answer - 1) / 4;
            if (onlinePref >= 0.7) {
                attributeScores['Channel_Preference.Online_First'] = onlinePref;
            } else if (onlinePref <= 0.3) {
                attributeScores['Channel_Preference.Offline_First'] = 1 - onlinePref;
            } else {
                attributeScores['Channel_Preference.Omnichannel'] = 0.6;
            }
        }

        // Purchase Decision Style - based on impulse buying
        const impulseMap: Record<string, number> = {
            '거의 안함': 0.1, '가끔': 0.3, '보통': 0.5, '자주': 0.7, '매우 자주': 0.9
        };
        if (spending['s3']?.answer && impulseMap[spending['s3'].answer]) {
            const impulseScore = impulseMap[spending['s3'].answer];
            if (impulseScore >= 0.7) {
                attributeScores['Purchase_Decision_Style.Impulse'] = impulseScore;
            } else if (impulseScore <= 0.3) {
                attributeScores['Purchase_Decision_Style.Research_Heavy'] = 1 - impulseScore;
            }
        }

        // Brand Loyalty - based on activity patterns
        const brandCounts: Record<string, number> = {};
        for (const activity of activities) {
            if (activity.brand) {
                brandCounts[activity.brand] = (brandCounts[activity.brand] || 0) + 1;
            }
        }
        const brandValues = Object.values(brandCounts);
        if (brandValues.length > 0) {
            const maxBrandPurchase = Math.max(...brandValues);
            const totalPurchases = brandValues.reduce((a, b) => a + b, 0);
            const loyaltyScore = Math.min(1, (maxBrandPurchase / totalPurchases) * 1.5);
            if (loyaltyScore >= 0.6) {
                attributeScores['Purchase_Decision_Style.Brand_Loyal'] = loyaltyScore;
            }
        }

        // Early Adopter / Trend Seeker
        if (spending['s6']?.answer) {
            const earlyAdopterScore = (spending['s6'].answer - 1) / 4;
            if (earlyAdopterScore >= 0.7) {
                attributeScores['Purchase_Decision_Style.Trend_Seeker'] = earlyAdopterScore;
            }
        }

        // 4. Save attribute scores
        await db.doc(`users/${uid}/persona/current`).set({
            attributeScores,
            attributeScoresUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // 5. Update user profile summary
        const topAttributes = Object.entries(attributeScores)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([key]) => key);

        await db.doc(`users/${uid}`).update({
            topAttributes,
            attributeScoresCount: Object.keys(attributeScores).length,
        });

        functions.logger.info("Attribute scores calculated", { uid, count: Object.keys(attributeScores).length });

        return {
            success: true,
            attributeScores,
            topAttributes,
        };
    } catch (error: any) {
        functions.logger.error("calculateAttributeScores error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// scheduleAttributeScoreUpdate - Daily batch job for all users
// Runs every day at 3 AM UTC (12 PM KST)
// ============================================
export const scheduleAttributeScoreUpdate = functions.pubsub
    .schedule('0 3 * * *')  // Every day at 3:00 AM UTC
    .timeZone('UTC')
    .onRun(async (context) => {
        const db = admin.firestore();
        functions.logger.info('Starting daily attribute score update...');

        try {
            // Get users who have activities or survey responses
            const usersSnap = await db.collection('users')
                .where('surveyCompleted', '==', true)
                .limit(1000)
                .get();

            let processed = 0;
            let errors = 0;

            for (const userDoc of usersSnap.docs) {
                try {
                    const uid = userDoc.id;
                    await calculateAttributeScoresForUser(uid, db);
                    processed++;
                } catch (error: any) {
                    functions.logger.warn(`Failed to process user ${userDoc.id}:`, error.message);
                    errors++;
                }
            }

            functions.logger.info('Daily attribute score update complete', { processed, errors });
            return null;
        } catch (error: any) {
            functions.logger.error('scheduleAttributeScoreUpdate error:', error);
            throw error;
        }
    });

// ============================================
// onSurveyCompleted - Trigger when user completes survey
// ============================================
export const onSurveyCompleted = functions.firestore
    .document('users/{uid}/surveyResponses/{surveyId}')
    .onCreate(async (snap, context) => {
        const { uid, surveyId } = context.params;
        const db = admin.firestore();

        functions.logger.info('Survey completed, calculating attribute scores', { uid, surveyId });

        try {
            // Check if this is the last required survey (e.g., values survey)
            const responsesSnap = await db.collection(`users/${uid}/surveyResponses`).get();
            const completedSurveys = responsesSnap.docs.map(d => d.id);

            // If user has completed key surveys, recalculate scores
            const requiredSurveys = ['spending', 'values', 'power'];
            const hasRequiredSurveys = requiredSurveys.every(s => completedSurveys.includes(s));

            if (hasRequiredSurveys || completedSurveys.length >= 3) {
                await calculateAttributeScoresForUser(uid, db);

                // Mark survey as completed in user profile
                await db.doc(`users/${uid}`).update({
                    surveyCompleted: true,
                    surveysCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            return null;
        } catch (error: any) {
            functions.logger.error('onSurveyCompleted error:', error);
            throw error;
        }
    });

// ============================================
// onActivityMilestone - Trigger when user reaches activity milestone
// ============================================
export const onActivityMilestone = functions.firestore
    .document('users/{uid}/activities/{activityId}')
    .onCreate(async (snap, context) => {
        const { uid } = context.params;
        const db = admin.firestore();

        try {
            // Check activity count
            const userDoc = await db.doc(`users/${uid}`).get();
            const userData = userDoc.data() || {};
            const currentCount = (userData.activityCount || 0) + 1;

            // Update activity count
            await db.doc(`users/${uid}`).update({
                activityCount: admin.firestore.FieldValue.increment(1),
            });

            // Recalculate at milestones: 10, 50, 100, 200, 500 activities
            const milestones = [10, 50, 100, 200, 500];
            if (milestones.includes(currentCount)) {
                functions.logger.info('Activity milestone reached, recalculating scores', { uid, milestone: currentCount });
                await calculateAttributeScoresForUser(uid, db);
            }

            return null;
        } catch (error: any) {
            functions.logger.error('onActivityMilestone error:', error);
            // Don't throw - this is a background trigger
            return null;
        }
    });

// ============================================
// Helper: Calculate attribute scores for a specific user
// ============================================
async function calculateAttributeScoresForUser(uid: string, db: admin.firestore.Firestore): Promise<void> {
    // 1. Get user's activities
    const activitiesSnap = await db.collection(`users/${uid}/activities`)
        .orderBy('createdAt', 'desc')
        .limit(500)
        .get();
    const activities = activitiesSnap.docs.map(doc => doc.data());

    // 2. Get survey responses
    const responsesSnap = await db.collection(`users/${uid}/surveyResponses`).get();
    const responses: Record<string, any> = {};
    responsesSnap.docs.forEach(doc => {
        responses[doc.id] = doc.data();
    });

    // 3. Calculate attribute scores
    const attributeScores: Record<string, number> = {};

    // Price Positioning
    const spending = responses['spending']?.responses || {};
    const power = responses['power']?.responses || {};

    if (power['p10']?.answer) {
        const purchasingPower = (power['p10'].answer - 1) / 4;
        if (purchasingPower >= 0.8) attributeScores['Price_Positioning.Luxury'] = 0.8;
        else if (purchasingPower >= 0.6) attributeScores['Price_Positioning.Premium'] = 0.7;
        else if (purchasingPower >= 0.4) attributeScores['Price_Positioning.Mid'] = 0.6;
        else attributeScores['Price_Positioning.Value'] = 0.6;
    }

    // Sustainability
    const values = responses['values']?.responses || {};
    if (values['v1']?.answer) {
        const ecoScore = (values['v1'].answer - 1) / 4;
        if (ecoScore >= 0.7) {
            attributeScores['Sustainability.Eco_Friendly'] = ecoScore;
            attributeScores['Sustainability.Cruelty_Free'] = ecoScore * 0.8;
        }
    }

    // ESG Activities
    const esgActivities = activities.filter(a =>
        (a.taxonomyTags || []).some((t: string) =>
            t.includes('ESG') || t.includes('Sustainability') || t.includes('Environment')
        )
    );
    if (esgActivities.length > 10) {
        attributeScores['Sustainability.Eco_Friendly'] = Math.max(
            attributeScores['Sustainability.Eco_Friendly'] || 0,
            0.75
        );
    }

    // Channel Preference
    if (spending['s7']?.answer) {
        const onlinePref = (spending['s7'].answer - 1) / 4;
        if (onlinePref >= 0.7) {
            attributeScores['Channel_Preference.Online_First'] = onlinePref;
        } else if (onlinePref <= 0.3) {
            attributeScores['Channel_Preference.Offline_First'] = 1 - onlinePref;
        } else {
            attributeScores['Channel_Preference.Omnichannel'] = 0.6;
        }
    }

    // Purchase Decision Style
    const impulseMap: Record<string, number> = {
        '거의 안함': 0.1, '가끔': 0.3, '보통': 0.5, '자주': 0.7, '매우 자주': 0.9
    };
    if (spending['s3']?.answer && impulseMap[spending['s3'].answer]) {
        const impulseScore = impulseMap[spending['s3'].answer];
        if (impulseScore >= 0.7) {
            attributeScores['Purchase_Decision_Style.Impulse'] = impulseScore;
        } else if (impulseScore <= 0.3) {
            attributeScores['Purchase_Decision_Style.Research_Heavy'] = 1 - impulseScore;
        }
    }

    // Brand Loyalty
    const brandCounts: Record<string, number> = {};
    for (const activity of activities) {
        if (activity.brand) {
            brandCounts[activity.brand] = (brandCounts[activity.brand] || 0) + 1;
        }
    }
    const brandValues = Object.values(brandCounts);
    if (brandValues.length > 0) {
        const maxBrandPurchase = Math.max(...brandValues);
        const totalPurchases = brandValues.reduce((a, b) => a + b, 0);
        const loyaltyScore = Math.min(1, (maxBrandPurchase / totalPurchases) * 1.5);
        if (loyaltyScore >= 0.6) {
            attributeScores['Purchase_Decision_Style.Brand_Loyal'] = loyaltyScore;
        }
    }

    // Trend Seeker
    if (spending['s6']?.answer) {
        const earlyAdopterScore = (spending['s6'].answer - 1) / 4;
        if (earlyAdopterScore >= 0.7) {
            attributeScores['Purchase_Decision_Style.Trend_Seeker'] = earlyAdopterScore;
        }
    }

    // Business Model preference from activity patterns
    const subscriptionActivities = activities.filter(a =>
        (a.type === 'subscription' || (a.tags || []).includes('subscription'))
    );
    if (subscriptionActivities.length >= 3) {
        attributeScores['Business_Model.Subscription'] = Math.min(0.8, subscriptionActivities.length * 0.1);
    }

    // DTC preference
    const dtcActivities = activities.filter(a =>
        (a.channel === 'direct' || (a.tags || []).includes('DTC'))
    );
    if (dtcActivities.length >= 5) {
        attributeScores['Business_Model.DTC'] = Math.min(0.75, dtcActivities.length * 0.08);
    }

    // 4. Save attribute scores
    await db.doc(`users/${uid}/persona/current`).set({
        attributeScores,
        attributeScoresUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastCalculationType: 'automatic',
    }, { merge: true });

    // 5. Update user profile summary
    const topAttributes = Object.entries(attributeScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([key]) => key);

    await db.doc(`users/${uid}`).update({
        topAttributes,
        attributeScoresCount: Object.keys(attributeScores).length,
        attributeScoresUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Background attribute scores calculated', {
        uid,
        count: Object.keys(attributeScores).length,
        topAttributes
    });
}

// ============================================
// batchRecalculateAttributeScores - Admin function for bulk recalculation
// ============================================
export const batchRecalculateAttributeScores = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const userEmail = request.auth.token.email;
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
        throw new HttpsError('permission-denied', '관리자만 접근 가능합니다.');
    }

    const db = admin.firestore();
    const { limit: batchLimit = 100, onlySurveyCompleted = true } = request.data || {};

    try {
        let query: admin.firestore.Query = db.collection('users');

        if (onlySurveyCompleted) {
            query = query.where('surveyCompleted', '==', true);
        }

        const usersSnap = await query.limit(batchLimit).get();

        let processed = 0;
        let errors = 0;
        const results: { uid: string; success: boolean; error?: string }[] = [];

        for (const userDoc of usersSnap.docs) {
            try {
                await calculateAttributeScoresForUser(userDoc.id, db);
                processed++;
                results.push({ uid: userDoc.id, success: true });
            } catch (error: any) {
                errors++;
                results.push({ uid: userDoc.id, success: false, error: error.message });
            }
        }

        functions.logger.info('Batch recalculation complete', { processed, errors });

        return {
            success: true,
            message: `${processed}명의 사용자 점수가 재계산되었습니다.`,
            processed,
            errors,
            results: results.slice(0, 20), // Only return first 20 for response size
        };
    } catch (error: any) {
        functions.logger.error('batchRecalculateAttributeScores error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// ============================================
// getAttributeRecommendations - AI-powered attribute recommendations
// Analyzes campaign performance and user behavior to suggest optimal attributes
// ============================================
export const getAttributeRecommendations = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const db = admin.firestore();
    const { industryPaths, objective, budget, existingCampaignId } = request.data || {};

    try {
        // 1. Get historical performance data by attribute
        const attributeStats = await getAttributePerformanceStats(db, industryPaths);

        // 2. Get user distribution by attribute
        const userDistribution = await getUserAttributeDistribution(db);

        // 3. Generate recommendations based on objective
        const recommendations = generateRecommendations(
            attributeStats,
            userDistribution,
            objective,
            budget,
            industryPaths
        );

        // 4. If existing campaign, compare with current performance
        let optimization: any = null;
        if (existingCampaignId) {
            optimization = await getCampaignOptimization(db, existingCampaignId, recommendations);
        }

        functions.logger.info('Attribute recommendations generated', {
            industryPaths,
            objective,
            recommendationCount: recommendations.length
        });

        return {
            success: true,
            recommendations,
            optimization,
            stats: {
                analyzedUsers: userDistribution.totalUsers,
                topPerformingAttributes: attributeStats.topPerforming.slice(0, 5),
            }
        };
    } catch (error: any) {
        functions.logger.error('getAttributeRecommendations error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// Helper: Get performance stats by attribute from historical data
async function getAttributePerformanceStats(
    db: admin.firestore.Firestore,
    industryPaths?: string[]
): Promise<{
    byAttribute: Record<string, { impressions: number; clicks: number; conversions: number; ctr: number; cvr: number }>;
    topPerforming: string[];
}> {
    // Get campaign impressions data
    let query: admin.firestore.Query = db.collection('campaignAnalytics')
        .orderBy('createdAt', 'desc')
        .limit(1000);

    const analyticsSnap = await query.get();

    const attributePerformance: Record<string, {
        impressions: number;
        clicks: number;
        conversions: number;
    }> = {};

    // Aggregate performance by attribute
    for (const doc of analyticsSnap.docs) {
        const data = doc.data();
        const attributes = data.attributes || {};

        for (const [type, values] of Object.entries(attributes)) {
            if (Array.isArray(values)) {
                for (const value of values) {
                    const key = `${type}.${value}`;
                    if (!attributePerformance[key]) {
                        attributePerformance[key] = { impressions: 0, clicks: 0, conversions: 0 };
                    }
                    attributePerformance[key].impressions += data.impressions || 0;
                    attributePerformance[key].clicks += data.clicks || 0;
                    attributePerformance[key].conversions += data.conversions || 0;
                }
            }
        }
    }

    // Calculate rates and rank
    const byAttribute: Record<string, any> = {};
    const rankings: { key: string; score: number }[] = [];

    for (const [key, stats] of Object.entries(attributePerformance)) {
        const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
        const cvr = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;

        byAttribute[key] = {
            ...stats,
            ctr: Math.round(ctr * 100) / 100,
            cvr: Math.round(cvr * 100) / 100,
        };

        // Score = weighted combination of CVR and volume
        const score = cvr * 0.7 + Math.log10(stats.conversions + 1) * 0.3;
        rankings.push({ key, score });
    }

    // Sort by score descending
    rankings.sort((a, b) => b.score - a.score);
    const topPerforming = rankings.map(r => r.key);

    // If no historical data, return default recommendations
    if (topPerforming.length === 0) {
        return {
            byAttribute: {},
            topPerforming: [
                'Price_Positioning.Premium',
                'Channel_Preference.Online_First',
                'Purchase_Decision_Style.Brand_Loyal',
                'Sustainability.Eco_Friendly',
                'Business_Model.DTC',
            ]
        };
    }

    return { byAttribute, topPerforming };
}

// Helper: Get user distribution by attribute
async function getUserAttributeDistribution(db: admin.firestore.Firestore): Promise<{
    totalUsers: number;
    byAttribute: Record<string, number>;
}> {
    // Get users with attribute scores
    const usersSnap = await db.collection('users')
        .where('attributeScoresCount', '>', 0)
        .limit(5000)
        .get();

    const attributeCounts: Record<string, number> = {};
    let totalUsers = 0;

    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const topAttributes = userData.topAttributes || [];

        totalUsers++;
        for (const attr of topAttributes) {
            attributeCounts[attr] = (attributeCounts[attr] || 0) + 1;
        }
    }

    return {
        totalUsers,
        byAttribute: attributeCounts,
    };
}

// Helper: Generate recommendations
function generateRecommendations(
    attributeStats: { byAttribute: Record<string, any>; topPerforming: string[] },
    userDistribution: { totalUsers: number; byAttribute: Record<string, number> },
    objective: string,
    budget: number,
    industryPaths?: string[]
): Array<{
    attribute: string;
    type: string;
    value: string;
    score: number;
    reason: string;
    estimatedReach: number;
    estimatedCVR: number;
    priority: 'high' | 'medium' | 'low';
}> {
    const recommendations: Array<{
        attribute: string;
        type: string;
        value: string;
        score: number;
        reason: string;
        estimatedReach: number;
        estimatedCVR: number;
        priority: 'high' | 'medium' | 'low';
    }> = [];

    // Define attribute categories and their relevance by objective
    const objectiveWeights: Record<string, Record<string, number>> = {
        awareness: {
            'Channel_Preference': 1.0,
            'Price_Positioning': 0.7,
            'Business_Model': 0.8,
            'Purchase_Decision_Style': 0.6,
            'Sustainability': 0.7,
        },
        conversion: {
            'Channel_Preference': 0.8,
            'Price_Positioning': 1.0,
            'Business_Model': 0.9,
            'Purchase_Decision_Style': 1.0,
            'Sustainability': 0.6,
        },
    };

    const weights = objectiveWeights[objective] || objectiveWeights['conversion'];

    // Industry-specific attribute recommendations
    const industryAttributeMap: Record<string, string[]> = {
        'Fashion': ['Price_Positioning.Premium', 'Sustainability.Eco_Friendly', 'Channel_Preference.Mobile_First'],
        'Beauty': ['Price_Positioning.Premium', 'Sustainability.Cruelty_Free', 'Purchase_Decision_Style.Trend_Seeker'],
        'Technology': ['Channel_Preference.Online_First', 'Purchase_Decision_Style.Trend_Seeker', 'Business_Model.DTC'],
        'Food_Beverage': ['Channel_Preference.Omnichannel', 'Sustainability.Organic', 'Business_Model.Subscription'],
        'Travel': ['Price_Positioning.Luxury', 'Channel_Preference.Mobile_First', 'Purchase_Decision_Style.Research_Heavy'],
        'Finance': ['Channel_Preference.Online_First', 'Purchase_Decision_Style.Research_Heavy', 'Business_Model.DTC'],
        'Health_Wellness': ['Sustainability.Organic', 'Business_Model.Subscription', 'Price_Positioning.Premium'],
    };

    // Get industry-specific suggestions
    const industrySuggestions: Set<string> = new Set();
    if (industryPaths) {
        for (const path of industryPaths) {
            const industry = path.split('.')[0];
            const suggestions = industryAttributeMap[industry] || [];
            suggestions.forEach(s => industrySuggestions.add(s));
        }
    }

    // Combine with top performing from historical data
    const candidateAttributes = new Set([
        ...attributeStats.topPerforming.slice(0, 10),
        ...Array.from(industrySuggestions),
    ]);

    // Score each candidate
    for (const attr of candidateAttributes) {
        const [type, value] = attr.split('.');
        if (!type || !value) continue;

        const typeWeight = weights[type] || 0.5;
        const historicalData = attributeStats.byAttribute[attr];
        const userCount = userDistribution.byAttribute[attr] || 0;

        // Calculate score
        let score = 50; // Base score

        // Historical performance bonus
        if (historicalData) {
            score += historicalData.cvr * 2; // CVR bonus
            score += Math.min(20, historicalData.conversions * 0.1); // Volume bonus
        }

        // User availability bonus
        const reachPercent = userDistribution.totalUsers > 0
            ? (userCount / userDistribution.totalUsers) * 100
            : 0;
        score += Math.min(15, reachPercent * 0.5);

        // Objective alignment bonus
        score *= typeWeight;

        // Industry relevance bonus
        if (industrySuggestions.has(attr)) {
            score *= 1.2;
        }

        // Generate reason
        let reason = '';
        if (historicalData && historicalData.cvr > 10) {
            reason = `높은 전환율 ${historicalData.cvr.toFixed(1)}% 기록`;
        } else if (reachPercent > 10) {
            reason = `${reachPercent.toFixed(0)}% 사용자 도달 가능`;
        } else if (industrySuggestions.has(attr)) {
            reason = `선택한 산업에 최적화된 속성`;
        } else {
            reason = `${objective === 'conversion' ? '전환' : '인지도'} 목표에 적합`;
        }

        // Calculate estimated reach
        const estimatedReach = Math.floor(userCount * (budget / 50000));

        recommendations.push({
            attribute: attr,
            type,
            value,
            score: Math.round(score),
            reason,
            estimatedReach,
            estimatedCVR: historicalData?.cvr || (objective === 'conversion' ? 12 : 8),
            priority: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
        });
    }

    // Sort by score and return top recommendations
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, 8);
}

// Helper: Get optimization suggestions for existing campaign
async function getCampaignOptimization(
    db: admin.firestore.Firestore,
    campaignId: string,
    newRecommendations: any[]
): Promise<{
    currentPerformance: any;
    suggestedChanges: any[];
    potentialImprovement: number;
}> {
    const campaignDoc = await db.doc(`campaigns/${campaignId}`).get();
    if (!campaignDoc.exists) {
        return { currentPerformance: null, suggestedChanges: [], potentialImprovement: 0 };
    }

    const campaign = campaignDoc.data()!;
    const currentAttributes = campaign.attributes || {};

    // Get current campaign analytics
    const analyticsSnap = await db.collection('campaignAnalytics')
        .where('campaignId', '==', campaignId)
        .orderBy('createdAt', 'desc')
        .limit(7)
        .get();

    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    for (const doc of analyticsSnap.docs) {
        const data = doc.data();
        totalImpressions += data.impressions || 0;
        totalClicks += data.clicks || 0;
        totalConversions += data.conversions || 0;
    }

    const currentCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const currentCVR = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Find attributes that could be added for improvement
    const currentAttrFlat = Object.entries(currentAttributes)
        .flatMap(([type, values]) => Array.isArray(values) ? values.map((v: string) => `${type}.${v}`) : []);

    const suggestedChanges = newRecommendations
        .filter(rec => !currentAttrFlat.includes(rec.attribute))
        .slice(0, 3)
        .map(rec => ({
            action: 'add',
            attribute: rec.attribute,
            reason: rec.reason,
            expectedImpact: `+${Math.round(rec.estimatedCVR * 0.3)}% CVR 향상 예상`,
        }));

    // Calculate potential improvement
    const avgNewCVR = newRecommendations.slice(0, 3).reduce((sum, r) => sum + r.estimatedCVR, 0) / 3;
    const potentialImprovement = Math.max(0, Math.round((avgNewCVR - currentCVR) / currentCVR * 100));

    return {
        currentPerformance: {
            impressions: totalImpressions,
            clicks: totalClicks,
            conversions: totalConversions,
            ctr: Math.round(currentCTR * 100) / 100,
            cvr: Math.round(currentCVR * 100) / 100,
        },
        suggestedChanges,
        potentialImprovement,
    };
}

// ============================================
// getAITargetingAssistant - Natural language targeting assistant
// ============================================
export const getAITargetingAssistant = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { productDescription, targetAudience, goal } = request.data || {};

    if (!productDescription) {
        throw new HttpsError('invalid-argument', '제품 설명이 필요합니다.');
    }

    try {
        // Simple keyword-based targeting suggestion (can be enhanced with LLM later)
        const suggestions = generateTargetingSuggestions(productDescription, targetAudience, goal);

        return {
            success: true,
            suggestions,
            message: '타겟팅 제안이 생성되었습니다.',
        };
    } catch (error: any) {
        functions.logger.error('getAITargetingAssistant error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// Helper: Generate targeting suggestions from product description
function generateTargetingSuggestions(
    productDescription: string,
    targetAudience?: string,
    goal?: string
): {
    industries: string[];
    attributes: Record<string, string[]>;
    reasoning: string;
} {
    const desc = (productDescription + ' ' + (targetAudience || '')).toLowerCase();

    const industries: string[] = [];
    const attributes: Record<string, string[]> = {};

    // Industry detection
    if (desc.includes('패션') || desc.includes('의류') || desc.includes('fashion') || desc.includes('apparel')) {
        industries.push('Fashion.Apparel');
    }
    if (desc.includes('뷰티') || desc.includes('화장') || desc.includes('스킨') || desc.includes('beauty')) {
        industries.push('Beauty.Skincare');
    }
    if (desc.includes('tech') || desc.includes('기술') || desc.includes('앱') || desc.includes('소프트웨어')) {
        industries.push('Technology.Software');
    }
    if (desc.includes('음식') || desc.includes('food') || desc.includes('레스토랑') || desc.includes('배달')) {
        industries.push('Food_Beverage.Restaurant');
    }
    if (desc.includes('여행') || desc.includes('travel') || desc.includes('호텔')) {
        industries.push('Travel.Hotel');
    }
    if (desc.includes('금융') || desc.includes('투자') || desc.includes('finance')) {
        industries.push('Finance.Investment');
    }
    if (desc.includes('건강') || desc.includes('헬스') || desc.includes('피트니스')) {
        industries.push('Health_Wellness.Fitness');
    }

    // Price positioning detection
    if (desc.includes('럭셔리') || desc.includes('luxury') || desc.includes('프리미엄') || desc.includes('고급')) {
        attributes['Price_Positioning'] = ['Luxury', 'Premium'];
    } else if (desc.includes('가성비') || desc.includes('저렴') || desc.includes('할인')) {
        attributes['Price_Positioning'] = ['Value', 'Mid'];
    } else {
        attributes['Price_Positioning'] = ['Mid', 'Premium'];
    }

    // Sustainability detection
    if (desc.includes('친환경') || desc.includes('에코') || desc.includes('지속가능') || desc.includes('유기농')) {
        attributes['Sustainability'] = ['Eco_Friendly', 'Organic'];
    }
    if (desc.includes('비건') || desc.includes('vegan')) {
        attributes['Sustainability'] = [...(attributes['Sustainability'] || []), 'Vegan'];
    }

    // Channel preference detection
    if (desc.includes('온라인') || desc.includes('이커머스') || desc.includes('앱')) {
        attributes['Channel_Preference'] = ['Online_First', 'Mobile_First'];
    } else if (desc.includes('오프라인') || desc.includes('매장')) {
        attributes['Channel_Preference'] = ['Offline_First', 'Omnichannel'];
    }

    // Business model detection
    if (desc.includes('구독') || desc.includes('subscription') || desc.includes('멤버십')) {
        attributes['Business_Model'] = ['Subscription'];
    }
    if (desc.includes('DTC') || desc.includes('직접 판매') || desc.includes('자사몰')) {
        attributes['Business_Model'] = [...(attributes['Business_Model'] || []), 'DTC'];
    }

    // Target audience detection
    if (desc.includes('젊은') || desc.includes('MZ') || desc.includes('20대') || desc.includes('트렌드')) {
        attributes['Purchase_Decision_Style'] = ['Trend_Seeker', 'Impulse'];
    } else if (desc.includes('프로페셔널') || desc.includes('직장인') || desc.includes('비즈니스')) {
        attributes['Purchase_Decision_Style'] = ['Research_Heavy', 'Brand_Loyal'];
    }

    // Default if nothing detected
    if (industries.length === 0) {
        industries.push('Technology.Consumer_Electronics');
    }

    // Generate reasoning
    const reasons: string[] = [];
    if (industries.length > 0) {
        reasons.push(`"${industries.join(', ')}" 산업으로 분류되었습니다.`);
    }
    if (attributes['Price_Positioning']) {
        reasons.push(`가격 포지셔닝: ${attributes['Price_Positioning'].join(', ')}`);
    }
    if (attributes['Sustainability']) {
        reasons.push(`지속가능성 속성이 감지되어 ESG 관련 타겟팅을 추가했습니다.`);
    }

    return {
        industries,
        attributes,
        reasoning: reasons.join(' ') || '기본 타겟팅 설정을 추천합니다.',
    };
}

// ============================================
// analyzeCampaignPerformance - Scheduled job for campaign optimization alerts
// Runs every 6 hours to analyze campaign performance and generate notifications
// ============================================
export const analyzeCampaignPerformance = functions.pubsub
    .schedule('0 */6 * * *')  // Every 6 hours
    .timeZone('UTC')
    .onRun(async (context) => {
        const db = admin.firestore();
        functions.logger.info('Starting campaign performance analysis...');

        try {
            // Get active campaigns
            const campaignsSnap = await db.collection('campaigns')
                .where('status', '==', 'active')
                .limit(100)
                .get();

            let notificationsSent = 0;

            for (const campaignDoc of campaignsSnap.docs) {
                const campaign = campaignDoc.data();
                const campaignId = campaignDoc.id;

                try {
                    // Analyze campaign and generate notifications
                    const notifications = await generateCampaignNotifications(db, campaignId, campaign);

                    // Save notifications
                    for (const notification of notifications) {
                        await db.collection(`advertisers/${campaign.advertiserId}/notifications`).add({
                            ...notification,
                            campaignId,
                            campaignName: campaign.name,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            read: false,
                        });
                        notificationsSent++;
                    }
                } catch (error: any) {
                    functions.logger.warn(`Failed to analyze campaign ${campaignId}:`, error.message);
                }
            }

            functions.logger.info('Campaign analysis complete', {
                campaignsAnalyzed: campaignsSnap.size,
                notificationsSent
            });
            return null;
        } catch (error: any) {
            functions.logger.error('analyzeCampaignPerformance error:', error);
            throw error;
        }
    });

// Helper: Generate notifications for a campaign
async function generateCampaignNotifications(
    db: admin.firestore.Firestore,
    campaignId: string,
    campaign: any
): Promise<Array<{
    type: 'warning' | 'success' | 'info' | 'optimization';
    title: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
    actionUrl?: string;
    suggestedAction?: string;
}>> {
    const notifications: any[] = [];

    // Get recent analytics (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const analyticsSnap = await db.collection('campaignAnalytics')
        .where('campaignId', '==', campaignId)
        .where('createdAt', '>=', sevenDaysAgo)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

    if (analyticsSnap.empty) return notifications;

    // Calculate metrics
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    let totalSpend = 0;

    analyticsSnap.docs.forEach(doc => {
        const data = doc.data();
        totalImpressions += data.impressions || 0;
        totalClicks += data.clicks || 0;
        totalConversions += data.conversions || 0;
        totalSpend += data.spend || 0;
    });

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cvr = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;


    // 1. Low CTR Warning
    if (ctr < 1.0 && totalImpressions > 1000) {
        notifications.push({
            type: 'warning',
            title: '낮은 클릭률 경고',
            message: `CTR이 ${ctr.toFixed(2)}%로 평균(1.5%) 이하입니다. 크리에이티브나 타겟팅 조정을 고려해보세요.`,
            priority: 'high',
            suggestedAction: '크리에이티브 A/B 테스트 또는 타겟 오디언스 확장',
        });
    }

    // 2. Low CVR Warning
    if (cvr < 5.0 && totalClicks > 100) {
        notifications.push({
            type: 'warning',
            title: '전환율 개선 필요',
            message: `전환율이 ${cvr.toFixed(2)}%입니다. 랜딩페이지 최적화나 오디언스 재설정을 권장합니다.`,
            priority: 'medium',
            suggestedAction: '랜딩페이지 개선 또는 Attribute 타겟팅 세분화',
        });
    }

    // 3. High CPA Alert
    const budgetThreshold = campaign.dailyBudget * 0.3;
    if (cpa > budgetThreshold && totalConversions > 0) {
        notifications.push({
            type: 'warning',
            title: 'CPA 과다 지출',
            message: `전환당 비용이 ₩${cpa.toLocaleString()}로 높습니다. 예산 효율성 검토가 필요합니다.`,
            priority: 'high',
            suggestedAction: '저성과 Attribute 타겟팅 제거 또는 입찰 조정',
        });
    }

    // 4. Good Performance Celebration
    if (cvr >= 15 && totalConversions >= 10) {
        notifications.push({
            type: 'success',
            title: '🎉 우수 성과 달성!',
            message: `전환율 ${cvr.toFixed(1)}%로 훌륭한 성과를 보이고 있습니다. 예산 증액을 고려해보세요!`,
            priority: 'low',
            suggestedAction: '예산 증액 및 유사 오디언스 확장',
        });
    }

    // 5. Attribute Optimization Suggestion
    if (totalImpressions > 5000 && cvr < 10) {
        const currentAttributes = Object.values(campaign.attributes || {}).flat();
        if (currentAttributes.length < 3) {
            notifications.push({
                type: 'optimization',
                title: 'AI 타겟팅 최적화 제안',
                message: '더 많은 Attribute를 추가하면 전환율을 높일 수 있습니다. AI 추천을 확인해보세요.',
                priority: 'medium',
                actionUrl: `/advertiser/campaigns/${campaignId}/edit`,
                suggestedAction: 'AI 추천 Attribute 추가',
            });
        }
    }

    // 6. Budget Pacing Alert
    const dailySpend = totalSpend / 7; // average daily spend
    if (dailySpend > campaign.dailyBudget * 1.2) {
        notifications.push({
            type: 'info',
            title: '예산 소진 속도 알림',
            message: `일 평균 ₩${dailySpend.toLocaleString()} 지출로 설정 예산을 초과하고 있습니다.`,
            priority: 'medium',
            suggestedAction: '일일 예산 증액 또는 타겟팅 축소',
        });
    }

    return notifications;
}

// ============================================
// getCampaignNotifications - Get notifications for advertiser
// ============================================
export const getCampaignNotifications = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const db = admin.firestore();
    const uid = request.auth.uid;
    const { limit: queryLimit = 20, unreadOnly = false } = request.data || {};

    try {
        let query: admin.firestore.Query = db.collection(`advertisers/${uid}/notifications`)
            .orderBy('createdAt', 'desc')
            .limit(queryLimit);

        if (unreadOnly) {
            query = query.where('read', '==', false);
        }

        const notificationsSnap = await query.get();

        const notifications = notificationsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || null,
        }));

        // Count unread
        const unreadSnap = await db.collection(`advertisers/${uid}/notifications`)
            .where('read', '==', false)
            .count()
            .get();

        return {
            success: true,
            notifications,
            unreadCount: unreadSnap.data().count,
        };
    } catch (error: any) {
        functions.logger.error('getCampaignNotifications error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// ============================================
// markNotificationRead - Mark notification as read
// ============================================
export const markNotificationRead = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const db = admin.firestore();
    const uid = request.auth.uid;
    const { notificationId, markAll = false } = request.data || {};

    try {
        if (markAll) {
            // Mark all as read
            const batch = db.batch();
            const unreadSnap = await db.collection(`advertisers/${uid}/notifications`)
                .where('read', '==', false)
                .limit(100)
                .get();

            unreadSnap.docs.forEach(doc => {
                batch.update(doc.ref, { read: true, readAt: admin.firestore.FieldValue.serverTimestamp() });
            });

            await batch.commit();

            return { success: true, markedCount: unreadSnap.size };
        } else if (notificationId) {
            await db.doc(`advertisers/${uid}/notifications/${notificationId}`).update({
                read: true,
                readAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return { success: true, markedCount: 1 };
        } else {
            throw new HttpsError('invalid-argument', 'notificationId 또는 markAll이 필요합니다.');
        }
    } catch (error: any) {
        functions.logger.error('markNotificationRead error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// ============================================
// triggerCampaignAnalysis - Manual trigger for campaign analysis (Admin)
// ============================================
export const triggerCampaignAnalysis = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    // Check admin
    const userEmail = request.auth.token.email;
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
        throw new HttpsError('permission-denied', '관리자만 접근 가능합니다.');
    }

    const db = admin.firestore();
    const { campaignId } = request.data || {};

    try {
        if (campaignId) {
            // Analyze specific campaign
            const campaignDoc = await db.doc(`campaigns/${campaignId}`).get();
            if (!campaignDoc.exists) {
                throw new HttpsError('not-found', '캠페인을 찾을 수 없습니다.');
            }

            const notifications = await generateCampaignNotifications(db, campaignId, campaignDoc.data());

            // Save notifications
            const campaign = campaignDoc.data()!;
            for (const notification of notifications) {
                await db.collection(`advertisers/${campaign.advertiserId}/notifications`).add({
                    ...notification,
                    campaignId,
                    campaignName: campaign.name,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    read: false,
                    triggeredBy: 'admin',
                });
            }

            return {
                success: true,
                message: `${notifications.length}개의 알림이 생성되었습니다.`,
                notifications,
            };
        } else {
            // Analyze all active campaigns
            const campaignsSnap = await db.collection('campaigns')
                .where('status', '==', 'active')
                .limit(50)
                .get();

            let totalNotifications = 0;
            for (const doc of campaignsSnap.docs) {
                const notifications = await generateCampaignNotifications(db, doc.id, doc.data());
                const campaign = doc.data();

                for (const notification of notifications) {
                    await db.collection(`advertisers/${campaign.advertiserId}/notifications`).add({
                        ...notification,
                        campaignId: doc.id,
                        campaignName: campaign.name,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        read: false,
                        triggeredBy: 'admin',
                    });
                }
                totalNotifications += notifications.length;
            }

            return {
                success: true,
                message: `${campaignsSnap.size}개 캠페인 분석 완료, ${totalNotifications}개 알림 생성.`,
                campaignsAnalyzed: campaignsSnap.size,
                notificationsGenerated: totalNotifications,
            };
        }
    } catch (error: any) {
        functions.logger.error('triggerCampaignAnalysis error:', error);
        throw new HttpsError('internal', error.message);
    }
});


// ============================================
// extractLottoNumbers - Cloud Vision API OCR for Lotto Tickets
// Extracts numbers row by row (A~E)
// ============================================
export const extractLottoNumbers = onCall({
    cors: true,
    timeoutSeconds: 60,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const { image, useCloudVision = true } = request.data || {};

    if (!image) {
        throw new HttpsError('invalid-argument', '이미지가 필요합니다.');
    }

    functions.logger.info('extractLottoNumbers called', { useCloudVision, imageLength: image.length });

    try {
        let fullText = '';
        const games: any[] = [];

        if (useCloudVision) {
            // Use Google Cloud Vision API
            const vision = require('@google-cloud/vision');
            const visionClient = new vision.ImageAnnotatorClient();

            // Prepare the image request
            let imageRequest: any;
            if (image.startsWith('data:image') || image.startsWith('/9j') || image.length > 1000) {
                const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
                imageRequest = { image: { content: base64Data } };
            } else {
                imageRequest = { image: { source: { imageUri: image } } };
            }

            // Call Cloud Vision TEXT_DETECTION
            const [result] = await visionClient.textDetection(imageRequest);
            const detections = result.textAnnotations;

            if (detections && detections.length > 0) {
                fullText = detections[0].description || '';
            }

            functions.logger.info('Cloud Vision result length', { len: fullText.length });
        } else {
            return {
                success: false,
                error: 'Cloud Vision disabled',
            };
        }

        // --- Parsing Logic for Korean Lotto ---
        // Robust Pattern Matching using global regex on fullText
        // 1. Try to find games with A-E labels first
        // Pattern: [A-E] (optional: Auto/Manual) Num Num Num Num Num Num
        const labeledPattern = /(?:^|\s)([A-Ea-e])\s*(?:자\s*동|수\s*동|반\s*자\s*동|[^0-9\n]*)?\s*(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/gm;

        // 2. Fallback: just find 6 numbers
        const fallbackPattern = /(?:^|\s)(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})(?:\s|$)/gm;

        const foundGames = new Map<number, number[]>();
        let match;

        // Strategy 1: Search for Labeled Games (A-E)
        while ((match = labeledPattern.exec(fullText)) !== null) {
            const labelChar = match[1].toUpperCase();
            const gameNo = labelChar.charCodeAt(0) - 64; // A=1

            const numbers = [
                parseInt(match[2]), parseInt(match[3]), parseInt(match[4]),
                parseInt(match[5]), parseInt(match[6]), parseInt(match[7])
            ].sort((a, b) => a - b);

            if (numbers.every(n => n >= 1 && n <= 45)) {
                foundGames.set(gameNo, numbers);
            }
        }

        // Strategy 2: If we missed some games, try fallback
        // Only if we found FEWER than 5 games and the text has more potential
        if (foundGames.size < 5) {
            let autoIndex = 1;
            while ((match = fallbackPattern.exec(fullText)) !== null) {
                // Skip if this index is already filled by a labeled game
                while (foundGames.has(autoIndex)) {
                    autoIndex++;
                }
                if (autoIndex > 5) break;

                const numbers = [
                    parseInt(match[1]), parseInt(match[2]), parseInt(match[3]),
                    parseInt(match[4]), parseInt(match[5]), parseInt(match[6])
                ].sort((a, b) => a - b);

                // Strict validation
                const unique = new Set(numbers);
                if (unique.size === 6 && numbers.every(n => n >= 1 && n <= 45)) {
                    // Heuristic: Check if this set of numbers is NOT already in foundGames (to avoid dupes)
                    const isDuplicate = Array.from(foundGames.values()).some(existing =>
                        existing.every((val, index) => val === numbers[index])
                    );

                    if (!isDuplicate) {
                        foundGames.set(autoIndex, numbers);
                        autoIndex++;
                    }
                }
            }
        }

        // Convert Map to Array
        Array.from(foundGames.entries()).forEach(([gameNo, numbers]) => {
            games.push({ gameNo, numbers, status: 'pending' });
        });

        // Legacy support
        const legcayNumbers = games.length > 0 ? games[0].numbers : [];

        // Confidence Check
        let confidence = 'none';
        if (games.length >= 5) confidence = 'high';
        else if (games.length > 0) confidence = 'medium';

        return {
            success: true,
            games: games.sort((a, b) => a.gameNo - b.gameNo),
            numbers: legcayNumbers,
            rawText: fullText.substring(0, 200),
            confidence,
        };

    } catch (error: any) {
        functions.logger.error('extractLottoNumbers error:', error);

        if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
            throw new HttpsError('permission-denied', 'Cloud Vision API가 활성화되지 않았습니다.');
        }

        throw new HttpsError('internal', `OCR 처리 오류: ${error.message}`);
    }
});


// ============================================
// registerLottoTicket - Register scanned ticket
// Supports 5-game structure
// ============================================
export const registerLottoTicket = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }

    const uid = request.auth.uid;
    const { drawRound, games } = request.data;
    // games: [{ gameNo: 1, numbers: [...] }, ...]

    if (!games || !Array.isArray(games) || games.length === 0) {
        throw new HttpsError('invalid-argument', '게임 데이터가 없습니다.');
    }

    const db = admin.firestore();
    const userRef = db.doc(`users/${uid}`);
    const costPerGame = 5;
    const totalCost = games.length * costPerGame;

    try {
        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) {
                throw new HttpsError('not-found', '사용자를 찾을 수 없습니다.');
            }

            const userData = userDoc.data() || {};
            const currentBalance = userData.balance || 0;

            if (currentBalance < totalCost) {
                throw new HttpsError('failed-precondition', '잔액이 부족합니다.');
            }

            // 1. Create LottoTicket
            const ticketRef = userRef.collection('lottoTickets').doc();
            const ticketId = ticketRef.id;

            const newTicket = {
                ticketId,
                drawRound: drawRound || 1127, // Default if missing
                drawDate: '2025-??-??', // Placeholder
                games: games.map((g: any) => ({
                    gameNo: g.gameNo,
                    numbers: g.numbers,
                    status: 'pending'
                })),
                status: 'pending',
                registeredAt: admin.firestore.FieldValue.serverTimestamp(),
                cost: totalCost
            };

            t.set(ticketRef, newTicket);

            // 2. Deduct Balance
            t.update(userRef, {
                balance: admin.firestore.FieldValue.increment(-totalCost)
            });

            // 3. Record Transaction
            const txRef = userRef.collection('transactions').doc();
            t.set(txRef, {
                type: 'Jackpot Entry',
                amount: -totalCost,
                date: new Date().toISOString(),
                description: `로또 ${games.length}게임 등록`,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return { success: true };
    } catch (error: any) {
        functions.logger.error('registerLottoTicket error:', error);
        throw new HttpsError('internal', error.message);
    }
});


// ============================================
// settleLottoRound - Admin function to settle a lotto round
// Implements Korean Lotto Logic:
// - Total Prize Pool = 50% of Total Sales
// - 4th/5th Place: Fixed Prizes (500, 50 VIEW)
// - 1st/2nd/3rd: Percentage of remaining pool + Rollover from previous round
// - If no winner, prize rolls over to the next round.
// ============================================
export const settleLottoRound = onCall({
    cors: true,
    timeoutSeconds: 540,
}, async (request) => {
    // 1. Admin Check
    let isAdmin = false;
    if (request.auth) {
        if (ADMIN_EMAILS.includes(request.auth.token.email || '')) {
            isAdmin = true;
        } else {
            // Check Firestore role
            const userSnap = await admin.firestore().doc(`users/${request.auth.uid}`).get();
            if (userSnap.exists && userSnap.data()?.role === 'admin') {
                isAdmin = true;
            }
        }
    }

    if (!isAdmin) {
        throw new HttpsError('permission-denied', 'Admin access required.');
    }

    const { round, numbers, bonus } = request.data;
    if (!round || !numbers || !bonus || numbers.length !== 6) {
        throw new HttpsError('invalid-argument', 'Invalid round data.');
    }

    const currentRound = parseInt(round);
    const db = admin.firestore();
    const winningNumbers = numbers.sort((a: number, b: number) => a - b);
    const bonusNumber = bonus;

    functions.logger.info(`Settling Lotto Round ${currentRound}`, { winningNumbers, bonusNumber });

    try {
        // 2. Load Previous Carryover
        let prevCarryover = { rank1: 0, rank2: 0, rank3: 0 };
        const roundDocRef = db.collection('lottoRounds').doc(String(currentRound));
        const roundDoc = await roundDocRef.get();
        if (roundDoc.exists) {
            const data = roundDoc.data();
            if (data?.carryoverFromPrevious) {
                prevCarryover = data.carryoverFromPrevious;
            }
        }

        // 3. Fetch all tickets
        const ticketsQuery = db.collectionGroup('lottoTickets')
            .where('drawRound', '==', currentRound)
            .where('status', '==', 'pending');

        const snapshot = await ticketsQuery.get();
        if (snapshot.empty) {
            // Even if empty, we might need to carry over the 'prevCarryover' to next round
            if (prevCarryover.rank1 > 0 || prevCarryover.rank2 > 0 || prevCarryover.rank3 > 0) {
                await db.collection('lottoRounds').doc(String(currentRound + 1)).set({
                    carryoverFromPrevious: prevCarryover,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
            return { message: 'No tickets found. Carryover updated.' };
        }

        // 4. Analyze Results
        const ticketResults: any[] = [];
        const costPerTicket = 5; // VIEW
        let totalSales = 0;

        // Winner Counts
        const winners = { rank1: 0, rank2: 0, rank3: 0, rank4: 0, rank5: 0 };

        for (const doc of snapshot.docs) {
            const ticketData = doc.data();
            const games = ticketData.games || [];

            // Assuming cost was paid when registered. We calculate total sales based on valid games.
            // ticketData.cost could be used, or just count games.
            // Let's count games for accuracy.
            totalSales += (games.length * costPerTicket);

            const processedGames = games.map((game: any) => {
                const myNumbers = game.numbers || [];
                const matchCount = myNumbers.filter((n: number) => winningNumbers.includes(n)).length;
                const isBonusMatch = myNumbers.includes(bonusNumber);

                let rank = 0;
                // Korean Lotto Ranks
                if (matchCount === 6) rank = 1;
                else if (matchCount === 5 && isBonusMatch) rank = 2;
                else if (matchCount === 5) rank = 3;
                else if (matchCount === 4) rank = 4;
                else if (matchCount === 3) rank = 5;

                if (rank === 1) winners.rank1++;
                if (rank === 2) winners.rank2++;
                if (rank === 3) winners.rank3++;
                if (rank === 4) winners.rank4++;
                if (rank === 5) winners.rank5++;

                return { ...game, rank, matchCount };
            });

            ticketResults.push({ ref: doc.ref, games: processedGames, uid: ticketData.uid }); // uid might be in parent path
        }

        // 5. Calculate Prize Pools
        const totalPrizePool = totalSales * 0.5; // 50% payout rule

        // Fixed Prizes
        const prizeRank4 = 500;
        const prizeRank5 = 50;
        const fixedPrizeTotal = (winners.rank4 * prizeRank4) + (winners.rank5 * prizeRank5);

        // Net Pool for 1-3 Ranks
        let netPool = totalPrizePool - fixedPrizeTotal;
        if (netPool < 0) netPool = 0; // Should not happen in large scale, but possible in small scale

        // Distribution Ratio: 1st(75%), 2nd(12.5%), 3rd(12.5%)
        const rawPoolRank1 = netPool * 0.75;
        const rawPoolRank2 = netPool * 0.125;
        const rawPoolRank3 = netPool * 0.125;

        // Final Pools (Include Carryover)
        const totalPoolRank1 = rawPoolRank1 + (prevCarryover.rank1 || 0);
        const totalPoolRank2 = rawPoolRank2 + (prevCarryover.rank2 || 0);
        const totalPoolRank3 = rawPoolRank3 + (prevCarryover.rank3 || 0);

        // Determine Prize Per Winner & Next Carryover
        const nextCarryover = { rank1: 0, rank2: 0, rank3: 0 };

        const prizePerWinner = {
            rank1: winners.rank1 > 0 ? Math.floor(totalPoolRank1 / winners.rank1) : 0,
            rank2: winners.rank2 > 0 ? Math.floor(totalPoolRank2 / winners.rank2) : 0,
            rank3: winners.rank3 > 0 ? Math.floor(totalPoolRank3 / winners.rank3) : 0,
            rank4: prizeRank4,
            rank5: prizeRank5
        };

        if (winners.rank1 === 0) nextCarryover.rank1 = totalPoolRank1;
        if (winners.rank2 === 0) nextCarryover.rank2 = totalPoolRank2;
        if (winners.rank3 === 0) nextCarryover.rank3 = totalPoolRank3;

        functions.logger.info(`Prize Calculation`, {
            totalSales, totalPrizePool, fixedPrizeTotal, netPool,
            prevCarryover, totalPoolRank1, winners, prizePerWinner, nextCarryover
        });

        // 6. Execute Updates (Tickets, Users, Batches)
        const batch = db.batch();
        let operationCount = 0;

        // Update Tickets & Distribute Rewards
        for (const ticket of ticketResults) {
            const { ref, games } = ticket;
            let ticketTotalPrize = 0;
            let ticketWon = false;

            const finalGames = games.map((game: any) => {
                const r = game.rank;
                let p = 0;
                if (r === 1) p = prizePerWinner.rank1;
                else if (r === 2) p = prizePerWinner.rank2;
                else if (r === 3) p = prizePerWinner.rank3;
                else if (r === 4) p = prizePerWinner.rank4;
                else if (r === 5) p = prizePerWinner.rank5;

                if (r > 0) {
                    ticketTotalPrize += p;
                    ticketWon = true;
                }

                return { ...game, status: r > 0 ? 'won' : 'lost', prize: p };
            });

            batch.update(ref, {
                status: ticketWon ? 'won' : 'lost',
                games: finalGames,
                totalPrize: ticketTotalPrize,
                settledAt: admin.firestore.FieldValue.serverTimestamp()
            });
            operationCount++;

            if (ticketWon && ticketTotalPrize > 0) {
                const userRef = ref.parent.parent;
                if (userRef) {
                    batch.update(userRef, {
                        balance: admin.firestore.FieldValue.increment(ticketTotalPrize)
                    });

                    const txRef = userRef.collection('transactions').doc();
                    batch.set(txRef, {
                        type: 'Jackpot Win',
                        amount: ticketTotalPrize,
                        date: new Date().toISOString(),
                        description: `로또 ${currentRound}회 당첨`,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    operationCount += 2;
                }
            }
        }

        // 7. Save Next Carryover & Round Result
        const nextRoundDoc = db.collection('lottoRounds').doc(String(currentRound + 1));
        batch.set(nextRoundDoc, {
            carryoverFromPrevious: nextCarryover,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Save current round summary
        batch.set(roundDocRef, {
            winningNumbers,
            bonusNumber,
            totalSales,
            winners,
            prizePerWinner,
            totalDistributed: totalSales * 0.5 - Object.values(nextCarryover).reduce((a, b) => a + b, 0), // Approx
            netCarryover: nextCarryover,
            settledAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        operationCount += 2;

        await batch.commit();

        return {
            success: true,
            processed: snapshot.size,
            winners,
            prizePerWinner,
            carriedOver: nextCarryover
        };

    } catch (error: any) {
        functions.logger.error('settleLottoRound error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// ============================================
// Advertiser Product Management
// ============================================

// Get Advertiser Products
export const getAdvertiserProducts = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    try {
        // Get products for this advertiser
        const snapshot = await db.collection('advertiserProducts')
            .where('advertiserId', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return { success: true, products };
    } catch (error: any) {
        functions.logger.error('getAdvertiserProducts error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// Save Advertiser Product (Create or Update)
export const saveAdvertiserProduct = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();
    const productData = request.data;

    if (!productData.name || !productData.industry || !productData.category) {
        throw new HttpsError("invalid-argument", "필수 항목을 입력해주세요.");
    }

    try {
        const productId = productData.id || `prod_${Date.now()}`;

        const productDoc = {
            id: productId,
            advertiserId: uid,
            name: productData.name,
            description: productData.description || '',
            imageUrl: productData.imageUrl || '',
            industry: productData.industry,
            category: productData.category,
            subcategory: productData.subcategory || null,
            attributes: productData.attributes || {},
            brand: productData.brand || null,
            isActive: productData.isActive ?? true,
            isAdvertiserProduct: true,
            weight: 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Check if update or create
        const existingDoc = await db.collection('advertiserProducts').doc(productId).get();

        if (existingDoc.exists) {
            // Verify ownership
            if (existingDoc.data()?.advertiserId !== uid) {
                throw new HttpsError("permission-denied", "수정 권한이 없습니다.");
            }
            await db.collection('advertiserProducts').doc(productId).update(productDoc);
        } else {
            await db.collection('advertiserProducts').doc(productId).set({
                ...productDoc,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }


        return { success: true, productId };
    } catch (error: any) {
        functions.logger.error('saveAdvertiserProduct error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// Delete Advertiser Product
export const deleteAdvertiserProduct = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();
    const { productId } = request.data;

    if (!productId) {
        throw new HttpsError("invalid-argument", "제품 ID가 필요합니다.");
    }

    try {
        const productDoc = await db.collection('advertiserProducts').doc(productId).get();

        if (!productDoc.exists) {
            throw new HttpsError("not-found", "제품을 찾을 수 없습니다.");
        }

        if (productDoc.data()?.advertiserId !== uid) {
            throw new HttpsError("permission-denied", "삭제 권한이 없습니다.");
        }

        await db.collection('advertiserProducts').doc(productId).delete();

        return { success: true };
    } catch (error: any) {
        functions.logger.error('deleteAdvertiserProduct error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// Get All Swipe Items (Public items + Advertiser products)
export const getSwipeItems = onCall({
    cors: true,
}, async (request) => {
    const db = admin.firestore();
    const { limit: itemLimit = 20, excludeIds = [] } = request.data || {};

    try {
        // Get active advertiser products
        const snapshot = await db.collection('advertiserProducts')
            .where('isActive', '==', true)
            .limit(50)
            .get();

        const advertiserProducts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            source: 'advertiser'
        }));

        // Filter out already seen items
        const filteredProducts = advertiserProducts.filter(
            p => !excludeIds.includes(p.id)
        );

        // Shuffle and limit
        const shuffled = filteredProducts.sort(() => Math.random() - 0.5);

        return {
            success: true,
            items: shuffled.slice(0, itemLimit),
            totalAvailable: advertiserProducts.length
        };
    } catch (error: any) {
        functions.logger.error('getSwipeItems error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// Record Swipe Activity & Update Persona
export const recordSwipeActivity = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();
    const { itemId, direction, taxonomyTags, attributes } = request.data;

    if (!itemId || !direction) {
        throw new HttpsError("invalid-argument", "필수 항목이 누락되었습니다.");
    }

    const isLike = direction === 'right';

    try {
        // 1. Record the swipe activity
        await db.collection(`users/${uid}/swipeActivities`).add({
            itemId,
            direction,
            isLike,
            taxonomyTags: taxonomyTags || [],
            attributes: attributes || {},
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2. Update taxonomy scores in persona
        const personaRef = db.doc(`users/${uid}/persona/current`);
        const personaDoc = await personaRef.get();
        const personaData = personaDoc.exists ? personaDoc.data() : {};

        const currentScores = personaData?.interests?.scores || {};
        const currentAttributeScores = personaData?.attributeScores || {};

        // Update taxonomy scores based on swipe direction
        const scoreChange = isLike ? 0.05 : -0.02;
        const updatedScores = { ...currentScores };

        if (taxonomyTags && Array.isArray(taxonomyTags)) {
            for (const tag of taxonomyTags) {
                const currentScore = updatedScores[tag] || 0;
                updatedScores[tag] = Math.max(0, Math.min(1, currentScore + scoreChange));
            }
        }

        // Update attribute scores
        const updatedAttributeScores = { ...currentAttributeScores };
        if (attributes) {
            const attrScoreChange = isLike ? 0.08 : -0.03;

            if (attributes.pricePositioning) {
                const key = `Price_Positioning.${attributes.pricePositioning}`;
                updatedAttributeScores[key] = Math.max(0, Math.min(1,
                    (updatedAttributeScores[key] || 0) + attrScoreChange
                ));
            }

            if (attributes.sustainability) {
                const key = `Sustainability.${attributes.sustainability}`;
                updatedAttributeScores[key] = Math.max(0, Math.min(1,
                    (updatedAttributeScores[key] || 0) + attrScoreChange
                ));
            }

            if (attributes.businessModel) {
                const key = `Business_Model.${attributes.businessModel}`;
                updatedAttributeScores[key] = Math.max(0, Math.min(1,
                    (updatedAttributeScores[key] || 0) + attrScoreChange
                ));
            }
        }

        // === NEW: Update trait scores based on swipe behavior ===
        const currentTraits = personaData?.traits || {};
        const updatedTraits = { ...currentTraits };


        // Adjust earlyAdopter based on new/trending items
        if (attributes?.isNew || attributes?.isTrending) {
            updatedTraits.earlyAdopter = Math.max(0, Math.min(1,
                (updatedTraits.earlyAdopter || 0.5) + (isLike ? 0.03 : -0.01)
            ));
        }

        // Adjust purchasingPower and priceVsBrand based on price positioning
        if (attributes?.pricePositioning) {
            const pricing = attributes.pricePositioning;
            if (pricing === 'Premium' || pricing === 'Super_Premium') {
                updatedTraits.purchasingPower = Math.max(0, Math.min(1,
                    (updatedTraits.purchasingPower || 0.5) + (isLike ? 0.03 : -0.01)
                ));
                updatedTraits.priceVsBrand = Math.max(0, Math.min(1,
                    (updatedTraits.priceVsBrand || 0.5) + (isLike ? 0.02 : -0.01)
                ));
            } else if (pricing === 'Budget' || pricing === 'Value') {
                updatedTraits.priceVsBrand = Math.max(0, Math.min(1,
                    (updatedTraits.priceVsBrand || 0.5) - (isLike ? 0.02 : -0.01)
                ));
            }
        }

        // Adjust sustainabilityValue based on eco-friendly items
        if (attributes?.sustainability && attributes.sustainability !== 'None') {
            updatedTraits.sustainabilityValue = Math.max(0, Math.min(1,
                (updatedTraits.sustainabilityValue || 0.5) + (isLike ? 0.03 : -0.01)
            ));
        }

        // Online preference based on DTC/tech items
        if (attributes?.businessModel === 'DTC' || taxonomyTags?.includes('Technology')) {
            updatedTraits.onlinePreference = Math.max(0, Math.min(1,
                (updatedTraits.onlinePreference || 0.5) + (isLike ? 0.02 : -0.01)
            ));
        }

        // 3. Update persona document (including updated traits)
        await personaRef.set({
            traits: updatedTraits,
            interests: {
                ...personaData?.interests,
                scores: updatedScores,
            },
            attributeScores: updatedAttributeScores,
            swipeCount: admin.firestore.FieldValue.increment(1),
            lastSwipeAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });


        // 4. Update user's top attributes (for quick filtering)
        const sortedAttributes = Object.entries(updatedAttributeScores)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([key]) => key);

        await db.doc(`users/${uid}`).update({
            topAttributes: sortedAttributes,
            attributeScoresCount: Object.keys(updatedAttributeScores).length,
        });

        // 5. Grant VP reward every 10 swipes
        const userDoc = await db.doc(`users/${uid}`).get();
        const userData = userDoc.data() || {};
        const totalSwipes = (userData.totalSwipes || 0) + 1;

        let vpRewarded = 0;
        if (totalSwipes % 10 === 0) {
            vpRewarded = 1;
            await db.doc(`users/${uid}`).update({
                balance: admin.firestore.FieldValue.increment(1),
                totalSwipes,
            });

            // Record transaction
            await db.collection(`users/${uid}/transactions`).add({
                type: 'Swipe Reward',
                amount: 1,
                description: `${totalSwipes}회 스와이프 보상`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            await db.doc(`users/${uid}`).update({ totalSwipes });
        }

        return {
            success: true,
            vpRewarded,
            totalSwipes,
            message: vpRewarded > 0 ? `+${vpRewarded} VP 획득!` : null
        };
    } catch (error: any) {
        functions.logger.error('recordSwipeActivity error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// ============================================
// Grade System
// ============================================

// Default grade tiers (used if not in Firestore)
const DEFAULT_GRADE_TIERS = [
    { id: 'bronze', name: 'Bronze', nameKo: '브론즈', icon: '🥉', color: 'text-orange-700', bgColor: 'bg-orange-100', requiredActiveDays: 0, requiredActivityScore: 0, requiredStreak: 0, requiredReferrals: 0, vpMultiplier: 1.0, stakingBoost: 0, referralBonus: 0 },
    { id: 'silver', name: 'Silver', nameKo: '실버', icon: '🥈', color: 'text-gray-500', bgColor: 'bg-gray-100', requiredActiveDays: 7, requiredActivityScore: 500, requiredStreak: 3, requiredReferrals: 0, vpMultiplier: 1.1, stakingBoost: 5, referralBonus: 5 },
    { id: 'gold', name: 'Gold', nameKo: '골드', icon: '🥇', color: 'text-yellow-600', bgColor: 'bg-yellow-100', requiredActiveDays: 30, requiredActivityScore: 2000, requiredStreak: 7, requiredReferrals: 0, vpMultiplier: 1.2, stakingBoost: 10, referralBonus: 10 },
    { id: 'platinum', name: 'Platinum', nameKo: '플래티넘', icon: '💎', color: 'text-cyan-600', bgColor: 'bg-cyan-100', requiredActiveDays: 90, requiredActivityScore: 8000, requiredStreak: 14, requiredReferrals: 2, vpMultiplier: 1.3, stakingBoost: 15, referralBonus: 15 },
    { id: 'diamond', name: 'Diamond', nameKo: '다이아몬드', icon: '👑', color: 'text-purple-600', bgColor: 'bg-purple-100', requiredActiveDays: 180, requiredActivityScore: 20000, requiredStreak: 30, requiredReferrals: 5, vpMultiplier: 1.5, stakingBoost: 25, referralBonus: 25 },
];

const DEFAULT_ACTIVITY_SCORES = {
    dailyCheckIn: 10,
    adWatch: 5,
    adWatchDailyMax: 25,
    swipePer10: 1,
    swipeDailyMax: 5,
    prediction: 10,
    surveyAnswer: 3,
    surveyDailyMax: 30,
    referral: 50,
};

// Get User Grade
export const getUserGrade = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    try {
        // Get grade settings
        const settingsDoc = await db.doc('settings/gradeSystem').get();
        const tiers = settingsDoc.exists ? settingsDoc.data()?.tiers || DEFAULT_GRADE_TIERS : DEFAULT_GRADE_TIERS;

        // Get user activity data
        const userDoc = await db.doc(`users/${uid}`).get();
        const userData = userDoc.data() || {};

        const activityData = {
            activeDays: userData.activeDays || 0,
            totalActivityScore: userData.totalActivityScore || 0,
            currentStreak: userData.currentStreak || 0,
            longestStreak: userData.longestStreak || 0,
            referralsCount: (userData.directReferrals || 0) + (userData.indirectReferrals || 0),
            lastActiveAt: userData.lastActiveAt,
            createdAt: userData.createdAt,
        };

        // Calculate days since registration
        const createdAt = userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt || Date.now());
        const daysSinceJoin = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate current grade
        const sortedTiers = [...tiers].sort((a: any, b: any) => b.requiredActiveDays - a.requiredActiveDays);
        let currentGrade = sortedTiers[sortedTiers.length - 1];

        for (const tier of sortedTiers) {
            const meetsActiveDays = activityData.activeDays >= tier.requiredActiveDays;
            const meetsActivityScore = activityData.totalActivityScore >= tier.requiredActivityScore;
            const meetsStreak = activityData.currentStreak >= tier.requiredStreak;
            const meetsReferrals = activityData.referralsCount >= tier.requiredReferrals;

            if (meetsActiveDays && (meetsActivityScore || (meetsStreak && meetsReferrals))) {
                currentGrade = tier;
                break;
            }
        }

        // Find next tier
        const currentIndex = tiers.findIndex((t: any) => t.id === currentGrade.id);
        const nextTier = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;

        // Calculate progress to next tier
        let progress = 100;
        if (nextTier) {
            const daysProgress = Math.min(100, (activityData.activeDays / nextTier.requiredActiveDays) * 100);
            const scoreProgress = Math.min(100, (activityData.totalActivityScore / nextTier.requiredActivityScore) * 100);
            progress = Math.max(daysProgress, scoreProgress);
        }

        return {
            success: true,
            grade: currentGrade,
            nextGrade: nextTier,
            progress,
            activity: activityData,
            daysSinceJoin,
            allTiers: tiers,
        };
    } catch (error: any) {
        functions.logger.error('getUserGrade error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// Record Daily Activity (Call on app open)
export const recordDailyActivity = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();
    const { activityType, count = 1 } = request.data || {};

    try {
        // Get settings
        const settingsDoc = await db.doc('settings/gradeSystem').get();
        const scoreConfig = settingsDoc.exists ? settingsDoc.data()?.activityScores || DEFAULT_ACTIVITY_SCORES : DEFAULT_ACTIVITY_SCORES;

        const userRef = db.doc(`users/${uid}`);
        const userDoc = await userRef.get();
        const userData = userDoc.data() || {};

        const today = new Date().toISOString().split('T')[0];
        const lastActiveDate = userData.lastActiveAt?.toDate?.().toISOString().split('T')[0] || null;

        let updates: any = {
            lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        let scoreEarned = 0;
        let isNewDay = lastActiveDate !== today;

        // Handle daily check-in
        if (isNewDay) {
            // Increment active days
            updates.activeDays = admin.firestore.FieldValue.increment(1);
            scoreEarned += scoreConfig.dailyCheckIn;

            // Update streak
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastActiveDate === yesterdayStr) {
                // Consecutive day
                const newStreak = (userData.currentStreak || 0) + 1;
                updates.currentStreak = newStreak;
                if (newStreak > (userData.longestStreak || 0)) {
                    updates.longestStreak = newStreak;
                }
            } else {
                // Streak broken
                updates.currentStreak = 1;
            }

            // Reset daily counters
            updates.todayAdsWatched = 0;
            updates.todaySwipes = 0;
            updates.todaySurveyAnswers = 0;
            updates.todayPredictions = 0;
        }

        // Handle specific activity types
        if (activityType) {
            const todayKey = `today${activityType.charAt(0).toUpperCase() + activityType.slice(1)}`;
            const currentCount = userData[todayKey] || 0;

            switch (activityType) {
                case 'adWatch':
                    if (currentCount < scoreConfig.adWatchDailyMax / scoreConfig.adWatch) {
                        scoreEarned += scoreConfig.adWatch * count;
                        updates[todayKey] = admin.firestore.FieldValue.increment(count);
                    }
                    break;
                case 'swipe':
                    const swipeScore = Math.floor(count / 10) * scoreConfig.swipePer10;
                    if (currentCount < scoreConfig.swipeDailyMax) {
                        scoreEarned += Math.min(swipeScore, scoreConfig.swipeDailyMax - currentCount);
                    }
                    break;
                case 'prediction':
                    if (currentCount < 1) {
                        scoreEarned += scoreConfig.prediction;
                        updates[todayKey] = 1;
                    }
                    break;
                case 'survey':
                    if (currentCount < scoreConfig.surveyDailyMax / scoreConfig.surveyAnswer) {
                        scoreEarned += scoreConfig.surveyAnswer * count;
                        updates[todayKey] = admin.firestore.FieldValue.increment(count);
                    }
                    break;
                case 'referral':
                    scoreEarned += scoreConfig.referral * count;
                    break;
            }
        }

        // Update total activity score
        if (scoreEarned > 0) {
            updates.totalActivityScore = admin.firestore.FieldValue.increment(scoreEarned);
        }

        await userRef.update(updates);

        return {
            success: true,
            isNewDay,
            scoreEarned,
            message: isNewDay ? '출석 체크 완료!' : null,
        };
    } catch (error: any) {
        functions.logger.error('recordDailyActivity error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// Get Grade Settings (Admin)
export const getGradeSettings = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    // Check admin
    const email = request.auth.token.email || '';
    if (!ADMIN_EMAILS.includes(email)) {
        throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    const db = admin.firestore();

    try {
        const settingsDoc = await db.doc('settings/gradeSystem').get();

        if (settingsDoc.exists) {
            return { success: true, settings: settingsDoc.data() };
        } else {
            // Return defaults
            return {
                success: true,
                settings: {
                    tiers: DEFAULT_GRADE_TIERS,
                    activityScores: DEFAULT_ACTIVITY_SCORES,
                },
            };
        }
    } catch (error: any) {
        functions.logger.error('getGradeSettings error:', error);
        throw new HttpsError('internal', error.message);
    }
});

// Update Grade Settings (Admin)
export const updateGradeSettings = onCall({
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    // Check admin
    const email = request.auth.token.email || '';
    if (!ADMIN_EMAILS.includes(email)) {
        throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
    }

    const db = admin.firestore();
    const { tiers, activityScores } = request.data;

    try {
        await db.doc('settings/gradeSystem').set({
            tiers: tiers || DEFAULT_GRADE_TIERS,
            activityScores: activityScores || DEFAULT_ACTIVITY_SCORES,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: request.auth.uid,
        });

        return { success: true, message: '등급 설정이 업데이트되었습니다.' };
    } catch (error: any) {
        functions.logger.error('updateGradeSettings error:', error);
        throw new HttpsError('internal', error.message);
    }
});
