import { registerHooks } from "node:module"

// tsconfig의 "@/*" 경로 별칭을 Node에서도 해석해 주는 preload 모듈이다.
// npm test는 이 파일을 --import로 먼저 로드한다 (package.json의 test 스크립트 참고).
//
// 왜 필요한가:
//  lib/content-hash.ts 같은 모듈은 `import { fetchPublicUrl } from "@/lib/url-guard"`처럼
//  번들러 전용 별칭을 쓴다. Node에는 tsconfig paths 개념이 없어 그냥 돌리면 ERR_MODULE_NOT_FOUND가 난다.
//  소스를 상대 경로로 고치는 대신(= 동작 변경), 테스트 쪽에서만 해석 규칙을 더해 준다.
//  확장자 없는 별칭을 .ts/.tsx로 넓혀 보고, 모두 없으면 원래 지정자를 그대로 넘긴다.

const projectRoot = new URL("../../", import.meta.url)
const extensions = [".ts", ".tsx", "/index.ts", "/index.tsx"]

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context)

    const relative = specifier.slice(2)
    const candidates = /\.[a-z]+$/.test(relative)
      ? [relative]
      : extensions.map(ext => relative + ext)

    for (const candidate of candidates) {
      try {
        return nextResolve(new URL(candidate, projectRoot).href, context)
      } catch {
        // 다음 확장자를 시도한다
      }
    }
    return nextResolve(specifier, context)
  },
})
