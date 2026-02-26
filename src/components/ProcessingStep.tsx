import { Spinner } from '@/components/Spinner'
import { useLanguage } from '@/lib/language-context'

export function ProcessingStep() {
  const { t } = useLanguage()
  return <Spinner text={t('payment.processing')} />
}
