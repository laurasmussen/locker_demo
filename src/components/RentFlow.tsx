import { useState } from 'react'
import { gantnerApi, type Locker } from '@/lib/gantner-api'
import { saveSession, updateSessionContact } from '@/lib/session'
import { useLanguage } from '@/lib/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/Spinner'
import { CardScanner } from '@/components/CardScanner'
import { MobilePayFlow } from '@/components/MobilePayFlow'
import {
  Check,
  Clock,
  CreditCard,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Camera,
  Smartphone,
  Mail,
  Phone,
  Shield,
  Receipt,
  ExternalLink,
  QrCode,
} from 'lucide-react'

type Step = 'duration' | 'payment' | 'processing' | 'confirmed' | 'mobilepay'

type PaymentMethod = 'card' | 'mobilepay' | 'applepay' | null

const DURATION_OPTIONS = [
  { hours: 1, labelKey: 'duration.1hour', price: 20 },
  { hours: 2, labelKey: 'duration.2hours', price: 30 },
  { hours: 4, labelKey: 'duration.4hours', price: 40 },
  { hours: 8, labelKey: 'duration.allday', price: 50 },
]

const VAT_RATE = 0.25

function detectMobileWallet(): 'apple' | 'google' | null {
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod|macintosh/.test(ua) && 'ontouchend' in document) return 'apple'
  if (/android/.test(ua)) return 'google'
  return null
}

