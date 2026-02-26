import { useState } from 'react'
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector'
import { ArrowLeft } from 'lucide-react'

type PaymentMethod = 'card' | 'mobilepay' | 'applepay' | null

interface PaymentStepProps {
  lockerId: string
  durationLabel: string
  selectedPrice: number
  onBack: () => void
  onCardPaymentSelected: () => void
  onMobilePaySelected: () => void
}

export function PaymentStep({
  lockerId,
  durationLabel,
  selectedPrice,
  onBack,
  onCardPaymentSelected,
  onMobilePaySelected,
}: PaymentStepProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null)

  const handleMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method)
    if (method === 'card') {
      onCardPaymentSelected()
    }
  }

  return (
    <div className="space-y-4">
      {/* Compact header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <span className="text-sm text-gray-500">
          {lockerId} · {durationLabel} · <span className="font-semibold">{selectedPrice} DKK</span>
        </span>
      </div>

      {/* Payment methods - big icon cards */}
      <PaymentMethodSelector
        selectedMethod={paymentMethod}
        onSelectMethod={handleMethodSelect}
        onMobilePaySelected={onMobilePaySelected}
      />
    </div>
  )
}
