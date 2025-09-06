module.exports = {
    env: {
        es2022: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
    },
    plugins: ['@typescript-eslint'],
    rules: {
        // TypeScript specific rules
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'off', // Disabled for MCP server flexibility
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',

        // General JavaScript/TypeScript rules
        'no-console': 'off', // Allowed for server logging
        'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
        'prefer-const': 'warn',
        'no-var': 'error',
        'no-undef': 'off', // TypeScript handles this
        'no-mixed-spaces-and-tabs': 'off', // Handled by Prettier
        
        // Code quality - relaxed for initial version
        'complexity': 'off',
        'max-depth': 'off',
        'max-lines-per-function': 'off',
        'max-nested-callbacks': 'off',

        // Security - keep important ones
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',

        // Best practices - relaxed
        'eqeqeq': 'off',
        'radix': 'off',
        'prefer-template': 'off',
        'no-implicit-coercion': 'off',
        'no-case-declarations': 'off',
    },
    overrides: [
        {
            // Configuration for test files
            files: ['**/*.test.ts', '**/*.spec.ts'],
            env: {
                jest: true,
            },
            rules: {
                '@typescript-eslint/no-explicit-any': 'off',
                'max-lines-per-function': 'off',
            },
        },
        {
            // Configuration for configuration files
            files: ['*.config.js', '*.config.ts', '.eslintrc.cjs'],
            rules: {
                '@typescript-eslint/no-var-requires': 'off',
            },
        },
    ],
    ignorePatterns: [
        'dist/',
        'node_modules/',
        '*.js', // Ignore compiled JS files in root
        'coverage/',
    ],
};
