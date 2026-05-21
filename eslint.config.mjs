import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const restrictedSyntaxRules = [
  // -----------------------------
  // 1. Type assertions NOT allowed
  // -----------------------------
  {
    selector: 'TSAsExpression',
    message:
      'Type assertions are not allowed. Use validated constructors or mapping at the boundary.',
  },
  {
    selector: 'TSTypeAssertion',
    message:
      'Type assertions are not allowed. Use validated constructors or mapping at the boundary.',
  },
  {
    selector: 'TSNonNullExpression',
    message:
      'Non-null assertion (!) is not allowed. Represent absence explicitly (Option/Maybe).',
  },

  // -----------------------------
  // 2. Direct null checks NOT allowed
  // -----------------------------
  {
    selector:
      "BinaryExpression[operator='=='][right.value=null], BinaryExpression[operator='==='][right.value=null], BinaryExpression[operator='!='][right.value=null], BinaryExpression[operator='!=='][right.value=null], BinaryExpression[operator='=='][left.value=null], BinaryExpression[operator='==='][left.value=null], BinaryExpression[operator='!='][left.value=null], BinaryExpression[operator='!=='][left.value=null]",
    message:
      'Direct null checks are not allowed. Use Option/Maybe or boundary validation instead.',
  },

  // -----------------------------
  // 3. Empty string checks NOT allowed
  // -----------------------------
  {
    selector: "BinaryExpression[right.value=''], BinaryExpression[left.value='']",
    message:
      'Direct empty-string comparison is not allowed. Use a named predicate (e.g. isNonEmptyString).',
  },
  {
    selector: "BinaryExpression > TemplateLiteral[value.raw='']",
    message: 'Empty template string comparison is not allowed.',
  },

  // -----------------------------
  // 4. Nullish coalescing NOT allowed
  // -----------------------------
  {
    selector: "LogicalExpression[operator='??']",
    message:
      'Nullish coalescing (??) is not allowed. Use explicit Option/Maybe handling.',
  },

  // -----------------------------
  // 5. Optional fields NOT allowed
  // -----------------------------
  {
    selector: 'TSPropertySignature[optional=true]',
    message:
      'Optional fields are not allowed. Use Option/Maybe or domain-specific union types.',
  },
  {
    selector: 'PropertyDefinition[optional=true]',
    message:
      'Optional class fields are not allowed. Use explicit Option/Maybe.',
  },
  {
    selector: 'TSOptionalType',
    message: 'Optional types are not allowed. Use Option/Maybe instead.',
  },

  // -----------------------------
  // 6. Composite boolean expressions NOT allowed
  // -----------------------------
  {
    selector: "LogicalExpression[operator='&&']",
    message: 'Logical AND (&&) is not allowed. Use Ramda allPass / both.',
  },
  {
    selector: "LogicalExpression[operator='||']",
    message: 'Logical OR (||) is not allowed. Use Ramda anyPass / either.',
  },

  // -----------------------------
  // Import declarations must be at the top
  // -----------------------------
  {
    selector: "Program > :not(ImportDeclaration) ~ ImportDeclaration",
    message: 'Import declarations must appear before any other statements in the file.',
  },

  // -----------------------------
  // Empty default object export NOT allowed
  // -----------------------------
  {
    selector: "ExportDefaultDeclaration > ObjectExpression[properties.length=0]",
    message:
      'Default-exporting an empty object (export default {}) is not allowed. Use named exports or export a meaningful value.',
  },

  // -----------------------------
  // 15. Direct Date usage NOT allowed — prefer date-fns and shared/date
  // -----------------------------
  {
    selector: 'NewExpression[callee.name="Date"]',
    message: 'Do not construct Date directly. Use date-fns or @/shared/date helpers.',
  },
  {
    selector: "MemberExpression[object.name='Date']",
    message: 'Do not use Date static members directly. Use date-fns or @/shared/date helpers.',
  },

  // -----------------------------
  // 7. Logical NOT NOT allowed
  // -----------------------------
  {
    selector: "UnaryExpression[operator='!']",
    message:
      'Logical NOT (!) is not allowed. Use Ramda complement or named predicates.',
  },

  // -----------------------------
  // 8. Imperative branching NOT allowed
  // -----------------------------
  {
    selector: 'IfStatement',
    message:
      'Imperative if/else statements are not allowed. Use Ramda ifElse for two-way branching or when/unless for one-way branching.',
  },
  {
    selector: 'ConditionalExpression',
    message:
      'Ternaries are not allowed. Use Ramda ifElse for two-way branching or when/unless for one-way branching.',
  },
  {
    selector: 'SwitchStatement',
    message:
      'Switch statements are not allowed. Use Ramda cond to manage multiple conditions.',
  },

  // -----------------------------
  // 9. Async and await NOT allowed
  // -----------------------------
  {
    selector: 'AsyncFunctionDeclaration',
    message:
      'Async functions are not allowed. Use AsyncResult type and handle effects explicitly at boundaries.',
  },
  {
    selector: 'AsyncFunctionExpression',
    message:
      'Async function expressions are not allowed. Use AsyncResult type and handle effects explicitly at boundaries.',
  },
  {
    selector: 'ArrowFunctionExpression[async=true]',
    message:
      'Async arrow functions are not allowed. Use AsyncResult type and handle effects explicitly at boundaries.',
  },
  {
    selector: 'AwaitExpression',
    message:
      'Await expressions are not allowed. Use AsyncResult and explicit effect handling instead.',
  },

  // -----------------------------
  // 10. Nested pipes NOT allowed
  // -----------------------------
  {
    selector: 'CallExpression[callee.name="pipe"] CallExpression[callee.name="pipe"]',
    message:
      'Nested pipes are not allowed. Compose multiple transformations into a single named function instead.',
  },

  // -----------------------------
  // 11. Long inline functions in pipe NOT allowed
  // -----------------------------
  {
    selector: 'CallExpression[callee.name="pipe"] ArrowFunctionExpression[expression=false]',
    message:
      'Long inline functions with blocks in pipes are not allowed. Extract into a named function.',
  },

  // -----------------------------
  // 12. Long inline functions in ifElse NOT allowed
  // -----------------------------
  {
    selector: 'CallExpression[callee.name="ifElse"] ArrowFunctionExpression[expression=false]',
    message:
      'Long inline functions with blocks in ifElse are not allowed. Extract into a named function.',
  },

  // -----------------------------
  // 13. Nested ifElse NOT allowed
  // -----------------------------
  {
    selector: 'CallExpression[callee.name="ifElse"] CallExpression[callee.name="ifElse"]',
    message:
      'Nested ifElse calls are not allowed. Use Ramda cond for multi-way branching instead.',
  },
  // -----------------------------
  // 14. Nested bindResult NOT allowed
  // -----------------------------
  {
    selector: 'CallExpression[callee.name="bindResult"] CallExpression[callee.name="bindResult"]',
    message:
      'Nested bindResult calls are not allowed. Use flatter pipelines, sequenceResults, or a pipeWith runner instead.',
  },
];

