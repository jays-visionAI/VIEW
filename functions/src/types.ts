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

// ============================================
// Taxonomy Types
// ============================================
export interface IndustryTaxonomy {
    version: string;
    type: 'industry';
    lastUpdated: string;
    taxonomy: Record<string, Record<string, string[]>>;
}

export interface AttributeTaxonomy {
    version: string;
    type: 'attributes';
    lastUpdated: string;
    attributes: Record<string, {
        description: string;
        values: string[];
    }>;
}

// ============================================
// Audience Types
// ============================================
export interface Audience {
    id?: string;
    advertiserId: string;
    name: string;

    // Industry targeting (What is being sold)
    industryPaths: string[];  // e.g., ["Fashion.Apparel.Womenswear"]

    // Attribute filtering (How it's being sold)
    attributes: Record<string, string[]>;  // e.g., { Price_Positioning: ["Premium"] }

    // Consumer trait ranges
    targetTraits: Record<string, [number, number]>;  // e.g., { priceVsBrand: [0.3, 0.7] }

    // Geographic targeting
    regions: string[];

    // Estimates
    estimatedReach: number;

    status: 'active' | 'archived';
    createdAt: any;
    updatedAt: any;
}

// ============================================
// Campaign Types (Extended)
// ============================================
export interface Campaign {
    id?: string;
    advertiserId: string;
    name: string;
    objective: 'awareness' | 'conversion';

    // Industry targeting
    industryPaths: string[];

    // Attribute targeting (NEW)
    attributes: Record<string, string[]>;

    // Target audience reference (optional)
    audienceId?: string;

    // Creative assets
    creativeHeadline: string;
    creativeDescription?: string;
    creativeImageUrl?: string;
    creativeVideoUrl?: string;
    destinationUrl: string;

    // Budget
    dailyBudget: number;
    totalBudget?: number;
    spentBudget: number;

    // Metrics
    impressions: number;
    clicks: number;
    conversions: number;

    // Status
    status: 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
    startDate?: any;
    endDate?: any;

    createdAt: any;
    updatedAt: any;
}

// ============================================
// User Persona Types (Extended)
// ============================================
export interface UserPersona {
    // Basic 10 traits (0-1 scale)
    traits: {
        priceVsBrand: number;
        impulseBuying: number;
        earlyAdopter: number;
        onlinePreference: number;
        purchasingPower: number;
        brandLoyalty: number;
        socialInfluence: number;
        sustainabilityValue: number;
        experienceSeeker: number;
        planningHorizon: number;
    };

    // Attribute affinity scores (NEW)
    attributeScores: Record<string, number>;  // e.g., { "Price_Positioning.Premium": 0.8 }

    // Top attributes for quick filtering
    topAttributes: string[];

    // Industry affinity (based on activity)
    industryAffinity: string[];  // e.g., ["Fashion.Apparel", "Beauty.Skincare"]

    // Persona cards
    personaCards: string[];

    // Metadata
    traitsUpdatedAt: any;
    attributeScoresUpdatedAt: any;
}

// ============================================
// Prediction Types
// ============================================
export interface Prediction {
    id?: string;
    uid: string;
    minPrice: number;
    maxPrice: number;
    exactPrice?: number;
    betAmount: number;
    timestamp: any;
    roundId?: string;
    actualPrice?: number;
    result?: 'pending' | 'won' | 'lost';
    winAmount?: number;
    isJackpotWinner?: boolean;
}
