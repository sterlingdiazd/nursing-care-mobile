interface SpanishTextValidation {
  isValid: boolean;
  issues: string[];
}

export function validateSpanishText(text: string): SpanishTextValidation {
  const issues: string[] = [];

  // Rule 1: No English words in user-facing text
  const englishWords = ['click', 'button', 'screen', 'field', 'success message', 'error message', 'return to', 'appears', 'enabled', 'disabled'];
  for (const word of englishWords) {
    if (text.toLowerCase().includes(word)) {
      issues.push(`Palabra en ingles detectada: "${word}"`);
    }
  }

  // Rule 2: No backend identifiers (UUIDs)
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}/i;
  if (uuidPattern.test(text)) {
    issues.push('Patron UUID detectado en texto visible al usuario');
  }

  // Rule 3: No raw backend status codes
  const englishStatuses = ['Completed', 'Paid', 'Invoiced', 'Cancelled', 'Rejected', 'Pending', 'Open', 'Closed'];
  for (const status of englishStatuses) {
    if (text.includes(status)) {
      issues.push(`Estado en ingles "${status}" debe traducirse`);
    }
  }

  // Rule 4: ISO date format check
  const isoDatePattern = /\d{4}-\d{2}-\d{2}T/;
  if (isoDatePattern.test(text)) {
    issues.push('Formato de fecha ISO detectado — usar DD/MM/YYYY');
  }

  // Rule 5: Accent detection — flag common words missing required accents
  const accentRules: Array<{ wrong: string; correct: string }> = [
    { wrong: 'invalido', correct: 'inválido' },
    { wrong: 'invalida', correct: 'inválida' },
    { wrong: 'invalidos', correct: 'inválidos' },
    { wrong: 'informacion', correct: 'información' },
    { wrong: 'sesion', correct: 'sesión' },
    { wrong: 'calculo', correct: 'cálculo' },
    { wrong: 'transicion', correct: 'transición' },
    { wrong: 'telefono', correct: 'teléfono' },
    { wrong: 'numero', correct: 'número' },
    { wrong: 'direccion', correct: 'dirección' },
    { wrong: 'periodo', correct: 'período' },
    { wrong: 'codigo', correct: 'código' },
    { wrong: 'autorizacion', correct: 'autorización' },
    { wrong: 'validacion', correct: 'validación' },
    { wrong: 'operacion', correct: 'operación' },
    { wrong: 'creacion', correct: 'creación' },
    { wrong: 'solicitud invalida', correct: 'solicitud inválida' },
    { wrong: 'contrasena', correct: 'contraseña' },
    { wrong: 'administracion', correct: 'administración' },
    { wrong: 'notificacion', correct: 'notificación' },
    { wrong: 'nominima', correct: 'nómina' },
    { wrong: 'nomina', correct: 'nómina' },
  ];

  const lowerText = text.toLowerCase();
  for (const rule of accentRules) {
    // Match whole word (with word boundary) to avoid false positives
    const pattern = new RegExp(`\\b${rule.wrong}\\b`, 'i');
    if (pattern.test(lowerText) && !text.includes(rule.correct)) {
      issues.push(`Acento faltante: "${rule.wrong}" debe escribirse "${rule.correct}"`);
    }
  }

  return { isValid: issues.length === 0, issues };
}

/**
 * Parse a value for display. A date-only string ("YYYY-MM-DD") is read as a LOCAL
 * calendar date — NOT `new Date("YYYY-MM-DD")`, which JS parses as UTC midnight and
 * then shifts a day in negative timezones (DR is UTC-4), printing the previous day.
 * Anything else (a full timestamp or a Date) keeps the native parse.
 */
function toDisplayDate(date: string | Date): Date {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return typeof date === 'string' ? new Date(date) : date;
}

/**
 * Format date as DD-MM-YYYY (Dominican Republic convention: dash-separated,
 * day-first). Hand-formatted because `toLocaleDateString` returns slashes
 * and there's no locale switch to force dashes consistently across platforms.
 */
export function formatDateES(date: string | Date): string {
  const d = toDisplayDate(date);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Format date+time as DD-MM-YYYY HH:MM:SS AM/PM (12-hour). Used for any
 * timestamp shown to the user (audit logs, created-at, last-modified, etc).
 */
export function formatDateTimeES(date: string | Date): string {
  const d = toDisplayDate(date);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hh = String(hours).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}:${ss} ${ampm}`;
}
