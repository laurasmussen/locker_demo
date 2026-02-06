import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { gantnerApi } from '@/lib/gantner-api'
import { useState } from 'react'

export function TestLanding() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleTestScan = async () => {
    setLoading(true)
    // Simulate scan by finding a random available locker
    const lockers = await gantnerApi.getAllLockers()
    const available = lockers.filter(l => l.status === 'available')
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)]
      navigate(`/locker/${random.id}`)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean/5 to-ocean/10">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold text-gray-900">Test Landing</h1>
        <Button
          onClick={handleTestScan}
          size="xl"
          variant="ocean"
          className="text-lg px-8 py-6"
          disabled={loading}
        >
          {loading ? 'Scanning...' : 'Test Scan'}
        </Button>
      </div>
    </div>
  )
}

