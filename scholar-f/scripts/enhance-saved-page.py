from pathlib import Path

p = Path(__file__).resolve().parents[1] / "app/saved/page.tsx"
t = p.read_text(encoding="utf-8")

d = "div"
o, c = f"<{d}", f"</{d}>"

# Header + main opening
t = t.replace(
    f'\n{o} className="flex-1">',
    f"""
      {o} className="flex min-h-screen flex-1 flex-col">""",
    1,
)

t = t.replace(
    "border-b border-slate-200/80 bg-white px-4 py-3 shadow-sm md:px-6",
    "border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6",
    1,
)

# Replace entire header inner content
old_header = """        <header className="flex items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-900">Saved scholarships</h1>
            {me?.role && (
              <Badge variant="secondary" className="capitalize bg-slate-100 text-slate-700">
                {me.role}
              </Badge>
            )}
          </div>

          <motion.div className="flex items-center gap-3">
            <ProfileAvatarLink />
            <Button
              variant="outline"
              size="sm"
              className="border-slate-300 bg-white hover:bg-slate-50"
              onClick={() => {
                clearToken()
                router.push("/signin")
              }}
            >
              Sign out
            </Button>
          </motion.div>
        </header>"""
old_header = old_header.replace("motion.div", d)

new_header = """        <header className="flex items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <h1 className="text-lg font-semibold text-emerald-950">Saved Scholarships</h1>
          <ProfileAvatarLink />
        </header>"""

if old_header in t:
    t = t.replace(old_header, new_header, 1)

t = t.replace(
    '<main className="mx-auto max-w-5xl space-y-6 p-6">',
    '<main className="relative flex-1 space-y-6 p-6">',
    1,
)

intro_old = """          <motion.div className="rounded-2xl border border-slate-200/90 bg-white px-6 py-7 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight">Saved for later</h2>
            <p className="mt-1 text-sm text-slate-600">
              Scholarships you bookmarked. Remove the bookmark to take them off this list.
            </p>
          </motion.div>"""
intro_old = intro_old.replace("motion.div", d)

intro_new = f"""          {o} className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          {o} className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          {o} className="relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 px-6 py-7 shadow-sm shadow-emerald-900/5">
            {o} className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            {o} className="border-l-4 border-emerald-500 pl-4">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Saved for later</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Scholarships you bookmarked. Remove the bookmark to take them off this list.
              </p>
            {c}
          {c}

          {{!loading && results.length > 0 ? (
            {o} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm ring-1 ring-emerald-50">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-emerald-700">{{total.toLocaleString()}}</span> saved scholarship
                {{total === 1 ? "" : "s"}}
              </p>
              <Button asChild variant="outline" size="sm" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                <Link href="/scholarships">Browse more</Link>
              </Button>
            {c}
          ) : null}}"""

if intro_old in t:
    t = t.replace(intro_old, intro_new, 1)

repls = [
    ("<Empty>", '<Empty className="rounded-2xl border border-emerald-100/80 bg-white/90">'),
    ('<EmptyMedia variant="icon">', '<EmptyMedia variant="icon" className="bg-emerald-50 text-emerald-700">'),
    (
        '                    <motion.div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />',
        '                    <motion.div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />\n                    <motion.div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />',
    ),
    (
        '<Badge variant="outline">{s.bookmarkCount} saved</Badge>',
        '<Badge variant="outline" className="border-emerald-200 text-emerald-800">{s.bookmarkCount} saved</Badge>',
    ),
    (
        '<Badge variant="outline">Deadline: {s.deadline}</Badge>',
        '<Badge variant="outline" className="border-emerald-200 text-emerald-800">Deadline: {s.deadline}</Badge>',
    ),
    (
        'className="rounded-md border-slate-300 bg-white hover:bg-slate-50"',
        'className="rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"',
    ),
    (
        'className="rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200"',
        'className="rounded-xl border border-emerald-100/80 bg-white px-3 py-3 shadow-sm ring-1 ring-emerald-100/60"',
    ),
]

for a, b in repls:
    a, b = a.replace("motion.div", d), b.replace("motion.div", d)
    if a in t:
        t = t.replace(a, b, 1)
    else:
        print("MISSING:", repr(a[:60]))

t = t.replace(
    """                          <PaginationLink
                            href="#"
                            isActive={p === page}
                            onClick={(e) => {
                              e.preventDefault()
                              setPage(p)
                            }}
                          >""",
    """                          <PaginationLink
                            href="#"
                            isActive={p === page}
                            className={
                              p === page
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                : "hover:bg-emerald-50 hover:text-emerald-700"
                            }
                            onClick={(e) => {
                              e.preventDefault()
                              setPage(p)
                            }}
                          >""",
)

# Remove unused me state if only in removed header
if "me?" not in t and "me." not in t:
    t = t.replace(
        """type MeResponse = {
  id: string
  fullName?: string
  email: string
  role?: string
}

""",
        "",
    )
    t = t.replace("  const [me, setMe] = useState<MeResponse | null>(null)\n", "")
    t = t.replace(
        """  useEffect(() => {
    async function loadMe() {
      const { res, data } = await apiFetchJson<MeResponse>("/api/auth/me", { method: "GET" })
      if (res.ok && data) setMe(data)
    }
    void loadMe()
  }, [])

""",
        "",
    )

p.write_text(t, encoding="utf-8", newline="\n")
print("done")
