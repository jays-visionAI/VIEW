import { BTCGameRound, Mission, Transaction } from './types';

export const INITIAL_BALANCE = 1250;

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'Ad Reward', amount: 5, date: '오늘, 오전 10:23', description: '테크 데일리 시청' },
  { id: '2', type: 'Jackpot Entry', amount: -5, date: '어제', description: '제 849회차 응모' },
  { id: '3', type: 'Mission', amount: 20, date: '어제', description: '일일 출석 완료' },
];

export const MOCK_MISSIONS: Mission[] = [
  { id: 'm1', title: '광고 매니아', description: '오늘 광고 5개 시청하기', reward: 10, progress: 2, total: 5, completed: false, claimed: false },
  { id: 'm2', title: '로또 팬', description: '티켓 1장 업로드하기', reward: 15, progress: 1, total: 1, completed: true, claimed: false },
  { id: 'm3', title: '크립토 분석가', description: 'BTC 가격 예측 참여하기', reward: 5, progress: 0, total: 1, completed: false, claimed: false },
];

export const MOCK_BTC_ROUND: BTCGameRound = {
  id: 'round_294',
  endTime: '2023-10-27T23:59:59Z',
  pool: 50000,
  ranges: [
    { label: '< $65k', min: 0, max: 65000, participants: 120 },
    { label: '$65k - $67k', min: 65000, max: 67000, participants: 450 },
    { label: '$67k - $69k', min: 67000, max: 69000, participants: 310 },
    { label: '> $69k', min: 69000, max: 999999, participants: 85 },
  ]
};

export const MOCK_CAMPAIGNS = [
  { id: 1, title: '더블 보상 타임', subtitle: '모든 광고 시청 시 VIEW 2배 적립', color: 'bg-purple-600' },
  { id: 2, title: '잭팟 부스트', subtitle: '상금 풀 10,000 VIEW 추가', color: 'bg-blue-600' },
  { id: 3, title: '친구 초대 이벤트', subtitle: '친구 초대당 50 VIEW 지급', color: 'bg-emerald-600' },
];

// Recharts data
export const BTC_CHART_DATA = [
  { time: '00:00', price: 65400 },
  { time: '04:00', price: 65800 },
  { time: '08:00', price: 65200 },
  { time: '12:00', price: 66100 },
  { time: '16:00', price: 66500 },
  { time: '20:00', price: 66300 },
  { time: '현재', price: 66450 },
];