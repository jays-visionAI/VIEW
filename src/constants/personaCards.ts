/**
 * VIEW Persona Card System v2.0
 * 30개의 상세 페르소나 카드 정의
 * 사용자 특성, 행동, 관심사를 기반으로 분류
 */

export interface PersonaCardDefinition {
    id: string;
    name: string;
    nameEn: string;
    icon: string;
    category: 'spending' | 'lifestyle' | 'channel' | 'interest' | 'special';
    description: string;
    conditions: {
        trait?: string;
        operator: '>' | '<' | '>=' | '<=' | '==' | 'includes';
        value: number | string;
    }[];
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    color: string;
}

export const PERSONA_CARDS: PersonaCardDefinition[] = [
    // ============================================
    // 카테고리 1: 소비 성향 (Spending Style) - 8개
    // ============================================
    {
        id: 'premium_whale',
        name: '프리미엄 웨일',
        nameEn: 'Premium Whale',
        icon: '🐋',
        category: 'spending',
        description: '최고급 제품만 사는 VIP 소비자',
        conditions: [
            { trait: 'purchasingPower', operator: '>=', value: 0.9 },
            { trait: 'priceVsBrand', operator: '>=', value: 0.8 }
        ],
        rarity: 'legendary',
        color: '#FFD700'
    },
    {
        id: 'luxury_lover',
        name: '럭셔리 러버',
        nameEn: 'Luxury Lover',
        icon: '💎',
        category: 'spending',
        description: '프리미엄 브랜드를 선호하는 소비자',
        conditions: [
            { trait: 'purchasingPower', operator: '>=', value: 0.7 },
            { trait: 'priceVsBrand', operator: '>=', value: 0.6 }
        ],
        rarity: 'epic',
        color: '#9333EA'
    },
    {
        id: 'smart_saver',
        name: '스마트 세이버',
        nameEn: 'Smart Saver',
        icon: '🎯',
        category: 'spending',
        description: '가성비를 중시하는 현명한 소비자',
        conditions: [
            { trait: 'priceVsBrand', operator: '<', value: 0.3 }
        ],
        rarity: 'common',
        color: '#22C55E'
    },
    {
        id: 'deal_hunter',
        name: '딜 헌터',
        nameEn: 'Deal Hunter',
        icon: '🏷️',
        category: 'spending',
        description: '세일과 할인을 놓치지 않는 사냥꾼',
        conditions: [
            { trait: 'priceVsBrand', operator: '<', value: 0.4 },
            { trait: 'planningHorizon', operator: '>=', value: 0.6 }
        ],
        rarity: 'uncommon',
        color: '#F97316'
    },
    {
        id: 'impulse_buyer',
        name: '충동구매러',
        nameEn: 'Impulse Buyer',
        icon: '⚡',
        category: 'spending',
        description: '마음에 들면 바로 구매하는 즉흥파',
        conditions: [
            { trait: 'impulseBuying', operator: '>=', value: 0.7 }
        ],
        rarity: 'uncommon',
        color: '#EAB308'
    },
    {
        id: 'calculated_planner',
        name: '계획적 구매자',
        nameEn: 'Calculated Planner',
        icon: '📊',
        category: 'spending',
        description: '구매 전 충분히 비교하고 분석하는 타입',
        conditions: [
            { trait: 'planningHorizon', operator: '>=', value: 0.8 },
            { trait: 'impulseBuying', operator: '<', value: 0.3 }
        ],
        rarity: 'uncommon',
        color: '#3B82F6'
    },
    {
        id: 'brand_loyalist',
        name: '브랜드 충성파',
        nameEn: 'Brand Loyalist',
        icon: '🏆',
        category: 'spending',
        description: '한 번 좋아한 브랜드는 계속 사용',
        conditions: [
            { trait: 'brandLoyalty', operator: '>=', value: 0.8 }
        ],
        rarity: 'rare',
        color: '#DC2626'
    },
    {
        id: 'brand_explorer',
        name: '브랜드 탐험가',
        nameEn: 'Brand Explorer',
        icon: '🧭',
        category: 'spending',
        description: '새로운 브랜드를 적극적으로 시도',
        conditions: [
            { trait: 'brandLoyalty', operator: '<', value: 0.3 },
            { trait: 'earlyAdopter', operator: '>=', value: 0.5 }
        ],
        rarity: 'uncommon',
        color: '#8B5CF6'
    },

    // ============================================
    // 카테고리 2: 라이프스타일 (Lifestyle) - 7개
    // ============================================
    {
        id: 'eco_warrior',
        name: '에코 워리어',
        nameEn: 'Eco Warrior',
        icon: '🌱',
        category: 'lifestyle',
        description: '환경과 지속가능성을 최우선으로 생각',
        conditions: [
            { trait: 'sustainabilityValue', operator: '>=', value: 0.7 }
        ],
        rarity: 'rare',
        color: '#10B981'
    },
    {
        id: 'health_conscious',
        name: '헬스 컨셔스',
        nameEn: 'Health Conscious',
        icon: '💪',
        category: 'lifestyle',
        description: '건강과 웰니스에 투자하는 타입',
        conditions: [
            { trait: 'industryAffinity', operator: 'includes', value: 'Health_Wellness' }
        ],
        rarity: 'uncommon',
        color: '#06B6D4'
    },
    {
        id: 'experience_seeker',
        name: '경험 추구자',
        nameEn: 'Experience Seeker',
        icon: '🎭',
        category: 'lifestyle',
        description: '소유보다 경험에 가치를 두는 사람',
        conditions: [
            { trait: 'experienceSeeker', operator: '>=', value: 0.7 }
        ],
        rarity: 'rare',
        color: '#EC4899'
    },
    {
        id: 'social_butterfly',
        name: '소셜 버터플라이',
        nameEn: 'Social Butterfly',
        icon: '🦋',
        category: 'lifestyle',
        description: '트렌드와 사회적 영향에 민감',
        conditions: [
            { trait: 'socialInfluence', operator: '>=', value: 0.7 }
        ],
        rarity: 'uncommon',
        color: '#F472B6'
    },
    {
        id: 'minimalist',
        name: '미니멀리스트',
        nameEn: 'Minimalist',
        icon: '🧘',
        category: 'lifestyle',
        description: '꼭 필요한 것만 소비하는 타입',
        conditions: [
            { trait: 'impulseBuying', operator: '<', value: 0.2 },
            { trait: 'planningHorizon', operator: '>=', value: 0.7 }
        ],
        rarity: 'rare',
        color: '#6B7280'
    },
    {
        id: 'family_first',
        name: '패밀리 퍼스트',
        nameEn: 'Family First',
        icon: '👨‍👩‍👧‍👦',
        category: 'lifestyle',
        description: '가족을 위한 소비가 우선인 타입',
        conditions: [
            { trait: 'industryAffinity', operator: 'includes', value: 'Education' }
        ],
        rarity: 'common',
        color: '#F59E0B'
    },
    {
        id: 'pet_parent',
        name: '펫 페어런트',
        nameEn: 'Pet Parent',
        icon: '🐾',
        category: 'lifestyle',
        description: '반려동물을 위해 아끼지 않는 집사',
        conditions: [
            { trait: 'surveyResponse.pet', operator: '==', value: 'yes' }
        ],
        rarity: 'uncommon',
        color: '#A78BFA'
    },

    // ============================================
    // 카테고리 3: 채널/테크 (Channel & Tech) - 5개
    // ============================================
    {
        id: 'digital_native',
        name: '디지털 네이티브',
        nameEn: 'Digital Native',
        icon: '📱',
        category: 'channel',
        description: '모든 쇼핑을 온라인으로 해결',
        conditions: [
            { trait: 'onlinePreference', operator: '>=', value: 0.8 }
        ],
        rarity: 'common',
        color: '#6366F1'
    },
    {
        id: 'omni_shopper',
        name: '옴니 쇼퍼',
        nameEn: 'Omni Shopper',
        icon: '🔄',
        category: 'channel',
        description: '온오프라인을 자유롭게 넘나드는 쇼퍼',
        conditions: [
            { trait: 'onlinePreference', operator: '>=', value: 0.4 },
            { trait: 'onlinePreference', operator: '<=', value: 0.6 }
        ],
        rarity: 'uncommon',
        color: '#14B8A6'
    },
    {
        id: 'tech_early_adopter',
        name: '테크 얼리어답터',
        nameEn: 'Tech Early Adopter',
        icon: '🚀',
        category: 'channel',
        description: '신기술/신제품을 가장 먼저 경험',
        conditions: [
            { trait: 'earlyAdopter', operator: '>=', value: 0.7 },
            { trait: 'industryAffinity', operator: 'includes', value: 'Technology' }
        ],
        rarity: 'epic',
        color: '#7C3AED'
    },
    {
        id: 'social_commerce_fan',
        name: '소셜커머스 팬',
        nameEn: 'Social Commerce Fan',
        icon: '📲',
        category: 'channel',
        description: 'SNS에서 발견하고 바로 구매',
        conditions: [
            { trait: 'socialInfluence', operator: '>=', value: 0.6 },
            { trait: 'onlinePreference', operator: '>=', value: 0.7 }
        ],
        rarity: 'uncommon',
        color: '#E11D48'
    },
    {
        id: 'offline_explorer',
        name: '오프라인 탐험가',
        nameEn: 'Offline Explorer',
        icon: '🏬',
        category: 'channel',
        description: '직접 보고 만지고 사는 것을 선호',
        conditions: [
            { trait: 'onlinePreference', operator: '<', value: 0.3 }
        ],
        rarity: 'uncommon',
        color: '#78716C'
    },

    // ============================================
    // 카테고리 4: 산업 관심사 (Industry Interest) - 8개
    // ============================================
    {
        id: 'fashionista',
        name: '패셔니스타',
        nameEn: 'Fashionista',
        icon: '👗',
        category: 'interest',
        description: '패션과 스타일에 진심인 사람',
        conditions: [
            { trait: 'industryAffinity', operator: 'includes', value: 'Fashion' }
        ],
        rarity: 'uncommon',
        color: '#F43F5E'
    },
    {
        id: 'beauty_maven',
        name: '뷰티 메이븐',
        nameEn: 'Beauty Maven',
        icon: '💄',
        category: 'interest',
        description: '뷰티/스킨케어 트렌드를 선도',
        conditions: [
            { trait: 'industryAffinity', operator: 'includes', value: 'Beauty' }
        ],
        rarity: 'uncommon',
        color: '#FB7185'
    },
    {
        id: 'foodie',
        name: '푸디',
        nameEn: 'Foodie',
        icon: '🍽️',
        category: 'interest',
        description: '맛집과 음식에 열정적인 미식가',
        conditions: [
            { trait: 'industryAffinity', operator: 'includes', value: 'Food_Beverage' }
        ],
        rarity: 'common',
        color: '#EA580C'
    },
    {
        id: 'travel_lover',
        name: '여행 러버',
        nameEn: 'Travel Lover',
        icon: '✈️',
        category: 'interest',
        description: '여행과 새로운 경험을 사랑',
        conditions: [
            { trait: 'industryAffinity', operator: 'includes', value: 'Travel' }
        ],
        rarity: 'rare',
        color: '#0EA5E9'
    },
    {
        id: 'tech_geek',
        name: '테크 긱',
        nameEn: 'Tech Geek',
        icon: '💻',
        category: 'interest',
        description: '최신 기술과 가젯에 열광',
        conditions: [
            { trait: 'industryAffinity', operator: 'includes', value: 'Technology' }
        ],
        rarity: 'uncommon',
        color: '#4F46E5'
    },
    {
        id: 'gamer',
        name: '게이머',
        nameEn: 'Gamer',
        icon: '🎮',
        category: 'interest',
        description: '게임과 e스포츠에 열정적',
        conditions: [
            { trait: 'industryAffinity', operator: 'includes', value: 'Entertainment.Gaming' }
        ],
        rarity: 'uncommon',
        color: '#8B5CF6'
    },
    {
        id: 'homemaker',
        name: '홈메이커',
        nameEn: 'Homemaker',
        icon: '🏠',
        category: 'interest',
        description: '인테리어와 홈리빙에 관심',
        conditions: [
            { trait: 'industryAffinity', operator: 'includes', value: 'Home_Living' }
        ],
        rarity: 'common',
        color: '#84CC16'
    },
    {
        id: 'investor',
        name: '투자자',
        nameEn: 'Investor',
        icon: '📈',
        category: 'interest',
        description: '재테크와 금융에 관심이 높은',
        conditions: [
            { trait: 'industryAffinity', operator: 'includes', value: 'Finance' }
        ],
        rarity: 'rare',
        color: '#059669'
    },

    // ============================================
    // 카테고리 5: 특별 등급 (Special Tier) - 2개
    // ============================================
    {
        id: 'vip_member',
        name: 'VIP 멤버',
        nameEn: 'VIP Member',
        icon: '👑',
        category: 'special',
        description: '높은 활동량과 데이터 가치를 가진 회원',
        conditions: [
            { trait: 'dataValue', operator: '>=', value: 10000 },
            { trait: 'surveyCompletion', operator: '>=', value: 80 }
        ],
        rarity: 'legendary',
        color: '#F59E0B'
    },
    {
        id: 'rising_star',
        name: '라이징 스타',
        nameEn: 'Rising Star',
        icon: '⭐',
        category: 'special',
        description: '성장 가능성이 높은 신규 회원',
        conditions: [
            { trait: 'accountAge', operator: '<', value: 30 }
        ],
        rarity: 'common',
        color: '#FBBF24'
    }
];

