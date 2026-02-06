import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { gantnerApi, type Locker } from '@/lib/gantner-api'
import { getSession } from '@/lib/session'
import { Layout } from '@/components/Layout'
import { Spinner } from '@/components/Spinner'
import { RentFlow } from '@/components/RentFlow'
import { LockerControl } from '@/components/LockerControl'
import { AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

export function LockerPage() {
  const { lockerId } = useParams<{ lockerId: string }>()
  const [loading, setLoading] = useState(true)
  const [locker, setLocker] = useState<Locker | null>(null)
  const [hasSession, setHasSession] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    if (!lockerId) return
    async function check() {
      setLoading(true)

      // Check if user has an active session cookie for this locker
      const session = getSession(lockerId!)
      if (session && new Date() < new Date(session.expiresAt)) {
        // Valid session exists — sync mock API state so the token matches
        // (handles mock API losing state on HMR/page reload)
        const synced = gantnerApi.syncFromSession(lockerId!, session)
        if (synced) {
          setLocker(synced)
          setHasSession(true)
          setLoading(false)
          return
        }
      }

      // No valid session — fetch locker normally
      const result = await gantnerApi.getLocker(lockerId!)
      setLocker(result)
      setLoading(false)
    }
    check()
  }, [lockerId])

  if (loading) {
    return (
      <Layout>
        <Spinner text={t('locker.checking')} />
      </Layout>
    )
  }

  if (!locker) {
    return (
      <Layout>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          &larr; {t('locker.back')}
        </Link>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('locker.notfound.title')}</h2>
          <p className="text-muted-foreground">
            Locker <span className="font-mono font-semibold">{lockerId}</span> {t('locker.notfound.desc')}
          </p>
        </div>
      </Layout>
    )
  }

  if (locker.status === 'out_of_service') {
    return (
      <Layout>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          &larr; {t('locker.back')}
        </Link>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('locker.oos.title')}</h2>
          <p className="text-muted-foreground">
            Locker <span className="font-mono font-semibold">{locker.id}</span> {t('locker.oos.desc')}
          </p>
        </div>
      </Layout>
    )
  }

  // If user has an active session, show locker controls (lock/unlock)
  if (hasSession && locker.rentalInfo) {
    return (
      <Layout>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          &larr; {t('locker.mylockers')}
        </Link>
        <LockerControl locker={locker} onSessionEnd={() => { setHasSession(false); setLocker({ ...locker, status: 'available', rentalInfo: undefined }) }} />
      </Layout>
    )
  }

  // If locker is rented by someone else
  if (locker.status === 'rented') {
    return (
      <Layout>
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          &larr; {t('locker.back')}
        </Link>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">{t('locker.inuse.title')}</h2>
          <p className="text-muted-foreground">
            Locker <span className="font-mono font-semibold">{locker.id}</span> {t('locker.inuse.desc')}
          </p>
        </div>
      </Layout>
    )
  }

  // Locker is available - show rent flow
  return (
    <Layout>
      <RentFlow locker={locker} onComplete={(updatedLocker) => { setLocker(updatedLocker); setHasSession(true) }} />
    </Layout>
  )
}
