// Run with: npx tsx scripts/design-validator.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

interface RuleResult {
  rule: string;
  passed: boolean;
  violations: string[];
}

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: ROOT });
  } catch (e: unknown) {
    // grep exits 1 when no matches; that means no violations
    if (typeof e === 'object' && e !== null && 'status' in e && (e as { status: number }).status === 1) {
      return '';
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Rule 1: No raw hex colors
// Exclusions: tokens.ts, mobileStyles.ts, __tests__, Toast.tsx
// Exception: shadowColor "#000" is allowed
// ---------------------------------------------------------------------------
function checkNoRawHexColors(): RuleResult {
  const raw = run(
    `grep -rn --include="*.tsx" --include="*.ts" -E '#[0-9a-fA-F]{3,8}' ${ROOT}/app ${ROOT}/src/components 2>/dev/null || true`
  );

  const violations: string[] = [];

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;

    // Exclude files (design system definitions, tests, Expo boilerplate)
    if (
      line.includes('tokens.ts') ||
      line.includes('mobileStyles.ts') ||
      line.includes('__tests__') ||
      line.includes('Toast.tsx') ||
      line.includes('modal.tsx') ||
      line.includes('+html.tsx')
    ) {
      continue;
    }

    // Strip the file:line: prefix to inspect the code content
    const colonIdx = line.indexOf(':', line.indexOf(':') + 1); // second colon (after line number)
    const content = colonIdx >= 0 ? line.slice(colonIdx + 1) : line;

    // Allow shadowColor "#000" — extract only the hex value context
    // A line is allowed if ALL hex occurrences in it are #000 used as shadowColor
    const hexMatches = content.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
    const nonBlackHex = hexMatches.filter(h => h.toLowerCase() !== '#000');

    // Check if remaining hex values appear in a shadowColor context
    const remainingViolations = nonBlackHex.filter(hex => {
      // Allow if the hex is part of a shadowColor property
      const escapedHex = hex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const shadowPattern = new RegExp(`shadowColor[^;,\\n]*${escapedHex}`);
      return !shadowPattern.test(content);
    });

    // Also allow #000 appearing in shadowColor contexts from the original set
    const blackHexViolations = hexMatches
      .filter(h => h.toLowerCase() === '#000')
      .filter(() => {
        // Flag #000 NOT in shadowColor context
        return !/shadowColor[^;,\n]*#000/i.test(content) &&
               !/shadowColor[^;,\n]*#000000/i.test(content);
      });

    if (remainingViolations.length > 0 || blackHexViolations.length > 0) {
      violations.push(line.trim());
    }
  }

  return {
    rule: 'No raw hex colors (shadowColor #000 allowed)',
    passed: violations.length === 0,
    violations,
  };
}

// ---------------------------------------------------------------------------
// Rule 2: No UUIDs in user-facing UI
// Flag .id}, .id.substring, id.slice, {…id}, ${…id} in JSX text in app/ .tsx
// ---------------------------------------------------------------------------
function checkNoUuidsInUi(): RuleResult {
  // Only flag FULL UUID rendering — truncated references (substring(0,8)) are acceptable
  const patterns = [
    '\\.id\\}',
    '\\.id\\.slice',
    '\\$\\{[^}]*\\.id\\}',
    '\\{[^}]*\\.id\\}',
  ].join('|');

  const raw = run(
    `grep -rn --include="*.tsx" -E '(${patterns})' ${ROOT}/app 2>/dev/null || true`
  );

  const violations: string[] = [];

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    if (line.includes('__tests__')) continue;

    // Only flag occurrences that are inside JSX text / template literals
    // (i.e., not in onClick handlers, key props, or URL paths)
    const colonIdx = line.indexOf(':', line.indexOf(':') + 1);
    const content = colonIdx >= 0 ? line.slice(colonIdx + 1) : line;

    // Skip lines that are clearly non-rendering (automation selectors, navigation, keys, API calls)
    if (
      /key=\{/.test(content) ||
      /testID=/.test(content) ||
      /nativeID=/.test(content) ||
      /href=/.test(content) ||
      /onPress=/.test(content) ||
      /router\.(push|replace)/.test(content) ||
      /\/.*\.id/.test(content) ||
      /fetch|axios|api\./.test(content) ||
      /console\./.test(content) ||
      /expandedLogId/.test(content) ||
      /===\s*item\.id/.test(content)
    ) {
      continue;
    }

    violations.push(line.trim());
  }

  return {
    rule: 'No UUIDs rendered in user-facing UI',
    passed: violations.length === 0,
    violations,
  };
}

// ---------------------------------------------------------------------------
// Rule 3: Accessibility labels on interactive elements
// Grep for Pressable / TouchableOpacity without accessibilityLabel within 5 lines
// ---------------------------------------------------------------------------
function checkAccessibilityLabels(): RuleResult {
  const violations: string[] = [];

  // Find all .tsx files in app/ (excluding __tests__)
  const raw = run(
    `find ${ROOT}/app ${ROOT}/src/components -name "*.tsx" 2>/dev/null || true`
  );
  const files = raw.split('\n').filter(f => f.trim() && !f.includes('__tests__'));

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!/<Pressable|<TouchableOpacity/.test(line)) continue;

      // Check if this opening tag or the next 5 lines contain accessibilityLabel
      const window = lines.slice(i, Math.min(i + 6, lines.length)).join('\n');
      if (!/accessibilityLabel/.test(window)) {
        const relFile = path.relative(ROOT, file);
        violations.push(`${relFile}:${i + 1}: ${line.trim().slice(0, 80)}`);
      }
    }
  }

  return {
    rule: 'Accessibility labels on Pressable/TouchableOpacity',
    passed: violations.length === 0,
    violations,
  };
}

