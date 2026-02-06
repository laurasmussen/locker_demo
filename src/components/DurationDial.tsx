import { useState, useRef, useCallback, useMemo } from 'react'
import { useLanguage } from '@/lib/language-context'

// Pricing tiers: price in DKK for given minutes
function getPrice(minutes: number): number {
  const hours = minutes / 60
  if (hours <= 1) return 20
  if (hours <= 2) return 30
  if (hours <= 3) return 35
  if (hours <= 4) return 40
  if (hours <= 6) return 45
  return 50 // all day (up to 8h)
}

const MIN_MINUTES = 30
const MAX_MINUTES = 480 // 8 hours

interface DurationDialProps {
  onContinue: (minutes: number, price: number) => void
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function DurationDial({ onContinue }: DurationDialProps) {
  const { t } = useLanguage()
  const [minutes, setMinutes] = useState(60)
  const svgRef = useRef<SVGSVGElement>(null)
  const isDragging = useRef(false)

  const price = getPrice(minutes)
  const now = useMemo(() => new Date(), [])
  const endTime = new Date(now.getTime() + minutes * 60 * 1000)

  // SVG dial params
  const size = 240
  const center = size / 2
  const radius = 96
  const strokeWidth = 16

  // Dial: arc fills from top (12 o'clock) clockwise
  const fraction = minutes / MAX_MINUTES
  const angle = fraction * 330 // max ~330° to leave gap
  const circumference = 2 * Math.PI * radius

  // Arc for the filled portion (starts at top = -90°)
  const filledLength = (angle / 360) * circumference
  const dashOffset = circumference - filledLength

  // Handle position on the ring
  const handleAngleRad = ((angle - 90) * Math.PI) / 180
  const handleX = center + radius * Math.cos(handleAngleRad)
  const handleY = center + radius * Math.sin(handleAngleRad)

  const angleToMinutes = useCallback((clientX: number, clientY: number): number => {
    if (!svgRef.current) return minutes
    const rect = svgRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy

    // Angle from top (12 o'clock)
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI
    if (deg < 0) deg += 360

    // Map 0-330° to minutes
    const clamped = Math.min(330, Math.max(0, deg))
    const rawMinutes = (clamped / 330) * MAX_MINUTES

    // Snap to 30-min increments
    return Math.max(MIN_MINUTES, Math.round(rawMinutes / 30) * 30)
  }, [minutes])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true
    const newMins = angleToMinutes(e.clientX, e.clientY)
    setMinutes(Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, newMins)))
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [angleToMinutes])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    const newMins = angleToMinutes(e.clientX, e.clientY)
    setMinutes(Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, newMins)))
  }, [angleToMinutes])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const increment = () => setMinutes(m => Math.min(MAX_MINUTES, m + 30))
  const decrement = () => setMinutes(m => Math.max(MIN_MINUTES, m - 30))

  // Duration label
  const durationText = minutes < 60
    ? `${minutes} min`
    : minutes % 60 === 0
      ? `${minutes / 60}h`
      : `${Math.floor(minutes / 60)}h ${minutes % 60}m`

  return (
    <div className="flex flex-col items-center">
      {/* Current time label above dial */}
      <div className="text-center mb-1">
        <span className="text-xs text-gray-400 uppercase tracking-wider">now</span>
        <p className="text-sm font-mono text-gray-500">{formatClock(now)}</p>
      </div>

      {/* SVG Dial */}
      <div className="relative">
        <svg
          ref={svgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />

          {/* Filled arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#9ca3af"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${center} ${center})`}
            className="transition-all duration-75"
          />

          {/* Start marker at 12 o'clock */}
          <circle
            cx={center}
            cy={center - radius}
            r={4}
            fill="#6b7280"
          />

          {/* Handle */}
          <circle
            cx={handleX}
            cy={handleY}
            r={14}
            fill="white"
            stroke="#4b5563"
            strokeWidth={3}
            className="cursor-grab active:cursor-grabbing"
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' }}
          />
          {/* Inner dot on handle */}
          <circle
            cx={handleX}
            cy={handleY}
            r={4}
            fill="#6b7280"
          />

          {/* Hour tick marks around outside */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => {
            const tickFrac = (h * 60) / MAX_MINUTES
            const tickDeg = tickFrac * 330
            const tickRad = ((tickDeg - 90) * Math.PI) / 180
            const outerR = radius + strokeWidth / 2 + 6
            const tx = center + outerR * Math.cos(tickRad)
            const ty = center + outerR * Math.sin(tickRad)
            return (
              <text
                key={h}
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-gray-300 select-none pointer-events-none"
                fontSize="10"
                fontFamily="monospace"
              >
                {h}h
              </text>
            )
          })}
        </svg>

        {/* Center content - end time */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-gray-400 mb-0.5">{t('control.expiresAt')}</span>
          <span className="text-4xl font-bold text-gray-800 font-mono tracking-tight">{formatClock(endTime)}</span>
          <span className="text-lg font-semibold text-gray-400 mt-0.5">+{durationText}</span>
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={() => onContinue(minutes, price)}
        className="mt-5 w-full max-w-[300px] py-3.5 rounded-xl bg-green-600 text-white font-semibold text-base hover:bg-green-700 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
      >
        {t('payment.pay')} {price} DKK →
      </button>
    </div>
  )
}

export { getPrice }
