export interface UserProfile {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    createdAt: string;
    lastLogin: string;
    balance: number;
    claimableBalance: number; // Points that can be claimed as VIEW tokens
    totalClaimed: number; // Total VIEW tokens claimed on-chain
    walletAddress?: string; // Connected Web3 wallet address
    lastClaimTime?: Date; // Last claim timestamp for cooldown
    pendingClaims?: PendingClaim[]; // Pending claim records
    role: 'user' | 'admin';
}

export interface PendingClaim {
    nonce: string;
    amount: number;
    amountWei: string;
    address: string;
    chainId: number;
    expiry: number;
    createdAt: string;
    status: 'pending' | 'completed' | 'expired';
    txHash?: string;
    completedAt?: string;
}
