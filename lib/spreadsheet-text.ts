/**
 * Text for a spreadsheet cell (B7, threat T6 "formula injection").
 *
 * A value typed into the app such as `=HYPERLINK(...)` or `+cmd|...` becomes a
 * formula if the file is ever re-saved as CSV or the cell is edited in Excel.
 * Text starting with = + - @ (or a tab / carriage return) gets a leading
 * apostrophe so it always stays text. The '-' placeholder for empty fields and
 * plain negative numbers such as "-50" are left as they are.
 */
const FORMULA_START = /^[=+\-@\t\r]/
const PLAIN_NUMBER = /^-\d+(\.\d+)?$/

export function cellText(value: string | null | undefined, empty = '-'): string {
  const text = value ?? ''
  if (text === '') return empty
  if (text === '-' || PLAIN_NUMBER.test(text)) return text
  return FORMULA_START.test(text) ? `'${text}` : text
}
