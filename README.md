# MarkMind — AI 북마크 정리 서비스

> **AI가 북마크를 자동으로 분석·분류해 주는 스마트 북마크 관리 서비스**

🔗 **배포 주소**: [https://markmind-nu.vercel.app](https://markmind-nu.vercel.app)

<img width="1276" height="537" alt="CleanShot 2026-06-01 at 11 57 30" src="https://github.com/user-attachments/assets/13c40942-a5dd-45c5-bafa-cd928c67b179" />


---

## 목차

1. [서비스 소개](#서비스-소개)
2. [주요 기능](#주요-기능)
3. [기술 스택](#기술-스택)
4. [아키텍처](#아키텍처)
5. [Google 로그인 인증 방식](#google-로그인-인증-방식)
6. [즐겨찾기 데이터 저장 구조](#즐겨찾기-데이터-저장-구조)
7. [제작 과정](#제작-과정)
8. [화면 구성](#화면-구성)
9. [시작하기](#시작하기)
10. [폴더 구조](#폴더-구조)
11. [환경 변수](#환경-변수)
12. [배포](#배포)
13. [라이선스](#라이선스)

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

## Google 로그인 인증 방식

MarkMind는 별도의 회원가입 폼 없이 **Google OAuth 2.0** 만으로 인증을 처리합니다.

### 사용 도구

| 도구 | 역할 |
|------|------|
| [NextAuth.js](https://next-auth.js.org/) | Next.js 전용 인증 라이브러리. Google Provider를 내장 지원 |
| Google Cloud Console | OAuth 2.0 클라이언트 ID·시크릿 발급 |
| Supabase (users 테이블) | 최초 로그인 시 사용자 정보 자동 저장 |

### 인증 흐름

```
① 사용자가 "Google로 무료 시작하기" 클릭
        │
② NextAuth → Google OAuth 2.0 Authorization 요청
        │
③ Google 로그인 동의 화면 (이름·이메일·프로필 사진 권한)
        │
④ Google → Authorization Code 반환
        │
⑤ NextAuth → Access Token + ID Token 교환 (서버 사이드)
        │
⑥ NextAuth Session 생성 (JWT 또는 DB 세션)
        │
⑦ Supabase users 테이블에 사용자 upsert
   (google_id, email, name, avatar_url)
        │
⑧ 대시보드(/dashboard) 리다이렉트
```

### NextAuth 설정 핵심 포인트

- **Provider**: `GoogleProvider` — `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` 환경 변수 사용
- **Callbacks**:
  - `signIn` — 최초 로그인 시 Supabase에 사용자 정보 upsert
  - `session` — 세션 객체에 `user.id`(Supabase UUID) 주입
  - `jwt` — 토큰에 사용자 DB ID 포함시켜 API 인증에 활용
- **보안**: `NEXTAUTH_SECRET`으로 JWT 서명, HTTPS 환경에서만 쿠키 전송

---

## 즐겨찾기 데이터 저장 구조

### 사용 도구

| 도구 | 역할 |
|------|------|
| [Supabase](https://supabase.com/) | PostgreSQL 호스팅 + RESTful API 자동 생성 + Row Level Security |
| Supabase Client (JS SDK) | 서버 사이드에서 DB 읽기·쓰기 |
| PostgreSQL | 실제 데이터 저장 엔진 |

### 데이터베이스 스키마

**`users` 테이블** — 로그인한 사용자 정보

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid (PK) | Supabase 자동 생성 고유 ID |
| `google_id` | text | Google 계정 고유 식별자 |
| `email` | text | 사용자 이메일 |
| `name` | text | 사용자 이름 |
| `avatar_url` | text | 프로필 이미지 URL |
| `created_at` | timestamptz | 최초 가입 시각 |

**`bookmarks` 테이블** — 저장된 북마크 데이터

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid (PK) | 북마크 고유 ID |
| `user_id` | uuid (FK → users.id) | 소유 사용자 |
| `url` | text | 저장한 URL |
| `title` | text | OG 파싱으로 추출한 제목 |
| `description` | text | OG 파싱으로 추출한 설명 |
| `thumbnail` | text | OG 이미지 URL |
| `category` | text | AI가 분류한 카테고리 (AI, Design 등) |
| `tags` | text[] | AI가 생성한 태그 배열 |
| `created_at` | timestamptz | 저장 시각 |

### 저장 흐름

```
사용자 URL 입력
    │
    ▼
① Open Graph 파싱 (서버 사이드)
   fetch(url) → cheerio 또는 html-metadata-parser
   → title / description / thumbnail 추출
    │
    ▼
② OpenAI API 호출
   프롬프트: "다음 URL 정보를 보고 category와 tags를 JSON으로 반환해줘"
   → { category: "AI", tags: ["ChatGPT", "LLM", "생산성"] }
    │
    ▼
③ Supabase INSERT
   bookmarks 테이블에 ①+② 결과 통합 저장
    │
    ▼
④ 클라이언트 상태 갱신
   대시보드 북마크 목록 실시간 업데이트
```

### 보안 — Row Level Security (RLS)

Supabase의 RLS 정책으로 **자신의 북마크만** 조회·수정·삭제 가능하도록 제한합니다.

```sql
-- 조회: 본인 소유 데이터만 허용
CREATE POLICY "users can read own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

-- 삽입: 인증된 사용자만 허용
CREATE POLICY "users can insert own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

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
