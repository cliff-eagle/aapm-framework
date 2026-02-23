import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['packages/*/src/**/*.test.ts'],
        exclude: ['**/._*'],
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            include: ['packages/*/src/**/*.ts'],
            exclude: ['**/*.test.ts', '**/*.d.ts'],
        },
    },
});
