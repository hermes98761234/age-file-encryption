import { useEffect, useState, type ReactNode } from 'react'
import { tr, type Lang, type T } from './i18n'

export type Theme = 'auto' | 'light' | 'dark'
export interface Prefs { lang: Lang; theme: Theme }

const KEY = 'prefs-v1'

function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>
    return {
      lang: p.lang === 'uk' || p.lang === 'en' ? p.lang : navigator.language.toLowerCase().startsWith('uk') ? 'uk' : 'en',
      theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : 'auto',
    }
  } catch {
    return { lang: 'en', theme: 'auto' }
  }
}

/** Persisted language/theme plus the translator bound to the app's dictionary. */
export function usePrefs(uk: Record<string, string>) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch { /* private mode */ }
    const root = document.documentElement
    if (prefs.theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = prefs.theme
    root.lang = prefs.lang
  }, [prefs])
  const t: T = (s, ...a) => tr(uk, prefs.lang, s, ...a)
  return { prefs, setPrefs, t }
}

/** Generic persisted state in localStorage (JSON). */
export function usePersisted<S>(key: string, init: S): [S, (v: S | ((p: S) => S)) => void] {
  const [v, setV] = useState<S>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? ({ ...init, ...(JSON.parse(raw) as object) } as S) : init
    } catch { return init }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* ignore */ } }, [key, v])
  return [v, setV]
}

export function Shell(props: {
  title: string; tagline: string; repo: string; note: string; t: T
  prefs: Prefs; setPrefs: (p: Prefs) => void; children: ReactNode
}) {
  const { t, prefs, setPrefs } = props
  return (
    <div className="app">
      <header className="toolbar">
        <span className="brand">{props.title}</span>
        <span className="hint tagline">{props.tagline}</span>
        <span className="spacer" />
        <label className="inline">
          {t('Theme')}{' '}
          <select value={prefs.theme} onChange={(e) => setPrefs({ ...prefs, theme: e.target.value as Theme })}>
            <option value="auto">{t('System')}</option>
            <option value="light">{t('Light')}</option>
            <option value="dark">{t('Dark')}</option>
          </select>
        </label>
        <label className="inline">
          {t('Language')}{' '}
          <select value={prefs.lang} onChange={(e) => setPrefs({ ...prefs, lang: e.target.value as Lang })}>
            <option value="en">English</option>
            <option value="uk">Українська</option>
          </select>
        </label>
      </header>
      <main className="page">{props.children}</main>
      <p className="hint foot">
        {props.note}{' '}
        <a href={`https://github.com/hermes98761234/${props.repo}`}>{t('Source on GitHub')}</a>
      </p>
    </div>
  )
}

export function download(name: string, data: BlobPart, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function CopyButton({ text, t, label }: { text: string; t: T; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="small"
      disabled={!text}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1200) })
      }}
    >
      {done ? t('Copied') : (label ?? t('Copy'))}
    </button>
  )
}

export function Tabs<K extends string>({ value, onChange, items }: { value: K; onChange: (k: K) => void; items: [K, string][] }) {
  return (
    <div className="tabs" role="tablist">
      {items.map(([k, label]) => (
        <button key={k} role="tab" aria-selected={value === k} className={value === k ? 'tab on' : 'tab'} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  )
}

export const COMMON_UK: Record<string, string> = {
  Theme: 'Тема', System: 'Системна', Light: 'Світла', Dark: 'Темна', Language: 'Мова',
  'Source on GitHub': 'Код на GitHub', Copy: 'Копіювати', Copied: 'Скопійовано', Download: 'Завантажити', Clear: 'Очистити',
}
