const admin = require('../functions/node_modules/firebase-admin');
// const { getFirestore } = require('../functions/node_modules/firebase-admin/firestore');

// Initialize Firebase Admin
// Note: This relies on GOOGLE_APPLICATION_CREDENTIALS or default credentials.
// If running locally, you might need to set GOOGLE_APPLICATION_CREDENTIALS to your service account key path.
try {
    admin.initializeApp({ projectId: "view-web3-official-1765899415" });
} catch (e) {
    if (e.code !== 'app/already-exists') {
        console.error("Failed to initialize Firebase Admin:", e);
        process.exit(1);
    }
}

const db = admin.firestore();

const surveyData = {
    demographics: {
        id: "demographics",
        category: "demographics",
        categoryNameKo: "기본 정보",
        order: 1,
        completionBonus: 50,
        isActive: true,
        questions: [
            { id: "d1", order: 1, question: "연령대를 선택해주세요", type: "single", options: ["10대", "20대 초반", "20대 후반", "30대 초반", "30대 후반", "40대", "50대 이상"], reward: 5, required: true },
            { id: "d2", order: 2, question: "성별을 선택해주세요", type: "single", options: ["남성", "여성", "기타/응답거부"], reward: 5, required: true },
            { id: "d3", order: 3, question: "거주 지역을 선택해주세요", type: "single", options: ["서울", "경기/인천", "부산/울산/경남", "대구/경북", "광주/전라", "대전/충청", "강원", "제주", "해외"], reward: 5, required: true },
            { id: "d4", order: 4, question: "직업을 선택해주세요", type: "single", options: ["학생", "직장인", "자영업", "프리랜서", "주부", "무직/구직중", "기타"], reward: 5, required: true },
            { id: "d5", order: 5, question: "최종 학력을 선택해주세요", type: "single", options: ["고졸 이하", "대학 재학", "대졸", "대학원 이상"], reward: 5, required: true },
            { id: "d6", order: 6, question: "월 평균 소득 범위를 선택해주세요", type: "single", options: ["없음", "100만원 미만", "100-200만원", "200-300만원", "300-500만원", "500만원 이상"], reward: 10, required: true },
            { id: "d7", order: 7, question: "결혼 여부를 선택해주세요", type: "single", options: ["미혼", "기혼(자녀없음)", "기혼(자녀있음)", "기타"], reward: 5, required: true },
            { id: "d8", order: 8, question: "주로 사용하는 스마트폰은?", type: "single", options: ["iPhone", "삼성 갤럭시", "기타 안드로이드", "기타"], reward: 5, required: true },
            { id: "d9", order: 9, question: "하루 평균 스마트폰 사용 시간은?", type: "single", options: ["1시간 미만", "1-3시간", "3-5시간", "5시간 이상"], reward: 5, required: true },
            { id: "d10", order: 10, question: "주로 사용하는 SNS를 모두 선택해주세요", type: "multiple", options: ["인스타그램", "유튜브", "틱톡", "페이스북", "트위터/X", "네이버 블로그", "기타"], reward: 10, required: true }
        ]
    },
    spending: {
        id: "spending",
        category: "spending",
        categoryNameKo: "소비 성향",
        order: 2,
        completionBonus: 100,
        isActive: true,
        questions: [
            { id: "s1", order: 1, question: "구매 시 가격과 브랜드 중 어느 것을 더 중시하나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["가격 중시", "브랜드 중시"] },
            { id: "s2", order: 2, question: "할인/세일에 얼마나 민감하게 반응하나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["무관심", "매우 민감"] },
            { id: "s3", order: 3, question: "충동구매를 얼마나 자주 하나요?", type: "single", options: ["거의 안함", "가끔", "보통", "자주", "매우 자주"], reward: 10, required: true },
            { id: "s4", order: 4, question: "쇼핑 스타일은 어떤가요?", type: "single", options: ["계획적 구매", "비교 후 구매", "즉흥적 구매", "추천따라 구매"], reward: 10, required: true },
            { id: "s5", order: 5, question: "구매 전 리뷰를 얼마나 확인하나요?", type: "single", options: ["거의 안봄", "간단히 확인", "꼼꼼히 확인", "리뷰가 결정적"], reward: 10, required: true },
            { id: "s6", order: 6, question: "신제품이 나오면 빨리 사보는 편인가요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["기다림", "바로 구매"] },
            { id: "s7", order: 7, question: "온라인/오프라인 중 선호하는 쇼핑 방식은?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["오프라인", "온라인"] },
            { id: "s8", order: 8, question: "친환경/지속가능성 제품을 선호하나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["무관심", "매우 중요"] },
            { id: "s9", order: 9, question: "구독 서비스(넷플릭스, 밀키트 등)를 이용하나요?", type: "single", options: ["없음", "1-2개", "3-4개", "5개 이상"], reward: 10, required: true },
            { id: "s10", order: 10, question: "지인 추천이 구매에 미치는 영향은?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["영향 없음", "결정적"] }
        ]
    },
    shopping: {
        id: "shopping",
        category: "shopping",
        categoryNameKo: "쇼핑 패턴",
        order: 3,
        completionBonus: 100,
        isActive: true,
        questions: [
            { id: "sh1", order: 1, question: "주로 쇼핑하는 시간대는?", type: "single", options: ["오전", "점심-오후", "저녁", "밤/새벽", "불규칙"], reward: 10, required: true },
            { id: "sh2", order: 2, question: "자주 이용하는 쇼핑 플랫폼을 선택해주세요", type: "multiple", options: ["쿠팡", "네이버쇼핑", "무신사", "SSG/G마켓", "11번가", "오프라인매장", "해외직구"], reward: 15, required: true, taxonomyMapping: { "쿠팡": ["Food_Beverage", "Home_Living"], "무신사": ["Fashion.Apparel", "Fashion.Footwear"], "네이버쇼핑": ["Technology", "Beauty"] } },
            { id: "sh3", order: 3, question: "주로 구매하는 결제 수단은?", type: "single", options: ["신용카드", "체크카드", "간편결제(카카오페이 등)", "무통장입금", "페이후결제"], reward: 10, required: true },
            { id: "sh4", order: 4, question: "쇼핑 시 주로 사용하는 기기는?", type: "single", options: ["스마트폰", "PC/노트북", "태블릿", "모두 비슷하게"], reward: 10, required: true },
            { id: "sh5", order: 5, question: "배송 속도를 위해 추가 비용을 내시나요?", type: "single", options: ["절대 안낸다", "가끔", "자주", "항상 빠른배송"], reward: 10, required: true },
            { id: "sh6", order: 6, question: "멤버십/유료회원 서비스에 가입되어 있나요?", type: "multiple", options: ["쿠팡 로켓와우", "네이버플러스", "SSG머니", "아마존프라임", "없음"], reward: 10, required: true },
            { id: "sh7", order: 7, question: "최근 1개월 내 온라인 쇼핑 횟수는?", type: "single", options: ["0회", "1-2회", "3-5회", "6-10회", "10회 이상"], reward: 10, required: true },
            { id: "sh8", order: 8, question: "장바구니에 담고 구매하지 않는 경우가 있나요?", type: "single", options: ["거의 없음", "가끔", "자주", "대부분 그렇다"], reward: 10, required: true },
            { id: "sh9", order: 9, question: "앱 푸시알림으로 구매한 경험이 있나요?", type: "single", options: ["없음", "가끔", "자주", "대부분 그렇게 구매"], reward: 10, required: true },
            { id: "sh10", order: 10, question: "반품/교환 경험은?", type: "single", options: ["거의 없음", "가끔", "자주"], reward: 5, required: true }
        ]
    },
    power: {
        id: "power",
        category: "power",
        categoryNameKo: "소비력",
        order: 4,
        completionBonus: 150,
        isActive: true,
        questions: [
            { id: "p1", order: 1, question: "월 평균 쇼핑 지출액은?", type: "single", options: ["10만원 미만", "10-30만원", "30-50만원", "50-100만원", "100만원 이상"], reward: 15, required: true },
            { id: "p2", order: 2, question: "가장 많이 지출하는 카테고리는?", type: "single", options: ["패션/뷰티", "식품/식료품", "전자제품", "여행/레저", "취미/엔터테인먼트", "생활용품"], reward: 15, required: true, taxonomyMapping: { "패션/뷰티": ["Fashion", "Beauty"], "식품/식료품": ["Food_Beverage"], "전자제품": ["Technology.Consumer_Electronics"], "여행/레저": ["Travel"], "취미/엔터테인먼트": ["Entertainment"] } },
            { id: "p3", order: 3, question: "한 번 구매 시 평균 결제 금액은?", type: "single", options: ["1만원 미만", "1-3만원", "3-5만원", "5-10만원", "10만원 이상"], reward: 15, required: true },
            { id: "p4", order: 4, question: "대기업 브랜드 vs 중소기업 브랜드 선호도는?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["중소기업", "대기업"] },
            { id: "p5", order: 5, question: "명품/프리미엄 제품 구매 경험은?", type: "single", options: ["없음", "가끔", "자주", "주로 명품 구매"], reward: 15, required: true },
            { id: "p6", order: 6, question: "'비싸면 품질이 좋다'에 동의하나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["동의안함", "매우 동의"] },
            { id: "p7", order: 7, question: "신용카드 할부 이용 빈도는?", type: "single", options: ["사용안함", "가끔 2-3개월", "자주 6개월 이상", "무이자할부만"], reward: 10, required: true },
            { id: "p8", order: 8, question: "투자/재테크에 관심이 있나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["무관심", "매우 관심"] },
            { id: "p9", order: 9, question: "자동차를 소유하고 있나요?", type: "single", options: ["없음", "소형차", "중형차", "대형차/SUV", "수입차"], reward: 15, required: true },
            { id: "p10", order: 10, question: "본인의 소비 수준을 평가한다면?", type: "slider", min: 1, max: 5, reward: 15, required: true, sliderLabels: ["절약형", "고소비형"] }
        ]
    },
    history: {
        id: "history",
        category: "history",
        categoryNameKo: "구매 이력",
        order: 5,
        completionBonus: 150,
        isActive: true,
        questions: [
            { id: "h1", order: 1, question: "최근 3개월 내 가장 큰 지출은?", type: "single", options: ["10만원 미만", "10-30만원", "30-50만원", "50-100만원", "100만원 이상"], reward: 15, required: true },
            { id: "h2", order: 2, question: "최근 구매한 전자제품은?", type: "multiple", options: ["스마트폰", "노트북/PC", "태블릿", "이어폰/헤드폰", "스마트워치", "없음"], reward: 15, required: true, taxonomyMapping: { "스마트폰": ["Technology.Consumer_Electronics.Smartphone"], "노트북/PC": ["Technology.Consumer_Electronics.Computer"], "스마트워치": ["Technology.Wearables"] } },
            { id: "h3", order: 3, question: "최근 6개월 내 여행 경험은?", type: "single", options: ["없음", "국내 1-2회", "국내 3회 이상", "해외 1회", "해외 2회 이상"], reward: 15, required: true, taxonomyMapping: { "해외 1회": ["Travel.International"], "해외 2회 이상": ["Travel.International"] } },
            { id: "h4", order: 4, question: "정기적으로 구매하는 소모품은?", type: "multiple", options: ["화장품/스킨케어", "건강보조식품", "식료품", "반려동물용품", "없음"], reward: 10, required: true },
            { id: "h5", order: 5, question: "최근 1년 내 대형가전 구매 경험은?", type: "single", options: ["없음", "1개", "2-3개", "3개 이상"], reward: 15, required: true },
            { id: "h6", order: 6, question: "온라인 쇼핑 비중은 전체의 몇 %?", type: "single", options: ["20% 미만", "20-40%", "40-60%", "60-80%", "80% 이상"], reward: 10, required: true },
            { id: "h7", order: 7, question: "패션 아이템 구매 빈도는?", type: "single", options: ["월 1회 미만", "월 1-2회", "월 3회 이상", "시즌마다"], reward: 10, required: true },
            { id: "h8", order: 8, question: "외식/배달 빈도는?", type: "single", options: ["거의 안함", "주 1-2회", "주 3-4회", "거의 매일"], reward: 10, required: true },
            { id: "h9", order: 9, question: "헬스/피트니스 관련 지출은?", type: "single", options: ["없음", "월 10만원 미만", "월 10-30만원", "월 30만원 이상"], reward: 10, required: true },
            { id: "h10", order: 10, question: "최근 구독 시작한 서비스는?", type: "multiple", options: ["OTT(넷플릭스 등)", "음악(멜론 등)", "뉴스/잡지", "클라우드/생산성", "없음"], reward: 10, required: true }
        ]
    },
    lifecycle: {
        id: "lifecycle",
        category: "lifecycle",
        categoryNameKo: "생애 주기",
        order: 6,
        completionBonus: 150,
        isActive: true,
        questions: [
            { id: "l1", order: 1, question: "현재 주거 형태는?", type: "single", options: ["부모님과 동거", "자취/원룸", "아파트/자가", "아파트/전월세", "기타"], reward: 15, required: true },
            { id: "l2", order: 2, question: "향후 1년 내 계획은?", type: "multiple", options: ["이직/취업", "결혼", "출산", "이사", "차량구매", "해외여행", "없음"], reward: 15, required: true },
            { id: "l3", order: 3, question: "자녀가 있다면 연령대는?", type: "single", options: ["자녀 없음", "영유아(0-6세)", "초등학생", "중고등학생", "성인 자녀"], reward: 10, required: true },
            { id: "l4", order: 4, question: "반려동물을 키우고 있나요?", type: "single", options: ["없음", "강아지", "고양이", "기타 동물", "2마리 이상"], reward: 10, required: true, taxonomyMapping: { "강아지": ["Home_Living.Pet_Supplies"], "고양이": ["Home_Living.Pet_Supplies"] } },
            { id: "l5", order: 5, question: "가장 관심있는 취미/여가는?", type: "multiple", options: ["운동/피트니스", "게임", "독서", "음악/공연", "여행", "요리", "투자/재테크"], reward: 15, required: true, taxonomyMapping: { "운동/피트니스": ["Health_Wellness.Fitness"], "게임": ["Entertainment.Gaming"], "여행": ["Travel"], "요리": ["Food_Beverage"] } },
            { id: "l6", order: 6, question: "건강 관리에 얼마나 투자하나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["거의 안함", "많이 투자"] },
            { id: "l7", order: 7, question: "보험 가입 상태는?", type: "single", options: ["없음", "기본만", "여러 개", "종합보험"], reward: 10, required: true },
            { id: "l8", order: 8, question: "자기계발에 투자하는 편인가요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["거의 안함", "적극 투자"] },
            { id: "l9", order: 9, question: "환경/사회 문제에 관심이 있나요?", type: "slider", min: 1, max: 5, reward: 10, required: true, sliderLabels: ["무관심", "매우 관심"] },
            { id: "l10", order: 10, question: "향후 가장 큰 예상 지출은?", type: "single", options: ["주거(전월세/매매)", "자동차", "결혼/육아", "교육/자기계발", "여행", "특별히 없음"], reward: 15, required: true }
        ]
    }
};

async function checkAndUpload() {
    console.log("🔍 Checking 'surveys' collection...");
    const snapshot = await db.collection("surveys").get();

    console.log(`📊 Found ${snapshot.size} documents in 'surveys' collection.`);

    if (snapshot.size === 0) {
        console.log("⚠️ Collection is empty. Uploading survey data...");
        const batch = db.batch();

        for (const [categoryId, survey] of Object.entries(surveyData)) {
            const ref = db.doc(`surveys/${categoryId}`);
            batch.set(ref, survey);
        }

        await batch.commit();
        console.log("✅ Surveys uploaded successfully!");
    } else {
        console.log("✅ Survey data already exists. No action needed.");
        // Optional: Force update if you want to ensure data consistency
        // console.log("🔄 Force updating survey data...");
    }

    // Permission Verification Instruction
    console.log("\n-----------------------------------------------------------");
    console.log("⚠️  IMPORTANT: PERMISSION CHECK");
    console.log("To ensure 'getSurveys' and 'uploadSurveys' are accessible,");
    console.log("please ensure the Cloud Run service has proper permissions.");
    console.log("Run the following commands in your terminal if you encounter 403 errors:");
    console.log("");
    console.log("gcloud run services add-iam-policy-binding getSurveys \\");
    console.log("  --region us-central1 \\");
    console.log("  --member=allUsers \\");
    console.log("  --role=roles/run.invoker");
    console.log("");
    console.log("gcloud run services add-iam-policy-binding uploadSurveys \\");
    console.log("  --region us-central1 \\");
    console.log("  --member=allUsers \\");
    console.log("  --role=roles/run.invoker");
    console.log("-----------------------------------------------------------");
}

checkAndUpload().catch(console.error);
