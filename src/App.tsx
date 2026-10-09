import { useRef, useState } from 'react'
import { CopyButton, Shell, Tabs, download, usePersisted, usePrefs } from './kit'
import { UK } from './uk'
import { decryptBytes, encryptBytes, formatSize, generateKeyPair, identityFile, parseIdentity, parseRecipients, type KeyPair } from './lib/age'

type Tab = 'encrypt' | 'decrypt' | 'keys'
type Src = 'text' | 'file'
interface Input { src: Src; text: string; file: File | null }
interface Out { bytes: Uint8Array; name: string; isText: boolean; msg: string }

const REPO = 'age-file-encryption'

export default function App() {
  const { prefs, setPrefs, t } = usePrefs(UK)
  const [tab, setTab] = useState<Tab>('encrypt')
  const [s, setS] = usePersisted('age-settings', { mode: 'passphrase', armor: true })
  const [pass, setPass] = useState('correct horse battery staple')
  const [rec, setRec] = useState('')
  const [id, setId] = useState('')
  const [input, setInput] = useState<Input>({ src: 'text', text: 'Hello from age!', file: null })
  const [out, setOut] = useState<Out | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [key, setKey] = useState<KeyPair | null>(null)

  const parsed = parseRecipients(rec)

  async function getBytes(): Promise<{ bytes: Uint8Array; name: string }> {
    if (input.src === 'file' && input.file) return { bytes: new Uint8Array(await input.file.arrayBuffer()), name: input.file.name }
    return { bytes: new TextEncoder().encode(input.text), name: 'note.txt' }
  }

  async function run(kind: 'enc' | 'dec') {
    setBusy(true); setErr(''); setOut(null)
    await new Promise((r) => setTimeout(r, 20))
    try {
      const { bytes, name } = await getBytes()
      if (kind === 'enc') {
        if (s.mode === 'recipients' && parsed.bad.length) throw new Error(t('Invalid recipient: {0}', parsed.bad[0]))
        const res = await encryptBytes(bytes, s.mode === 'passphrase' ? { mode: 'passphrase', passphrase: pass, armor: s.armor } : { mode: 'recipients', recipients: parsed.ok, armor: s.armor })
        setOut({ bytes: res, name: name + '.age', isText: s.armor, msg: t('Encrypted {0} → {1}', formatSize(bytes.length), formatSize(res.length)) })
      } else {
        const identity = s.mode === 'passphrase' ? undefined : (parseIdentity(id) ?? id.trim())
        const res = await decryptBytes(bytes, s.mode === 'passphrase' ? { passphrase: pass } : { identity })
        let isText = true
        try { new TextDecoder('utf-8', { fatal: true }).decode(res) } catch { isText = false }
        setOut({ bytes: res, name: name.replace(/\.age$/i, '') || 'decrypted', isText, msg: t('Decrypted {0} → {1}', formatSize(bytes.length), formatSize(res.length)) })
      }
    } catch (e) {
      setErr(t('Error: {0}', e instanceof Error ? e.message : String(e)))
    }
    setBusy(false)
  }

  async function gen() { setKey(await generateKeyPair()) }
  const fileRef = useRef<HTMLInputElement>(null)
  const dec = tab === 'decrypt'

  const inputBox = (
    <div className="box">
      <h2>{t('Input')}</h2>
      <Tabs<Src> value={input.src} onChange={(src) => setInput({ ...input, src })} items={[['text', t('Text')], ['file', t('File')]]} />
      <div style={{ height: 8 }} />
      {input.src === 'text' ? (
        <textarea className="mono" style={{ width: '100%', minHeight: 140 }} value={input.text} placeholder={t('Type or paste text here')} onChange={(e) => setInput({ ...input, text: e.target.value })} />
      ) : (
        <div className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setInput({ ...input, file: f }) }}>
          <button onClick={() => fileRef.current?.click()}>{t('Choose a file or drop it here')}</button>
          <input ref={fileRef} type="file" hidden onChange={(e) => setInput({ ...input, file: e.target.files?.[0] ?? null })} />
          {input.file && <p className="hint">{t('Selected: {0} ({1})', input.file.name, formatSize(input.file.size))}</p>}
        </div>
      )}
    </div>
  )

  const optBox = (
    <div className="box">
      <h2>{dec ? t('Decrypt') : t('Encrypt')}</h2>
      <div className="field">
        <label>{t('Mode')}</label>
        <select value={s.mode} onChange={(e) => setS({ ...s, mode: e.target.value })}>
          <option value="passphrase">{t('Passphrase')}</option>
          <option value="recipients">{dec ? t('Secret key (AGE-SECRET-KEY-1…)') : t('Recipients (public keys)')}</option>
        </select>
      </div>
      {s.mode === 'passphrase' ? (
        <div className="field">
          <label>{t('Passphrase')}</label>
          <input type="password" value={pass} autoComplete="off" onChange={(e) => setPass(e.target.value)} />
          <p className="hint">{t('Passphrase mode uses scrypt (work factor 18); it is slow on purpose.')}</p>
        </div>
      ) : dec ? (
        <div className="field">
          <label>{t('Secret key (AGE-SECRET-KEY-1…)')}</label>
          <textarea className="mono" rows={3} value={id} onChange={(e) => setId(e.target.value)} />
          <label className="hint">{t('Or load an identity file')}</label>
          <input type="file" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setId(await f.text()) }} />
        </div>
      ) : (
        <div className="field">
          <label>{t('Recipients (public keys)')}</label>
          <textarea className="mono" rows={3} value={rec} placeholder="age1…" onChange={(e) => setRec(e.target.value)} />
          <p className="hint">{t('One or more age1… public keys, separated by spaces or lines.')}</p>
          {parsed.bad.length > 0 && <p className="err-text">{t('Invalid recipient: {0}', parsed.bad[0])}</p>}
        </div>
      )}
      {!dec && (
        <label className="inline"><input type="checkbox" checked={s.armor} onChange={(e) => setS({ ...s, armor: e.target.checked })} /> {t('ASCII armor (text output)')}</label>
      )}
      <div className="row" style={{ marginTop: 8 }}>
        <button className="primary" disabled={busy} onClick={() => void run(dec ? 'dec' : 'enc')}>{busy ? t('Working…') : dec ? t('Decrypt now') : t('Encrypt now')}</button>
      </div>
    </div>
  )

  const text = out && out.isText ? new TextDecoder().decode(out.bytes) : ''
  const resultBox = (
    <div className="box">
      <h2>{t('Result')}</h2>
      {err && <p className="err-text" role="alert">{err}</p>}
      {!out && !err && <p className="hint">{t('No input yet.')}</p>}
      {out && (
        <>
          <p className="ok-text">{out.msg}</p>
          {out.isText ? <pre>{text}</pre> : <p className="hint">{t('Decrypted data is not valid text; download it instead.')}</p>}
          <div className="row">
            <button onClick={() => download(out.name, out.bytes as BlobPart)}>{t('Download')} {out.name}</button>
            {out.isText && <CopyButton text={text} t={t} />}
          </div>
        </>
      )}
    </div>
  )

  return (
    <Shell title={t('Age File Encryption')} tagline={t('Encrypt and decrypt files with the age format. Everything stays in your browser.')} repo={REPO} note={t('Files never leave your device. Keep secret keys and passphrases safe: there is no recovery.')} t={t} prefs={prefs} setPrefs={setPrefs}>
      <Tabs<Tab> value={tab} onChange={(k) => { setTab(k); setOut(null); setErr('') }} items={[['encrypt', t('Encrypt')], ['decrypt', t('Decrypt')], ['keys', t('Keys')]]} />
      {tab === 'keys' ? (
        <div className="box">
          <h2>{t('Keys')}</h2>
          <div className="row"><button className="primary" onClick={() => void gen()}>{t('Generate key pair')}</button></div>
          {key && (
            <>
              <div className="field"><label>{t('Public key (recipient): share this')}</label><pre>{key.recipient}</pre>
                <div className="row"><CopyButton text={key.recipient} t={t} /><button className="small" onClick={() => { setRec(key.recipient); setS({ ...s, mode: 'recipients' }); setTab('encrypt') }}>{t('Use as recipient')}</button></div></div>
              <div className="field"><label>{t('Secret key: keep private')}</label><pre>{key.identity}</pre>
                <div className="row"><CopyButton text={key.identity} t={t} /><button className="small" onClick={() => { setId(key.identity); setS({ ...s, mode: 'recipients' }); setTab('decrypt') }}>{t('Use for decryption')}</button>
                  <button className="small" onClick={() => download('age-key.txt', identityFile(key), 'text/plain')}>{t('Download key file')}</button></div></div>
            </>
          )}
        </div>
      ) : (
        <div className="cols">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{inputBox}{optBox}</div>
          {resultBox}
        </div>
      )}
    </Shell>
  )
}
