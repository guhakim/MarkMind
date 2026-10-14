import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { FirebaseAuthProvider } from '@/components/firebase-auth-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { LanguageProvider } from '@/lib/i18n'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: 'MarkMind - AI 북마크 정리',
  description: 'AI가 자동으로 북마크를 분석하고 정리해주는 스마트 북마크 관리 서비스',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MarkMind',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // middleware.ts가 요청마다 생성한 CSP nonce.
  // next-themes는 FOUC 방지용 인라인 스크립트를 dangerouslySetInnerHTML로 넣으므로
  // nonce를 직접 넘겨야 script-src에서 'unsafe-inline' 없이도 실행된다.
  // (Next.js 자신의 부트스트랩 스크립트는 요청 CSP 헤더를 보고 알아서 nonce를 붙인다.)
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <html lang="ko" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange nonce={nonce}>
          <LanguageProvider>
            <FirebaseAuthProvider>
              {children}
            </FirebaseAuthProvider>
            <Toaster richColors position="bottom-center" />
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
