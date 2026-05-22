#!/usr/bin/env python3
"""Merge main quota/subscription logic into ui-update2 ai-chat page."""
import subprocess
from pathlib import Path

AI_CHAT = Path(__file__).resolve().parents[1] / "app" / "ai-chat" / "page.tsx"

text = subprocess.check_output(["git", "show", "HEAD:scholar-f/app/ai-chat/page.tsx"]).decode("utf-8")

types = """
type ChatQuota = {
  plan: string
  unlimited: boolean
  used: number | null
  limit: number | null
  remaining: number | null
  resetsAt: string
  expiresAt?: string | null
}

type ChatErrorBody = {
  message?: string
  code?: string
  used?: number
  limit?: number
  remaining?: number
  resetsAt?: string
}
"""

text = text.replace(
    'type ChatMessage = {\n  role: "user" | "assistant"\n  content: string\n}\n',
    'type ChatMessage = {\n  role: "user" | "assistant"\n  content: string\n}\n' + types,
)
text = text.replace(
    "  const [sending, setSending] = useState(false)\n  const [messages, setMessages]",
    "  const [sending, setSending] = useState(false)\n  const [quota, setQuota] = useState<ChatQuota | null>(null)\n  const [quotaLoading, setQuotaLoading] = useState(true)\n  const [messages, setMessages]",
)

quota_block = """
  async function loadQuota() {
    setQuotaLoading(true)
    const { res, data } = await apiFetchJson<ChatQuota>("/api/chatbot/quota", {
      method: "GET",
      auth: true,
    })
    if (res.ok && data) {
      setQuota(data)
    }
    setQuotaLoading(false)
  }

  useEffect(() => {
    if (getToken()) {
      void loadQuota()
    }
  }, [])

  const quotaExhausted =
    quota != null && !quota.unlimited && (quota.remaining ?? 0) <= 0

"""

text = text.replace("  }, [messages])\n\n  async function sendMessage", "  }, [messages])\n" + quota_block + "  async function sendMessage")
text = text.replace("    if (!text || sending) return", "    if (!text || sending || quotaExhausted) return")

old_401 = """    if (res.status === 401 || res.status === 403) {
      clearToken()
      router.replace("/signin")
      setSending(false)
      return
    }

    if (!res.ok || !data) {"""

new_401 = """    if (res.status === 401 || res.status === 403) {
      clearToken()
      router.replace("/signin")
      setSending(false)
      return
    }

    if (res.status === 402) {
      const body = data as unknown as ChatErrorBody | null
      void loadQuota()
      toast({
        title: "Daily limit reached",
        description:
          errorMessage ||
          "You have used your 3 free AI chat messages for today. Upgrade to Pro for unlimited chat.",
        variant: "destructive",
      })
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Daily free limit reached (${body?.used ?? 3}/${body?.limit ?? 3} messages). Upgrade to Pro in Settings for unlimited AI chat. Resets at ${body?.resetsAt ? new Date(body.resetsAt).toLocaleString() : "midnight UTC"}.`,
        },
      ])
      setSending(false)
      return
    }

    if (!res.ok || !data) {"""

text = text.replace(old_401, new_401)
text = text.replace(
    '    setMessages((m) => [...m, { role: "assistant", content: formatAssistantReply(data) }])\n    setSending(false)\n  }',
    '    setMessages((m) => [...m, { role: "assistant", content: formatAssistantReply(data) }])\n    void loadQuota()\n    setSending(false)\n  }\n\n  const quotaSubtitle =\n    !quotaLoading && quota\n      ? quota.unlimited\n        ? "Pro — unlimited chat"\n        : `Free plan: ${quota.remaining ?? 0} of ${quota.limit ?? 3} messages left today`\n      : undefined',
)
text = text.replace(
    """            <p className="text-xs text-slate-600">
              Answers use your profile and verified scholarships, plus the AI reference dataset.
            </p>""",
    """            <p className="text-xs text-slate-600">
              {quotaSubtitle ?? "Answers use your profile and verified scholarships, plus the AI reference dataset."}
            </p>""",
)

banner = """          {quotaExhausted ? (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  You have used all free AI chat messages for today. Upgrade to Pro for unlimited chat.
                </p>
                <Button variant="outline" size="sm" asChild className="border-amber-300">
                  <Link href="/settings/subscription">View plans</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

"""

text = text.replace(
    '          <Card className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">',
    banner
    + '          <Card className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5">',
)
text = text.replace("disabled={sending}", "disabled={sending || quotaExhausted}")
text = text.replace("disabled={sending || !input.trim()}", "disabled={sending || quotaExhausted || !input.trim()}")

AI_CHAT.write_text(text, encoding="utf-8", newline="\n")
print("patched", AI_CHAT)
