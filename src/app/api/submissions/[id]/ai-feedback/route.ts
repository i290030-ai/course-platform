import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

export interface AiFeedbackData {
  correct: string[]
  improve: string[]
  suggestions: string[]
  score: number
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id

  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    include: { assignment: true },
  })

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.userId !== userId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!submission.textSubmission)
    return NextResponse.json({ error: 'No text to analyze' }, { status: 400 })

  // Return cached AI feedback if already analyzed
  if (submission.status === 'auto_reviewed' && submission.feedback) {
    return NextResponse.json(submission)
  }

  const prompt = `אתה מורה שמעריך הגשת משימה של תלמיד בקורס.

שם המשימה: ${submission.assignment.title}
הוראות המשימה:
${submission.assignment.description}

הגשת התלמיד:
${submission.textSubmission}

נתח את ההגשה ותן משוב מקצועי. החזר JSON בדיוק במבנה הזה ובלי שום טקסט נוסף לפניו או אחריו:
{
  "correct": ["דבר חיובי ספציפי שהתלמיד עשה נכון"],
  "improve": ["נקודה ספציפית שדורשת שיפור"],
  "suggestions": ["הצעה קונקרטית ופעילה לשיפור"],
  "score": 80
}

כללים:
- כתוב הכל בעברית
- היה ספציפי, עניני ומעודד
- עד 3 פריטים בכל קטגוריה
- ניקוד 0–100 המשקף את איכות ההגשה
- JSON בלבד — ללא מלל נוסף`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in AI response')

    const feedback: AiFeedbackData = JSON.parse(jsonMatch[0])

    // Normalize
    feedback.correct     = Array.isArray(feedback.correct)     ? feedback.correct.slice(0, 3)     : []
    feedback.improve     = Array.isArray(feedback.improve)     ? feedback.improve.slice(0, 3)     : []
    feedback.suggestions = Array.isArray(feedback.suggestions) ? feedback.suggestions.slice(0, 3) : []
    feedback.score       = typeof feedback.score === 'number'
      ? Math.min(100, Math.max(0, Math.round(feedback.score)))
      : 70

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        feedback: JSON.stringify(feedback),
        grade:    feedback.score,
        status:   'auto_reviewed',
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[ai-feedback]', err)
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
  }
}
