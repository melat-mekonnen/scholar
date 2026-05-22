from pathlib import Path

p = Path(__file__).resolve().parents[1] / "app/community/page.tsx"
t = p.read_text(encoding="utf-8")

d = "motion.div"
d = "motion.div"
d = "div"
o, c = f"<{d}", f"</{d}>"

intro = f"""
          {o} className="pointer-events-none absolute -left-20 top-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
          {o} className="pointer-events-none absolute -right-16 top-32 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl" />
          {o} className="relative border-b border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 px-4 py-5 shadow-sm shadow-emerald-900/5 md:px-6">
            {o} className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            {o} className="border-l-4 border-emerald-500 pl-4">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Community support</h2>
              <p className="mt-1 text-sm text-slate-600">
                Join a channel, share experiences, and help other students on their scholarship journey.
              </p>
            {c}
          {c}
          {o} className="flex min-h-0 flex-1 flex-col md:flex-row">
"""

repls = [
    (
        "border-b border-slate-200/80 bg-white px-4 py-3 shadow-sm md:px-6",
        "border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6",
    ),
    (
        '<h1 className="text-lg font-semibold">Community support</h1>',
        '<h1 className="text-lg font-semibold text-emerald-950">Community</h1>',
    ),
    (
        '<p className="text-xs text-muted-foreground">\n              Peer',
        '<p className="text-xs text-slate-600">\n              Peer',
    ),
    (
        '<Badge variant="secondary" className="capitalize">',
        '<Badge className="border-emerald-200 bg-emerald-50 capitalize text-emerald-800 ring-1 ring-emerald-100">',
    ),
    (
        f'{o} className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:flex-row md:gap-0 md:p-0">',
        f'{o} className="relative flex min-h-0 flex-1 flex-col">{intro}',
    ),
    (
        f'{o} className="w-full shrink-0 border-b bg-muted/30 p-4 md:w-72 md:border-b-0 md:border-r">',
        f'{o} className="w-full shrink-0 border-b border-emerald-100/80 bg-white p-4 md:w-72 md:border-b-0 md:border-r md:bg-gradient-to-b md:from-white md:to-emerald-50/20">',
    ),
    (
        '<p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Channels</p>',
        '<p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700"><Users className="h-3.5 w-3.5" />Channels</p>',
    ),
    (
        """                            channelId === c.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted",""",
        """                            channelId === c.id
                              ? "bg-gradient-to-r from-emerald-50 to-teal-50 font-semibold text-emerald-800 ring-1 ring-emerald-200/80 shadow-sm"
                              : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700",""",
    ),
    (
        '"w-full rounded-lg px-3 py-2 text-left text-sm transition-colors"',
        '"w-full rounded-xl px-3 py-2 text-left text-sm transition-all"',
    ),
    (
        'channelId === c.id ? "text-primary-foreground/90" : "text-muted-foreground"',
        'channelId === c.id ? "text-emerald-700/90" : "text-slate-500"',
    ),
    (
        f'{o} className="flex min-h-0 flex-1 flex-col">\n            {o} className="border-b px-4 py-3">',
        f'{o} className="flex min-h-0 flex-1 flex-col bg-slate-50/40">\n            {o} className="border-b border-emerald-100/80 bg-white px-4 py-3 shadow-sm">',
    ),
    (
        '<h2 className="font-semibold">{selectedChannel.name}</h2>',
        '<h2 className="font-semibold text-emerald-950">{selectedChannel.name}</h2>',
    ),
    (
        """                      size="sm"
                      disabled={loadingMore || loadingMessages}
                      onClick={() => void loadOlder()}""",
        """                      size="sm"
                      className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                      disabled={loadingMore || loadingMessages}
                      onClick={() => void loadOlder()}""",
    ),
    (
        '                        "overflow-hidden",\n'
        '                        m.parentMessageId ? "ml-6 border-l-2 border-primary/30" : "",',
        '                        "relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm transition-shadow hover:shadow-md",\n'
        '                        m.parentMessageId ? "ml-6 border-l-4 border-emerald-400/80" : "",',
    ),
    (
        """                      <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pb-2">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">{initials(m.authorFullName)}</AvatarFallback>""",
        """                      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-500/80 to-teal-500/80" />
                      <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4 pb-2">
                        <Avatar className="h-9 w-9 ring-2 ring-emerald-100">
                          <AvatarFallback className="bg-emerald-50 text-xs font-medium text-teal-700">{initials(m.authorFullName)}</AvatarFallback>""",
    ),
    (
        'className="h-8 w-8"\n                              onClick={() => setReplyTo(m)}',
        'className="h-8 w-8 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"\n                              onClick={() => setReplyTo(m)}',
    ),
    (
        f'{o} className="border-t bg-card p-4">',
        f'{o} className="border-t border-emerald-100/80 bg-white p-4 shadow-[0_-4px_24px_-8px_rgba(16,185,129,0.15)]">',
    ),
    (
        'rounded-md border bg-muted/50 px-3 py-2 text-sm',
        'rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm',
    ),
    (
        'className="min-h-[88px] flex-1 resize-none"',
        'className="min-h-[88px] flex-1 resize-none rounded-xl border-emerald-200 focus-visible:ring-emerald-500"',
    ),
    (
        'className="sm:mb-0.5"\n                  disabled={!canPost',
        'className="bg-emerald-600 text-white hover:bg-emerald-700 sm:mb-0.5"\n                  disabled={!canPost',
    ),
]

for a, b in repls:
    if a not in t:
        print("MISSING:", repr(a[:70]))
    else:
        t = t.replace(a, b, 1)

old_end = f"          {c}\n        {c}\n      {c}\n    {c}"
new_end = f"          {c}\n          {c}\n        {c}\n      {c}\n    {c}"
if old_end in t:
    t = t.replace(old_end, new_end, 1)
else:
    print("WARN end:", repr(t[-150:]))

p.write_text(t, encoding="utf-8", newline="\n")
print("done")
