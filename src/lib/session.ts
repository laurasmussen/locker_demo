// Cookie-based session management
// In production, the PSP (Payment Service Provider) would generate a unique token
// that we store as a cookie on the customer's device

const COOKIE_NAME = 'blaaplanet_locker_sessions'

export interface LockerSession {
  lockerId: string
  sessionToken: string
  rentedAt: string
  expiresAt: string
  phone?: string
  email?: string
}

export function saveSession(lockerId: string, sessionToken: string, expiresAt: string, contact?: { phone?: string; email?: string }): void {
  const sessions = getSessions()
  sessions[lockerId] = {
    lockerId,
    sessionToken,
    rentedAt: new Date().toISOString(),
    expiresAt,
    phone: contact?.phone || undefined,
    email: contact?.email || undefined,
  }
  writeCookie(sessions)
}

export function updateSessionContact(lockerId: string, contact: { phone?: string; email?: string }): void {
  const sessions = getSessions()
  const session = sessions[lockerId]
  if (!session) return
  if (contact.phone) session.phone = contact.phone
  if (contact.email) session.email = contact.email
  writeCookie(sessions)
}

export function getSession(lockerId: string): LockerSession | null {
  const sessions = getSessions()
  return sessions[lockerId] ?? null
}

export function getAllSessions(): LockerSession[] {
  const sessions = getSessions()
  return Object.values(sessions)
}

export function extendSession(lockerId: string, newExpiresAt: string): void {
  const sessions = getSessions()
  const session = sessions[lockerId]
  if (!session) return
  session.expiresAt = newExpiresAt
  writeCookie(sessions)
}

export function removeSession(lockerId: string): void {
  const sessions = getSessions()
  delete sessions[lockerId]
  writeCookie(sessions)
}

function writeCookie(sessions: Record<string, LockerSession>) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(sessions))}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`
}

function getSessions(): Record<string, LockerSession> {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
  if (!match) return {}
  try {
    return JSON.parse(decodeURIComponent(match[1]))
  } catch {
    return {}
  }
}
