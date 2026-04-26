'use client'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdminRole } from '@/lib/roles'
import UnitMediaBlocks from '@/components/UnitMediaBlocks'
import type { UnitMediaItem } from '@/components/UnitMediaBlocks'

/* ─────────────────────────────────────────
   Block type config
───────────────────────────────────────── */
const BLOCK_TYPES = [
  { type: 'text',       label: 'טקסט',          icon: '📝', badge: 'bg-blue-50 border-blue-200 text-blue-700' },
  { type: 'video',      label: 'וידאו',          icon: '🎬', badge: 'bg-purple-50 border-purple-200 text-purple-700' },
  { type: 'image',      label: 'תמונה',          icon: '🖼️', badge: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  { type: 'link',       label: 'קישור חיצוני',   icon: '🔗', badge: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { type: 'document',   label: 'PDF / מסמך',     icon: '📄', badge: 'bg-rose-50 border-rose-200 text-rose-700' },
  { type: 'resource',   label: 'משאב / קובץ',    icon: '📁', badge: 'bg-orange-50 border-orange-200 text-orange-700' },
  { type: 'assignment', label: 'מטלה',           icon: '✏️', badge: 'bg-amber-50 border-amber-200 text-amber-700' },
] as const

const typeMap = Object.fromEntries(BLOCK_TYPES.map(t => [t.type, t]))
function typeLabel(t: string) { return typeMap[t]?.label ?? t }
function typeIcon(t: string)  { return typeMap[t]?.icon  ?? '📦' }
function typeBadge(t: string) { return typeMap[t]?.badge ?? 'bg-gray-50 border-gray-200 text-gray-700' }

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface UnitData {
  id: string
  title: string
  content: string
  zoomLink?: string | null
  courseId: string
  orderIndex: number
  isOpen: boolean
  openDate?: string | null
}

interface Block {
  id: string
  type: string
  title: string | null
  description: string | null
  url: string | null
  caption: string | null
  orderIndex: number
}

interface BlockForm {
  title: string
  description: string
  url: string
  caption: string
}

/* ─────────────────────────────────────────
   Toast
───────────────────────────────────────── */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white
      text-sm font-medium px-5 py-3 rounded-2xl shadow-xl">
      {msg}
    </div>
  )
}

