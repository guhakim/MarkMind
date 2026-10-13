/** @type {import('next').NextConfig} */

// script-src의 'unsafe-inline' / 'unsafe-eval'는 현재 구조에서 제거할 수 없다.
//  - 'unsafe-inline': Next.js App Router가 RSC 스트리밍용 인라인 부트스트랩 스크립트를
//    주입하고, next-themes도 FOUC 방지용 인라인 스크립트를 dangerouslySetInnerHTML로 넣는다.
//    제거하려면 middleware에서 nonce를 생성해 CSP 헤더와 ThemeProvider에 함께 넘기는
//    nonce 기반 CSP로 전환해야 하며, 그 경우 모든 페이지가 동적 렌더링으로 바뀐다.
//  - 'unsafe-eval': next dev(Turbopack/webpack)의 소스맵·HMR이 eval을 사용하므로
//    이 헤더가 개발 서버에도 그대로 적용되는 동안은 필요하다.
// 따라서 README에도 "XSS 완전 차단"이 아니라 현재 수준을 그대로 적는다.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.googleapis.com wss://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://vitals.vercel-insights.com https://api.web3forms.com",
      "frame-src https://markmind-18437.firebaseapp.com https://accounts.google.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
]

const nextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
