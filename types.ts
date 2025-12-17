export enum Tab {
  Home = 'Home',
  Ad = 'Ad',
  Jackpot = 'Jackpot',
  Reward = 'Reward',
  Profile = 'Profile'
}

export interface Transaction {
  id: string;
  type: 'Ad Reward' | 'Jackpot Entry' | 'Jackpot Win' | 'BTC Game' | 'Mission' | 'Referral' | 'Staking' | 'Unstaking';
  amount: number;
  date: string;
  description: string;
}

export interface JackpotEntry {
  id: string;
  numbers: number[];
  drawDate: string;
  status: 'Processing' | 'Registered' | 'Won' | 'Lost';
  imageUrl: string;
  potentialReward?: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress: number;
  total: number;
  completed: boolean;
  claimed: boolean;
}

export interface BTCGameRound {
  id: string;
  endTime: string;
  pool: number;
  ranges: {
    label: string;
    min: number;
    max: number;
    participants: number;
  }[];
}


export interface Prediction {
  id: string;
  coin: 'bitcoin' | 'ethereum';
  range: string;
  predictedAt: any; // Firestore Timestamp
  status: 'Pending' | 'Won' | 'Lost';
}

export interface UserState {
  balance: number;
  claimableBalance: number; // VIEW tokens available to claim on-chain
  totalClaimed: number; // Total VIEW tokens claimed on-chain
  staked: number;    // Added
  pending: number;   // Added
  invited: number;   // Added
  todayEarnings: number;
  tickets: JackpotEntry[];
  transactions: Transaction[];
  missions: Mission[];
  predictions: Prediction[];
  displayName?: string; // Added from Google Auth
  photoURL?: string;    // Added from Google Auth
  uid?: string;         // Added

  // Referral System
  referralCode?: string;          // User's unique referral code (VIEW-XXXXXX)
  referrerL1?: string | null;     // Direct referrer UID
  referrerL2?: string | null;     // Referrer's referrer UID
  directReferrals?: number;       // Count of direct referrals
  indirectReferrals?: number;     // Count of indirect referrals (L2)
  pendingReferralRewards?: number;
  paidReferralRewards?: number;
  monthlyReferralRewards?: number;

  // Daily tracking for staking booster
  dailyAdWatchTime?: number;      // Seconds watched today
  dailyAdWatchDate?: string;      // YYYY-MM-DD

  adProfile?: {
    lastAdWatchTime?: any; // Firestore Timestamp or Date
    watchCount: number;
    segment?: 'high_value' | 'regular' | 'new'; // Inferred from balance/staking
  };
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}