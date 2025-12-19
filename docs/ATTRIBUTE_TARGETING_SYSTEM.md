# VIEW Attribute Targeting System

## 개요

VIEW Attribute Targeting System은 사용자의 행동 데이터와 설문 응답을 기반으로 속성 점수를 계산하고, 이를 활용하여 AI 기반 광고 타겟팅을 제공하는 시스템입니다.

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                           VIEW Platform                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐    │
│  │  User App   │────▶│  Firestore  │◀────│  Cloud Functions    │    │
│  │  (Mobile/Web)│     │  Database   │     │  (Backend Logic)    │    │
│  └─────────────┘     └─────────────┘     └─────────────────────┘    │
│         │                   │                       │                 │
│         ▼                   ▼                       ▼                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐    │
│  │  Surveys    │     │  Taxonomy   │     │  AI Recommendation  │    │
│  │  Activities │     │  YAML Config│     │  Engine             │    │
│  └─────────────┘     └─────────────┘     └─────────────────────┘    │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                        Advertiser Portal                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐    │
│  │  Create     │     │  Audience   │     │  Campaign           │    │
│  │  Campaign   │     │  Targeting  │     │  Notifications      │    │
│  └─────────────┘     └─────────────┘     └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 핵심 컴포넌트

### 1. Taxonomy System

#### 파일 구조
```
/VIEW
├── taxonomy_v1.yaml          # Industry + Attribute 통합 정의
└── functions/src/index.ts    # Taxonomy 관리 API
```

#### Industry 카테고리 (10개)
- Fashion, Beauty, Technology, Food_Beverage, Travel
- Finance, Health_Wellness, Education, Entertainment, Home_Living

#### Attribute 카테고리 (6개)
- **Price_Positioning**: Mass, Value, Mid, Premium, Luxury
- **Sustainability**: Eco_Friendly, Vegan, Fair_Trade, Cruelty_Free, Organic
- **Business_Model**: DTC, Subscription, Marketplace, C2C, Rental
- **Channel_Preference**: Online_First, Mobile_First, Omnichannel, Social_Commerce
- **Brand_Identity**: Heritage, Innovator, Challenger, Niche
- **Purchase_Decision_Style**: Brand_Loyal, Deal_Seeker, Trend_Seeker, Impulse

---

### 2. Attribute Score Calculation

#### 트리거 이벤트
| 트리거 | 함수명 | 설명 |
|--------|--------|------|
| 수동 | `calculateAttributeScores` | 사용자 요청 시 계산 |
| 스케줄 | `scheduleAttributeScoreUpdate` | 매일 3AM UTC 자동 실행 |
| 설문 완료 | `onSurveyCompleted` | 핵심 설문 완료 시 자동 계산 |
| 활동 마일스톤 | `onActivityMilestone` | 10/50/100/200/500 활동 도달 시 |
| 관리자 | `batchRecalculateAttributeScores` | 일괄 재계산 |

#### 점수 계산 로직
```typescript
// 설문 응답 → 속성 매핑
'spending.luxury_fashion' → Price_Positioning.Luxury: +0.8
'values.eco_friendly'     → Sustainability.Eco_Friendly: +0.9
'purchase.online_always'  → Channel_Preference.Online_First: +1.0

// 활동 데이터 → 보정
brandLoyalty > 0.7 → Purchase_Decision_Style.Brand_Loyal: +0.7
impulseBuying > 0.6 → Purchase_Decision_Style.Impulse: +0.6
```

#### 데이터 구조
```
Firestore:
users/{uid}/persona/current
├── attributeScores: {
│   "Price_Positioning.Premium": 0.75,
│   "Sustainability.Eco_Friendly": 0.82,
│   "Channel_Preference.Online_First": 0.90
│ }
├── attributeScoresUpdatedAt: Timestamp
└── ...

users/{uid}
├── topAttributes: ["Price_Positioning.Premium", "Sustainability.Eco_Friendly", ...]
└── attributeScoresCount: 8
```

---

### 3. AI Recommendation Engine

#### getAttributeRecommendations API
```typescript
// 요청
{
    industryPaths: ['Fashion.Apparel', 'Beauty.Skincare'],
    objective: 'conversion',  // or 'awareness'
    budget: 100000,
    existingCampaignId?: 'abc123'  // 기존 캠페인 최적화
}

// 응답
{
    success: true,
    recommendations: [
        {
            attribute: "Price_Positioning.Premium",
            type: "Price_Positioning",
            value: "Premium",
            score: 85,
            reason: "높은 전환율 15.2% 기록",
            estimatedReach: 3200,
            estimatedCVR: 15.2,
            priority: "high"
        }
    ],
    optimization?: {
        currentPerformance: {...},
        suggestedChanges: [...],
        potentialImprovement: 25
    }
}
```

