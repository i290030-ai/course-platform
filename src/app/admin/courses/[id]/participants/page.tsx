'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { isAdminRole } from '@/lib/roles'

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface UserStub {
  id: string
  name: string
  email: string
  role: string
}

interface Participant {
  enrollmentId: string
  enrolledAt: string
  user: UserStub & { isActive: boolean; createdAt: string }
  progress: { completed: number; total: number; pct: number }
}

interface PageData {
  courseTitle: string
  units: { id: string; title: string; orderIndex: number }[]
  participants: Participant[]
}

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function ProgressBar({ pct }: { pct: number }) {
  const color = pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-indigo-500' : 'bg-gray-200'
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums">{pct}%</span>
    </div>
  )
}

function Toast({ msg, type, onDone }: { msg: string; type: 'ok' | 'err'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
        type === 'ok' ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      {msg}
    </div>
  )
}

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
export default function ParticipantsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string

  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  /* search-to-enroll state */
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<UserStub[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  /* create-new-student form */
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)

  /* remove confirmation */
  const [confirmRemove, setConfirmRemove] = useState<Participant | null>(null)
  const [removing, setRemoving] = useState(false)

  /* auth guard */
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !isAdminRole((session?.user as any)?.role))
      router.push('/dashboard')
  }, [status, session, router])

  /* load participants */
  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/courses/${courseId}/participants`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [courseId])

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [status, load])

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* debounced user search */
  useEffect(() => {
    if (searchQ.length < 2) { setSearchResults([]); setShowDropdown(false); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(searchQ)}&excludeCourseId=${courseId}`
      )
      const list = await res.json()
      setSearchResults(Array.isArray(list) ? list : [])
      setShowDropdown(true)
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ, courseId])

  /* enroll existing user */
  async function enrollUser(user: UserStub) {
    setShowDropdown(false)
    setSearchQ('')
    const res = await fetch(`/api/admin/courses/${courseId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
    if (res.ok) {
      setToast({ msg: `${user.name} נוסף/ה לקורס`, type: 'ok' })
      load()
    } else {
      const d = await res.json()
      setToast({ msg: d.error ?? 'שגיאה', type: 'err' })
    }
  }

  /* create new student + enroll */
  async function createStudent(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch(`/api/admin/courses/${courseId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    })
    setCreating(false)
    if (res.ok) {
      setToast({ msg: `${createForm.name} נוצר/ה ונרשם/ה לקורס`, type: 'ok' })
      setCreateForm({ name: '', email: '', password: '' })
      setShowCreate(false)
      load()
    } else {
      const d = await res.json()
      setToast({ msg: d.error ?? 'שגיאה', type: 'err' })
    }
  }

  /* remove participant */
  async function removeParticipant() {
    if (!confirmRemove) return
    setRemoving(true)
    const res = await fetch(
      `/api/admin/courses/${courseId}/participants/${confirmRemove.user.id}`,
      { method: 'DELETE' }
    )
    setRemoving(false)
    setConfirmRemove(null)
    if (res.ok) {
      setToast({ msg: `${confirmRemove.user.name} הוסר/ה מהקורס`, type: 'ok' })
      load()
    } else {
      const d = await res.json()
      setToast({ msg: d.error ?? 'שגיאה', type: 'err' })
    }
  }

  /* ─── render ─── */
  if (status === 'loading' || loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">טוען...</div>
    )

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* nav */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin/courses" className="text-indigo-600 text-sm hover:underline">
            ← ניהול קורסים
          </Link>
          <h1 className="text-xl font-bold text-indigo-800">
            משתתפים — {data?.courseTitle ?? ''}
          </h1>
          <span className="text-sm text-gray-400">{data?.participants.length ?? 0} רשומים</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* ── Add section ── */}
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <h2 className="font-bold text-gray-800 text-lg">הוספת משתתף</h2>

          {/* search existing */}
          <div className="flex gap-3 items-start flex-wrap">
            <div ref={searchRef} className="relative flex-1 min-w-[220px]">
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="חיפוש משתמש לפי שם או מייל..."
                className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {searching && (
                <span className="absolute left-3 top-2.5 text-xs text-gray-400">מחפש...</span>
              )}
              {showDropdown && searchResults.length > 0 && (
                <ul className="absolute z-20 bg-white border rounded-xl shadow-lg mt-1 w-full max-h-56 overflow-y-auto">
                  {searchResults.map((u) => (
                    <li key={u.id}>
                      <button
                        onClick={() => enrollUser(u)}
                        className="w-full text-right px-4 py-2.5 hover:bg-indigo-50 text-sm flex justify-between items-center gap-2"
                      >
                        <span className="font-medium text-gray-800">{u.name}</span>
                        <span className="text-gray-400 text-xs">{u.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showDropdown && searchQ.length >= 2 && searchResults.length === 0 && !searching && (
                <div className="absolute z-20 bg-white border rounded-xl shadow mt-1 w-full px-4 py-3 text-sm text-gray-500">
                  לא נמצאו משתמשים
                </div>
              )}
            </div>

            <button
              onClick={() => setShowCreate(!showCreate)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 whitespace-nowrap"
            >
              + סטודנט חדש
            </button>
          </div>

          {/* create new student form */}
          {showCreate && (
            <form
              onSubmit={createStudent}
              className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/40 space-y-3 mt-2"
            >
              <p className="text-sm font-medium text-indigo-800">יצירת סטודנט חדש וצירוף לקורס</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">שם מלא</label>
                  <input
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">כתובת מייל</label>
                  <input
                    required
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">סיסמה (מינ׳ 6 תווים)</label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? 'יוצר...' : 'צור וצרף לקורס'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm hover:bg-gray-300"
                >
                  ביטול
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Participants table ── */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-lg">רשימת משתתפים</h2>
            <span className="text-sm text-gray-400">{data?.participants.length ?? 0} רשומים</span>
          </div>

          {!data?.participants.length ? (
            <div className="px-5 py-12 text-center text-gray-400 text-sm">
              אין משתתפים רשומים לקורס זה עדיין
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-5 py-3 text-right font-semibold text-gray-600">שם</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-600">מייל</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-600">התקדמות</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-600">יחידות</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-600">נרשם</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-600">סטטוס</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.participants.map((p) => (
                    <tr key={p.enrollmentId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {p.user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{p.user.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{p.user.email}</td>
                      <td className="px-5 py-3">
                        <ProgressBar pct={p.progress.pct} />
                      </td>
                      <td className="px-5 py-3 text-gray-500 tabular-nums">
                        {p.progress.completed}/{p.progress.total}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(p.enrolledAt).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.user.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {p.user.isActive ? 'פעיל' : 'מושהה'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setConfirmRemove(p)}
                          className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          title="הסר מהקורס"
                        >
                          הסר
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Remove confirmation modal ── */}
      {confirmRemove && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4" dir="rtl">
            <h3 className="font-bold text-gray-900 text-lg">הסרת משתתף</h3>
            <p className="text-gray-600 text-sm">
              האם להסיר את{' '}
              <span className="font-semibold">{confirmRemove.user.name}</span> מהקורס?
              <br />
              <span className="text-gray-400">ההתקדמות שלהם תישמר.</span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmRemove(null)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                ביטול
              </button>
              <button
                onClick={removeParticipant}
                disabled={removing}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {removing ? 'מסיר...' : 'הסר מהקורס'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  )
}
