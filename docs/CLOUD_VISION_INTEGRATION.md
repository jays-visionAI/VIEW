# Cloud Vision API 통합 - 호환성 검토 및 구현 가이드

## 📋 개요

로또 티켓 이미지에서 번호를 추출하는 기능을 개선하기 위해 Google Cloud Vision API 통합을 검토합니다.

---

## 🔍 현재 구현 분석

### 기존 방식: Tesseract.js (브라우저 OCR)
```typescript
// 현재 Jackpot.tsx의 processImageWithOCR 함수
const { data: { text } } = await Tesseract.recognize(url, 'eng');
```

### 한계점
| 문제 | 영향 |
|------|------|
| 일반 OCR 엔진 | 로또 티켓 특화 아님, 인식률 낮음 |
| 브라우저 의존성 | Tesseract.js CDN 로드 필요 |
| 성능 | 클라이언트 측 처리로 느림 |
| 이미지 품질 | 전처리 없이 원본 이미지 사용 |

---

## 🌐 Cloud Vision API 아키텍처 옵션

### Option A: 서버사이드 처리 (권장)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │────▶│   Firebase   │────▶│ Cloud Vision │
│ (Mobile/Web) │     │  Functions   │     │     API      │
│  이미지 업로드  │     │  OCR 처리    │     │  텍스트 추출  │
└──────────────┘     └──────────────┘     └──────────────┘
```

**장점:**
- ✅ 모든 플랫폼 동일하게 동작 (Web, iOS, Android)
- ✅ API 키가 서버에만 존재 (보안)
- ✅ 클라이언트 부하 없음
- ✅ 이미지 전처리 서버에서 가능

**단점:**
- ⚠️ Firebase Functions 호출 비용
- ⚠️ 이미지 업로드 대역폭
- ⚠️ Cloud Vision API 비용 ($1.50/1000 요청)

### Option B: 클라이언트 직접 호출 (비권장)

```
┌──────────────┐     ┌──────────────┐
│   Client     │────▶│ Cloud Vision │
│ (Mobile/Web) │     │     API      │
│   직접 호출    │     │  텍스트 추출  │
└──────────────┘     └──────────────┘
```

**장점:**
- 빠른 응답 (서버 경유 없음)

**단점:**
- ❌ API 키 노출 위험
- ❌ 네이티브 앱에서 별도 SDK 필요
- ❌ 플랫폼별 구현 다름

---

## 📱 플랫폼별 호환성 분석

### 1. 모바일 웹 (PWA)

| 항목 | Option A (서버) | Option B (클라이언트) |
|------|----------------|---------------------|
| 이미지 캡처 | `<input type="file" capture>` | 동일 |
| API 호출 | Firebase Functions | fetch + CORS 문제 |
| 성능 | 이미지 업로드 시간 | 직접 호출 (CORS 제한) |
| 권장도 | ✅ 권장 | ❌ CORS 문제 |

### 2. iOS 네이티브 (Capacitor)

| 항목 | Option A (서버) | Option B (클라이언트) |
|------|----------------|---------------------|
| 이미지 캡처 | Capacitor Camera API | 동일 |
| API 호출 | Firebase Functions | Google Cloud iOS SDK |
| 추가 구현 | 없음 | CocoaPods 의존성 추가 |
| 권장도 | ✅ 권장 | ⚠️ 복잡도 증가 |

### 3. Android 네이티브 (Capacitor)

| 항목 | Option A (서버) | Option B (클라이언트) |
|------|----------------|---------------------|
| 이미지 캡처 | Capacitor Camera API | 동일 |
| API 호출 | Firebase Functions | ML Kit (on-device) |
| 추가 구현 | 없음 | ML Kit 번들링 |
| 권장도 | ✅ 권장 | ⚠️ 앱 크기 증가 |

---

## ⚠️ 제약 요소

### 1. 비용
| 서비스 | 무료 티어 | 이후 비용 |
|--------|----------|----------|
| Cloud Vision TEXT_DETECTION | 1,000 요청/월 | $1.50/1,000 요청 |
| Firebase Functions | 2M 호출/월 | $0.40/M 호출 |
| Firebase Storage | 5GB | $0.026/GB |

**예상 비용 (월 10,000 스캔):**
- Cloud Vision: ~$15
- Functions: ~$4
- Storage: ~$1
- **총: ~$20/월**

### 2. 이미지 크기 제한
| 제한 | 값 |
|------|-----|
| 최대 이미지 크기 | 20MB (base64) / 10MB (URL) |
| 권장 해상도 | 1024x768 이상 |
| 지원 포맷 | JPEG, PNG, GIF, BMP, WEBP |

### 3. 네트워크 의존성
- 오프라인 사용 불가
- 느린 네트워크에서 타임아웃 가능 (default: 60초)

### 4. 한국 로또 특화 문제
- Cloud Vision은 일반 OCR이므로 로또 티켓 특화 학습 없음
- QR 코드 인식은 별도 처리 필요
- 티켓 디자인 변경 시 정규식 조정 필요

---

## ✅ 권장 구현 방식

```
┌─────────────────────────────────────────────────────────────┐
│                     권장 아키텍처                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 클라이언트 (Web/iOS/Android)                            │
│     ├─ 카메라로 로또 티켓 촬영                               │
│     ├─ 이미지 리사이즈 (max 1024px)                         │
│     └─ Firebase Function 호출 (base64 전송)                 │
│                                                             │
│  2. Firebase Function: extractLottoNumbers                  │
│     ├─ 이미지 수신 (base64)                                 │
│     ├─ Cloud Vision TEXT_DETECTION 호출                    │
│     ├─ 1~45 숫자 정규식 추출                                │
│     ├─ 6개 미만 시 폴백 (랜덤 또는 에러)                    │
│     └─ 결과 반환 { numbers: [1,5,12,23,34,45] }            │
│                                                             │
│  3. 클라이언트                                              │
│     └─ 결과 표시 → 사용자 확인 → 티켓 등록                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 구현 체크리스트

- [ ] Google Cloud Console에서 Vision API 활성화
- [ ] Firebase Functions에 `extractLottoNumbers` 함수 추가
- [ ] Jackpot.tsx에서 서버 API 호출로 변경
- [ ] 이미지 리사이즈 유틸리티 추가
- [ ] 에러 핸들링 (API 실패, 타임아웃)
- [ ] 테스트 (다양한 티켓 이미지)

---

## 🔧 대안: 하이브리드 접근

초기에는 **Tesseract.js 폴백**을 유지하면서 Cloud Vision을 추가:

```typescript
const extractNumbers = async (imageBase64: string) => {
    try {
        // 1차: Cloud Vision API (서버)
        const result = await httpsCallable(functions, 'extractLottoNumbers')({ image: imageBase64 });
        return result.data.numbers;
    } catch (error) {
        // 2차: Tesseract.js (클라이언트 폴백)
        console.warn('Cloud Vision failed, falling back to Tesseract');
        return await tesseractExtract(imageBase64);
    }
};
```

---

*Last Updated: 2024-12-19*
