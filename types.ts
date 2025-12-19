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

// ============================================
// 로또 시스템 - 5게임 지원 구조
// ============================================

export interface LottoGame {
  gameNo: number;              // 게임 번호 (1~5, A~E에 해당)
  numbers: number[];           // 6개 번호 (1~45)
  status: 'pending' | 'won' | 'lost';
  matchCount?: number;         // 몇 개 일치
  bonusMatch?: boolean;        // 보너스 번호 일치 여부
  rank?: number;               // 등위 (1~5등, 0=미당첨)
  prize?: number;              // 당첨금
}

export interface LottoTicket {
  id: string;
  ticketId: string;            // 티켓 고유번호 (자동생성)
  drawRound: number;           // 로또 회차
  drawDate: string;            // 추첨일 (YYYY-MM-DD)
  games: LottoGame[];          // 1~5개 게임
  status: 'pending' | 'checked' | 'won' | 'lost';
  registeredAt: any;           // Firestore Timestamp
  cost: number;                // 등록 비용 (VIEW)
  totalPrize?: number;         // 총 당첨금
}

export interface LottoRound {
  roundNumber: number;         // 회차 번호
  drawDate: string;            // 추첨일
  winningNumbers: number[];    // 당첨 번호 6개
  bonusNumber: number;         // 보너스 번호
  status: 'pending' | 'drawn' | 'announced' | 'distributed';
  prizePool: {
    total: number;
    rank1: number;
    rank2: number;
    rank3: number;
    rank4: number;
    rank5: number;
  };
  participantCount: number;
  winners: {
    rank1: number;
    rank2: number;
    rank3: number;
    rank4: number;
    rank5: number;
  };
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
  predictedPrice?: number;
  betAmount?: number;
  predictedAt: any; // Firestore Timestamp
  status: 'Pending' | 'Won' | 'Lost';
  reward?: number;
  rangeWon?: boolean;
  jackpotWon?: boolean;
  roundId?: number;
  actualPrice?: number;
}

export interface PredictionRound {
  id?: string;
  roundId?: number;
  date: string;
  status: 'open' | 'closed' | 'settled';
  actualPrice?: number;
  winningRange?: string;

  totalPool: number;
  winnerPool?: number;
  jackpotPool?: number;
  platformPool?: number;

  participantCount: number;
  totalWinners: number;
  totalDistributed: number;
  winnerPoolPercent: number;

  jackpotCarriedOver?: number;
  totalJackpotPayout?: number;
  nextJackpotAmount?: number;

  winners?: {
    userId: string;
    displayName: string;
    betAmount: number;
    reward: number;
    isJackpot?: boolean;
  }[];
}

export interface UserState {
  balance: number;
  claimableBalance: number; // VIEW tokens available to claim on-chain
  totalClaimed: number; // Total VIEW tokens claimed on-chain
  staked: number;    // Added
  pending: number;   // Added
  invited: number;   // Added
  todayEarnings: number;
  tickets: JackpotEntry[];  // Legacy - BTC Jackpot용
  lottoTickets: LottoTicket[];  // 새 로또 시스템용
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