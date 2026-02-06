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
import { DurationDial } from '@/components/DurationDial'
import {
  Check,
  CreditCard,
  Lock,
  ChevronRight,
  ChevronDown,
  Camera,
  Smartphone,
  Mail,
  Phone,
  Shield,
  Receipt,
  ExternalLink,
} from 'lucide-react'

type Step = 'duration' | 'payment' | 'processing' | 'confirmed' | 'mobilepay'

type PaymentMethod = 'card' | 'mobilepay' | 'applepay' | null

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
  const [selectedMinutes, setSelectedMinutes] = useState(60)
  const [selectedPrice, setSelectedPrice] = useState(20)
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
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)

  const walletType = detectMobileWallet()

  const formatCardNumber = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 16)
    return nums.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const formatExpiry = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 4)
    if (nums.length >= 3) return nums.slice(0, 2) + '/' + nums.slice(2)
    return nums
  }

  const priceExVat = (selectedPrice / (1 + VAT_RATE)).toFixed(2)
  const vatAmount = (selectedPrice - parseFloat(priceExVat)).toFixed(2)

  const durationLabel = selectedMinutes >= 60
    ? `${Math.floor(selectedMinutes / 60)}h${selectedMinutes % 60 > 0 ? ` ${selectedMinutes % 60}m` : ''}`
    : `${selectedMinutes}m`

  const sizeLabel = t(`duration.size.${locker.size}`)

  const completeRental = async () => {
    setStep('processing')
    try {
      const hours = selectedMinutes / 60
      const result = await gantnerApi.rentLocker(locker.id, hours)
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
        amount={selectedPrice}
        onApproved={handleMobilePayApproved}
        onCancel={() => setStep('payment')}
      />
    )
  }

  // ── STEP: DURATION (Dial) ──
  if (step === 'duration') {
    return (
      <div className="space-y-4">
        {/* Locker info */}
        <div className="text-center mb-2">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-gray-200">
            <Lock className="h-7 w-7 text-gray-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">{t('duration.title')} {locker.id}</h2>
          <p className="text-sm text-gray-400 capitalize">{sizeLabel} · {t('duration.zone')} {locker.zone}</p>
          <p className="text-sm text-gray-500 font-medium mt-1">{t('duration.available')}</p>
        </div>

        {/* Duration Dial */}
        <DurationDial
          onContinue={(minutes, price) => {
            setSelectedMinutes(minutes)
            setSelectedPrice(price)
            setStep('payment')
          }}
        />
      </div>
    )
  }

  // ── STEP: PAYMENT (Simplified) ──
  if (step === 'payment') {
    return (
      <div className="space-y-4">
        {/* Compact header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setStep('duration')} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← {t('payment.back')}
          </button>
          <span className="text-sm text-gray-500">
            {locker.id} · {durationLabel} · <span className="font-semibold">{selectedPrice} DKK</span>
          </span>
        </div>

        {/* Payment methods - big icon cards */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-600">{t('payment.selectMethod')}</h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Credit Card */}
            <button
              onClick={() => setPaymentMethod(paymentMethod === 'card' ? null : 'card')}
              className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all active:scale-[0.97] ${
                paymentMethod === 'card'
                  ? 'border-gray-600 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-400'
              }`}
            >
              <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-2">
                <CreditCard className="h-7 w-7 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">{t('payment.card.title')}</span>
              <span className="text-[10px] text-gray-400">{t('payment.card.subtitle')}</span>
            </button>

            {/* MobilePay */}
            <button
              onClick={() => {
                setPaymentMethod('mobilepay')
                setStep('mobilepay')
              }}
              className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-gray-200 bg-white hover:border-[#5A78FF] transition-all active:scale-[0.97]"
            >
              <div className="w-14 h-14 bg-[#5A78FF]/10 rounded-xl flex items-center justify-center mb-2">
                <Smartphone className="h-7 w-7 text-[#5A78FF]" />
              </div>
              <span className="text-sm font-medium text-gray-700">{t('payment.mobilepay.title')}</span>
              <span className="text-[10px] text-gray-400">{t('payment.mobilepay.subtitle')}</span>
            </button>
          </div>

          {/* Apple Pay / Google Pay - smaller, greyed out */}
          <button className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 opacity-40 cursor-not-allowed">
            <span className="text-sm font-medium text-gray-400">
              {walletType === 'apple' ? t('payment.applepay') : walletType === 'google' ? t('payment.googlepay') : t('payment.appleorgoogle')}
            </span>
            <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{t('payment.comingSoon')}</span>
          </button>
        </div>

        {/* Card form - expands when card is selected */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            paymentMethod === 'card' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <Card className="border-gray-300">
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">{t('payment.card.number')}</label>
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <Camera className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">{t('payment.card.expiry')}</label>
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
                  <label className="text-xs text-gray-400 mb-1 block">CVC</label>
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

              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}

              <button
                onClick={handlePay}
                className="w-full py-3.5 rounded-xl bg-gray-700 text-white font-semibold text-base hover:bg-gray-800 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                {t('payment.pay')} {selectedPrice} DKK
                <ChevronRight className="h-5 w-5" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Price breakdown - collapsed */}
        <div className="border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
            className="w-full p-3 flex items-center justify-between text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Receipt className="h-3.5 w-3.5" />
              {t('payment.total')}: {selectedPrice} DKK
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showPriceBreakdown ? 'rotate-180' : ''}`} />
          </button>
          <div className={`transition-all duration-300 overflow-hidden ${showPriceBreakdown ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-3 pb-3 space-y-1 border-t text-xs text-gray-400">
              <div className="flex justify-between pt-2"><span>{t('payment.rental')} ({durationLabel})</span><span>{priceExVat} DKK</span></div>
              <div className="flex justify-between"><span>{t('payment.vat')}</span><span>{vatAmount} DKK</span></div>
              <div className="flex justify-between font-semibold text-gray-700 pt-1.5 border-t"><span>{t('payment.total')}</span><span>{selectedPrice} DKK</span></div>
            </div>
          </div>
        </div>

        {/* Remember me - compact */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
            <Input
              placeholder="+45 12345678"
              value={optionalPhone}
              onChange={(e) => setOptionalPhone(e.target.value)}
              className="h-9 pl-9 text-xs border-gray-200"
              inputMode="tel"
            />
          </div>
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
            <Input
              placeholder="email"
              value={optionalEmail}
              onChange={(e) => setOptionalEmail(e.target.value)}
              className="h-9 pl-9 text-xs border-gray-200"
              type="email"
            />
          </div>
        </div>

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
        <div className="border-t pt-3">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            {t('payment.legal')}{' '}
            <button className="underline">{t('payment.terms')}</button>{' '}
            {t('payment.and')}{' '}
            <button className="underline">{t('payment.privacy')}</button>.
          </p>
          <div className="flex items-center gap-4 text-[10px] text-gray-400 mt-1">
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
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-gray-200">
            <Check className="h-10 w-10 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{t('confirmed.title')}</h2>
          <p className="text-gray-500 mt-1">
            {t('duration.title')} <span className="font-mono font-semibold">{locker.id}</span> {t('confirmed.desc')} {durationLabel}.
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {t('confirmed.unlocked')}
          </p>
        </div>

        {/* Digital receipt (collapsible) */}
        <Card className="border-gray-200">
          <CardContent className="p-0">
            <button
              onClick={() => setShowReceipt(!showReceipt)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                {t('confirmed.receipt')}
              </h3>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showReceipt ? 'rotate-180' : ''}`} />
            </button>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                showReceipt ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-4 pb-4 space-y-2 border-t">
                <div className="text-xs space-y-1 text-gray-400 pt-3">
                  <div className="flex justify-between"><span>{t('confirmed.txId')}</span><span className="font-mono">{receiptData?.transactionId}</span></div>
                  <div className="flex justify-between"><span>{t('confirmed.date')}</span><span>{receiptData?.timestamp ? new Date(receiptData.timestamp).toLocaleString() : ''}</span></div>
                  <div className="flex justify-between"><span>{t('confirmed.locker')}</span><span>{locker.id} ({locker.size}, {t('duration.zone')} {locker.zone})</span></div>
                  <div className="flex justify-between"><span>{t('confirmed.duration')}</span><span>{durationLabel}</span></div>
                  <div className="flex justify-between"><span>{t('confirmed.subtotal')}</span><span>{priceExVat} DKK</span></div>
                  <div className="flex justify-between"><span>{t('confirmed.vat')}</span><span>{vatAmount} DKK</span></div>
                  <div className="flex justify-between font-semibold text-gray-700 pt-1 border-t"><span>{t('confirmed.total')}</span><span>{selectedPrice} DKK</span></div>
                </div>
                <div className="border-t pt-2 mt-2 text-[10px] text-gray-400 space-y-0.5">
                  <p className="font-medium text-gray-600">Den Blaa Planet A/S</p>
                  <p>Jacob Fortlingsvej 1, 2770 Kastrup, Denmark</p>
                  <p>CVR: 12345678 · VAT: DK12345678</p>
                  <p>info@denblaaplanet.dk · +45 44 22 22 44</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optional security */}
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4 space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700">{t('confirmed.security.title')}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{t('confirmed.security.desc')}</p>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <Input placeholder="+45 12345678" value={optionalPhone} onChange={(e) => setOptionalPhone(e.target.value)} className="h-10 pl-10 text-sm" inputMode="tel" />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <Input placeholder="your@email.com" value={optionalEmail} onChange={(e) => setOptionalEmail(e.target.value)} className="h-10 pl-10 text-sm" type="email" />
              </div>
              {(optionalPhone || optionalEmail) && (
                contactSaved ? (
                  <div className="flex items-center justify-center gap-2 py-2 text-gray-600 text-sm font-medium">
                    <Check className="h-4 w-4" />
                    {t('confirmed.saved')}
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => {
                    updateSessionContact(locker.id, { phone: optionalPhone || undefined, email: optionalEmail || undefined })
                    setContactSaved(true)
                    setTimeout(() => setContactSaved(false), 2500)
                  }}>
                    {t('confirmed.save')}
                  </Button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <button
          onClick={() => onComplete({ ...locker, status: 'rented' })}
          className="w-full py-3.5 rounded-xl bg-gray-700 text-white font-semibold text-base hover:bg-gray-800 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
        >
          {t('confirmed.goToLocker')}
          <ExternalLink className="h-5 w-5" />
        </button>

        <p className="text-[10px] text-center text-gray-400">
          {t('confirmed.scanHint')}
        </p>
      </div>
    )
  }

  return null
}
