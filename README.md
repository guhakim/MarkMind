# MarkMind — AI 북마크 정리 서비스

> URL 하나만 저장하세요. AI가 자동으로 분석하고, 카테고리를 분류하고, 나중에 쉽게 찾을 수 있도록 정리해드립니다.

🔗 **서비스 주소**: [https://markmind-nu.vercel.app](https://markmind-nu.vercel.app)

---

## 기획 배경

수백 개의 북마크를 저장해두고도 정작 필요할 때 찾지 못하는 문제를 해결하기 위해 만든 서비스입니다.
기존 북마크는 제목만 저장되어 분류·검색이 어렵고, 직접 폴더를 만들고 분류하는 작업이 번거롭습니다.
MarkMind는 URL 하나로 AI가 내용을 자동 분석·분류하여 스마트하게 관리해줍니다.

---

## 주요 기능

### AI 자동 분석
- URL을 입력하면 해당 페이지를 크롤링하여 **제목, 설명, 카테고리, 태그**를 자동 생성
- OG 메타태그, 제목, 헤딩 등을 종합 분석해 최적의 정보를 추출
- 은행·AI·디자인 등 자주 쓰는 도메인은 **확정 매핑**으로 즉시 처리

### 카테고리 자동 분류 (11개)
`AI` · `디자인` · `쇼핑` · `기술` · `뉴스` · `엔터테인먼트` · `교육` · `비즈니스` · `소셜` · `금융` · `기타`

### 드래그 & 드롭 저장
- 브라우저에서 링크를 그대로 앱으로 드래그하면 자동 분석 후 저장

### 콘텐츠 변경 감지 & 푸시 알림
- 벨 아이콘으로 특정 북마크를 구독하면 해당 페이지가 변경됐을 때 **Web Push 알림** 전송
- 클라이언트: 로그인 시 6시간마다 자동 체크
- 서버: Vercel Cron으로 매일 자정 전체 구독 북마크 일괄 체크

### 검색 & 필터
- 제목, 설명, 태그, URL 통합 검색
- 카테고리 사이드바(데스크탑) / 가로 스크롤 탭(모바일) 필터

### 전체 재분석
- 기존 북마크를 한 번에 AI로 재분석하여 카테고리·태그 최신화

### 보안 자동 로그아웃
- 3분 비활동 시 자동 로그아웃 (30초 전 경고 토스트)
- 세션 persistence — 탭 닫으면 자동 로그아웃

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| 언어 | TypeScript 5.7 |
| 스타일 | Tailwind CSS v4 |
| UI 컴포넌트 | shadcn/ui (Radix UI) |
| 인증 | Firebase Authentication (Google OAuth) |
| 데이터베이스 | Firebase Firestore (유저별 서브컬렉션) |
| 서버 기능 | Next.js API Routes (Edge/Node.js) |
| 푸시 알림 | Web Push API + VAPID + `web-push` 라이브러리 |
| AI 분석 | HTML 크롤링 + 규칙 기반 분류 (`@anthropic-ai/sdk` 내장) |
| 배포 | [Vercel](https://vercel.com) |
| 스케줄러 | Vercel Cron (`0 0 * * *` — 매일 자정) |

---

## 프로젝트 구조

```
markmind/
├── app/
│   ├── page.tsx                    # 메인 북마크 앱 (로그인 분기)
│   ├── layout.tsx                  # 전역 레이아웃, 메타데이터, PWA 설정
│   ├── globals.css                 # 전역 스타일
│   ├── login/page.tsx              # 로그인 페이지
│   └── api/
│       ├── analyze/route.ts        # URL 분석 API (크롤링 + 카테고리 추론)
│       ├── check-update/route.ts   # 콘텐츠 변경 감지 + 클라이언트 푸시
│       └── cron/check-updates/     # Vercel Cron 서버 측 일괄 체크
│           └── route.ts
├── components/
│   ├── bookmark-card.tsx           # 북마크 카드 UI (벨·수정·삭제·이동)
│   ├── add-bookmark-dialog.tsx     # 북마크 추가 다이얼로그
│   ├── edit-bookmark-dialog.tsx    # 북마크 수정 다이얼로그
│   ├── category-sidebar.tsx        # 카테고리 사이드바 (데스크탑)
│   ├── header.tsx                  # 헤더 (검색바, 알림, 유저 메뉴)
│   ├── landing-page.tsx            # 랜딩 페이지 (비로그인)
│   ├── firebase-auth-provider.tsx  # Firebase 인증 Context + 비활동 감지
│   └── ui/                         # shadcn/ui 컴포넌트 모음
├── lib/
│   ├── types.ts                    # Bookmark 타입 정의
│   ├── bookmarks.ts                # Firestore CRUD + localStorage 마이그레이션
│   ├── firebase.ts                 # Firebase 클라이언트 초기화
│   ├── firebase-admin.ts           # Firebase Admin SDK (서버 전용)
│   ├── firebase-messaging.ts       # Web Push 구독 처리
│   └── utils.ts                    # 유틸 함수 (cn 등)
├── hooks/
│   ├── use-toast.ts
│   └── use-mobile.ts
├── public/
│   ├── favicon.ico                 # 파비콘 (16·32·48px 다중)
│   ├── icon-192.png                # PWA 아이콘
│   ├── icon-512.png                # PWA 아이콘
│   ├── apple-icon.png              # Apple 홈화면 아이콘
│   ├── manifest.json               # PWA 매니페스트
│   └── firebase-messaging-sw.js    # 푸시 알림 Service Worker
├── vercel.json                     # Vercel Cron 스케줄 설정
├── next.config.mjs                 # Next.js 설정 (보안 헤더 등)
└── firestore.rules                 # Firestore 보안 규칙
```

---

## API 엔드포인트

### `POST /api/analyze`
URL을 받아 페이지를 크롤링하고 북마크 정보를 반환합니다.

**Request**
```json
{ "url": "https://example.com" }
```

**Response**
```json
{
  "title": "Example",
  "description": "페이지 설명",
  "category": "기술",
  "tags": ["개발", "오픈소스"]
}
```

---

### `POST /api/check-update`
북마크 URL의 콘텐츠 해시를 비교해 변경 여부를 반환하고 변경 시 푸시 알림을 전송합니다.

**Request**
```json
{
  "url": "https://example.com",
  "currentHash": "abc123",
  "pushSubscription": { ... },
  "bookmarkTitle": "Example"
}
```

**Response**
```json
{ "changed": true, "hash": "def456" }
```

---

### `GET /api/cron/check-updates`
Vercel Cron이 매일 자정 호출하는 서버 측 일괄 체크 엔드포인트입니다.  
`Authorization: Bearer {CRON_SECRET}` 헤더로 보호됩니다.

---

## 환경 변수

| 변수명 | 설명 |
|--------|------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK 서비스 계정 JSON (문자열) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push VAPID 공개 키 |
| `VAPID_PRIVATE_KEY` | Web Push VAPID 비밀 키 |
| `CRON_SECRET` | Cron 엔드포인트 보호용 시크릿 |

---

## 로컬 개발 환경 설정

```bash
# 1. 저장소 클론
git clone https://github.com/guhakim/markmind.git
cd markmind

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정 (.env.local 파일 생성)
cp .env.example .env.local
# .env.local에 위 환경 변수 값을 입력

# 4. Firebase Console에서 로컬 도메인 승인
# Firebase Console → Authentication → Settings → 승인된 도메인
# localhost 추가

# 5. 개발 서버 실행
npm run dev
```

---

## 데이터 구조 (Firestore)

```
users/
  {uid}/
    pushSubscription: PushSubscriptionJSON   # Web Push 구독 정보
    bookmarks/
      {bookmarkId}/
        url: string
        title: string
        description: string
        category: string
        tags: string[]
        favicon: string | null
        notifications: number
        notifyEnabled: boolean
        createdAt: Timestamp
        lastVisited: Timestamp | null
        contentHash: string         # 마지막 확인한 페이지 해시 (MD5)
        lastChecked: Timestamp | null
```

---

## 보안

- **Firestore 규칙**: 본인의 데이터만 읽기·쓰기 가능
- **보안 헤더**: `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy` 등 적용
- **URL 검증**: `http/https` 프로토콜만 허용, XSS 방지
- **Cron 보호**: `CRON_SECRET` Bearer 토큰 인증
- **자동 로그아웃**: 3분 비활동 시 자동 세션 종료

---

## PWA 지원

`manifest.json` 및 Service Worker를 통해 PWA로 설치 가능합니다.

- 홈화면 추가 지원 (iOS / Android)
- 오프라인 캐시 (Firestore 오프라인 퍼시스턴스)
- Web Push 알림

---

## 라이선스

MIT License © 2025 MarkMind
