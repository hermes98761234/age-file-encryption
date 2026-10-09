import { describe, expect, it } from 'vitest'
import { tr } from './i18n'
import { UK } from './uk'

const ph = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort().join()

describe('i18n', () => {
  it('keeps placeholders in every translation', () => {
    for (const [en, uk] of Object.entries(UK)) expect(ph(uk), en).toBe(ph(en))
  })
  it('translates and interpolates', () => {
    const [en, uk] = Object.entries(UK).find(([k]) => k.includes('{0}') && !k.includes('{1}')) ?? ['x {0}', 'y {0}']
    expect(tr(UK, 'uk', en, 5)).toBe(uk.replace('{0}', '5'))
    expect(tr(UK, 'en', en, 5)).toBe(en.replace('{0}', '5'))
  })
  it('falls back to English for unknown strings', () => {
    expect(tr(UK, 'uk', 'no such string')).toBe('no such string')
  })
})
