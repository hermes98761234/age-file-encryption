import { Decrypter, Encrypter, armor, generateIdentity, identityToRecipient } from 'age-encryption'

export interface KeyPair { identity: string; recipient: string }

export async function generateKeyPair(): Promise<KeyPair> {
  const identity = await generateIdentity()
  return { identity, recipient: await identityToRecipient(identity) }
}

const RECIPIENT_RE = /^age1[02-9ac-hj-np-z]{58}$/
const IDENTITY_RE = /^AGE-SECRET-KEY-1[02-9AC-HJ-NP-Z]{58}$/

export const isRecipient = (s: string) => RECIPIENT_RE.test(s.trim()) || /^age1(pq|tag|tagpq)1[02-9ac-hj-np-z]+$/.test(s.trim())
export const isIdentity = (s: string) => IDENTITY_RE.test(s.trim()) || /^AGE-SECRET-KEY-PQ-1[02-9AC-HJ-NP-Z]+$/.test(s.trim())

/** Splits free text into recipient strings (whitespace/comma separated, # comments ignored). */
export function parseRecipients(text: string): { ok: string[]; bad: string[] } {
  const ok: string[] = []
  const bad: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const l = line.replace(/#.*$/, '')
    for (const tok of l.split(/[\s,]+/).filter(Boolean)) (isRecipient(tok) ? ok : bad).push(tok)
  }
  return { ok, bad }
}

/** Extracts the first AGE-SECRET-KEY from an identity file (comments allowed). */
export function parseIdentity(text: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    const l = line.trim()
    if (l && !l.startsWith('#') && isIdentity(l)) return l
  }
  return null
}

export type EncryptOpts =
  | { mode: 'passphrase'; passphrase: string; armor: boolean; logN?: number }
  | { mode: 'recipients'; recipients: string[]; armor: boolean }

export async function encryptBytes(data: Uint8Array, o: EncryptOpts): Promise<Uint8Array> {
  const e = new Encrypter()
  if (o.mode === 'passphrase') {
    if (!o.passphrase) throw new Error('Passphrase is empty')
    if (o.logN) e.setScryptWorkFactor(o.logN)
    e.setPassphrase(o.passphrase)
  } else {
    if (o.recipients.length === 0) throw new Error('No recipients')
    for (const r of o.recipients) e.addRecipient(r)
  }
  const bin = await e.encrypt(data)
  return o.armor ? new TextEncoder().encode(armor.encode(bin)) : bin
}

export const isArmored = (data: Uint8Array) =>
  new TextDecoder().decode(data.subarray(0, 40)).startsWith('-----BEGIN AGE ENCRYPTED FILE-----')

export async function decryptBytes(data: Uint8Array, o: { passphrase?: string; identity?: string }): Promise<Uint8Array> {
  const d = new Decrypter()
  if (o.passphrase) d.addPassphrase(o.passphrase)
  if (o.identity) d.addIdentity(o.identity.trim())
  if (!o.passphrase && !o.identity) throw new Error('Provide a passphrase or a secret key')
  const bin = isArmored(data) ? armor.decode(new TextDecoder().decode(data)) : data
  return d.decrypt(bin)
}

export function formatSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`
  return `${(n / 1024 / 1024).toFixed(2)} MiB`
}

/** Identity file as written by `age-keygen`. */
export function identityFile(k: KeyPair, now = new Date()): string {
  return `# created: ${now.toISOString()}\n# public key: ${k.recipient}\n${k.identity}\n`
}
