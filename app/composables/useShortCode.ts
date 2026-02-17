export function useShortCode() {
  function toShortCode(value: string | undefined | null, prefix: string) {
    const id = String(value || '').trim()
    if (!id) return '-'
    if (id.length <= 8) return `${prefix}-${id.toUpperCase()}`
    return `${prefix}-${id.slice(-8).toUpperCase()}`
  }

  return {
    toShortCode
  }
}
