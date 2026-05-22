"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  Crown,
  Download,
  FileText,
  FolderOpen,
  Grid3X3,
  LayoutList,
  Pencil,
  RefreshCw,
  Search as SearchIcon,
  Sparkles,
  TrendingUp,
} from "lucide-react"

import { API_BASE_URL } from "@/lib/api"
import {
  defaultRequiresPro,
  documentTypeHint,
  formatDocumentType,
  sortDocuments,
  type DocumentSort,
} from "@/lib/documents"
import { cn } from "@/lib/utils"
import {
  DocumentTemplatePreview,
  previewVariantForDocument,
} from "@/components/student-portal/document-template-preview"
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type DocumentResource = {
  id: string
  title: string
  type: string
  originalName: string
  downloadCount: number
  createdAt: string
  requiresPro?: boolean
  editable?: boolean
}

type DocumentResourcesGalleryProps = {
  documents: DocumentResource[]
  loading: boolean
  error: string | null
  search: string
  onSearchChange: (value: string) => void
  onRetry?: () => void
}

function formatRelativeDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 1) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 30) return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" })
}

function DocumentCard({
  doc,
  layout,
}: {
  doc: DocumentResource
  layout: "grid" | "list"
}) {
  const isPro = doc.requiresPro ?? defaultRequiresPro(doc.type)
  const variant = previewVariantForDocument(doc.type, doc.id)
  const typeLabel = formatDocumentType(doc.type)

  if (layout === "list") {
    return (
      <article className="flex flex-col gap-4 rounded-2xl border border-emerald-100/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center">
        <Link href={`/documents/${doc.id}`} className="shrink-0 sm:w-[120px]">
          <DocumentTemplatePreview title={doc.title} type={typeLabel} variant={variant} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isPro ? (
              <Badge className="gap-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                <Crown className="h-3 w-3" />
                Pro
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
                Free
              </Badge>
            )}
            <Badge variant="outline" className="border-emerald-100 text-slate-600">
              {typeLabel}
            </Badge>
            {doc.editable !== false ? (
              <Badge variant="outline" className="border-slate-200 text-slate-500">
                Editable
              </Badge>
            ) : null}
          </div>
          <Link href={`/documents/${doc.id}`}>
            <h3 className="mt-2 text-base font-semibold text-slate-900 hover:text-emerald-800">
              {doc.title}
            </h3>
          </Link>
          <p className="mt-1 text-sm text-slate-500">{documentTypeHint(doc.type)}</p>
          <p className="mt-2 text-xs text-slate-400">
            {doc.downloadCount} downloads · Added {formatRelativeDate(doc.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
          <Button asChild size="sm" className="rounded-lg bg-emerald-600 hover:bg-emerald-700">
            <Link href={`/documents/${doc.id}`}>
              <Pencil className="mr-2 h-4 w-4" />
              Open
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-lg border-emerald-100">
            <a
              href={`${API_BASE_URL}/api/documents/${doc.id}/download`}
              target="_blank"
              rel="noreferrer"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </Button>
        </div>
      </article>
    )
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-100/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/5">
      <Link href={`/documents/${doc.id}`} className="relative block p-4 pb-0">
        {isPro ? (
          <span className="absolute left-6 top-6 z-10 inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            <Crown className="h-2.5 w-2.5" />
            Pro
          </span>
        ) : (
          <span className="absolute left-6 top-6 z-10 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-100">
            Free
          </span>
        )}
        <DocumentTemplatePreview title={doc.title} type={typeLabel} variant={variant} />
        <div className="absolute inset-x-4 bottom-0 flex justify-center pb-4 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-md ring-1 ring-emerald-100">
            <Pencil className="h-3 w-3" />
            View template
          </span>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4 pt-3">
        <Link href={`/documents/${doc.id}`}>
          <h3 className="line-clamp-2 font-semibold text-slate-900 group-hover:text-emerald-800">
            {doc.title}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{documentTypeHint(doc.type)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
            {typeLabel}
          </Badge>
          <span className="text-xs text-slate-400">{doc.downloadCount} downloads</span>
        </div>
        <div className="mt-auto flex gap-2 pt-4">
          <Button asChild size="sm" className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700">
            <Link href={`/documents/${doc.id}`}>Open</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-lg border-emerald-100">
            <a
              href={`${API_BASE_URL}/api/documents/${doc.id}/download`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Download ${doc.title}`}
            >
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  )
}

export function DocumentResourcesGallery({
  documents,
  loading,
  error,
  search,
  onSearchChange,
  onRetry,
}: DocumentResourcesGalleryProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [activeSnap, setActiveSnap] = useState(0)
  const [snapCount, setSnapCount] = useState(0)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sort, setSort] = useState<DocumentSort>("popular")
  const [view, setView] = useState<"grid" | "list">("grid")

  const types = useMemo(() => {
    const set = new Set(documents.map((d) => d.type).filter(Boolean))
    return Array.from(set).sort()
  }, [documents])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of documents) {
      counts[d.type] = (counts[d.type] ?? 0) + 1
    }
    return counts
  }, [documents])

  const filtered = useMemo(() => {
    let list = documents
    if (typeFilter !== "all") list = list.filter((d) => d.type === typeFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          d.originalName.toLowerCase().includes(q),
      )
    }
    return sortDocuments(list, sort)
  }, [documents, typeFilter, search, sort])

  const featured = useMemo(
    () => sortDocuments(documents, "popular").slice(0, 6),
    [documents],
  )

  const stats = useMemo(() => {
    const free = documents.filter((d) => !(d.requiresPro ?? defaultRequiresPro(d.type))).length
    const pro = documents.length - free
    const downloads = documents.reduce((n, d) => n + (d.downloadCount || 0), 0)
    return { total: documents.length, free, pro, downloads }
  }, [documents])

  const onCarouselSelect = useCallback((api: CarouselApi) => {
    if (!api) return
    setSnapCount(api.scrollSnapList().length)
    setActiveSnap(api.selectedScrollSnap())
  }, [])

  useEffect(() => {
    if (!carouselApi) return
    onCarouselSelect(carouselApi)
    carouselApi.on("select", () => onCarouselSelect(carouselApi))
    carouselApi.on("reInit", () => onCarouselSelect(carouselApi))
  }, [carouselApi, onCarouselSelect, featured.length])

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 px-6 py-10 shadow-sm md:px-10 md:py-12">
        <div className="pointer-events-none absolute -left-16 top-8 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-4 h-48 w-48 rounded-full bg-teal-400/15 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-center gap-2">
          <Badge className="border-emerald-200/80 bg-white/90 text-emerald-800">
            <Sparkles className="mr-1 h-3 w-3" />
            Application toolkit
          </Badge>
        </div>

        <div className="relative mx-auto mt-4 flex max-w-3xl items-center justify-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-900/10">
            <FolderOpen className="h-5 w-5" />
          </div>
          <h2 className="text-center text-lg font-bold tracking-tight text-slate-900 md:text-xl lg:text-2xl">
            {stats.total > 0 ? (
              <>
                <span className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
                  {stats.total}
                </span>{" "}
                templates & guides for your applications
              </>
            ) : (
              "Document resources for your applications"
            )}
          </h2>
        </div>
        <p className="relative mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-slate-600 md:text-base">
          CVs, cover letters, and checklists curated for scholarship applicants. Open a template to
          edit in your browser, fuse your profile, and download when ready.{" "}
          <Link
            href="/scholarships"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline"
          >
            Browse scholarships
          </Link>
        </p>

        <div className="relative mx-auto mt-6 max-w-lg">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by title, type, or filename…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 rounded-full border-emerald-100 bg-white pl-9 pr-4 shadow-sm focus-visible:ring-emerald-500/40"
          />
        </div>

        {types.length > 0 ? (
          <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                typeFilter === "all"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-emerald-50/80",
              )}
            >
              All ({documents.length})
            </button>
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  typeFilter === t
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-emerald-50/80",
                )}
              >
                {formatDocumentType(t)} ({typeCounts[t] ?? 0})
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {!loading && !error && documents.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total resources", value: stats.total, icon: FileText },
            { label: "Free templates", value: stats.free, icon: BookOpen },
            { label: "Pro templates", value: stats.pro, icon: Crown },
            { label: "Total downloads", value: stats.downloads, icon: TrendingUp },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-2xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{item.value}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {loading
            ? "Loading resources…"
            : filtered.length === 0
              ? "No matches"
              : `${filtered.length} resource${filtered.length === 1 ? "" : "s"}`}
          {search.trim() ? ` for “${search.trim()}”` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as DocumentSort)}>
            <SelectTrigger className="h-9 w-[140px] rounded-lg border-emerald-100 bg-white text-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most popular</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="title">A–Z</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-emerald-100 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "rounded-md p-2 transition-colors",
                view === "grid" ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:text-slate-700",
              )}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "rounded-md p-2 transition-colors",
                view === "list" ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:text-slate-700",
              )}
              aria-label="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-6 text-center">
          <p className="text-sm font-medium text-red-800">{error}</p>
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 border-red-200 text-red-800"
              onClick={onRetry}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[320px] w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-white px-6 py-14 text-center">
          <FileText className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="mt-3 font-medium text-slate-900">No documents match your filters</p>
          <p className="mt-1 text-sm text-slate-500">Try another keyword or reset the category filter.</p>
          {(search || typeFilter !== "all") && (
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-full border-emerald-200"
              onClick={() => {
                onSearchChange("")
                setTypeFilter("all")
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {featured.length > 0 && !search.trim() && typeFilter === "all" ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-slate-900">Popular picks</h3>
              </div>
              <div className="relative px-2 md:px-8">
                <Carousel
                  setApi={setCarouselApi}
                  opts={{ align: "start", loop: featured.length > 3 }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-3 md:-ml-4">
                    {featured.map((doc) => (
                      <CarouselItem
                        key={doc.id}
                        className="basis-[78%] pl-3 sm:basis-[48%] md:basis-[32%] lg:basis-[24%] md:pl-4"
                      >
                        <DocumentCard doc={doc} layout="grid" />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="-left-1 border-emerald-100 bg-white shadow-md hover:bg-emerald-50 md:-left-4" />
                  <CarouselNext className="-right-1 border-emerald-100 bg-white shadow-md hover:bg-emerald-50 md:-right-4" />
                </Carousel>
              </div>
              {snapCount > 1 ? (
                <div className="flex justify-center gap-1.5">
                  {Array.from({ length: snapCount }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to slide ${i + 1}`}
                      onClick={() => carouselApi?.scrollTo(i)}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        i === activeSnap
                          ? "w-6 bg-gradient-to-r from-emerald-600 to-teal-600"
                          : "w-2 bg-slate-300 hover:bg-slate-400",
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">All resources</h3>
            <div
              className={cn(
                view === "grid"
                  ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "flex flex-col gap-3",
              )}
            >
              {filtered.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} layout={view} />
              ))}
            </div>
          </section>
        </>
      )}

    </div>
  )
}