export function RentFlow({ locker, onComplete }: { locker: Locker; onComplete: (locker: Locker) => void }) {
  const { t } = useLanguage()
  const [step, setStep] = useState<Step>('duration')
  const [selectedDuration, setSelectedDuration] = useState<typeof DURATION_OPTIONS[number] | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null)
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [optionalPhone, setOptionalPhone] = useState('')
  const [optionalEmail, setOptionalEmail] = useState('')
  const [error, setError] = useState('')
  const [receiptData, setReceiptData] = useState<{ transactionId: string; timestamp: string } | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)

  const walletType = detectMobileWallet()

  const handleSelectDuration = (option: typeof DURATION_OPTIONS[number]) => {
    setSelectedDuration(option)
    setStep('payment')
  }

  const formatCardNumber = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 16)
    return nums.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const formatExpiry = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 4)
    if (nums.length >= 3) return nums.slice(0, 2) + '/' + nums.slice(2)
    return nums
  }

  const priceExVat = selectedDuration ? (selectedDuration.price / (1 + VAT_RATE)).toFixed(2) : '0'
  const vatAmount = selectedDuration ? (selectedDuration.price - parseFloat(priceExVat)).toFixed(2) : '0'

  const durationLabel = selectedDuration ? t(selectedDuration.labelKey) : ''

  const sizeLabel = t(`duration.size.${locker.size}`)

  const completeRental = async () => {
    setStep('processing')
    try {
      const result = await gantnerApi.rentLocker(locker.id, selectedDuration!.hours)
      saveSession(locker.id, result.sessionToken, result.locker.rentalInfo!.endTime, {
        phone: optionalPhone || undefined,
        email: optionalEmail || undefined,
      })
      const txId = 'TXN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
      setReceiptData({ transactionId: txId, timestamp: new Date().toISOString() })
      await new Promise(r => setTimeout(r, 600))
      setStep('confirmed')
    } catch {
      setError(t('payment.card.error.failed'))
      setStep('payment')
    }
  }

  const handlePay = async () => {
    if (cardNumber.replace(/\s/g, '').length < 16) {
      setError(t('payment.card.error.number'))
      return
    }
    if (cardExpiry.length < 5) {
      setError(t('payment.card.error.expiry'))
      return
    }
    if (cardCvc.length < 3) {
      setError(t('payment.card.error.cvc'))
      return
    }
    setError('')
    await completeRental()
  }

  const handleMobilePayApproved = async () => {
    await completeRental()
  }

  // ── STEP: MOBILEPAY ──
  if (step === 'mobilepay') {
    return (
      <MobilePayFlow
        amount={selectedDuration?.price ?? 0}
        onApproved={handleMobilePayApproved}
        onCancel={() => setStep('payment')}
      />
    )
  }

  // ── STEP: DURATION ──
  if (step === 'duration') {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-ocean/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="h-8 w-8 text-ocean" />
          </div>
          <h2 className="text-xl font-semibold">{t('duration.title')} {locker.id}</h2>
          <p className="text-sm text-muted-foreground capitalize">{sizeLabel} &middot; {t('duration.zone')} {locker.zone}</p>
          <p className="text-sm text-success font-medium mt-1">{t('duration.available')}</p>
        </div>

        <h3 className="text-base font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t('duration.question')}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.hours}
              onClick={() => handleSelectDuration(option)}
              className="flex flex-col items-center p-4 rounded-xl border-2 border-border bg-white hover:border-ocean hover:bg-ocean-light/30 transition-all active:scale-[0.97]"
            >
              <span className="text-lg font-semibold">{t(option.labelKey)}</span>
              <span className="text-2xl font-bold text-ocean mt-1">{option.price} DKK</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">{t('duration.vat')}</span>
            </button>
          ))}
        </div>

        {/* How it works */}
        <div className="border-t pt-4 mt-2">
          <p className="text-xs text-muted-foreground text-center mb-3">{t('duration.howItWorks')}</p>
          <div className="flex items-start justify-between gap-2">
            {[
              { icon: QrCode, title: t('home.step1.title'), desc: t('duration.step.scan'), color: 'bg-ocean/10 text-ocean' },
              { icon: CreditCard, title: t('home.step2.title'), desc: t('duration.step.pay'), color: 'bg-success/10 text-success' },
              { icon: Unlock, title: t('home.step3.title'), desc: t('duration.step.use'), color: 'bg-warning/10 text-warning' },
            ].map((s, i) => (
              <div key={s.title} className="flex-1 flex flex-col items-center text-center relative">
                {i < 2 && (
                  <div className="absolute top-4 left-[calc(50%+16px)] w-[calc(100%-32px)] h-[2px] bg-border z-0">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] border-l-border" />
                  </div>
                )}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <p className="text-[11px] font-medium mt-1">{s.title}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── STEP: PAYMENT ──
  if (step === 'payment') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <button onClick={() => setStep('duration')} className="hover:text-foreground transition-colors">&larr; {t('payment.back')}</button>
          <span>&middot;</span>
          <span>{t('duration.title')} {locker.id} &middot; {durationLabel}</span>
        </div>

        {/* Order summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between text-sm">
              <span>{t('payment.rental')} ({durationLabel})</span>
              <span>{priceExVat} DKK</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t('payment.vat')}</span>
              <span>{vatAmount} DKK</span>
            </div>
            <div className="flex justify-between font-semibold text-base mt-2 pt-2 border-t">
              <span>{t('payment.total')}</span>
              <span>{selectedDuration?.price} DKK</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment methods */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t('payment.selectMethod')}</h3>

          {/* Credit Card */}
          <Card
            className={`cursor-pointer transition-all overflow-hidden ${
              paymentMethod === 'card' ? 'ring-2 ring-ocean' : ''
            }`}
          >
            <button
              onClick={() => setPaymentMethod(paymentMethod === 'card' ? null : 'card')}
              className="w-full p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ocean/10 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-ocean" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">{t('payment.card.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('payment.card.subtitle')}</p>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${paymentMethod === 'card' ? 'rotate-180' : ''}`} />
            </button>

            {/* Expanded card form */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                paymentMethod === 'card' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-4 pb-4 space-y-3 border-t">
                <div className="pt-3">
                  <label className="text-xs text-muted-foreground mb-1 block">{t('payment.card.number')}</label>
                  <div className="relative">
                    <Input
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="text-lg tracking-wider font-mono h-12 pr-12"
                      inputMode="numeric"
                      autoComplete="cc-number"
                    />
                    <button
                      onClick={() => setShowScanner(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-muted transition-colors"
                      title="Scan card with camera"
                    >
                      <Camera className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Camera className="h-3 w-3" /> {t('payment.card.scanHint')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t('payment.card.expiry')}</label>
                    <Input
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      className="h-12 font-mono"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">CVC</label>
                    <Input
                      placeholder="123"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="h-12 font-mono"
                      inputMode="numeric"
                      type="password"
                      autoComplete="cc-csc"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-ocean/5 rounded-lg p-2.5">
                  <Shield className="h-4 w-4 text-ocean mt-0.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {t('payment.card.security')}
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-destructive font-medium">{error}</p>
                )}

                <Button variant="ocean" size="xl" className="w-full" onClick={handlePay}>
                  {t('payment.pay')} {selectedDuration?.price} DKK
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </Card>

          {/* MobilePay */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              paymentMethod === 'mobilepay' ? 'ring-2 ring-[#5A78FF]' : ''
            }`}
            onClick={() => {
              setPaymentMethod('mobilepay')
              setStep('mobilepay')
            }}
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#5A78FF]/10 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-[#5A78FF]" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t('payment.mobilepay.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('payment.mobilepay.subtitle')}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>

          {/* Apple Pay / Google Pay */}
          <Card className="opacity-50 cursor-not-allowed">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black/5 rounded-lg flex items-center justify-center">
                  <span className="text-base font-semibold">
                    {walletType === 'apple' ? '' : walletType === 'google' ? 'G' : '/G'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {walletType === 'apple' ? t('payment.applepay') : walletType === 'google' ? t('payment.googlepay') : t('payment.appleorgoogle')}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('payment.comingSoon')}</p>
                </div>
              </div>
              <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Soon</span>
            </div>
          </Card>
        </div>

        {/* Optional: phone or email for session recovery */}
        <Card className="border-ocean/20 bg-ocean/5">
          <CardContent className="p-4 space-y-2.5">
            <div>
              <h3 className="text-sm font-medium">{t('payment.remember.title')}</h3>
              <p className="text-[11px] text-muted-foreground">
                {t('payment.remember.desc')}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="+45 12345678"
                  value={optionalPhone}
                  onChange={(e) => setOptionalPhone(e.target.value)}
                  className="h-10 pl-10 text-sm"
                  inputMode="tel"
                />
              </div>
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="email"
                  value={optionalEmail}
                  onChange={(e) => setOptionalEmail(e.target.value)}
                  className="h-10 pl-10 text-sm"
                  type="email"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card scanner overlay */}
        {showScanner && (
          <CardScanner
            onScan={(card) => {
              setCardNumber(card.number)
              setCardExpiry(card.expiry)
              setCardCvc(card.cvc)
              setShowScanner(false)
            }}
            onClose={() => setShowScanner(false)}
          />
        )}

        {/* Legal footer */}
        <div className="border-t pt-3 space-y-2">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {t('payment.legal')}{' '}
            <button className="underline hover:text-foreground">{t('payment.terms')}</button>{' '}
            {t('payment.and')}{' '}
            <button className="underline hover:text-foreground">{t('payment.privacy')}</button>.
            {' '}{t('payment.withdrawal')}
          </p>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {t('payment.secure')}</span>
            <span className="flex items-center gap-1"><Receipt className="h-3 w-3" /> {t('payment.receipt')}</span>
          </div>
        </div>
      </div>
    )
  }

  // ── STEP: PROCESSING ──
  if (step === 'processing') {
    return <Spinner text={t('payment.processing')} />
  }

  // ── STEP: CONFIRMED ──
  if (step === 'confirmed') {
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-10 w-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold">{t('confirmed.title')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('duration.title')} <span className="font-mono font-semibold">{locker.id}</span> {t('confirmed.desc')} {durationLabel}.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('confirmed.unlocked')}
          </p>
        </div>

        {/* Digital receipt (collapsible) */}
        <Card>
          <CardContent className="p-0">
            <button
              onClick={() => setShowReceipt(!showReceipt)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                {t('confirmed.receipt')}
              </h3>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showReceipt ? 'rotate-180' : ''}`} />
            </button>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                showReceipt ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-4 pb-4 space-y-2 border-t">
                <div className="text-xs space-y-1 text-muted-foreground pt-3">
                  <div className="flex justify-between"><span>{t('confirmed.txId')}</span><span className="font-mono">{receiptData?.transactionId}</span></div>
                  <div className="flex justify-between"><span>{t('confirmed.date')}</span><span>{receiptData?.timestamp ? new Date(receiptData.timestamp).toLocaleString() : ''}</span></div>
                  <div className="flex justify-between"><span>{t('confirmed.locker')}</span><span>{locker.id} ({locker.size}, {t('duration.zone')} {locker.zone})</span></div>
                  <div className="flex justify-between"><span>{t('confirmed.duration')}</span><span>{durationLabel}</span></div>
                  <div className="flex justify-between"><span>{t('confirmed.subtotal')}</span><span>{priceExVat} DKK</span></div>
                  <div className="flex justify-between"><span>{t('confirmed.vat')}</span><span>{vatAmount} DKK</span></div>
                  <div className="flex justify-between font-semibold text-foreground pt-1 border-t"><span>{t('confirmed.total')}</span><span>{selectedDuration?.price} DKK</span></div>
                </div>
                <div className="border-t pt-2 mt-2 text-[10px] text-muted-foreground space-y-0.5">
                  <p className="font-medium text-foreground">Den Blaa Planet A/S</p>
                  <p>Jacob Fortlingsvej 1, 2770 Kastrup, Denmark</p>
                  <p>CVR: 12345678 &middot; VAT: DK12345678</p>
                  <p>info@denblaaplanet.dk &middot; +45 44 22 22 44</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optional account - post payment */}
        <Card className="border-ocean/20 bg-ocean/5">
          <CardContent className="p-4 space-y-3">
            <div>
              <h3 className="text-sm font-medium">{t('confirmed.security.title')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('confirmed.security.desc')}
              </p>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="+45 12345678"
                  value={optionalPhone}
                  onChange={(e) => setOptionalPhone(e.target.value)}
                  className="h-10 pl-10 text-sm"
                  inputMode="tel"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="your@email.com"
                  value={optionalEmail}
                  onChange={(e) => setOptionalEmail(e.target.value)}
                  className="h-10 pl-10 text-sm"
                  type="email"
                />
              </div>
              {(optionalPhone || optionalEmail) && (
                contactSaved ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-success text-sm font-medium">
                    <Check className="h-4 w-4" />
                    {t('confirmed.saved')}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      updateSessionContact(locker.id, {
                        phone: optionalPhone || undefined,
                        email: optionalEmail || undefined,
                      })
                      setContactSaved(true)
                      setTimeout(() => setContactSaved(false), 2500)
                    }}
                  >
                    {t('confirmed.save')}
                  </Button>
                )
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {t('confirmed.reminder')}{' '}
              <button className="underline">{t('payment.privacy')}</button> {t('confirmed.gdpr')}
            </p>
          </CardContent>
        </Card>

        <Button
          variant="ocean"
          size="xl"
          className="w-full"
          onClick={() => onComplete({ ...locker, status: 'rented' })}
        >
          {t('confirmed.goToLocker')}
          <ExternalLink className="h-5 w-5" />
        </Button>

        <p className="text-[10px] text-center text-muted-foreground">
          {t('confirmed.scanHint')}
        </p>
      </div>
    )
  }

  return null
}
