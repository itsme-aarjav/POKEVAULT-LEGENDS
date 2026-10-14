import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'assets/**',
      'scratch/**',
      '**/.system_generated/**'
    ]
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'src/**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(React|_)',
          caughtErrors: 'none'
        }
      ],
      'no-undef': 'error',
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-constant-condition': ['error', { checkLoops: false }]
    }
  },
  {
    files: ['services/**/*.js', 'test/**/*.js', 'vite.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(React|_)',
          caughtErrors: 'none'
        }
      ],
      'no-undef': 'error',
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  }
];
