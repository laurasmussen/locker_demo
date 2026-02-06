import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from '@/lib/language-context'
import { TestLanding } from '@/pages/TestLanding'
import { HomePage } from '@/pages/HomePage'
import { LockerPage } from '@/pages/LockerPage'
import { AdminPage } from '@/pages/AdminPage'
import { DemoPage } from '@/pages/DemoPage'

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<TestLanding />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/locker/:lockerId" element={<LockerPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
