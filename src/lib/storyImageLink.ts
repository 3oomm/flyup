import { isValidHttpUrl } from './validation'

export const getSafeStoryImageHref = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null
  const href = value.trim()
  return isValidHttpUrl(href) ? href : null
}
