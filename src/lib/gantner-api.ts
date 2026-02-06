// Fake Gantner API integration
// In production, this would call the actual Gantner lock server

// Pricing: 20 DKK/hr, overstay 15 DKK per started 30-min block
export const PRICE_PER_HOUR = 20
export const OVERSTAY_PER_30MIN = 15

export interface Locker {
  id: string
  number: number
  zone: string
  size: 'small' | 'medium' | 'large'
  status: 'available' | 'rented' | 'out_of_service'
  rentalInfo?: {
    sessionToken: string
    startTime: string
    endTime: string
    duration: number
    pin?: string
    phone?: string
    email?: string
    isLocked: boolean
    paidAmount: number       // Total amount authorized with PSP
    overstayCharge: number   // Accumulated overstay fees
  }
}

// Simulated locker data
const lockers: Map<string, Locker> = new Map()

function initLockers() {
  const sizes: Locker['size'][] = ['small', 'medium', 'large']

  // Zone A: A001-A020
  for (let i = 1; i <= 20; i++) {
    const id = `A${String(i).padStart(3, '0')}`
    lockers.set(id, {
      id,
      number: i,
      zone: 'A',
      size: sizes[i % 3],
      status: Math.random() > 0.85 ? 'rented' : 'available',
    })
  }

  // Zone B: B001-B100
  for (let i = 1; i <= 100; i++) {
    const id = `B${String(i).padStart(3, '0')}`
    lockers.set(id, {
      id,
      number: 20 + i,
      zone: 'B',
      size: sizes[i % 3],
      status: Math.random() > 0.9 ? 'rented' : 'available',
    })
  }

  // Zone C: C001-C020
  for (let i = 1; i <= 20; i++) {
    const id = `C${String(i).padStart(3, '0')}`
    lockers.set(id, {
      id,
      number: 120 + i,
      zone: 'C',
      size: sizes[i % 3],
      status: Math.random() > 0.85 ? 'rented' : 'available',
    })
  }

  // A few out of service for demo
  for (const id of ['B025', 'B076']) {
    const oosLocker = lockers.get(id)
    if (oosLocker) oosLocker.status = 'out_of_service'
  }
}

initLockers()

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateSessionToken(): string {
  return 'psp_' + crypto.randomUUID().replace(/-/g, '')
}

