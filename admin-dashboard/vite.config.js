import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import inject from '@rollup/plugin-inject';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkgInfo from './package.json';

const dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

export default defineConfig(({ command, mode }) => {
    const prod = mode === 'prod';
    const devServerBase = command === 'serve' ? 'http://localhost:2576/_api/' : null;
    const base = devServerBase || process.env['AKSO_BASE'] || 'https://api.akso.org';

    if (devServerBase) console.log('\x1b[33musing dev server proxy\x1b[m');
    console.log(`\x1b[33mapi: ${base}\x1b[m`)

    return {
        resolve: {
            alias: {
                'yamdl': path.resolve('./yamdl/src'),
                'preact-debug-if-dev': prod
                    ? path.resolve(dirname, 'src/nothing.js')
                    : 'preact/debug',
                'react': 'preact/compat',
                'react-dom': 'preact/compat',

                // this is because cross-fetch insists on using a polyfill even though we don’t need
                // it according to caniuse
                'cross-fetch': path.resolve(dirname, 'src/compat/fetch.js'),

                // nodejs stuff
                'crypto': 'crypto-browserify',
                'path': 'path-browserify',
                'process': 'process/browser',
                'process/browser': 'process/browser',
                'stream': 'stream-browserify',
                'url': 'url/',
                'util': 'util/',
            },
        },
        plugins: [
            aksoConfig({
                buildTime: new Date().toISOString(),
                base,
                version: pkgInfo.version,
            }),
            preact(),
            {
                ...inject({
                    process: path.resolve(dirname, `src/compat/inject-process-${prod ? 'prod' : 'dev'}.js`),
                    global: path.resolve(dirname, 'src/compat/inject-global.js'),
                    setImmediate: path.resolve(dirname, 'src/compat/set-immediate.js'),
                    Buffer: ['buffer', 'Buffer'],

                    //include: ['*.js', '*.jsx', '*.mjs', '*.cjs', '*.ts', '*.tsx'],
                    exclude: ['**/*.less'],
                }),
                enforce: 'post',
            },
        ],
        server: {
            port: 2576,
            proxy: {
                '/_api': {
                    target: 'https://apitest.akso.org',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/_api/, ''),
                },
            },
        },
    };
});

function aksoConfig (config) {
    const fileContents = Object.entries(config)
        .map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`)
        .join('\n');

    return {
        name: 'akso-config',
        resolveId (id) {
            if (id === 'akso:config') return 'akso:config';
            return null;
        },
        load (id) {
            if (id === 'akso:config') return fileContents;
            return null;
        }
    };
}
