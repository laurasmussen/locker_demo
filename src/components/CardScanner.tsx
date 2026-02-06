import { useEffect, useRef, useState } from 'react'
import { X, CreditCard, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ScannedCard {
  number: string
  expiry: string
  cvc: string
}

interface CardScannerProps {
  onScan: (card: ScannedCard) => void
  onClose: () => void
}

export function CardScanner({ onScan, onClose }: CardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'reading_front' | 'flip' | 'reading_back' | 'done'>('idle')

  useEffect(() => {
    let stream: MediaStream | null = null

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setCameraReady(true)
        }
      } catch {
        setCameraError(true)
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const handleSimulateScan = () => {
    setScanning(true)
    setPhase('reading_front')

    // Phase 1: Read card number + expiry from front (1.5s)
    setTimeout(() => {
      setPhase('flip')

      // Phase 2: Ask to flip card (1.2s)
      setTimeout(() => {
        setPhase('reading_back')

        // Phase 3: Read CVC from back (1s)
        setTimeout(() => {
          setPhase('done')

          // Return all data
          setTimeout(() => {
            onScan({
              number: '4242 4242 4242 4242',
              expiry: '12/28',
              cvc: '123',
            })
          }, 600)
        }, 1000)
      }, 1200)
    }, 1500)
  }

  const phaseLabel = {
    idle: '',
    reading_front: 'Reading card number...',
    flip: 'Now flip your card over',
    reading_back: 'Reading CVC...',
    done: 'All details captured!',
  }

  const detectedFields = {
    number: phase === 'reading_front' || phase === 'flip' || phase === 'reading_back' || phase === 'done',
    expiry: phase === 'flip' || phase === 'reading_back' || phase === 'done',
    cvc: phase === 'done',
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="text-white">
          <p className="font-semibold text-sm">Scan your card</p>
          <p className="text-xs text-white/70">
            {phase === 'idle' ? 'Hold your card within the frame' : phaseLabel[phase]}
          </p>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <X className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white text-center p-6 gap-4">
            <CreditCard className="h-16 w-16 text-white/30" />
            <div>
              <p className="font-semibold">Camera not available</p>
              <p className="text-sm text-white/70 mt-1">
                Camera access was denied or is not available on this device.
                You can still enter your card number manually.
              </p>
            </div>
            <p className="text-xs text-white/40 mt-4 leading-relaxed max-w-xs">
              In production, this would use the PSP's SDK (e.g. Stripe CardScan) which handles camera capture, OCR, and PCI-compliant tokenization. Card data never touches our servers.
            </p>
            <Button variant="outline" className="mt-4 text-white border-white/30" onClick={onClose}>
              Enter manually
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Dimmed area around the card frame */}
              <div className="absolute inset-0 bg-black/40" />

              {/* Card-shaped cutout */}
              <div className={`relative z-10 w-[320px] h-[200px] rounded-2xl border-2 transition-all duration-500 ${
                phase === 'done' ? 'border-green-400 bg-green-400/10'
                : phase === 'flip' ? 'border-blue-400 bg-blue-400/5'
                : scanning ? 'border-yellow-400'
                : 'border-white'
              }`}>
                {/* Corner markers */}
                <div className="absolute -top-[2px] -left-[2px] w-8 h-8 border-t-4 border-l-4 rounded-tl-2xl border-white" />
                <div className="absolute -top-[2px] -right-[2px] w-8 h-8 border-t-4 border-r-4 rounded-tr-2xl border-white" />
                <div className="absolute -bottom-[2px] -left-[2px] w-8 h-8 border-b-4 border-l-4 rounded-bl-2xl border-white" />
                <div className="absolute -bottom-[2px] -right-[2px] w-8 h-8 border-b-4 border-r-4 rounded-br-2xl border-white" />

                {/* Scanning line animation */}
                {(phase === 'reading_front' || phase === 'reading_back') && (
                  <div className="absolute inset-x-4 h-0.5 bg-yellow-400/80 animate-scan rounded-full" />
                )}

                {/* Card icon placeholder */}
                {!scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
                    <CreditCard className="h-10 w-10 mb-2" />
                    <p className="text-xs">Position card here</p>
                  </div>
                )}

                {/* Flip card prompt */}
                {phase === 'flip' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-14 h-14 bg-blue-400 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-2xl">&#x21BB;</span>
                    </div>
                    <p className="text-blue-400 font-semibold text-sm mt-2">Flip card over</p>
                    <p className="text-white/50 text-xs mt-1">We need to read the CVC</p>
                  </div>
                )}

                {/* Done state */}
                {phase === 'done' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-14 h-14 bg-green-400 rounded-full flex items-center justify-center">
                      <Check className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-green-400 font-semibold text-sm mt-2">Card captured!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Detected fields indicator */}
            {scanning && (
              <div className="absolute bottom-28 left-0 right-0 z-20 flex justify-center gap-3 px-6">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  detectedFields.number ? 'bg-green-400/20 text-green-400' : 'bg-white/10 text-white/40'
                }`}>
                  {detectedFields.number ? <Check className="h-3 w-3" /> : <span className="w-3 h-3 rounded-full border border-white/30" />}
                  Number
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  detectedFields.expiry ? 'bg-green-400/20 text-green-400' : 'bg-white/10 text-white/40'
                }`}>
                  {detectedFields.expiry ? <Check className="h-3 w-3" /> : <span className="w-3 h-3 rounded-full border border-white/30" />}
                  Expiry
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  detectedFields.cvc ? 'bg-green-400/20 text-green-400' : 'bg-white/10 text-white/40'
                }`}>
                  {detectedFields.cvc ? <Check className="h-3 w-3" /> : <span className="w-3 h-3 rounded-full border border-white/30" />}
                  CVC
                </div>
              </div>
            )}

            {/* Scanning line CSS */}
            <style>{`
              @keyframes scan {
                0% { top: 8px; }
                50% { top: calc(100% - 8px); }
                100% { top: 8px; }
              }
              .animate-scan {
                animation: scan 1.5s ease-in-out infinite;
                position: absolute;
              }
            `}</style>
          </>
        )}
      </div>

      {/* Bottom area */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/80 to-transparent">
        {cameraReady && !cameraError && phase === 'idle' && (
          <div className="text-center space-y-3">
            <Button
              variant="ocean"
              size="xl"
              className="w-full"
              onClick={handleSimulateScan}
            >
              Simulate card scan
            </Button>
            <p className="text-xs text-white/50">
              Demo: tap to simulate. In production, detection is automatic via OCR.
            </p>
          </div>
        )}
        {scanning && phase !== 'done' && (
          <p className="text-sm text-center text-yellow-400 animate-pulse">{phaseLabel[phase]}</p>
        )}
        {!cameraReady && !cameraError && (
          <p className="text-sm text-white/50 text-center animate-pulse">Starting camera...</p>
        )}
      </div>
    </div>
  )
}
