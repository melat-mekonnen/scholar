"use client"

import { useRouter } from "next/navigation"
import { Bookmark } from "lucide-react"

import { addBookmark, removeBookmark } from "@/lib/bookmarks"
import { clearToken, getToken } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  scholarshipId: string
  isBookmarked: boolean
  /** Called optimistically with the new value, and again with the previous value if the request fails. */
  onBookmarkedChange: (isBookmarked: boolean) => void
  size?: "default" | "sm"
  className?: string
}

export function ScholarshipBookmarkButton({
  scholarshipId,
  isBookmarked,
  onBookmarkedChange,
  size = "default",
  className,
}: Props) {
  const router = useRouter()
  const { toast } = useToast()

  async function handleClick() {
    if (!getToken()) {
      router.push("/signin")
      return
    }

    const prev = isBookmarked
    const next = !prev

    onBookmarkedChange(next)

    try {
      if (next) {
        const { res, errorMessage } = await addBookmark(scholarshipId)
        if (res.status === 401) {
          onBookmarkedChange(prev)
          clearToken()
          router.push("/signin")
          return
        }
        if (res.status === 409) {
          onBookmarkedChange(true)
          toast({
            title: "Already saved",
            description: "This scholarship is already in your list.",
          })
          return
        }
        if (!res.ok) {
          onBookmarkedChange(prev)
          toast({
            title: "Could not save",
            description: errorMessage ?? "Try again in a moment.",
            variant: "destructive",
          })
          return
        }
      } else {
        const { res, errorMessage } = await removeBookmark(scholarshipId)
        if (res.status === 401) {
          onBookmarkedChange(prev)
          clearToken()
          router.push("/signin")
          return
        }
        if (res.status === 404) {
          onBookmarkedChange(false)
          return
        }
        if (!res.ok) {
          onBookmarkedChange(prev)
          toast({
            title: "Could not remove",
            description: errorMessage ?? "Try again in a moment.",
            variant: "destructive",
          })
        }
      }
    } catch {
      onBookmarkedChange(prev)
      toast({
        title: "Something went wrong",
        description: "Check your connection and try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size === "sm" ? "icon-sm" : "icon"}
      className={cn("shrink-0 text-muted-foreground hover:text-primary", className)}
      onClick={(e) => {
        e.stopPropagation()
        void handleClick()
      }}
      aria-label={isBookmarked ? "Remove from saved" : "Save scholarship"}
      title={isBookmarked ? "Remove from saved" : "Save for later"}
    >
      <Bookmark
        className={cn("h-5 w-5", isBookmarked && "fill-primary text-primary")}
      />
    </Button>
  )
}
