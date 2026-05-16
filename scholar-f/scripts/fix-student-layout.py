"""Normalize scholarships and documents page layout to match dashboard."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fix_scholarships():
    p = ROOT / "app/scholarships/page.tsx"
    t = p.read_text(encoding="utf-8")

    old = """<div className="relative w-full space-y-6 px-4 py-8">
          <div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
          <motion.div className="pointer-events-none absolute -right-24 top-64 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <motion.div className="flex justify-end">
            <ProfileAvatarLink />
          </motion.div>
        <header className="rounded-2xl border border-slate-200/90 bg-white px-6 py-7 shadow-sm">
          <motion.div className="flex items-center justify-between gap-4">
            <motion.div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">Browse Scholarships</h1>
              <p className="text-sm text-slate-600">
                Search verified scholarships and filter by what matters to you.
              </p>
            </motion.div>
            <img
              src="/ethioscholar-logo.svg"
              alt="EthioScholar"
              className="hidden h-10 w-auto brightness-0 invert md:block"
            />
          </motion.div>
        </header>"""

    new = """      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-3 shadow-sm md:px-6">
          <h1 className="text-lg font-semibold text-slate-900">Browse Scholarships</h1>
          <ProfileAvatarLink />
        </header>

        <main className="relative flex-1 space-y-6 p-6">
          <motion.div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <motion.div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <motion.div className="relative rounded-2xl border border-slate-200/90 bg-white px-6 py-7 shadow-sm">
            <motion.div className="border-l-4 border-emerald-500 pl-4">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Find your next scholarship</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Search verified opportunities and filter by country, degree, field of study, and funding.
              </p>
            </motion.div>
          </motion.div>"""

    # fix accidental motion.div in old/new strings
    old = old.replace("motion.div", "div")
    new = new.replace("motion.div", "div")

    if old not in t:
        raise SystemExit("scholarships: header block not found")
    t = t.replace(old, new)

    end_old = """        </div>
      </div>
      </div>
    </main>"""
    end_new = """        </main>
      </div>
    </motion.div>"""
    end_new = end_new.replace("motion.div", "div")

    if end_old not in t:
        raise SystemExit("scholarships: end block not found")
    t = t.replace(end_old, end_new)

    p.write_text(t, encoding="utf-8", newline="\n")
    print("scholarships: ok")


def fix_documents():
    p = ROOT / "app/documents/page.tsx"
    t = p.read_text(encoding="utf-8")

    if "  Search,\n" not in t and "Search as SearchIcon" in t:
        t = t.replace(
            "  Search as SearchIcon,\n",
            "  Search,\n  Search as SearchIcon,\n  Sparkles,\n  MessageSquare,\n",
        )

    t = t.replace(
        '  return (\n    <main className="min-h-screen bg-slate-100 text-slate-900">\n      <div className="flex min-h-screen">\n              <aside',
        '  return (\n    <div className="flex min-h-screen bg-slate-100 text-slate-900">\n      <aside',
    )

    old = """<div className="flex-1 w-full px-4 py-8">
          <motion.div className="mx-auto w-full max-w-6xl">
            <motion.div className="flex justify-end">
              <ProfileAvatarLink />
            </motion.div>
            <header className="rounded-2xl border border-slate-200/90 bg-white px-6 py-7 shadow-sm">
            <motion.div className="flex items-center justify-between gap-4">
              <motion.div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">Document Resources</h1>
                <p className="text-sm text-slate-600">
                  CV templates, recommendation guides, and application resources.
                </p>
              </motion.div>
              <img
                src="/ethioscholar-logo.svg"
                alt="EthioScholar"
                className="hidden h-10 w-auto brightness-0 invert md:block"
              />
            </motion.div>
            </header>

            <motion.div className="mt-6 space-y-5">"""
    old = old.replace("motion.div", "div")

    new = """      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-3 shadow-sm md:px-6">
          <h1 className="text-lg font-semibold text-slate-900">Document Resources</h1>
          <ProfileAvatarLink />
        </header>

        <main className="flex-1 space-y-6 p-6">
          <motion.div className="rounded-2xl border border-slate-200/90 bg-white px-6 py-7 shadow-sm">
            <motion.div className="border-l-4 border-emerald-500 pl-4">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Application resources</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                CV templates, recommendation guides, and other documents to support your applications.
              </p>
            </motion.div>
          </motion.div>

          <motion.div className="space-y-5">"""
    new = new.replace("motion.div", "div")

    if old not in t:
        raise SystemExit("documents: content block not found")
    t = t.replace(old, new)

    end_old = """            </div>
          </div>
        </div>
      </div>
    </main>"""
    end_new = """          </div>
        </main>
      </div>
    </div>"""

    if end_old not in t:
        raise SystemExit("documents: end block not found")
    t = t.replace(end_old, end_new)
    t = t.replace("bg-blue-50", "bg-emerald-50")

    p.write_text(t, encoding="utf-8", newline="\n")
    print("documents: ok")


if __name__ == "__main__":
    fix_scholarships()
    fix_documents()