// 카테고리별 그룹화
export const PERSONA_CARDS_BY_CATEGORY = {
    spending: PERSONA_CARDS.filter(c => c.category === 'spending'),
    lifestyle: PERSONA_CARDS.filter(c => c.category === 'lifestyle'),
    channel: PERSONA_CARDS.filter(c => c.category === 'channel'),
    interest: PERSONA_CARDS.filter(c => c.category === 'interest'),
    special: PERSONA_CARDS.filter(c => c.category === 'special'),
};

// 희귀도별 그룹화
export const PERSONA_CARDS_BY_RARITY = {
    common: PERSONA_CARDS.filter(c => c.rarity === 'common'),
    uncommon: PERSONA_CARDS.filter(c => c.rarity === 'uncommon'),
    rare: PERSONA_CARDS.filter(c => c.rarity === 'rare'),
    epic: PERSONA_CARDS.filter(c => c.rarity === 'epic'),
    legendary: PERSONA_CARDS.filter(c => c.rarity === 'legendary'),
};

// 희귀도별 색상 (UI용)
export const RARITY_COLORS = {
    common: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    uncommon: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-400' },
    rare: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-400' },
    epic: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400' },
    legendary: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400', glow: 'shadow-lg shadow-yellow-200' },
};

// 통계
export const PERSONA_CARD_STATS = {
    total: PERSONA_CARDS.length,
    byCategory: {
        spending: PERSONA_CARDS_BY_CATEGORY.spending.length,
        lifestyle: PERSONA_CARDS_BY_CATEGORY.lifestyle.length,
        channel: PERSONA_CARDS_BY_CATEGORY.channel.length,
        interest: PERSONA_CARDS_BY_CATEGORY.interest.length,
        special: PERSONA_CARDS_BY_CATEGORY.special.length,
    },
    byRarity: {
        common: PERSONA_CARDS_BY_RARITY.common.length,
        uncommon: PERSONA_CARDS_BY_RARITY.uncommon.length,
        rare: PERSONA_CARDS_BY_RARITY.rare.length,
        epic: PERSONA_CARDS_BY_RARITY.epic.length,
        legendary: PERSONA_CARDS_BY_RARITY.legendary.length,
    }
};
