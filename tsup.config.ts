import { defineConfig } from 'tsup';

export default defineConfig([
    // Core package (framework-agnostic)
    {
        entry: ['src/index.ts'],
        format: ['cjs', 'esm'],
        dts: true,
        clean: true,
        sourcemap: true,
        external: ['vue', 'react'],
    },
    // Vue adapter
    {
        entry: ['src/vue/index.ts'],
        format: ['cjs', 'esm'],
        dts: true,
        sourcemap: true,
        external: ['vue'],
        outDir: 'dist',
        outExtension({ format }) {
            return {
                js: format === 'cjs' ? '.vue.js' : '.vue.mjs',
            };
        },
        esbuildOptions(options) {
            options.outbase = './src/vue';
        },
    },
    // React adapter
    {
        entry: ['src/react/index.ts'],
        format: ['cjs', 'esm'],
        dts: true,
        sourcemap: true,
        external: ['react'],
        outDir: 'dist',
        outExtension({ format }) {
            return {
                js: format === 'cjs' ? '.react.js' : '.react.mjs',
            };
        },
        esbuildOptions(options) {
            options.outbase = './src/react';
        },
    },
]);