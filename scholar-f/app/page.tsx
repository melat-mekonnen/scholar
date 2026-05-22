import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
    <main id="top" className="min-h-screen bg-slate-50 text-slate-900">

      {/* HERO — photo-forward + emerald tint; white nav */}
      <section className="relative overflow-hidden bg-slate-900">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero1.png')" }}
        />
        {/* Light emerald/teal wash so the photo stays visible (no heavy solid green) */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/48 via-emerald-900/22 to-teal-900/12" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-emerald-950/35 via-transparent to-transparent" />

        {/* Subtle corner accents — low contrast so they do not hide the photo */}
        <div className="pointer-events-none absolute -right-6 top-32 h-32 w-32 rotate-45 rounded-xl border border-white/10 bg-white/[0.03]" />
        <div className="pointer-events-none absolute -left-16 bottom-20 h-40 w-40 rounded-full border border-white/8 bg-white/[0.02]" />

        <div className="relative z-10 w-full bg-white/95 shadow-md backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-2 md:px-8">
            <Link href="/" aria-label="EthioScholar Home" className="flex items-center">
              <img src="/ethioscholar-logo.svg" alt="EthioScholar" className="h-11 w-auto" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href="#about"
                className="rounded-md px-2 py-1 text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                About
              </a>
              <Link
                href="/signin"
                className="rounded-md px-2 py-1 text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Sign In
              </Link>
              <Button
                asChild
                size="sm"
                className="h-8 rounded-md bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"
              >
                <Link href="/signup">Apply Now</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-7xl flex-col px-6 pb-16 pt-12 md:min-h-[90vh] md:pb-20 md:pt-16">
          <div className="mt-8 max-w-3xl md:mt-12">
            <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-sm sm:text-5xl md:text-6xl">
              Making your
              <span className="mt-2 block font-semibold">dreams come true.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/95 drop-shadow-sm sm:text-base">
              Access trusted scholarships, intelligent AI recommendations, and seamless application tracking to achieve
              your academic goals.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="rounded-full border-0 bg-white px-8 text-base font-semibold text-emerald-700 shadow-md hover:bg-emerald-50"
              >
                <Link href="/signup">Get Started</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full border-2 border-white bg-white/15 px-8 text-base font-semibold text-white shadow-sm backdrop-blur-sm hover:bg-white/25"
              >
                <Link href="/signin">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative mt-2 overflow-hidden py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
        {/* Large soft shapes — teal / emerald only */}
        <div className="pointer-events-none absolute -left-40 top-8 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/4 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-teal-400/16 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-emerald-500/18 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-24 h-64 w-64 rounded-full bg-teal-500/14 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Why choose us?
            </p>
          </div>

          <div className="relative mx-auto mt-14 max-w-7xl">
            {/* Accent orbs — emerald / teal */}
            <div className="pointer-events-none absolute left-6 top-16 h-20 w-20 rounded-full bg-emerald-400/22 blur-2xl" />
            <div className="pointer-events-none absolute right-8 top-5 h-24 w-24 rounded-full bg-teal-400/24 blur-2xl" />
            <div className="pointer-events-none absolute bottom-8 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-emerald-500/18 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 top-24 h-16 w-16 rounded-full border border-emerald-300/80 bg-gradient-to-br from-emerald-200/70 to-teal-500/35 shadow-[0_0_24px_rgba(16,185,129,0.2)]" />
            <div className="pointer-events-none absolute right-1/4 top-2 h-10 w-10 rounded-full border border-teal-300/80 bg-gradient-to-br from-teal-200/70 to-emerald-500/35 shadow-[0_0_20px_rgba(20,184,166,0.22)]" />
            <div className="pointer-events-none absolute -right-6 top-28 h-20 w-20 rounded-full border border-emerald-200/70 bg-gradient-to-br from-emerald-100/80 to-teal-400/30" />
            <div className="pointer-events-none absolute left-1/3 bottom-3 h-12 w-12 rounded-full border border-teal-200/70 bg-gradient-to-br from-teal-100/80 to-emerald-400/25" />
            <div className="pointer-events-none absolute right-10 bottom-8 h-14 w-14 rounded-full border border-emerald-200/70 bg-gradient-to-br from-emerald-100/80 to-emerald-400/30" />
            <div className="pointer-events-none absolute left-[18%] top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border border-emerald-200/80 bg-gradient-to-br from-emerald-100/75 to-emerald-500/30" />
            <div className="pointer-events-none absolute right-[12%] top-1/3 h-7 w-7 rounded-full border border-teal-200/80 bg-gradient-to-br from-teal-50/90 to-emerald-500/25" />
            <div className="pointer-events-none absolute left-[45%] top-10 h-6 w-6 rounded-full bg-white/90 ring-2 ring-emerald-200/70" />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="relative h-full overflow-hidden rounded-3xl border-emerald-100/90 bg-white/95 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
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

              <Card className="relative h-full overflow-hidden rounded-3xl border-emerald-100/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="p-6 text-center sm:p-7">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-100">
                    <Brain className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">AI recommendations</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Smarter scholarship matching based on your profile and academic goals.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative h-full overflow-hidden rounded-3xl border-teal-100/90 bg-white/95 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="p-6 text-center sm:p-7">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-600/10 text-teal-700 ring-1 ring-teal-100">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">Track applications</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Manage statuses, deadlines, and next steps in one organized workflow.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative h-full overflow-hidden rounded-3xl border-emerald-100/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="p-6 text-center sm:p-7">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-100">
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
              {/* Organic blob shapes — emerald / teal */}
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
                <div className="overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-slate-200/80">
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
      <section className="relative overflow-hidden pb-14 pt-12">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-white" />
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
                stroke="rgba(13, 148, 136, 0.45)"
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
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-emerald-600/10 text-emerald-700 shadow-sm ring-1 ring-emerald-100">
                  <Search className="h-9 w-9" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-900">Enter Information</h3>
                <p className="mx-auto mt-3 max-w-xs text-sm text-slate-600">
                  Discover scholarships with clear eligibility and deadlines.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-teal-600/10 text-teal-700 shadow-sm ring-1 ring-teal-100">
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
      <section className="mx-auto max-w-4xl px-6 pt-6 pb-20 text-center">
        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-12 shadow-lg md:px-10">
          <div className="pointer-events-none absolute -right-10 top-0 h-32 w-32 rotate-45 rounded-lg border border-white/10 bg-white/[0.06]" />
          <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full border border-white/10 bg-white/[0.04]" />
          <h2 className="relative text-3xl font-bold text-white">
            Start Your Scholarship Journey Today
          </h2>

          <p className="relative mt-4 text-white/90">
            Join thousands of Ethiopian students discovering opportunities
            worldwide.
          </p>

          <div className="relative mt-8">
            <Button
              asChild
              size="lg"
              className="rounded-full border-2 border-white bg-white px-8 font-semibold text-emerald-700 shadow-md hover:bg-emerald-50"
            >
              <Link href="/signup">
                Create Free Account
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER — deep teal / emerald (no blue) */}
      <footer className="relative bg-emerald-950 text-white/90">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-full h-[clamp(2.5rem,5vw,4rem)] w-full overflow-hidden leading-[0]"
          aria-hidden
        >
          <svg
            className="h-full w-full text-emerald-950"
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
              <p className="mt-3 max-w-md text-sm leading-relaxed text-emerald-100/85">
                A modern platform to discover scholarships and track applications with confidence.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-2 lg:justify-self-center lg:-translate-x-6">
              <div>
                <p className="text-sm font-semibold text-white">Quick links</p>
                <ul className="mt-3 space-y-2.5 text-sm text-emerald-100/85">
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
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-emerald-900/80 text-white/90 shadow-sm transition-colors hover:border-emerald-300/50 hover:bg-emerald-800/60 hover:text-white"
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="X (Twitter)"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-emerald-900/80 text-white/90 shadow-sm transition-colors hover:border-emerald-300/50 hover:bg-emerald-800/60 hover:text-white"
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-emerald-900/80 text-white/90 shadow-sm transition-colors hover:border-emerald-300/50 hover:bg-emerald-800/60 hover:text-white"
                    href="#"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-emerald-900/80 text-white/90 shadow-sm transition-colors hover:border-emerald-300/50 hover:bg-emerald-800/60 hover:text-white"
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

        <div className="relative mt-8 bg-teal-800 py-4 text-white">
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