'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdminRole } from '@/lib/roles'

interface Assignment {
  id: string
  title: string
  courseId: string
  maxScore: number
  dueDate?: string | null
  unit: { title: string; courseId: string }
  _count: { submissions: number }
}

interface Submission {
  id: string
  status: 'submitted' | 'reviewed'
  textSubmission?: string | null
  fileUrl?: string | null
  grade?: number | null
  feedback?: string | null
  submittedAt: string
  user: { id: string; name: string; email: string }
}

function StatusBadge({ status }: { status: string }) {
  return status === 'reviewed' ? (
    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full border border-green-200">
      ✓ נבדק
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      הוגש
    </span>
  )
}

function GradeModal({
  sub,
  maxScore,
  onSave,
  onClose,
}: {
  sub: Submission
  maxScore: number
  onSave: (grade: number, feedback: string) => Promise<void>
  onClose: () => void
}) {
  const [grade, setGrade] = useState(sub.grade ?? 0)
  const [feedback, setFeedback] = useState(sub.feedback ?? '')
  const [saving, setSaving] = useState(false)

  const pct = Math.round((grade / maxScore) * 100)
  const gradeColor =
    pct >= 85 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'

  const submit = async () => {
    setSaving(true)
    await onSave(grade, feedback)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div dir="rtl" className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-l from-indigo-500 to-purple-500" />
        <div className="p-7">
          {/* Student info */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600">
              {sub.user.name[0]}
            </div>
            <div>
              <p className="font-bold text-gray-800">{sub.user.name}</p>
              <p className="text-gray-400 text-xs">{sub.user.email}</p>
            </div>
            <div className="mr-auto">
              <StatusBadge status={sub.status} />
            </div>
          </div>

          {/* Submission content */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-5 max-h-40 overflow-y-auto">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">ההגשה</p>
            {sub.textSubmission && (
              <p className="text-gray-700 text-sm leading-7 whitespace-pre-line">{sub.textSubmission}</p>
            )}
            {sub.fileUrl && (
              <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 hover:underline text-sm flex items-center gap-1.5 mt-1">
                📎 פתח קובץ
              </a>
            )}
          </div>

          {/* Grade input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ציון <span className={`text-lg font-extrabold ${gradeColor}`}>{grade}</span>
                <span className="text-gray-400 font-normal"> / {maxScore}</span>
                <span className={`text-sm font-bold mr-2 ${gradeColor}`}>({pct}%)</span>
              </label>
              <input
                type="range"
                min={0}
                max={maxScore}
                value={grade}
                onChange={e => setGrade(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>0</span><span>{maxScore}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">משוב</label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={3}
                placeholder="כתוב משוב לסטודנט..."
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm
                  placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mt-5">
            <button onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">
              ביטול
            </button>
            <button onClick={submit} disabled={saving}
              className="inline-flex items-center gap-2 bg-gradient-to-l from-indigo-600 to-purple-600
                hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-6 py-2.5
                rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-60 text-sm">
              {saving ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />שומר...</>
              ) : '💾 שמור ציון'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminSubmissionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [gradingFor, setGradingFor] = useState<Submission | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [courses, setCourses] = useState<{ id: string; title: string; units: { id: string; title: string }[] }[]>([])
  const [form, setForm] = useState({ courseId: '', unitId: '', title: '', description: '', maxScore: 100, dueDate: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !isAdminRole((session?.user as any)?.role)) router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/assignments').then(r => r.json()).then(d => setAssignments(Array.isArray(d) ? d : []))
      fetch('/api/courses').then(r => r.json()).then(d => {
        const arr = Array.isArray(d) ? d : []
        setCourses(arr)
        if (arr.length > 0) setForm(f => ({ ...f, courseId: arr[0].id, unitId: arr[0].units?.[0]?.id ?? '' }))
      })
    }
  }, [status])

  const loadSubmissions = async (a: Assignment) => {
    setSelectedAssignment(a)
    setLoadingSubs(true)
    const data = await fetch(`/api/submissions/assignment/${a.id}`).then(r => r.json())
    setSubmissions(Array.isArray(data) ? data : [])
    setLoadingSubs(false)
  }

  const handleGrade = async (grade: number, feedback: string) => {
    if (!gradingFor) return
    const updated = await fetch(`/api/submissions/${gradingFor.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade, feedback }),
    }).then(r => r.json())
    setSubmissions(subs => subs.map(s => s.id === updated.id ? updated : s))
    setGradingFor(null)
  }

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, dueDate: form.dueDate || null }),
    }).then(r => r.json())
    setAssignments(prev => [res, ...prev])
    setShowCreateForm(false)
    setSaving(false)
  }

  const selectedCourseUnits = courses.find(c => c.id === form.courseId)?.units ?? []
  const pending = submissions.filter(s => s.status === 'submitted').length

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin" className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">← ניהול</Link>
          <h1 className="text-xl font-bold text-indigo-800">ניהול משימות והגשות</h1>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── LEFT: Assignments list ── */}
          <div className="lg:w-80 shrink-0 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-800">משימות</h2>
              <button onClick={() => setShowCreateForm(!showCreateForm)}
                className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
                + חדש
              </button>
            </div>

            {/* Create form */}
            {showCreateForm && (
              <form onSubmit={createAssignment}
                className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm space-y-3">
                <h3 className="font-bold text-gray-800 text-sm">משימה חדשה</h3>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">קורס</label>
                  <select value={form.courseId}
                    onChange={e => {
                      const c = courses.find(x => x.id === e.target.value)
                      setForm(f => ({ ...f, courseId: e.target.value, unitId: c?.units?.[0]?.id ?? '' }))
                    }}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">יחידה</label>
                  <select value={form.unitId}
                    onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {selectedCourseUnits.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">כותרת</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    required className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">הוראות</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} required
                    className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ניקוד מקס׳</label>
                    <input type="number" value={form.maxScore}
                      onChange={e => setForm(f => ({ ...f, maxScore: Number(e.target.value) }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">תאריך הגשה</label>
                    <input type="date" value={form.dueDate}
                      onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 rounded-xl disabled:opacity-60 transition-colors">
                    {saving ? 'שומר...' : 'צור משימה'}
                  </button>
                  <button type="button" onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold py-2 rounded-xl transition-colors">
                    ביטול
                  </button>
                </div>
              </form>
            )}

            {/* Assignment cards */}
            {assignments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
                אין משימות עדיין
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map(a => (
                  <button key={a.id} onClick={() => loadSubmissions(a)}
                    className={`w-full text-right rounded-2xl border p-4 transition-all duration-150
                      hover:shadow-md hover:-translate-y-0.5
                      ${selectedAssignment?.id === a.id
                        ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                        : 'bg-white border-gray-100'
                      }`}>
                    <p className="font-bold text-gray-800 text-sm">{a.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{a.unit.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {a._count.submissions} הגשות
                      </span>
                      {a.dueDate && (
                        <span className="text-xs text-gray-400">
                          📅 {new Date(a.dueDate).toLocaleDateString('he-IL')}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Submissions panel ── */}
          <div className="flex-1 min-w-0">
            {!selectedAssignment ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-gray-500 font-medium">בחר משימה מהרשימה לצפייה בהגשות</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-extrabold text-gray-900 text-lg">{selectedAssignment.title}</h2>
                      <p className="text-gray-500 text-sm mt-0.5">{selectedAssignment.unit.title}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-indigo-600">{submissions.length}</p>
                        <p className="text-xs text-gray-400">הגשות</p>
                      </div>
                      {pending > 0 && (
                        <div className="text-center">
                          <p className="text-2xl font-extrabold text-amber-500">{pending}</p>
                          <p className="text-xs text-gray-400">ממתינות</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submissions table */}
                {loadingSubs ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                    <p className="text-3xl mb-3">📭</p>
                    <p className="font-medium">אין הגשות עדיין</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-50">
                      {submissions.map(sub => (
                        <div key={sub.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4 flex-wrap">
                            {/* Avatar + name */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center
                                text-sm font-bold text-indigo-600 shrink-0">
                                {sub.user.name[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-800 text-sm truncate">{sub.user.name}</p>
                                <p className="text-gray-400 text-xs truncate">{sub.user.email}</p>
                              </div>
                            </div>

                            {/* Preview */}
                            <div className="flex-1 min-w-0 hidden sm:block">
                              <p className="text-gray-500 text-xs truncate">
                                {sub.textSubmission
                                  ? sub.textSubmission.slice(0, 80) + (sub.textSubmission.length > 80 ? '...' : '')
                                  : sub.fileUrl ? '📎 קובץ' : '—'}
                              </p>
                            </div>

                            {/* Status + grade */}
                            <div className="flex items-center gap-3 shrink-0">
                              <StatusBadge status={sub.status} />
                              {sub.grade != null && (
                                <span className="text-sm font-extrabold text-indigo-600">
                                  {sub.grade}/{selectedAssignment.maxScore}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {new Date(sub.submittedAt).toLocaleDateString('he-IL')}
                              </span>
                            </div>

                            {/* Grade button */}
                            <button onClick={() => setGradingFor(sub)}
                              className={`shrink-0 text-sm font-bold px-4 py-1.5 rounded-xl transition-colors ${
                                sub.status === 'reviewed'
                                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}>
                              {sub.status === 'reviewed' ? 'ערוך ציון' : 'בדוק'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Grade modal */}
      {gradingFor && (
        <GradeModal
          sub={gradingFor}
          maxScore={selectedAssignment?.maxScore ?? 100}
          onSave={handleGrade}
          onClose={() => setGradingFor(null)}
        />
      )}
    </div>
  )
}
