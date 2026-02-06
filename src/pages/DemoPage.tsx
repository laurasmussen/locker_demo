import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { gantnerApi } from '@/lib/gantner-api'
import { getAllSessions } from '@/lib/session'
import { useLanguage } from '@/lib/language-context'
import { QrCode, Unlock, Settings, Pencil } from 'lucide-react'
import { useState } from 'react'

export function DemoPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const sessions = getAllSessions()
  const [loading, setLoading] = useState(false)

  const handleScanQr = async () => {
    setLoading(true)
    // Find a random available locker
    const lockers = await gantnerApi.getAllLockers()
    const available = lockers.filter(l => l.status === 'available')
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)]
      navigate(`/locker/${random.id}`)
    }
    setLoading(false)
  }

  const handleReturnUnlock = () => {
    if (sessions.length > 0) {
      // Navigate to the most recent session
      const latest = sessions[sessions.length - 1]
      navigate(`/locker/${latest.lockerId}`)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Demo badge */}
        <div className="text-center pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500 mb-4 border border-dashed border-gray-300">
            <Pencil className="h-3 w-3" />
            {t('demo.mockup')}
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{t('demo.title')}</h2>
          <p className="text-sm text-gray-400 mt-1">{t('demo.subtitle')}</p>
        </div>

        {/* Scan QR button */}
        <button
          onClick={handleScanQr}
          disabled={loading}
          className="w-full p-6 rounded-2xl border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all active:scale-[0.98] flex flex-col items-center gap-3"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
            <QrCode className="h-8 w-8 text-gray-500" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-700">{t('demo.scanQr')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('demo.scanQrDesc')}</p>
          </div>
        </button>

        {/* Return to unlock button */}
        <button
          onClick={handleReturnUnlock}
          disabled={sessions.length === 0}
          className={`w-full p-6 rounded-2xl border-2 border-dashed transition-all active:scale-[0.98] flex flex-col items-center gap-3 ${
            sessions.length > 0
              ? 'border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400'
              : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
          }`}
        >
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
            <Unlock className="h-8 w-8 text-gray-500" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-700">{t('demo.returnUnlock')}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {sessions.length > 0
                ? `${t('demo.returnUnlockDesc')} (${sessions[sessions.length - 1].lockerId})`
                : t('demo.noActive')
              }
            </p>
          </div>
        </button>

        {/* Active sessions count */}
        {sessions.length > 0 && (
          <p className="text-xs text-center text-gray-400">
            {sessions.length} {sessions.length === 1 ? 'active locker' : 'active lockers'}
          </p>
        )}

        {/* Admin link */}
        <div className="border-t pt-4">
          <p className="text-xs text-gray-400 text-center mb-2">{t('demo.orTry')}</p>
          <button
            onClick={() => navigate('/admin')}
            className="w-full p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-sm text-gray-500"
          >
            <Settings className="h-4 w-4" />
            {t('demo.admin')}
          </button>
        </div>
      </div>
    </Layout>
  )
}
