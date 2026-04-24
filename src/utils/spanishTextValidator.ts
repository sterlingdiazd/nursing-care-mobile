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

  return { isValid: issues.length === 0, issues };
}

/** Format date as DD/MM/YYYY */
export function formatDateES(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Format date+time as DD/MM/YYYY HH:MM:SS AM/PM */
export function formatDateTimeES(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-DO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}