#### 추천 알고리즘
```
Score = Base(50) + Performance + Reach + Objective + Industry

1. Historical Performance (최대 +40점)
   - CVR Bonus: cvr × 2
   - Volume Bonus: min(20, conversions × 0.1)

2. User Availability (최대 +15점)
   - reachPercent × 0.5

3. Objective Alignment (가중치)
   - awareness: Channel_Preference 1.0, Business_Model 0.8
   - conversion: Price_Positioning 1.0, Purchase_Decision_Style 1.0

4. Industry Relevance (+20% bonus)
```

#### getAITargetingAssistant API (자연어)
```typescript
// 요청
{
    productDescription: "친환경 비건 뷰티 브랜드...",
    targetAudience?: "20대 여성",
    goal: "conversion"
}

// 응답
{
    suggestions: {
        industries: ["Beauty.Skincare"],
        attributes: {
            Price_Positioning: ["Premium"],
            Sustainability: ["Eco_Friendly", "Vegan"]
        },
        reasoning: "Beauty.Skincare 산업으로 분류..."
    }
}
```

---

### 4. Campaign Optimization Notifications

#### 알림 유형
| Type | 아이콘 | 트리거 조건 |
|------|--------|-------------|
| `warning` | ⚠️ | CTR < 1%, CVR < 5%, CPA 과다 |
| `success` | 🎉 | CVR ≥ 15% 달성 |
| `optimization` | 💡 | AI 타겟팅 최적화 제안 |
| `info` | ℹ️ | 예산 소진 속도 알림 |

#### 자동 분석 스케줄
- **주기**: 6시간마다 (0 */6 * * *)
- **대상**: status = 'active' 캠페인
- **분석 기간**: 최근 7일 데이터

#### Firestore 구조
```
advertisers/{uid}/notifications/{notificationId}
├── type: 'warning' | 'success' | 'optimization' | 'info'
├── title: string
├── message: string
├── priority: 'high' | 'medium' | 'low'
├── suggestedAction: string
├── campaignId: string
├── campaignName: string
├── read: boolean
├── createdAt: Timestamp
└── readAt?: Timestamp
```

---

## UI 컴포넌트

### 1. CreateCampaign AI 타겟팅 어시스턴트
- 자연어 입력으로 타겟팅 제안
- 선택한 산업 기반 속성 추천
- 원클릭 추천 적용

### 2. Profile Attribute 대시보드
- 카테고리별 속성 점수 시각화
- Top 속성 태그 표시
- 마지막 업데이트 시간

### 3. Advertiser Notification Bell
- 실시간 알림 카운트 배지
- 드롭다운 알림 목록
- 읽음/모두 읽음 처리

---

## Cloud Functions 목록

### Taxonomy 관리
| 함수 | 설명 |
|------|------|
| `getTaxonomy` | Taxonomy YAML 조회 |
| `updateTaxonomy` | Taxonomy 업데이트 (Admin) |

### Attribute Score
| 함수 | 설명 |
|------|------|
| `calculateAttributeScores` | 수동 속성 점수 계산 |
| `scheduleAttributeScoreUpdate` | 일일 자동 계산 (3AM UTC) |
| `onSurveyCompleted` | 설문 완료 트리거 |
| `onActivityMilestone` | 활동 마일스톤 트리거 |
| `batchRecalculateAttributeScores` | 일괄 재계산 (Admin) |

### AI 추천
| 함수 | 설명 |
|------|------|
| `getAttributeRecommendations` | AI 속성 추천 |
| `getAITargetingAssistant` | 자연어 타겟팅 제안 |

### 알림 시스템
| 함수 | 설명 |
|------|------|
| `analyzeCampaignPerformance` | 캠페인 성과 분석 (6시간) |
| `getCampaignNotifications` | 알림 조회 |
| `markNotificationRead` | 알림 읽음 처리 |
| `triggerCampaignAnalysis` | 수동 분석 트리거 (Admin) |

---

## 배포 명령어

```bash
# 전체 함수 배포
cd functions && npm run build
firebase deploy --only functions

# 특정 함수 배포
firebase deploy --only functions:calculateAttributeScores,functions:getAttributeRecommendations

# Taxonomy 초기화
firebase deploy --only functions:getTaxonomy,functions:updateTaxonomy
```

---

## 필요 Firestore 인덱스

```
campaigns (status, createdAt)
campaignAnalytics (campaignId, createdAt)
advertisers/{uid}/notifications (read, createdAt)
```

---

## 환경 변수

```env
# .env (functions/)
# Firebase 자동 구성
```

---

## 향후 개선 사항

1. **LLM 통합**: OpenAI/Gemini API로 자연어 분석 고도화
2. **A/B 테스트**: 속성 조합별 성과 비교 실험
3. **Lookalike Audience**: 유사 사용자 그룹 자동 생성
4. **Real-time Bidding**: 속성 매칭 기반 실시간 입찰 최적화

---

*Last Updated: 2024-12-19*
