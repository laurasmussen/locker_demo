import { useState } from 'react'
import { updateSessionContact } from '@/lib/session'
import { useLanguage } from '@/lib/language-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Check, Receipt, ChevronDown, Phone, Mail, ExternalLink } from 'lucide-react'

interface ConfirmedStepProps {
  lockerId: string
  lockerSize: string
  lockerZone: string
  durationLabel: string
  selectedPrice: number
  priceExVat: string
  vatAmount: string
  receiptData: { transactionId: string; timestamp: string } | null
  onComplete: () => void
}

export function ConfirmedStep({
  lockerId,
  lockerSize,
  lockerZone,
  durationLabel,
  selectedPrice,
  priceExVat,
  vatAmount,
  receiptData,
  onComplete,
}: ConfirmedStepProps) {
  const { t } = useLanguage()
  const [optionalPhone, setOptionalPhone] = useState('')
  const [optionalEmail, setOptionalEmail] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)

  const handleSaveContact = () => {
    updateSessionContact(lockerId, { 
      phone: optionalPhone || undefined, 
      email: optionalEmail || undefined 
    })
    setContactSaved(true)
    setTimeout(() => setContactSaved(false), 2500)
  }

  return (
    <div className="space-y-5">
      <div className="text-center py-4">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-gray-200">
          <Check className="h-10 w-10 text-gray-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">{t('confirmed.title')}</h2>
        <p className="text-gray-500 mt-1">
          {t('duration.title')} <span className="font-mono font-semibold">{lockerId}</span> {t('confirmed.desc')} {durationLabel}.
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
                <div className="flex justify-between"><span>{t('confirmed.locker')}</span><span>{lockerId} ({lockerSize}, {t('duration.zone')} {lockerZone})</span></div>
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
                <Button variant="outline" size="sm" className="w-full" onClick={handleSaveContact}>
                  {t('confirmed.save')}
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <button
        onClick={onComplete}
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
