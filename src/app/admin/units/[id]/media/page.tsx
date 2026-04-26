'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { isAdminRole } from '@/lib/roles'

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
type MediaType = 'image' | 'document' | 'resource'

interface MediaBlock {
  id: string
  type: MediaType
  title: string | null
  description: string | null
  url: string
  caption: string | null
  orderIndex: number
  createdAt: string
}

interface FormState {
  type: MediaType
  title: string
  description: string
  url: string
  caption: string
}

const EMPTY_FORM: FormState = { type: 'image', title: '', description: '', url: '', caption: '' }

/* ─────────────────────────────────────────
   Type meta
───────────────────────────────────────── */
const TYPE_META: Record<MediaType, { icon: string; label: string; color: string; hint: string }> = {
  image: {
    icon: '🖼️',
    label: 'תמונה',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    hint: 'כתובת URL לתמונה (jpg, png, webp, gif)',
  },
  document: {
    icon: '📄',
    label: 'מסמך / PDF',
    color: 'bg-rose-50 border-rose-200 text-rose-700',
    hint: 'כתובת URL ישירה ל-PDF או מסמך (לצפייה מוטבעת)',
  },
  resource: {
    icon: '🔗',
    label: 'משאב / קישור',
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    hint: 'כתובת URL לאתר, מאמר, קישור חיצוני',
  },
}

