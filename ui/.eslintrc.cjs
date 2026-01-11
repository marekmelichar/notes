module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    'react',
    'react-hooks',
    'react-compiler',
    '@typescript-eslint',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // React 19 doesn't require importing React
    'react/react-in-jsx-scope': 'off',

    // TypeScript handles prop types
    'react/prop-types': 'off',

    // Allow unused vars with underscore prefix
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

    // Allow empty functions
    '@typescript-eslint/no-empty-function': 'off',

    // Allow any type (warn only)
    '@typescript-eslint/no-explicit-any': 'warn',

    // React Compiler plugin
    'react-compiler/react-compiler': 'error',

    // React hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  overrides: [
    {
      files: ['*.test.ts', '*.test.tsx', '**/__tests__/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules/', 'build/', 'dist/', '*.config.js', '*.config.ts', '*.cjs'],
};
