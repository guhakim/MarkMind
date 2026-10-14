# MarkMind — AI 북마크 정리 서비스

> URL 하나만 저장하세요. 페이지를 크롤링해 제목·설명·카테고리·태그를 자동으로 채우고, 나중에 쉽게 찾을 수 있도록 정리해드립니다.

🔗 **서비스 주소**: [https://markmind-nu.vercel.app](https://markmind-nu.vercel.app)

---

## 기획 배경

수백 개의 북마크를 저장해두고도 정작 필요할 때 찾지 못하는 문제를 해결하기 위해 만든 서비스입니다.
기존 북마크는 제목만 저장되어 분류·검색이 어렵고, 직접 폴더를 만들고 분류하는 작업이 번거롭습니다.
MarkMind는 URL 하나만 넣으면 페이지 내용을 읽어 자동으로 분류·정리해 스마트하게 관리해줍니다.

---

## 주요 기능

### 자동 분석 & 분류 (규칙 기반)
- URL을 입력하면 해당 페이지를 크롤링하여 **제목, 설명, 카테고리, 태그**를 자동 생성
- OG 메타태그, 제목, 헤딩을 파싱해 정보를 추출
- 은행·AI·디자인 등 자주 쓰는 도메인은 20여 개의 **확정 매핑 테이블**로 즉시 처리
- 매핑에 없는 도메인은 제목·설명 텍스트에 대한 **키워드 정규식**으로 카테고리와 태그를 추론

> 분류 로직은 전부 `app/api/analyze/route.ts` 안의 도메인 매핑 테이블 + 키워드 정규식입니다.
> **LLM(모델) 호출은 코드 어디에도 없습니다.** 앱 UI에 보이는 "AI" 표현은 제품 네이밍이며,
> 실제 구현은 서버 측 규칙 기반 분류입니다.

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
- 기존 북마크를 한 번에 `/api/analyze`로 다시 돌려 카테고리·태그 최신화

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
| URL 분석/분류 | HTML 크롤링 + 규칙 기반 분류 (도메인 매핑 + 키워드 정규식, LLM 호출 없음) |
| 배포 | [Vercel](https://vercel.com) |
| 스케줄러 | Vercel Cron (`0 0 * * *` — 매일 자정) |
| 린트 | ESLint 9 flat config + `eslint-config-next` (`npm run lint`) |

---

## 프로젝트 구조

```
markmind/
├── app/
│   ├── page.tsx                    # 메인 북마크 앱 (로그인 분기 — 비로그인 시 LandingPage)
│   ├── layout.tsx                  # 전역 레이아웃 (Theme > Language > Auth Provider), 메타데이터, PWA
│   ├── globals.css                 # 전역 스타일 (유일한 전역 CSS)
│   ├── login/page.tsx              # /login — 공용 LandingPage를 렌더하는 얇은 페이지
│   └── api/
│       ├── analyze/route.ts        # URL 분석 API (크롤링 + 도메인 매핑/키워드 규칙 분류)
│       ├── check-update/route.ts   # 콘텐츠 변경 감지 + 클라이언트 푸시
│       └── cron/check-updates/     # Vercel Cron 서버 측 일괄 체크
│           └── route.ts
├── components/
│   ├── landing-page.tsx            # 랜딩/로그인 공용 화면 + Google 로그인(팝업→redirect 폴백)
│   ├── bookmark-card.tsx           # 북마크 카드 UI (벨·수정·삭제·이동)
│   ├── add-bookmark-dialog.tsx     # 북마크 추가 다이얼로그
│   ├── edit-bookmark-dialog.tsx    # 북마크 수정 다이얼로그
│   ├── category-sidebar.tsx        # 카테고리 사이드바 (데스크탑)
│   ├── header.tsx                  # 헤더 (검색바, 알림, 유저 메뉴)
│   ├── user-menu.tsx               # 아바타 드롭다운 (문의하기 · 로그아웃)
│   ├── contact-form.tsx            # 문의 폼 단일 구현 (web3forms, variant: dialog | page)
│   ├── contact-dialog.tsx          # 문의 폼을 감싸는 다이얼로그
│   ├── language-toggle.tsx         # 한국어 / English 전환 버튼
│   ├── theme-provider.tsx          # next-themes 래퍼
│   ├── firebase-auth-provider.tsx  # Firebase 인증 Context + 비활동 자동 로그아웃
│   └── ui/                         # shadcn/ui 컴포넌트 모음
├── lib/
│   ├── types.ts                    # Bookmark 타입 정의
│   ├── bookmarks.ts                # Firestore CRUD + localStorage 마이그레이션
│   ├── firebase.ts                 # Firebase 클라이언트 초기화 (설정값 하드코딩)
│   ├── firebase-admin.ts           # Firebase Admin SDK (서버 전용)
│   ├── firebase-messaging.ts       # Web Push 구독 처리
│   ├── i18n.tsx                    # LanguageProvider + useLanguage / t()
│   ├── translations.ts             # ko / en 사전
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
├── .env.example                    # 환경 변수 템플릿
├── eslint.config.mjs               # ESLint flat config (Next.js + TypeScript)
├── vercel.json                     # Vercel Cron 스케줄 설정
├── netlify.toml                    # Netlify 빌드 + 보안 헤더 (next.config.mjs와 동일하게 유지)
├── next.config.mjs                 # Next.js 설정 (보안 헤더 등)
└── firestore.rules                 # Firestore 보안 규칙
```

> `lib/` 하위에는 API 라우트가 공유하는 서버 모듈(URL 검증·콘텐츠 해시·푸시 발송·토큰 검증)이
> 추가로 들어 있습니다. 파일 목록은 저장소를 직접 확인하세요.

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

`.env.example`를 `.env.local`로 복사해 채워 넣으면 됩니다. Firebase 클라이언트 설정(apiKey 등)은
환경 변수가 아니라 `lib/firebase.ts`에 직접 작성되어 있습니다.

| 변수명 | 설명 |
|--------|------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK 서비스 계정 JSON (문자열) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push VAPID 공개 키 |
| `VAPID_PRIVATE_KEY` | Web Push VAPID 비밀 키 |
| `CRON_SECRET` | Cron 엔드포인트 보호용 시크릿 |
| `NEXT_PUBLIC_WEB3FORMS_KEY` | 문의 폼 web3forms access key (공개 키, 미설정 시 코드 내 기본값 사용) |

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

`users/{uid}` 문서의 `pushSubscription` 필드는 로그인 직후 클라이언트가 직접 기록합니다
(`components/firebase-auth-provider.tsx`). 따라서 `firestore.rules`가 `users/{uid}` 문서 자체에 대한
본인 쓰기를 허용해야 하며, 서브컬렉션(`bookmarks`)만 허용하면 이 쓰기가 조용히 실패해
서버 cron이 푸시를 보낼 수 없습니다.

---

## 보안

- **Firestore 규칙**: 본인의 데이터만 읽기·쓰기 가능
- **보안 헤더**: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Strict-Transport-Security`는 `next.config.mjs`와 `netlify.toml`에
  동일한 값으로 정의 — 한쪽만 고치지 말 것
- **CSP (nonce 기반)**: `Content-Security-Policy`는 `proxy.ts`가 요청마다 base64 nonce를
  만들어 요청·응답 헤더에 함께 넣는 단일 출처입니다. `next.config.mjs`와 `netlify.toml`에는
  CSP를 두지 않습니다(중복되면 브라우저가 두 정책을 각각 강제해서 추적이 불가능해집니다).
  `script-src`에는 `'unsafe-inline'`이 없고 `'unsafe-eval'`은 개발 모드에서만 붙습니다.
  Next.js 부트스트랩·번들 스크립트는 요청 CSP 헤더를 보고 자동으로 nonce를 받고,
  `next-themes`의 인라인 테마 스크립트는 `app/layout.tsx`가 `x-nonce`를 읽어 직접 넘깁니다.
- **CSP 남은 한계 (주의)**: `style-src`에는 `'unsafe-inline'`이 남아 있습니다.
  React가 `style={{...}}`를 inline style 속성으로 렌더하고(`style-src-attr`가 지배하므로
  nonce로 허용 불가), `sonner`가 런타임에 nonce 없는 `<style>` 요소를 주입하기 때문입니다.
- **nonce의 대가**: nonce는 요청마다 달라지므로 `/`, `/login`, `/_not-found`가
  정적 프리렌더(○)에서 요청별 동적 렌더(ƒ)로 바뀌었습니다. CDN 캐싱·ISR·PPR은 쓸 수 없습니다.
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
