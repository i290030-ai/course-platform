'use client'
import { useState } from 'react'

/* ─────────────────────────────────────────
   Types (mirrors UnitMedia Prisma model)
───────────────────────────────────────── */
export interface UnitMediaItem {
  id: string
  type: 'image' | 'document' | 'resource'
  title: string | null
  description: string | null
  url: string
  caption: string | null
  orderIndex: number
}

/* ─────────────────────────────────────────
   Lightbox (image click-to-enlarge)
───────────────────────────────────────── */
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 left-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full
          flex items-center justify-center text-white text-xl font-bold transition-colors"
        aria-label="סגור"
      >
        ✕
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

/* ─────────────────────────────────────────
   Image block
───────────────────────────────────────── */
function ImageBlock({ block }: { block: UnitMediaItem }) {
  const [lightbox, setLightbox] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <>
      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden
        hover:shadow-md transition-shadow">
        <div className="h-0.5 bg-gradient-to-l from-blue-400 to-cyan-400" />
        <div className="p-5">
          {block.title && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🖼️</span>
              <h4 className="font-bold text-gray-800 text-sm">{block.title}</h4>
            </div>
          )}
          {errored ? (
            <div className="rounded-xl bg-gray-100 border border-gray-200 p-8 text-center">
              <p className="text-3xl mb-2">🖼️</p>
              <p className="text-sm text-gray-500">לא ניתן לטעון את התמונה</p>
              <a href={block.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-indigo-500 hover:underline mt-1 inline-block">
                פתח קישור ישיר ↗
              </a>
            </div>
          ) : (
            <button
              onClick={() => setLightbox(true)}
              className="w-full group relative overflow-hidden rounded-xl cursor-zoom-in"
              title="לחץ להגדלה"
            >
              <img
                src={block.url}
                alt={block.title ?? block.caption ?? 'תמונה'}
                className="w-full max-h-[400px] object-contain bg-gray-50 rounded-xl
                  transition-transform duration-300 group-hover:scale-[1.01]"
                onError={() => setErrored(true)}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0
                group-hover:opacity-100 transition-opacity duration-200">
                <div className="bg-black/40 rounded-full px-3 py-1.5 text-white text-xs font-semibold
                  flex items-center gap-1.5 backdrop-blur-sm">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                  הגדל תמונה
                </div>
              </div>
            </button>
          )}
          {block.caption && (
            <p className="text-xs text-gray-400 text-center mt-2 italic">{block.caption}</p>
          )}
        </div>
      </div>
      {lightbox && (
        <Lightbox
          src={block.url}
          alt={block.title ?? block.caption ?? 'תמונה'}
          onClose={() => setLightbox(false)}
        />
      )}
    </>
  )
}

/* ─────────────────────────────────────────
   Document / PDF block
───────────────────────────────────────── */
function DocumentBlock({ block }: { block: UnitMediaItem }) {
  const [expanded, setExpanded] = useState(false)

  // Try to make Google Drive links embeddable
  const embedUrl = block.url
    .replace('/view?usp=sharing', '/preview')
    .replace('/view', '/preview')

  const isPdf = block.url.toLowerCase().includes('.pdf') || block.url.includes('drive.google.com')

  return (
    <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden
      hover:shadow-md transition-shadow">
      <div className="h-0.5 bg-gradient-to-l from-rose-400 to-pink-400" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-xl shrink-0">
              📄
            </div>
            <div>
              {block.title && <h4 className="font-bold text-gray-800 text-sm">{block.title}</h4>}
              {block.description && (
                <p className="text-xs text-gray-500 mt-0.5">{block.description}</p>
              )}
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isPdf && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600
                  bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg
                  transition-colors"
              >
                {expanded ? '▲ סגור' : '▼ פתח במסך מלא'}
              </button>
            )}
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600
                bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg
                transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              פתח בכרטיסייה חדשה
            </a>
            <a
              href={block.url}
              download
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600
                bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg
                transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              הורד קובץ
            </a>
          </div>
        </div>

        {/* Embedded viewer */}
        {expanded && (
          <div className="mt-2 rounded-xl overflow-hidden border border-rose-100 bg-gray-50">
            <iframe
              src={embedUrl}
              className="w-full"
              style={{ height: '60vh', minHeight: 400 }}
              title={block.title ?? 'מסמך'}
              allow="fullscreen"
            />
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Resource / link block
───────────────────────────────────────── */
function ResourceBlock({ block }: { block: UnitMediaItem }) {
  // Infer icon from URL
  const url = block.url.toLowerCase()
  const icon =
    url.includes('.pdf')         ? '📄' :
    url.includes('youtube.com') || url.includes('youtu.be') ? '🎬' :
    url.includes('github.com')  ? '🐙' :
    url.includes('figma.com')   ? '🎨' :
    url.includes('notion.so')   ? '📝' :
    url.includes('drive.google') ? '📁' :
    '🔗'

  const domain = (() => {
    try { return new URL(block.url).hostname.replace('www.', '') } catch { return block.url }
  })()

  return (
    <a
      href={block.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 bg-white rounded-2xl border border-indigo-100 shadow-sm
        p-5 hover:shadow-md hover:border-indigo-300 transition-all group"
    >
      <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center
        justify-center text-2xl shrink-0 group-hover:bg-indigo-100 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        {block.title ? (
          <p className="font-bold text-gray-800 text-sm group-hover:text-indigo-700 transition-colors truncate">
            {block.title}
          </p>
        ) : (
          <p className="font-bold text-indigo-600 text-sm truncate">{domain}</p>
        )}
        {block.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{block.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-1 font-mono truncate">{domain}</p>
      </div>
      <svg
        className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 shrink-0 rotate-180 transition-colors"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </a>
  )
}

/* ─────────────────────────────────────────
   Main export: renders all media blocks
───────────────────────────────────────── */
export default function UnitMediaBlocks({ blocks }: { blocks: UnitMediaItem[] }) {
  if (!blocks || blocks.length === 0) return null

  const images    = blocks.filter(b => b.type === 'image')
  const documents = blocks.filter(b => b.type === 'document')
  const resources = blocks.filter(b => b.type === 'resource')

  return (
    <div className="space-y-6">
      {/* Images */}
      {images.length > 0 && (
        <div className="space-y-4">
          {images.length > 1 && (
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">
              🖼️ תמונות
            </p>
          )}
          {images.map(block => <ImageBlock key={block.id} block={block} />)}
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div className="space-y-4">
          {documents.length > 1 && (
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">
              📄 מסמכים
            </p>
          )}
          {documents.map(block => <DocumentBlock key={block.id} block={block} />)}
        </div>
      )}

      {/* Resources */}
      {resources.length > 0 && (
        <div className="space-y-3">
          {resources.length > 1 && (
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">
              🔗 קישורים ומשאבים
            </p>
          )}
          {resources.map(block => <ResourceBlock key={block.id} block={block} />)}
        </div>
      )}
    </div>
  )
}
