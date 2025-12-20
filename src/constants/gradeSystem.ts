/**
 * Grade System Configuration
 * 등급 시스템 설정 - Admin에서 수정 가능한 기본값
 */

export interface GradeTier {
    id: string;
    name: string;
    nameKo: string;
    icon: string;
    color: string;
    bgColor: string;

    // 조건 (OR 관계)
    requiredActiveDays: number;      // 필수 활성 사용 일수
    requiredActivityScore: number;   // 필수 누적 활동 점수
    requiredStreak: number;          // 필수 연속 출석일
    requiredReferrals: number;       // 필수 추천인 수

    // 혜택
    vpMultiplier: number;            // VP 보상 배수
    stakingBoost: number;            // 스테이킹 부스트 (%)
    referralBonus: number;           // 추천 보상 추가 (%)
}

export interface ActivityScoreConfig {
    dailyCheckIn: number;            // 출석 체크
    adWatch: number;                 // 광고 시청 (개당)
    adWatchDailyMax: number;         // 광고 시청 일일 최대
    swipePer10: number;              // 스와이프 10회당
    swipeDailyMax: number;           // 스와이프 일일 최대
    prediction: number;              // 가격 예측 참여
    surveyAnswer: number;            // 설문 응답 (문항당)
    surveyDailyMax: number;          // 설문 일일 최대
    referral: number;                // 추천인 유치
}

export interface GradeSystemConfig {
    tiers: GradeTier[];
    activityScores: ActivityScoreConfig;
    updatedAt?: any;
}

// 기본값 (Firestore에 없을 때 사용)
export const DEFAULT_GRADE_TIERS: GradeTier[] = [
    {
        id: 'bronze',
        name: 'Bronze',
        nameKo: '브론즈',
        icon: '🥉',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
        requiredActiveDays: 0,
        requiredActivityScore: 0,
        requiredStreak: 0,
        requiredReferrals: 0,
        vpMultiplier: 1.0,
        stakingBoost: 0,
        referralBonus: 0,
    },
    {
        id: 'silver',
        name: 'Silver',
        nameKo: '실버',
        icon: '🥈',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        requiredActiveDays: 7,
        requiredActivityScore: 500,
        requiredStreak: 3,
        requiredReferrals: 0,
        vpMultiplier: 1.1,
        stakingBoost: 5,
        referralBonus: 5,
    },
    {
        id: 'gold',
        name: 'Gold',
        nameKo: '골드',
        icon: '🥇',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        requiredActiveDays: 30,
        requiredActivityScore: 2000,
        requiredStreak: 7,
        requiredReferrals: 0,
        vpMultiplier: 1.2,
        stakingBoost: 10,
        referralBonus: 10,
    },
    {
        id: 'platinum',
        name: 'Platinum',
        nameKo: '플래티넘',
        icon: '💎',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100',
        requiredActiveDays: 90,
        requiredActivityScore: 8000,
        requiredStreak: 14,
        requiredReferrals: 2,
        vpMultiplier: 1.3,
        stakingBoost: 15,
        referralBonus: 15,
    },
    {
        id: 'diamond',
        name: 'Diamond',
        nameKo: '다이아몬드',
        icon: '👑',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        requiredActiveDays: 180,
        requiredActivityScore: 20000,
        requiredStreak: 30,
        requiredReferrals: 5,
        vpMultiplier: 1.5,
        stakingBoost: 25,
        referralBonus: 25,
    },
];

export const DEFAULT_ACTIVITY_SCORES: ActivityScoreConfig = {
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

export const DEFAULT_GRADE_SYSTEM: GradeSystemConfig = {
    tiers: DEFAULT_GRADE_TIERS,
    activityScores: DEFAULT_ACTIVITY_SCORES,
};

// Helper: 등급 계산
export function calculateGrade(
    userData: {
        activeDays: number;
        totalActivityScore: number;
        currentStreak: number;
        referralsCount: number;
    },
    tiers: GradeTier[]
): GradeTier {
    // 역순으로 검사 (Diamond → Bronze)
    const sortedTiers = [...tiers].sort((a, b) => b.requiredActiveDays - a.requiredActiveDays);

    for (const tier of sortedTiers) {
        // 모든 조건 충족 시 해당 등급
        const meetsActiveDays = userData.activeDays >= tier.requiredActiveDays;
        const meetsActivityScore = userData.totalActivityScore >= tier.requiredActivityScore;
        const meetsStreak = userData.currentStreak >= tier.requiredStreak;
        const meetsReferrals = userData.referralsCount >= tier.requiredReferrals;

        // 활성 사용 일수 + (활동 점수 OR 스트릭) 조건
        if (meetsActiveDays && (meetsActivityScore || (meetsStreak && meetsReferrals))) {
            return tier;
        }
    }

    // 기본 Bronze
    return sortedTiers[sortedTiers.length - 1] || DEFAULT_GRADE_TIERS[0];
}
