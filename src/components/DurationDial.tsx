import { useState, useRef, useCallback, useMemo } from 'react'
import { useLanguage } from '@/lib/language-context'

// Pricing tiers: price in DKK for given minutes
function getPrice(minutes: number): number {
  if (minutes === 0) return 0
  const hours = minutes / 60
  if (hours <= 1) return 20
  if (hours <= 2) return 30
  if (hours <= 3) return 35
  if (hours <= 4) return 40
  if (hours <= 6) return 45
  return 50 // all day (up to 8h)
}

const MIN_MINUTES = 0
const MAX_MINUTES = 480 // 8 hours

interface DurationDialProps {
  onContinue: (minutes: number, price: number) => void
}

function formatClock(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function DurationDial({ onContinue }: DurationDialProps) {
  const { t } = useLanguage()
  const [minutes, setMinutes] = useState(0)
  const svgRef = useRef<SVGSVGElement>(null)
  const isDragging = useRef(false)
  const lastAngle = useRef<number>(0)
  const rotations = useRef<number>(0) // Start at 0 rotations

  const price = getPrice(minutes)
  const now = useMemo(() => new Date(), [])
  const endTime = new Date(now.getTime() + minutes * 60 * 1000)

  // Dark blue colors adding red per hour - blue to purple progression
  const blueColors = [
    '#1e3a8a', // Dark blue (0-1h)
    '#2e3a8a', // Dark blue with slight red (1-2h)
    '#3e3a8a', // Blue-violet (2-3h)
    '#4e3a8a', // Violet (3-4h)
    '#5e3a8a', // Purple (4-5h)
    '#6e3a8a', // More purple (5-6h)
    '#7e3a8a', // Deep purple (6-7h)
    '#8e3a8a', // Magenta-purple (7-8h)
  ]
  
  const currentRotation = Math.floor(minutes / 60)
  const dialColor = blueColors[Math.min(currentRotation, blueColors.length - 1)]

  // SVG dial params
  const size = 240
  const center = size / 2
  const radius = 96
  const strokeWidth = 32

  // Full circle = 60 minutes (1 hour)
  // Calculate total angle based on minutes
  const totalAngle = (minutes / 60) * 360
  const displayAngle = totalAngle % 360 // Angle to show on dial (0-360)
  const circumference = 2 * Math.PI * radius

  // Arc for the filled portion - keep full if >= 60 minutes
  const isFullOrMore = minutes >= 60
  const filledLength = isFullOrMore ? circumference : (displayAngle / 360) * circumference
  const dashOffset = circumference - filledLength

  // Handle position on the ring
  const handleAngleRad = ((displayAngle - 90) * Math.PI) / 180
  const handleX = center + radius * Math.cos(handleAngleRad)
  const handleY = center + radius * Math.sin(handleAngleRad)

  const angleToMinutes = useCallback((clientX: number, clientY: number, currentMinutes: number): number => {
    if (!svgRef.current) return currentMinutes
    const rect = svgRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy

    // Angle from top (12 o'clock)
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI
    if (deg < 0) deg += 360

    // Detect crossing from 360 to 0 or 0 to 360
    const prevAngle = lastAngle.current
    if (isDragging.current) {
      // Crossed from high to low (clockwise past 0)
      if (prevAngle > 270 && deg < 90) {
        rotations.current++
      }
      // Crossed from low to high (counter-clockwise past 0)
      else if (prevAngle < 90 && deg > 270) {
        // Only decrease if we're not already at 0 minutes
        if (rotations.current > 0) {
          rotations.current--
        } else {
          // Already at 0 rotations, stay at 0
          deg = 0
        }
      }
    }
    lastAngle.current = deg

    // Calculate total minutes: full rotations + current angle
    const fullRotationMinutes = Math.floor(rotations.current) * 60
    const partialMinutes = (deg / 360) * 60
    const totalMinutes = fullRotationMinutes + partialMinutes

    // Snap to 1-min increments and enforce limits
    const snapped = Math.round(totalMinutes)
    const result = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, snapped))
    
    // If we ended up at 0, make sure rotations is also 0
    if (result === 0) {
      rotations.current = 0
    }
    
    return result
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true
    // Initialize lastAngle and rotations based on current minutes
    const currentRotations = Math.floor(minutes / 60)
    const currentAngleDeg = ((minutes % 60) / 60) * 360
    lastAngle.current = currentAngleDeg
    rotations.current = currentRotations
    
    const newMins = angleToMinutes(e.clientX, e.clientY, minutes)
    setMinutes(newMins)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [angleToMinutes, minutes])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    const newMins = angleToMinutes(e.clientX, e.clientY, minutes)
    setMinutes(newMins)
  }, [angleToMinutes, minutes])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Duration label in H:MM format
  const durationText = minutes === 0 
    ? '0:00'
    : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center justify-between h-full pb-8">
      <div className="flex flex-col items-center flex-1 justify-start mt-4">

      {/* Explanation */}
      <div className="text-center mb-8">
        <h3 className="text-3xl text-gray-500 italic">Drej for at vælge tid...</h3>
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
            stroke="#d1d5db"
            strokeWidth={strokeWidth}
          />
          {/* Outer border */}
          <circle
            cx={center}
            cy={center}
            r={radius + strokeWidth / 2}
            fill="none"
            stroke="#d1d5db"
            strokeWidth={2}
          />
          {/* Inner border */}
          <circle
            cx={center}
            cy={center}
            r={radius - strokeWidth / 2}
            fill="none"
            stroke="#d1d5db"
            strokeWidth={2}
          />

          {/* Filled arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={dialColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${center} ${center})`}
            className="transition-all duration-75"
          />

          {/* Minute tick marks */}
          {Array.from({ length: 60 }, (_, i) => {
            const tickDeg = (i / 60) * 360
            const tickRad = ((tickDeg - 90) * Math.PI) / 180
            const outerR = radius + strokeWidth / 2 - 1
            const innerR = outerR - (i % 5 === 0 ? 8 : 6)
            const x1 = center + innerR * Math.cos(tickRad)
            const y1 = center + innerR * Math.sin(tickRad)
            const x2 = center + outerR * Math.cos(tickRad)
            const y2 = center + outerR * Math.sin(tickRad)
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#9ca3af"
                strokeWidth={i % 5 === 0 ? 1.5 : 1}
                opacity={1}
              />
            )
          })}

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

          {/* Hour tick marks around outside - show 15/30/45 min marks */}
          {[15, 30, 45].map((min) => {
            const tickDeg = (min / 60) * 360
            const tickRad = ((tickDeg - 90) * Math.PI) / 180
            const outerR = radius + strokeWidth / 2 + 6
            const tx = center + outerR * Math.cos(tickRad)
            const ty = center + outerR * Math.sin(tickRad)
            return (
              <text
                key={min}
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-gray-300 select-none pointer-events-none"
                fontSize="10"
                fontFamily="monospace"
              >
                {min}
              </text>
            )
          })}
        </svg>

        {/* Center content - end time */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-gray-400 mb-0.5">{t('control.expiresAt')}</span>
          <span className="text-4xl font-bold text-gray-800 font-mono tracking-tight">{formatClock(endTime)}</span>
          <span className="text-lg font-semibold text-gray-400 mt-0.5">{durationText}</span>
        </div>
      </div>

      </div>

      {/* Continue button at bottom */}
      <button
        onClick={() => onContinue(minutes, price)}
        disabled={minutes === 0}
        className="w-full max-w-[400px] py-4 rounded-xl bg-green-600 text-white font-semibold text-lg hover:bg-green-700 active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
      >
        {t('payment.pay')} {price} DKK →
      </button>
    </div>
  )
}

export { getPrice }
