import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const adminPass = await bcrypt.hash('admin123', 10)
  const userPass = await bcrypt.hash('user123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { name: 'מנהל ראשי', email: 'admin@example.com', password: adminPass, role: 'super_admin' },
  })

  const user1 = await prisma.user.upsert({
    where: { email: 'student1@example.com' },
    update: {},
    create: { name: 'דני כהן', email: 'student1@example.com', password: userPass, role: 'user' },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'student2@example.com' },
    update: {},
    create: { name: 'שרה לוי', email: 'student2@example.com', password: userPass, role: 'user' },
  })

  const course1 = await prisma.course.upsert({
    where: { id: 'course1' },
    update: {},
    create: {
      id: 'course1',
      title: 'מבוא לתכנות',
      description: 'קורס מקיף למתחילים בתכנות. נלמד את יסודות התכנות, משתנים, פונקציות ומבני נתונים.',
      releaseMode: 'sequential',
    },
  })

  const course2 = await prisma.course.upsert({
    where: { id: 'course2' },
    update: {},
    create: {
      id: 'course2',
      title: 'פיתוח אתרים מתקדם',
      description: 'קורס מתקדם לפיתוח אתרים עם React, Next.js ו-TypeScript.',
      releaseMode: 'manual',
    },
  })

  // Units for course 1
  const units1 = [
    { title: 'מבוא לתכנות - היסודות', content: 'ברוכים הבאים לקורס מבוא לתכנות!\n\nבשיעור זה נלמד:\n- מהו תכנות?\n- שפות תכנות נפוצות\n- סביבת העבודה שלנו\n\nתכנות הוא האמנות של לתת הוראות למחשב לביצוע משימות. בדיוק כמו שנותנים הוראות לאדם, אנחנו כותבים הוראות בשפה שהמחשב מבין.' },
    { title: 'משתנים וטיפוסי נתונים', content: 'משתנים הם "קופסאות" שבהן אנו שומרים מידע.\n\nדוגמה:\n```\nשם = "יוסי"\nגיל = 25\nציון = 95.5\n```\n\nטיפוסי נתונים עיקריים:\n- מחרוזת (String)\n- מספר שלם (Integer)\n- מספר עשרוני (Float)\n- בוליאני (Boolean)' },
    { title: 'תנאים ולולאות', content: 'תנאים מאפשרים לנו לקבל החלטות בקוד:\n\n```\nאם ציון >= 60:\n    הדפס "עבר"\nאחרת:\n    הדפס "נכשל"\n```\n\nלולאות מאפשרות חזרה על פעולות:\n```\nלכל מספר בין 1 ל-10:\n    הדפס מספר\n```' },
    { title: 'פונקציות', content: 'פונקציות הן בלוקים של קוד שאפשר לקרוא להם שוב ושוב.\n\n```python\ndef חיבור(a, b):\n    return a + b\n\nתוצאה = חיבור(5, 3)  # = 8\n```\n\nיתרונות:\n- קוד מסודר\n- שימוש חוזר\n- קל לבדיקה' },
    { title: 'פרויקט סיום', content: 'כעת ניצור פרויקט קטן שמשלב את כל מה שלמדנו!\n\nנבנה:\n1. תוכנית לניהול רשימת מטלות\n2. יכולת הוספה ומחיקה\n3. שמירה ב-"מסד נתונים" פשוט\n\nבהצלחה!' },
  ]

  for (let i = 0; i < units1.length; i++) {
    await prisma.unit.upsert({
      where: { id: `unit1-${i}` },
      update: {},
      create: {
        id: `unit1-${i}`,
        courseId: course1.id,
        title: units1[i].title,
        content: units1[i].content,
        orderIndex: i,
        isOpen: i === 0,
      },
    })
  }

  // Units for course 2
  const units2 = [
    { title: 'מבוא ל-React', content: 'React היא ספריית JavaScript לבניית ממשקי משתמש.\n\nמושגי יסוד:\n- קומפוננטות\n- Props\n- State\n- JSX\n\nנתחיל עם הדוגמה הראשונה שלנו!' },
    { title: 'Hooks ב-React', content: 'Hooks הם פונקציות מיוחדות של React.\n\nהחשובים ביותר:\n- useState - ניהול מצב\n- useEffect - תופעות לוואי\n- useContext - הקשר גלובלי\n- useCallback - אופטימיזציה' },
    { title: 'Next.js - יסודות', content: 'Next.js הוא Framework לבניית אפליקציות React.\n\nיתרונות:\n- Server-Side Rendering\n- Static Generation\n- API Routes\n- תמיכה מובנית ב-TypeScript' },
    { title: 'Tailwind CSS', content: 'Tailwind CSS הוא CSS Framework utility-first.\n\nדוגמה:\n```html\n<div class="flex items-center justify-between p-4 bg-blue-500 text-white rounded-lg">\n  תוכן\n</div>\n```\n\nאין צורך לכתוב CSS!' },
    { title: 'פרויקט מלא', content: 'בשיעור האחרון נבנה אפליקציה מלאה!\n\nנכלול:\n- Authentication\n- Database (PostgreSQL)\n- API Routes\n- Responsive Design\n\nנתמקד ב-best practices ובקוד נקי.' },
  ]

  for (let i = 0; i < units2.length; i++) {
    await prisma.unit.upsert({
      where: { id: `unit2-${i}` },
      update: {},
      create: {
        id: `unit2-${i}`,
        courseId: course2.id,
        title: units2[i].title,
        content: units2[i].content,
        orderIndex: i,
        isOpen: i < 2,
        zoomLink: i === 0 ? 'https://zoom.us/j/example' : undefined,
      },
    })
  }

  // Enroll users
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user1.id, courseId: course1.id } },
    update: {},
    create: { userId: user1.id, courseId: course1.id },
  })

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user1.id, courseId: course2.id } },
    update: {},
    create: { userId: user1.id, courseId: course2.id },
  })

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: user2.id, courseId: course1.id } },
    update: {},
    create: { userId: user2.id, courseId: course1.id },
  })

  // Access codes
  await prisma.accessCode.upsert({
    where: { code: 'REACT2024' },
    update: {},
    create: { code: 'REACT2024', courseId: course2.id },
  })

  await prisma.accessCode.upsert({
    where: { code: 'CODE2024' },
    update: {},
    create: { code: 'CODE2024', courseId: course1.id },
  })

  console.log('Database seeded successfully!')
  console.log('Admin: admin@example.com / admin123')
  console.log('User 1: student1@example.com / user123')
  console.log('User 2: student2@example.com / user123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
