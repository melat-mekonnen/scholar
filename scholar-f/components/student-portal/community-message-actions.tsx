"use client"

import {
  Copy,
  ExternalLink,
  Flag,
  Link2,
  MessageSquareReply,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  UserX,
} from "lucide-react"

import type { CommunityMessage } from "@/lib/community"
import { getPrimaryUrl } from "@/lib/community-links"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type CommunityMessageActionsProps = {
  message: CommunityMessage
  isOwn: boolean
  canPost: boolean
  isModerator: boolean
  isPinned: boolean
  onCopy: (text: string) => void
  onReply?: (message: CommunityMessage) => void
  onEdit?: (message: CommunityMessage) => void
  onDelete?: (message: CommunityMessage) => void
  onReport?: (message: CommunityMessage) => void
  onPin?: (message: CommunityMessage) => void
  onUnpin?: () => void
  onHide?: (message: CommunityMessage) => void
}

export function CommunityMessageActions({
  message,
  isOwn,
  canPost,
  isModerator,
  isPinned,
  onCopy,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onPin,
  onUnpin,
  onHide,
}: CommunityMessageActionsProps) {
  const canReply = Boolean(canPost && onReply && !message.parentMessageId)
  const canEdit = Boolean(isOwn && onEdit)
  const canPin = Boolean(isModerator && onPin && !message.parentMessageId && !isPinned)
  const canUnpin = Boolean(isModerator && onUnpin && isPinned)
  const canDelete = Boolean(isOwn && onDelete)
  const canHide = Boolean(isModerator && onHide && !isOwn)
  const canReport = Boolean(!isOwn && onReport)
  const primaryUrl = getPrimaryUrl(message.body)

  const hasActions =
    canReply ||
    canEdit ||
    canPin ||
    canUnpin ||
    canDelete ||
    canHide ||
    canReport ||
    Boolean(primaryUrl)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-lg text-slate-500 opacity-100 hover:bg-white hover:text-slate-800 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          aria-label="Message actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isOwn ? "end" : "start"} className="w-52 rounded-xl">
        <DropdownMenuItem onClick={() => onCopy(message.body)}>
          <Copy className="mr-2 h-4 w-4" />
          Copy text
        </DropdownMenuItem>

        {canReply ? (
          <DropdownMenuItem onClick={() => onReply!(message)}>
            <MessageSquareReply className="mr-2 h-4 w-4" />
            Reply
          </DropdownMenuItem>
        ) : null}

        {canEdit ? (
          <DropdownMenuItem onClick={() => onEdit!(message)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        ) : null}

        {primaryUrl ? (
          <>
            <DropdownMenuItem onClick={() => onCopy(primaryUrl)}>
              <Link2 className="mr-2 h-4 w-4" />
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={primaryUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open link
              </a>
            </DropdownMenuItem>
          </>
        ) : null}

        {canPin || canUnpin ? <DropdownMenuSeparator /> : null}

        {canPin ? (
          <DropdownMenuItem onClick={() => onPin!(message)}>
            <Pin className="mr-2 h-4 w-4" />
            Pin for everyone
          </DropdownMenuItem>
        ) : null}

        {canUnpin ? (
          <DropdownMenuItem onClick={() => onUnpin!()}>
            <PinOff className="mr-2 h-4 w-4" />
            Unpin message
          </DropdownMenuItem>
        ) : null}

        {canDelete || canHide || canReport ? <DropdownMenuSeparator /> : null}

        {canDelete ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onSelect={(e) => e.preventDefault()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. The message will be removed for everyone in this channel.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => onDelete!(message)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        {canHide ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                className="text-amber-800 focus:text-amber-800"
                onSelect={(e) => e.preventDefault()}
              >
                <UserX className="mr-2 h-4 w-4" />
                Remove for everyone
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this message?</AlertDialogTitle>
                <AlertDialogDescription>
                  The message will be hidden from the channel for all students. Use this for moderation.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => onHide!(message)}
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        {canReport ? (
          <DropdownMenuItem onClick={() => onReport!(message)}>
            <Flag className="mr-2 h-4 w-4" />
            Report
          </DropdownMenuItem>
        ) : null}

        {!hasActions ? (
          <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
