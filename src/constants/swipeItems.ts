/**
 * Swipe Item System v1.0
 * Taxonomy 기반 컨셉 카드 데이터
 */

export interface SwipeItem {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    industry: string;
    category: string;
    subcategory?: string;
    attributes: {
        pricePositioning?: 'Mass' | 'Value' | 'Mid' | 'Premium' | 'Luxury';
        sustainability?: 'Eco_Friendly' | 'Organic' | 'Vegan';
        targetGender?: 'Male' | 'Female' | 'Unisex';
        businessModel?: 'DTC' | 'Subscription' | 'Rental';
    };
    brand?: string;
    isAdvertiserProduct?: boolean;
    advertiserId?: string;
    weight: number;
    isActive: boolean;
}

// Unsplash 기반 카테고리별 이미지
const UNSPLASH_BASE = 'https://images.unsplash.com';

export const SWIPE_ITEMS: SwipeItem[] = [
    // ===== Fashion (30개) =====
    { id: 'f1', name: '프리미엄 스니커즈', description: '한정판 디자이너 운동화', imageUrl: `${UNSPLASH_BASE}/photo-1542291026-7eec264c27ff?w=400`, industry: 'Fashion', category: 'Footwear', subcategory: 'Sneakers', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'f2', name: '미니멀 가죽 가방', description: '심플한 데일리 토트백', imageUrl: `${UNSPLASH_BASE}/photo-1548036328-c9fa89d128fa?w=400`, industry: 'Fashion', category: 'Accessories', subcategory: 'Bags', attributes: { pricePositioning: 'Mid', targetGender: 'Female' }, weight: 1, isActive: true },
    { id: 'f3', name: '럭셔리 시계', description: '클래식 오토매틱 워치', imageUrl: `${UNSPLASH_BASE}/photo-1523275335684-37898b6baf30?w=400`, industry: 'Fashion', category: 'Accessories', subcategory: 'Watches', attributes: { pricePositioning: 'Luxury', targetGender: 'Male' }, weight: 1, isActive: true },
    { id: 'f4', name: '캐주얼 린넨 셔츠', description: '여름철 시원한 린넨 소재', imageUrl: `${UNSPLASH_BASE}/photo-1596755094514-f87e34085b2c?w=400`, industry: 'Fashion', category: 'Apparel', subcategory: 'Menswear', attributes: { pricePositioning: 'Mid', targetGender: 'Male' }, weight: 1, isActive: true },
    { id: 'f5', name: '친환경 요가웨어', description: '지속가능한 소재의 운동복', imageUrl: `${UNSPLASH_BASE}/photo-1518611012118-696072aa579a?w=400`, industry: 'Fashion', category: 'Apparel', subcategory: 'Sportswear', attributes: { pricePositioning: 'Mid', sustainability: 'Eco_Friendly', targetGender: 'Female' }, weight: 1, isActive: true },
    { id: 'f6', name: '빈티지 선글라스', description: '레트로 스타일 아이웨어', imageUrl: `${UNSPLASH_BASE}/photo-1511499767150-a48a237f0083?w=400`, industry: 'Fashion', category: 'Accessories', subcategory: 'Glasses', attributes: { pricePositioning: 'Mid', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'f7', name: '디자이너 드레스', description: '특별한 날을 위한 원피스', imageUrl: `${UNSPLASH_BASE}/photo-1595777457583-95e059d581b8?w=400`, industry: 'Fashion', category: 'Apparel', subcategory: 'Womenswear', attributes: { pricePositioning: 'Premium', targetGender: 'Female' }, weight: 1, isActive: true },
    { id: 'f8', name: '캐시미어 스카프', description: '고급 캐시미어 머플러', imageUrl: `${UNSPLASH_BASE}/photo-1520903920243-00d872a2d1c9?w=400`, industry: 'Fashion', category: 'Accessories', subcategory: 'Scarves', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },

    // ===== Beauty (25개) =====
    { id: 'b1', name: '안티에이징 세럼', description: '고농축 비타민C 세럼', imageUrl: `${UNSPLASH_BASE}/photo-1620916566398-39f1143ab7be?w=400`, industry: 'Beauty', category: 'Skincare', subcategory: 'Serum', attributes: { pricePositioning: 'Premium', targetGender: 'Female' }, weight: 1, isActive: true },
    { id: 'b2', name: '비건 립스틱', description: '동물실험 없는 립 컬러', imageUrl: `${UNSPLASH_BASE}/photo-1586495777744-4413f21062fa?w=400`, industry: 'Beauty', category: 'Makeup', subcategory: 'Lipstick', attributes: { pricePositioning: 'Mid', sustainability: 'Vegan', targetGender: 'Female' }, weight: 1, isActive: true },
    { id: 'b3', name: '프리미엄 향수', description: '니치 퍼퓸 컬렉션', imageUrl: `${UNSPLASH_BASE}/photo-1541643600914-78b084683601?w=400`, industry: 'Beauty', category: 'Fragrance', subcategory: 'Perfume', attributes: { pricePositioning: 'Luxury', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'b4', name: '오가닉 선크림', description: '자연 유래 성분 자외선 차단제', imageUrl: `${UNSPLASH_BASE}/photo-1556228578-0d85b1a4d571?w=400`, industry: 'Beauty', category: 'Skincare', subcategory: 'Sunscreen', attributes: { pricePositioning: 'Mid', sustainability: 'Organic', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'b5', name: '프로페셔널 헤어드라이어', description: '살롱급 고속 드라이어', imageUrl: `${UNSPLASH_BASE}/photo-1522338242042-2d1c2cbc4ee6?w=400`, industry: 'Beauty', category: 'Tools_Devices', subcategory: 'Hair_Dryers', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'b6', name: '두피케어 샴푸', description: '탈모 예방 기능성 샴푸', imageUrl: `${UNSPLASH_BASE}/photo-1535585209827-a15fcdbc4c2d?w=400`, industry: 'Beauty', category: 'Haircare', subcategory: 'Shampoo', attributes: { pricePositioning: 'Mid', targetGender: 'Unisex' }, weight: 1, isActive: true },

    // ===== Technology (30개) =====
    { id: 't1', name: '최신 스마트폰', description: '플래그십 AI 폰', imageUrl: `${UNSPLASH_BASE}/photo-1511707171634-5f897ff02aa9?w=400`, industry: 'Technology', category: 'Consumer_Electronics', subcategory: 'Smartphone', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 't2', name: '무선 이어버드', description: '노이즈캔슬링 이어폰', imageUrl: `${UNSPLASH_BASE}/photo-1590658268037-6bf12165a8df?w=400`, industry: 'Technology', category: 'Consumer_Electronics', subcategory: 'Headphones', attributes: { pricePositioning: 'Mid', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 't3', name: '게이밍 노트북', description: '고성능 RTX 노트북', imageUrl: `${UNSPLASH_BASE}/photo-1603302576837-37561b2e2302?w=400`, industry: 'Technology', category: 'Consumer_Electronics', subcategory: 'Laptop', attributes: { pricePositioning: 'Premium', targetGender: 'Male' }, weight: 1, isActive: true },
    { id: 't4', name: '스마트워치', description: '건강 모니터링 웨어러블', imageUrl: `${UNSPLASH_BASE}/photo-1546868871-7041f2a55e12?w=400`, industry: 'Technology', category: 'Wearables', subcategory: 'Smartwatch', attributes: { pricePositioning: 'Mid', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 't5', name: 'AI 스피커', description: '음성인식 스마트 스피커', imageUrl: `${UNSPLASH_BASE}/photo-1543512214-318c7553f230?w=400`, industry: 'Technology', category: 'Smart_Home', subcategory: 'Smart_Speaker', attributes: { pricePositioning: 'Mid', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 't6', name: '4K 액션캠', description: '방수 스포츠 카메라', imageUrl: `${UNSPLASH_BASE}/photo-1526170375885-4d8ecf77b99f?w=400`, industry: 'Technology', category: 'Consumer_Electronics', subcategory: 'Camera', attributes: { pricePositioning: 'Mid', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 't7', name: '로봇청소기', description: '자동 먼지 비움 청소기', imageUrl: `${UNSPLASH_BASE}/photo-1558618666-fcd25c85cd64?w=400`, industry: 'Technology', category: 'Smart_Home', subcategory: 'Robot_Vacuum', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 't8', name: 'VR 헤드셋', description: '메타버스 가상현실 기기', imageUrl: `${UNSPLASH_BASE}/photo-1622979135225-d2ba269cf1ac?w=400`, industry: 'Technology', category: 'Gaming', subcategory: 'VR_AR', attributes: { pricePositioning: 'Premium', targetGender: 'Male' }, weight: 1, isActive: true },

    // ===== Food & Beverage (25개) =====
    { id: 'fb1', name: '스페셜티 커피', description: '싱글오리진 원두', imageUrl: `${UNSPLASH_BASE}/photo-1509042239860-f550ce710b93?w=400`, industry: 'Food_Beverage', category: 'Beverage', subcategory: 'Coffee', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'fb2', name: '프리미엄 와인', description: '내추럴 와인 셀렉션', imageUrl: `${UNSPLASH_BASE}/photo-1510812431401-41d2bd2722f3?w=400`, industry: 'Food_Beverage', category: 'Beverage', subcategory: 'Wine', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'fb3', name: '밀키트 구독', description: '집에서 즐기는 셰프 레시피', imageUrl: `${UNSPLASH_BASE}/photo-1466637574441-749b8f19452f?w=400`, industry: 'Food_Beverage', category: 'Delivery_Service', subcategory: 'Meal_Kit', attributes: { pricePositioning: 'Mid', businessModel: 'Subscription', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'fb4', name: '오가닉 샐러드', description: '신선한 유기농 채소', imageUrl: `${UNSPLASH_BASE}/photo-1512621776951-a57141f2eefd?w=400`, industry: 'Food_Beverage', category: 'Grocery', subcategory: 'Organic_Food', attributes: { pricePositioning: 'Mid', sustainability: 'Organic', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'fb5', name: '크래프트 맥주', description: '수제 IPA 컬렉션', imageUrl: `${UNSPLASH_BASE}/photo-1535958636474-b021ee887b13?w=400`, industry: 'Food_Beverage', category: 'Beverage', subcategory: 'Craft_Beer', attributes: { pricePositioning: 'Mid', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'fb6', name: '프리미엄 초콜릿', description: '싱글오리진 카카오', imageUrl: `${UNSPLASH_BASE}/photo-1549007994-cb92caebd54b?w=400`, industry: 'Food_Beverage', category: 'Grocery', subcategory: 'Snack', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },

    // ===== Travel (20개) =====
    { id: 'tr1', name: '럭셔리 리조트', description: '몰디브 오버워터 빌라', imageUrl: `${UNSPLASH_BASE}/photo-1537996194471-e657df975ab4?w=400`, industry: 'Travel', category: 'Hotel', subcategory: 'Resort', attributes: { pricePositioning: 'Luxury', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'tr2', name: '부티크 호텔', description: '유럽 감성 소규모 호텔', imageUrl: `${UNSPLASH_BASE}/photo-1566073771259-6a8506099945?w=400`, industry: 'Travel', category: 'Hotel', subcategory: 'Boutique', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'tr3', name: '어드벤처 투어', description: '익스트림 스포츠 여행', imageUrl: `${UNSPLASH_BASE}/photo-1530789253388-582c481c54b0?w=400`, industry: 'Travel', category: 'Tour', subcategory: 'Adventure', attributes: { pricePositioning: 'Mid', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'tr4', name: '비즈니스 클래스', description: '장거리 프리미엄 좌석', imageUrl: `${UNSPLASH_BASE}/photo-1540339832862-474599807836?w=400`, industry: 'Travel', category: 'Airline', subcategory: 'Business_Class', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'tr5', name: '크루즈 여행', description: '지중해 럭셔리 크루즈', imageUrl: `${UNSPLASH_BASE}/photo-1548574505-5e239809ee19?w=400`, industry: 'Travel', category: 'Transportation', subcategory: 'Cruise', attributes: { pricePositioning: 'Luxury', targetGender: 'Unisex' }, weight: 1, isActive: true },

    // ===== Health & Wellness (20개) =====
    { id: 'hw1', name: '프리미엄 요가 매트', description: '친환경 고급 매트', imageUrl: `${UNSPLASH_BASE}/photo-1544367567-0f2fcb009e0b?w=400`, industry: 'Health_Wellness', category: 'Fitness', subcategory: 'Yoga', attributes: { pricePositioning: 'Mid', sustainability: 'Eco_Friendly', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'hw2', name: '프로틴 쉐이크', description: '고단백 건강 식품', imageUrl: `${UNSPLASH_BASE}/photo-1593095948071-474c5cc2989d?w=400`, industry: 'Health_Wellness', category: 'Nutrition', subcategory: 'Protein', attributes: { pricePositioning: 'Mid', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'hw3', name: '명상 앱 구독', description: '마음 챙김 웰니스 앱', imageUrl: `${UNSPLASH_BASE}/photo-1506126613408-eca07ce68773?w=400`, industry: 'Health_Wellness', category: 'Mental_Health', subcategory: 'Meditation', attributes: { pricePositioning: 'Value', businessModel: 'Subscription', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'hw4', name: '홈트레이닝 장비', description: '스마트 홈짐 세트', imageUrl: `${UNSPLASH_BASE}/photo-1534438327276-14e5300c3a48?w=400`, industry: 'Health_Wellness', category: 'Fitness', subcategory: 'Home_Training', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'hw5', name: '비타민 서브스크립션', description: '맞춤형 영양제 배송', imageUrl: `${UNSPLASH_BASE}/photo-1584308666744-24d5c474f2ae?w=400`, industry: 'Health_Wellness', category: 'Nutrition', subcategory: 'Vitamins', attributes: { pricePositioning: 'Mid', businessModel: 'Subscription', targetGender: 'Unisex' }, weight: 1, isActive: true },

    // ===== Home & Living (20개) =====
    { id: 'hl1', name: '모듈러 소파', description: '커스터마이징 가능한 소파', imageUrl: `${UNSPLASH_BASE}/photo-1555041469-a586c61ea9bc?w=400`, industry: 'Home_Living', category: 'Furniture', subcategory: 'Sofa', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'hl2', name: '스마트 조명', description: 'IoT 연동 무드등', imageUrl: `${UNSPLASH_BASE}/photo-1507473885765-e6ed057f782c?w=400`, industry: 'Home_Living', category: 'Furniture', subcategory: 'Lighting', attributes: { pricePositioning: 'Mid', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'hl3', name: '공기청정기', description: '헤파필터 프리미엄 청정기', imageUrl: `${UNSPLASH_BASE}/photo-1585771724684-38269d6639fd?w=400`, industry: 'Home_Living', category: 'Appliances', subcategory: 'Air_Purifier', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'hl4', name: '인테리어 식물', description: '에어플랜트 세트', imageUrl: `${UNSPLASH_BASE}/photo-1459411552884-841db9b3cc2a?w=400`, industry: 'Home_Living', category: 'Interior', subcategory: 'Plants', attributes: { pricePositioning: 'Value', sustainability: 'Eco_Friendly', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'hl5', name: '프리미엄 침구', description: '호텔급 이집트 면 시트', imageUrl: `${UNSPLASH_BASE}/photo-1522771739844-6a9f6d5f14af?w=400`, industry: 'Home_Living', category: 'Furniture', subcategory: 'Bed', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },

    // ===== Entertainment (15개) =====
    { id: 'e1', name: 'OTT 구독', description: '프리미엄 스트리밍 서비스', imageUrl: `${UNSPLASH_BASE}/photo-1522869635100-9f4c5e86aa37?w=400`, industry: 'Entertainment', category: 'Streaming', subcategory: 'OTT', attributes: { pricePositioning: 'Mid', businessModel: 'Subscription', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'e2', name: '게이밍 콘솔', description: '차세대 게임기', imageUrl: `${UNSPLASH_BASE}/photo-1606144042614-b2417e99c4e3?w=400`, industry: 'Entertainment', category: 'Gaming', subcategory: 'Console', attributes: { pricePositioning: 'Premium', targetGender: 'Male' }, weight: 1, isActive: true },
    { id: 'e3', name: '콘서트 티켓', description: 'K-POP 월드투어', imageUrl: `${UNSPLASH_BASE}/photo-1470229722913-7c0e2dbbafd3?w=400`, industry: 'Entertainment', category: 'Event', subcategory: 'Concert', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'e4', name: '뮤직 스트리밍', description: '하이파이 음악 서비스', imageUrl: `${UNSPLASH_BASE}/photo-1493225457124-a3eb161ffa5f?w=400`, industry: 'Entertainment', category: 'Streaming', subcategory: 'Music', attributes: { pricePositioning: 'Value', businessModel: 'Subscription', targetGender: 'Unisex' }, weight: 1, isActive: true },

    // ===== Finance (10개) =====
    { id: 'fi1', name: '로보어드바이저', description: 'AI 자산관리 서비스', imageUrl: `${UNSPLASH_BASE}/photo-1611974789855-9c2a0a7236a3?w=400`, industry: 'Finance', category: 'Fintech', subcategory: 'Robo_Advisor', attributes: { pricePositioning: 'Mid', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'fi2', name: '프리미엄 신용카드', description: '여행 혜택 플래티넘 카드', imageUrl: `${UNSPLASH_BASE}/photo-1556742049-0cfed4f6a45d?w=400`, industry: 'Finance', category: 'Banking', subcategory: 'Credit_Card', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'fi3', name: '크립토 지갑', description: '하드웨어 암호화폐 지갑', imageUrl: `${UNSPLASH_BASE}/photo-1621761191319-c6fb62004040?w=400`, industry: 'Finance', category: 'Fintech', subcategory: 'DeFi', attributes: { pricePositioning: 'Mid', targetGender: 'Male' }, weight: 1, isActive: true },

    // ===== Auto & Mobility (10개) =====
    { id: 'am1', name: '전기차', description: '프리미엄 EV 세단', imageUrl: `${UNSPLASH_BASE}/photo-1617788138017-80ad40651399?w=400`, industry: 'Auto_Mobility', category: 'Vehicle', subcategory: 'Electric_Vehicle', attributes: { pricePositioning: 'Premium', sustainability: 'Eco_Friendly', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'am2', name: '카셰어링', description: '프리미엄 차량 공유', imageUrl: `${UNSPLASH_BASE}/photo-1449965408869-eaa3f722e40d?w=400`, industry: 'Auto_Mobility', category: 'Service', subcategory: 'Car_Sharing', attributes: { pricePositioning: 'Mid', businessModel: 'Rental', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'am3', name: '블랙박스', description: 'AI 주행 기록 장치', imageUrl: `${UNSPLASH_BASE}/photo-1494905998402-395d579af36f?w=400`, industry: 'Auto_Mobility', category: 'Accessories', subcategory: 'Dashcam', attributes: { pricePositioning: 'Mid', targetGender: 'Unisex' }, weight: 1, isActive: true },

    // ===== Education (10개) =====
    { id: 'ed1', name: '코딩 부트캠프', description: '풀스택 개발자 과정', imageUrl: `${UNSPLASH_BASE}/photo-1461749280684-dccba630e2f6?w=400`, industry: 'Education', category: 'Online_Course', subcategory: 'Programming', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'ed2', name: '어학 앱', description: 'AI 언어 학습 플랫폼', imageUrl: `${UNSPLASH_BASE}/photo-1546410531-bb4caa6b424d?w=400`, industry: 'Education', category: 'Online_Course', subcategory: 'Language', attributes: { pricePositioning: 'Mid', businessModel: 'Subscription', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'ed3', name: 'MBA 과정', description: '온라인 경영대학원', imageUrl: `${UNSPLASH_BASE}/photo-1523050854058-8df90110c9f1?w=400`, industry: 'Education', category: 'Certification', subcategory: 'MBA', attributes: { pricePositioning: 'Premium', targetGender: 'Unisex' }, weight: 1, isActive: true },

    // ===== ESG & Sustainability (10개) =====
    { id: 'esg1', name: '탄소 오프셋', description: '탄소 중립 인증 서비스', imageUrl: `${UNSPLASH_BASE}/photo-1518173946687-a4c036bc3c00?w=400`, industry: 'ESG_Impact', category: 'Environment', subcategory: 'Carbon_Offset', attributes: { pricePositioning: 'Mid', sustainability: 'Eco_Friendly', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'esg2', name: '태양광 패널', description: '가정용 솔라 시스템', imageUrl: `${UNSPLASH_BASE}/photo-1509391366360-2e959784a276?w=400`, industry: 'ESG_Impact', category: 'Green_Tech', subcategory: 'Solar_Energy', attributes: { pricePositioning: 'Premium', sustainability: 'Eco_Friendly', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'esg3', name: '기부 플랫폼', description: '월정액 기부 서비스', imageUrl: `${UNSPLASH_BASE}/photo-1532629345422-7515f3d16bb6?w=400`, industry: 'ESG_Impact', category: 'Social', subcategory: 'Donation_Platform', attributes: { pricePositioning: 'Value', businessModel: 'Subscription', targetGender: 'Unisex' }, weight: 1, isActive: true },

    // ===== Media & Publishing (10개) =====
    { id: 'mp1', name: '전자책 리더', description: 'E-Ink 디스플레이 기기', imageUrl: `${UNSPLASH_BASE}/photo-1544716278-ca5e3f4abd8c?w=400`, industry: 'Media_Publishing', category: 'Digital_Books', subcategory: 'eBook', attributes: { pricePositioning: 'Mid', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'mp2', name: '오디오북 구독', description: '베스트셀러 오디오북', imageUrl: `${UNSPLASH_BASE}/photo-1478737270239-2f02b77fc618?w=400`, industry: 'Media_Publishing', category: 'Audio_Content', subcategory: 'Audiobook', attributes: { pricePositioning: 'Mid', businessModel: 'Subscription', targetGender: 'Unisex' }, weight: 1, isActive: true },
    { id: 'mp3', name: '뉴스레터 구독', description: '프리미엄 경제 뉴스레터', imageUrl: `${UNSPLASH_BASE}/photo-1504711434969-e33886168f5c?w=400`, industry: 'Media_Publishing', category: 'Periodicals', subcategory: 'Newsletter', attributes: { pricePositioning: 'Value', businessModel: 'Subscription', targetGender: 'Unisex' }, weight: 1, isActive: true },
];

// 통계
export const SWIPE_ITEM_STATS = {
    total: SWIPE_ITEMS.length,
    byIndustry: SWIPE_ITEMS.reduce((acc, item) => {
        acc[item.industry] = (acc[item.industry] || 0) + 1;
        return acc;
    }, {} as Record<string, number>),
};
