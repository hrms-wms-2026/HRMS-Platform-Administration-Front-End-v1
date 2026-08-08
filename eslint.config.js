// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'rxjs',
          importNames: ['BehaviorSubject'],
          message: 'Use @ngrx/signals withState() instead of BehaviorSubject — this codebase\'s state management convention (see PermissionStore for the pattern).',
        }],
      }],
      // Modal/ConfirmationDialog already ship `close`/`cancel` outputs used across many
      // consumers (Roles, Tenants, User Profile Drawer, etc.) — renaming needs its own
      // dedicated, tested pass rather than being folded into unrelated tooling work.
      '@angular-eslint/no-output-native': 'warn',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // Modal's backdrop-click-to-close needs a dedicated keyboard-accessible rework
      // (see the no-output-native note above) — tracked separately, not part of this change.
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
    },
  },
]);
