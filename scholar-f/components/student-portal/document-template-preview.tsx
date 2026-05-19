"use client"

import { cn } from "@/lib/utils"

export type PreviewVariant = "classic" | "sidebar" | "modern" | "compact" | "academic"
export type PreviewSize = "sm" | "md" | "lg"

const VARIANTS: PreviewVariant[] = ["classic", "sidebar", "modern", "compact", "academic"]

export function previewVariantForDocument(type: string, id: string): PreviewVariant {
  if (type === "cv_template") return "academic"
  if (type === "resume_template") return "classic"
  if (type === "cover_letter_template") return "compact"
  const key = `${type}-${id}`
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i) * (i + 1)) % VARIANTS.length
  return VARIANTS[hash]!
}

type DocumentTemplatePreviewProps = {
  title: string
  type: string
  variant: PreviewVariant
  className?: string
  size?: PreviewSize
}

const sizeClasses: Record<PreviewSize, string> = {
  sm: "text-[5px] leading-[1.35]",
  md: "text-[6px] leading-[1.4]",
  lg: "text-[7.5px] leading-[1.45] sm:text-[8px]",
}

function SectionTitle({ children, className }: { children: string; className?: string }) {
  return (
    <p className={cn("border-b border-slate-300 pb-0.5 font-bold uppercase tracking-wide text-slate-800", className)}>
      {children}
    </p>
  )
}

function ClassicResumePreview({ size }: { size: PreviewSize }) {
  const t = sizeClasses[size]
  return (
    <div className={cn("flex h-full flex-col bg-white p-2.5 font-serif text-slate-900", t)}>
      <div className="text-center">
        <p className="text-[1.35em] font-bold leading-tight">Andrew O&apos;Sullivan</p>
        <p className="text-[0.95em] text-slate-600">Product Manager</p>
        <p className="mt-0.5 text-[0.85em] text-slate-500">
          Dublin, Ireland · andrew@email.com · +353 87 412 6849
        </p>
      </div>
      <div className="mt-2 space-y-1.5">
        <SectionTitle>Summary</SectionTitle>
        <p className="text-justify text-slate-700">
          Product manager with 6+ years shipping B2B SaaS. Focus on discovery, roadmaps, and measurable
          outcomes for users and revenue.
        </p>
      </div>
      <div className="mt-1.5 space-y-1">
        <SectionTitle>Professional Experience</SectionTitle>
        <div>
          <div className="flex justify-between gap-1 font-bold">
            <span>Product Manager</span>
            <span className="shrink-0 font-normal text-slate-500">2022 – Present</span>
          </div>
          <p className="italic text-slate-600">BrightLane Technologies · Dublin</p>
          <ul className="mt-0.5 list-disc pl-2.5 text-slate-700">
            <li>Led roadmap for 3 squads; cut time-to-ship by 28%.</li>
            <li>Launched onboarding flow lifting activation 15%.</li>
          </ul>
        </div>
        <div>
          <div className="flex justify-between gap-1 font-bold">
            <span>Associate PM</span>
            <span className="shrink-0 font-normal text-slate-500">2019 – 2022</span>
          </div>
          <p className="italic text-slate-600">NovaStack · Dublin</p>
          <ul className="mt-0.5 list-disc pl-2.5 text-slate-700">
            <li>Ran user research with 40+ interviews per quarter.</li>
          </ul>
        </div>
      </div>
      <div className="mt-1.5">
        <SectionTitle>Education</SectionTitle>
        <p className="font-bold">MSc Digital Innovation</p>
        <p className="text-slate-600">University College Dublin · 2016 – 2017</p>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[0.9em] text-slate-700">
        <span className="font-bold">Skills:</span>
        <span>Roadmaps</span>
        <span>·</span>
        <span>User research</span>
        <span>·</span>
        <span>Agile</span>
      </div>
    </div>
  )
}

function SidebarResumePreview({ size }: { size: PreviewSize }) {
  const t = sizeClasses[size]
  return (
    <div className={cn("flex h-full", t)}>
      <div className="flex w-[34%] flex-col bg-gradient-to-b from-blue-800 to-emerald-800 p-2 text-white">
        <div className="mx-auto h-7 w-7 rounded-full bg-white/20 ring-1 ring-white/40" />
        <p className="mt-1 text-center text-[1.1em] font-bold leading-tight">Lara Müller</p>
        <p className="text-center text-[0.85em] text-blue-100">Engineering Student</p>
        <div className="mt-2 space-y-1 text-[0.9em] text-blue-50">
          <p>Addis Ababa, ET</p>
          <p>lara@email.com</p>
          <p>+251 9xx xxx xxx</p>
        </div>
        <p className="mt-2 text-[0.85em] font-bold uppercase tracking-wide text-white/90">Skills</p>
        <ul className="mt-0.5 list-disc pl-2 text-[0.85em] text-blue-50">
          <li>Python, MATLAB</li>
          <li>Technical writing</li>
          <li>Team leadership</li>
        </ul>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 bg-white p-2 text-slate-800">
        <SectionTitle>Profile</SectionTitle>
        <p className="text-slate-700">
          Final-year mechanical engineering student seeking fully funded graduate study in sustainable
          energy systems.
        </p>
        <SectionTitle>Experience</SectionTitle>
        <p className="font-bold">Research Assistant</p>
        <p className="text-slate-600">AAU Energy Lab · 2023 – Present</p>
        <ul className="list-disc pl-2 text-slate-700">
          <li>Modelled solar thermal systems for rural clinics.</li>
        </ul>
        <SectionTitle>Education</SectionTitle>
        <p className="font-bold">BSc Mechanical Engineering</p>
        <p className="text-slate-600">Addis Ababa University · Expected 2026</p>
      </div>
    </div>
  )
}

