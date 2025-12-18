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
// 분류 체계(Taxonomy) 데이터를 Firestore에 업로드
// ============================================
export const uploadTaxonomy = onCall({
    cors: true,
}, async (request) => {
    // 관리자 권한 확인
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    // Admin check - using global ADMIN_EMAILS
    const userEmail = request.auth.token.email;

    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
        throw new HttpsError("permission-denied", "관리자만 접근 가능합니다.");
    }

    const db = admin.firestore();

    // VIEW Advertising Taxonomy v1.0
    const taxonomyData = {
        version: "1.0",
        lastUpdated: "2025-11-06",
        maintainer: "VIEW Protocol – CODEX Advertising Intelligence",

        industries: {
            Fashion: {
                displayName: "패션", icon: "👗",
                products: {
                    Apparel: { displayName: "의류", subcategories: ["Menswear", "Womenswear", "Sportswear", "Outdoorwear", "Uniforms", "Kidswear"] },
                    Footwear: { displayName: "신발", subcategories: ["Sneakers", "Sandals", "Boots", "High Heels", "Slippers"] },
                    Accessories: { displayName: "액세서리", subcategories: ["Bags", "Watches", "Jewelry", "Belts", "Glasses", "Hats"] }
                }
            },
            Beauty: {
                displayName: "뷰티", icon: "💄",
                products: {
                    Skincare: { displayName: "스킨케어", subcategories: ["Anti-aging", "Whitening", "Moisturizing", "Sunscreen", "Acne-care", "Serum", "Toner"] },
                    Makeup: { displayName: "메이크업", subcategories: ["Lipstick", "Foundation", "Mascara", "Eyeliner", "Blusher"] },
                    Haircare: { displayName: "헤어케어", subcategories: ["Shampoo", "Conditioner", "Treatment", "Styling"] },
                    Fragrance: { displayName: "향수", subcategories: ["Perfume", "Body Mist"] }
                }
            },
            Food_Beverage: {
                displayName: "식음료", icon: "🍔",
                products: {
                    Restaurant: { displayName: "레스토랑", subcategories: ["Fine Dining", "Casual Dining", "Fast Food", "Franchise Chain"] },
                    Beverage: { displayName: "음료", subcategories: ["Coffee", "Tea", "Juice", "Alcohol", "Energy Drink"] },
                    Grocery: { displayName: "식료품", subcategories: ["Organic Food", "Snack", "Frozen Food", "Dairy Product", "Fresh Produce"] },
                    Delivery_Service: { displayName: "배달서비스", subcategories: ["Meal Kit", "Food Delivery Platform"] }
                }
            },
            Travel: {
                displayName: "여행", icon: "✈️",
                products: {
                    Airline: { displayName: "항공사", subcategories: ["Budget", "Full Service", "Charter", "Regional"] },
                    Hotel: { displayName: "호텔", subcategories: ["Luxury", "Resort", "Boutique", "Business", "Capsule"] },
                    Tour: { displayName: "투어", subcategories: ["Honeymoon", "Cultural", "Adventure", "Wellness", "Eco-Tourism"] },
                    Transportation: { displayName: "교통", subcategories: ["Train", "Bus", "Car Rental", "Cruise"] }
                }
            },
            Finance: {
                displayName: "금융", icon: "💰",
                products: {
                    Banking: { displayName: "은행", subcategories: ["Savings Account", "Loan", "Credit Card", "Payment App"] },
                    Investment: { displayName: "투자", subcategories: ["Stocks", "ETF", "Crypto", "Real Estate Fund", "Bonds"] },
                    Insurance: { displayName: "보험", subcategories: ["Life", "Health", "Car", "Travel", "Property"] },
                    Fintech: { displayName: "핀테크", subcategories: ["Digital Wallet", "Robo Advisor", "DeFi", "P2P Lending"] }
                }
            },
            Technology: {
                displayName: "기술", icon: "📱",
                products: {
                    Consumer_Electronics: { displayName: "가전", subcategories: ["Smartphone", "Laptop", "Tablet", "Smartwatch", "Headphones"] },
                    Software: { displayName: "소프트웨어", subcategories: ["Productivity", "Security", "Cloud Service", "AI Application"] },
                    Hardware: { displayName: "하드웨어", subcategories: ["Semiconductor", "IoT Device", "3D Printer"] },
                    Gaming: { displayName: "게임", subcategories: ["Console", "PC Game", "Mobile Game", "VR/AR"] }
                }
            },
            Education: {
                displayName: "교육", icon: "📚",
                products: {
                    Online_Course: { displayName: "온라인강의", subcategories: ["Language", "Programming", "Business", "Design", "Music"] },
                    Institution: { displayName: "교육기관", subcategories: ["University", "College", "Vocational School", "Tutoring Center"] },
                    Certification: { displayName: "자격증", subcategories: ["MBA", "TOEFL", "IELTS", "Blockchain Certification", "AI Engineer"] }
                }
            },
            Health_Wellness: {
                displayName: "건강/웰니스", icon: "💪",
                products: {
                    Fitness: { displayName: "피트니스", subcategories: ["Gym", "Yoga", "Pilates", "Home Training"] },
                    Nutrition: { displayName: "영양", subcategories: ["Supplements", "Vitamins", "Protein", "Health Drinks"] },
                    Medical_Service: { displayName: "의료서비스", subcategories: ["Clinic", "Dental", "Dermatology", "Aesthetic", "Telemedicine"] },
                    Mental_Health: { displayName: "정신건강", subcategories: ["Meditation", "Counseling", "Sleep Aid Apps"] }
                }
            },
            Auto_Mobility: {
                displayName: "자동차/모빌리티", icon: "🚗",
                products: {
                    Vehicle: { displayName: "차량", subcategories: ["Electric Vehicle", "SUV", "Sedan", "Motorcycle", "Used Car"] },
                    Service: { displayName: "서비스", subcategories: ["Ride Sharing", "Car Sharing", "Maintenance", "Charging Station"] },
                    Accessories: { displayName: "액세서리", subcategories: ["Tire", "Battery", "Navigation", "Dashcam"] }
                }
            },
            Home_Living: {
                displayName: "홈/리빙", icon: "🏠",
                products: {
                    Furniture: { displayName: "가구", subcategories: ["Sofa", "Bed", "Table", "Lighting"] },
                    Interior: { displayName: "인테리어", subcategories: ["Wallpaper", "Flooring", "Smart Home", "Home Decor"] },
                    Appliances: { displayName: "가전제품", subcategories: ["Refrigerator", "Washing Machine", "Air Conditioner", "Vacuum"] },
                    Real_Estate: { displayName: "부동산", subcategories: ["Apartment", "Villa", "Commercial", "Rental Service"] }
                }
            },
            Entertainment: {
                displayName: "엔터테인먼트", icon: "🎬",
                products: {
                    Streaming: { displayName: "스트리밍", subcategories: ["OTT", "Music", "Podcast", "Webtoon"] },
                    Event: { displayName: "이벤트", subcategories: ["Concert", "Exhibition", "Festival"] },
                    Media: { displayName: "미디어", subcategories: ["TV Channel", "Influencer", "Magazine"] },
                    Sports: { displayName: "스포츠", subcategories: ["Football", "Golf", "eSports", "Fitness Challenge"] }
                }
            },
            ESG_Sustainability: {
                displayName: "ESG/지속가능성", icon: "🌱",
                products: {
                    Environment: { displayName: "환경", subcategories: ["Carbon Offset", "Recycling", "Clean Energy"] },
                    Governance: { displayName: "거버넌스", subcategories: ["CSR Program", "ESG Fund"] },
                    Social: { displayName: "사회", subcategories: ["Donation Platform", "Ethical Brand", "Volunteer Organization"] }
                }
            }
        }
    };

    try {
        await db.doc("taxonomy/v1").set(taxonomyData);

        functions.logger.info("Taxonomy uploaded successfully");

        return {
            success: true,
            message: "분류 체계가 성공적으로 업로드되었습니다.",
            stats: {
                industries: Object.keys(taxonomyData.industries).length,
                version: taxonomyData.version
            }
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
        // 설문 정의 조회
        const surveysSnap = await db.collection("surveys").orderBy("order").get();
        const surveys = surveysSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

        // 3. 특성 점수 계산 (0-1 scale)
        const traits = {
            priceVsBrand: 0.5,
            impulseBuying: 0.5,
            earlyAdopter: 0.5,
            onlinePreference: 0.5,
            purchasingPower: 0.5,
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

        // 5. 페르소나 카드 부여
        const cards: any[] = [];

        if (traits.earlyAdopter > 0.7 && (taxonomyScores['Technology'] || 0) > 0.3) {
            cards.push({
                id: 'tech_early_adopter',
                name: '테크 얼리어답터',
                level: Math.round(traits.earlyAdopter * 10),
                icon: '🚀',
                earnedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        if (traits.purchasingPower > 0.7 && traits.priceVsBrand > 0.6) {
            cards.push({
                id: 'premium_consumer',
                name: '프리미엄 컨슈머',
                level: Math.round(traits.purchasingPower * 10),
                icon: '💎',
                earnedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        if (traits.priceVsBrand < 0.3) {
            cards.push({
                id: 'smart_shopper',
                name: '가성비 헌터',
                level: Math.round((1 - traits.priceVsBrand) * 10),
                icon: '🎯',
                earnedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        if (traits.onlinePreference > 0.8) {
            cards.push({
                id: 'digital_native',
                name: '디지털 네이티브',
                level: Math.round(traits.onlinePreference * 10),
                icon: '📱',
                earnedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        if ((taxonomyScores['Travel'] || 0) > 0.5) {
            cards.push({
                id: 'travel_lover',
                name: '여행 러버',
                level: Math.round((taxonomyScores['Travel'] || 0.5) * 10),
                icon: '✈️',
                earnedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        // 기본 카드 (아무것도 없을 때)
        if (cards.length === 0) {
            cards.push({
                id: 'rising_star',
                name: '라이징 스타',
                level: 1,
                icon: '⭐',
                earnedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        // 6. 데이터 가치 계산 (월 예상 수익, 원)
        const completionRate = Object.keys(responses).length / 6;
        const activityCount = activities.length;
        const dataValue = Math.round((completionRate * 3000) + (activityCount * 10) + (cards.length * 500));

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
        const personaDoc = await db.doc(`users/${uid}/persona/current`).get();

        if (!personaDoc.exists) {
            return {
                success: true,
                persona: null,
                needsCalculation: true,
            };
        }

        return {
            success: true,
            persona: personaDoc.data(),
            needsCalculation: false,
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
