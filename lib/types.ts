export interface Bookmark {
  id: string
  url: string
  title: string
  description: string
  descriptionKo?: string       // 한국어 화면용 번역 (description이 외국어일 때)
  descriptionKoSource?: string // 번역할 때의 원문 — description이 바뀌면 번역을 다시 한다
  category: string
  tags: string[]
  favicon: string | null
  image?: string | null      // 페이지 대표 이미지(og:image) — 카드 썸네일
  notifications: number
  notifyEnabled?: boolean    // 알림 구독 여부 (벨 버튼으로 토글)
  createdAt: Date
  lastVisited: Date | null
  contentHash?: string       // 마지막으로 확인한 페이지 콘텐츠 해시
  lastChecked?: Date | null  // 마지막 콘텐츠 체크 시각
  lastChangedAt?: Date | null // 마지막으로 변경이 감지된 시각 (알림함 정렬·표시)
}
