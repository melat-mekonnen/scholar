from pathlib import Path

p = Path(__file__).resolve().parents[1] / "app/applications/page.tsx"
t = p.read_text(encoding="utf-8")

start_marker = '\n<div className="flex min-h-screen flex-1 flex-col">'
end_marker = '\n      </div>\n    </div>\n  )\n}'

start = t.find(start_marker)
end = t.find(end_marker)
if start < 0 or end < 0:
    raise SystemExit(f"markers not found start={start} end={end}")

new_block = '''
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-emerald-100/90 bg-white px-4 py-3 shadow-sm shadow-emerald-900/5 md:px-6">
          <h1 className="text-lg font-semibold text-emerald-950">My Applications</h1>
          <ProfileAvatarLink />
        </header>

        <main className="relative flex-1 space-y-6 p-6">
          <motion.div className="pointer-events-none absolute -left-20 top-20 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
          <motion.div className="pointer-events-none absolute -right-20 top-56 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

          <motion.div className="relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 px-6 py-7 shadow-sm shadow-emerald-900/5">
            <motion.div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <motion.div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <motion.div className="border-l-4 border-emerald-500 pl-4">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Application tracker</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  See every scholarship you have started or submitted, and update status as you hear back.
                </p>
              </motion.div>
              <motion.div className="flex flex-shrink-0 flex-wrap gap-2 md:pt-1">
                <Button asChild variant="outline" className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
                  <Link href="/scholarships">Browse scholarships</Link>
                </Button>
                <Button asChild variant="outline" className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {!loading ? (
            <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <motion.div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Total</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.total}</p>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <motion.div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-teal-600 opacity-80" />
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Submitted</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.submitted}</p>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <motion.div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-80" />
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Accepted</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.accepted}</p>
                </CardContent>
              </Card>
              <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
                <motion.div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-80" />
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-slate-500">Pending</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{stats.pending}</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}
          {loading ? (
            <p className="rounded-lg border border-emerald-100/80 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
              Loading applications...
            </p>
          ) : null}

          {!loading && sorted.length === 0 ? (
            <Card className="relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm">
              <motion.div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
              <CardHeader>
                <CardTitle className="text-base text-slate-900">No applications yet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Start with a scholarship, click Apply, and it will appear here for tracking.
                </p>
                <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href="/scholarships">Browse scholarships</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {!loading && sorted.length > 0 ? (
            <section className="space-y-4">
              <motion.div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100/80 bg-white px-4 py-3 shadow-sm ring-1 ring-emerald-50">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-emerald-700">{sorted.length}</span> application
                  {sorted.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-slate-500">Sorted by latest update</p>
              </motion.div>

              <motion.div className="grid gap-4">
                {sorted.map((a) => (
                  <Card
                    key={a.id}
                    className="group relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <motion.div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
                    <motion.div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-emerald-100/40 blur-2xl" />
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-slate-900 transition-colors group-hover:text-emerald-800">
                        {a.scholarship.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <motion.div className="flex flex-wrap items-center gap-2">
                        {statusBadge(a.status)}
                        {a.scholarship.country ? (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                            {a.scholarship.country}
                          </Badge>
                        ) : null}
                        {a.scholarship.startDate ? (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                            Start: {String(a.scholarship.startDate)}
                          </Badge>
                        ) : null}
                        {a.scholarship.endDate || a.scholarship.deadline ? (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                            End: {String(a.scholarship.endDate || a.scholarship.deadline)}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="border-emerald-100 bg-emerald-50/50 text-slate-600">
                          Updated: {new Date(a.updatedAt).toLocaleDateString()}
                        </Badge>
                      </motion.div>

                      <motion.div className="flex flex-wrap items-center gap-3">
                        <Select value={a.status} onValueChange={(v) => void changeStatus(a.id, v as ApplicationStatus)}>
                          <SelectTrigger className="w-[190px] rounded-lg border-emerald-200 bg-white focus:ring-emerald-500">
                            <SelectValue placeholder="Update status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="rounded-md border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
                        >
                          <Link href="/scholarships">View scholarship</Link>
                        </Button>
                      </motion.div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            </section>
          ) : null}
        </main>
      </motion.div>
'''

bad = "motion.div"
new_block = new_block.replace(f"<{bad}", "<div").replace(f"</{bad}>", "</div>")
t = t[:start] + new_block + t[end:]

t = t.replace(
    'if (status === "accepted") return <Badge className="bg-green-600 text-white">Accepted</Badge>',
    'if (status === "accepted") return <Badge className="bg-emerald-600 text-white">Accepted</Badge>',
)
t = t.replace(
    'return <Badge variant="secondary">Pending</Badge>',
    'return <Badge className="bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80">Pending</Badge>',
)

p.write_text(t, encoding="utf-8", newline="\n")
print("ok")