function AcademicCvPreview({ size }: { size: PreviewSize }) {
  const t = sizeClasses[size]
  return (
    <div className={cn("flex h-full flex-col bg-white p-2.5 text-slate-900", t)}>
      <p className="text-center text-[1.25em] font-bold uppercase tracking-wide">Your Full Name</p>
      <p className="text-center text-slate-600">BSc, Field of Study · City, Country</p>
      <p className="text-center text-[0.9em] text-slate-500">email@university.edu · +251 …</p>
      <div className="my-1.5 h-px bg-slate-300" />
      <SectionTitle>Education</SectionTitle>
      <p className="font-bold">BSc in [Field of study]</p>
      <p className="text-slate-600">[University], [Country] · Expected 2026</p>
      <p className="mt-0.5 text-slate-700">Relevant: thesis on [topic]; GPA [x.xx].</p>
      <SectionTitle className="mt-1.5">Research & Projects</SectionTitle>
      <p className="font-bold">[Project title]</p>
      <p className="text-slate-600">[Supervisor / lab] · 2024 – 2025</p>
      <ul className="list-disc pl-2 text-slate-700">
        <li>[Methods, tools, outcome in one line.]</li>
      </ul>
      <SectionTitle className="mt-1.5">Scholarships & Awards</SectionTitle>
      <ul className="list-disc pl-2 text-slate-700">
        <li>[Award name], [Organisation], [Year]</li>
      </ul>
      <SectionTitle className="mt-1">Skills</SectionTitle>
      <p className="text-slate-700">Languages · Software · Lab techniques</p>
    </div>
  )
}

function CoverLetterPreview({ size }: { size: PreviewSize }) {
  const t = sizeClasses[size]
  return (
    <div className={cn("flex h-full flex-col bg-white p-3 text-slate-900", t)}>
      <p className="font-bold">Your Full Name</p>
      <p className="text-slate-600">City, Country · email@example.com</p>
      <p className="mt-2 text-slate-600">15 May 2026</p>
      <p className="mt-2 font-bold">Admissions Committee</p>
      <p className="text-slate-600">[University / Programme name]</p>
      <p className="mt-2 font-bold">Dear Committee,</p>
      <p className="mt-1 text-justify text-slate-700">
        I am writing to express my strong interest in the [Programme Name] at [Institution]. My background
        in [field] and experience in [activity] have prepared me to contribute meaningfully to your cohort.
      </p>
      <p className="mt-1 text-justify text-slate-700">
        In my current role as [position], I [achievement with outcome]. I am particularly drawn to your
        programme because [specific reason tied to the scholarship].
      </p>
      <p className="mt-2 text-slate-700">Sincerely,</p>
      <p className="font-bold">[Your Full Name]</p>
    </div>
  )
}

function ModernResumePreview({ size }: { size: PreviewSize }) {
  const t = sizeClasses[size]
  return (
    <div className={cn("flex h-full flex-col bg-slate-50 p-2", t)}>
      <div className="rounded bg-white p-2 text-center shadow-sm ring-1 ring-blue-100">
        <p className="text-[1.2em] font-bold text-slate-900">Camila Rivera</p>
        <p className="text-emerald-700">Data Analyst</p>
        <p className="text-[0.85em] text-slate-500">Mexico City · camila@email.com</p>
      </div>
      <div className="mt-2 space-y-1.5 rounded bg-white p-2 ring-1 ring-slate-100">
        <SectionTitle>Experience</SectionTitle>
        <p className="font-bold">Junior Data Analyst</p>
        <p className="text-slate-600">FinTech Co. · 2023 – Present</p>
        <ul className="list-disc pl-2 text-slate-700">
          <li>Built dashboards used by 12 stakeholders weekly.</li>
          <li>Automated reporting saving 6 hrs/week.</li>
        </ul>
        <SectionTitle className="mt-1">Education</SectionTitle>
        <p className="font-bold">BSc Statistics</p>
        <p className="text-slate-600">UNAM · 2019 – 2023</p>
      </div>
    </div>
  )
}

export function DocumentTemplatePreview({
  title,
  type,
  variant,
  className,
  size = "md",
}: DocumentTemplatePreviewProps) {
  return (
    <div
      className={cn(
        "pointer-events-none aspect-[8.5/11] w-full overflow-hidden rounded-lg border border-emerald-100/80 bg-white shadow-md ring-1 ring-slate-100",
        className
      )}
      aria-hidden
    >
      {variant === "classic" ? (
        <ClassicResumePreview size={size} />
      ) : variant === "sidebar" ? (
        <SidebarResumePreview size={size} />
      ) : variant === "academic" ? (
        <AcademicCvPreview size={size} />
      ) : variant === "compact" ? (
        <CoverLetterPreview size={size} />
      ) : (
        <ModernResumePreview size={size} />
      )}
    </div>
  )
}
