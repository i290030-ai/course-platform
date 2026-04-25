'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdminRole, isSuperAdmin, roleLabel } from '@/lib/roles'

/* ══════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════ */

// Populated when a Department exists and is linked — null otherwise
interface DeptInfo {
  id: string
  name: string
  code: string | null
}

interface Stats {
  activeCourses: number
  totalAssignments: number
  pendingSubmissions: number
  reviewedSubmissions: number
  activeParticipants: number
  totalUnits: number
  recentSubmissions: SubItem[]
  pendingList: SubItem[]
}

interface SubItem {
  id: string
  status: 'submitted' | 'reviewed'
  grade?: number | null
  feedback?: string | null
  textSubmission?: string | null
  fileUrl?: string | null
  submittedAt: string
  courseTitle?: string
  department?: DeptInfo | null        // present when course has a department
  user: { id?: string; name: string; email?: string }
  assignment: {
    id: string; title: string; courseId: string
    maxScore?: number; unit?: { id: string; title: string }
  }
}

interface AssignmentItem {
  id: string; title: string; courseId: string; maxScore: number
  dueDate?: string | null; createdAt: string
  unit: { title: string }
  _count: { submissions: number }
}

interface UserProgress {
  id: string; name: string; email: string
  enrolledCount: number; submissionsCount: number
  reviewedCount: number; avgGrade: number | null
  courseProgress: {
    courseId: string; courseTitle: string
    department?: DeptInfo | null       // present when course has a department
    totalUnits: number; completedUnits: number; pct: number
  }[]
}

type Tab = 'overview' | 'assignments' | 'submissions' | 'students' | 'progress'

/* ══════════════════════════════════════════════
   SHARED ATOMS
══════════════════════════════════════════════ */
function StatusBadge({ status }: { status: string }) {
  if (status === 'reviewed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
        ✓ נבדק
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
      ממתין לבדיקה
    </span>
  )
}

function GradeChip({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const cls = pct >= 85 ? 'text-green-700 bg-green-50' : pct >= 60 ? 'text-amber-700 bg-amber-50' : 'text-red-600 bg-red-50'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-full tabular-nums ${cls}`}>
      {value}/{max}
    </span>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  const grad = pct >= 80 ? 'from-green-400 to-emerald-500' : pct >= 40 ? 'from-amber-400 to-orange-400' : 'from-indigo-400 to-purple-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-l ${grad} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-8 text-gray-500">{pct}%</span>
    </div>
  )
}

function Spinner({ sm }: { sm?: boolean }) {
  return <span className={`${sm ? 'w-3.5 h-3.5 border-[1.5px]' : 'w-4 h-4 border-2'} border-white/30 border-t-white rounded-full animate-spin inline-block`} />
}

/** Shows department code/name if a department is linked — renders nothing otherwise */
function DeptBadge({ dept }: { dept?: DeptInfo | null }) {
  if (!dept) return null
  return (
    <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 leading-none">
      {dept.code ?? dept.name}
    </span>
  )
}

function Empty({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center space-y-2">
      <p className="text-4xl">{icon}</p>
      <p className="font-bold text-gray-600">{text}</p>
      {sub && <p className="text-sm text-gray-400">{sub}</p>}
    </div>
  )
}

function SectionLoader() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-3 text-xs font-extrabold text-gray-400 uppercase tracking-wide whitespace-nowrap ${right ? 'text-right' : 'text-right'}`}>
      {children}
    </th>
  )
}

/* Clickable summary card */
function SummaryCard({
  icon, value, label, sub, color, urgent, onClick,
}: {
  icon: string; value: number | string; label: string
  sub?: string; color: string; urgent?: boolean; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4 w-full text-right
        transition-all duration-150 group
        ${urgent ? 'border-amber-200 hover:border-amber-300 hover:shadow-amber-100' : 'border-gray-100'}
        ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-98' : 'cursor-default hover:shadow-sm'}`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-transform group-hover:scale-105 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-extrabold tabular-nums leading-none ${urgent ? 'text-amber-600' : 'text-gray-900'}`}>
          {value}
        </p>
        <p className="text-sm font-medium text-gray-500 mt-0.5">{label}</p>
        {sub && <p className={`text-xs mt-0.5 ${urgent ? 'text-amber-500' : 'text-gray-400'}`}>{sub}</p>}
      </div>
      {onClick && (
        <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 mr-auto transition-colors rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      )}
    </button>
  )
}

