'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from "next/navigation"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { apiFetchJson } from "@/lib/api"
import { clearToken } from "@/lib/auth"

export type StudentProfile = {
  id: string
  userId: string
  gpa: number
  degreeLevel: 'high_school' | 'bachelor' | 'master' | 'phd'
  fieldOfStudy: string
  preferredCountry: string
  interests: string[]
  completenessScore: number
  createdAt: string
  updatedAt: string
}

interface StudentProfileFormProps {
  onSave?: (profile: StudentProfile) => void
}

const degreeOptions = [
  { value: 'high_school', label: 'High School' },
  { value: 'bachelor', label: "Bachelor's Degree" },
  { value: 'master', label: "Master's Degree" },
  { value: 'phd', label: 'PhD' },
]

const profileCardClass =
  "relative overflow-hidden rounded-2xl border-emerald-100/80 bg-white shadow-sm dark:border-border dark:bg-card dark:text-foreground transition-colors duration-200 shadow-emerald-900/5"

const interestOptions = [
  'STEM',
  'Business',
  'Arts & Humanities',
  'Social Sciences',
  'Engineering',
  'Medicine',
  'Law',
  'Environmental Studies',
  'Education',
  'Technology',
]

export function StudentProfileForm({ onSave }: StudentProfileFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(true)
  const [justSaved, setJustSaved] = useState(false)
  const [gpa, setGpa] = useState('')
  const [degreeLevel, setDegreeLevel] = useState('')
  const [fieldOfStudy, setFieldOfStudy] = useState('')
  const [preferredCountry, setPreferredCountry] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)

  type ProfileApiResponse = {
    id: string
    user_id?: string
    userId?: string
    gpa?: number | string | null
    degree_level?: string
    degreeLevel?: string
    field_of_study?: string
    fieldOfStudy?: string
    preferred_country?: string
    preferredCountry?: string
    interests?: string[] | null
    completeness_score?: number
    completenessScore?: number
    created_at?: string
    createdAt?: string
    updated_at?: string
    updatedAt?: string
  }

  const completeness = useMemo(() => {
    const hasGpa = gpa.trim() !== "" && !Number.isNaN(Number(gpa))
    const hasDegreeLevel = Boolean(degreeLevel && degreeLevel.trim())
    const hasFieldOfStudy = Boolean(fieldOfStudy && fieldOfStudy.trim())
    const hasPreferredCountry = Boolean(preferredCountry && preferredCountry.trim())
    const hasInterests = Array.isArray(interests) && interests.length > 0

    const items = [
      { key: "gpa", label: "GPA", ok: hasGpa },
      { key: "degreeLevel", label: "Degree level", ok: hasDegreeLevel },
      { key: "fieldOfStudy", label: "Field of study", ok: hasFieldOfStudy },
      { key: "preferredCountry", label: "Preferred country", ok: hasPreferredCountry },
      { key: "interests", label: "Interests", ok: hasInterests },
    ] as const

    const completed = items.filter((i) => i.ok).length
    const total = items.length
    const score = Math.round((completed / total) * 100)
    const missing = items.filter((i) => !i.ok).map((i) => i.label)

    return { score, total, completed, missing }
  }, [gpa, degreeLevel, fieldOfStudy, preferredCountry, interests])

  useEffect(() => {
    async function loadExisting() {
      setLoadingExisting(true)
      try {
        const { res, data } = await apiFetchJson<ProfileApiResponse>("/api/profile", {
          method: "GET",
        })
        if (res.status === 401 || res.status === 403) {
          clearToken()
          router.replace("/signin")
          return
        }
        if (res.status === 404) {
          setProfileId(null)
          setIsEditing(true)
          return
        }
        if (!res.ok || !data) {
          toast({
            title: "Could not load profile",
            description:
              (data as { message?: string } | null)?.message ||
              `Something went wrong (${res.status}).`,
            variant: "destructive",
          })
          setIsEditing(true)
          return
        }

        setProfileId(data.id || null)
        if (data.gpa != null) {
          const parsed = typeof data.gpa === "number" ? data.gpa : Number(String(data.gpa))
          if (!Number.isNaN(parsed)) setGpa(String(parsed))
        }
        const dl = (data.degreeLevel ?? data.degree_level) as string | undefined
        if (dl) setDegreeLevel(dl)
        const fos = (data.fieldOfStudy ?? data.field_of_study) as string | undefined
        if (fos) setFieldOfStudy(fos)
        const pc = (data.preferredCountry ?? data.preferred_country) as string | undefined
        if (pc) setPreferredCountry(pc)
        if (Array.isArray(data.interests)) setInterests(data.interests)

        // Existing profile starts in read-only mode until user clicks Edit.
        setIsEditing(false)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Network error"
        toast({
          title: "Could not load profile",
          description: message,
          variant: "destructive",
        })
        setIsEditing(true)
      } finally {
        setLoadingExisting(false)
      }
    }

    void loadExisting()
  }, [router, toast])

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 10
        ? [...prev, interest]
        : prev
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditing) {
      setIsEditing(true)
      return
    }

    setSaving(true)
    setSuccess(false)

    try {
      const payload = {
        gpa: gpa ? parseFloat(gpa) : null,
        degreeLevel: degreeLevel || null,
        fieldOfStudy: fieldOfStudy || null,
        preferredCountry: preferredCountry || null,
        interests,
      }

      const method = profileId ? "PUT" : "POST"
      const { res, data, errorMessage } = await apiFetchJson<ProfileApiResponse>("/api/profile", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.status === 401 || res.status === 403) {
        clearToken()
        router.replace("/signin")
        return
      }

      if (!res.ok) {
        throw new Error(
          (data as { message?: string } | null)?.message ||
            errorMessage ||
            "Failed to save profile",
        )
      }
      if (data == null) {
        throw new Error(errorMessage || "Failed to save profile")
      }

      setProfileId(data.id || profileId)
      setIsEditing(false)

  const saved: StudentProfile = {
        id: data.id,
        userId: String(data.userId ?? data.user_id ?? ""),
        gpa:
          data.gpa != null && !Number.isNaN(Number(data.gpa))
            ? Number(data.gpa)
            : (gpa ? parseFloat(gpa) : 0),
        degreeLevel: ((data.degreeLevel ?? data.degree_level) || degreeLevel) as any,
        fieldOfStudy: String(data.fieldOfStudy ?? data.field_of_study ?? fieldOfStudy ?? ""),
        preferredCountry: String(data.preferredCountry ?? data.preferred_country ?? preferredCountry ?? ""),
        interests: Array.isArray(data.interests) ? data.interests : interests,
        completenessScore: Number(data.completenessScore ?? data.completeness_score ?? completeness.score),
        createdAt: String(data.createdAt ?? data.created_at ?? new Date().toISOString()),
        updatedAt: String(data.updatedAt ?? data.updated_at ?? new Date().toISOString()),
      }

      onSave?.(saved)
      setSuccess(true)
      setJustSaved(true)
      toast({
        title: 'Success',
        description: 'Profile saved successfully.',
      })

      setTimeout(() => setSuccess(false), 3000)
      setTimeout(() => setJustSaved(false), 2000)
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save profile',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const inputsDisabled = saving || loadingExisting || !isEditing

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {loadingExisting ? (
        <div className="rounded-lg border border-emerald-100/80 bg-emerald-50/50 px-4 py-2 text-sm text-slate-600">
          Loading your profile…
        </div>
      ) : null}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          Profile saved successfully!
        </div>
      )}

      {/* Completeness */}
      <Card className={profileCardClass}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
        <CardHeader>
          <CardTitle className="text-slate-900">Profile Completeness</CardTitle>
          <CardDescription>Complete all sections to maximize scholarship matches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">{completeness.score}% complete</span>
            <span className="text-sm text-slate-500">{completeness.completed} of {completeness.total} sections</span>
          </div>
          <Progress value={completeness.score} className="h-2 bg-emerald-100 [&>div]:bg-emerald-600" />
          {completeness.missing.length ? (
            <p className="text-xs text-slate-500">
              Missing: {completeness.missing.join(", ")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* GPA */}
      <Card className={profileCardClass}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
        <CardHeader>
          <CardTitle className="text-slate-900">GPA</CardTitle>
          <CardDescription>Optional — add when you know it (0.0 - 4.0)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gpa">GPA</Label>
            <Input
              id="gpa"
              type="number"
              step="0.01"
              min={0}
              max={4}
              placeholder="3.50"
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
              disabled={inputsDisabled}
              className="border-emerald-200/80 focus-visible:border-emerald-300 focus-visible:ring-emerald-200/60"
            />
          </div>
        </CardContent>
      </Card>

      {/* Degree Level */}
      <Card className={profileCardClass}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
        <CardHeader>
          <CardTitle className="text-slate-900">Degree Level</CardTitle>
          <CardDescription>Optional — select your current or target degree</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={degreeLevel || undefined}
            onValueChange={setDegreeLevel}
            disabled={inputsDisabled}
          >
            <SelectTrigger className="border-emerald-200/80 focus:ring-emerald-200/60">
              <SelectValue placeholder="Select degree level" />
            </SelectTrigger>
            <SelectContent>
              {degreeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Field of Study */}
      <Card className={profileCardClass}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-90" />
        <CardHeader>
          <CardTitle className="text-slate-900">Field of Study</CardTitle>
          <CardDescription>Optional — your major or focus area</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="e.g., Computer Science"
            value={fieldOfStudy}
            onChange={(e) => setFieldOfStudy(e.target.value)}
            disabled={inputsDisabled}
            className="border-emerald-200/80 focus-visible:border-emerald-300 focus-visible:ring-emerald-200/60"
          />
          <Input
            placeholder="Preferred country (e.g., Germany, Canada)"
            value={preferredCountry}
            onChange={(e) => setPreferredCountry(e.target.value)}
            disabled={inputsDisabled}
            className="border-emerald-200/80 focus-visible:border-emerald-300 focus-visible:ring-emerald-200/60"
          />
        </CardContent>
      </Card>

      {/* Interests */}
      <Card className={profileCardClass}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-90" />
        <CardHeader>
          <CardTitle className="text-slate-900">Areas of Interest</CardTitle>
          <CardDescription>Optional — select up to 10 areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {interestOptions.map((interest) => (
              <div key={interest} className="flex items-center gap-2">
                <Checkbox
                  id={interest}
                  checked={interests.includes(interest)}
                  onCheckedChange={() => toggleInterest(interest)}
                  disabled={inputsDisabled || (interests.length >= 10 && !interests.includes(interest))}
                />
                <Label htmlFor={interest} className="font-normal cursor-pointer text-sm">
                  {interest}
                </Label>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Selected: {interests.length}/10
          </p>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        type="submit"
        disabled={saving || loadingExisting}
        className="flex w-full items-center justify-center bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {saving ? (
          <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        ) : null}
        {saving ? 'Saving...' : isEditing ? 'Save Profile' : justSaved ? 'Saved' : 'Edit'}
      </Button>
    </form>
  )
}