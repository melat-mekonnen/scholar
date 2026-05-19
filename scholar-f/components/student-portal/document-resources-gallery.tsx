"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Crown, Download, FileText, Pencil, Search as SearchIcon } from "lucide-react"

import { API_BASE_URL } from "@/lib/api"
import { defaultRequiresPro } from "@/lib/documents"
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
}

function formatTypeLabel(type: string) {
  return type
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function DocumentResourcesGallery({
  documents,
  loading,
  error,
  search,
  onSearchChange,
}: DocumentResourcesGalleryProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [activeSnap, setActiveSnap] = useState(0)
  const [snapCount, setSnapCount] = useState(0)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [showAllGrid, setShowAllGrid] = useState(false)

  const types = useMemo(() => {
    const set = new Set(documents.map((d) => d.type).filter(Boolean))
    return Array.from(set).sort()
  }, [documents])

  const filtered = useMemo(() => {
    let list = documents
    if (typeFilter !== "all") list = list.filter((d) => d.type === typeFilter)
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.originalName.toLowerCase().includes(q)
    )
  }, [documents, typeFilter, search])

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
  }, [carouselApi, onCarouselSelect, filtered.length])

  const countLabel = documents.length > 0 ? `${documents.length}+` : ""

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100/80 bg-gradient-to-b from-emerald-50/80 via-white to-teal-50/50 px-6 py-10 text-center shadow-sm md:px-10 md:py-12">
        <div className="pointer-events-none absolute -left-16 top-8 h-40 w-40 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-4 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />

        <h2 className="relative text-2xl font-bold tracking-tight text-slate-900 md:text-3xl lg:text-4xl">
          {countLabel ? (
            <>
              Choose from{" "}
              <span className="bg-gradient-to-r from-blue-700 to-emerald-600 bg-clip-text text-transparent">
                {countLabel}
              </span>{" "}
              document resources
            </>
          ) : (
            "Document resources for your applications"
          )}
        </h2>
        <p className="relative mx-auto mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
          Free CV templates, recommendation guides, and scholarship application materials — curated to
          help your applications stand out.{" "}
          <Link href="/scholarships" className="font-medium text-blue-700 underline-offset-2 hover:underline">
            Browse scholarships
          </Link>
        </p>

        <div className="relative mx-auto mt-6 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search templates and guides..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 rounded-full border-emerald-100 bg-white pl-9 shadow-sm focus-visible:ring-emerald-500"
          />
        </div>

        {types.length > 1 ? (
          <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                typeFilter === "all"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              )}
            >
              All
            </button>
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  typeFilter === t
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                )}
              >
                {formatTypeLabel(t)}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center gap-4 overflow-hidden px-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[280px] w-[200px] shrink-0 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-white px-6 py-14 text-center">
          <FileText className="mx-auto h-10 w-10 text-blue-400" />
          <p className="mt-3 font-medium text-slate-900">No documents match your search</p>
          <p className="mt-1 text-sm text-slate-500">Try another keyword or clear filters.</p>
        </div>
      ) : (
        <>
          <div className="relative px-2 md:px-8">
            <Carousel
              setApi={setCarouselApi}
              opts={{ align: "start", loop: filtered.length > 4 }}
              className="w-full"
            >
              <CarouselContent className="-ml-3 md:-ml-4">
                {filtered.map((doc) => {
                  const variant = previewVariantForDocument(doc.type, doc.id)
                  const isPro = doc.requiresPro ?? defaultRequiresPro(doc.type)
                  return (
                    <CarouselItem
                      key={doc.id}
                      className="basis-[72%] pl-3 sm:basis-[48%] md:basis-[32%] lg:basis-[24%] md:pl-4"
                    >
                      <Link href={`/documents/${doc.id}`} className="group flex flex-col">
                        <div className="relative transition-transform duration-200 group-hover:-translate-y-1">
                          {isPro ? (
                            <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                              <Crown className="h-2.5 w-2.5" />
                              Pro
                            </span>
                          ) : null}
                          <DocumentTemplatePreview
                            title={doc.title}
                            type={formatTypeLabel(doc.type)}
                            variant={variant}
                          />
                          <div className="absolute inset-0 flex items-end justify-center pb-3 rounded-lg bg-gradient-to-t from-slate-900/55 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow">
                              <Pencil className="h-3 w-3" />
                              Open
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 px-1 text-center">
                          <p className="line-clamp-2 text-sm font-semibold text-slate-900">{doc.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{formatTypeLabel(doc.type)}</p>
                        </div>
                      </Link>
                    </CarouselItem>
                  )
                })}
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
                      : "w-2 bg-slate-300 hover:bg-slate-400"
                  )}
                />
              ))}
            </div>
          ) : null}

          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAllGrid((v) => !v)}
              className="rounded-full border-slate-300 bg-white px-6 shadow-sm hover:border-blue-200 hover:bg-emerald-50/50"
            >
              {showAllGrid ? "Hide full list" : "All document resources"}
            </Button>
          </div>
        </>
      )}

      {showAllGrid && !loading && filtered.length > 0 ? (
        <section className="space-y-4 border-t border-emerald-100/70 pt-8">
          <h3 className="text-lg font-semibold text-slate-900">All resources</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col rounded-2xl border border-emerald-100/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="max-w-[140px] mx-auto w-full">
                  <DocumentTemplatePreview
                    title={doc.title}
                    type={formatTypeLabel(doc.type)}
                    variant={previewVariantForDocument(doc.type, doc.id)}
                  />
                </div>
                <div className="mt-3 flex flex-1 flex-col">
                  <p className="font-medium text-slate-900 line-clamp-2">{doc.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-800">
                      {formatTypeLabel(doc.type)}
                    </Badge>
                    <span className="text-xs text-slate-500">{doc.downloadCount} downloads</span>
                  </div>
                  <a
                    href={`${API_BASE_URL}/api/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
