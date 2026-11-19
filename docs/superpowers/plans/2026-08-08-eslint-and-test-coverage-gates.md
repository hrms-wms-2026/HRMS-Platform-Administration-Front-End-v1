# ESLint and Test Coverage Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close two "cheapest fix, meaningful guardrail" gaps from the architecture audit: add ESLint
with a rule enforcing the codebase's existing (but so-far only convention-enforced) no-`BehaviorSubject`
rule, and add Jest coverage thresholds so coverage regressions actually fail CI instead of going
unnoticed.

**Architecture:** Two independent, additive tooling changes — no application code changes. Task 1
scaffolds ESLint via the official `ng add @angular-eslint/schematics` generator (safer than
hand-writing Angular 21's flat-config ESLint setup from scratch) and adds one custom rule on top.
Task 2 adds a `coverageThreshold` block to the existing Jest config and re-enables coverage
collection in the CI workflow that currently explicitly disables it.

**Tech Stack:** ESLint 9 flat config (via `@angular-eslint/schematics`), Jest 30, GitHub Actions.

## Global Constraints

- Do not touch or reference the untracked `.claude/` directory — not part of the app.
- No application source code changes in this plan — tooling/config only.
- Coverage thresholds must not fail on the current codebase state (measured baseline: Statements
  90.75%, Branches 71.42%, Functions 77.52%, Lines 90.85%, from `npm test` on this exact branch).

---

### Task 1: Add ESLint with a BehaviorSubject-ban rule

**Files:**
- Create (via generator): `eslint.config.js`
- Modify (via generator): `package.json` (adds `lint` script + devDependencies)
- Modify: `eslint.config.js` (add the custom rule after scaffolding)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `npm run lint` (or `ng lint`, whichever the generator wires up) as a runnable, clean
  command. Task 2 does not depend on this.

- [ ] **Step 1: Scaffold ESLint via the official Angular schematic**

Run:
```bash
npx ng add @angular-eslint/schematics
```
When prompted, accept the defaults (this schematic doesn't normally prompt for anything beyond
package manager confirmation). This installs `angular-eslint`, `eslint`, `typescript-eslint` as
devDependencies, creates `eslint.config.js` at the repo root wired to Angular's recommended
TypeScript and template rule sets, and adds a `"lint": "ng lint"` script to `package.json`.

- [ ] **Step 2: Verify the scaffolded lint passes cleanly before adding anything**

Run: `npm run lint`
Expected: Passes with 0 errors (this codebase already avoids the patterns
`@angular-eslint/recommended` and `typescript-eslint`'s recommended set flag — no cleanup needed
before proceeding).

- [ ] **Step 3: Read the generated `eslint.config.js` to find its TypeScript rules block**

Read the file. It will contain an array of config objects, one of which applies to `**/*.ts` files
and has a `rules: { ... }` object (or `extends: [...]` composed via `tseslint.config(...)`) — the
exact generated shape varies by `angular-eslint` version, so read it before editing rather than
guessing. You're looking for the object whose `files` array includes `"**/*.ts"`.

- [ ] **Step 4: Add the BehaviorSubject-ban rule to that block's `rules` object**

Add this entry to the `rules` object you found in Step 3 (merge it alongside whatever rules the
generator already put there — don't replace the object):

```javascript
'no-restricted-imports': ['error', {
  paths: [{
    name: 'rxjs',
    importNames: ['BehaviorSubject'],
    message: 'Use @ngrx/signals withState() instead of BehaviorSubject — this codebase\'s state management convention (see PermissionStore for the pattern).',
  }],
}],
```

If the generated file uses `tseslint.config(...)` with an array of spread configs rather than a
plain object literal, add this as its own entry in that array instead, scoped to `**/*.ts`:

```javascript
{
  files: ['**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{
        name: 'rxjs',
        importNames: ['BehaviorSubject'],
        message: 'Use @ngrx/signals withState() instead of BehaviorSubject — this codebase\'s state management convention (see PermissionStore for the pattern).',
      }],
    }],
  },
},
```

- [ ] **Step 5: Run the linter to verify the new rule is active and passes clean**

Run: `npm run lint`
Expected: Passes with 0 errors. (Zero `BehaviorSubject` imports currently exist anywhere in `src/`
— already confirmed during the architecture audit — so this rule adds zero fix-up work; it's a
pure guardrail against future regressions.)

- [ ] **Step 6: Commit**

```bash
git add eslint.config.js package.json package-lock.json
git commit -m "chore: add ESLint with a rule banning BehaviorSubject in favor of NgRx Signal Store"
```

---

### Task 2: Add Jest coverage thresholds and re-enable coverage in CI

**Files:**
- Modify: `jest.config.js`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: nothing consumed elsewhere — this is the plan's final task.

- [ ] **Step 1: Add the coverage threshold block**

In `jest.config.js`, the current content is:

```javascript
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/e2e/'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text-summary', 'lcov'],
};
```

Replace it with:

```javascript
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/e2e/'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text-summary', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 65,
      functions: 70,
      lines: 85,
    },
  },
};
```

(These thresholds sit below the current measured baseline — Statements 90.75%, Branches 71.42%,
Functions 77.52%, Lines 90.85% — with headroom so normal day-to-day work doesn't trip CI, while
still catching a real coverage regression.)

- [ ] **Step 2: Run the full test suite locally to verify it still passes with thresholds enforced**

Run: `npm test`
Expected: PASS — all suites green, and the coverage summary printed at the end must show every
metric (Statements/Branches/Functions/Lines) at or above the thresholds from Step 1. If any metric
falls below its threshold, Jest exits non-zero with a `Jest: "global" coverage threshold for ...
not met` message — this should not happen given the measured baseline, but if it does, stop and
report the actual numbers rather than lowering the threshold to force a pass.

- [ ] **Step 3: Re-enable coverage in the CI workflow**

In `.github/workflows/ci.yml`, find this line under the `Test - Unit (Jest)` step:

```yaml
      - name: Test - Unit (Jest)
        run: npx jest --ci --coverage=false
```

Replace it with:

```yaml
      - name: Test - Unit (Jest)
        run: npx jest --ci
```

(Removing `--coverage=false` lets `jest.config.js`'s own `collectCoverage: true` and the new
`coverageThreshold` block actually take effect in CI — previously the flag was overriding the
config file and disabling coverage entirely, so the threshold would never have been checked even
after Step 1 alone.)

- [ ] **Step 4: Commit**

```bash
git add jest.config.js .github/workflows/ci.yml
git commit -m "test: add Jest coverage thresholds and enforce them in CI"
```

---

## Self-Review Notes

- **Spec coverage:** both punch-list items (§12 ESLint/BehaviorSubject rule, §10 coverage
  thresholds + CI enforcement) are fully covered, one task each.
- **No placeholders:** Task 1's Steps 3-4 describe reading a generator-produced file before editing
  rather than guessing its exact shape — this mirrors how this session's User Profile Drawer plan
  handled a similarly not-yet-known file (an existing spec file's exact helper names), not a
  "TBD"/vague-instruction violation; the actual rule code to insert is fully literal either way.
  Task 2's steps are fully literal — the current and replacement file contents are both given
  verbatim, no guessing required.
- **Type consistency:** N/A — no shared types or interfaces between these two tasks.
