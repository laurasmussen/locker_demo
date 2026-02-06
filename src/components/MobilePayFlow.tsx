import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/lib/language-context'
import { Check, Smartphone, ArrowLeft } from 'lucide-react'

type Phase = 'connecting' | 'waiting' | 'approved'

const MOBILEPAY_BLUE = '#5A78FF'

export function MobilePayFlow({ amount, onApproved, onCancel }: {
  amount: number
  onApproved: () => void
  onCancel: () => void
}) {
  const { t } = useLanguage()
  const [phase, setPhase] = useState<Phase>('connecting')

  useEffect(() => {
    if (phase === 'connecting') {
      const timer = setTimeout(() => setPhase('waiting'), 1500)
      return () => clearTimeout(timer)
    }
    if (phase === 'waiting') {
      // Auto-approve after 3 seconds to simulate payment
      const timer = setTimeout(() => setPhase('approved'), 3000)
      return () => clearTimeout(timer)
    }
    if (phase === 'approved') {
      const timer = setTimeout(() => onApproved(), 1200)
      return () => clearTimeout(timer)
    }
  }, [phase, onApproved])

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* MobilePay header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: MOBILEPAY_BLUE }}>
        <button onClick={onCancel} className="text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color: MOBILEPAY_BLUE }}>MP</span>
          </div>
          <span className="text-white font-semibold">MobilePay</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {phase === 'connecting' && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: `${MOBILEPAY_BLUE}15` }}>
              <Smartphone className="h-10 w-10 animate-pulse" style={{ color: MOBILEPAY_BLUE }} />
            </div>
            <div>
              <p className="text-lg font-semibold">{t('payment.mobilepay.connecting')}</p>
              <p className="text-sm text-muted-foreground mt-1">Den Blå Planet</p>
            </div>
            {/* Spinner */}
            <div className="flex justify-center">
              <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: MOBILEPAY_BLUE, borderTopColor: 'transparent' }} />
            </div>
          </div>
        )}

        {phase === 'waiting' && (
          <div className="text-center space-y-6">
            {/* Amount display */}
            <div>
              <p className="text-5xl font-bold" style={{ color: MOBILEPAY_BLUE }}>{amount} DKK</p>
              <p className="text-muted-foreground mt-2">Den Blå Planet - Skabsudlejning</p>
            </div>

            {/* Pulsing phone icon */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: `${MOBILEPAY_BLUE}15` }}>
                <Smartphone className="h-12 w-12" style={{ color: MOBILEPAY_BLUE }} />
              </div>
              {/* Pulse rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full animate-ping opacity-20" style={{ backgroundColor: MOBILEPAY_BLUE }} />
              </div>
            </div>

            <div>
              <p className="text-lg font-semibold">{t('payment.mobilepay.waiting')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('payment.mobilepay.desc')}</p>
            </div>

            {/* Simulated "Open MobilePay" button */}
            <Card className="border-2" style={{ borderColor: MOBILEPAY_BLUE }}>
              <CardContent className="p-4">
                <Button
                  className="w-full text-white font-semibold"
                  style={{ backgroundColor: MOBILEPAY_BLUE }}
                  size="lg"
                  onClick={() => setPhase('approved')}
                >
                  <Smartphone className="h-5 w-5" />
                  {t('payment.mobilepay.openApp')}
                </Button>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  {t('payment.mobilepay.notInstalled')}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {phase === 'approved' && (
          <div className="text-center space-y-6 animate-in fade-in">
            <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-12 w-12 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{t('payment.mobilepay.approved')}</p>
              <p className="text-muted-foreground mt-1">{amount} DKK</p>
            </div>
          </div>
        )}
      </div>

      {/* Cancel button at bottom (only during waiting) */}
      {phase !== 'approved' && (
        <div className="px-6 pb-8">
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onCancel}>
            {t('control.share.cancel')}
          </Button>
        </div>
      )}
    </div>
  )
}