export default [
  {
    ignores: ['.next/**', 'coverage/**', 'dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      'no-restricted-syntax': ['error', ...restrictedSyntaxRules],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_'
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'ramda',
              message: 'Import Ramda utilities through @/shared/fp instead.',
            },
            {
              name: 'date-fns',
              message: 'Import date helpers through @/shared/date instead.',
            },
          ],
          patterns: [
            {
              group: ['ramda/*'],
              message: 'Import Ramda utilities through @/shared/fp instead.',
            },
            {
              group: ['date-fns/*'],
              message: 'Import date helpers through @/shared/date instead.',
            },
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/contexts/acl/eia-ingestion-acl/**/*.ts'],
    rules: {
      'max-nested-callbacks': ['error', 2],
    },
  },
  {
    files: ['src/shared/date/index.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['src/shared/fp/index.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  // translators are covered by the global restrictedSyntaxRules and the ACL nesting-depth rule
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...restrictedSyntaxRules.filter(
          rule =>
            rule.selector !== 'AsyncFunctionDeclaration' &&
            rule.selector !== 'AsyncFunctionExpression' &&
            rule.selector !== 'ArrowFunctionExpression[async=true]' &&
            rule.selector !== 'AwaitExpression' &&
            rule.selector !== 'CallExpression[callee.name="ifElse"] ArrowFunctionExpression[expression=false]' &&
            rule.selector !== 'NewExpression[callee.name="Date"]' &&
            rule.selector !== "MemberExpression[object.name='Date']"
        ),
      ],
    },
  },
];