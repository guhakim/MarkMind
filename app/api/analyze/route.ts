import { NextRequest, NextResponse } from "next/server"
import { requireUid } from "@/lib/auth-server"
import { assertPublicHttpUrl, fetchPublicUrl, UnsafeUrlError } from "@/lib/url-guard"
import { buildTags, decodeHtml, extractFromHtml, extractMainText, guessCategory, resolveImageUrl, type Category } from "@/lib/page-classify"
import { aiConfigured, analyzeWithClaude } from "@/lib/ai-analyze"
import { takeAiQuota } from "@/lib/ai-quota"

// dns/crypto 등 Node API를 쓰므로 Edge가 아닌 Node 런타임을 명시
export const runtime = "nodejs"
// 페이지 가져오기(최대 7초) + AI 분석(최대 15초, 재시도 1회)을 담을 여유
export const maxDuration = 45

// 도메인별 확정 매핑 (이미 알려진 사이트)
const DOMAIN_MAP: Record<string, { title: string; category: Category; tags: string[]; description: string }> = {
  "kbstar.com":       { title: "KB국민은행",    category: "금융", tags: ["은행","국민은행","KB"], description: "KB국민은행의 인터넷뱅킹 서비스로, 계좌 조회·이체·대출·카드 등 다양한 금융 업무를 온라인으로 처리할 수 있습니다." },
  "busanbank.co.kr":  { title: "BNK부산은행",   category: "금융", tags: ["은행","부산은행","BNK"], description: "BNK부산은행의 인터넷뱅킹 서비스로, 계좌 조회·이체·예금·대출 등 부산·경남 지역 대표 은행 서비스를 온라인으로 이용할 수 있습니다." },
  "nonghyup.com":     { title: "NH농협은행",    category: "금융", tags: ["은행","농협","NH"], description: "NH농협은행의 인터넷뱅킹 서비스입니다." },
  "wooribank.com":    { title: "우리은행",      category: "금융", tags: ["은행","우리은행"], description: "우리은행 인터넷뱅킹 서비스입니다." },
  "shinhan.com":      { title: "신한은행",      category: "금융", tags: ["은행","신한은행"], description: "신한은행 인터넷뱅킹 서비스입니다." },
  "ibk.co.kr":        { title: "IBK기업은행",   category: "금융", tags: ["은행","기업은행","IBK"], description: "IBK기업은행 인터넷뱅킹 서비스입니다." },
  "kakaobank.com":    { title: "카카오뱅크",    category: "금융", tags: ["은행","카카오뱅크","인터넷은행"], description: "카카오뱅크는 모바일 중심 인터넷 전문은행으로, 간편한 계좌 개설과 송금, 대출, 저축 서비스를 제공합니다." },
  "tossbank.com":     { title: "토스뱅크",      category: "금융", tags: ["은행","토스뱅크","인터넷은행"], description: "토스뱅크는 토스가 운영하는 인터넷 전문은행으로 간편 송금·저축·대출 서비스를 제공합니다." },
  "toss.im":          { title: "토스",          category: "금융", tags: ["핀테크","송금","토스"], description: "토스는 간편 송금·결제·투자·보험·신용관리를 한 앱에서 제공하는 국내 대표 금융 슈퍼앱입니다." },
  "openai.com":       { title: "OpenAI",       category: "AI",   tags: ["AI","GPT","ChatGPT"], description: "OpenAI는 ChatGPT·GPT-4·DALL-E 등 세계 최고 수준의 AI 모델을 개발하는 인공지능 연구 기업입니다." },
  "chat.openai.com":  { title: "ChatGPT",      category: "AI",   tags: ["AI","챗봇","OpenAI"], description: "ChatGPT는 OpenAI가 개발한 대화형 AI 서비스로, 글쓰기·코딩·번역·분석 등 다양한 작업을 도와줍니다." },
  "claude.ai":        { title: "Claude",       category: "AI",   tags: ["AI","Anthropic","챗봇"], description: "Claude는 Anthropic이 개발한 AI 어시스턴트로, 안전하고 신뢰할 수 있는 대화·글쓰기·분석 서비스를 제공합니다." },
  "gemini.google.com":{ title: "Gemini",       category: "AI",   tags: ["AI","Google","멀티모달"], description: "Gemini는 Google이 개발한 멀티모달 AI 모델로, 텍스트·이미지·코드 등 다양한 형식의 정보를 이해하고 생성합니다." },
  "gamma.app":        { title: "Gamma",        category: "AI",   tags: ["AI","프레젠테이션","문서"], description: "Gamma는 AI가 자동으로 프레젠테이션·문서·웹페이지를 생성해주는 서비스로, 텍스트 입력만으로 세련된 슬라이드를 빠르게 만들 수 있습니다." },
  "figma.com":        { title: "Figma",        category: "디자인", tags: ["디자인","UI/UX","협업"], description: "Figma는 브라우저 기반 UI/UX 디자인 협업 툴로, 팀원들이 실시간으로 함께 디자인 작업을 할 수 있습니다." },
  "canva.com":        { title: "Canva",        category: "디자인", tags: ["디자인","템플릿","그래픽"], description: "Canva는 디자인 경험 없이도 포스터·SNS 콘텐츠·프레젠테이션 등을 쉽게 만들 수 있는 온라인 그래픽 디자인 플랫폼입니다." },
  "github.com":       { title: "GitHub",       category: "기술",  tags: ["개발","오픈소스","Git"], description: "GitHub는 전 세계 개발자들이 코드를 저장·공유·협업하는 플랫폼으로, 오픈소스 프로젝트의 중심지입니다." },
  "notion.so":        { title: "Notion",       category: "비즈니스", tags: ["노트","협업","생산성"], description: "Notion은 메모·문서·데이터베이스·프로젝트 관리를 하나의 워크스페이스에서 처리하는 올인원 생산성 도구입니다." },
  "coupang.com":      { title: "쿠팡",         category: "쇼핑",  tags: ["이커머스","로켓배송","쇼핑"], description: "쿠팡은 로켓배송으로 유명한 국내 최대 이커머스 플랫폼으로, 식품·가전·패션 등 모든 상품을 빠르게 배송합니다." },
  "youtube.com":      { title: "YouTube",      category: "엔터테인먼트", tags: ["동영상","스트리밍","유튜브"], description: "YouTube는 세계 최대 동영상 플랫폼으로, 음악·뉴스·교육·게임·예능 등 모든 분야의 영상 콘텐츠를 무료로 시청할 수 있습니다." },
  "netflix.com":      { title: "Netflix",      category: "엔터테인먼트", tags: ["스트리밍","영화","드라마"], description: "Netflix는 세계 최대 동영상 스트리밍 서비스로, 영화·드라마·다큐멘터리·애니메이션 등을 월정액으로 무제한 시청할 수 있습니다." },
  "instagram.com":    { title: "Instagram",    category: "소셜",  tags: ["SNS","사진","소셜미디어"], description: "Instagram은 사진·동영상·Reels를 공유하는 Meta 운영 소셜 미디어 플랫폼으로, 전 세계 20억 명 이상이 사용합니다." },
  "linkedin.com":     { title: "LinkedIn",     category: "비즈니스", tags: ["커리어","네트워킹","취업"], description: "LinkedIn은 전문가 네트워킹 플랫폼으로, 구직·채용·업계 뉴스·비즈니스 인맥 관리에 활용됩니다." },
}

