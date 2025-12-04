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

export interface UserState {
  balance: number;
  staked: number;    // Added
  pending: number;   // Added
  invited: number;   // Added
  todayEarnings: number;
  tickets: JackpotEntry[];
  transactions: Transaction[];
  missions: Mission[];
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}