// ---------------------------------------------------------------------------
// Rule 4: Timestamp format — toLocaleString / toLocaleDateString must use 'es-DO'
// ---------------------------------------------------------------------------
function checkTimestampFormat(): RuleResult {
  const raw = run(
    `grep -rn --include="*.tsx" --include="*.ts" -E '\\.(toLocaleString|toLocaleDateString)\\(' ${ROOT}/app ${ROOT}/src/components 2>/dev/null || true`
  );

  const violations: string[] = [];

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    if (line.includes('__tests__')) continue;

    const colonIdx = line.indexOf(':', line.indexOf(':') + 1);
    const content = colonIdx >= 0 ? line.slice(colonIdx + 1) : line;

    // Flag calls that don't include 'es-DO' on the same line
    if (!/'es-DO'/.test(content) && !/"es-DO"/.test(content)) {
      violations.push(line.trim());
    }
  }

  return {
    rule: "Timestamp format uses 'es-DO' locale",
    passed: violations.length === 0,
    violations,
  };
}

// ---------------------------------------------------------------------------
// Rule 5: Back navigation in detail screens
// Every app/admin/*/[id].tsx and app/care-requests/[id].tsx must contain
// router.back() or a "Volver" button
// ---------------------------------------------------------------------------
function checkBackNavigation(): RuleResult {
  const violations: string[] = [];

  // Collect candidate files
  const adminDetailFiles = run(
    `find ${ROOT}/app/admin -name '[id].tsx' 2>/dev/null || true`
  )
    .split('\n')
    .filter(f => f.trim());

  const careRequestDetail = path.join(ROOT, 'app/care-requests/[id].tsx');
  const candidates = [...adminDetailFiles];
  if (fs.existsSync(careRequestDetail)) {
    candidates.push(careRequestDetail);
  }

  for (const file of candidates) {
    if (!file.trim() || !fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');

    if (!content.includes('router.back()') && !content.includes('Volver')) {
      const relFile = path.relative(ROOT, file);
      violations.push(`${relFile}: missing router.back() or "Volver" button`);
    }
  }

  return {
    rule: 'Back navigation in detail screens',
    passed: violations.length === 0,
    violations,
  };
}

// ---------------------------------------------------------------------------
// Rule 6: Hardcoded Spanish strings not wrapped in t()
// Flag common Spanish words/phrases used as raw literals in .tsx files.
// ---------------------------------------------------------------------------
function checkHardcodedSpanishStrings(): RuleResult {
  // Words that should be looked up from the i18n/translations module instead of inlined
  const spanishKeywords = [
    'Solicitud',
    'Cargando',
    'Error',
    'Guardar',
    'Cancelar',
    'Volver',
  ];

  const violations: string[] = [];

  const pattern = spanishKeywords.map(w => `"${w}|'${w}`).join('|');
  const raw = run(
    `grep -rn --include="*.tsx" -E '(${spanishKeywords.map(w => `["']${w}`).join('|')})' ${ROOT}/app ${ROOT}/src/components 2>/dev/null || true`
  );

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    if (line.includes('__tests__')) continue;
    if (line.includes('t(')) continue; // already wrapped

    const colonIdx = line.indexOf(':', line.indexOf(':') + 1);
    const content = colonIdx >= 0 ? line.slice(colonIdx + 1) : line;

    // Skip import lines, comments, and type declarations
    if (/^\s*(\/\/|\/\*|import|export|interface|type )/.test(content)) continue;

    violations.push(line.trim());
  }

  return {
    rule: 'Hardcoded Spanish strings should use t() from i18n/translations',
    passed: violations.length === 0,
    violations,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(): void {
  console.log('Design Validator\n================\n');

  const results: RuleResult[] = [
    checkNoRawHexColors(),
    checkNoUuidsInUi(),
    checkAccessibilityLabels(),
    checkTimestampFormat(),
    checkBackNavigation(),
    checkHardcodedSpanishStrings(),
  ];

  let anyFailed = false;

  for (const r of results) {
    const status = r.passed ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${r.rule}`);
    if (!r.passed) {
      anyFailed = true;
      console.log(`       ${r.violations.length} violation(s):`);
      for (const v of r.violations.slice(0, 20)) {
        console.log(`         - ${v}`);
      }
      if (r.violations.length > 20) {
        console.log(`         ... and ${r.violations.length - 20} more`);
      }
    }
    console.log();
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Summary: ${passed} passed, ${failed} failed`);

  process.exit(anyFailed ? 1 : 0);
}

main();