/* ══════════════════════════════════════════════
   REVIEW DRAWER  (full-height side panel)
══════════════════════════════════════════════ */
function ReviewDrawer({
  sub,
  allSubs,
  onSave,
  onClose,
}: {
  sub: SubItem
  allSubs: SubItem[]
  onSave: (id: string, grade: number, feedback: string) => Promise<void>
  onClose: () => void
}) {
  const max = sub.assignment.maxScore ?? 100
  const [grade, setGrade] = useState(sub.grade ?? Math.round(max * 0.7))
  const [feedback, setFeedback] = useState(sub.feedback ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const pendingList = allSubs.filter(s => s.status === 'submitted')
  const idx = pendingList.findIndex(s => s.id === sub.id)

  const pct = Math.round((grade / max) * 100)
  const gradeColor = pct >= 85 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'
  const barColor = pct >= 85 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-400'

  const doSave = async () => {
    setSaving(true)
    await onSave(sub.id, grade, feedback)
    setSaved(true)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      {/* Dimmed backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-200">
        <div className="h-1 bg-gradient-to-l from-indigo-500 via-purple-500 to-rose-500" />

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-0.5">
              בדיקת הגשה {pendingList.length > 0 && `· ${idx + 1} מתוך ${pendingList.length} ממתינות`}
            </p>
            <h2 className="font-extrabold text-gray-900 text-base leading-tight">{sub.assignment.title}</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 text-sm transition-colors">
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Student card */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-extrabold text-indigo-600 text-lg shrink-0">
              {sub.user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-gray-800">{sub.user.name}</p>
              <p className="text-xs text-gray-400">{sub.user.email}</p>
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-400">הוגש ב:</p>
              <p className="text-xs font-semibold text-gray-600 tabular-nums">
                {new Date(sub.submittedAt).toLocaleDateString('he-IL')}
              </p>
              <p className="text-xs text-gray-400 tabular-nums">
                {new Date(sub.submittedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Context */}
          <div className="flex items-center gap-2 flex-wrap">
            {sub.department && (
              <span className="bg-violet-50 text-violet-700 text-xs font-bold px-2.5 py-1 rounded-full">
                🏛 {sub.department.name}
              </span>
            )}
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">📚 {sub.courseTitle}</span>
            {sub.assignment.unit && (
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">📖 {sub.assignment.unit.title}</span>
            )}
            <StatusBadge status={saved ? 'reviewed' : sub.status} />
          </div>

          {/* Submission content */}
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-2">תוכן ההגשה</p>
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 max-h-56 overflow-y-auto">
              {sub.textSubmission ? (
                <p className="text-gray-700 text-sm leading-7 whitespace-pre-wrap">{sub.textSubmission}</p>
              ) : sub.fileUrl ? (
                <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm">
                  📎 פתח קובץ מצורף
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <p className="text-gray-400 text-sm italic">אין תוכן</p>
              )}
            </div>
          </div>

          {/* Grading */}
          <div className="space-y-4">
            <div>
              <div className="flex items-end justify-between mb-2">
                <label className="text-xs font-extrabold uppercase tracking-widest text-gray-400">ציון</label>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-extrabold tabular-nums ${gradeColor}`}>{grade}</span>
                  <span className="text-gray-400 text-sm">/ {max}</span>
                  <span className={`text-sm font-extrabold ${gradeColor} mr-1`}>({pct}%)</span>
                </div>
              </div>
              {/* Visual bar */}
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
                <div className={`h-full rounded-full transition-all duration-200 ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
              <input type="range" min={0} max={max} value={grade}
                onChange={e => { setGrade(Number(e.target.value)); setSaved(false) }}
                className="w-full h-2 bg-transparent accent-indigo-600 cursor-pointer -mt-1" />
              <div className="flex justify-between text-xs text-gray-300 font-mono mt-0.5">
                <span>0</span>
                <span className="text-red-300">{Math.round(max * 0.6)}</span>
                <span className="text-amber-300">{Math.round(max * 0.75)}</span>
                <span className="text-green-300">{max}</span>
              </div>

              {/* Quick grade buttons */}
              <div className="flex gap-2 mt-3">
                {[50, 60, 70, 80, 90, 100].map(v => (
                  <button key={v} onClick={() => { setGrade(Math.round((v / 100) * max)); setSaved(false) }}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border
                      ${Math.round((grade / max) * 100) === v
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}>
                    {v}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold uppercase tracking-widest text-gray-400 block mb-2">
                משוב לסטודנט
              </label>
              <textarea
                value={feedback}
                onChange={e => { setFeedback(e.target.value); setSaved(false) }}
                rows={4}
                placeholder="כתוב משוב מפורט — מה היה טוב? מה ניתן לשפר?"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm
                  placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300
                  resize-none leading-relaxed transition-shadow"
              />
            </div>
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="border-t border-gray-100 bg-gray-50/80 backdrop-blur-sm px-6 py-4">
          {saved ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
                הבדיקה נשמרה בהצלחה
              </div>
              <button onClick={onClose}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-5 py-2 rounded-xl text-sm transition-colors">
                חזור
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={onClose}
                className="text-sm text-gray-400 hover:text-gray-600 font-semibold transition-colors px-2">
                ← חזור
              </button>
              <div className="flex gap-2 mr-auto">
                {/* Save only (don't mark reviewed) */}
                <button onClick={doSave} disabled={saving}
                  className="inline-flex items-center gap-2 bg-white border-2 border-indigo-200 text-indigo-700
                    hover:bg-indigo-50 font-bold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60">
                  {saving ? <Spinner sm /> : '💾'}
                  שמור
                </button>
                {/* Save and mark reviewed */}
                <button onClick={doSave} disabled={saving}
                  className="inline-flex items-center gap-2 bg-gradient-to-l from-indigo-600 to-purple-600
                    hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold px-5 py-2.5
                    rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-60 text-sm">
                  {saving ? <Spinner /> : '✓'}
                  סמן כנבדק
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   OVERVIEW TAB
══════════════════════════════════════════════ */
function OverviewTab({
  stats,
  onReview,
  onGoSubmissions,
  onGoPending,
}: {
  stats: Stats
  onReview: (s: SubItem) => void
  onGoSubmissions: () => void
  onGoPending: () => void
}) {
  return (
    <div className="space-y-7">

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard icon="📚" value={stats.activeCourses}       label="קורסים פעילים"  color="bg-indigo-50" />
        <SummaryCard icon="📝" value={stats.totalAssignments}    label="משימות"          color="bg-purple-50" />
        <SummaryCard
          icon="⏳" value={stats.pendingSubmissions} label="ממתינות לבדיקה"
          color="bg-amber-50" urgent={stats.pendingSubmissions > 0}
          sub={stats.pendingSubmissions > 0 ? 'לחץ לבדיקה' : undefined}
          onClick={stats.pendingSubmissions > 0 ? onGoPending : undefined}
        />
        <SummaryCard
          icon="✅" value={stats.reviewedSubmissions} label="הגשות נבדקו"
          color="bg-green-50" onClick={onGoSubmissions}
          sub="לחץ לצפייה"
        />
        <SummaryCard icon="👥" value={stats.activeParticipants} label="משתתפים" color="bg-blue-50" />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-4">פעולות מהירות</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={onGoPending}
            className={`inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-all
              shadow-sm hover:shadow-md active:scale-95
              ${stats.pendingSubmissions > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            disabled={stats.pendingSubmissions === 0}>
            ⏳ בדוק הגשות ממתינות
            {stats.pendingSubmissions > 0 && (
              <span className="bg-white/25 text-white text-xs font-extrabold px-1.5 py-0.5 rounded-full">
                {stats.pendingSubmissions}
              </span>
            )}
          </button>
          <button onClick={onGoSubmissions}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm hover:shadow-md active:scale-95">
            📋 כל ההגשות
          </button>
          <Link href="/admin/submissions"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm hover:shadow-md active:scale-95">
            + צור משימה
          </Link>
          <Link href="/admin/courses"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm hover:shadow-md active:scale-95">
            + צור קורס
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Pending submissions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-800 flex items-center gap-2 text-sm">
              {stats.pendingSubmissions > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
              ממתינות לבדיקה
              {stats.pendingSubmissions > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs font-extrabold px-2 py-0.5 rounded-full">
                  {stats.pendingSubmissions}
                </span>
              )}
            </h3>
            <button onClick={onGoPending} className="text-xs text-indigo-500 hover:text-indigo-700 font-bold">
              הצג הכל →
            </button>
          </div>
          {stats.pendingList.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              <p className="text-2xl mb-2">🎉</p>
              אין הגשות ממתינות
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.pendingList.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-amber-50/30 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-extrabold text-indigo-600 shrink-0">
                    {s.user.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{s.user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{s.assignment.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400 hidden sm:block tabular-nums">
                      {new Date(s.submittedAt).toLocaleDateString('he-IL')}
                    </span>
                    <button onClick={() => onReview(s)}
                      className="text-xs bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
                      בדוק
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-800 text-sm">פעילות אחרונה</h3>
            <button onClick={onGoSubmissions} className="text-xs text-indigo-500 hover:text-indigo-700 font-bold">
              הצג הכל →
            </button>
          </div>
          {stats.recentSubmissions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">אין פעילות עדיין</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.recentSubmissions.map(s => (
                <div key={s.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => onReview(s)}>
                  <div className="w-2 h-2 rounded-full bg-indigo-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">
                      <span className="font-bold">{s.user.name}</span>
                      <span className="text-gray-400"> הגיש/ה — </span>
                      <span className="text-indigo-600">{s.assignment.title}</span>
                    </p>
                    <p className="text-xs text-gray-400 tabular-nums">
                      {new Date(s.submittedAt).toLocaleString('he-IL')}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   SUBMISSIONS TAB  (main feature)
══════════════════════════════════════════════ */
interface SubsFilter { status: string; assignmentId: string; search: string }

function SubmissionsTab({
  initialFilter,
  onReview,
}: {
  initialFilter?: Partial<SubsFilter>
  onReview: (s: SubItem, allSubs: SubItem[]) => void
}) {
  const [items, setItems] = useState<SubItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<SubsFilter>({
    status: initialFilter?.status ?? 'all',
    assignmentId: initialFilter?.assignmentId ?? 'all',
    search: initialFilter?.search ?? '',
  })

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/submissions-all')
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  // Update filter from parent when initialFilter changes
  useEffect(() => {
    if (initialFilter?.status) setFilter(f => ({ ...f, status: initialFilter.status! }))
  }, [initialFilter?.status])

  const assignmentMap = new Map(items.map(i => [i.assignment.id, i.assignment]))
  const assignments = Array.from(assignmentMap.values())

  const filtered = items.filter(i =>
    (filter.status === 'all' || i.status === filter.status) &&
    (filter.assignmentId === 'all' || i.assignment.id === filter.assignmentId) &&
    (filter.search === '' ||
      i.user.name.toLowerCase().includes(filter.search.toLowerCase()) ||
      (i.user.email ?? '').toLowerCase().includes(filter.search.toLowerCase()))
  )

  const pending = items.filter(i => i.status === 'submitted')
  const reviewed = items.filter(i => i.status === 'reviewed')

  return (
    <div className="space-y-5">

      {/* Mini stats row */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setFilter(f => ({ ...f, status: 'all' }))}
          className={`rounded-2xl p-4 border text-center transition-all hover:shadow-sm ${filter.status === 'all' ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 bg-white'}`}>
          <p className="text-2xl font-extrabold text-gray-900 tabular-nums">{items.length}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">סה״כ הגשות</p>
        </button>
        <button onClick={() => setFilter(f => ({ ...f, status: 'submitted' }))}
          className={`rounded-2xl p-4 border text-center transition-all hover:shadow-sm ${filter.status === 'submitted' ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-white'}`}>
          <p className="text-2xl font-extrabold text-amber-600 tabular-nums">{pending.length}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">ממתינות לבדיקה</p>
        </button>
        <button onClick={() => setFilter(f => ({ ...f, status: 'reviewed' }))}
          className={`rounded-2xl p-4 border text-center transition-all hover:shadow-sm ${filter.status === 'reviewed' ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-white'}`}>
          <p className="text-2xl font-extrabold text-green-600 tabular-nums">{reviewed.length}</p>
          <p className="text-xs text-gray-500 font-medium mt-0.5">נבדקו</p>
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-extrabold text-gray-400 uppercase tracking-widest shrink-0">סינון:</span>

        <div className="relative flex-1 min-w-40">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="חיפוש לפי שם..."
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow"
          />
        </div>

        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="all">כל הסטטוסים</option>
          <option value="submitted">ממתין לבדיקה</option>
          <option value="reviewed">נבדק</option>
        </select>

        <select value={filter.assignmentId} onChange={e => setFilter(f => ({ ...f, assignmentId: e.target.value }))}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="all">כל המשימות</option>
          {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>

        {(filter.status !== 'all' || filter.assignmentId !== 'all' || filter.search) && (
          <button onClick={() => setFilter({ status: 'all', assignmentId: 'all', search: '' })}
            className="text-xs text-gray-400 hover:text-red-500 font-semibold transition-colors px-2">
            נקה ✕
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? <SectionLoader /> : filtered.length === 0 ? (
        <Empty icon="📭" text="אין הגשות תואמות" sub="נסה לשנות את הסינון" />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <Th>סטודנט</Th>
                  <Th>קורס</Th>
                  <Th>משימה</Th>
                  <Th>תאריך הגשה</Th>
                  <Th>סטטוס</Th>
                  <Th>ציון</Th>
                  <Th>פעולות</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr key={s.id} className={`transition-colors group ${s.status === 'submitted' ? 'hover:bg-amber-50/20' : 'hover:bg-gray-50/50'}`}>
                    {/* Student */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-extrabold text-indigo-600 shrink-0">
                          {s.user.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 truncate">{s.user.name}</p>
                          <p className="text-xs text-gray-400 truncate">{s.user.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Course */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <DeptBadge dept={s.department} />
                        <span className="text-gray-600 text-sm">{s.courseTitle ?? '—'}</span>
                      </div>
                    </td>
                    {/* Assignment */}
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-gray-700">{s.assignment.title}</span>
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3.5">
                      <span className="text-gray-500 tabular-nums text-xs">
                        {new Date(s.submittedAt).toLocaleDateString('he-IL')}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3.5"><StatusBadge status={s.status} /></td>
                    {/* Grade */}
                    <td className="px-4 py-3.5">
                      {s.grade != null
                        ? <GradeChip value={s.grade} max={s.assignment.maxScore ?? 100} />
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onReview(s, items)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                            s.status === 'submitted'
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>
                          {s.status === 'submitted' ? 'בדוק' : 'ערוך'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">
              מוצגות <span className="font-bold text-gray-600">{filtered.length}</span> מתוך {items.length} הגשות
            </span>
            {filtered.length > 0 && pending.length > 0 && filter.status !== 'submitted' && (
              <button onClick={() => setFilter(f => ({ ...f, status: 'submitted' }))}
                className="text-xs text-amber-600 font-bold hover:underline">
                הצג רק ממתינות ({pending.length}) →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   ASSIGNMENTS TAB
══════════════════════════════════════════════ */
function AssignmentsTab({ onOpenSubmissions }: { onOpenSubmissions: (aId: string) => void }) {
  const [items, setItems] = useState<AssignmentItem[]>([])
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCourse, setFilterCourse] = useState('all')

  useEffect(() => {
    Promise.all([
      fetch('/api/assignments').then(r => r.json()),
      fetch('/api/courses').then(r => r.json()),
    ]).then(([a, c]) => {
      setItems(Array.isArray(a) ? a : [])
      setCourses(Array.isArray(c) ? c : [])
      setLoading(false)
    })
  }, [])

  const filtered = filterCourse === 'all' ? items : items.filter(i => i.courseId === filterCourse)
  if (loading) return <SectionLoader />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-extrabold text-gray-800">ניהול משימות</h2>
        <div className="flex items-center gap-3">
          <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="all">כל הקורסים</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <Link href="/admin/submissions"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
            + משימה חדשה
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty icon="📝" text="אין משימות עדיין" sub="צור משימה ראשונה מהכפתור למעלה" />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <Th>משימה</Th><Th>יחידה</Th><Th>ניקוד</Th><Th>תאריך יעד</Th><Th>הגשות</Th><Th>פעולות</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-400">{courses.find(c => c.id === a.courseId)?.title}</p>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{a.unit?.title ?? '—'}</td>
                  <td className="px-4 py-3.5"><span className="font-bold text-indigo-600">{a.maxScore}</span></td>
                  <td className="px-4 py-3.5 text-gray-500 tabular-nums text-xs">
                    {a.dueDate ? new Date(a.dueDate).toLocaleDateString('he-IL') : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`font-extrabold tabular-nums ${a._count.submissions > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                      {a._count.submissions}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => onOpenSubmissions(a.id)}
                      className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                      צפה בהגשות
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   STUDENTS TAB
══════════════════════════════════════════════ */
function StudentsTab() {
  const [data, setData] = useState<UserProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/progress-all').then(r => r.json()).then(d => {
      setData(Array.isArray(d.users) ? d.users : [])
      setLoading(false)
    })
  }, [])

  if (loading) return <SectionLoader />
  if (data.length === 0) return <Empty icon="👥" text="אין משתתפים עדיין" />

  return (
    <div className="space-y-4">
      <h2 className="font-extrabold text-gray-800">משתתפים</h2>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <Th>שם</Th><Th>קורסים</Th><Th>הגשות</Th><Th>נבדקו</Th><Th>ממוצע</Th><Th>פרטים</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.flatMap(u => [
              <tr key={u.id} className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-extrabold text-indigo-600 shrink-0">
                      {u.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5"><span className="font-bold text-indigo-600">{u.enrolledCount}</span></td>
                <td className="px-4 py-3.5"><span className="font-bold tabular-nums">{u.submissionsCount}</span></td>
                <td className="px-4 py-3.5"><span className="font-bold text-green-600 tabular-nums">{u.reviewedCount}</span></td>
                <td className="px-4 py-3.5">
                  {u.avgGrade != null
                    ? <span className={`font-extrabold text-base tabular-nums ${u.avgGrade >= 85 ? 'text-green-600' : u.avgGrade >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                        {u.avgGrade}%
                      </span>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-xs text-gray-400">{expanded === u.id ? '▲' : '▼'}</span>
                </td>
              </tr>,
              ...(expanded === u.id ? [
                <tr key={u.id + '-exp'} className="bg-indigo-50/30">
                  <td colSpan={6} className="px-4 py-4">
                    {u.courseProgress.length === 0
                      ? <p className="text-gray-400 text-sm">לא רשום לקורסים</p>
                      : <div className="space-y-2.5">
                          <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-3">התקדמות לפי קורס</p>
                          {u.courseProgress.map(cp => (
                            <div key={cp.courseId} className="flex items-center gap-4">
                              <div className="w-44 shrink-0 flex items-center gap-1.5 min-w-0">
                                <DeptBadge dept={cp.department} />
                                <p className="text-sm font-semibold text-gray-700 truncate">{cp.courseTitle}</p>
                              </div>
                              <div className="flex-1"><ProgressBar pct={cp.pct} /></div>
                              <p className="text-xs text-gray-400 tabular-nums shrink-0 w-20">
                                {cp.completedUnits}/{cp.totalUnits} יחידות
                              </p>
                            </div>
                          ))}
                        </div>}
                  </td>
                </tr>
              ] : [])
            ])}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   PROGRESS TAB
══════════════════════════════════════════════ */
function ProgressTab() {
  const [data, setData] = useState<{ users: UserProgress[]; courses: { id: string; title: string }[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterCourse, setFilterCourse] = useState('all')

  useEffect(() => {
    fetch('/api/admin/progress-all').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <SectionLoader />
  if (!data) return null

  const users = filterCourse === 'all'
    ? data.users
    : data.users.filter(u => u.courseProgress.some(cp => cp.courseId === filterCourse))

  const avgOverall = users.length > 0
    ? Math.round(users.reduce((s, u) => {
        const cps = filterCourse === 'all' ? u.courseProgress : u.courseProgress.filter(x => x.courseId === filterCourse)
        return s + (cps.length ? cps.reduce((a, b) => a + b.pct, 0) / cps.length : 0)
      }, 0) / users.length)
    : 0

  const displayCourses = filterCourse === 'all' ? data.courses : data.courses.filter((c: any) => c.id === filterCourse)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-extrabold text-gray-800">מעקב התקדמות</h2>
        <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="all">כל הקורסים</option>
          {data.courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon="📊" value={`${avgOverall}%`}  label="ממוצע התקדמות" color="bg-indigo-50" />
        <SummaryCard icon="👥" value={users.length}       label="משתתפים"        color="bg-blue-50" />
        <SummaryCard icon="✅" value={users.filter(u => (filterCourse === 'all' ? u.courseProgress : u.courseProgress.filter(cp => cp.courseId === filterCourse)).every(cp => cp.pct === 100)).length}
          label="השלימו קורס" color="bg-green-50" />
        <SummaryCard icon="⏳" value={users.filter(u => (filterCourse === 'all' ? u.courseProgress : u.courseProgress.filter(cp => cp.courseId === filterCourse)).some(cp => cp.pct < 100 && cp.pct > 0)).length}
          label="בתהליך" color="bg-amber-50" />
      </div>

      {users.length === 0 ? (
        <Empty icon="📊" text="אין נתוני התקדמות" />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <Th>סטודנט</Th>
                  {displayCourses.map((c: any) => <Th key={c.id}>{c.title}</Th>)}
                  <Th>ממוצע</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => {
                  const cps = filterCourse === 'all' ? u.courseProgress : u.courseProgress.filter(cp => cp.courseId === filterCourse)
                  const avg = cps.length ? Math.round(cps.reduce((s, c) => s + c.pct, 0) / cps.length) : 0
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center font-extrabold text-indigo-600 text-xs shrink-0">{u.name[0]}</div>
                          <span className="font-semibold text-gray-800">{u.name}</span>
                        </div>
                      </td>
                      {displayCourses.map((c: any) => {
                        const cp = u.courseProgress.find(x => x.courseId === c.id)
                        return (
                          <td key={c.id} className="px-4 py-3.5 min-w-32">
                            {cp ? <ProgressBar pct={cp.pct} /> : <span className="text-gray-200 text-xs">לא רשום</span>}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3.5">
                        <span className={`font-extrabold tabular-nums ${avg >= 80 ? 'text-green-600' : avg >= 40 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {avg}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   NAV CONFIG
══════════════════════════════════════════════ */
const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',    label: 'סקירה כללית', icon: '🏠' },
  { id: 'submissions', label: 'הגשות',        icon: '📋' },
  { id: 'assignments', label: 'משימות',        icon: '📝' },
  { id: 'students',    label: 'משתתפים',      icon: '👥' },
  { id: 'progress',    label: 'התקדמות',      icon: '📊' },
]

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Submissions tab can receive an initial filter from card clicks
  const [subsFilter, setSubsFilter] = useState<Partial<{ status: string; assignmentId: string }>>({})

  // Review drawer state — holds the submission being reviewed + full list
  const [reviewing, setReviewing] = useState<{ sub: SubItem; all: SubItem[] } | null>(null)

  const userRole = (session?.user as any)?.role
  const superAdmin = isSuperAdmin(userRole)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !isAdminRole((session?.user as any)?.role)) router.push('/dashboard')
  }, [status, session, router])

  const loadStats = useCallback(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => setStats(d))
  }, [])

  useEffect(() => { if (status === 'authenticated') loadStats() }, [status, loadStats])

  /* Navigate to submissions with a filter preset */
  const goSubmissions = useCallback((filter?: Partial<{ status: string; assignmentId: string }>) => {
    setSubsFilter(filter ?? {})
    setTab('submissions')
  }, [])

  /* Save review to DB */
  const handleSaveReview = useCallback(async (id: string, grade: number, feedback: string) => {
    await fetch(`/api/submissions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade, feedback }),
    })
    loadStats() // refresh cards
  }, [loadStats])

  if (status === 'loading' || !stats)
    return (
      <div dir="rtl" className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-indigo-500 font-medium text-sm">טוען דאשבורד...</span>
        </div>
      </div>
    )

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f6fa] flex">

      {/* ── SIDEBAR ── */}
      <aside className={`
        shrink-0 w-56 bg-white border-l border-gray-100 shadow-sm flex flex-col
        fixed top-0 right-0 bottom-0 z-30 transition-transform duration-300
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm bg-gradient-to-br ${superAdmin ? 'from-purple-600 to-indigo-600' : 'from-indigo-500 to-indigo-600'}`}>
              {superAdmin ? 'S' : 'A'}
            </div>
            <div>
              <p className="font-extrabold text-gray-900 text-sm leading-none truncate max-w-[110px]">{session?.user?.name}</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${superAdmin ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {roleLabel(userRole)}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(n => (
            <button key={n.id}
              onClick={() => { setTab(n.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all
                ${tab === n.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <span className="text-base">{n.icon}</span>
              {n.label}
              {n.id === 'submissions' && stats.pendingSubmissions > 0 && (
                <span className={`mr-auto text-xs font-extrabold px-2 py-0.5 rounded-full ${
                  tab === 'submissions' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'
                }`}>
                  {stats.pendingSubmissions}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
          <Link href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold
              text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors">
            <span>🏠</span> חזרה לניהול
          </Link>
          <Link href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
            <span>🏫</span> פורטל תלמיד
          </Link>
          {superAdmin && (
            <>
              <Link href="/admin/users"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
                <span>👥</span> משתמשים
              </Link>
              <Link href="/admin/access-codes"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
                <span>🔑</span> קודי גישה
              </Link>
            </>
          )}
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
            <span>🚪</span> יציאה
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
          <div className="px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                ☰
              </button>
              <div>
                <h1 className="text-base font-extrabold text-gray-900 leading-none">
                  {NAV.find(n => n.id === tab)?.label ?? 'דאשבורד'}
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {stats.pendingSubmissions > 0 && (
                <button onClick={() => goSubmissions({ status: 'submitted' })}
                  className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-extrabold
                    px-3 py-1.5 rounded-full border border-amber-200 hover:bg-amber-100 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {stats.pendingSubmissions} ממתינות לבדיקה
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-5 lg:p-7 overflow-auto">
          {tab === 'overview' && (
            <OverviewTab
              stats={stats}
              onReview={(s) => setReviewing({ sub: s, all: stats.recentSubmissions })}
              onGoSubmissions={() => goSubmissions()}
              onGoPending={() => goSubmissions({ status: 'submitted' })}
            />
          )}
          {tab === 'submissions' && (
            <SubmissionsTab
              key={JSON.stringify(subsFilter)}
              initialFilter={subsFilter}
              onReview={(s, all) => setReviewing({ sub: s, all })}
            />
          )}
          {tab === 'assignments' && (
            <AssignmentsTab onOpenSubmissions={(aId) => goSubmissions({ assignmentId: aId })} />
          )}
          {tab === 'students' && <StudentsTab />}
          {tab === 'progress' && <ProgressTab />}
        </main>
      </div>

      {/* Review drawer */}
      {reviewing && (
        <ReviewDrawer
          sub={reviewing.sub}
          allSubs={reviewing.all}
          onSave={handleSaveReview}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  )
}
