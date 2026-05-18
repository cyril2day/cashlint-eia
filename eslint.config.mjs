import tsParser from '@typescript-eslint/parser';

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
    selector: "BinaryExpression > TemplateLiteral:only-child[value.raw='']",
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
  // 7. Logical NOT NOT allowed
  // -----------------------------
  {
    selector: "UnaryExpression[operator='!']",
    message:
      'Logical NOT (!) is not allowed. Use Ramda complement or named predicates.',
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
    rules: {
      'no-restricted-syntax': ['error', ...restrictedSyntaxRules],
    },
  },
];