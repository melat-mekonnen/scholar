"use client"

import { useState } from "react"
import { Link2 } from "lucide-react"

import { normalizeShareUrl } from "@/lib/community-links"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type CommunityShareLinkDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onShare: (url: string, note: string) => void
  sending?: boolean
}

export function CommunityShareLinkDialog({
  open,
  onOpenChange,
  onShare,
  sending,
}: CommunityShareLinkDialogProps) {
  const [url, setUrl] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleShare() {
    const normalized = normalizeShareUrl(url)
    if (!normalized) {
      setError("Enter a valid link (https://…)")
      return
    }
    setError(null)
    onShare(normalized, note)
    setUrl("")
    setNote("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-emerald-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Link2 className="h-4 w-4" />
            </span>
            Share a link
          </DialogTitle>
          <DialogDescription>
            Post a scholarship page, guide, or resource. Links open in a new tab for everyone in this
            channel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="share-link-url">Link URL</Label>
            <Input
              id="share-link-url"
              type="url"
              placeholder="https://example.com/scholarship"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError(null)
              }}
              className="border-emerald-100 focus-visible:ring-emerald-500/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="share-link-note">Note (optional)</Label>
            <Textarea
              id="share-link-note"
              placeholder="Why this link is useful…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="resize-none border-emerald-100 focus-visible:ring-emerald-500/30"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={sending || !url.trim()}
            onClick={handleShare}
          >
            {sending ? "Sharing…" : "Share link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
