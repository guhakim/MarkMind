export interface Bookmark {
  id: string
  url: string
  title: string
  description: string
  category: string
  tags: string[]
  favicon: string | null
  notifications: number
  notifyEnabled?: boolean    // 알림 구독 여부 (벨 버튼으로 토글)
  createdAt: Date
  lastVisited: Date | null
  contentHash?: string       // 마지막으로 확인한 페이지 콘텐츠 해시
  lastChecked?: Date | null  // 마지막 콘텐츠 체크 시각
}
