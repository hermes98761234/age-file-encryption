import { describe, expect, it } from 'vitest'
import { decryptBytes, encryptBytes, generateKeyPair, identityFile, isArmored, isIdentity, isRecipient, parseIdentity, parseRecipients } from './age'

const enc = (s: string) => new TextEncoder().encode(s)
const dec = (b: Uint8Array) => new TextDecoder().decode(b)

describe('age', () => {
  it('generates well-formed keys', async () => {
    const k = await generateKeyPair()
    expect(isRecipient(k.recipient)).toBe(true)
    expect(isIdentity(k.identity)).toBe(true)
    expect(k.recipient).toMatch(/^age1/)
  })
  it('round-trips with recipients, binary and armored', async () => {
    const k = await generateKeyPair()
    const data = enc('hello age')
    const bin = await encryptBytes(data, { mode: 'recipients', recipients: [k.recipient], armor: false })
    expect(dec(bin.subarray(0, 21))).toBe('age-encryption.org/v1')
    expect(isArmored(bin)).toBe(false)
    expect(dec(await decryptBytes(bin, { identity: k.identity }))).toBe('hello age')
    const arm = await encryptBytes(data, { mode: 'recipients', recipients: [k.recipient], armor: true })
    expect(isArmored(arm)).toBe(true)
    expect(dec(arm)).toContain('-----END AGE ENCRYPTED FILE-----')
    expect(dec(await decryptBytes(arm, { identity: k.identity }))).toBe('hello age')
  })
  it('round-trips with a passphrase and rejects a wrong one', async () => {
    const out = await encryptBytes(enc('secret'), { mode: 'passphrase', passphrase: 'correct horse', armor: true, logN: 10 })
    expect(dec(await decryptBytes(out, { passphrase: 'correct horse' }))).toBe('secret')
    await expect(decryptBytes(out, { passphrase: 'wrong' })).rejects.toThrow()
  })
  it('rejects the wrong identity', async () => {
    const a = await generateKeyPair()
    const b = await generateKeyPair()
    const out = await encryptBytes(enc('x'), { mode: 'recipients', recipients: [a.recipient], armor: false })
    await expect(decryptBytes(out, { identity: b.identity })).rejects.toThrow()
  })
  it('parses recipients and identity files', async () => {
    const k = await generateKeyPair()
    const r = parseRecipients(`# comment\n${k.recipient}, nonsense\n`)
    expect(r.ok).toEqual([k.recipient])
    expect(r.bad).toEqual(['nonsense'])
    expect(parseIdentity(identityFile(k))).toBe(k.identity)
    expect(parseIdentity('nothing')).toBeNull()
  })
  it('validates a known recipient', () => {
    expect(isRecipient('age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p')).toBe(true)
    expect(isRecipient('age1short')).toBe(false)
  })
})
