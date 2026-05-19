import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  studentPortalHeroAccentClass,
  studentPortalHeroCardClass,
  studentPortalPageBg,
  studentPortalStatCardAccentClass,
  studentPortalStatCardClass,
} from "@/components/student-portal/student-portal-ui"
import { cn } from "@/lib/utils"
import {
  Brain,
  ShieldCheck,
  ClipboardList,
  Bookmark,
  UserPlus,
  Search,
  Send,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
} from "lucide-react"
export default function HomePage() {
  return (
    <main id="top" className={cn("min-h-screen", studentPortalPageBg)}>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-900">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero1.png')" }}
        />
        {/* Reduced opacity so the hero image shows more clearly */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/55 via-emerald-900/30 to-teal-900/20" />
        {/* Overlay for readability */}

        <div className="relative z-10 w-full border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
          <div className="flex w-full items-center justify-between px-4 py-2 md:px-8">
            <div className="flex items-center">
              <Link href="/" aria-label="EthioScholar Home">
                <img
                  src="/ethioscholar-logo.svg"
                  alt="EthioScholar"
                  className="h-11 w-auto"
                />
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="#about"
                className="rounded-md px-2 py-1 text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                About
              </a>
              <Button
                asChild
                size="sm"
                className="h-8 rounded-md bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"
              >
                <Link href="/signup">Apply Now</Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 rounded-md border-slate-300 bg-white px-3 text-xs text-slate-700 hover:bg-slate-100"
              >
                <Link href="/signin">Login</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col px-6 pb-12 pt-16 md:pb-12 md:pt-20">
          <div className="mt-12 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
              Making your
              <span className="mt-2 block">dreams come true.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-emerald-50 sm:text-base">
              Access trusted scholarships, intelligent AI recommendations, and seamless application tracking to
              achieve your academic goals.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Link href="/signup">Get Started</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-emerald-100/70 bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="/signin">Sign In</Link>
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* FEATURES */}
      <section className="relative mt-2 overflow-hidden py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-100 via-white to-slate-100" />
        {/* Large soft bubbles — blue + emerald only */}
        <div className="pointer-events-none absolute -left-40 top-8 h-96 w-96 rounded-full bg-emerald-500/16 blur-3xl" />
        <div className="pointer-events-none absolute left-1/4 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-emerald-500/14 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-emerald-500/16 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-24 h-64 w-64 rounded-full bg-teal-500/12 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Why choose us?
            </p>
          </div>

          <div className="relative mx-auto mt-14 max-w-7xl">
            {/* Sharp bubble orbs — emerald + teal */}
            <div className="pointer-events-none absolute left-6 top-16 h-20 w-20 rounded-full bg-emerald-500/20 blur-2xl" />
            <div className="pointer-events-none absolute right-8 top-5 h-24 w-24 rounded-full bg-teal-500/22 blur-2xl" />
            <div className="pointer-events-none absolute bottom-8 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-emerald-500/18 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 top-24 h-16 w-16 rounded-full border border-emerald-300/80 bg-gradient-to-br from-emerald-200/70 to-emerald-500/35 shadow-[0_0_24px_rgba(16,185,129,0.25)]" />
            <div className="pointer-events-none absolute right-1/4 top-2 h-10 w-10 rounded-full border border-teal-300/80 bg-gradient-to-br from-teal-200/70 to-teal-500/35 shadow-[0_0_20px_rgba(20,184,166,0.25)]" />
            <div className="pointer-events-none absolute -right-6 top-28 h-20 w-20 rounded-full border border-emerald-200/70 bg-gradient-to-br from-emerald-100/80 to-emerald-400/30" />
            <div className="pointer-events-none absolute left-1/3 bottom-3 h-12 w-12 rounded-full border border-teal-200/70 bg-gradient-to-br from-teal-100/80 to-teal-400/25" />
            <div className="pointer-events-none absolute right-10 bottom-8 h-14 w-14 rounded-full border border-emerald-200/70 bg-gradient-to-br from-emerald-100/80 to-emerald-400/30" />
            <div className="pointer-events-none absolute left-[18%] top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border border-emerald-200/80 bg-gradient-to-br from-emerald-100/75 to-emerald-500/30" />
            <div className="pointer-events-none absolute right-[12%] top-1/3 h-7 w-7 rounded-full border border-teal-200/80 bg-gradient-to-br from-teal-50/90 to-teal-500/25" />
            <div className="pointer-events-none absolute left-[45%] top-10 h-6 w-6 rounded-full bg-white/90 ring-2 ring-emerald-200/60" />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card className={cn(studentPortalStatCardClass, "h-full rounded-3xl hover:shadow-lg")}>
                <div className={studentPortalStatCardAccentClass} />
                <CardContent className="p-6 text-center sm:p-7">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-100">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">Verified listings</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Reliable opportunities with clean details and transparent requirements.
                  </p>
                </CardContent>
              </Card>

              <Card className={cn(studentPortalStatCardClass, "h-full rounded-3xl hover:shadow-lg")}>
                <div className={studentPortalStatCardAccentClass} />
                <CardContent className="p-6 text-center sm:p-7">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-600/10 text-teal-700 ring-1 ring-teal-100">
                    <Brain className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">AI recommendations</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Smarter scholarship matching based on your profile and academic goals.
                  </p>
                </CardContent>
              </Card>

              <Card className={cn(studentPortalStatCardClass, "h-full rounded-3xl hover:shadow-lg")}>
                <div className={studentPortalStatCardAccentClass} />
                <CardContent className="p-6 text-center sm:p-7">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-100">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">Track applications</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Manage statuses, deadlines, and next steps in one organized workflow.
                  </p>
                </CardContent>
              </Card>

              <Card className={cn(studentPortalStatCardClass, "h-full rounded-3xl hover:shadow-lg")}>
                <div className={studentPortalStatCardAccentClass} />
                <CardContent className="p-6 text-center sm:p-7">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-600/10 text-teal-700 ring-1 ring-teal-100">
                    <Bookmark className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">Save scholarships</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Bookmark opportunities and return to them when you are ready to apply.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT — modern split layout */}
      <section id="about" className="relative overflow-hidden bg-white pt-12 pb-14 md:pt-14 md:pb-20">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-slate-50/40 to-white" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="order-1 lg:-mt-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                About us
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                EthioScholar brings discovery, recommendations, and application tracking into one place. Explore listings
                with transparent eligibility and deadlines, save what fits, and stay on top of every step—so you compare
                options clearly and focus on preparing strong applications instead of chasing scattered details.
              </p>
              <div className="mt-8">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-emerald-600 px-8 text-sm font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-emerald-700"
                >
                  <Link href="/signup">Get started</Link>
                </Button>
              </div>
            </div>

            <div className="relative order-2 min-h-[280px] lg:min-h-[400px]">
              {/* Organic blob shapes — blue + emerald */}
              <svg
                className="pointer-events-none absolute -right-4 top-0 h-[min(100%,420px)] w-[min(100%,480px)] text-emerald-100/90 opacity-90 lg:-right-8"
                viewBox="0 0 400 420"
                fill="none"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M320 40c48 52 72 124 48 196-28 88-112 148-204 156-72 6-140-28-176-88C-8 228-12 132 52 64 116-4 216-20 320 40z"
                />
              </svg>
              <svg
                className="pointer-events-none absolute -left-8 bottom-4 h-56 w-56 text-emerald-100/95 lg:bottom-8 lg:h-64 lg:w-64"
                viewBox="0 0 200 200"
                fill="none"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M180 100c0 55-45 100-100 100S0 155 0 100 40 20 100 0c70-24 180 45 80 100z"
                />
              </svg>
              <div className="pointer-events-none absolute right-12 top-8 h-16 w-16 rounded-full bg-emerald-200/60 blur-xl" />
              <div className="pointer-events-none absolute bottom-20 right-4 h-12 w-12 rounded-full bg-emerald-200/50 blur-lg" />

              <div className="relative z-10 mx-auto max-w-md lg:max-w-none">
                <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-emerald-100/80">
                  <img
                    src="/hero.png"
                    alt="EthioScholar platform preview"
                    className="aspect-[4/3] w-full object-cover sm:aspect-[5/4]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative overflow-hidden pb-24 pt-12">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-100 via-white to-white" />
        <div className="relative z-10 mx-auto max-w-6xl px-6">

          <div className="mx-auto max-w-3xl text-center">
            <p className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              How it works
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-base text-black">
              Start in minutes, stay organized, and move step-by-step toward your academic goals.
            </p>
          </div>

          <div className="relative mt-16">
            {/* dotted connector (desktop) */}
            <svg
              className="pointer-events-none absolute left-1/2 top-10 hidden h-28 w-[min(920px,100%)] -translate-x-1/2 lg:block"
              viewBox="0 0 920 120"
              aria-hidden="true"
            >
              <path
                d="M70 70 C 220 10, 320 110, 460 60 S 700 20, 850 70"
                fill="none"
                stroke="rgba(16, 185, 129, 0.35)"
                strokeWidth="2"
                strokeDasharray="2 10"
                strokeLinecap="round"
              />
            </svg>

            <div className="grid gap-10 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-emerald-600/10 text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                  <UserPlus className="h-9 w-9" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-900">Create Account</h3>
                <p className="mx-auto mt-3 max-w-xs text-sm text-slate-600">
                  Create your profile and add the details that matter for matching.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-teal-600/10 text-teal-700 shadow-sm ring-1 ring-teal-100">
                  <Search className="h-9 w-9" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-900">Enter Information</h3>
                <p className="mx-auto mt-3 max-w-xs text-sm text-slate-600">
                  Discover scholarships with clear eligibility and deadlines.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-emerald-600/10 text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                  <Send className="h-9 w-9" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-900">Apply & Track</h3>
                <p className="mx-auto mt-3 max-w-xs text-sm text-slate-600">
                  Apply with confidence and track your progress in one dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className={cn(studentPortalHeroCardClass, "text-center")}>
          <div className={cn(studentPortalHeroAccentClass, "mx-auto max-w-2xl border-l-0 border-t-4 pt-6 text-center")}>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Start Your Scholarship Journey Today
          </h2>

          <p className="mt-4 text-slate-600">
            Join thousands of Ethiopian students discovering opportunities worldwide.
          </p>

          <div className="mt-8">
            <Button asChild size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href="/signup">Create Free Account</Link>
            </Button>
          </div>
          </div>
        </div>
      </section>

      {/* FOOTER — palette from design ref: #004d61 main, #0084a3 accent strip */}
      <footer className="relative bg-[#004d61] text-white/90">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-full h-[clamp(2.5rem,5vw,4rem)] w-full overflow-hidden leading-[0]"
          aria-hidden
        >
          <svg
            className="h-full w-full text-[#004d61]"
            viewBox="0 0 1440 56"
            preserveAspectRatio="none"
          >
            {/* Ref shape: left mid → narrow crest ~20% → wide trough ~55% → broader crest ~80% → right slightly below left */}
            <path
              fill="currentColor"
              d="M0,56 L0,23.8 C92,23.5 186,9.8 288,9 C418,8.2 638,37.2 792,35.6 C934,34.2 1012,8.6 1152,7.4 C1272,6.4 1358,24.6 1440,26.2 L1440,56 Z"
            />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pb-2 pt-10">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-2">
                <img
                  src="/ethioscholar-logo.svg"
                  alt="EthioScholar"
                  className="h-9 w-auto brightness-0 invert"
                />
              </div>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#b8dce3]">
                A modern platform to discover scholarships and track applications with confidence.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-2 lg:justify-self-center lg:-translate-x-6">
              <div>
                <p className="text-sm font-semibold text-white">Quick links</p>
                <ul className="mt-3 space-y-2.5 text-sm text-[#b8dce3]">
                  <li>
                    <Link className="transition-colors hover:text-white" href="/#top">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link className="transition-colors hover:text-white" href="/#about">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link className="transition-colors hover:text-white" href="/signin">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link className="transition-colors hover:text-white" href="/signup">
                      Sign up
                    </Link>
                  </li>
                  <li>
                    <Link className="transition-colors hover:text-white" href="/community">
                      Community
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <a
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#003c4e] text-white/90 shadow-sm transition-colors hover:border-[#7fe8ff]/50 hover:bg-[#0084a3]/35 hover:text-white"
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="X (Twitter)"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#003c4e] text-white/90 shadow-sm transition-colors hover:border-[#7fe8ff]/50 hover:bg-[#0084a3]/35 hover:text-white"
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#003c4e] text-white/90 shadow-sm transition-colors hover:border-[#7fe8ff]/50 hover:bg-[#0084a3]/35 hover:text-white"
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#003c4e] text-white/90 shadow-sm transition-colors hover:border-[#7fe8ff]/50 hover:bg-[#0084a3]/35 hover:text-white"
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-8 bg-[#0084a3] py-4 text-white">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-sm text-white/95 md:flex-row">
            <p className="text-white/90">© 2026 EthioScholar. All rights reserved.</p>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Built for global opportunities
            </span>
          </div>
        </div>
      </footer>
    </main>
  )
}