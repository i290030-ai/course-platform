'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MainLayout from '@/components/MainLayout'

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface Unit {
  id: string
  title: string
  locked: boolean
  completed?: boolean
  orderIndex: number
  zoomLink?: string
}

interface Course {
  id: string
  title: string
  description: string
  releaseMode: string
}

/* ─────────────────────────────────────────
   Animated progress bar
───────────────────────────────────────── */
function ProgressBar({ pct }: { pct: number }) {
  const [width, setWidth] = useState(0)
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true
    const t = setTimeout(() => setWidth(pct), 100)
    return () => clearTimeout(t)
  }, [pct])

  const color = pct === 100
    ? 'from-green-400 to-emerald-500'
    : 'from-indigo-500 to-purple-500'

  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-l ${color} transition-all duration-700 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

/* ─────────────────────────────────────────
   Skeleton
───────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-4">
        <div className="h-5 bg-gray-200 rounded-full w-1/3" />
        <div className="h-8 bg-gray-200 rounded-full w-2/3" />
        <div className="h-4 bg-gray-100 rounded-full w-full" />
        <div className="h-4 bg-gray-100 rounded-full w-4/5" />
        <div className="h-2 bg-gray-100 rounded-full w-full mt-4" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded-full w-1/2" />
            <div className="h-3 bg-gray-100 rounded-full w-1/3" />
          </div>
          <div className="h-9 w-20 bg-gray-200 rounded-xl" />
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────
   Unit state card
───────────────────────────────────────── */
function UnitCard({ unit, isCurrent }: { unit: Unit; isCurrent: boolean }) {
  const state = unit.locked
    ? 'locked'
    : unit.completed
    ? 'completed'
    : isCurrent
    ? 'current'
    : 'available'

  const iconStyles = {
    completed: 'bg-green-500 text-white',
    current:   'bg-indigo-600 text-white',
    available: 'bg-indigo-50 text-indigo-600',
    locked:    'bg-gray-100 text-gray-400',
  }

  const cardStyles = {
    completed: 'border-green-100 bg-white',
    current:   'border-indigo-300 ring-2 ring-indigo-100 bg-white',
    available: 'border-gray-100 bg-white hover:border-indigo-100',
    locked:    'border-gray-100 bg-gray-50/50 opacity-60',
  }

  const accentStyles = {
    completed: 'from-green-400 to-emerald-500',
    current:   'from-indigo-500 to-purple-600',
    available: 'from-indigo-300 to-purple-400',
    locked:    'from-gray-200 to-gray-300',
  }

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-200
      ${state !== 'locked' ? 'hover:-translate-y-0.5 hover:shadow-md' : ''}
      ${cardStyles[state]}`}>

      {/* top accent line */}
      <div className={`h-0.5 bg-gradient-to-l ${accentStyles[state]}`} />

      <div className="p-5 flex items-center gap-4">
        {/* circle icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 ${iconStyles[state]}`}>
          {state === 'completed' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : state === 'locked' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : (
            unit.orderIndex + 1
          )}
        </div>

        {/* text */}
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm leading-snug truncate ${
            state === 'locked' ? 'text-gray-400' : 'text-gray-900'
          }`}>
            {unit.title}
          </p>
          <p className="text-xs mt-0.5 font-medium">
            {state === 'completed' && <span className="text-green-600">הושלם</span>}
            {state === 'current'   && <span className="text-indigo-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse inline-block" />
              ממשיך עכשיו
            </span>}
            {state === 'available' && <span className="text-gray-400">זמין ללמידה</span>}
            {state === 'locked'    && (
              <span className="text-gray-400 flex items-center gap-1">
                השלם את היחידה הקודמת כדי לפתוח
              </span>
            )}
          </p>
        </div>

        {/* CTA */}
        {state !== 'locked' && (
          <Link
            href={`/unit/${unit.id}`}
            className={`shrink-0 inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl
              transition-all duration-150 active:scale-95 ${
              state === 'completed'
                ? 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                : state === 'current'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
            }`}
          >
            {state === 'completed' ? 'צפה שוב' : state === 'current' ? 'המשך' : 'התחל'}
            <span className="text-xs opacity-70">→</span>
          </Link>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
export default function CoursePage({ params }: { params: { id: string } }) {
  const { status } = useSession()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    Promise.all([
      fetch(`/api/courses/${params.id}`).then(r => r.json()),
      fetch(`/api/units/${params.id}`).then(r => r.json()),
    ]).then(([courseData, unitsData]) => {
      setCourse(courseData)
      setUnits(Array.isArray(unitsData) ? unitsData : [])
      setLoading(false)
    })
  }, [status, params.id])

  /* Derived progress */
  const totalUnits     = units.length
  const completedUnits = units.filter(u => u.completed).length
  const pct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0

  /* Current unit: first non-locked, non-completed */
  const currentUnit = units.find(u => !u.locked && !u.completed) ?? null

  /* Resume href */
  const resumeHref = currentUnit
    ? `/unit/${currentUnit.id}`
    : units.find(u => !u.locked)
    ? `/unit/${units.find(u => !u.locked)!.id}`
    : null

  return (
    <MainLayout>
      {loading ? (
        <Skeleton />
      ) : (
        <>
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link href="/dashboard" className="hover:text-indigo-600 font-medium transition-colors">
              קורסים
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-semibold truncate">{course?.title}</span>
          </nav>

          {/* Hero / progress card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className={`h-1.5 bg-gradient-to-l ${
              pct === 100 ? 'from-green-400 to-emerald-500' : 'from-indigo-500 to-purple-600'
            }`} />

            <div className="p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
                    {course?.title}
                  </h1>
                  {course?.description && (
                    <p className="mt-2 text-gray-500 text-sm leading-relaxed max-w-xl">
                      {course.description}
                    </p>
                  )}

                  {/* progress stats */}
                  {totalUnits > 0 && (
                    <div className="mt-5 space-y-2 max-w-sm">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-400">
                          {completedUnits} מתוך {totalUnits} יחידות הושלמו
                        </span>
                        <span className={pct === 100 ? 'text-green-600' : 'text-indigo-600'}>
                          {pct}%
                        </span>
                      </div>
                      <ProgressBar pct={pct} />
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="shrink-0">
                  {pct === 100 ? (
                    <span className="inline-flex items-center gap-2 bg-green-50 text-green-700
                      border border-green-200 font-bold text-sm px-5 py-3 rounded-2xl">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      הקורס הושלם!
                    </span>
                  ) : resumeHref ? (
                    <Link
                      href={resumeHref}
                      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700
                        active:scale-95 text-white font-extrabold text-sm px-6 py-3 rounded-2xl
                        shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      {pct === 0 ? 'התחל קורס' : 'המשך למידה'}
                      <span className="text-xs opacity-80">→</span>
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Course completion celebration */}
          {pct === 100 && (
            <div className="mb-6 rounded-2xl overflow-hidden border-2 border-green-200 shadow-sm">
              <div className="h-1 bg-gradient-to-l from-green-400 to-emerald-500" />
              <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8 text-center">
                <p className="text-5xl mb-3">🎉</p>
                <h2 className="text-2xl font-extrabold text-green-800 mb-1">סיימת את הקורס!</h2>
                <p className="text-green-600 text-sm mb-6">כל הכבוד! השלמת את כל {totalUnits} היחידות בהצלחה.</p>
                {/* Certificate placeholder */}
                <div className="inline-flex items-center gap-4 bg-white rounded-2xl border border-green-100
                  shadow-sm px-6 py-4 text-right">
                  <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                    🏆
                  </div>
                  <div>
                    <p className="font-extrabold text-gray-800 text-sm">תעודת סיום</p>
                    <p className="text-xs text-gray-400 mt-0.5">תכונה זו תהיה זמינה בקרוב</p>
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200
                    px-2.5 py-1 rounded-full shrink-0">
                    בקרוב
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Units list */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-800">
              יחידות הקורס
              <span className="mr-2 text-gray-400 font-normal text-sm">({totalUnits})</span>
            </h2>
          </div>

          <div className="space-y-3">
            {units.map(unit => (
              <UnitCard
                key={unit.id}
                unit={unit}
                isCurrent={!!(currentUnit && unit.id === currentUnit.id)}
              />
            ))}

            {units.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <p className="text-4xl mb-3">📭</p>
                <p className="font-bold text-gray-700">אין יחידות זמינות בקורס זה עדיין</p>
              </div>
            )}
          </div>
        </>
      )}
    </MainLayout>
  )
}