export const gantnerApi = {
  async getLocker(lockerId: string): Promise<Locker | null> {
    await delay(300)
    return lockers.get(lockerId.toUpperCase()) ?? null
  },

  // Restore locker state from a cookie session (handles mock API state loss on HMR/reload)
  syncFromSession(lockerId: string, session: { sessionToken: string; rentedAt: string; expiresAt: string }): Locker | null {
    const locker = lockers.get(lockerId.toUpperCase())
    if (!locker) return null
    const expires = new Date(session.expiresAt)
    const start = new Date(session.rentedAt)
    const duration = Math.round((expires.getTime() - start.getTime()) / (1000 * 60 * 60))
    locker.status = 'rented'
    locker.rentalInfo = {
      sessionToken: session.sessionToken,
      startTime: session.rentedAt,
      endTime: session.expiresAt,
      duration,
      isLocked: locker.rentalInfo?.isLocked ?? true,
      paidAmount: locker.rentalInfo?.paidAmount ?? duration * PRICE_PER_HOUR,
      overstayCharge: locker.rentalInfo?.overstayCharge ?? 0,
    }
    return locker
  },

  async checkAvailability(lockerId: string): Promise<{ available: boolean; locker: Locker | null }> {
    await delay(400)
    const locker = lockers.get(lockerId.toUpperCase())
    if (!locker) return { available: false, locker: null }
    return { available: locker.status === 'available', locker }
  },

  async rentLocker(lockerId: string, durationHours: number, options?: { pin?: string; phone?: string; email?: string }): Promise<{ success: boolean; sessionToken: string; locker: Locker }> {
    await delay(800)
    const locker = lockers.get(lockerId.toUpperCase())
    if (!locker || locker.status !== 'available') {
      throw new Error('Locker not available')
    }

    const sessionToken = generateSessionToken()
    const now = new Date()
    const endTime = new Date(now.getTime() + durationHours * 60 * 60 * 1000)

    const amount = durationHours * PRICE_PER_HOUR
    locker.status = 'rented'
    locker.rentalInfo = {
      sessionToken,
      startTime: now.toISOString(),
      endTime: endTime.toISOString(),
      duration: durationHours,
      pin: options?.pin,
      phone: options?.phone,
      email: options?.email,
      isLocked: false, // Starts unlocked so customer can put stuff in
      paidAmount: amount,
      overstayCharge: 0,
    }

    return { success: true, sessionToken, locker }
  },

  async extendRental(lockerId: string, sessionToken: string, extraHours: number): Promise<{ success: boolean; locker: Locker; additionalCharge: number }> {
    await delay(600)
    const locker = lockers.get(lockerId.toUpperCase())
    if (!locker || locker.status !== 'rented') {
      throw new Error('Locker not found or not rented')
    }
    if (locker.rentalInfo?.sessionToken !== sessionToken) {
      throw new Error('Invalid session token')
    }

    // Calculate overstay if past end time
    const now = new Date()
    const currentEnd = new Date(locker.rentalInfo.endTime)
    let overstayCharge = 0
    if (now > currentEnd) {
      const overstayMs = now.getTime() - currentEnd.getTime()
      const overstayBlocks = Math.ceil(overstayMs / (30 * 60 * 1000)) // per started 30-min block
      overstayCharge = overstayBlocks * OVERSTAY_PER_30MIN
    }

    // Extension cost
    const extensionCost = extraHours * PRICE_PER_HOUR
    const additionalCharge = extensionCost + overstayCharge

    // Extend from current end time (or from now if overstaying)
    const extendFrom = now > currentEnd ? now : currentEnd
    const newEnd = new Date(extendFrom.getTime() + extraHours * 60 * 60 * 1000)

    locker.rentalInfo.endTime = newEnd.toISOString()
    locker.rentalInfo.duration += extraHours
    locker.rentalInfo.paidAmount += additionalCharge
    locker.rentalInfo.overstayCharge += overstayCharge

    return { success: true, locker, additionalCharge }
  },

  async unlockLocker(lockerId: string, sessionToken: string): Promise<{ success: boolean }> {
    await delay(500)
    const locker = lockers.get(lockerId.toUpperCase())
    if (!locker || locker.status !== 'rented') {
      throw new Error('Locker not found or not rented')
    }
    if (locker.rentalInfo?.sessionToken !== sessionToken) {
      throw new Error('Invalid session token')
    }
    locker.rentalInfo.isLocked = false
    return { success: true }
  },

  async lockLocker(lockerId: string, sessionToken: string): Promise<{ success: boolean }> {
    await delay(500)
    const locker = lockers.get(lockerId.toUpperCase())
    if (!locker || locker.status !== 'rented') {
      throw new Error('Locker not found or not rented')
    }
    if (locker.rentalInfo?.sessionToken !== sessionToken) {
      throw new Error('Invalid session token')
    }
    locker.rentalInfo.isLocked = true
    return { success: true }
  },

  async getLockerByToken(sessionToken: string): Promise<Locker | null> {
    await delay(300)
    for (const locker of lockers.values()) {
      if (locker.rentalInfo?.sessionToken === sessionToken) {
        return locker
      }
    }
    return null
  },

  // Admin endpoints
  async getAllLockers(): Promise<Locker[]> {
    await delay(300)
    return Array.from(lockers.values())
  },

  async adminUnlock(lockerId: string): Promise<{ success: boolean }> {
    await delay(500)
    const locker = lockers.get(lockerId.toUpperCase())
    if (!locker) throw new Error('Locker not found')
    if (locker.rentalInfo) {
      locker.rentalInfo.isLocked = false
    }
    return { success: true }
  },

  async adminRelease(lockerId: string): Promise<{ success: boolean }> {
    await delay(500)
    const locker = lockers.get(lockerId.toUpperCase())
    if (!locker) throw new Error('Locker not found')
    locker.status = 'available'
    locker.rentalInfo = undefined
    return { success: true }
  },

  async openAllLockers(): Promise<{ success: boolean; count: number }> {
    await delay(1000)
    let count = 0
    for (const locker of lockers.values()) {
      if (locker.rentalInfo) {
        locker.rentalInfo.isLocked = false
        count++
      }
    }
    return { success: true, count }
  },
}
