import { useState, useEffect, useCallback } from 'react'
import { gantnerApi, PRICE_PER_HOUR, OVERSTAY_PER_30MIN, type Locker } from '@/lib/gantner-api'
import { getSession, removeSession, updateSessionContact, extendSession } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/Spinner'
import { Lock, Unlock, Clock, Timer, Phone, Mail, Share2, Check, UserPlus, Plus, Minus, AlertTriangle, CreditCard } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

export function LockerControl({ locker: initialLocker, onSessionEnd }: { locker: Locker; onSessionEnd: () => void }) {
  const { t } = useLanguage()
  const [locker, setLocker] = useState(initialLocker)
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [showShare, setShowShare] = useState(false)
  const [shareInput, setShareInput] = useState('')
  const [shareMethod, setShareMethod] = useState<'sms' | 'email'>('sms')
  const [shareSent, setShareSent] = useState(false)
  const [editContact, setEditContact] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [extendHours, setExtendHours] = useState(1)
  const [extending, setExtending] = useState(false)
  const [extendSuccess, setExtendSuccess] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [overstayMinutes, setOverstayMinutes] = useState(0)

  const session = getSession(locker.id)

  // Initialize contact inputs from session
  useEffect(() => {
    if (session) {
      setPhoneInput(session.phone || '')
      setEmailInput(session.email || '')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const calcTimeLeft = useCallback(() => {
    if (!locker.rentalInfo?.endTime) return ''
    const end = new Date(locker.rentalInfo.endTime).getTime()
    const now = Date.now()
    const diff = end - now

    if (diff <= 0) {
      setIsExpired(true)
      setOverstayMinutes(Math.ceil(Math.abs(diff) / (1000 * 60)))
      return t('control.expired')
    }

    setIsExpired(false)
    setOverstayMinutes(0)
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}h ${minutes}m ${t('control.remaining')}`
    return `${minutes}m ${t('control.remaining')}`
  }, [locker.rentalInfo?.endTime, t])

  useEffect(() => {
    setTimeLeft(calcTimeLeft())
    const interval = setInterval(() => setTimeLeft(calcTimeLeft()), 10000) // Check more often for overstay
    return () => clearInterval(interval)
  }, [calcTimeLeft])

  const handleToggleLock = async () => {
    if (!session) return
    setLoading(true)
    try {
      if (locker.rentalInfo?.isLocked) {
        await gantnerApi.unlockLocker(locker.id, session.sessionToken)
        setLocker(prev => ({
          ...prev,
          rentalInfo: prev.rentalInfo ? { ...prev.rentalInfo, isLocked: false } : undefined,
        }))
      } else {
        await gantnerApi.lockLocker(locker.id, session.sessionToken)
        setLocker(prev => ({
          ...prev,
          rentalInfo: prev.rentalInfo ? { ...prev.rentalInfo, isLocked: true } : undefined,
        }))
      }
    } catch (e) {
      console.error('Lock toggle failed:', e)
    }
    setLoading(false)
  }

  const handleEndSession = () => {
    removeSession(locker.id)
    onSessionEnd()
  }

  const handleShare = () => {
    if (!shareInput.trim()) return
    // In production: backend sends SMS/email with a signed URL containing a share token
    setShareSent(true)
    setTimeout(() => {
      setShareSent(false)
      setShowShare(false)
      setShareInput('')
    }, 2000)
  }

  const handleSaveContact = () => {
    updateSessionContact(locker.id, {
      phone: phoneInput || undefined,
      email: emailInput || undefined,
    })
    setEditContact(false)
  }

  // Calculate overstay charge for display
  const currentOverstayCharge = isExpired
    ? Math.ceil(overstayMinutes / 30) * OVERSTAY_PER_30MIN
    : 0
  const extensionCost = extendHours * PRICE_PER_HOUR
  const totalExtendCost = extensionCost + currentOverstayCharge

  const handleExtend = async () => {
    if (!session) return
    setExtending(true)
    try {
      const result = await gantnerApi.extendRental(locker.id, session.sessionToken, extendHours)
      // Update session cookie with new expiry
      extendSession(locker.id, result.locker.rentalInfo!.endTime)
      setLocker(result.locker)
      setExtendSuccess(true)
      setIsExpired(false)
      setOverstayMinutes(0)
      setTimeout(() => setExtendSuccess(false), 2500)
    } catch (e) {
      console.error('Extend failed:', e)
    }
    setExtending(false)
  }

  const isLocked = locker.rentalInfo?.isLocked

  if (loading) {
    return <Spinner text={isLocked ? t('control.unlocking') : t('control.locking')} />
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-semibold">{t('control.locker')} {locker.id}</h2>
        <div className={`flex items-center justify-center gap-2 text-sm mt-1 ${isExpired ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
          {isExpired ? <AlertTriangle className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
          <span>{isExpired ? `${t('control.expired')} · ${overstayMinutes} ${t('control.overstay.min')}` : timeLeft}</span>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <button
            onClick={handleToggleLock}
            className={`w-full py-12 flex flex-col items-center justify-center gap-4 transition-all active:scale-[0.97] ${
              isLocked
                ? 'bg-ocean text-white'
                : 'bg-success/10 text-success'
            }`}
          >
            {isLocked ? (
              <>
                <Lock className="h-16 w-16" />
                <span className="text-xl font-semibold">{t('control.locked')}</span>
                <span className="text-sm opacity-75">{t('control.tapUnlock')}</span>
              </>
            ) : (
              <>
                <Unlock className="h-16 w-16" />
                <span className="text-xl font-semibold">{t('control.unlocked')}</span>
                <span className="text-sm opacity-75">{t('control.tapLock')}</span>
              </>
            )}
          </button>
        </CardContent>
      </Card>

      {/* Overstay warning */}
      {isExpired && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-destructive">{t('control.overstay.title')}</p>
                <p className="text-sm text-muted-foreground">
                  {overstayMinutes} {t('control.overstay.min')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('control.overstay.charge')}: <span className="font-semibold text-destructive">{currentOverstayCharge} DKK</span>
                  {' '}({t('control.overstay.perBlock')})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extend time dial */}
      <Card className={isExpired ? 'border-warning/50 bg-warning/5' : ''}>
        <CardContent className="p-4 space-y-3">
          {isExpired && (
            <p className="text-xs font-medium text-warning">{t('control.overstay.extendNow')}</p>
          )}
          {!isExpired && (
            <p className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-4 w-4 text-ocean" />
              {t('control.extend.title')}
            </p>
          )}

          {/* Hour stepper */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setExtendHours(h => Math.max(1, h - 1))}
              className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
              disabled={extendHours <= 1}
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="text-center min-w-[100px]">
              <p className="text-3xl font-bold text-ocean">+{extendHours}</p>
              <p className="text-xs text-muted-foreground">
                {extendHours === 1 ? t('control.extend.hour') : t('control.extend.hours')}
              </p>
            </div>
            <button
              onClick={() => setExtendHours(h => Math.min(8, h + 1))}
              className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
              disabled={extendHours >= 8}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Cost breakdown */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('control.extend.cost')} (+{extendHours}h)</span>
              <span className="font-medium">{extensionCost} DKK</span>
            </div>
            {currentOverstayCharge > 0 && (
              <div className="flex justify-between text-destructive">
                <span>{t('control.extend.overstay')} ({overstayMinutes} min)</span>
                <span className="font-medium">{currentOverstayCharge} DKK</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 font-semibold">
              <span>{t('control.extend.total')}</span>
              <span className="text-ocean">{totalExtendCost} DKK</span>
            </div>
          </div>

          {/* Extend button */}
          {extendSuccess ? (
            <div className="flex items-center justify-center gap-2 py-2.5 text-success font-medium">
              <Check className="h-5 w-5" />
              {t('control.extend.success')}
            </div>
          ) : (
            <Button
              variant="ocean"
              className="w-full"
              onClick={handleExtend}
              disabled={extending}
            >
              {extending ? (
                <>{t('control.extend.processing')}</>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {t('control.extend.button')} · {totalExtendCost} DKK
                </>
              )}
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            {t('control.extend.pspNote')}
          </p>
        </CardContent>
      </Card>

      {/* Rental details + contact info */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t('control.rentedAt')}
            </span>
            <span className="font-medium">
              {locker.rentalInfo?.startTime
                ? new Date(locker.rentalInfo.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t('control.expiresAt')}
            </span>
            <span className="font-medium">
              {locker.rentalInfo?.endTime
                ? new Date(locker.rentalInfo.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '-'}
            </span>
          </div>

          {/* Contact details */}
          {(session?.phone || session?.email) && !editContact && (
            <div className="border-t pt-2 mt-2 space-y-1">
              {session?.phone && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {t('control.phone')}
                  </span>
                  <span className="font-medium">{session.phone}</span>
                </div>
              )}
              {session?.email && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {t('control.email')}
                  </span>
                  <span className="font-medium text-xs">{session.email}</span>
                </div>
              )}
              <button onClick={() => setEditContact(true)} className="text-[10px] text-ocean hover:underline">{t('control.edit')}</button>
            </div>
          )}

          {/* Add/edit contact */}
          {(editContact || (!session?.phone && !session?.email)) && (
            <div className="border-t pt-2 mt-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                {session?.phone || session?.email ? t('control.updateContact') : t('control.addContact')}
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="+45 12345678"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="h-9 pl-8 text-xs"
                    inputMode="tel"
                  />
                </div>
                <div className="relative flex-1">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="h-9 pl-8 text-xs"
                    type="email"
                  />
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={handleSaveContact}>
                {t('control.save')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share locker access */}
      <Card>
        <CardContent className="p-4">
          {!showShare ? (
            <button
              onClick={() => setShowShare(true)}
              className="w-full flex items-center gap-3 text-left"
            >
              <div className="w-10 h-10 bg-ocean/10 rounded-lg flex items-center justify-center shrink-0">
                <Share2 className="h-5 w-5 text-ocean" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('control.share.title')}</p>
                <p className="text-xs text-muted-foreground">{t('control.share.desc')}</p>
              </div>
            </button>
          ) : shareSent ? (
            <div className="flex items-center gap-3 text-success">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center shrink-0">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('control.share.sent')}</p>
                <p className="text-xs text-muted-foreground">{t('control.share.sentDesc')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-ocean" />
                <p className="text-sm font-medium">{t('control.share.access')} {locker.id}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setShareMethod('sms'); setShareInput('') }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    shareMethod === 'sms' ? 'border-ocean bg-ocean/10 text-ocean' : 'border-border text-muted-foreground'
                  }`}
                >
                  <Phone className="h-3.5 w-3.5 mx-auto mb-0.5" />
                  SMS
                </button>
                <button
                  onClick={() => { setShareMethod('email'); setShareInput('') }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    shareMethod === 'email' ? 'border-ocean bg-ocean/10 text-ocean' : 'border-border text-muted-foreground'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5 mx-auto mb-0.5" />
                  Email
                </button>
              </div>

              <Input
                placeholder={shareMethod === 'sms' ? '+45 12345678' : 'their@email.com'}
                value={shareInput}
                onChange={(e) => setShareInput(e.target.value)}
                className="h-10 text-sm"
                inputMode={shareMethod === 'sms' ? 'tel' : 'email'}
                type={shareMethod === 'email' ? 'email' : 'tel'}
              />

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowShare(false)}>
                  {t('control.share.cancel')}
                </Button>
                <Button variant="ocean" size="sm" className="flex-1" onClick={handleShare} disabled={!shareInput.trim()}>
                  <Share2 className="h-3.5 w-3.5" />
                  {t('control.share.send')}
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground">
                {t('control.share.info')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        {t('control.hint')}
      </p>

      <div className="pt-4 border-t">
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={handleEndSession}>
          {t('control.endSession')}
        </Button>
      </div>
    </div>
  )
}