/* ─────────────────────────────────────────
   Toast
───────────────────────────────────────── */
function Toast({ msg, type, onDone }: { msg: string; type: 'ok' | 'err'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg
      text-sm font-semibold text-white ${type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
      {msg}
    </div>
  )
}

/* ─────────────────────────────────────────
   Block preview card (admin view)
───────────────────────────────────────── */
function BlockCard({
  block,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  block: MediaBlock
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  isFirst: boolean
  isLast: boolean
}) {
  const meta = TYPE_META[block.type]
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all`}>
      <div className={`h-1 ${block.type === 'image' ? 'bg-blue-400' : block.type === 'document' ? 'bg-rose-400' : 'bg-indigo-400'}`} />
      <div className="p-4 flex items-start gap-3">
        {/* Type badge + icon */}
        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${meta.color}`}>
          {meta.icon}
        </div>

        {/* Content preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${meta.color}`}>
              {meta.label}
            </span>
          </div>
          {block.title && (
            <p className="font-semibold text-gray-800 text-sm truncate">{block.title}</p>
          )}
          {block.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{block.description}</p>
          )}
          <p className="text-xs text-gray-400 truncate mt-1 font-mono">{block.url}</p>
          {block.caption && (
            <p className="text-xs text-indigo-500 mt-0.5 italic">"{block.caption}"</p>
          )}

          {/* Image preview */}
          {block.type === 'image' && (
            <div className="mt-2 w-24 h-16 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
              <img
                src={block.url}
                alt={block.title ?? ''}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex flex-col gap-1">
          <button
            onClick={() => onMoveUp(block.id)}
            disabled={isFirst}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center
              text-gray-500 text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="הזז למעלה"
          >
            ▲
          </button>
          <button
            onClick={() => onMoveDown(block.id)}
            disabled={isLast}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center
              text-gray-500 text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="הזז למטה"
          >
            ▼
          </button>
          {confirmDel ? (
            <div className="flex flex-col gap-1 mt-1">
              <button
                onClick={() => onDelete(block.id)}
                className="w-16 h-7 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 transition-colors"
              >
                מחק
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="w-16 h-7 rounded-lg bg-gray-200 text-gray-600 text-[10px] font-bold hover:bg-gray-300 transition-colors"
              >
                ביטול
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center
                text-red-400 text-xs transition-colors mt-1"
              title="מחק"
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
export default function UnitMediaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const unitId = params.id as string

  const [unitTitle, setUnitTitle] = useState('')
  const [blocks, setBlocks] = useState<MediaBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !isAdminRole((session?.user as any)?.role))
      router.push('/dashboard')
  }, [status, session, router])

  const load = useCallback(() => {
    fetch(`/api/admin/units/${unitId}/media`)
      .then(r => r.json())
      .then(d => {
        setUnitTitle(d.unit?.title ?? '')
        setBlocks(Array.isArray(d.media) ? d.media : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [unitId])

  useEffect(() => { if (status === 'authenticated') load() }, [status, load])

  /* Add block */
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`/api/admin/units/${unitId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setToast({ msg: 'בלוק מדיה נוסף', type: 'ok' })
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } else {
      const d = await res.json()
      setToast({ msg: d.error ?? 'שגיאה', type: 'err' })
    }
  }

  /* Delete block */
  async function handleDelete(mediaId: string) {
    const res = await fetch(`/api/admin/units/${unitId}/media/${mediaId}`, { method: 'DELETE' })
    if (res.ok) {
      setBlocks(prev => prev.filter(b => b.id !== mediaId))
      setToast({ msg: 'בלוק נמחק', type: 'ok' })
    } else {
      setToast({ msg: 'שגיאה במחיקה', type: 'err' })
    }
  }

  /* Reorder (swap adjacent) */
  async function handleMove(mediaId: string, direction: 'up' | 'down') {
    const idx = blocks.findIndex(b => b.id === mediaId)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= blocks.length) return

    const newBlocks = [...blocks]
    const aIdx = newBlocks[idx].orderIndex
    const bIdx = newBlocks[swapIdx].orderIndex
    newBlocks[idx] = { ...newBlocks[idx], orderIndex: bIdx }
    newBlocks[swapIdx] = { ...newBlocks[swapIdx], orderIndex: aIdx }
    ;[newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]]
    setBlocks(newBlocks)

    // Persist both updates
    await Promise.all([
      fetch(`/api/admin/units/${unitId}/media/${blocks[idx].id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIndex: bIdx }),
      }),
      fetch(`/api/admin/units/${unitId}/media/${blocks[swapIdx].id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIndex: aIdx }),
      }),
    ])
  }

  if (status === 'loading' || loading)
    return <div className="min-h-screen flex items-center justify-center text-gray-400">טוען...</div>

  const meta = TYPE_META[form.type]

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Nav */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link href="/admin/units" className="text-indigo-600 text-sm hover:underline">
            ← ניהול יחידות
          </Link>
          <div className="text-center">
            <h1 className="text-base font-bold text-gray-800 leading-none">{unitTitle}</h1>
            <p className="text-xs text-gray-400 mt-0.5">עורך מדיה</p>
          </div>
          <span className="text-sm text-gray-400">{blocks.length} בלוקים</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Add block form toggle */}
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-gray-800 text-lg">בלוקי מדיה</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5
              rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + הוסף בלוק
          </button>
        </div>

        {/* Add block form */}
        {showForm && (
          <form onSubmit={handleAdd}
            className="bg-white rounded-2xl border shadow-sm p-6 space-y-5"
          >
            <h3 className="font-bold text-gray-800">בלוק מדיה חדש</h3>

            {/* Type selector */}
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(TYPE_META) as [MediaType, typeof TYPE_META[MediaType]][]).map(([key, m]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm({ ...form, type: key })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold
                    transition-all ${form.type === key
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>

            {/* URL field */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                {meta.icon} כתובת URL <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="url"
                value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })}
                placeholder={meta.hint}
                className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {form.type === 'document'
                  ? 'קישור ישיר ל-PDF יוצג כמסמך מוטבע. קישורי Google Drive: שנה "/view" ל-"/preview".'
                  : form.type === 'image'
                  ? 'ניתן להשתמש בקישורים מ-Imgur, Cloudinary, Unsplash ועוד.'
                  : 'כתובת URL לכל אתר או קובץ חיצוני.'}
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                כותרת (אופציונלי)
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder={form.type === 'image' ? 'שם התמונה' : form.type === 'document' ? 'שם המסמך' : 'שם המשאב'}
                className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Description (resource + document) */}
            {(form.type === 'resource' || form.type === 'document') && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  תיאור (אופציונלי)
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="הסבר קצר על המשאב..."
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
            )}

            {/* Caption (image) */}
            {form.type === 'image' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  כיתוב (caption, אופציונלי)
                </label>
                <input
                  type="text"
                  value={form.caption}
                  onChange={e => setForm({ ...form, caption: e.target.value })}
                  placeholder='לדוגמה: "תרשים ארכיטקטורת הפרויקט"'
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}

            {/* Future upload hint */}
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
              <span className="shrink-0 mt-0.5">💡</span>
              <p>
                <strong>העלאת קבצים:</strong> הדבק כתובת URL מ-Imgur, Google Drive, Dropbox, Cloudinary או כל שירות אחסון.
                תמיכה בהעלאה ישירה תתווסף עם שילוב Supabase Storage / S3.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold
                  hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'שומר...' : '+ הוסף בלוק'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-semibold
                  hover:bg-gray-300 transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {/* Blocks list */}
        {blocks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <p className="text-4xl mb-3">🖼️</p>
            <p className="font-semibold text-gray-600 mb-1">אין בלוקי מדיה עדיין</p>
            <p className="text-sm text-gray-400">לחץ על "+ הוסף בלוק" כדי להוסיף תמונה, מסמך או קישור</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blocks.map((block, idx) => (
              <BlockCard
                key={block.id}
                block={block}
                isFirst={idx === 0}
                isLast={idx === blocks.length - 1}
                onDelete={handleDelete}
                onMoveUp={id => handleMove(id, 'up')}
                onMoveDown={id => handleMove(id, 'down')}
              />
            ))}
          </div>
        )}

        {/* Preview hint */}
        {blocks.length > 0 && (
          <p className="text-center text-xs text-gray-400">
            הבלוקים יוצגו לסטודנטים בתחתית תוכן היחידה, לפני אזור המשימות.
          </p>
        )}
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}
