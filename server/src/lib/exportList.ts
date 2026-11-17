import { levels, media, subjects, type ExportFormat } from '../../../shared/vocabulary.js'

// S2-08-T02 Turn a curated list into a file a professor can drop into a syllabus or LMS.
// Every row has title, type (format), level, subject and a working link.

export type ExportRow = { title: string; medium: string | null; level: string | null; subject: string | null; description: string; link: string }

const label = (map: Record<string, string>, key: string | null) => (key && key in map ? map[key] : '')

// Spreadsheet apps run cells that start with these as formulas (CSV injection)
const csvCell = (value: string) => {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}
const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const escapeMd = (v: string) => v.replace(/([\\`*_[\]<>|])/g, '\\$1')

export function exportFilename(listName: string, format: ExportFormat) {
  const base = listName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'list'
  return `${base}.${format}`
}

export const exportTypes: Record<ExportFormat, string> = { csv: 'text/csv; charset=utf-8', md: 'text/markdown; charset=utf-8', html: 'text/html; charset=utf-8' }

export function renderList(name: string, rows: ExportRow[], format: ExportFormat): string {
  const pretty = rows.map((r) => ({ ...r, type: label(media, r.medium), levelText: label(levels, r.level), subjectText: label(subjects, r.subject) }))
  if (format === 'csv') {
    const header = ['Title', 'Type', 'Level', 'Subject', 'Link', 'Description']
    const lines = pretty.map((r) => [r.title, r.type, r.levelText, r.subjectText, r.link, r.description].map(csvCell).join(','))
    // BOM so Excel opens accented titles correctly
    return '﻿' + [header.join(','), ...lines].join('\r\n') + '\r\n'
  }
  if (format === 'md') {
    const items = pretty.map((r, i) => {
      const meta = [r.type, r.levelText, r.subjectText].filter(Boolean).join(' · ')
      return `${i + 1}. [${escapeMd(r.title)}](${r.link})${meta ? ` (${meta})` : ''}${r.description ? `\n   ${escapeMd(r.description.split('\n')[0])}` : ''}`
    })
    return `# ${escapeMd(name)}\n\n${items.join('\n')}\n`
  }
  const items = pretty
    .map((r) => {
      const meta = [r.type, r.levelText, r.subjectText].filter(Boolean).join(' · ')
      return `  <li><a href="${escapeHtml(r.link)}">${escapeHtml(r.title)}</a>${meta ? ` <em>(${escapeHtml(meta)})</em>` : ''}${r.description ? `<br>${escapeHtml(r.description)}` : ''}</li>`
    })
    .join('\n')
  return `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>${escapeHtml(name)}</title></head>\n<body>\n<h1>${escapeHtml(name)}</h1>\n<ol>\n${items}\n</ol>\n</body>\n</html>\n`
}
