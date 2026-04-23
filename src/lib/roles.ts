/**
 * Role hierarchy (stored as string in User.role):
 *
 *  super_admin  — full system access: user management, access codes, all content
 *  admin        — content management + grading; no user/code management
 *  instructor   — (future) course-scoped access via CourseInstructor junction;
 *                 can grade submissions for their assigned courses only
 *  user         — student; enrolled in courses, submits assignments
 *
 * To expand: add "instructor" to ADMIN_ROLES and create instructor-scoped
 * API middleware that checks CourseInstructor for the requested courseId.
 */

export type Role = 'super_admin' | 'admin' | 'instructor' | 'user'

/** True for both admin and super_admin (full dashboard access) */
export function isAdminRole(role: string | undefined | null): boolean {
  return role === 'admin' || role === 'super_admin'
}

/** True only for super_admin (user management, access codes, system settings) */
export function isSuperAdmin(role: string | undefined | null): boolean {
  return role === 'super_admin'
}

/** True for instructor (course-scoped, future use) */
export function isInstructor(role: string | undefined | null): boolean {
  return role === 'instructor'
}

/** True for any management role (admin, super_admin, or future instructor) */
export function isStaff(role: string | undefined | null): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'instructor'
}

/** Hebrew display label for a role */
export function roleLabel(role: string | undefined | null): string {
  switch (role) {
    case 'super_admin': return 'מנהל ראשי'
    case 'admin':       return 'מנהל'
    case 'instructor':  return 'מרצה'
    default:            return 'סטודנט'
  }
}
