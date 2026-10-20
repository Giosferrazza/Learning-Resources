import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { levels, media, subjects } from '../../../shared/vocabulary'

// Shared building blocks in David's Resource Learning style.

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
const variants: Record<Variant, string> = {
  primary: 'bg-rl-teal text-white hover:bg-rl-teal-dark',
  secondary: 'border border-slate-300 bg-white text-rl-text hover:bg-slate-50',
  danger: 'border border-red-300 bg-white text-red-700 hover:bg-red-50',
  ghost: 'text-rl-teal-dark hover:bg-rl-teal/10',
}
export const buttonClass = (variant: Variant = 'primary', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${extra}`

export function Button({ variant = 'primary', busy, className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button type="button" {...props} disabled={props.disabled || busy} className={buttonClass(variant, className)}>
      {busy && <Spinner small />}
      {children}
    </button>
  )
}

export function LinkButton({ to, variant = 'primary', className = '', children }: { to: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={buttonClass(variant, className)}>
      {children}
    </Link>
  )
}

// Two-step confirm without a browser dialog: the first click asks, the second acts.
export function ConfirmButton({ onConfirm, children, confirmLabel = 'Yes, do it', variant = 'danger', busy }: { onConfirm: () => void; children: ReactNode; confirmLabel?: string; variant?: Variant; busy?: boolean }) {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <Button variant={variant} onClick={() => setAsking(true)} busy={busy}>
        {children}
      </Button>
    )
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant="danger"
        onClick={() => {
          setAsking(false)
          onConfirm()
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="ghost" onClick={() => setAsking(false)}>
        Cancel
      </Button>
    </span>
  )
}

const inputClass = 'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-rl-teal focus:ring-2 focus:ring-rl-teal/30 focus:outline-none'

type FieldProps = { label: string; hint?: ReactNode; error?: string }

export function Field({ label, hint, error, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input {...props} className={inputClass} aria-invalid={Boolean(error)} />
      {hint && !error && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-normal text-red-600">{error}</span>}
    </label>
  )
}

export function TextArea({ label, hint, error, ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea rows={4} {...props} className={inputClass} />
      {hint && !error && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-normal text-red-600">{error}</span>}
    </label>
  )
}

export function Select({ label, hint, error, options, placeholder, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { options: Record<string, string>; placeholder?: string }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select {...props} className={inputClass}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {Object.entries(options).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      {hint && !error && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-normal text-red-600">{error}</span>}
    </label>
  )
}

export function Checkboxes({ label, options, value, onChange }: { label: string; options: Record<string, string>; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="text-sm">
      <legend className="font-medium text-slate-700">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.entries(options).map(([key, text]) => {
          const on = value.includes(key)
          return (
            <label key={key} className={`cursor-pointer rounded-full border px-3 py-1.5 ${on ? 'border-rl-teal bg-rl-teal/15 text-rl-teal-dark' : 'border-slate-300 bg-white text-slate-600'}`}>
              <input type="checkbox" className="sr-only" checked={on} onChange={() => onChange(on ? value.filter((v) => v !== key) : [...value, key])} />
              {text}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

const alertStyles = { error: 'border-red-200 bg-red-50 text-red-800', success: 'border-emerald-200 bg-emerald-50 text-emerald-800', info: 'border-sky-200 bg-sky-50 text-sky-900' }
export function Alert({ kind = 'info', children }: { kind?: keyof typeof alertStyles; children: ReactNode }) {
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-md border px-4 py-3 text-sm ${alertStyles[kind]}`}>
      {children}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
}

export function Page({ title, subtitle, actions, children, narrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; narrow?: boolean }) {
  return (
    <div className={`mx-auto px-4 py-8 ${narrow ? 'max-w-md' : 'max-w-5xl'}`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function Spinner({ small }: { small?: boolean }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${small ? 'size-4' : 'size-6 text-rl-teal'}`} aria-hidden />
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500" role="status">
      <Spinner />
      {label}
    </div>
  )
}

export function Empty({ icon = 'inbox', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <i className={`bi bi-${icon} text-3xl text-slate-400`} />
      <p className="mt-3 font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-600">{children}</div>}
    </div>
  )
}

export function LoadError({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <Alert kind="error">
      {error.message}{' '}
      {retry && (
        <button type="button" onClick={retry} className="font-semibold underline">
          Try again
        </button>
      )}
    </Alert>
  )
}

export function Pill({ children, tone = 'teal' }: { children: ReactNode; tone?: 'teal' | 'slate' | 'amber' | 'red' | 'green' }) {
  const tones = {
    teal: 'border-rl-teal/40 bg-rl-teal/10 text-rl-teal-dark',
    slate: 'border-slate-200 bg-slate-100 text-slate-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}

const lookup = (map: Record<string, string>, key: string | null | undefined) => (key && key in map ? map[key] : null)

export function Tags({ subject, level, medium }: { subject?: string | null; level?: string | null; medium?: string | null }) {
  const values = [lookup(subjects, subject), lookup(levels, level), lookup(media, medium)].filter(Boolean)
  if (!values.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <Pill key={v}>{v}</Pill>
      ))}
    </div>
  )
}

const statusTone = { draft: 'slate', pending: 'amber', published: 'green', rejected: 'red', removed: 'red' } as const
const statusText = { draft: 'Draft', pending: 'Waiting for review', published: 'Published', rejected: 'Not approved', removed: 'Removed by admin' } as const
export function StatusPill({ status }: { status: keyof typeof statusTone }) {
  return <Pill tone={statusTone[status]}>{statusText[status]}</Pill>
}

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
export const formatDateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
