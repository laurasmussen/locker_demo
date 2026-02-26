import { useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CardScanner, type ScannedCard } from '@/components/CardScanner'
import { ChevronDown, Camera, Shield, Receipt, ArrowLeft } from 'lucide-react'

interface CardPaymentFormProps {
  selectedPrice: number
  priceExVat: string
  vatAmount: string
  onBack: () => void
  onPaymentComplete: () => Promise<void>
}

export function CardPaymentForm({
  selectedPrice,
  priceExVat,
  vatAmount,
  onBack,
  onPaymentComplete,
}: CardPaymentFormProps) {
  const { t } = useLanguage()
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false)
  const [processing, setProcessing] = useState(false)

  const formatCardNumber = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 16)
    return nums.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const formatExpiry = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 4)
    if (nums.length >= 3) return nums.slice(0, 2) + '/' + nums.slice(2)
    return nums
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

    setProcessing(true)
    setError('')
    try {
      await onPaymentComplete()
    } catch {
      setError(t('payment.card.error.failed'))
      setProcessing(false)
    }
  }

  const handleScan = (card: ScannedCard) => {
    setCardNumber(card.number)
    setCardExpiry(card.expiry)
    setCardCvc(card.cvc)
    setShowScanner(false)
  }

  return (
    <>
      <div className="space-y-4">
        {/* Back button */}
        <button onClick={onBack} className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>

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
              <label className="text-xs text-gray-400 mb-1 block">{t('payment.card.cvc')}</label>
              <Input
                placeholder="123"
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="h-12 font-mono"
                inputMode="numeric"
                autoComplete="cc-csc"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            variant="ocean"
            size="lg"
            className="w-full"
            onClick={handlePay}
            disabled={processing}
          >
            {processing ? t('payment.processing') : `${t('payment.pay')} ${selectedPrice} DKK`}
          </Button>
        </CardContent>
      </Card>

      {/* Price breakdown (collapsible) */}
      <Card className="border-gray-200">
        <CardContent className="p-0">
          <button
            onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
            className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="text-xs text-gray-500">{t('payment.breakdown')}</span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showPriceBreakdown ? 'rotate-180' : ''}`} />
          </button>
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              showPriceBreakdown ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-3 pb-3 text-xs space-y-1 text-gray-400 border-t pt-2">
              <div className="flex justify-between"><span>{t('payment.subtotal')}</span><span>{priceExVat} DKK</span></div>
              <div className="flex justify-between"><span>{t('payment.vat')}</span><span>{vatAmount} DKK</span></div>
              <div className="flex justify-between font-semibold text-gray-700 pt-1 border-t"><span>{t('payment.total')}</span><span>{selectedPrice} DKK</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-[10px] text-gray-400 mt-1">
        <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {t('payment.secure')}</span>
        <span className="flex items-center gap-1"><Receipt className="h-3 w-3" /> {t('payment.receipt')}</span>
      </div>
      </div>

      {showScanner && <CardScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </>
  )
}
