import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getAllSessions } from '@/lib/session'
import { useLanguage } from '@/lib/language-context'
import { QrCode, ArrowRight, Lock, CreditCard, Unlock, ShieldCheck, Cookie } from 'lucide-react'

export function HomePage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [lockerId, setLockerId] = useState('')
  const sessions = getAllSessions()

  const steps = [
    {
      icon: QrCode,
      title: t('home.step1.title'),
      description: t('home.step1.desc'),
      color: 'bg-ocean/10 text-ocean',
    },
    {
      icon: CreditCard,
      title: t('home.step2.title'),
      description: t('home.step2.desc'),
      color: 'bg-success/10 text-success',
    },
    {
      icon: Unlock,
      title: t('home.step3.title'),
      description: t('home.step3.desc'),
      color: 'bg-warning/10 text-warning',
    },
  ]

  const handleGo = () => {
    if (lockerId.trim()) {
      navigate(`/locker/${lockerId.trim().toUpperCase()}`)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Hero */}
        <div className="text-center pt-2">
          <h2 className="text-2xl font-bold">{t('home.title')}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t('home.subtitle')}
          </p>
        </div>

        {/* How it works - step flow */}
        <div className="relative">
          <div className="flex items-start justify-between gap-2">
            {steps.map((step, i) => (
              <div key={step.title} className="flex-1 flex flex-col items-center text-center relative">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-[2px] bg-border z-0">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-border" />
                  </div>
                )}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${step.color}`}>
                  <step.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold mt-2">{step.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight px-1">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {t('home.trust.secure')}</span>
          <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> {t('home.trust.noapp')}</span>
          <span className="flex items-center gap-1"><Cookie className="h-3.5 w-3.5" /> {t('home.trust.nologin')}</span>
        </div>

        {/* Scan CTA */}
        <Card className="border-ocean/30 bg-gradient-to-br from-ocean/5 to-ocean/10">
          <CardContent className="p-5 text-center space-y-3">
            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
              <QrCode className="h-7 w-7 text-ocean" />
            </div>
            <div>
              <p className="font-medium">{t('home.scan.title')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('home.scan.desc')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Manual entry */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t('home.manual')}</p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. A001"
              value={lockerId}
              onChange={(e) => setLockerId(e.target.value.toUpperCase())}
              className="font-mono text-lg h-12"
              onKeyDown={(e) => e.key === 'Enter' && handleGo()}
            />
            <Button variant="ocean" size="lg" onClick={handleGo} disabled={!lockerId.trim()}>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Active sessions */}
        {sessions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">{t('home.active')}</h3>
            <div className="space-y-2">
              {sessions.map((s) => (
                <Card key={s.lockerId} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/locker/${s.lockerId}`)}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-ocean/10 rounded-lg flex items-center justify-center">
                        <Lock className="h-5 w-5 text-ocean" />
                      </div>
                      <div>
                        <p className="font-mono font-semibold">{s.lockerId}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('home.expires')} {new Date(s.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recovery notice + footer */}
        <div className="border-t pt-4 space-y-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">{t('home.lost.title')}</span>{' '}
              {t('home.lost.desc')}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[10px] text-muted-foreground">
              <p>Den Blaa Planet A/S</p>
              <p>Jacob Fortlingsvej 1, 2770 Kastrup</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => navigate('/admin')}>
              {t('home.staff')}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
