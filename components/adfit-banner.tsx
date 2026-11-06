"use client"

import { memo, useEffect, useRef, useState } from "react"

// 랜딩 페이지의 Kakao AdFit 광고 6칸: 화면 양옆 세로 광고 2개(160x600) + 문의 폼 아래 4개(300x250, 2x2).
// 광고단위는 AdFit 대시보드의 매체 "markmind"에 등록되어 있다.
const SIDE_UNITS = {
  left: "DAN-5qzxChJqBok0tLZ1",
  right: "DAN-h4TO9DwIMOZRKN9o",
}
const BOTTOM_UNITS = [
  "DAN-vxI1n048QcoPw6h2",
  "DAN-JEeQPXyKXlX6QHan",
  "DAN-hQLIHGv61eCDJN2I",
  "DAN-Ernj8rGfaQOTpH9y",
]

// 양옆 광고는 본문(max-w-3xl, 768px)과 겹치지 않을 만큼 넓고, 160x600이 다 보일 만큼 높은 화면에서만 넣는다.
// 안 보일 자리에 광고를 호출하면 노출 없이 요청만 쌓이므로 아예 그리지 않는다.
const SIDE_MEDIA = "(min-width: 1200px) and (min-height: 720px)"

function AdFitIns({ unit, width, height }: { unit: string; width: number; height: number }) {
  return (
    <ins
      className="kakao_ad_area"
      style={{ display: "none" }}
      data-ad-unit={unit}
      data-ad-width={String(width)}
      data-ad-height={String(height)}
    />
  )
}

// ba.min.js는 로드될 때 그 시점의 ins.kakao_ad_area를 모두 찾아 채운다. 그래서 양옆 광고를 넣을지
// 먼저 정한 뒤(첫 렌더 후) 스크립트를 넣는다. 랜딩이 다시 마운트되면(로그아웃 등) 새 자리를 채우도록
// 마운트마다 스크립트를 다시 넣는다. 스크립트가 ins를 직접 고치므로 memo로 묶어 React가 다시 그리지 않게 한다.
// 스크립트 주소를 바꾸면 proxy.ts의 CSP도 함께 바꿔야 한다.
export const AdFitAds = memo(function AdFitAds() {
  const ref = useRef<HTMLDivElement>(null)
  const [showSides, setShowSides] = useState<boolean | null>(null)

  useEffect(() => {
    setShowSides(window.matchMedia(SIDE_MEDIA).matches)
  }, [])

  useEffect(() => {
    if (showSides === null) return
    const script = document.createElement("script")
    script.src = "https://t1.kakaocdn.net/kas/static/ba.min.js"
    script.async = true
    ref.current?.appendChild(script)
    return () => script.remove()
  }, [showSides])

  return (
    <div ref={ref} className="px-6 pb-16">
      {showSides && (
        <>
          <div className="fixed top-24 z-10 w-[160px] left-[calc(50%-568px)]">
            <AdFitIns unit={SIDE_UNITS.left} width={160} height={600} />
          </div>
          <div className="fixed top-24 z-10 w-[160px] right-[calc(50%-568px)]">
            <AdFitIns unit={SIDE_UNITS.right} width={160} height={600} />
          </div>
        </>
      )}
      {/* 하단은 본문 폭(768px) 안에서 2x2로 둔다. 더 넓게 펼치면 고정된 양옆 광고와 겹친다. */}
      <div className="max-w-[632px] mx-auto flex flex-wrap justify-center gap-8">
        {BOTTOM_UNITS.map((unit) => (
          <AdFitIns key={unit} unit={unit} width={300} height={250} />
        ))}
      </div>
    </div>
  )
})
