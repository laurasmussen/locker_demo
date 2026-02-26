import { useLanguage } from '@/lib/language-context'
import { CreditCard } from 'lucide-react'
import mobilePayLogo from '@/assets/mobilepay.jpg'

type PaymentMethod = 'card' | 'mobilepay' | 'applepay' | null

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod
  onSelectMethod: (method: PaymentMethod) => void
  onMobilePaySelected: () => void
}

export function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  onMobilePaySelected,
}: PaymentMethodSelectorProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-gray-700 text-center">{t('payment.selectMethod')}</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Credit Card */}
        <button
          onClick={() => onSelectMethod(selectedMethod === 'card' ? null : 'card')}
          className={`flex flex-col items-center justify-center aspect-square rounded-xl border-2 transition-all active:scale-[0.97] ${
            selectedMethod === 'card'
              ? 'border-gray-600 bg-gray-50'
              : 'border-gray-200 bg-white hover:border-gray-400'
          }`}
        >
          <CreditCard className="h-20 w-20 text-gray-600 mb-3" />
          <span className="text-base font-medium text-gray-700">Kort</span>
        </button>

        {/* MobilePay */}
        <button
          onClick={() => {
            onSelectMethod('mobilepay')
            onMobilePaySelected()
          }}
          className="flex items-center justify-center aspect-square rounded-xl border-2 border-gray-200 bg-white hover:border-[#5A78FF] transition-all active:scale-[0.97]"
          style={{ padding: '5px' }}
        >
          <img src={mobilePayLogo} alt="MobilePay" className="w-full h-full object-contain" />
        </button>
      </div>
    </div>
  )
}
