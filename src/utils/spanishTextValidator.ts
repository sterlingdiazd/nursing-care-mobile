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
