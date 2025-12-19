import React, { createContext, useContext, useState, ReactNode, PropsWithChildren, useEffect } from 'react';
import { Tab, UserState, Transaction, JackpotEntry, Mission, ToastMessage, Prediction } from '../types';
import { INITIAL_BALANCE, INITIAL_TRANSACTIONS, MOCK_MISSIONS } from '../constants';
import { adManager } from '../utils/AdManager';

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
  authLoading: boolean;
  isLoggedIn: boolean;
  loginAnonymously: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  submitPrediction: (coin: 'bitcoin' | 'ethereum', range: string, currentPrice: number, betAmount: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Home);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Local state that aggregates data from multiple Firestore listeners
  const [userState, setUserState] = useState<UserState>({
    balance: 0,
    claimableBalance: 0,
    totalClaimed: 0,
    staked: 0,
    pending: 0,
    invited: 0,
    todayEarnings: 0,
    tickets: [],
    lottoTickets: [],
    transactions: [],
    missions: MOCK_MISSIONS,
    predictions: [],
  });

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Toast helpers
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const [authLoading, setAuthLoading] = useState(true);

  // Firebase Auth & Data Listeners
  useEffect(() => {
    let unsubscribeAuth: () => void;
    let unsubscribeUserDoc: () => void;
    let unsubscribeTickets: () => void;
    let unsubscribeTransactions: () => void;
    let unsubscribePredictions: () => void;

    // Dynamically import to avoid breaking if firebase.ts has errors or isn't set up
    import('../firebase').then(async ({ auth, db }) => {
      if (!auth || !db) {
        console.warn("Firebase Auth or DB not initialized. Check firebase.ts config.");
        showToast("Firebase 설정이 필요합니다 (firebase.ts)", "error");
        setAuthLoading(false);
        return;
      }

      const { onAuthStateChanged } = await import('firebase/auth');
      const { doc, onSnapshot, setDoc, collection, query, orderBy, limit } = await import('firebase/firestore');

      // Auth Listener
      unsubscribeAuth = onAuthStateChanged(auth, async (user: any) => {
        if (user) {
          setCurrentUser(user);

          // 1. User Document Listener (Balance, Stats)
          const userRef = doc(db, 'users', user.uid);
          unsubscribeUserDoc = onSnapshot(userRef, async (docSnap: any) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              // Merging scalar data. Lists are handled by subcollection listeners below.
              setUserState(prev => ({
                ...prev,
                balance: data.balance ?? 0,
                claimableBalance: data.claimableBalance ?? 0,
                totalClaimed: data.totalClaimed ?? 0,
                staked: data.staked ?? 0,
                pending: data.pending ?? 0,
                invited: data.invited ?? 0,
                todayEarnings: data.todayEarnings ?? 0,
                // Missions are still arrays on the doc for now (simplification)
                missions: data.missions || MOCK_MISSIONS,
                displayName: data.displayName,
                photoURL: data.photoURL,
                uid: user.uid,

                // Referral system fields
                referralCode: data.referralCode,
                referrerL1: data.referrerL1,
                referrerL2: data.referrerL2,
                directReferrals: data.directReferrals ?? 0,
                indirectReferrals: data.indirectReferrals ?? 0,
                pendingReferralRewards: data.pendingReferralRewards ?? 0,
                paidReferralRewards: data.paidReferralRewards ?? 0,
                monthlyReferralRewards: data.monthlyReferralRewards ?? 0,

                // Daily tracking
                dailyAdWatchTime: data.dailyAdWatchTime ?? 0,
                dailyAdWatchDate: data.dailyAdWatchDate,
              }));

              // Sync Google Profile if needed
              if (user.displayName && data.displayName !== user.displayName) {
                await import('firebase/firestore').then(({ updateDoc }) => {
                  updateDoc(userRef, {
                    displayName: user.displayName,
                    photoURL: user.photoURL
                  }).catch(e => console.log("Profile sync error", e));
                });
              }
            } else {
              // Create new user document if it doesn't exist

              // Generate unique referral code (VIEW-XXXXXX)
              const generateReferralCode = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let code = 'VIEW-';
                for (let i = 0; i < 6; i++) {
                  code += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return code;
              };

              const referralCode = generateReferralCode();

              const initialData = {
                // Basic info
                balance: INITIAL_BALANCE,
                staked: 0,
                pending: 0,
                invited: 0,
                todayEarnings: 0,
                missions: MOCK_MISSIONS,
                displayName: user.displayName || 'Guest',
                photoURL: user.photoURL || '',
                uid: user.uid,
                createdAt: new Date().toISOString(),

                // Referral system fields
                referralCode: referralCode,
                referrerL1: null,       // Direct referrer (to be set via referral link)
                referrerL2: null,       // Referrer's referrer
                referredAt: null,
                directReferrals: 0,
                indirectReferrals: 0,

                // Referral rewards tracking
                pendingReferralRewards: 0,
                paidReferralRewards: 0,
                monthlyReferralRewards: 0,
                monthlyRewardResetDate: new Date().toISOString().slice(0, 7), // YYYY-MM format

                // Daily tracking for staking booster
                dailyAdWatchTime: 0,
                dailyAdWatchDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
              };
              await setDoc(userRef, initialData);
            }
            setAuthLoading(false);
          });

          // 2. Tickets Subcollection Listener
          const ticketsRef = collection(db, 'users', user.uid, 'tickets');
          const ticketsQuery = query(ticketsRef, orderBy('createdAt', 'desc'), limit(100));

          unsubscribeTickets = onSnapshot(ticketsQuery, (snapshot: any) => {
            const tickets: JackpotEntry[] = snapshot.docs.map((doc: any) => ({
              id: doc.id,
              ...doc.data()
            }));
            setUserState(prev => ({ ...prev, tickets }));
          });

          // 3. Transactions Subcollection Listener
          const txRef = collection(db, 'users', user.uid, 'transactions');
          // Limit to recent 50 for performance
          const txQuery = query(txRef, orderBy('createdAt', 'desc'), limit(50));

          unsubscribeTransactions = onSnapshot(txQuery, (snapshot: any) => {
            const transactions: Transaction[] = snapshot.docs.map((doc: any) => ({
              id: doc.id,
              ...doc.data()
            }));
            setUserState(prev => ({ ...prev, transactions }));
          });

          // 4. Predictions Subcollection Listener (Filter by Today client-side or simple limit)
          // For simplicity, we just fetch recent ones and filter invalid/old ones in UI or here.
          // Ideally, use a query for 'predictedAt' > start of day.
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);

          const predRef = collection(db, 'users', user.uid, 'predictions');
          const predQuery = query(predRef, orderBy('predictedAt', 'desc'), limit(20)); // Keep it light

          unsubscribePredictions = onSnapshot(predQuery, (snapshot: any) => {
            const predictions: Prediction[] = snapshot.docs.map((doc: any) => ({
              id: doc.id,
              ...doc.data()
            }));
            setUserState(prev => ({ ...prev, predictions }));
          });

        } else {
          // Logged out
          setCurrentUser(null);
          setUserState({
            balance: 0,
            staked: 0,
            pending: 0,
            invited: 0,
            todayEarnings: 0,
            tickets: [],
            transactions: [],
            missions: MOCK_MISSIONS,
            predictions: [],
          });
          setAuthLoading(false);
          if (unsubscribeUserDoc) unsubscribeUserDoc();
          if (unsubscribeTickets) unsubscribeTickets();
          if (unsubscribeTransactions) unsubscribeTransactions();
          if (unsubscribePredictions) unsubscribePredictions();
        }
      });
    }).catch(err => {
      console.warn("Firebase not configured yet.", err);
      setAuthLoading(false);
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribeTickets) unsubscribeTickets();
      if (unsubscribeTransactions) unsubscribeTransactions();
      if (unsubscribePredictions) unsubscribePredictions();
    };
  }, []);

  // Initialize AdManager
  useEffect(() => {
    adManager.initialize();
  }, []);

  const loginAnonymously = async () => {
    try {
      const { auth } = await import('../firebase');
      const { signInAnonymously } = await import('firebase/auth');
      await signInAnonymously(auth);
      showToast("게스트로 로그인되었습니다.");
    } catch (error) {
      console.error("Auth error:", error);
      showToast("로그인 실패", "error");
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { auth } = await import('../firebase');
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      showToast("Google 계정으로 로그인되었습니다.");
    } catch (error) {
      console.error("Auth error:", error);
      showToast("로그인 실패", "error");
    }
  };


  // --- Actions (Updated to use Subcollections) ---

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'date'>) => {
    if (!currentUser) return;

    // Optimistic / Local creation
    // (Actually we don't need optimistic update here because the listener is fast,
    //  but we could implement it if UI feels slow.)

    try {
      const { db } = await import('../firebase');
      const { doc, updateDoc, increment, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const userRef = doc(db, 'users', currentUser.uid);
      const txRef = collection(db, 'users', currentUser.uid, 'transactions');

      // 1. Add to subcollection
      await addDoc(txRef, {
        ...tx,
        date: '방금 전', // Keep string for UI display preference
        createdAt: serverTimestamp() // For sorting
      });

      // 2. Update balances (Atomic update)
      await updateDoc(userRef, {
        balance: increment(tx.amount),
        todayEarnings: tx.amount > 0 && tx.type === 'Ad Reward' ? increment(tx.amount) : increment(0),
      });

    } catch (e) {
      console.error(e);
      showToast("트랜잭션 저장 실패", "error");
    }
  };

  const registerTicket = async (numbers: number[], imageUrl: string) => {
    if (!currentUser) {
      showToast("로그인이 필요합니다.", "error");
      return;
    }
    const COST = 5;
    if (userState.balance < COST) {
      showToast("VIEW 잔액이 부족합니다!", "error");
      return;
    }

    try {
      const { db } = await import('../firebase');
      const { doc, updateDoc, increment, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const userRef = doc(db, 'users', currentUser.uid);
      const ticketsRef = collection(db, 'users', currentUser.uid, 'tickets');
      const txRef = collection(db, 'users', currentUser.uid, 'transactions');

      // 1. Add Ticket to subcollection
      await addDoc(ticketsRef, {
        numbers,
        drawDate: '이번 주 토요일',
        status: 'Registered',
        imageUrl,
        createdAt: serverTimestamp()
      });

      // 2. Add Transaction to subcollection
      await addDoc(txRef, {
        type: 'Jackpot Entry',
        amount: -COST,
        date: '방금 전',
        description: '잭팟 티켓 등록',
        createdAt: serverTimestamp()
      });

      // 3. Deduct Balance
      await updateDoc(userRef, {
        balance: increment(-COST),
      });

      showToast("티켓이 성공적으로 등록되었습니다!");
    } catch (e) {
      console.error(e);
      showToast("티켓 등록 실패", "error");
    }
  };

  const claimMission = async (id: string) => {
    if (!currentUser) return;
    const mission = userState.missions.find(m => m.id === id);
    if (!mission || mission.claimed) return;

    try {
      const { db } = await import('../firebase');
      const { doc, updateDoc, increment, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const userRef = doc(db, 'users', currentUser.uid);
      const txRef = collection(db, 'users', currentUser.uid, 'transactions');

      // Update local missions array logic remains similar because Missions is still an array on the doc
      const newMissions = userState.missions.map(m =>
        m.id === id ? { ...m, claimed: true } : m
      );

      // 1. Add Transaction
      await addDoc(txRef, {
        type: 'Mission',
        amount: mission.reward,
        date: '방금 전',
        description: `미션 완료: ${mission.title}`,
        createdAt: serverTimestamp()
      });

      // 2. Update User Doc
      await updateDoc(userRef, {
        balance: increment(mission.reward),
        missions: newMissions
      });

      showToast(`${mission.reward} VIEW를 획득했습니다!`);
    } catch (e) {
      console.error(e);
      showToast("미션 보상 수령 실패", "error");
    }
  };

  const completeAd = async () => {
    if (!currentUser) return;
    const tier = getCurrentTier(userState.staked);

    // 1. Prepare Targeting
    const targeting = {
      tier: tier.label,
      balance_segment: userState.balance > 10000 ? 'high' : 'normal',
      engagement: userState.invited > 5 ? 'high' : 'low'
    };

    try {
      showToast("광고를 준비 중입니다...");


      // 2. Load & Show Ad
      adManager.loadRewardedAd(targeting);
      const success = await adManager.showRewardedAd();

      if (!success) {
        showToast("광고를 완료하지 못했습니다.", "error");
        return;
      }

      // 3. Give Reward (Only if success)
      const baseReward = 5;
      const finalReward = baseReward * tier.multiplier;

      const { db } = await import('../firebase');
      const { doc, updateDoc, increment, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const userRef = doc(db, 'users', currentUser.uid);
      const txRef = collection(db, 'users', currentUser.uid, 'transactions');

      const newMissions = userState.missions.map(m =>
        m.id === 'm1' && !m.completed
          ? { ...m, progress: Math.min(m.progress + 1, m.total), completed: m.progress + 1 >= m.total }
          : m
      );

      // 3b. Add Transaction
      await addDoc(txRef, {
        type: 'Ad Reward',
        amount: finalReward,
        date: '방금 전',
        description: `광고 시청 (${tier.multiplier}x 보너스)`,
        createdAt: serverTimestamp()
      });

      // 3c. Update User Doc
      await updateDoc(userRef, {
        balance: increment(finalReward),
        todayEarnings: increment(finalReward),
        missions: newMissions
      });

      showToast(`${finalReward} VIEW가 지급되었습니다!`);

    } catch (e) {
      console.error(e);
      showToast("광고 보상 적립 실패", "error");
    }
  };

  const stake = async (amount: number) => {
    if (!currentUser) return;
    if (amount <= 0) return;
    if (userState.balance < amount) {
      showToast("스테이킹할 잔액이 부족합니다.", "error");
      return;
    }

    try {
      const { db } = await import('../firebase');
      const { doc, updateDoc, increment, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const userRef = doc(db, 'users', currentUser.uid);
      const txRef = collection(db, 'users', currentUser.uid, 'transactions');

      // 1. Add Transaction
      await addDoc(txRef, {
        type: 'Staking',
        amount: -amount,
        date: '방금 전',
        description: `VIEW 스테이킹`,
        createdAt: serverTimestamp()
      });

      // 2. Update User Doc
      await updateDoc(userRef, {
        balance: increment(-amount),
        staked: increment(amount)
      });

      showToast(`${amount.toLocaleString()} VIEW 스테이킹 완료`);
    } catch (e) {
      console.error(e);
      showToast("스테이킹 실패", "error");
    }
  };

  const unstake = async (amount: number) => {
    if (!currentUser) return;
    if (amount <= 0) return;
    if (userState.staked < amount) {
      showToast("언스테이킹할 수량이 부족합니다.", "error");
      return;
    }

    try {
      const { db } = await import('../firebase');
      const { doc, updateDoc, increment, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const userRef = doc(db, 'users', currentUser.uid);
      const txRef = collection(db, 'users', currentUser.uid, 'transactions');

      // 1. Add Transaction
      await addDoc(txRef, {
        type: 'Unstaking',
        amount: amount,
        date: '방금 전',
        description: `VIEW 언스테이킹`,
        createdAt: serverTimestamp()
      });

      // 2. Update User Doc
      await updateDoc(userRef, {
        balance: increment(amount),
        staked: increment(-amount)
      });

      showToast(`${amount.toLocaleString()} VIEW 언스테이킹 완료`);
    } catch (e) {
      console.error(e);
      showToast("언스테이킹 실패", "error");
    }
  };

  const inviteFriend = () => {
    navigator.clipboard.writeText(`https://view.app/invite/${currentUser?.uid || 'guest'}`);
    showToast("초대 링크가 복사되었습니다!");
  };

  const logout = async () => {
    try {
      const { auth } = await import('../firebase');
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
      setCurrentUser(null);
      // Reset to empty/initial state
      setUserState({
        balance: 0,
        staked: 0,
        pending: 0,
        invited: 0,
        todayEarnings: 0,
        tickets: [],
        transactions: [],
        missions: MOCK_MISSIONS.map(m => ({ ...m, completed: false, claimed: false, progress: 0 }))
      });
      setActiveTab(Tab.Home);
      showToast("로그아웃 되었습니다.", "info");
    } catch (e) {
      console.error(e);
    }
  };

  const submitPrediction = async (coin: 'bitcoin' | 'ethereum', range: string, currentPrice: number, betAmount: number, predictedPrice: number) => {
    if (!currentUser) {
      showToast("로그인이 필요합니다.", "error");
      return;
    }

    if (betAmount <= 0) {
      showToast("베팅 금액을 입력해주세요.", "error");
      return;
    }

    if (userState.balance < betAmount) {
      showToast("VIEW 잔액이 부족합니다!", "error");
      return;
    }

    // Check if already predicted today for this coin
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check locally from userState.predictions (which satisfies "once a day")
    // Note: serverTimestamp() in Firestore might be slightly different but safe enough for this rule
    const hasPredicted = userState.predictions.some(p => {
      const pDate = p.predictedAt?.toDate ? p.predictedAt.toDate() : new Date(p.predictedAt); // Handle Firestore Timestamp
      return p.coin === coin && pDate >= today;
    });

    if (hasPredicted) {
      showToast(`이미 오늘 ${coin === 'bitcoin' ? 'BTC' : 'ETH'} 예측에 참여하셨습니다.`, "error");
      return;
    }

    try {
      const { db } = await import('../firebase');
      const { doc, updateDoc, increment, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const userRef = doc(db, 'users', currentUser.uid);
      const txRef = collection(db, 'users', currentUser.uid, 'transactions');
      const predRef = collection(db, 'users', currentUser.uid, 'predictions');

      // 1. Add Prediction
      await addDoc(predRef, {
        coin,
        range,
        strikePrice: currentPrice,
        betAmount,
        predictedPrice,
        predictedAt: serverTimestamp(),
        status: 'Pending'
      });

      // 2. Add Transaction
      await addDoc(txRef, {
        type: 'BTC Game',
        amount: -betAmount,
        date: '방금 전',
        description: `${coin === 'bitcoin' ? 'BTC' : 'ETH'} 예측 참여 (${betAmount} VIEW)`,
        createdAt: serverTimestamp()
      });

      // 3. Deduct Balance
      await updateDoc(userRef, {
        balance: increment(-betAmount),
      });

      showToast("예측이 제출되었습니다! 행운을 빕니다.");

    } catch (e) {
      console.error(e);
      showToast("예측 제출 실패", "error");
    }
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
      logout,
      authLoading,
      isLoggedIn: !!currentUser,
      loginAnonymously,
      loginWithGoogle,
      submitPrediction
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