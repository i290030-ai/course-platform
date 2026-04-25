'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
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

export interface UnitTemplateProps {
  /* meta */
  unitId: string
  courseId: string
  courseTitle?: string
  title: string
  description?: string
  orderIndex?: number
  /* content */
  objectives?: string[]
  videoUrl?: string | null
  content?: string
  practice?: string
  assignment?: string
  resources?: UnitResource[]
  /* state */
  progress?: number
  completed?: boolean
  nextUnitId?: string | null
  nextUnitLocked?: boolean
  /* callbacks */
  onComplete?: () => Promise<void>
  onSubmitAssignment?: () => void
}

/* ─────────────────────────────────────────
   Step types
───────────────────────────────────────── */
type StepId = 'objectives' | 'content' | 'practice' | 'assignment'
type StepState = 'done' | 'active' | 'upcoming'

interface Step {
  id: StepId
  label: string
  icon: string
}

/* ─────────────────────────────────────────
   Step progress rail
───────────────────────────────────────── */
function StepRail({
  steps,
  stateFor,
}: {
  steps: Step[]
  stateFor: (id: StepId) => StepState
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      {steps.map((step, i) => {
        const s = stateFor(step.id)
        return (
          <div key={step.id} className="flex items-center gap-1.5 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold
                transition-all duration-300 ${
                s === 'done'
                  ? 'bg-green-100 text-green-700'
                  : s === 'active'
                  ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                  : 'bg-gray-100 text-gray-400'
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
            </div>
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

  // Split on fenced code blocks
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
                <span className="flex items-center gap-2">💻 קוד לדוגמה</span>
                <span className="flex items-center gap-1.5 text-teal-500">
                  {isOpen ? 'סגור ▲' : 'פתח ▼'}
                </span>
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
  onComplete,
  onSubmitAssignment,
}: UnitTemplateProps) {
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(completed)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)

  /* Section visibility tracking */
  const [seenSteps, setSeenSteps] = useState<Set<StepId>>(new Set())
  const [activeStep, setActiveStep] = useState<StepId | null>(null)

  /* Refs */
  const heroRef = useRef<HTMLDivElement>(null)
  const objectivesRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLElement>(null)
  const practiceRef = useRef<HTMLElement>(null)
  const assignmentRef = useRef<HTMLElement>(null)

  /* Section visibility - IntersectionObserver */
  useEffect(() => {
    const sections: [React.RefObject<HTMLElement | null>, StepId][] = [
      [objectivesRef, 'objectives'],
      [contentRef,    'content'],
      [practiceRef,   'practice'],
      [assignmentRef, 'assignment'],
    ]

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const id = entry.target.getAttribute('data-step') as StepId | null
          if (!id) return
          if (entry.isIntersecting) {
            setActiveStep(id)
            setSeenSteps(prev => { const next = new Set(prev); next.add(id); return next })
          }
        })
      },
      { threshold: 0.25, rootMargin: '-80px 0px 0px 0px' }
    )

    sections.forEach(([ref]) => { if (ref.current) observer.observe(ref.current) })
    return () => observer.disconnect()
  }, [])

  /* Sticky bar - show after hero scrolls out of view */
  useEffect(() => {
    const onScroll = () => {
      const heroBottom = heroRef.current?.getBoundingClientRect().bottom ?? 0
      setShowStickyBar(heroBottom < 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Derived */
  const ytIdMatch = videoUrl?.match(/(?:embed\/|youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/)
  const ytId = ytIdMatch?.[1] ?? null
  const hasVideo = !!ytId
  const hasObjectives = objectives.length > 0
  const hasPractice = !!practice
  const hasAssignment = !!assignment
  const hasResources = resources.length > 0

  let stepCount = 0
  const nextStep = () => ++stepCount

  const stepAccents = {
    objectives: 'bg-amber-50 text-amber-500',
    content:    'bg-indigo-50 text-indigo-500',
    practice:   'bg-teal-50 text-teal-600',
    assignment: 'bg-rose-50 text-rose-500',
    resources:  'bg-gray-50 text-gray-500',
  }

  /* Build step rail data */
  const railSteps: Step[] = [
    ...(hasObjectives ? [{ id: 'objectives' as StepId, label: 'מה לומדים', icon: '🎯' }] : []),
    { id: 'content' as StepId, label: 'תוכן', icon: '📘' },
    ...(hasPractice ? [{ id: 'practice' as StepId, label: 'תרגול', icon: '🧠' }] : []),
    ...(hasAssignment ? [{ id: 'assignment' as StepId, label: 'משימה', icon: '📝' }] : []),
  ]

  const stateFor = useCallback((id: StepId): StepState => {
    if (done) return 'done'
    const railIdx = railSteps.findIndex(s => s.id === id)
    const activeIdx = railSteps.findIndex(s => s.id === activeStep)
    if (seenSteps.has(id) && railIdx < activeIdx) return 'done'
    if (id === activeStep || (activeStep === null && railIdx === 0)) return 'active'
    if (seenSteps.has(id)) return 'done'
    return 'upcoming'
  }, [done, seenSteps, activeStep, railSteps])

  /* Complete handler */
  const handleComplete = async () => {
    if (saving || done) return
    setSaving(true)
    try {
      await onComplete?.()
    } finally {
      setDone(true)
      setJustCompleted(true)
      setSaving(false)
      // Scroll to completion section
      setTimeout(() => {
        document.getElementById('unit-completion')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
    }
  }

  const Spinner = () => (
    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  )

  /* ─── Main CTA button (used in multiple places) ─── */
  function CompleteButton({ size = 'md' }: { size?: 'md' | 'lg' }) {
    if (done) {
      return (
        <span className={`inline-flex items-center gap-2 bg-green-100 text-green-700 font-bold
          rounded-2xl border border-green-200 ${size === 'lg' ? 'px-7 py-3 text-base' : 'px-5 py-2.5 text-sm'}`}>
          <CheckIcon /> הושלם
        </span>
      )
    }
    return (
      <button
        onClick={handleComplete}
        disabled={saving}
        className={`inline-flex items-center gap-2 bg-gradient-to-l from-indigo-600 to-purple-600
          hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold rounded-2xl shadow-md
          hover:shadow-lg active:scale-95 transition-all duration-200 disabled:opacity-60
          ${size === 'lg' ? 'px-8 py-3.5 text-base' : 'px-6 py-2.5 text-sm'}`}
      >
        {saving ? <><Spinner />שומר...</> : <><CheckIcon size={4} />סיימתי יחידה</>}
      </button>
    )
  }

  /* ────────────────────────────────────────
     RENDER
  ──────────────────────────────────────── */
  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f6fa]">
      <Header />

      {/* ══ HERO ════════════════════════════════════════════════════ */}
      <div ref={heroRef} className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-5 py-8">

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
              <CompleteButton />
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <ProgressBar value={progress} completed={done} />
          </div>

          {/* Step rail */}
          {railSteps.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <StepRail steps={railSteps} stateFor={stateFor} />
            </div>
          )}
        </div>
      </div>

      {/* ══ FLOW BODY ═══════════════════════════════════════════════ */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-3 pb-24">

        {/* ── STEP 1: OBJECTIVES ─────────────────────────────────── */}
        {hasObjectives && (() => {
          const step = nextStep()
          return (
            <>
              <section
                ref={objectivesRef}
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

        {/* ── STEP 2: MAIN CONTENT ───────────────────────────────── */}
        {(() => {
          const step = nextStep()
          return (
            <>
              <section
                ref={contentRef}
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

        {/* ── STEP 3: PRACTICE ───────────────────────────────────── */}
        {hasPractice && (() => {
          const step = nextStep()
          return (
            <>
              <section
                ref={practiceRef}
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

        {/* ── STEP 4: ASSIGNMENT ─────────────────────────────────── */}
        {hasAssignment && (() => {
          const step = nextStep()
          return (
            <>
              <section
                ref={assignmentRef}
                data-step="assignment"
                className="relative rounded-3xl border-2 border-rose-200 shadow-md overflow-hidden
                  transition-all duration-200 hover:shadow-lg bg-white"
              >
                <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-400 to-pink-500 rounded-tr-3xl rounded-br-3xl" />
                <div className="h-0.5 bg-gradient-to-l from-rose-400 to-pink-400" />
                <div className="p-7 pr-10">
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
                          {saving ? <><Spinner />שומר...</> : <><CheckIcon />בצע משימה</>}
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

        {/* ── RESOURCES ──────────────────────────────────────────── */}
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

        {/* ── ASSIGNMENT SUBMISSION PANEL ────────────────────────── */}
        <AssignmentPanel unitId={unitId} />

        {/* ── COMPLETION / NAVIGATION ────────────────────────────── */}
        <section
          id="unit-completion"
          className={`rounded-3xl p-8 text-center border transition-all duration-500 ${
            done
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm'
              : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-indigo-100'
          }`}
        >
          {done ? (
            <div className={`flex flex-col items-center gap-4 ${justCompleted ? 'animate-bounce-once' : ''}`}>
              <div className="relative">
                <div className={`w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-xl
                  ${justCompleted ? 'animate-scale-in' : ''}`}>
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="absolute -top-1 -left-1 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-sm shadow">🌟</span>
              </div>
              <div>
                <p className="text-4xl mb-1">🎉</p>
                <h3 className="text-2xl font-extrabold text-green-800">כל הכבוד!</h3>
                <p className="text-green-600 text-sm mt-1">השלמת את היחידה בהצלחה. המשך כך!</p>
              </div>
              {nextUnitId && !nextUnitLocked ? (
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
                {saving
                  ? <><Spinner />שומר...</>
                  : <><CheckIcon size={4} />סיימתי יחידה</>}
              </button>
            </div>
          )}
        </section>

      </div>

      {/* ══ STICKY BOTTOM BAR ═══════════════════════════════════════ */}
      <div
        className={`fixed bottom-0 inset-x-0 z-50 transition-all duration-300 ${
          showStickyBar ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-2xl">
          <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-400 truncate">
                {orderIndex !== undefined ? `יחידה ${orderIndex + 1}` : 'יחידה נוכחית'}
              </p>
              <p className="text-sm font-extrabold text-gray-800 truncate">{title}</p>
            </div>
            <div className="shrink-0">
              {done ? (
                nextUnitId && !nextUnitLocked ? (
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
                  {saving ? <><Spinner />שומר...</> : <><CheckIcon size={4} />סיימתי יחידה</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
