import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { GraduationCap, Brain, ShieldCheck, ClipboardList, UserPlus, Search, Send, BarChart3 } from "lucide-react"
export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">

      {/* HERO SECTION */}
      <section className="relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero1.png')" }}
        />
        {/* Overlay for readability */}
       

        <div className="relative mx-auto flex min-h-[140vh] max-w-7xl flex-col px-6 pt-16 pb-10 text-center">

          <h1 className="text-4xl font-bold px-16 pt-10 pb-7 tracking-tight sm:text-5xl md:text-6xl text-grey-60">
            AI-Powered Scholarship Platform
            <span className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-grey-60">
              for Ethiopian Students
            </span>
          </h1>

         
          <div className="mt-auto flex flex-col items-center justify-center gap-4 pt-10 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">Get Started</Link>
            </Button>

            <Button asChild variant="outline" size="lg">
              <Link href="/signin">Sign In</Link>
            </Button>
          </div>

        </div>
      </section>

      {/* PLATFORM STATS */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 text-center sm:grid-cols-2 lg:grid-cols-4">

          <div>
            <p className="text-3xl font-bold text-primary">50+</p>
            <p className="text-sm text-muted-foreground">
              Scholarships Available
            </p>
          </div>

          <div>
            <p className="text-3xl font-bold text-primary">100+</p>
            <p className="text-sm text-muted-foreground">
              Students Supported
            </p>
          </div>

          <div>
            <p className="text-3xl font-bold text-primary">12+</p>
            <p className="text-sm text-muted-foreground">
              Countries Covered
            </p>
          </div>

          <div>
            <p className="text-3xl font-bold text-primary">100%</p>
            <p className="text-sm text-muted-foreground">
              Verified Opportunities
            </p>
          </div>

        </div>
      </section>

      {/* FEATURES */}
       <section className="py-20 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12 tracking-tight">
          Why Choose Our Scholarship Platform
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Card 1 */}
          <div className="flex flex-col items-center text-center border border-border rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow p-10">
            <div className="bg-primary/10 text-primary p-4 rounded-full mb-6">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-3">All-in-One Platform</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Access thousands of scholarships from one trusted hub instead of browsing multiple websites.
            </p>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col items-center text-center border border-border rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow p-10">
            <div className="bg-primary/10 text-primary p-4 rounded-full mb-6">
              <Brain className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-3">AI Recommendations</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Get scholarships tailored to your academic profile, field of study, and personal interests.
            </p>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col items-center text-center border border-border rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow p-10">
            <div className="bg-primary/10 text-primary p-4 rounded-full mb-6">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Verified Opportunities</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Explore only authentic and verified scholarships — no outdated or fake listings.
            </p>
          </div>

          {/* Card 4 */}
          <div className="flex flex-col items-center text-center border border-border rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow p-10">
            <div className="bg-primary/10 text-primary p-4 rounded-full mb-6">
              <ClipboardList className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Application Tracking</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Manage and track your applications in one place with smart deadline reminders.
            </p>
          </div>
        </div>
      </div>
    </section>

      {/* HOW IT WORKS */}
      <section className="bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-6">

          <h2 className="text-center text-3xl font-bold">
            How It Works
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
            A simple step-by-step flow from creating your profile to tracking applications.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </div>
                <h3 className="text-lg font-semibold">Create your profile</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Register and add your academic details so we can personalize your experience.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Search className="h-6 w-6" />
                </div>
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold">Discover scholarships</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Browse verified opportunities tailored to your field, degree level, and interests.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Send className="h-6 w-6" />
                </div>
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  3
                </div>
                <h3 className="text-lg font-semibold">Apply with confidence</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Apply easily and keep everything organized in one place.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  4
                </div>
                <h3 className="text-lg font-semibold">Track your progress</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Monitor your applications and stay on top of deadlines and updates.
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">

        <h2 className="text-3xl font-bold">
          Start Your Scholarship Journey Today
        </h2>

        <p className="mt-4 text-muted-foreground">
          Join thousands of Ethiopian students discovering opportunities
          worldwide.
        </p>

        <div className="mt-8">
          <Button asChild size="lg">
            <Link href="/signup">
              Create Free Account
            </Link>
          </Button>
        </div>

      </section>

      {/* FOOTER */}
      <footer className="border-t bg-card">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-muted-foreground">
          © 2026 Ethiopian Scholarship Portal. Empowering students through education.
        </div>
      </footer>

    </main>
  )
}