'use client'
import { useEffect, useState } from 'react'

interface Submission {
  id: string
  status: 'submitted' | 'reviewed'
  textSubmission?: string | null
  fileUrl?: string | null
  grade?: number | null
  feedback?: string | null
  submittedAt: string
}

interface AssignmentData {
  id: string
  title: string
  description: string
  dueDate?: string | null
  maxScore: number
  submission: Submission | null
}

interface Props {
  unitId: string
}

export default function AssignmentPanel({ unitId }: Props) {
  const [data, setData] = useState<AssignmentData | null | undefined>(undefined)
  const [text, setText] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [tab, setTab] = useState<'text' | 'file'>('text')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/assignments/unit/${unitId}`)
      .then(r => r.json())
      .then(d => setData(d))
  }, [unitId])

  // null means no assignment for this unit
  if (data === undefined) return null
  if (data === null) return null

  const sub = data.submission
  const alreadySubmitted = !!sub

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const payload = tab === 'text' ? text.trim() : ''
    const file = tab === 'file' ? fileUrl.trim() : ''
    if (!payload && !file) { setError('יש להזין טקסט או קישור לקובץ'); return }

    setSubmitting(true)
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId: data.id,
        textSubmission: payload || null,
        fileUrl: file || null,
      }),
    })
    const result = await res.json()
    setSubmitting(false)

    if (!res.ok) { setError(result.error || 'שגיאה בשליחה'); return }
    setData({ ...data, submission: result })
  }

  const statusLabel = sub?.status === 'reviewed' ? 'נבדק' : 'הוגש'
  const statusColor = sub?.status === 'reviewed'
    ? 'bg-green-100 text-green-700 border-green-200'
    : 'bg-blue-100 text-blue-700 border-blue-200'

  return (
    <div dir="rtl" className="relative rounded-3xl border-2 border-rose-200 bg-white shadow-md overflow-hidden">
      {/* side stripe */}
      <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-400 to-pink-500" />
      <div className="h-0.5 bg-gradient-to-l from-rose-400 to-pink-400" />

      <div className="p-7 pr-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-rose-100 rounded-2xl flex items-center justify-center text-xl shadow-sm shrink-0">
              📝
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-600 text-xs
                font-extrabold px-3 py-1 rounded-full border border-rose-200 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                משימה לביצוע
              </div>
              <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{data.title}</h3>
            </div>
          </div>
          {sub && (
            <span className={`shrink-0 text-xs font-extrabold px-3 py-1.5 rounded-full border ${statusColor}`}>
              {statusLabel}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100 mb-5">
          <p className="text-gray-800 text-[15px] leading-8 whitespace-pre-line">{data.description}</p>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 mb-6 text-xs font-semibold text-gray-400">
          <span className="flex items-center gap-1.5">
            🏆 ניקוד מקסימלי: <span className="text-gray-600">{data.maxScore}</span>
          </span>
          {data.dueDate && (
            <span className="flex items-center gap-1.5">
              📅 תאריך הגשה:{' '}
              <span className="text-gray-600">
                {new Date(data.dueDate).toLocaleDateString('he-IL')}
              </span>
            </span>
          )}
        </div>

        {/* ── Already submitted ── */}
        {alreadySubmitted ? (
          <div className="space-y-4">
            {/* Submission preview */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">ההגשה שלך</p>
              {sub.textSubmission && (
                <p className="text-gray-700 text-sm leading-7 whitespace-pre-line">{sub.textSubmission}</p>
              )}
              {sub.fileUrl && (
                <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-indigo-600 hover:underline text-sm mt-2">
                  📎 {sub.fileUrl}
                </a>
              )}
              <p className="text-xs text-gray-400 mt-3">
                הוגש ב-{new Date(sub.submittedAt).toLocaleString('he-IL')}
              </p>
            </div>

            {/* Grade & feedback */}
            {sub.status === 'reviewed' && (
              <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
                <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3">משוב המורה</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl font-extrabold text-green-700">
                    {sub.grade ?? '—'}
                  </div>
                  <div className="text-sm text-green-600">
                    מתוך {data.maxScore} נקודות
                  </div>
                  {sub.grade != null && (
                    <div className="mr-auto text-sm font-bold text-green-700">
                      {Math.round((sub.grade / data.maxScore) * 100)}%
                    </div>
                  )}
                </div>
                {sub.feedback && (
                  <p className="text-gray-700 text-sm leading-7 whitespace-pre-line border-t border-green-100 pt-3">
                    {sub.feedback}
                  </p>
                )}
              </div>
            )}

            {sub.status === 'submitted' && (
              <div className="flex items-center gap-2 text-blue-600 text-sm bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <span className="text-lg">⏳</span>
                המשימה הוגשה ומחכה לבדיקה
              </div>
            )}
          </div>
        ) : (
          /* ── Submit form ── */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tab switcher */}
            <div className="flex bg-gray-100 rounded-xl p-1 w-fit gap-1">
              <button type="button"
                onClick={() => setTab('text')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === 'text' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'
                }`}>
                ✍️ טקסט
              </button>
              <button type="button"
                onClick={() => setTab('file')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === 'file' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'
                }`}>
                📎 קישור לקובץ
              </button>
            </div>

            {tab === 'text' ? (
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={5}
                placeholder="כתוב את תשובתך כאן..."
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700
                  placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-300
                  resize-none leading-relaxed"
              />
            ) : (
              <div className="space-y-2">
                <input
                  type="url"
                  value={fileUrl}
                  onChange={e => setFileUrl(e.target.value)}
                  placeholder="הדבק קישור לקובץ (Google Drive, Dropbox...)"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-700
                    placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
                <p className="text-xs text-gray-400 pr-1">
                  ודא שהקובץ נגיש לכולם לפני השליחה
                </p>
              </div>
            )}

            {error && (
              <p className="text-rose-600 text-sm bg-rose-50 rounded-xl px-4 py-2 border border-rose-100">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <p className="text-gray-400 text-sm">לאחר ההגשה לא ניתן לערוך</p>
              <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-2 bg-gradient-to-l from-rose-600 to-pink-600
                  hover:from-rose-700 hover:to-pink-700 text-white font-extrabold px-6 py-2.5
                  rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all duration-200
                  disabled:opacity-60 text-sm">
                {submitting ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />שולח...</>
                ) : (
                  <>📤 הגש משימה</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
