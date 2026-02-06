import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/lib/language-context'

export function Layout({ children }: { children: ReactNode }) {
  const { lang, setLang, t } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-b from-ocean-light to-white">
      <header className="bg-ocean text-white px-4 py-3 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
              BP
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">{t('header.title')}</h1>
              <p className="text-xs text-white/70">{t('header.subtitle')}</p>
            </div>
          </Link>
          <div className="flex items-center gap-1 bg-white/10 rounded-full p-0.5">
            <button
              onClick={() => setLang('dk')}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                lang === 'dk' ? 'bg-white text-ocean' : 'text-white/70 hover:text-white'
              }`}
            >
              🇩🇰 DK
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                lang === 'en' ? 'bg-white text-ocean' : 'text-white/70 hover:text-white'
              }`}
            >
              🇬🇧 EN
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
