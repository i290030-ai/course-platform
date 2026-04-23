'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import UnitTemplate, { UnitResource } from '@/components/UnitTemplate'

/* ─────────────────────────────────────────
   Raw unit shape from the API
───────────────────────────────────────── */
interface ApiUnit {
  id: string
  title: string
  content: string
  zoomLink?: string
  courseId: string
  completed?: boolean
  orderIndex?: number
  isOpen?: boolean
}

/* ─────────────────────────────────────────
   Content parser
   Extracts structured sections from the
   raw freetext `content` field.
───────────────────────────────────────── */
interface Parsed {
  objectives: string[]
  mainContent: string
  videoUrl: string | null
  practice: string | null
  assignment: string | null
  codeBlocks: string[]
}

function parseUnitContent(raw: string): Parsed {
  const lines = raw.split('\n')
  const objectives: string[] = []
  const mainLines: string[] = []
  const codeBlocks: string[] = []
  let assignment: string | null = null
  let practice: string | null = null
  let videoUrl: string | null = null

  let inCode = false
  let codeBuffer = ''
  let inAssignment = false
  let assignmentBuffer: string[] = []
  let objectivesSection = false
  let mainStarted = false

  const ytRx = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  const ytMatch = raw.match(ytRx)
  if (ytMatch) videoUrl = `https://www.youtube.com/embed/${ytMatch[1]}`

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // code fences
    if (line.startsWith('```')) {
      if (inCode) { codeBlocks.push(codeBuffer.trim()); codeBuffer = ''; inCode = false }
      else inCode = true
      continue
    }
    if (inCode) { codeBuffer += lines[i] + '\n'; continue }

    // assignment section
    if (/^(משימה|מטלה|תרגיל|פרויקט סיום)/i.test(line)) {
      inAssignment = true; assignmentBuffer = []; continue
    }
    if (inAssignment) { assignmentBuffer.push(lines[i]); continue }

    // objectives
    const isBullet = /^[-•*]\s/.test(line) || /^\d+\.\s/.test(line)
    const isObjHeader = /נלמד|מטרות|יעדים|בשיעור זה/i.test(line)

    if (isObjHeader && !mainStarted) { objectivesSection = true; continue }
    if (objectivesSection && isBullet) { objectives.push(line.replace(/^[-•*\d.]\s+/, '')); continue }
    if (objectivesSection && !isBullet && line !== '') { objectivesSection = false; mainStarted = true }

    // skip YouTube URLs from body
    if (ytRx.test(line)) continue

    mainLines.push(lines[i])
  }

  if (assignmentBuffer.length > 0) assignment = assignmentBuffer.filter(Boolean).join('\n')

  // Extract practice from code blocks if present
  if (codeBlocks.length > 0) {
    practice = codeBlocks.map((b, i) => `**קוד לדוגמה${codeBlocks.length > 1 ? ` ${i + 1}` : ''}:**\n\`\`\`\n${b}\n\`\`\``).join('\n\n')
  }

  return {
    objectives,
    mainContent: mainLines.join('\n').trim(),
    videoUrl,
    practice,
    assignment,
    codeBlocks,
  }
}

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function UnitPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [unit, setUnit] = useState<ApiUnit | null>(null)
  const [courseUnits, setCourseUnits] = useState<ApiUnit[]>([])
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return

    fetch(`/api/unit/${params.id}`)
      .then(r => r.json())
      .then((data: ApiUnit) => {
        setUnit(data)
        setCompleted(data.completed ?? false)
        // Load sibling units to find next
        fetch(`/api/units/${data.courseId}`)
          .then(r => r.json())
          .then((units: ApiUnit[]) => {
            setCourseUnits(Array.isArray(units) ? units : [])
          })
      })
  }, [status, params.id])

  const handleComplete = async () => {
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitId: params.id }),
    })
    setCompleted(true)
  }

  /* Loading state */
  if (!unit)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6fa]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-indigo-500 text-sm font-medium">טוען יחידה...</span>
        </div>
      </div>
    )

  /* Parse content into sections */
  const parsed = parseUnitContent(unit.content)

  /* Resolve next unit */
  const currentIdx = courseUnits.findIndex(u => u.id === unit.id)
  const nextUnit = currentIdx !== -1 ? courseUnits[currentIdx + 1] : undefined
  const nextUnitId = nextUnit?.id ?? null
  const nextUnitLocked = nextUnit ? (nextUnit as any).locked === true : false

  /* Build resources list */
  const resources: UnitResource[] = []
  if (unit.zoomLink) {
    resources.push({ label: 'הצטרף לשיעור זום', url: unit.zoomLink, type: 'zoom' })
  }

  /* Estimate progress */
  const progress = completed ? 100 : 25

  return (
    <UnitTemplate
      unitId={unit.id}
      courseId={unit.courseId}
      title={unit.title}
      orderIndex={unit.orderIndex}
      objectives={parsed.objectives}
      videoUrl={parsed.videoUrl}
      content={parsed.mainContent}
      practice={parsed.practice ?? undefined}
      assignment={parsed.assignment ?? undefined}
      resources={resources}
      progress={progress}
      completed={completed}
      nextUnitId={nextUnitId}
      nextUnitLocked={nextUnitLocked}
      onComplete={handleComplete}
    />
  )
}
