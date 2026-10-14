/** @type {import('next').NextConfig} */

// Content-Security-Policy는 여기서 보내지 않는다. proxy.ts가 요청마다 nonce를 만들어
// script-src에 'nonce-...'를 넣은 CSP를 요청/응답 헤더에 모두 세팅하는 단일 출처다.
// 여기서 CSP를 또 보내면 응답에 CSP 헤더가 두 개가 되고, 브라우저는 둘을 각각 강제하므로
// 'unsafe-inline'이 남은 쪽 때문에 nonce 전환이 무의미해지거나 디버깅이 불가능해진다.
// CSP를 고칠 일이 있으면 proxy.ts를 고친다.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
]

// proxy.ts의 matcher가 제외하는 경로(= HTML 문서가 아닌 응답) 중
// /api/*는 JSON만 돌려주므로 문서로 직접 열려도 아무것도 실행되지 않게 잠가 둔다.
// /_next/static, /_next/image, /favicon.ico는 서브리소스라 브라우저가 CSP를 적용하지 않으므로
// 위 비-CSP 보안 헤더만 받는다.
const apiCspHeader = {
  key: "Content-Security-Policy",
  value: ["default-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'"].join("; "),
}

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
      {
        source: "/api/:path*",
        headers: [apiCspHeader],
      },
    ]
  },
}

export default nextConfig
