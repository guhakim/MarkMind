import { NextResponse, type NextRequest } from "next/server"

// 이 파일(proxy.ts, Next 16에서 middleware.ts를 대체)이 Content-Security-Policy의 단일 출처(single source of truth)다.
// next.config.mjs와 netlify.toml에는 CSP를 두지 않는다 — 응답에 CSP 헤더가 두 개면
// 브라우저가 두 정책을 각각 강제해서 어느 쪽이 막았는지 추적할 수 없고, 한쪽에만
// 'unsafe-inline'이 남아 있으면 nonce 전환이 조용히 무의미해진다.
//
// 동작 순서:
//  1) 요청마다 Web Crypto로 nonce를 새로 만든다 (Edge 런타임에는 node:crypto가 없다).
//  2) "요청" 헤더에 Content-Security-Policy와 x-nonce를 심는다. Next.js는 렌더링 중
//     요청 헤더의 script-src에서 'nonce-...'를 직접 파싱해(app-render.js의
//     getScriptNonceFromHeader) 자기 부트스트랩·번들 <script>에 nonce를 붙인다.
//     요청 헤더에 CSP를 넣지 않으면 응답 CSP만 바뀌고 스크립트에는 nonce가 안 붙어
//     브라우저에서 화면이 하얗게 뜬다.
//  3) "응답" 헤더에 같은 CSP를 넣어 브라우저가 실제로 강제하게 한다.
//  4) app/layout.tsx가 x-nonce를 읽어 next-themes 인라인 스크립트에 넘긴다.
//
// nonce를 쓰면 요청마다 값이 달라지므로 nonce를 읽는 페이지는 모두 동적 렌더링이 된다.
// (`/`, `/login`, `/_not-found`가 ○ Static → ƒ Dynamic으로 바뀐다.)

const isProduction = process.env.NODE_ENV === "production"

// Edge 런타임 전역 crypto만 사용한다 (Buffer / node:crypto 없음).
function createNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function buildContentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    // 'unsafe-inline' 대신 nonce. 'unsafe-eval'은 개발 모드 전용 —
    // next dev의 HMR·소스맵과 React의 서버 스택 복원이 eval을 쓴다.
    // https://apis.google.com은 Firebase Auth가 gapi 스크립트를 동적으로 넣기 때문에 남긴다.
    `script-src 'self' 'nonce-${nonce}'${isProduction ? "" : " 'unsafe-eval'"} https://apis.google.com`,
    // style-src의 'unsafe-inline'은 의도적으로 남긴다. React가 style={{...}}를
    // inline style 속성으로 렌더하고 Radix UI / vaul / sonner도 위치 계산을 style 속성으로
    // 넣는데, style 속성은 style-src-attr가 지배하므로 nonce로는 허용할 수 없다.
    // nonce만 넣으면 레이아웃이 깨진다. 제거하려면 inline style을 전부 클래스로 옮겨야 한다.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.googleapis.com wss://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://vitals.vercel-insights.com https://api.web3forms.com",
    "frame-src https://markmind-18437.firebaseapp.com https://accounts.google.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")
}

export function proxy(request: NextRequest) {
  const nonce = createNonce()
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set("Content-Security-Policy", contentSecurityPolicy)

  return response
}

// Next.js 공식 CSP 가이드의 matcher를 그대로 쓴다.
// https://nextjs.org/docs/app/guides/content-security-policy ("Adding a nonce with Proxy")
// - api / _next/static / _next/image / favicon.ico 는 HTML 문서가 아니라서 제외
// - next/link 프리페치(next-router-prefetch, purpose: prefetch)도 제외 —
//   프리페치마다 nonce를 새로 만들면 캐시된 RSC 페이로드의 nonce와 어긋난다.
export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
