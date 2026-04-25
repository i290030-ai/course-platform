'use client'
import { useEffect, useState } from 'react'
import type { AiFeedbackData } from '@/app/api/submissions/[id]/ai-feedback/route'

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface Submission {
  id: string
  status: 'submitted' | 'reviewed' | 'auto_reviewed'
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

/* ─────────────────────────────────────────
   Parse structured AI feedback from the
   feedback string field (may be plain text
   from a human reviewer or JSON from AI)
───────────────────────────────────────── */
function parseAiFeedback(raw: string | null | undefined): AiFeedbackData | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'correct' in parsed) return parsed as AiFeedbackData
    return null
  } catch {
    return null
  }
}

/* ─────────────────────────────────────────
   AI feedback display
───────────────────────────────────────── */
function AiFeedbackPanel({ data }: { data: AiFeedbackData }) {
  const scoreColor =
    data.score >= 80 ? 'text-green-700'  :
    data.score >= 60 ? 'text-amber-700'  :
                       'text-rose-700'

  const scoreBg =
    data.score >= 80 ? 'bg-green-50 border-green-200'  :
    data.score >= 60 ? 'bg-amber-50 border-amber-200'  :
                       'bg-rose-50  border-rose-200'

  return (
    <div className="space-y-3">
      {/* Header + score */}
      <div className={`flex items-center justify-between rounded-2xl border px-5 py-3 ${scoreBg}`}>
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🤖</span>
          <div>
            <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest leading-none">
              משוב אוטומטי
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">נבדק אוטומטית על-ידי AI</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-extrabold tabular-nums ${scoreColor}`}>{data.score}</p>
          <p className="text-[11px] text-gray-400 font-medium">מתוך 100</p>
        </div>
      </div>

      {/* What's correct */}
      {data.correct.length > 0 && (
        <div className="bg-green-50 rounded-2xl border border-green-100 px-5 py-4">
          <p className="text-[11px] font-extrabold text-green-600 uppercase tracking-widest mb-2.5">
            ✅ מה עשית נכון
          </p>
          <ul className="space-y-1.5">
            {data.correct.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 font-bold mt-0.5 shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* What to improve */}
      {data.improve.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-100 px-5 py-4">
          <p className="text-[11px] font-extrabold text-amber-600 uppercase tracking-widest mb-2.5">
            ⚠️ מה לשפר
          </p>
          <ul className="space-y-1.5">
            {data.improve.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-amber-500 font-bold mt-0.5 shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {data.suggestions.length > 0 && (
        <div className="bg-indigo-50 rounded-2xl border border-indigo-100 px-5 py-4">
          <p className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest mb-2.5">
            💡 הצעות לשיפור
          </p>
          <ul className="space-y-1.5">
            {data.suggestions.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-indigo-400 font-bold mt-0.5 shrink-0">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
export default function AssignmentPanel({ unitId }: { unitId: string }) {
  const [data, setData] = useState<AssignmentData | null | undefined>(undefined)
  const [text, setText] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [tab, setTab] = useState<'text' | 'file'>('text')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<AiFeedbackData | null>(null)

  useEffect(() => {
    fetch(`/api/assignments/unit/${unitId}`)
      .then(r => r.json())
      .then((d: AssignmentData) => {
        setData(d)
        // If existing submission already has AI feedback, parse it
        if (d?.submission?.feedback) {
          const parsed = parseAiFeedback(d.submission.feedback)
          if (parsed) setAiFeedback(parsed)
        }
      })
  }, [unitId])

  if (data === undefined || data === null) return null

  const sub = data.submission
  const alreadySubmitted = !!sub

  /* ── Request AI feedback for a submission ── */
  const requestAiFeedback = async (submissionId: string) => {
    setAiLoading(true)
    try {
      const res = await fetch(`/api/submissions/${submissionId}/ai-feedback`, { method: 'POST' })
      if (!res.ok) return
      const updated = await res.json()
      const parsed = parseAiFeedback(updated.feedback)
      if (parsed) {
        setAiFeedback(parsed)
        // Update local submission state with grade + status
        setData(prev => prev ? {
          ...prev,
          submission: { ...prev.submission!, grade: updated.grade, status: updated.status, feedback: updated.feedback }
        } : prev)
      }
    } catch {
      // AI feedback failure is non-fatal — submission is already saved
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const payload = tab === 'text' ? text.trim() : ''
    const file    = tab === 'file' ? fileUrl.trim() : ''
    if (!payload && !file) { setError('יש להזין טקסט או קישור לקובץ'); return }

    setSubmitting(true)
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId: data.id, textSubmission: payload || null, fileUrl: file || null }),
    })
    const result = await res.json()
    setSubmitting(false)

    if (!res.ok) { setError(result.error || 'שגיאה בשליחה'); return }

    setData({ ...data, submission: result })
    setJustSubmitted(true)
    setTimeout(() => setJustSubmitted(false), 5000)

    // Trigger AI feedback immediately after submission (text only)
    if (payload) requestAiFeedback(result.id)
  }

  /* ── Also trigger AI feedback if sub exists without it (on load) ── */
  useEffect(() => {
    if (sub && sub.id && !sub.feedback && tab !== 'file' && sub.textSubmission) {
      requestAiFeedback(sub.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub?.id])

  const isAutoReviewed = sub?.status === 'auto_reviewed'
  const isHumanReviewed = sub?.status === 'reviewed'

  const statusBadge = isHumanReviewed
    ? { label: 'נבדק על-ידי מורה', color: 'bg-green-100 text-green-700 border-green-200' }
    : isAutoReviewed
    ? { label: 'נבדק אוטומטית', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' }
    : { label: 'הוגש · בבדיקה', color: 'bg-blue-100 text-blue-700 border-blue-200' }

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div dir="rtl" className="relative rounded-3xl border-2 border-rose-200 bg-white shadow-md overflow-hidden">
      {/* side stripe */}
      <div className="absolute top-0 end-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-400 to-pink-500" />
      <div className="h-0.5 bg-gradient-to-l from-rose-400 to-pink-400" />

      <div className="p-7 pe-10">
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
            <span className={`shrink-0 text-xs font-extrabold px-3 py-1.5 rounded-full border ${statusBadge.color}`}>
              {statusBadge.label}
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
              <span className="text-gray-600">{new Date(data.dueDate).toLocaleDateString('he-IL')}</span>
            </span>
          )}
        </div>

        {/* ── Already submitted ── */}
        {alreadySubmitted ? (
          <div className="space-y-4">
            {/* Just-submitted confirmation */}
            {justSubmitted && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3.5 text-green-700">
                <span className="text-xl shrink-0">✅</span>
                <div>
                  <p className="font-extrabold text-sm">המשימה הוגשה בהצלחה!</p>
                  <p className="text-xs text-green-600 mt-0.5">ה-AI מנתח את ההגשה שלך...</p>
                </div>
              </div>
            )}

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

            {/* AI feedback loading */}
            {aiLoading && !aiFeedback && (
              <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
                <span className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-bold text-indigo-700">ה-AI בודק את ההגשה שלך...</p>
                  <p className="text-xs text-indigo-400 mt-0.5">זה לוקח כמה שניות</p>
                </div>
              </div>
            )}

            {/* AI feedback results */}
            {aiFeedback && <AiFeedbackPanel data={aiFeedback} />}

            {/* Human instructor feedback (manual review) */}
            {isHumanReviewed && (
              <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
                <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3">משוב המורה</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl font-extrabold text-green-700">{sub.grade ?? '—'}</div>
                  <div className="text-sm text-green-600">מתוך {data.maxScore} נקודות</div>
                  {sub.grade != null && (
                    <div className="mr-auto text-sm font-bold text-green-700">
                      {Math.round((sub.grade / data.maxScore) * 100)}%
                    </div>
                  )}
                </div>
                {sub.feedback && !parseAiFeedback(sub.feedback) && (
                  <p className="text-gray-700 text-sm leading-7 whitespace-pre-line border-t border-green-100 pt-3">
                    {sub.feedback}
                  </p>
                )}
              </div>
            )}

            {/* Pending review (no AI feedback yet either) */}
            {!isAutoReviewed && !isHumanReviewed && !aiLoading && !aiFeedback && (
              <div className="flex items-center justify-between gap-3 bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 text-sm font-semibold">
                  <span className="text-lg">⏳</span>
                  המשימה הוגשה ומחכה לבדיקה
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold
                  bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  הוגש · בבדיקה
                </span>
              </div>
            )}
          </div>
        ) : (
          /* ── Submit form ── */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex bg-gray-100 rounded-xl p-1 w-fit gap-1">
              <button type="button" onClick={() => setTab('text')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === 'text' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'
                }`}>
                ✍️ טקסט
              </button>
              <button type="button" onClick={() => setTab('file')}
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
                <p className="text-xs text-gray-400 pr-1">ודא שהקובץ נגיש לכולם לפני השליחה</p>
              </div>
            )}

            {error && (
              <p className="text-rose-600 text-sm bg-rose-50 rounded-xl px-4 py-2 border border-rose-100">{error}</p>
            )}

            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <p className="text-gray-400 text-sm">לאחר ההגשה תקבל משוב אוטומטי מה-AI</p>
              <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-2 bg-gradient-to-l from-rose-600 to-pink-600
                  hover:from-rose-700 hover:to-pink-700 text-white font-extrabold px-6 py-2.5
                  rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all duration-200
                  disabled:opacity-60 text-sm">
                {submitting
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />שולח...</>
                  : <>📤 הגש משימה</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
