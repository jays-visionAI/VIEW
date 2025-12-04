import React, { createContext, useContext, useState, ReactNode, PropsWithChildren, useEffect } from 'react';
import { Tab, UserState, Transaction, JackpotEntry, Mission, ToastMessage } from '../types';
import { INITIAL_BALANCE, INITIAL_TRANSACTIONS, MOCK_MISSIONS } from '../constants';

// Staking Configuration
export const STAKING_TIERS = [
  { threshold: 0, multiplier: 1.0, label: 'Bronze', color: 'bg-orange-700' },
  { threshold: 1000, multiplier: 1.2, label: 'Silver', color: 'bg-gray-400' },
  { threshold: 5000, multiplier: 1.5, label: 'Gold', color: 'bg-yellow-500' },
  { threshold: 10000, multiplier: 2.0, label: 'Platinum', color: 'bg-cyan-500' },
];

export const getCurrentTier = (staked: number) => {
  return [...STAKING_TIERS].reverse().find(t => staked >= t.threshold) || STAKING_TIERS[0];
};

interface AppContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  userState: UserState;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'date'>) => void;
  registerTicket: (numbers: number[], imageUrl: string) => void;
  claimMission: (id: string) => void;
  completeAd: () => void;
  stake: (amount: number) => void;
  unstake: (amount: number) => void;
  inviteFriend: () => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Home);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [userState, setUserState] = useState<UserState>({
    balance: INITIAL_BALANCE,
    staked: 1000.00,
    pending: 15.20,
    invited: 3,
    todayEarnings: 15,
    tickets: [],
    transactions: INITIAL_TRANSACTIONS,
    missions: MOCK_MISSIONS
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'date'>) => {
    const newTx: Transaction = {
      ...tx,
      id: Math.random().toString(36).substr(2, 9),
      date: '방금 전' // Localized "Just now"
    };

    setUserState(prev => ({
      ...prev,
      balance: prev.balance + tx.amount,
      todayEarnings: tx.amount > 0 && tx.type === 'Ad Reward' ? prev.todayEarnings + tx.amount : prev.todayEarnings,
      transactions: [newTx, ...prev.transactions]
    }));
  };

  const registerTicket = (numbers: number[], imageUrl: string) => {
    const COST = 5;
    if (userState.balance < COST) {
      showToast("VIEW 잔액이 부족합니다!", "error");
      return;
    }

    addTransaction({
      type: 'Jackpot Entry',
      amount: -COST,
      description: '잭팟 티켓 등록'
    });

    const newTicket: JackpotEntry = {
      id: Math.random().toString(36).substr(2, 9),
      numbers,
      drawDate: '이번 주 토요일',
      status: 'Registered',
      imageUrl
    };

    setUserState(prev => ({
      ...prev,
      tickets: [newTicket, ...prev.tickets]
    }));
    
    showToast("티켓이 성공적으로 등록되었습니다!");
  };

  const claimMission = (id: string) => {
    const mission = userState.missions.find(m => m.id === id);
    if (!mission || mission.claimed) return;

    addTransaction({
      type: 'Mission',
      amount: mission.reward,
      description: `미션 완료: ${mission.title}`
    });

    setUserState(prev => ({
      ...prev,
      missions: prev.missions.map(m => 
        m.id === id ? { ...m, claimed: true } : m
      )
    }));
    
    showToast(`${mission.reward} VIEW를 획득했습니다!`);
  };

  const completeAd = () => {
    const tier = getCurrentTier(userState.staked);
    const baseReward = 5;
    const finalReward = baseReward * tier.multiplier;

    addTransaction({
      type: 'Ad Reward',
      amount: finalReward,
      description: `광고 시청 (${tier.multiplier}x 보너스)`
    });
    
    // Increment progress of Ad mission if exists
    setUserState(prev => ({
      ...prev,
      missions: prev.missions.map(m => 
        m.id === 'm1' && !m.completed 
          ? { ...m, progress: Math.min(m.progress + 1, m.total), completed: m.progress + 1 >= m.total } 
          : m
      )
    }));
  };

  const stake = (amount: number) => {
    if (amount <= 0) return;
    if (userState.balance < amount) {
      showToast("스테이킹할 잔액이 부족합니다.", "error");
      return;
    }

    setUserState(prev => ({
      ...prev,
      balance: prev.balance - amount,
      staked: prev.staked + amount
    }));

    addTransaction({
      type: 'Staking',
      amount: -amount,
      description: `VIEW 스테이킹`
    });
    
    showToast(`${amount.toLocaleString()} VIEW 스테이킹 완료`);
  };

  const unstake = (amount: number) => {
    if (amount <= 0) return;
    if (userState.staked < amount) {
      showToast("언스테이킹할 수량이 부족합니다.", "error");
      return;
    }

    setUserState(prev => ({
      ...prev,
      balance: prev.balance + amount,
      staked: prev.staked - amount
    }));

    addTransaction({
      type: 'Unstaking',
      amount: amount,
      description: `VIEW 언스테이킹`
    });
    
    showToast(`${amount.toLocaleString()} VIEW 언스테이킹 완료`);
  };

  const inviteFriend = () => {
    // Simulate copying link
    navigator.clipboard.writeText(`https://view.app/invite/${Math.random().toString(36).substr(2, 6)}`);
    showToast("초대 링크가 복사되었습니다!");
  };

  const logout = () => {
    // Reset state to initial mock
    setUserState({
      balance: 0,
      staked: 0,
      pending: 0,
      invited: 0,
      todayEarnings: 0,
      tickets: [],
      transactions: [],
      missions: MOCK_MISSIONS.map(m => ({...m, completed: false, claimed: false, progress: 0}))
    });
    setActiveTab(Tab.Home);
    showToast("로그아웃 되었습니다.", "info");
  };

  return (
    <AppContext.Provider value={{ 
      activeTab, 
      setActiveTab, 
      userState, 
      toasts,
      showToast,
      removeToast,
      addTransaction, 
      registerTicket, 
      claimMission,
      completeAd,
      stake,
      unstake,
      inviteFriend,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};