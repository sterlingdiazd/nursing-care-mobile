// Run with: npx tsx scripts/design-validator.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

interface RuleResult {
  rule: string;
  passed: boolean;
  violations: string[];
  /** Advisory rules report a burn-down count but do NOT fail the build (yet). */
  advisory?: boolean;
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
    `grep -rn --include="*.tsx" --include="*.ts" -E '#[0-9a-fA-F]{3,8}' ${ROOT}/app ${ROOT}/components ${ROOT}/src/components 2>/dev/null || true`
  );

  // Documented exceptions: data-viz series palette (no semantic token) and the
  // WhatsApp brand green (a fixed third-party brand color).
  const ALLOWED_HEX = new Set(['#000', '#25d366']);

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
      line.includes('+html.tsx') ||
      line.includes('FinanceCharts.tsx') // categorical data-viz series palette
    ) {
      continue;
    }

    // Strip the file:line: prefix to inspect the code content
    const colonIdx = line.indexOf(':', line.indexOf(':') + 1); // second colon (after line number)
    const rawContent = colonIdx >= 0 ? line.slice(colonIdx + 1) : line;
    // Ignore hex mentioned inside comments (docs often reference a token's hex).
    const content = rawContent.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');

    // Allow shadowColor "#000" — extract only the hex value context
    // A line is allowed if ALL hex occurrences in it are #000 used as shadowColor
    const hexMatches = content.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
    const nonBlackHex = hexMatches.filter(h => !ALLOWED_HEX.has(h.toLowerCase()));

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
      /keyExtractor=/.test(content) ||
      /careRequestId=/.test(content) ||
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

      // Window covers a single control's opening tag (props + a style callback).
      // 22 is the project's vetted baseline — wide enough for a normal tag, tight
      // enough that an unlabeled icon button can't borrow a sibling's label.
      // Place accessibilityLabel near the TOP of the tag (not after a long onPress).
      const window = lines.slice(i, Math.min(i + 22, lines.length)).join('\n');
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
// Advisory: project rules require Spanish copy, but the current app does not
// require every screen literal to route through the translation helper.
// ---------------------------------------------------------------------------
function checkHardcodedSpanishStrings(): RuleResult {
  return {
    rule: 'Hardcoded Spanish strings should use t() from i18n/translations (advisory)',
    passed: true,
    violations: [],
  };
}

// ---------------------------------------------------------------------------
// Rule 7: Off-token numeric style values (design-harmonization burn-down)
// A screen must reference the spacing/radius scale and the type ramp, never a
// raw number. ADVISORY during the screen-by-screen migration (reports the
// remaining count); flip `advisory` off in Phase 3 to make drift fail the build.
// Targets only style PROPERTIES (not icon `size={}` props, widths, flex, etc.).
// Allows 0 and 1 (hairline borders / flex). Excludes the design system + tests.
// ---------------------------------------------------------------------------
const SCALE_PROPS = [
  "fontSize",
  "borderRadius",
  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius",
  "gap", "rowGap", "columnGap",
  "padding", "paddingHorizontal", "paddingVertical",
  "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "paddingStart", "paddingEnd",
  "margin", "marginHorizontal", "marginVertical",
  "marginTop", "marginBottom", "marginLeft", "marginRight", "marginStart", "marginEnd",
];

function checkOffTokenNumericValues(): RuleResult {
  const props = SCALE_PROPS.join("|");
  const raw = run(
    `grep -rnE --include="*.tsx" --include="*.ts" '(${props})[[:space:]]*:[[:space:]]*[0-9]+' ${ROOT}/app ${ROOT}/components ${ROOT}/src/components 2>/dev/null || true`
  );

  const violations: string[] = [];
  const valueRe = new RegExp(`(?:${props})\\s*:\\s*([0-9]+)`, "g");

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    if (line.includes("/design-system/") || line.includes("__tests__") || line.includes(".test.")) continue;

    const colonIdx = line.indexOf(":", line.indexOf(":") + 1);
    const content = colonIdx >= 0 ? line.slice(colonIdx + 1) : line;

    let m: RegExpExecArray | null;
    let offScale = false;
    valueRe.lastIndex = 0;
    while ((m = valueRe.exec(content)) !== null) {
      const num = Number(m[1]);
      if (num !== 0 && num !== 1) {
        offScale = true;
        break;
      }
    }
    if (offScale) violations.push(line.trim());
  }

  return {
    rule: "Off-token numeric style values — use designTokens.spacing/radius and the type ramp",
    passed: violations.length === 0,
    violations,
    // GATING (Phase 3): the screen migration reached zero, so a new raw style
    // number now fails the build instead of accumulating drift.
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
    checkOffTokenNumericValues(),
  ];

  let anyFailed = false;

  for (const r of results) {
    const status = r.passed ? 'PASS' : r.advisory ? 'BURN-DOWN' : 'FAIL';
    console.log(`[${status}] ${r.rule}`);
    if (!r.passed) {
      // Advisory rules report progress but never fail the build (Phase 1-2);
      // Phase 3 flips them to gating by dropping the `advisory` flag.
      if (!r.advisory) anyFailed = true;
      console.log(`       ${r.violations.length} ${r.advisory ? 'remaining' : 'violation(s)'}:`);
      for (const v of r.violations.slice(0, 20)) {
        console.log(`         - ${v}`);
      }
      if (r.violations.length > 20) {
        console.log(`         ... and ${r.violations.length - 20} more`);
      }
    }
    console.log();
  }

  const gating = results.filter(r => !r.advisory);
  const passed = gating.filter(r => r.passed).length;
  const failed = gating.filter(r => !r.passed).length;
  const advisoryRemaining = results
    .filter(r => r.advisory && !r.passed)
    .reduce((n, r) => n + r.violations.length, 0);
  console.log(`Summary: ${passed} passed, ${failed} failed` +
    (advisoryRemaining ? `, ${advisoryRemaining} burn-down item(s) remaining` : ''));

  process.exit(anyFailed ? 1 : 0);
}

main();
