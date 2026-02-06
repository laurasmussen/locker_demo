import { useEffect, useState, useCallback } from 'react'
import { gantnerApi, type Locker } from '@/lib/gantner-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/Spinner'
import { Lock, Unlock, AlertTriangle, DoorOpen, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

export function AdminPage() {
  const [lockers, setLockers] = useState<Locker[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { t } = useLanguage()

  const loadLockers = useCallback(async () => {
    setLoading(true)
    const all = await gantnerApi.getAllLockers()
    setLockers(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadLockers()
  }, [loadLockers])

  const handleAdminUnlock = async (lockerId: string) => {
    setActionLoading(lockerId)
    await gantnerApi.adminUnlock(lockerId)
    await loadLockers()
    setActionLoading(null)
  }

  const handleAdminRelease = async (lockerId: string) => {
    setActionLoading(lockerId)
    await gantnerApi.adminRelease(lockerId)
    await loadLockers()
    setActionLoading(null)
  }

  const handleOpenAll = async () => {
    setActionLoading('all')
    await gantnerApi.openAllLockers()
    await loadLockers()
    setActionLoading(null)
  }

  const stats = {
    total: lockers.length,
    available: lockers.filter(l => l.status === 'available').length,
    rented: lockers.filter(l => l.status === 'rented').length,
    outOfService: lockers.filter(l => l.status === 'out_of_service').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Spinner text={t('admin.loading')} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-ocean-dark text-white px-4 py-3 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{t('admin.title')}</h1>
            <p className="text-xs text-white/70">{t('admin.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={loadLockers}>
              <RefreshCw className="h-3.5 w-3.5" />
              {t('admin.refresh')}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleOpenAll} disabled={actionLoading === 'all'}>
              <DoorOpen className="h-3.5 w-3.5" />
              {t('admin.openAll')}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">{t('admin.total')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">{stats.available}</p>
              <p className="text-xs text-muted-foreground">{t('admin.available')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-ocean">{stats.rented}</p>
              <p className="text-xs text-muted-foreground">{t('admin.rented')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.outOfService}</p>
              <p className="text-xs text-muted-foreground">{t('admin.oos')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Locker grid by zone */}
        {Array.from(new Set(lockers.map(l => l.zone))).sort().map(zone => {
          const zoneLockers = lockers.filter(l => l.zone === zone)
          return (
            <Card key={zone}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('admin.zone')} {zone}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {zoneLockers.map(locker => (
                    <div
                      key={locker.id}
                      className={`rounded-lg border p-3 text-sm ${
                        locker.status === 'available'
                          ? 'bg-green-50 border-green-200'
                          : locker.status === 'rented'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-semibold">{locker.id}</span>
                        <Badge
                          variant={
                            locker.status === 'available' ? 'success'
                            : locker.status === 'rented' ? 'default'
                            : 'destructive'
                          }
                          className="text-[10px]"
                        >
                          {locker.status === 'available' ? t('admin.free') : locker.status === 'rented' ? t('admin.rentedBadge') : t('admin.oosBadge')}
                        </Badge>
                      </div>

                      {locker.status === 'rented' && locker.rentalInfo && (
                        <div className="text-xs text-muted-foreground space-y-1 mb-2">
                          <div className="flex items-center gap-1">
                            {locker.rentalInfo.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                            {locker.rentalInfo.isLocked ? 'Locked' : 'Unlocked'}
                          </div>
                          <div>{t('admin.until')} {new Date(locker.rentalInfo.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      )}

                      {locker.status === 'rented' && (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 flex-1"
                            onClick={() => handleAdminUnlock(locker.id)}
                            disabled={actionLoading === locker.id}
                          >
                            <Unlock className="h-3 w-3" />
                            {t('admin.open')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 flex-1"
                            onClick={() => handleAdminRelease(locker.id)}
                            disabled={actionLoading === locker.id}
                          >
                            {t('admin.release')}
                          </Button>
                        </div>
                      )}

                      {locker.status === 'out_of_service' && (
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          {t('admin.needsAttention')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
