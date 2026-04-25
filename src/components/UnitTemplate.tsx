'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AssignmentPanel from './AssignmentPanel'
import Header from './Header'

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
export interface UnitResource {
  label: string
  url: string
  type: 'file' | 'link' | 'zoom'
}

export interface SidebarUnit {
  id: string
  title: string
  orderIndex: number
  locked: boolean
  completed: boolean
}

export interface UnitTemplateProps {
  unitId: string
  courseId: string
  courseTitle?: string
  title: string
  description?: string
  orderIndex?: number
  estimatedMinutes?: number
  objectives?: string[]
  videoUrl?: string | null
  content?: string
  practice?: string
  assignment?: string
  resources?: UnitResource[]
  progress?: number
  completed?: boolean
  nextUnitId?: string | null
  nextUnitLocked?: boolean
  courseUnits?: SidebarUnit[]
  onComplete?: () => Promise<void>
  onSubmitAssignment?: () => void
}

type StepId = 'objectives' | 'content' | 'practice' | 'assignment'
type StepState = 'done' | 'active' | 'upcoming'

interface StepDef {
  id: StepId
  label: string
  icon: string
}

/* ─────────────────────────────────────────
   Course sidebar
───────────────────────────────────────── */
function CourseSidebar({
  units,
  currentUnitId,
}: {
  units: SidebarUnit[]
  currentUnitId: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">יחידות הקורס</p>
      </div>
      <div className="divide-y divide-gray-50 max-h-[calc(100vh-140px)] overflow-y-auto">
        {units.map(unit => {
          const isCurrent = unit.id === currentUnitId
          const state: 'completed' | 'current' | 'available' | 'locked' = unit.locked
            ? 'locked'
            : unit.completed
            ? 'completed'
            : isCurrent
            ? 'current'
            : 'available'

          const iconEl =
            state === 'completed' ? (
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            ) : state === 'current' ? (
              <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-extrabold shrink-0">
                {unit.orderIndex + 1}
              </span>
            ) : state === 'locked' ? (
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
            ) : (
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                {unit.orderIndex + 1}
              </span>
            )

          const row = (
            <div className="flex items-center gap-2.5 px-4 py-3">
              {/* current indicator */}
              <div className={`absolute top-0 end-0 bottom-0 w-0.5 ${isCurrent ? 'bg-indigo-500' : 'bg-transparent'}`} />
              {iconEl}
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold leading-snug truncate ${
                  state === 'locked' ? 'text-gray-400' :
                  isCurrent ? 'text-indigo-700' :
                  state === 'completed' ? 'text-gray-500' : 'text-gray-700'
                }`}>
                  {unit.title}
                </p>
                {isCurrent && (
                  <p className="text-[10px] text-indigo-400 font-bold mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
                    כעת
                  </p>
                )}
                {state === 'completed' && (
                  <p className="text-[10px] text-green-500 font-bold mt-0.5">הושלם</p>
                )}
              </div>
            </div>
          )

          return (
            <div key={unit.id} className={`relative ${isCurrent ? 'bg-indigo-50/60' : 'hover:bg-gray-50'} transition-colors`}>
              {state === 'locked' ? (
                <div className="opacity-50 cursor-not-allowed">{row}</div>
              ) : (
                <Link href={`/unit/${unit.id}`} className="block">{row}</Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Step progress rail
───────────────────────────────────────── */
function StepRail({
  steps,
  stateFor,
  onStepClick,
}: {
  steps: StepDef[]
  stateFor: (id: StepId) => StepState
  onStepClick: (id: StepId) => void
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
      {steps.map((step, i) => {
        const s = stateFor(step.id)
        return (
          <div key={step.id} className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onStepClick(step.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold
                transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 ${
                s === 'done'
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : s === 'active'
                  ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300 hover:bg-indigo-200'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {s === 'done' ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span>{step.icon}</span>
              )}
              <span>{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`w-3 h-px shrink-0 ${s === 'done' ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────
   Collapsible code block
───────────────────────────────────────── */
function PracticeContent({ text }: { text: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const hasCode = text.includes('```')

  if (!hasCode) {
    return (
      <div
        className="text-gray-700 text-[15px] leading-8 whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br/>') }}
      />
    )
  }

  const parts = text.split(/(```[\s\S]*?```)/g)

  return (
    <div className="space-y-3">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w*\n/, '').trimEnd()
          const isOpen = openIdx === i
          return (
            <div key={i} className="rounded-2xl border border-teal-200 overflow-hidden shadow-sm">
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 bg-teal-50
                  text-teal-700 text-xs font-extrabold hover:bg-teal-100 transition-colors"
              >
                <span>💻 קוד לדוגמה</span>
                <span className="text-teal-500">{isOpen ? 'סגור ▲' : 'פתח ▼'}</span>
              </button>
              {isOpen && (
                <pre className="bg-gray-950 text-green-300 text-xs p-5 overflow-x-auto leading-6 font-mono">
                  {code}
                </pre>
              )}
            </div>
          )
        }
        const clean = part.trim()
        if (!clean) return null
        return (
          <div
            key={i}
            className="text-gray-700 text-[15px] leading-8 whitespace-pre-line"
            dangerouslySetInnerHTML={{
              __html: clean
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br/>'),
            }}
          />
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────
   Atoms
───────────────────────────────────────── */
function ProgressBar({ value, completed }: { value: number; completed: boolean }) {
  const pct = completed ? 100 : Math.min(100, Math.max(0, value))
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold text-gray-400">
        <span>{completed ? 'הושלמה' : 'בתהליך'}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          style={{ width: `${pct}%` }}
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            completed
              ? 'bg-gradient-to-l from-green-400 to-emerald-500'
              : 'bg-gradient-to-l from-indigo-500 to-purple-500'
          }`}
        />
      </div>
    </div>
  )
}

function SectionDivider({ icon, title, step, accent }: {
  icon: string; title: string; step: number; accent: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-sm shrink-0 ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-300">שלב {step}</p>
        <h2 className="text-sm font-extrabold text-gray-700 leading-none mt-0.5">{title}</h2>
      </div>
      <div className="flex-1 h-px bg-gray-100 mr-1" />
    </div>
  )
}

function StepArrow() {
  return (
    <div className="flex justify-center items-center flex-col gap-0 py-0.5" aria-hidden>
      <div className="w-px h-4 bg-gray-200" />
      <svg className="w-4 h-4 text-gray-200" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clipRule="evenodd" />
      </svg>
      <div className="w-px h-4 bg-gray-200" />
    </div>
  )
}

function CheckIcon({ size = 4 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function Tag({ children, color }: {
  children: React.ReactNode
  color: 'indigo' | 'purple' | 'amber' | 'rose' | 'blue' | 'teal' | 'green'
}) {
  const map = {
    indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600',
    amber:  'bg-amber-50  text-amber-600',
    rose:   'bg-rose-50   text-rose-600',
    blue:   'bg-blue-50   text-blue-600',
    teal:   'bg-teal-50   text-teal-600',
    green:  'bg-green-50  text-green-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${map[color]}`}>
      {children}
    </span>
  )
}

function resourceIcon(type: UnitResource['type']) {
  if (type === 'zoom') return '📹'
  if (type === 'file') return '📄'
  return '🔗'
}

const RESUME_KEY = (unitId: string) => `unit-resume-${unitId}`

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export default function UnitTemplate({
  unitId,
  courseId,
  courseTitle,
  title,
  description,
  orderIndex,
  estimatedMinutes,
  objectives = [],
  videoUrl,
  content = '',
  practice,
  assignment,
  resources = [],
  progress = 25,
  completed = false,
  nextUnitId,
  nextUnitLocked = false,
  courseUnits = [],
  onComplete,
  onSubmitAssignment,
}: UnitTemplateProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(completed)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [seenSteps, setSeenSteps] = useState<Set<StepId>>(new Set())
  const [activeStep, setActiveStep] = useState<StepId | null>(null)

  const heroRef = useRef<HTMLDivElement>(null)
  const canNavigateNext = !!(nextUnitId && !nextUnitLocked)

  /* Derived */
  const ytIdMatch = videoUrl?.match(/(?:embed\/|youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/)
  const ytId = ytIdMatch?.[1] ?? null
  const hasVideo = !!ytId
  const hasObjectives = objectives.length > 0
  const hasPractice = !!practice
  const hasAssignment = !!assignment
  const hasResources = resources.length > 0

  const stepAccents = {
    objectives: 'bg-amber-50 text-amber-500',
    content:    'bg-indigo-50 text-indigo-500',
    practice:   'bg-teal-50 text-teal-600',
    assignment: 'bg-rose-50 text-rose-500',
    resources:  'bg-gray-50 text-gray-500',
  }

  /* Build visible step rail */
  const railSteps: StepDef[] = [
    ...(hasObjectives ? [{ id: 'objectives' as StepId, label: 'מה לומדים', icon: '🎯' }] : []),
    { id: 'content' as StepId, label: 'תוכן', icon: '📘' },
    ...(hasPractice   ? [{ id: 'practice'   as StepId, label: 'תרגול',     icon: '🧠' }] : []),
    ...(hasAssignment ? [{ id: 'assignment'  as StepId, label: 'משימה',     icon: '📝' }] : []),
  ]

  const stateFor = (id: StepId): StepState => {
    if (done) return 'done'
    const railIdx  = railSteps.findIndex(s => s.id === id)
    const activeIdx = activeStep ? railSteps.findIndex(s => s.id === activeStep) : 0
    if (seenSteps.has(id) && railIdx < activeIdx) return 'done'
    if (id === activeStep || (activeStep === null && railIdx === 0)) return 'active'
    if (seenSteps.has(id)) return 'done'
    return 'upcoming'
  }

  /* Scroll to section */
  const scrollToSection = (id: StepId) => {
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /* IntersectionObserver — track visible section, persist to localStorage */
  useEffect(() => {
    const stepIds: StepId[] = ['objectives', 'content', 'practice', 'assignment']
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const id = entry.target.getAttribute('data-step') as StepId | null
          if (!id || !entry.isIntersecting) return
          setActiveStep(id)
          setSeenSteps(prev => { const n = new Set(prev); n.add(id); return n })
          try { localStorage.setItem(RESUME_KEY(unitId), `section-${id}`) } catch {}
        })
      },
      { threshold: 0.25, rootMargin: '-80px 0px 0px 0px' }
    )
    stepIds.forEach(id => {
      const el = document.getElementById(`section-${id}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [unitId])

  /* Resume: on mount, scroll to last viewed section */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RESUME_KEY(unitId))
      if (saved) {
        const t = setTimeout(() => {
          document.getElementById(saved)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 500)
        return () => clearTimeout(t)
      }
    } catch {}
  }, [unitId])

  /* Show sticky bar after hero scrolls out */
  useEffect(() => {
    const onScroll = () => {
      setShowStickyBar((heroRef.current?.getBoundingClientRect().bottom ?? 0) < 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Complete + optional navigate */
  const handleComplete = async () => {
    if (saving || done) return
    setSaving(true)
    try {
      await onComplete?.()
      setDone(true)
      setJustCompleted(true)
      setSaving(false)
      if (canNavigateNext) {
        setTimeout(() => router.push(`/unit/${nextUnitId}`), 1200)
      } else {
        setTimeout(() => {
          document.getElementById('unit-completion')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 200)
      }
    } catch {
      setSaving(false)
    }
  }

  const Spinner = () => (
    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  )

  /* CTA label */
  const ctaLabel = canNavigateNext ? 'סיימתי ← עבור ליחידה הבאה' : 'סיימתי יחידה'

  let stepCount = 0
  const nextStep = () => ++stepCount

  /* ────────────────────────────────────────
     RENDER
  ──────────────────────────────────────── */
  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f6fa]">
      <Header />

      {/* ══ HERO ════════════════════════════════════════════════════ */}
      <div ref={heroRef} className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-5 py-8">

          {/* Breadcrumb + tags */}
          <div className="flex justify-between items-center mb-5">
            <nav className="flex items-center gap-2 text-sm text-gray-400 min-w-0">
              <Link href="/dashboard" className="hover:text-indigo-600 font-medium transition-colors shrink-0">
                קורסים
              </Link>
              <span className="text-gray-300">/</span>
              <Link href={`/course/${courseId}`}
                className="hover:text-indigo-600 font-medium transition-colors truncate max-w-[160px]">
                {courseTitle ?? 'הקורס'}
              </Link>
              {orderIndex !== undefined && (
                <>
                  <span className="text-gray-300">/</span>
                  <span className="text-gray-700 font-semibold shrink-0">יחידה {orderIndex + 1}</span>
                </>
              )}
            </nav>
            <div className="flex items-center gap-2 shrink-0">
              {estimatedMinutes && (
                <span className="text-xs text-gray-400 font-medium">⏱ {estimatedMinutes} דקות</span>
              )}
              {hasVideo && <Tag color="purple">🎬 סרטון</Tag>}
              {hasAssignment && <Tag color="rose">📝 משימה</Tag>}
              {done && <Tag color="green">✓ הושלם</Tag>}
            </div>
          </div>

          {/* Title + CTA */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
            <div className="flex-1 min-w-0">
              {orderIndex !== undefined && (
                <span className="inline-block text-xs font-extrabold bg-indigo-50 text-indigo-500
                  px-3 py-1 rounded-full mb-3 tracking-wide">
                  יחידה #{orderIndex + 1}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="mt-2 text-gray-500 text-[15px] leading-relaxed">{description}</p>
              )}
            </div>
            <div className="shrink-0 sm:pt-1">
              {done ? (
                <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 font-bold
                  px-5 py-2.5 rounded-2xl text-sm border border-green-200">
                  <CheckIcon /> הושלם
                </span>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-gradient-to-l from-indigo-600 to-purple-600
                    hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold px-6 py-2.5
                    rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all duration-200
                    disabled:opacity-60 text-sm"
                >
                  {saving ? <><Spinner />שומר...</> : <><CheckIcon size={4} />{ctaLabel}</>}
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <ProgressBar value={progress} completed={done} />
          </div>

          {/* Step rail */}
          {railSteps.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <StepRail steps={railSteps} stateFor={stateFor} onStepClick={scrollToSection} />
            </div>
          )}
        </div>
      </div>

      {/* ══ BODY (main + sidebar) ════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex gap-6 items-start">

          {/* ── Main content (right in RTL) ─────────────────────── */}
          <div className="flex-1 min-w-0 space-y-3 pb-24">

            {/* STEP 1: OBJECTIVES */}
            {hasObjectives && (() => {
              const step = nextStep()
              return (
                <>
                  <section
                    id="section-objectives"
                    data-step="objectives"
                    className="bg-white rounded-3xl border border-amber-100 shadow-sm overflow-hidden
                      transition-all duration-200 hover:shadow-md"
                  >
                    <div className="h-0.5 bg-gradient-to-l from-amber-300 to-yellow-300" />
                    <div className="p-7">
                      <div className="mb-5">
                        <SectionDivider icon="🎯" title="מה לומדים" step={step} accent={stepAccents.objectives} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {objectives.map((obj, i) => (
                          <div key={i}
                            className="flex items-start gap-3 bg-amber-50/70 rounded-2xl px-4 py-3
                              border border-amber-100 hover:border-amber-200 transition-colors">
                            <span className="mt-0.5 w-6 h-6 rounded-full bg-amber-200 text-amber-700 text-xs
                              flex items-center justify-center shrink-0 font-extrabold">{i + 1}</span>
                            <p className="text-gray-700 text-sm leading-relaxed">{obj}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                  <StepArrow />
                </>
              )
            })()}

            {/* STEP 2: MAIN CONTENT */}
            {(() => {
              const step = nextStep()
              return (
                <>
                  <section
                    id="section-content"
                    data-step="content"
                    className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden
                      transition-all duration-200 hover:shadow-md"
                  >
                    <div className="h-0.5 bg-gradient-to-l from-indigo-400 to-blue-400" />
                    <div className="p-7">
                      <div className="mb-5">
                        <SectionDivider icon="📘" title="התוכן המרכזי" step={step} accent={stepAccents.content} />
                      </div>

                      {hasVideo ? (
                        <div className="space-y-5">
                          <div className="rounded-2xl overflow-hidden bg-gray-950 aspect-video shadow-lg">
                            {!videoPlaying ? (
                              <button
                                onClick={() => setVideoPlaying(true)}
                                className="w-full h-full relative flex items-center justify-center group"
                              >
                                <img
                                  src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                                  alt="תצוגה מקדימה"
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={e => {
                                    ;(e.target as HTMLImageElement).src =
                                      `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                                <div className="relative w-20 h-20 bg-white/95 group-hover:bg-white rounded-full
                                  flex items-center justify-center shadow-2xl transition-all duration-200 group-hover:scale-110">
                                  <svg className="w-8 h-8 text-indigo-600 mr-[-3px]" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                  </svg>
                                </div>
                                <p className="absolute bottom-4 right-4 text-white/90 text-sm font-semibold">לחץ לצפייה</p>
                              </button>
                            ) : (
                              <iframe
                                src={`${videoUrl}?autoplay=1&rel=0`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            )}
                          </div>
                          {content && (
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">📝 הערות</p>
                              <div
                                className="text-gray-700 text-sm leading-7 whitespace-pre-line"
                                dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-slate-50 rounded-2xl px-7 py-6 border border-slate-100">
                          <div
                            className="text-gray-700 text-[15px] leading-8 whitespace-pre-line"
                            dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }}
                          />
                        </div>
                      )}
                    </div>
                  </section>
                  <StepArrow />
                </>
              )
            })()}

            {/* STEP 3: PRACTICE */}
            {hasPractice && (() => {
              const step = nextStep()
              return (
                <>
                  <section
                    id="section-practice"
                    data-step="practice"
                    className="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden
                      transition-all duration-200 hover:shadow-md"
                  >
                    <div className="h-0.5 bg-gradient-to-l from-teal-400 to-emerald-400" />
                    <div className="p-7">
                      <div className="mb-5">
                        <SectionDivider icon="🧠" title="תרגול ופעילות" step={step} accent={stepAccents.practice} />
                      </div>
                      <div className="bg-teal-50/60 rounded-2xl p-5 border border-teal-100">
                        <PracticeContent text={practice!} />
                      </div>
                      <div className="mt-4">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                          ✏️ הרשומות שלי
                        </label>
                        <textarea
                          rows={3}
                          placeholder="כתוב את מחשבותיך כאן..."
                          className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700
                            placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-300
                            resize-none bg-white transition-shadow"
                        />
                      </div>
                    </div>
                  </section>
                  <StepArrow />
                </>
              )
            })()}

            {/* STEP 4: ASSIGNMENT */}
            {hasAssignment && (() => {
              const step = nextStep()
              return (
                <>
                  <section
                    id="section-assignment"
                    data-step="assignment"
                    className="relative rounded-3xl border-2 border-rose-200 shadow-md overflow-hidden
                      transition-all duration-200 hover:shadow-lg bg-white"
                  >
                    <div className="absolute top-0 end-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-400 to-pink-500 rounded-tr-3xl rounded-br-3xl" />
                    <div className="h-0.5 bg-gradient-to-l from-rose-400 to-pink-400" />
                    <div className="p-7 pe-10">
                      <div className="mb-4">
                        <SectionDivider icon="📝" title="משימה לביצוע" step={step} accent={stepAccents.assignment} />
                      </div>
                      <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-600 text-xs
                        font-extrabold px-3 py-1.5 rounded-full mb-5 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        נדרשת השלמה לפני המעבר ליחידה הבאה
                      </div>
                      <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-6
                        border border-rose-100 mb-6">
                        <div
                          className="text-gray-800 text-[15px] leading-8 font-medium whitespace-pre-line"
                          dangerouslySetInnerHTML={{ __html: assignment!.replace(/\n/g, '<br/>') }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-gray-400 text-sm">לאחר ביצוע המשימה, סמן את היחידה כהושלמה</p>
                        {!done ? (
                          <div className="flex items-center gap-3">
                            {onSubmitAssignment && (
                              <button
                                onClick={onSubmitAssignment}
                                className="inline-flex items-center gap-2 bg-white border-2 border-rose-300
                                  text-rose-600 font-bold px-5 py-2.5 rounded-2xl text-sm
                                  hover:bg-rose-50 active:scale-95 transition-all duration-200"
                              >
                                📤 הגש משימה
                              </button>
                            )}
                            <button
                              onClick={handleComplete}
                              disabled={saving}
                              className="inline-flex items-center gap-2 bg-gradient-to-l from-rose-600 to-pink-600
                                hover:from-rose-700 hover:to-pink-700 text-white font-extrabold px-6 py-2.5
                                rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all duration-200
                                disabled:opacity-60 text-sm"
                            >
                              {saving ? <><Spinner />שומר...</> : <><CheckIcon />{ctaLabel}</>}
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-2 bg-green-100 text-green-700
                            font-bold px-5 py-2.5 rounded-2xl text-sm border border-green-200">
                            <CheckIcon /> משימה הושלמה
                          </span>
                        )}
                      </div>
                    </div>
                  </section>
                  <StepArrow />
                </>
              )
            })()}

            {/* RESOURCES */}
            {hasResources && (
              <>
                <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden
                  transition-all duration-200 hover:shadow-md">
                  <div className="p-7">
                    <div className="mb-5">
                      <SectionDivider icon="📎" title="חומרים נוספים" step={stepCount} accent={stepAccents.resources} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {resources.map((res, i) => (
                        <a
                          key={i}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50
                            hover:bg-indigo-50 hover:border-indigo-200 transition-all duration-200 group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center
                            justify-center text-lg shadow-sm shrink-0">
                            {resourceIcon(res.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700 truncate transition-colors">
                              {res.label}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{res.url}</p>
                          </div>
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 shrink-0 rotate-180 transition-colors"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                </section>
                <StepArrow />
              </>
            )}

            {/* ASSIGNMENT SUBMISSION PANEL */}
            <AssignmentPanel unitId={unitId} />

            {/* COMPLETION / NAVIGATION */}
            <section
              id="unit-completion"
              className={`rounded-3xl p-8 text-center border transition-all duration-500 ${
                done
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm'
                  : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-indigo-100'
              }`}
            >
              {done ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-xl">
                      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="absolute -top-1 -left-1 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-sm shadow">🌟</span>
                  </div>
                  <div>
                    <p className="text-4xl mb-1">🎉</p>
                    <h3 className="text-2xl font-extrabold text-green-800">כל הכבוד!</h3>
                    <p className="text-green-600 text-sm mt-1">
                      {justCompleted && canNavigateNext
                        ? 'מעביר אותך ליחידה הבאה...'
                        : 'השלמת את היחידה בהצלחה. המשך כך!'}
                    </p>
                  </div>
                  {canNavigateNext ? (
                    <Link
                      href={`/unit/${nextUnitId}`}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white
                        font-extrabold px-7 py-3 rounded-2xl shadow-md hover:shadow-lg active:scale-95
                        transition-all duration-200 text-sm"
                    >
                      המשך ליחידה הבאה
                      <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Link>
                  ) : nextUnitLocked ? (
                    <div className="flex items-center gap-2 bg-gray-100 text-gray-400 font-bold
                      px-6 py-2.5 rounded-2xl text-sm border border-gray-200 cursor-not-allowed">
                      🔒 היחידה הבאה נעולה
                    </div>
                  ) : (
                    <Link
                      href={`/course/${courseId}`}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white
                        font-extrabold px-7 py-3 rounded-2xl shadow-md hover:shadow-lg active:scale-95
                        transition-all duration-200 text-sm"
                    >
                      חזור לקורס
                      <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-md border border-indigo-100">
                    🏁
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-indigo-800">מוכן לסיים?</h3>
                    <p className="text-indigo-500 text-sm mt-1">עבור על כל השלבים וסמן את היחידה כהושלמה</p>
                  </div>
                  <button
                    onClick={handleComplete}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gradient-to-l from-indigo-600 to-purple-600
                      hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold px-8 py-3.5
                      rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all duration-200
                      disabled:opacity-60 text-base"
                  >
                    {saving ? <><Spinner />שומר...</> : <><CheckIcon size={4} />{ctaLabel}</>}
                  </button>
                </div>
              )}
            </section>

          </div>{/* end main */}

          {/* ── Sidebar (left in RTL, desktop only) ─────────────── */}
          {courseUnits.length > 0 && (
            <div className="hidden lg:block w-64 shrink-0 sticky top-20">
              <CourseSidebar units={courseUnits} currentUnitId={unitId} />
            </div>
          )}

        </div>
      </div>

      {/* ══ STICKY BOTTOM BAR ═══════════════════════════════════════ */}
      <div
        className={`fixed bottom-0 inset-x-0 z-50 transition-all duration-300 ${
          showStickyBar ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-2xl">
          <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-400 truncate">
                {orderIndex !== undefined ? `יחידה ${orderIndex + 1}` : 'יחידה נוכחית'}
                {estimatedMinutes ? ` · ⏱ ${estimatedMinutes} דקות` : ''}
              </p>
              <p className="text-sm font-extrabold text-gray-800 truncate">{title}</p>
            </div>
            <div className="shrink-0">
              {done ? (
                canNavigateNext ? (
                  <Link
                    href={`/unit/${nextUnitId}`}
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700
                      text-white font-extrabold px-5 py-2.5 rounded-2xl shadow-md text-sm
                      active:scale-95 transition-all duration-200"
                  >
                    המשך ליחידה הבאה →
                  </Link>
                ) : (
                  <Link
                    href={`/course/${courseId}`}
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700
                      text-white font-extrabold px-5 py-2.5 rounded-2xl shadow-md text-sm
                      active:scale-95 transition-all duration-200"
                  >
                    חזור לקורס →
                  </Link>
                )
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-gradient-to-l from-indigo-600 to-purple-600
                    hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold px-5 py-2.5
                    rounded-2xl shadow-md text-sm active:scale-95 transition-all duration-200
                    disabled:opacity-60"
                >
                  {saving ? <><Spinner />שומר...</> : <><CheckIcon size={4} />{ctaLabel}</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
