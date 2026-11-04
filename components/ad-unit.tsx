"use client"

import { useEffect, useRef } from "react"

// app/layout.tsx에서 불러오는 adsbygoogle.js의 client 값과 같아야 한다.
const ADSENSE_CLIENT = "ca-pub-3217274047131813"

// NEXT_PUBLIC_ 값은 빌드 시 문자열로 치환되므로 process.env[...] 처럼 동적으로 읽을 수 없다.
const LANDING_AD_SLOTS = [
  process.env.NEXT_PUBLIC_ADSENSE_SLOT_1,
  process.env.NEXT_PUBLIC_ADSENSE_SLOT_2,
  process.env.NEXT_PUBLIC_ADSENSE_SLOT_3,
].filter((slot): slot is string => Boolean(slot))

const isDevelopment = process.env.NODE_ENV === "development"

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

function AdUnit({ slot }: { slot: string }) {
  const adRef = useRef<HTMLModElement>(null)

  useEffect(() => {
    // Strict Mode의 이중 실행 등으로 같은 칸에 두 번 push하면 애드센스가 오류를 던진다.
    const ad = adRef.current
    if (!ad || ad.dataset.adsbygoogleStatus) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {
      console.error(e)
    }
  }, [])

  return (
    <div className="w-full max-w-[300px] min-h-[250px]">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="rectangle"
        data-full-width-responsive="false"
      />
    </div>
  )
}

// 랜딩 페이지 하단의 광고 3칸. 넓은 화면에서는 가로로, 좁은 화면에서는 세로로 쌓인다.
export function LandingAds() {
  if (LANDING_AD_SLOTS.length === 0) {
    // 슬롯 ID가 없으면 운영 화면에는 아무것도 표시하지 않고, 개발 중에만 자리를 보여 준다.
    if (!isDevelopment) return null
    return (
      <section aria-hidden className="px-6 pb-16">
        <div className="max-w-[964px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              data-ad-placeholder
              className="w-full max-w-[300px] h-[250px] rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground"
            >
              Ad {n}
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="px-6 pb-16">
      <div className="max-w-[964px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
        {LANDING_AD_SLOTS.map((slot) => (
          <AdUnit key={slot} slot={slot} />
        ))}
      </div>
    </section>
  )
}
