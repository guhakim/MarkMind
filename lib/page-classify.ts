// /api/analyze 의 HTML 파싱·규칙 기반 분류. 라우트 파일은 HTTP 핸들러 외의 export를 둘 수 없어서
// 테스트할 수 있도록 여기로 분리했다.

export const CATEGORIES = ["AI", "디자인", "쇼핑", "기술", "뉴스", "엔터테인먼트", "교육", "비즈니스", "소셜", "금융", "기타"] as const
export type Category = typeof CATEGORIES[number]

const NAMED_ENTITIES: Record<string, string> = { lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (m, d: string) => safeFromCodePoint(Number(d)) ?? m)
    .replace(/&#x([0-9a-f]+);/gi, (m, h: string) => safeFromCodePoint(parseInt(h, 16)) ?? m)
    .replace(/&(lt|gt|quot|apos|nbsp);/g, (_, name: string) => NAMED_ENTITIES[name])
    // &amp;는 마지막에 풀어야 "&amp;lt;" 같은 이중 인코딩이 한 번만 풀린다
    .replace(/&amp;/g, "&")
}

function safeFromCodePoint(n: number): string | null {
  return Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : null
}

const clean = (s: string | undefined) =>
  s ? decodeEntities(s.trim()).replace(/\s+/g, " ").slice(0, 300) : ""

// <meta> 태그들의 속성을 파싱한다. 속성 순서·따옴표 종류와 무관하고,
// 큰따옴표 값 안의 작은따옴표(It's 등)에서 값이 잘리지 않는다.
function parseMetaTags(html: string): Record<string, string>[] {
  const tags: Record<string, string>[] = []
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs: Record<string, string> = {}
    for (const m of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
      attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ""
    }
    tags.push(attrs)
  }
  return tags
}

export function extractFromHtml(html: string) {
  const metas = parseMetaTags(html)
  const meta = (key: string, minLength: number) => {
    for (const attrs of metas) {
      const id = (attrs.property ?? attrs.name ?? "").toLowerCase()
      const value = clean(attrs.content)
      if (id === key && value.length >= minLength) return value
    }
    return ""
  }
  const first = (re: RegExp) => clean(re.exec(html)?.[1])

  const title = meta("og:title", 2) || first(/<title[^>]*>([^<]{2,150})<\/title>/i)
  const description = meta("og:description", 10) || meta("description", 10)
  const siteName = meta("og:site_name", 1)
  // h1 태그에서 주요 텍스트 추출
  const h1 = first(/<h1[^>]*>([^<]{2,100})<\/h1>/i)
  const keywords = meta("keywords", 2)
  // 카드 썸네일용 대표 이미지 (상대 경로일 수 있어 resolveImageUrl로 마무리한다)
  const image = meta("og:image:secure_url", 4) || meta("og:image", 4) || meta("twitter:image", 4) || meta("twitter:image:src", 4)

  return { title, description, siteName, h1, keywords, image }
}

/**
 * 대표 이미지 주소를 페이지 주소 기준 절대 URL로 만든다.
 * https만 허용한다 — 앱이 https로 서비스되므로 http 이미지는 혼합 콘텐츠로 막히고,
 * data:/javascript: 같은 값은 카드에 넣지 않는다. 너무 긴 주소도 버린다.
 */
export function resolveImageUrl(raw: string, pageUrl: string): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw, pageUrl)
    if (u.protocol === "http:") u.protocol = "https:"
    if (u.protocol !== "https:") return null
    const href = u.href
    return href.length <= 1000 ? href : null
  } catch {
    return null
  }
}

