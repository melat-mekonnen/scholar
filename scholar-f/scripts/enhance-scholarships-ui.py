from pathlib import Path

p = Path(__file__).resolve().parents[1] / "app/scholarships/page.tsx"
t = p.read_text(encoding="utf-8")

repls = [
    (
        "relative rounded-2xl border border-slate-200/90 bg-white px-6 py-7 shadow-sm",
        "relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 px-6 py-7 shadow-sm shadow-emerald-900/5",
    ),
    (
        'to-emerald-50/40 px-6 py-7 shadow-sm shadow-emerald-900/5">\n            <div className="border-l-4 border-emerald-500 pl-4">',
        'to-emerald-50/40 px-6 py-7 shadow-sm shadow-emerald-900/5">\n            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />\n            <div className="border-l-4 border-emerald-500 pl-4">',
    ),
    (
        "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm",
        "rounded-2xl border border-emerald-100/80 bg-white p-3 shadow-sm shadow-emerald-900/5 ring-1 ring-emerald-50",
    ),
    (
        "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400",
        "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500",
    ),
    (
        "h-11 rounded-xl border-slate-200 bg-white shadow-sm md:hidden",
        "h-11 rounded-xl border-emerald-200 bg-white shadow-sm hover:bg-emerald-50 md:hidden",
    ),
    (
        "h-11 rounded-xl border-slate-200 bg-white shadow-sm md:inline-flex",
        "h-11 rounded-xl border-emerald-200 bg-white text-emerald-800 shadow-sm hover:bg-emerald-50 md:inline-flex",
    ),
    (
        'SelectTrigger className="h-11 w-56 rounded-xl border-slate-200',
        'SelectTrigger className="h-11 w-56 rounded-xl border-emerald-200 focus:ring-emerald-500',
    ),
    (
        'SelectTrigger className="h-10 w-48 rounded-xl border-slate-200',
        'SelectTrigger className="h-10 w-48 rounded-xl border-emerald-200 focus:ring-emerald-500',
    ),
    (
        "sticky top-6 rounded-2xl border-emerald-100/80 bg-white shadow-sm",
        "relative sticky top-6 overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm shadow-emerald-900/5",
    ),
    (
        '<CardTitle className="text-base text-slate-900">Filters</CardTitle>',
        '<CardTitle className="flex items-center gap-2 text-base text-slate-900"><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-teal-700 ring-1 ring-emerald-100"><Filter className="h-4 w-4" /></span>Filters</CardTitle>',
    ),
    (
        "text-sm text-slate-700 hover:bg-slate-50",
        "text-sm text-slate-700 hover:bg-emerald-50",
    ),
    (
        'border-slate-300 bg-white hover:bg-slate-50" onClick={clearAll}',
        'border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={clearAll}',
    ),
    (
        "rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200",
        "rounded-xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm ring-1 ring-emerald-100/60",
    ),
    (
        'applicationFilter === "all" ? "bg-teal-600 text-white hover:bg-blue-700"',
        'applicationFilter === "all" ? "bg-emerald-600 text-white hover:bg-emerald-700"',
    ),
    (
        'applicationFilter === "not_applied" ? "bg-slate-700 text-white hover:bg-slate-800"',
        'applicationFilter === "not_applied" ? "bg-teal-600 text-white hover:bg-teal-700"',
    ),
    (
        ': "border-slate-300 bg-white hover:bg-slate-50"',
        ': "border-emerald-100 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"',
    ),
    (
        'rounded-md border-slate-300 bg-white hover:bg-slate-50"',
        'rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"',
    ),
    (
        "rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200",
        "rounded-xl border border-emerald-100/80 bg-white px-3 py-3 shadow-sm ring-1 ring-emerald-100/60",
    ),
]

for a, b in repls:
    if a not in t:
        print("MISSING:", a[:70])
    else:
        t = t.replace(a, b, 1)

marker = "Filters</CardTitle>\n              </CardHeader>"
if marker in t:
    t = t.replace(
        marker,
        'Filters</CardTitle>\n              </CardHeader>\n              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />',
        1,
    )

old = '                    <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />'
if old in t:
    t = t.replace(
        old,
        '                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />\n'
        + old,
        1,
    )

for a, b in [
    (
        '<Badge variant="outline">{s.bookmarkCount} saved</Badge>',
        '<Badge variant="outline" className="border-emerald-200 text-emerald-800">{s.bookmarkCount} saved</Badge>',
    ),
    (
        '{s.fundingType && <Badge variant="outline">{s.fundingType}</Badge>}',
        '{s.fundingType && <Badge variant="outline" className="border-emerald-200 text-emerald-800">{s.fundingType}</Badge>}',
    ),
    (
        '{s.amount && <Badge variant="outline">{s.amount}</Badge>}',
        '{s.amount && <Badge variant="outline" className="border-emerald-200 text-emerald-800">{s.amount}</Badge>}',
    ),
    (
        '{s.startDate && <Badge variant="outline">Start: {s.startDate}</Badge>}',
        '{s.startDate && <Badge variant="outline" className="border-emerald-200 text-emerald-800">Start: {s.startDate}</Badge>}',
    ),
    (
        '<Badge variant="outline">End: {s.endDate || s.deadline}</Badge>',
        '<Badge variant="outline" className="border-emerald-200 text-emerald-800">End: {s.endDate || s.deadline}</Badge>',
    ),
    (
        '<Button variant="outline" onClick={clearAll}>',
        '<Button variant="outline" className="border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={clearAll}>',
    ),
]:
    t = t.replace(a, b)

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

t = t.replace(
    """              <p className="text-sm text-slate-500">
                {loading
                  ? "Loading..."
                  : applicationFilter === "all"
                    ? `${total.toLocaleString()} results`
                    : `${visibleResults.length.toLocaleString()} shown on this page`}
              </p>""",
    """              <p className="text-sm text-slate-600">
                {loading ? (
                  "Loading..."
                ) : applicationFilter === "all" ? (
                  <>
                    <span className="font-semibold text-emerald-700">{total.toLocaleString()}</span> results
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-emerald-700">{visibleResults.length.toLocaleString()}</span>{" "}
                    shown on this page
                  </>
                )}
              </p>""",
)

for label in ("Country", "Degree level", "Field of study", "Funding type", "Deadline"):
    t = t.replace(
        f'<p className="text-sm font-semibold text-slate-900">{label}</p>',
        f'<p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{label}</p>',
    )

p.write_text(t, encoding="utf-8", newline="\n")
print("done")
