export type Lang = 'en' | 'uk'
export type T = (s: string, ...args: (string | number)[]) => string

/** Marks a string for translation where it is defined away from its t() call. */
export const N = (s: string) => s

export function tr(uk: Record<string, string>, lang: Lang, s: string, ...args: (string | number)[]): string {
  const src = lang === 'uk' ? (uk[s] ?? s) : s
  return src.replace(/\{(\d+)\}/g, (_, i: string) => String(args[+i]))
}
