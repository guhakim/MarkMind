import { createHash } from "crypto"
import { fetchPublicUrl } from "@/lib/url-guard"

// /api/check-update 와 /api/cron/check-updates 가 공유하는 콘텐츠 해시 계산.
// 해시 입력은 [title, description, 상위 h1~h3 3개].join("|") 의 MD5 — 기존 동작과 동일하다.
export async function fetchContentHash(url: string, timeoutMs = 8000): Promise<string | null> {
  const controller = new AbortController()
  // 타임아웃은 리다이렉트 hop 전체에 걸리는 총 예산이다
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchPublicUrl(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    })
    const html = await res.text()

    const get = (re: RegExp) => re.exec(html)?.[1]?.trim() || ""
    const title =
      get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) ||
      get(/<title[^>]*>([^<]{2,150})<\/title>/i)
    const description =
      get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i) ||
      get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)

    const headings: string[] = []
    const h1Re = /<h[123][^>]*>([^<]{3,100})<\/h[123]>/gi
    let m: RegExpExecArray | null
    while ((m = h1Re.exec(html)) !== null && headings.length < 3) headings.push(m[1].trim())

    const parts = [title, description, ...headings]
    // 전부 비어 있어도 join("|")은 구분자 "|"를 남기므로 key.trim()이 truthy가 된다.
    // 그래서 "추출 실패 → null" 판정은 join 전에 조각 단위로 해야 한다.
    // (조각이 하나라도 비어 있지 않으면 key는 기존과 완전히 동일하므로 저장된 해시는 그대로 유효하다.)
    if (!parts.some(p => p.trim())) return null
    const key = parts.join("|")
    return createHash("md5").update(key).digest("hex")
  } catch {
    // 타임아웃·네트워크 오류·차단된 URL 모두 "확인 불가"로 처리
    return null
  } finally {
    clearTimeout(timer)
  }
}
