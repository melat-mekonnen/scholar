export type ChatQuota = {
  plan: string
  unlimited: boolean
  used: number | null
  limit: number | null
  remaining: number | null
  resetsAt: string
}

export type SubscriptionStatus = {
  plan: string
  proActive: boolean
  expiresAt: string | null
  provider: string | null
  chat: ChatQuota
}