// 최종 주소(리다이렉트 후)도 돌려준다 — 상대 경로 이미지를 그 주소 기준으로 풀어야 한다
async function fetchPage(url: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController()
  // 타임아웃은 리다이렉트 hop 전체에 걸리는 총 예산이다
  const timer = setTimeout(() => controller.abort(), 7000)
  try {
    // 리다이렉트를 직접 따라가며 hop마다 SSRF 재검증
    const res = await fetchPublicUrl(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    })
    return { html: decodeHtml(await res.arrayBuffer(), res.headers.get("content-type")), finalUrl: res.url || url }
  } catch {
    return { html: "", finalUrl: url }
  } finally {
    clearTimeout(timer)
  }
}

function extractBaseDomain(hostname: string): string {
  const parts = hostname.replace(/^www\./, "").split(".")
  if (parts.length > 2) {
    const sld = parts[parts.length - 2]
    return ["co", "ne", "or", "go", "ac", "re"].includes(sld)
      ? parts.slice(-3).join(".")
      : parts.slice(-2).join(".")
  }
  return parts.join(".")
}

export async function POST(req: NextRequest) {
  // 로그인한 사용자만 서버 측 크롤링을 요청할 수 있다
  const auth = await requireUid(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { url } = await req.json() as { url: string }
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 })
    }

    // SSRF 방어: 공개 http(s) 주소만 통과
    let parsed: URL
    try {
      parsed = await assertPublicHttpUrl(url)
    } catch (e) {
      if (e instanceof UnsafeUrlError) {
        return NextResponse.json({ error: e.message }, { status: 400 })
      }
      throw e
    }

    const hostname = parsed.hostname.replace(/^www\./, "")
    const baseDomain = extractBaseDomain(hostname)

    // 1단계: 확정 매핑 확인
    const domainMatch = DOMAIN_MAP[hostname] || DOMAIN_MAP[baseDomain]
    if (domainMatch) {
      // 사이트 첫 화면이면 매핑만으로 끝낸다. 유튜브 영상처럼 특정 페이지면 페이지를 읽어
      // 그 페이지의 제목·설명·썸네일을 쓰고, 분류·태그는 매핑을 그대로 쓴다.
      if (parsed.pathname === "/" && !parsed.search) {
        return NextResponse.json({ ...domainMatch, image: null })
      }
      const page = await fetchPage(parsed.href)
      const found = extractFromHtml(page.html)
      return NextResponse.json({
        ...domainMatch,
        title: found.title || domainMatch.title,
        description: found.description ? found.description.slice(0, 200) : domainMatch.description,
        image: resolveImageUrl(found.image, page.finalUrl),
      })
    }

    // 2단계: 실제 페이지 크롤링
    const page = await fetchPage(parsed.href)
    const { title: ogTitle, description: ogDesc, siteName, h1, keywords, image: rawImage } = extractFromHtml(page.html)
    const image = resolveImageUrl(rawImage, page.finalUrl)

    // 제목 결정
    const baseName = baseDomain.split(".")[0]
    const fallback = baseName.charAt(0).toUpperCase() + baseName.slice(1)
    const title = siteName || ogTitle.replace(/\s*[-|·]\s*.+$/, "").trim() || fallback

    // 설명 결정: OG description이 실제 내용이면 그대로 사용
    let description = ogDesc
    if (!description && h1) {
      description = `${title}은(는) ${h1}을 제공하는 서비스입니다.`
    }
    if (!description) {
      description = `${title} 공식 웹사이트입니다.`
    }
    if (description.length > 200) description = description.slice(0, 197) + "..."

    // 카테고리 결정
    const allText = [title, ogDesc, ogTitle, h1, keywords, hostname].join(" ")
    const category = guessCategory(allText)

    // 태그 생성
    const tags = buildTags(title, description, category, keywords)

    // 3단계(선택): Claude 요약·분류. 키가 없거나, 오늘 상한을 넘었거나, 실패하면 위 규칙 결과를 그대로 쓴다.
    if (aiConfigured && page.html && await takeAiQuota(auth.uid)) {
      const ai = await analyzeWithClaude({
        url: page.finalUrl,
        title: ogTitle || title,
        description: ogDesc,
        headings: h1,
        text: extractMainText(page.html),
      })
      if (ai) {
        return NextResponse.json({ title, description: ai.summary, category: ai.category, tags: ai.tags, image, ai: true })
      }
    }

    return NextResponse.json({ title, description, category, tags, image })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 })
  }
}
