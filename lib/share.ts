// 휴대폰 "공유하기"(PWA share_target)와 PC 북마클릿이 함께 쓰는 /share 진입 규칙.
// 둘 다 /share?url=...&title=...&text=... 로 들어온다.

/** 텍스트에서 첫 번째 http(s) URL을 꺼낸다. 끝에 붙은 문장부호·괄호는 떼어낸다. */
export function extractUrl(text: string | null | undefined): string | null {
  if (!text) return null
  const match = /https?:\/\/[^\s<>"'`]+/i.exec(text)
  if (!match) return null
  const url = match[0].replace(/[.,;:!?)\]}>」』。、]+$/, "")
  try {
    const { protocol } = new URL(url)
    return protocol === "http:" || protocol === "https:" ? url : null
  } catch {
    return null
  }
}

/**
 * 공유로 들어온 값에서 저장할 URL과 제목을 고른다.
 * 안드로이드 앱 상당수(유튜브·네이버·인스타 등)는 url 칸을 비우고 text에
 * "제목 https://..." 형태로 넣어 보내므로 text도 살펴야 한다.
 */
export function readSharedLink(params: URLSearchParams): { url: string; title: string } | null {
  const url = extractUrl(params.get("url")) ?? extractUrl(params.get("text")) ?? extractUrl(params.get("title"))
  if (!url) return null

  let title = (params.get("title") ?? "").trim()
  if (!title) {
    // text에서 URL을 뺀 나머지가 제목 역할을 하는 경우가 많다
    title = (params.get("text") ?? "").replace(url, "").replace(/\s+/g, " ").trim()
  }
  if (extractUrl(title) === title) title = ""
  return { url, title: title.slice(0, 200) }
}

/**
 * PC 브라우저 즐겨찾기 바에 끌어다 놓는 저장 버튼.
 * 지금 보고 있는 페이지의 주소·제목을 작은 창으로 /share에 넘긴다.
 */
export function bookmarkletCode(origin: string): string {
  const js = `(function(){var u=encodeURIComponent(location.href),t=encodeURIComponent(document.title);`
    + `var w=window.open(${JSON.stringify(origin)}+"/share?url="+u+"&title="+t,"markmind","width=440,height=600");`
    + `if(!w){location.href=${JSON.stringify(origin)}+"/share?url="+u+"&title="+t}})()`
  return `javascript:${js}`
}