// 짧은 영어 단어는 \b로 감싼다 — 그렇지 않으면 guide/build의 "ui", small의 "mall",
// wordpress의 "press", upstream의 "stream"처럼 다른 단어 속에서 잘못 걸린다.
// (JS의 \b는 ASCII 단어 기준이라 한글과 붙어 있어도 경계로 인식된다: "UI디자인" → 매치)
export function guessCategory(text: string): Category {
  const t = text.toLowerCase()
  if (/\bai\b|gpt|llm|claude|gemini|copilot|neural|인공지능|딥러닝|머신러닝|chatbot|챗봇/.test(t)) return "AI"
  if (/\bbank|뱅크|은행|finance|금융|invest|증권|insurance|보험|카드|\bfunds?\b|펀드|\bloans?\b|대출|저축|적금/.test(t)) return "금융"
  if (/\bshop|쇼핑|\bmall\b|\bstores?\b|\be-?mart\b|구매|할인|배송|이커머스|e-commerce/.test(t)) return "쇼핑"
  if (/design|디자인|figma|\bux\b|\bui\b|creative|포트폴리오|그래픽|prototype/.test(t)) return "디자인"
  if (/\bnews|뉴스|\bmedia\b|언론|신문|방송|\bpress\b|기사/.test(t)) return "뉴스"
  if (/netflix|\bstream|영화|드라마|웹툰|animation|게임|\bgames?\b|entertainment|엔터/.test(t)) return "엔터테인먼트"
  if (/\blearn|교육|\bcourses?\b|강의|\bstudy\b|university|대학|\bschool|tutorial|학습/.test(t)) return "교육"
  if (/\bsocial\b|\bsns\b|twitter|facebook|instagram|community|커뮤니티|\bforum/.test(t)) return "소셜"
  if (/business|비즈니스|startup|스타트업|\bsaas\b|\bcrm\b|\bb2b\b|기업|company/.test(t)) return "비즈니스"
  if (/github|개발|developer|coding|\btech|software|\bapi\b|framework|programming/.test(t)) return "기술"
  return "기타"
}

const CATEGORY_DEFAULT_TAGS: Record<Category, string[]> = {
  "AI": ["AI"],
  "금융": ["금융"],
  "쇼핑": ["쇼핑"],
  "디자인": ["디자인"],
  "뉴스": ["뉴스"],
  "엔터테인먼트": ["엔터테인먼트"],
  "교육": ["교육"],
  "소셜": ["SNS"],
  "비즈니스": ["비즈니스"],
  "기술": ["개발"],
  "기타": [],
}

export function buildTags(title: string, description: string, category: Category, keywords: string): string[] {
  const tags: string[] = [...CATEGORY_DEFAULT_TAGS[category]]
  const text = (title + " " + description + " " + keywords).toLowerCase()

  if (/gpt|chatgpt/.test(text)) tags.push("ChatGPT")
  if (/챗봇|chatbot/.test(text)) tags.push("챗봇")
  if (/이미지|\bimages?\b/.test(text)) tags.push("이미지생성")
  if (/은행|\bbank/.test(text)) tags.push("은행")
  if (/송금|\btransfer/.test(text)) tags.push("송금")
  if (/투자|invest/.test(text)) tags.push("투자")
  if (/\bui\b|\bux\b/.test(text)) tags.push("UI/UX")
  if (/협업|collaborat/.test(text)) tags.push("협업")
  if (/오픈소스|open source/.test(text)) tags.push("오픈소스")
  if (/스트리밍|streaming/.test(text)) tags.push("스트리밍")
  if (/모바일|\bmobile\b/.test(text)) tags.push("모바일")
  if (/무료|\bfree\b/.test(text)) tags.push("무료")

  return [...new Set(tags)].slice(0, 4)
}

// 응답 바이트를 페이지 인코딩대로 디코딩한다. 국내 사이트 상당수가 아직 EUC-KR이라
// res.text()(항상 UTF-8)로 읽으면 제목·설명이 깨진다.
// 우선순위: Content-Type 헤더의 charset → 문서 앞부분의 <meta charset> → UTF-8
export function decodeHtml(body: ArrayBuffer | Uint8Array, contentType: string | null): string {
  const bytes = body instanceof Uint8Array ? body : new Uint8Array(body)
  const fromHeader = /charset\s*=\s*["']?([\w-]+)/i.exec(contentType ?? "")?.[1]
  // charset 선언은 ASCII라서 latin1로 앞부분만 훑어도 안전하다
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 4096))
  const fromMeta = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(head)?.[1]

  for (const label of [fromHeader, fromMeta]) {
    if (!label) continue
    try {
      return new TextDecoder(label).decode(bytes)
    } catch {
      // 알 수 없는 인코딩 이름 — 다음 후보로
    }
  }
  return new TextDecoder("utf-8").decode(bytes)
}
