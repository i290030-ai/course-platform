'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdminRole, isSuperAdmin } from '@/lib/roles'

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

type ModalMode = 'create' | 'edit' | 'password' | 'delete' | null

const ROLES = [
  { value: 'user',        label: 'סטודנט',       color: 'bg-gray-100 text-gray-600' },
  { value: 'instructor',  label: 'מרצה',          color: 'bg-teal-100 text-teal-700' },
  { value: 'admin',       label: 'מנהל',          color: 'bg-indigo-100 text-indigo-700' },
  { value: 'super_admin', label: 'מנהל ראשי',    color: 'bg-purple-100 text-purple-700' },
]

function roleBadge(role: string) {
  return ROLES.find(r => r.value === role) ?? { label: role, color: 'bg-gray-100 text-gray-500' }
}

/* ─────────────────────────────────────────
   Shared modal wrapper
───────────────────────────────────────── */
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div dir="rtl" className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-extrabold text-gray-900">{title}</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400
              hover:bg-gray-100 hover:text-gray-600 transition-colors text-lg leading-none">
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Toast notification
───────────────────────────────────────── */
function Toast({ msg, type, onDone }: { msg: string; type: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t) }, [onDone])
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3
      px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all
      ${type === 'success'
        ? 'bg-green-600 text-white'
        : 'bg-rose-600 text-white'}`}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      {msg}
    </div>
  )
}

/* ─────────────────────────────────────────
   Input helper
───────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  )
}

const inputCls = `w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800
  focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300`

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const myId   = (session?.user as any)?.id   as string | undefined
  const myRole = (session?.user as any)?.role as string | undefined
  const isSA   = isSuperAdmin(myRole)

  const [users,   setUsers]   = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [mode,    setMode]    = useState<ModalMode>(null)
  const [target,  setTarget]  = useState<AdminUser | null>(null)
  const [toast,   setToast]   = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState('')

  /* Form state */
  const [form, setForm] = useState({ name: '', email: '', role: 'user', password: '' })
  const [newPw, setNewPw] = useState('')

  /* ── Access guard ── */
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !isAdminRole(myRole)) router.push('/dashboard')
  }, [status, myRole, router])

  /* ── Load users ── */
  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetch('/api/admin/users').then(r => r.json())
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { if (status === 'authenticated') load() }, [status, load])

  /* ── Helpers ── */
  const notify = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })
  const closeModal = () => { setMode(null); setTarget(null); setErr(''); setNewPw('') }

  const openCreate = () => {
    setForm({ name: '', email: '', role: 'user', password: '' })
    setErr('')
    setMode('create')
  }

  const openEdit = (u: AdminUser) => {
    setForm({ name: u.name, email: u.email, role: u.role, password: '' })
    setTarget(u)
    setErr('')
    setMode('edit')
  }

  const openPassword = (u: AdminUser) => { setTarget(u); setNewPw(''); setErr(''); setMode('password') }
  const openDelete   = (u: AdminUser) => { setTarget(u); setMode('delete') }

  /* ── API calls ── */
  const apiCall = async (url: string, method: string, body?: object) => {
    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'שגיאה')
    return data
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      await apiCall('/api/admin/users', 'POST', form)
      await load()
      closeModal()
      notify('המשתמש נוצר בהצלחה')
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      const body: Record<string, unknown> = { name: form.name, email: form.email }
      if (isSA) body.role = form.role
      await apiCall(`/api/admin/users/${target!.id}`, 'PATCH', body)
      await load()
      closeModal()
      notify('הפרטים עודכנו בהצלחה')
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      await apiCall(`/api/admin/users/${target!.id}/password`, 'POST', { password: newPw })
      closeModal()
      notify('הסיסמה אופסה בהצלחה')
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await apiCall(`/api/admin/users/${target!.id}`, 'DELETE')
      await load()
      closeModal()
      notify('המשתמש נמחק')
    } catch (e: any) { notify(e.message, 'error') } finally { setBusy(false) }
  }

  const handleToggleActive = async (u: AdminUser) => {
    try {
      await apiCall(`/api/admin/users/${u.id}`, 'PATCH', { isActive: !u.isActive })
      await load()
      notify(u.isActive ? 'המשתמש הושבת' : 'המשתמש הופעל מחדש')
    } catch (e: any) { notify(e.message, 'error') }
  }

  const handleRoleChange = async (u: AdminUser, newRole: string) => {
    try {
      await apiCall(`/api/admin/users/${u.id}`, 'PATCH', { role: newRole })
      await load()
      notify('התפקיד עודכן')
    } catch (e: any) { notify(e.message, 'error') }
  }

  /* ── Filter ── */
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  /* ── Loading / auth guard ── */
  if (status === 'loading' || loading)
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm text-gray-400">טוען משתמשים...</span>
        </div>
      </div>
    )

  const activeCount   = users.filter(u => u.isActive).length
  const adminCount    = users.filter(u => isAdminRole(u.role)).length

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">

      {/* ── Top nav ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center gap-4">
          <Link href="/admin"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 font-medium transition-colors shrink-0">
            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            ניהול
          </Link>
          <span className="text-gray-200">/</span>
          <h1 className="text-sm font-extrabold text-gray-800">ניהול משתמשים</h1>
          <div className="flex-1" />
          {isSA && (
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700
                text-white text-sm font-bold px-4 py-2 rounded-xl shadow-sm
                active:scale-95 transition-all duration-150">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              הוסף משתמש
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-8 space-y-6">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'סה״כ משתמשים', value: users.length, color: 'text-gray-800' },
            { label: 'פעילים',        value: activeCount,  color: 'text-green-700' },
            { label: 'מנהלים',        value: adminCount,   color: 'text-indigo-700' },
            { label: 'סטודנטים',      value: users.filter(u => u.role === 'user').length, color: 'text-gray-700' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <p className="text-xs font-semibold text-gray-400">{s.label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="relative max-w-sm">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם או מייל..."
            className="w-full bg-white border border-gray-200 rounded-xl pr-9 pl-4 py-2.5 text-sm
              text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3
            border-b border-gray-100 bg-gray-50/60 text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">
            <span>שם</span>
            <span>מייל</span>
            <span>תפקיד</span>
            <span>סטטוס</span>
            <span>נוצר</span>
            <span>פעולות</span>
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">
              {search ? 'לא נמצאו משתמשים התואמים את החיפוש' : 'אין משתמשים'}
            </div>
          )}

          {filtered.map(u => {
            const badge = roleBadge(u.role)
            const isSelf = u.id === myId
            const canEditRole = isSA && !isSelf
            const canDelete  = isSA && !isSelf
            const canToggle  = isSA && !isSelf

            return (
              <div key={u.id}
                className={`grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center
                  border-b border-gray-50 hover:bg-gray-50/50 transition-colors text-sm
                  ${!u.isActive ? 'opacity-60' : ''}`}>

                {/* Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0
                    ${u.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                    {isSelf && <p className="text-[10px] text-indigo-400 font-bold">אתה</p>}
                  </div>
                </div>

                {/* Email */}
                <p className="text-gray-500 truncate text-xs">{u.email}</p>

                {/* Role */}
                <div>
                  {canEditRole ? (
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u, e.target.value)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer
                        focus:outline-none focus:ring-2 focus:ring-indigo-400 ${badge.color}`}>
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full
                    ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {u.isActive ? 'פעיל' : 'מושבת'}
                  </span>
                </div>

                {/* Date */}
                <p className="text-xs text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString('he-IL')}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Edit */}
                  <button onClick={() => openEdit(u)} title="ערוך פרטים"
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400
                      hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Password reset */}
                  {isSA && (
                    <button onClick={() => openPassword(u)} title="אפס סיסמה"
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400
                        hover:bg-amber-50 hover:text-amber-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </button>
                  )}

                  {/* Toggle active */}
                  {canToggle && (
                    <button onClick={() => handleToggleActive(u)}
                      title={u.isActive ? 'השבת משתמש' : 'הפעל משתמש'}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                        ${u.isActive
                          ? 'text-gray-400 hover:bg-rose-50 hover:text-rose-500'
                          : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}>
                      {u.isActive ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Delete */}
                  {canDelete && (
                    <button onClick={() => openDelete(u)} title="מחק משתמש"
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400
                        hover:bg-rose-50 hover:text-rose-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          MODALS
      ═══════════════════════════════════════ */}

      {/* Create user */}
      {mode === 'create' && (
        <Modal title="הוספת משתמש חדש" onClose={closeModal}>
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="שם מלא">
              <input className={inputCls} value={form.name} required
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="ישראל ישראלי" />
            </Field>
            <Field label="כתובת מייל">
              <input className={inputCls} type="email" value={form.email} required
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com" />
            </Field>
            <Field label="תפקיד">
              <select className={inputCls} value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="סיסמה">
              <input className={inputCls} type="password" value={form.password} required
                minLength={6}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="לפחות 6 תווים" />
            </Field>
            {err && <p className="text-rose-600 text-sm bg-rose-50 rounded-xl px-4 py-2">{err}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={busy}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5
                  rounded-xl text-sm disabled:opacity-60 transition-colors">
                {busy ? 'יוצר...' : 'צור משתמש'}
              </button>
              <button type="button" onClick={closeModal}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                ביטול
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit user */}
      {mode === 'edit' && target && (
        <Modal title={`עריכת ${target.name}`} onClose={closeModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <Field label="שם מלא">
              <input className={inputCls} value={form.name} required
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="כתובת מייל">
              <input className={inputCls} type="email" value={form.email} required
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            {isSA && (
              <Field label="תפקיד">
                <select className={inputCls} value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  disabled={target.id === myId}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {target.id === myId && (
                  <p className="text-xs text-gray-400 mt-1">לא ניתן לשנות את תפקידך שלך</p>
                )}
              </Field>
            )}
            {err && <p className="text-rose-600 text-sm bg-rose-50 rounded-xl px-4 py-2">{err}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={busy}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5
                  rounded-xl text-sm disabled:opacity-60 transition-colors">
                {busy ? 'שומר...' : 'שמור שינויים'}
              </button>
              <button type="button" onClick={closeModal}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                ביטול
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Password reset */}
      {mode === 'password' && target && (
        <Modal title={`איפוס סיסמה — ${target.name}`} onClose={closeModal}>
          <form onSubmit={handlePassword} className="space-y-4">
            <p className="text-sm text-gray-500">הזן סיסמה חדשה עבור המשתמש. הסיסמה תוצפן ולא תישמר בטקסט רגיל.</p>
            <Field label="סיסמה חדשה">
              <input className={inputCls} type="password" value={newPw} required
                minLength={6} autoFocus
                onChange={e => setNewPw(e.target.value)}
                placeholder="לפחות 6 תווים" />
            </Field>
            {err && <p className="text-rose-600 text-sm bg-rose-50 rounded-xl px-4 py-2">{err}</p>}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={busy}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5
                  rounded-xl text-sm disabled:opacity-60 transition-colors">
                {busy ? 'מאפס...' : 'אפס סיסמה'}
              </button>
              <button type="button" onClick={closeModal}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                ביטול
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirmation */}
      {mode === 'delete' && target && (
        <Modal title="מחיקת משתמש" onClose={closeModal}>
          <div className="space-y-5">
            <div className="flex items-center gap-4 bg-rose-50 rounded-2xl p-4 border border-rose-100">
              <span className="text-3xl">⚠️</span>
              <div>
                <p className="font-bold text-gray-800 text-sm">פעולה בלתי הפיכה</p>
                <p className="text-gray-500 text-sm mt-0.5">
                  האם למחוק את <strong>{target.name}</strong> ({target.email})?<br />
                  כל נתוני המשתמש יימחקו לצמיתות.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={busy}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5
                  rounded-xl text-sm disabled:opacity-60 transition-colors">
                {busy ? 'מוחק...' : 'מחק לצמיתות'}
              </button>
              <button onClick={closeModal}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                ביטול
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}
