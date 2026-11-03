"use client"

import { memo, useEffect, useRef } from "react"

// ba.min.js는 로드될 때 ins.kakao_ad_area를 찾아 채운다. 랜딩이 다시 마운트되면(로그아웃 등)
// 새 광고 자리를 채우도록 마운트마다 스크립트를 다시 넣는다.
// 스크립트가 ins를 직접 고치므로 props 없이 memo로 묶어 React가 다시 그리지 않게 한다.
// 스크립트 주소를 바꾸면 proxy.ts의 CSP도 함께 바꿔야 한다.
export const AdFitBanner = memo(function AdFitBanner() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://t1.kakaocdn.net/kas/static/ba.min.js"
    script.async = true
    ref.current?.appendChild(script)
    return () => script.remove()
  }, [])

  return (
    <div ref={ref} className="flex justify-center">
      <ins
        className="kakao_ad_area"
        style={{ display: "none" }}
        data-ad-unit="DAN-vxI1n048QcoPw6h2"
        data-ad-width="300"
        data-ad-height="250"
      />
    </div>
  )
})
