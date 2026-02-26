import { useState } from 'react'
import { gantnerApi, type Locker } from '@/lib/gantner-api'
import { saveSession } from '@/lib/session'
import { DurationDial } from '@/components/DurationDial'
import { PaymentStep } from '@/components/PaymentStep'
import { CardPaymentForm } from '@/components/CardPaymentForm'
import { ProcessingStep } from '@/components/ProcessingStep'
import { ConfirmedStep } from '@/components/ConfirmedStep'
import { MobilePayFlow } from '@/components/MobilePayFlow'

type Step = 'duration' | 'payment' | 'cardpayment' | 'processing' | 'confirmed' | 'mobilepay'

const VAT_RATE = 0.25

export function RentFlow({ locker, onComplete }: { locker: Locker; onComplete: (locker: Locker) => void }) {
  const [step, setStep] = useState<Step>('duration')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [selectedMinutes, setSelectedMinutes] = useState(60)
  const [selectedPrice, setSelectedPrice] = useState(20)
  const [receiptData, setReceiptData] = useState<{ transactionId: string; timestamp: string } | null>(null)

  const priceExVat = (selectedPrice / (1 + VAT_RATE)).toFixed(2)
  const vatAmount = (selectedPrice - parseFloat(priceExVat)).toFixed(2)

  const durationLabel = selectedMinutes >= 60
    ? `${Math.floor(selectedMinutes / 60)}h${selectedMinutes % 60 > 0 ? ` ${selectedMinutes % 60}m` : ''}`
    : `${selectedMinutes}m`

  const sizeLabel = locker.size === 'small' ? 'Small' : locker.size === 'medium' ? 'Medium' : 'Large'

  const transitionToStep = (newStep: Step) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setStep(newStep)
      setIsTransitioning(false)
    }, 300)
  }

  const completeRental = async () => {
    setStep('processing')
    try {
      const hours = selectedMinutes / 60
      const result = await gantnerApi.rentLocker(locker.id, hours)
      saveSession(locker.id, result.sessionToken, result.locker.rentalInfo!.endTime, {})
      const txId = 'TXN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
      setReceiptData({ transactionId: txId, timestamp: new Date().toISOString() })
      await new Promise(r => setTimeout(r, 600))
      setStep('confirmed')
    } catch {
      setStep('payment')
    }
  }

  // ── STEP: DURATION (Dial) ──
  if (step === 'duration') {
    return (
      <div className={`flex flex-col h-[calc(100vh-120px)] pt-16 transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
        {/* Locker info */}
        <div className="text-center mb-10">
          <div className="inline-block px-6 py-3 rounded-xl border-6 border-black mb-4">
            <h2 className="text-4xl font-bold text-gray-800">{locker.id}</h2>
          </div>
        </div>

        {/* Duration Dial */}
        <div className="flex-1 flex flex-col">
          <DurationDial
            onContinue={(minutes, price) => {
              setSelectedMinutes(minutes)
              setSelectedPrice(price)
              transitionToStep('payment')
            }}
          />
        </div>
      </div>
    )
  }

  // ── STEP: PAYMENT ──
  if (step === 'payment') {
    return (
      <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
        <PaymentStep
          lockerId={locker.id}
          durationLabel={durationLabel}
          selectedPrice={selectedPrice}
          onBack={() => transitionToStep('duration')}
          onCardPaymentSelected={() => transitionToStep('cardpayment')}
          onMobilePaySelected={() => transitionToStep('mobilepay')}
        />
      </div>
    )
  }

  // ── STEP: CARD PAYMENT ──
  if (step === 'cardpayment') {
    return (
      <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
        <CardPaymentForm
          selectedPrice={selectedPrice}
          priceExVat={priceExVat}
          vatAmount={vatAmount}
          onBack={() => transitionToStep('payment')}
          onPaymentComplete={completeRental}
        />
      </div>
    )
  }

  // ── STEP: PROCESSING ──
  if (step === 'processing') {
    return (
      <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
        <ProcessingStep />
      </div>
    )
  }

  // ── STEP: CONFIRMED ──
  if (step === 'confirmed') {
    return (
      <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
        <ConfirmedStep
          lockerId={locker.id}
          lockerSize={sizeLabel}
          lockerZone={locker.zone}
          durationLabel={durationLabel}
          selectedPrice={selectedPrice}
          priceExVat={priceExVat}
          vatAmount={vatAmount}
          receiptData={receiptData}
          onComplete={() => onComplete({ ...locker, status: 'rented' })}
        />
      </div>
    )
  }

  // ── STEP: MOBILEPAY ──
  if (step === 'mobilepay') {
    return (
      <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
        <MobilePayFlow
          amount={selectedPrice}
          onApproved={completeRental}
          onCancel={() => transitionToStep('payment')}
        />
      </div>
    )
  }

  return null
}
