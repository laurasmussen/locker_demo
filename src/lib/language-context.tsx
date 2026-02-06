import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, type Language } from './translations'

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'dk',
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('blaaplanet_lang')
    return (saved === 'en' || saved === 'dk') ? saved : 'dk'
  })

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('blaaplanet_lang', newLang)
  }

  const t = (key: string): string => {
    return translations[lang][key] ?? translations['en'][key] ?? key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