/* ─────────────────────────────────────────
   Block form fields (type-specific)
───────────────────────────────────────── */
function BlockFormFields({
  type,
  form,
  onChange,
}: {
  type: string
  form: BlockForm
  onChange: (f: BlockForm) => void
}) {
  const set = (field: keyof BlockForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...form, [field]: e.target.value })

  const inp = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white'
  const lbl = 'block text-xs font-bold text-gray-500 mb-1.5'
  const needsUrl   = ['video', 'image', 'link', 'document', 'resource'].includes(type)
  const needsText  = ['text', 'assignment', 'video', 'link', 'document', 'resource'].includes(type)
  const hasCaption = type === 'image'

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className={lbl}>
          כותרת {['text', 'video', 'assignment'].includes(type) ? '(אופציונלי)' : ''}
        </label>
        <input
          value={form.title}
          onChange={set('title')}
          className={inp}
          placeholder="כותרת הבלוק..."
        />
      </div>

      {/* URL */}
      {needsUrl && (
        <div>
          <label className={lbl}>
            {type === 'video'    ? 'קישור YouTube / Vimeo' :
             type === 'image'    ? 'קישור לתמונה (URL)' :
             type === 'document' ? 'קישור ל-PDF / Google Drive' :
             'כתובת URL'}
          </label>
          <input
            value={form.url}
            onChange={set('url')}
            className={inp}
            dir="ltr"
            placeholder={
              type === 'video'    ? 'https://youtube.com/watch?v=...' :
              type === 'document' ? 'https://drive.google.com/... או קישור ל-.pdf' :
              'https://...'
            }
          />
          {type === 'document' && (
            <p className="text-[11px] text-gray-400 mt-1">
              Google Drive: שתף קובץ וקבל קישור. המערכת תמיר אוטומטית ל-preview מוטמע.
            </p>
          )}
          {type === 'video' && (
            <p className="text-[11px] text-gray-400 mt-1">
              נתמך: YouTube (watch?v= / youtu.be) ו-Vimeo
            </p>
          )}
        </div>
      )}

      {/* Description / body text */}
      {needsText && (
        <div>
          <label className={lbl}>
            {type === 'text'       ? 'תוכן הטקסט' :
             type === 'assignment' ? 'תיאור המטלה' :
             'תיאור (אופציונלי)'}
          </label>
          <textarea
            value={form.description}
            onChange={set('description')}
            className={inp + ' resize-none'}
            rows={type === 'text' || type === 'assignment' ? 5 : 3}
            placeholder={
              type === 'text'       ? 'הכנס את תוכן הטקסט כאן...' :
              type === 'assignment' ? 'תאר את המטלה הנדרשת...' :
              'תיאור קצר...'
            }
          />
        </div>
      )}

      {/* Caption (image only) */}
      {hasCaption && (
        <div>
          <label className={lbl}>כיתוב מתחת לתמונה (אופציונלי)</label>
          <input
            value={form.caption}
            onChange={set('caption')}
            className={inp}
            placeholder="כיתוב..."
          />
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Block preview (condensed view)
───────────────────────────────────────── */
function BlockPreview({ block }: { block: Block }) {
  const preview = block.description?.slice(0, 120) ?? block.url ?? ''
  const hasContent = block.title || block.description || block.url

  if (!hasContent) {
    return <p className="text-gray-400 italic text-xs">בלוק ריק — לחץ ערוך להוספת תוכן</p>
  }

  return (
    <div className="space-y-1.5">
      {block.title && (
        <p className="font-semibold text-gray-800 text-sm">{block.title}</p>
      )}
      {preview && (
        <p className="text-gray-500 text-sm line-clamp-2 whitespace-pre-line">{preview}</p>
      )}
      {block.url && !block.description && (
        <p className="text-xs text-gray-400 font-mono truncate" dir="ltr">{block.url}</p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Block card
───────────────────────────────────────── */
function BlockCard({
  block,
  isFirst,
  isLast,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  block: Block
  isFirst: boolean
  isLast: boolean
  onSave: (data: Partial<Block>) => Promise<void>
  onDelete: () => Promise<void>
  onMoveUp: () => Promise<void>
  onMoveDown: () => Promise<void>
}) {
  const isEmpty = !block.title && !block.description && !block.url
  const [editing, setEditing] = useState(isEmpty)
  const [form, setForm] = useState<BlockForm>({
    title: block.title ?? '',
    description: block.description ?? '',
    url: block.url ?? '',
    caption: block.caption ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave({
      title:       form.title.trim()       || null,
      description: form.description.trim() || null,
      url:         form.url.trim()         || null,
      caption:     form.caption.trim()     || null,
    })
    setSaving(false)
    setEditing(false)
  }

  const handleCancel = () => {
    setForm({
      title: block.title ?? '',
      description: block.description ?? '',
      url: block.url ?? '',
      caption: block.caption ?? '',
    })
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    await onDelete()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border flex-shrink-0 ${typeBadge(block.type)}`}>
            {typeIcon(block.type)} {typeLabel(block.type)}
          </span>
          {!editing && block.title && (
            <span className="text-sm font-semibold text-gray-700 truncate">{block.title}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            title="הזז למעלה"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 disabled:opacity-25 text-gray-500 transition-colors text-sm font-bold"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            title="הזז למטה"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 disabled:opacity-25 text-gray-500 transition-colors text-sm font-bold"
          >
            ↓
          </button>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50
                hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
            >
              ערוך
            </button>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 mr-1">
              <span className="text-xs text-red-600 font-medium">בטוח?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-2.5 py-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50"
              >
                {deleting ? '...' : 'מחק'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                ביטול
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              title="מחק בלוק"
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            >
              🗑
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {editing ? (
          <div className="space-y-5">
            <BlockFormFields type={block.type} form={form} onChange={setForm} />
            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50"
              >
                {saving ? 'שומר...' : 'שמור בלוק'}
              </button>
            </div>
          </div>
        ) : (
          <BlockPreview block={block} />
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Block type modal
───────────────────────────────────────── */
function BlockTypeModal({
  onSelect,
  onClose,
}: {
  onSelect: (type: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-800">בחר סוג תוכן</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100
              text-gray-400 hover:text-gray-600 transition-colors text-lg font-bold"
          >
            ×
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BLOCK_TYPES.map((bt) => (
            <button
              key={bt.type}
              onClick={() => { onSelect(bt.type); onClose() }}
              className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2
                text-sm font-semibold transition-all hover:scale-105 active:scale-95 ${bt.badge}`}
            >
              <span className="text-2xl">{bt.icon}</span>
              <span>{bt.label}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-center mt-5">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
export default function EditUnitPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [unit, setUnit] = useState<UnitData | null>(null)
  const [courseTitle, setCourseTitle] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [metaForm, setMetaForm] = useState({
    title: '',
    content: '',
    zoomLink: '',
    orderIndex: 0,
    openDate: '',
    isOpen: false,
  })
  const [metaSaving, setMetaSaving] = useState(false)
  const [addingBlock, setAddingBlock] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => setToast(msg), [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !isAdminRole((session?.user as any)?.role))
      router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    if (status !== 'authenticated') return

    fetch(`/api/unit/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return }
        setUnit(data)
        setMetaForm({
          title: data.title ?? '',
          content: data.content ?? '',
          zoomLink: data.zoomLink ?? '',
          orderIndex: data.orderIndex ?? 0,
          openDate: data.openDate
            ? new Date(data.openDate).toISOString().split('T')[0]
            : '',
          isOpen: data.isOpen ?? false,
        })
        // Fetch course title for breadcrumb/context
        if (data.courseId) {
          fetch(`/api/courses/${data.courseId}`)
            .then((r) => r.json())
            .then((c) => { if (c?.title) setCourseTitle(c.title) })
            .catch(() => {})
        }
      })
      .catch(() => setError('שגיאה בטעינת היחידה'))

    fetch(`/api/admin/units/${params.id}/media`)
      .then((r) => r.json())
      .then((data) => setBlocks(Array.isArray(data) ? data : []))
      .catch((err) => console.error('[EditUnit] blocks fetch error:', err))
  }, [status, params.id])

  const saveMeta = async () => {
    setMetaSaving(true)
    const res = await fetch('/api/units', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: params.id,
        title: metaForm.title.trim(),
        content: metaForm.content,
        zoomLink: metaForm.zoomLink.trim() || null,
        orderIndex: metaForm.orderIndex,
        openDate: metaForm.openDate || null,
        isOpen: metaForm.isOpen,
      }),
    })
    const data = await res.json()
    setUnit((prev) => (prev ? { ...prev, ...data } : null))
    setMetaSaving(false)
    showToast('פרטי היחידה נשמרו')
  }

  const addBlock = async (type: string) => {
    try {
      const res = await fetch(`/api/admin/units/${params.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, orderIndex: blocks.length }),
      })
      const block = await res.json()
      if (!res.ok || block.error) {
        console.error('[addBlock] server error:', block.error, 'status:', res.status)
        showToast(block.error ?? 'שגיאה בהוספת בלוק')
        return
      }
      setBlocks((prev) => [...prev, block])
      setAddingBlock(false)
    } catch (err) {
      console.error('[addBlock] fetch error:', err)
      showToast('שגיאת רשת — לא ניתן להוסיף בלוק')
    }
  }

  const updateBlock = useCallback(
    async (blockId: string, data: Partial<Block>) => {
      const res = await fetch(`/api/admin/units/${params.id}/media/${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const updated = await res.json()
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? updated : b)))
      showToast('בלוק נשמר')
    },
    [params.id, showToast],
  )

  const deleteBlock = useCallback(
    async (blockId: string) => {
      await fetch(`/api/admin/units/${params.id}/media/${blockId}`, { method: 'DELETE' })
      setBlocks((prev) => prev.filter((b) => b.id !== blockId))
      showToast('בלוק נמחק')
    },
    [params.id, showToast],
  )

  const moveBlock = useCallback(
    async (blockId: string, direction: 'up' | 'down') => {
      const sorted = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex)
      const idx = sorted.findIndex((b) => b.id === blockId)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= sorted.length) return
      const a = sorted[idx]
      const b = sorted[swapIdx]
      await Promise.all([
        fetch(`/api/admin/units/${params.id}/media/${a.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIndex: b.orderIndex }),
        }),
        fetch(`/api/admin/units/${params.id}/media/${b.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIndex: a.orderIndex }),
        }),
      ])
      setBlocks((prev) =>
        prev.map((bl) => {
          if (bl.id === a.id) return { ...bl, orderIndex: b.orderIndex }
          if (bl.id === b.id) return { ...bl, orderIndex: a.orderIndex }
          return bl
        }),
      )
    },
    [blocks, params.id],
  )

  const sortedBlocks = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex)

  /* ── Error state ── */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center space-y-3">
          <p className="text-4xl">⚠️</p>
          <p className="font-bold text-gray-700">{error}</p>
          <Link href="/admin/units" className="text-indigo-600 hover:underline text-sm">
            חזרה לרשימת היחידות
          </Link>
        </div>
      </div>
    )
  }

  /* ── Loading state ── */
  if (!unit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  /* ── Editor ── */
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Nav */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1 flex-wrap">
            <Link href="/admin" className="hover:text-gray-600 transition-colors">לוח ניהול</Link>
            <span>/</span>
            <Link href="/admin/units" className="hover:text-gray-600 transition-colors">יחידות</Link>
            {courseTitle && (
              <>
                <span>/</span>
                <span className="text-indigo-600 font-semibold">{courseTitle}</span>
              </>
            )}
            <span>/</span>
            <span className="text-gray-600 truncate max-w-[200px]">{unit.title}</span>
          </div>
          {/* Title row */}
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-800 truncate">
              עריכת יחידה
              {courseTitle && (
                <span className="mr-2 text-sm font-normal text-indigo-600">
                  עבור הקורס: {courseTitle}
                </span>
              )}
            </h1>
            <Link href="/admin/units" className="text-xs text-indigo-600 hover:underline font-medium">
              ← חזרה לרשימה
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ── METADATA SECTION ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-1 bg-gradient-to-l from-indigo-500 to-purple-500" />
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest text-indigo-600">
                פרטי היחידה
              </h2>
              {courseTitle && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold
                  text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full">
                  📚 {courseTitle}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1.5">כותרת היחידה *</label>
                <input
                  value={metaForm.title}
                  onChange={(e) => setMetaForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="כותרת..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">סדר יחידה</label>
                <input
                  type="number"
                  value={metaForm.orderIndex}
                  onChange={(e) =>
                    setMetaForm((f) => ({ ...f, orderIndex: parseInt(e.target.value) || 0 }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">תאריך פתיחה</label>
                <input
                  type="date"
                  value={metaForm.openDate}
                  onChange={(e) => setMetaForm((f) => ({ ...f, openDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1.5">
                  קישור זום (אופציונלי)
                </label>
                <input
                  value={metaForm.zoomLink}
                  onChange={(e) => setMetaForm((f) => ({ ...f, zoomLink: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="https://zoom.us/j/..."
                  dir="ltr"
                />
              </div>
            </div>

            {/* isOpen toggle */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <button
                onClick={() => setMetaForm((f) => ({ ...f, isOpen: !f.isOpen }))}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  metaForm.isOpen ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    metaForm.isOpen ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {metaForm.isOpen ? 'היחידה פתוחה לתלמידים' : 'היחידה סגורה'}
              </span>
            </div>

            {/* Legacy content field (collapsed) */}
            <details className="group">
              <summary className="cursor-pointer select-none list-none flex items-center gap-2
                text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
                <svg
                  className="w-3.5 h-3.5 transition-transform group-open:rotate-90"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                תוכן טקסט ישן (שדה מקורי — backward compatibility)
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  שדה זה הוא התוכן הטקסטואלי המקורי. השתמש בבלוקי תוכן למטה לניהול מובנה ועשיר יותר.
                </p>
                <textarea
                  value={metaForm.content}
                  onChange={(e) => setMetaForm((f) => ({ ...f, content: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
                  rows={6}
                  placeholder="תוכן הקורס (פורמט ישן)..."
                />
              </div>
            </details>

            <div className="flex justify-end">
              <button
                onClick={saveMeta}
                disabled={metaSaving || !metaForm.title.trim()}
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl
                  hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {metaSaving ? 'שומר...' : 'שמור פרטים'}
              </button>
            </div>
          </div>
        </section>

        {/* ── BLOCKS SECTION ── */}
        <section>
          {/* Section header with toggle + add button */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest text-indigo-600">
                תוכן היחידה
              </h2>
              {sortedBlocks.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {sortedBlocks.length} בלוקים • מסודרים לפי סדר תצוגה
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Preview / Edit toggle */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setPreviewMode(false)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    !previewMode
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  עריכה
                </button>
                <button
                  onClick={() => setPreviewMode(true)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    previewMode
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  תצוגת סטודנט
                </button>
              </div>
              {/* Add button — only in edit mode */}
              {!previewMode && (
                <button
                  onClick={() => setAddingBlock(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white
                    text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  + הוסף תוכן
                </button>
              )}
            </div>
          </div>

          {/* ── PREVIEW MODE ── */}
          {previewMode ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                תצוגה כפי שהסטודנט רואה
              </p>
              {sortedBlocks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-3xl mb-2">👁</p>
                  <p className="text-sm">אין תוכן להצגה — הוסף בלוקים במצב עריכה</p>
                </div>
              ) : (
                <UnitMediaBlocks blocks={sortedBlocks as UnitMediaItem[]} />
              )}
            </div>
          ) : (
            /* ── EDIT MODE ── */
            <div className="space-y-4">
              {sortedBlocks.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                  <p className="text-4xl mb-3">📄</p>
                  <p className="text-gray-600 text-sm font-semibold mb-1">
                    טרם נוסף תוכן ליחידה
                  </p>
                  <p className="text-gray-400 text-xs mb-4">
                    לחץ על הוסף תוכן כדי להתחיל
                  </p>
                  <button
                    onClick={() => setAddingBlock(true)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600
                      text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    + הוסף תוכן
                  </button>
                </div>
              ) : (
                sortedBlocks.map((block, idx) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    isFirst={idx === 0}
                    isLast={idx === sortedBlocks.length - 1}
                    onSave={(data) => updateBlock(block.id, data)}
                    onDelete={() => deleteBlock(block.id)}
                    onMoveUp={() => moveBlock(block.id, 'up')}
                    onMoveDown={() => moveBlock(block.id, 'down')}
                  />
                ))
              )}
            </div>
          )}
        </section>
      </main>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Block type modal */}
      {addingBlock && (
        <BlockTypeModal
          onSelect={addBlock}
          onClose={() => setAddingBlock(false)}
        />
      )}
    </div>
  )
}
