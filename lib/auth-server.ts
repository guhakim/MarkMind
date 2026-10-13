import { adminAuth } from "@/lib/firebase-admin"

export type AuthResult =
  | { ok: true; uid: string }
  | { ok: false; status: 401 | 503; error: string }

/**
 * Authorization: Bearer <Firebase ID token> 헤더를 검증해 uid를 돌려준다.
 *
 * fail-closed: Admin SDK가 설정되지 않아 토큰을 검증할 수 없으면 503으로 거부한다.
 * 절대 "검증 불가 = 통과"로 떨어지지 않는다.
 */
export async function requireUid(req: Request): Promise<AuthResult> {
  if (!adminAuth) {
    return { ok: false, status: 503, error: "인증 서버가 설정되지 않았습니다." }
  }

  const header = req.headers.get("authorization") ?? ""
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim())
  if (!match) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." }
  }

  try {
    const decoded = await adminAuth.verifyIdToken(match[1])
    if (!decoded.uid) {
      return { ok: false, status: 401, error: "로그인이 필요합니다." }
    }
    return { ok: true, uid: decoded.uid }
  } catch {
    return { ok: false, status: 401, error: "로그인이 필요합니다." }
  }
}
