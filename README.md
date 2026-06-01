# MarkMind — AI 북마크 정리 서비스

> **AI가 북마크를 자동으로 분석·분류해 주는 스마트 북마크 관리 서비스**

🔗 **배포 주소**: [https://markmind-nu.vercel.app](https://markmind-nu.vercel.app)

---

## 목차

1. [서비스 소개](#서비스-소개)
2. [주요 기능](#주요-기능)
3. [기술 스택](#기술-스택)
4. [아키텍처](#아키텍처)
5. [제작 과정](#제작-과정)
6. [화면 구성](#화면-구성)
7. [시작하기](#시작하기)
8. [폴더 구조](#폴더-구조)
9. [환경 변수](#환경-변수)
10. [배포](#배포)
11. [라이선스](#라이선스)

---

## 서비스 소개

**MarkMind**는 사용자가 저장한 URL을 AI가 자동으로 분석해 카테고리·태그를 붙여주는 북마크 관리 서비스입니다.

기존 브라우저 북마크는 폴더 구조로 직접 정리해야 하는 번거로움이 있었습니다. MarkMind는 URL을 저장하면 제목·설명·썸네일을 자동으로 가져오고, AI가 `AI / Design / Technology / Business` 등의 카테고리로 즉시 분류합니다.

Google 계정으로 가입하면 별도 설정 없이 바로 사용할 수 있으며, 신용카드 정보도 필요하지 않습니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **AI 자동 분석** | 저장된 북마크를 AI가 읽고 자동으로 카테고리·태그 부여 |
| **스마트 정리** | 태그·카테고리 기반 필터링 및 전문 검색 지원 |
| **빠른 저장** | URL 입력 시 제목·설명·썸네일 메타데이터 자동 추출 |
| **안전한 보관** | Google OAuth 인증 기반 개인 클라우드 저장 |
| **무료 시작** | 신용카드 없이 Google 계정만으로 즉시 사용 가능 |

### 지원 카테고리 예시

- `AI` — ChatGPT, Midjourney 등 AI 도구
- `Design` — Figma, Dribbble 등 디자인 리소스
- `Technology` — GitHub, 개발 문서 등
- `Business` — Notion, 생산성 도구 등

---

## 기술 스택

### Frontend

| 기술 | 용도 |
|------|------|
| [Next.js](https://nextjs.org/) | React 기반 풀스택 프레임워크 (App Router) |
| [TypeScript](https://www.typescriptlang.org/) | 타입 안전성 확보 |
| [Tailwind CSS](https://tailwindcss.com/) | 유틸리티 퍼스트 스타일링 |

### Backend / API

| 기술 | 용도 |
|------|------|
| Next.js API Routes | 서버리스 API 엔드포인트 |
| [OpenAI API](https://openai.com/api/) | 북마크 AI 자동 분류·분석 |
| Open Graph / Metadata 파싱 | URL에서 제목·설명·썸네일 자동 추출 |

### 인증 & 데이터베이스

| 기술 | 용도 |
|------|------|
| [NextAuth.js](https://next-auth.js.org/) | Google OAuth 인증 |
| [Supabase](https://supabase.com/) | PostgreSQL 기반 데이터 저장 및 실시간 동기화 |

### 배포 & 인프라

| 기술 | 용도 |
|------|------|
| [Vercel](https://vercel.com/) | 서버리스 배포 및 CDN |
| GitHub Actions | CI/CD 자동화 |

---

## 아키텍처

```
사용자 브라우저
    │
    ▼
Next.js (Vercel Edge)
 ├── /app                  # 페이지 라우팅 (App Router)
 ├── /api/bookmark         # 북마크 저장 API
 │    └── URL → OG 파싱 → AI 분류 → DB 저장
 ├── /api/auth             # NextAuth Google OAuth
 └── /api/search           # 검색 API
    │
    ├── OpenAI API          # 카테고리·태그 AI 추론
    └── Supabase            # 북마크 데이터 영구 저장
```

**북마크 저장 플로우:**

1. 사용자가 URL 입력
2. 서버에서 Open Graph 메타데이터(제목, 설명, 썸네일) 크롤링
3. OpenAI API를 통해 카테고리·태그 자동 생성
4. Supabase에 저장 후 대시보드에 즉시 반영

---

## 제작 과정

### 1단계 — 기획 (아이디어 구체화)

브라우저 북마크가 수백 개로 늘어나도 정리하지 못하는 문제를 해결하고자 기획했습니다.

- 핵심 가설: *"URL만 붙여넣으면 AI가 분류해준다면 북마크를 더 자주, 더 체계적으로 저장할 것이다."*
- 경쟁 서비스 리서치 (Raindrop.io, Pocket 등) 후 차별점 확인
- 핵심 기능 3가지로 범위 제한: **저장 → AI 분류 → 검색**

### 2단계 — 기술 선정

| 고민 | 선택 이유 |
|------|----------|
| Next.js vs CRA | API Routes로 풀스택 단일 레포 구성 가능, Vercel 최적화 |
| Supabase vs Firebase | PostgreSQL 기반으로 복잡한 쿼리·검색 용이 |
| OpenAI vs 직접 분류기 | 카테고리 정확도와 개발 속도 우선 |
| NextAuth vs 직접 구현 | Google OAuth를 빠르게 안전하게 연동 |

### 3단계 — 개발

1. **프로젝트 초기 셋업**
   - Next.js 프로젝트 생성 (TypeScript + Tailwind CSS)
   - Supabase 프로젝트 생성 및 스키마 설계
   - NextAuth.js Google Provider 연동

2. **핵심 기능 구현**
   - URL 메타데이터 파싱 (Open Graph 크롤러)
   - OpenAI Prompt 설계 (카테고리·태그 추론)
   - 북마크 CRUD API 개발
   - 대시보드 UI 컴포넌트 제작

3. **UI/UX 다듬기**
   - 랜딩 페이지 제작 (샘플 북마크 6개 포함)
   - 반응형 레이아웃 적용
   - 로딩 상태·에러 처리

### 4단계 — 배포

- Vercel에 GitHub 저장소 연결 후 자동 배포
- 환경 변수 Vercel Dashboard에 등록
- 커스텀 도메인 설정

---

## 화면 구성

### 랜딩 페이지 (`/`)

- **Hero 섹션**: 서비스 핵심 가치 소개 + "Google로 무료 시작하기" CTA
- **샘플 북마크**: ChatGPT, Figma, GitHub, Midjourney, Notion, Dribbble
- **기능 소개**: AI 자동 분석 / 스마트 정리 / 빠른 저장 / 안전한 보관
- **푸터**: 저작권, 이용약관, 개인정보처리방침

### 로그인 (`/login`)

- Google OAuth 원클릭 로그인
- 이용약관·개인정보처리방침 동의 안내

### 대시보드 (`/dashboard`)

- 저장된 북마크 목록 (카테고리·태그 표시)
- URL 빠른 저장 입력창
- 카테고리별 필터 및 검색

---

## 시작하기

### 사전 요구 사항

- Node.js 18 이상
- npm 또는 pnpm
- Supabase 계정
- Google Cloud OAuth 클라이언트 ID
- OpenAI API 키

### 로컬 실행

```bash
# 저장소 클론
git clone https://github.com/guhakim/MarkMind.git
cd MarkMind

# 패키지 설치
npm install

# 환경 변수 설정 (.env.local 파일 생성)
cp .env.example .env.local
# .env.local 파일에 아래 환경 변수 입력

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

---

## 폴더 구조

```
MarkMind/
├── app/
│   ├── (auth)/
│   │   └── login/         # 로그인 페이지
│   ├── dashboard/         # 대시보드 페이지
│   ├── api/
│   │   ├── auth/          # NextAuth 핸들러
│   │   ├── bookmark/      # 북마크 CRUD API
│   │   └── search/        # 검색 API
│   ├── layout.tsx
│   └── page.tsx           # 랜딩 페이지
├── components/
│   ├── ui/                # 공통 UI 컴포넌트
│   └── bookmark/          # 북마크 관련 컴포넌트
├── lib/
│   ├── supabase.ts        # Supabase 클라이언트
│   ├── openai.ts          # OpenAI 유틸
│   └── metadata.ts        # OG 파싱 유틸
├── types/                 # TypeScript 타입 정의
├── public/                # 정적 파일
└── .env.local             # 환경 변수 (git 제외)
```

---

## 환경 변수

`.env.local` 파일에 아래 값을 설정하세요.

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

---

## 배포

본 프로젝트는 **Vercel**을 통해 배포됩니다.

1. [Vercel](https://vercel.com/)에 GitHub 저장소 연결
2. Environment Variables에 위 환경 변수 등록
3. `main` 브랜치에 push하면 자동 배포

---

## 라이선스

MIT License © 2026 [guhakim](https://github.com/guhakim)
