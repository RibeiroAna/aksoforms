const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const EsLintPlugin = require('eslint-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const TerserPlugin = require('terser-webpack-plugin');
const autoprefixer = require('autoprefixer');
const express = require('express');
const webpack = require('webpack');
const pkgInfo = require('./package.json');

const browserTargets = {
    // >1% on 2022-06-12
    chrome: '97',
    firefox: '96',
    safari: '14',
};

const aksoBase = process.env['AKSO_BASE'] || 'https://api.akso.org/v1/';
const isDevServer = process.env.WEBPACK_SERVE;

console.log(`\x1b[32mAKSO_BASE: ${aksoBase}\x1b[m`);
if (isDevServer) console.warn(`\x1b[33musing dev server api proxy\x1b[m`);
global.aksoConfig = {
    base: isDevServer ? 'http://localhost:2576/_api/' : aksoBase,
};

module.exports = function (env, argv) {
    const analyze = !!argv.env.analyze;
    const prod = !!argv.env.prod || analyze;

    if (!prod) console.warn('\x1b[33mbuilding for development\x1b[m');

    const entry = {};
    entry.entry = './src/fe/index.jsx';
    if (prod) {
        entry.unsupported = './src/unsupported.js';
    }

    return {
        mode: prod ? 'production' : 'development',
        entry,
        output: {
            filename: prod ? '[name].[fullhash].js' : '[name].js',
            chunkFilename: (prod && !analyze) ? '[id].[chunkhash].js' : '[name].js',
            globalObject: 'this',
        },
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.json', '.less'],
            alias: {
                // this is because cross-fetch insists on using a polyfill even though we don’t need
                // it according to caniuse
                'cross-fetch': path.resolve(__dirname, 'src/fetch.js'),

                'react': 'preact/compat',
                'react-dom': 'preact/compat',

                'yamdl': path.resolve(__dirname, 'yamdl/src'),
                'preact-debug-if-dev': prod
                    ? path.resolve(__dirname, 'src/nothing.js')
                    : 'preact/debug',

                // importing 'process/browser' fails due to the fallback below!
                // it’ll try to load process/browser/browser. so, stop doing that
                'process/browser': require.resolve('process/browser'),
            },
            fallback: {
                buffer: require.resolve('buffer/'),
                crypto: require.resolve('crypto-browserify'),
                stream: require.resolve('stream-browserify'),
                path: require.resolve('path-browserify'),
                process: require.resolve('process/browser'),
                util: require.resolve('util/'),
                url: require.resolve('url/'),
            },
        },
        devtool: prod ? 'source-map' : 'inline-source-map',
        stats: {
            preset: prod ? 'minimal' : undefined,
            errorDetails: true,
            children: true,
        },
        optimization: {
            minimizer: [
                new TerserPlugin({
                    parallel: true,
                    terserOptions: {
                        safari10: true
                    }
                }),
                new CssMinimizerPlugin(),
            ],
        },
        plugins: [
            new AksoPlugin(),
            new webpack.ProvidePlugin({
                process: 'process/browser',
                Buffer: ['buffer', 'Buffer'],
            }),
            new MiniCssExtractPlugin({
                filename: prod ? '[name].[fullhash].css' : '[name].css',
                chunkFilename: prod ? '[id].[fullhash].css' : '[name].css',
                ignoreOrder: true,
            }),
            new HtmlWebpackPlugin({
                template: 'src/fe/index.html',
                inject: 'body',
                chunks: ['unsupported', 'entry'],
            }),
            analyze && new BundleAnalyzerPlugin(),
            // stop moment from loading all the locales
            new webpack.IgnorePlugin({
                resourceRegExp: /^\.\/locale$/,
                contextRegExp: /moment$/,
            }),
            new EsLintPlugin({
                exclude: ['node_modules', 'src/unsupported.js'],
            }),
        ].filter(x => x),
        module: {
            rules: [
                {
                    test: /()\.m?jsx?$/,
                    // exclude val-loader stuff
                    // exclude unsupported.js
                    // exclude all node_modules
                    exclude: /unsupported\.js|node_modules/,
                    use: [
                        {
                            loader: 'babel-loader',
                        },
                    ],
                },
                {
                    // some dependencies seem to have syntax not supported by MS Edge
                    test: /node_modules\/csv-stringify\/.+\.js$/,
                    use: [{
                        loader: 'babel-loader',
                        options: {
                            plugins: [
                                '@babel/plugin-proposal-object-rest-spread',
                            ],
                        },
                    }],
                },
                {
                    test: /noextract\.css$/,
                    use: [
                        { loader: 'to-string-loader' },
                        {
                            loader: 'css-loader',
                            options: { url: false },
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    plugins: [
                                        autoprefixer({
                                            env: browserTargets
                                        })
                                    ],
                                },
                            }
                        },
                    ],
                },
                {
                    test: /\.(c|le)ss$/,
                    exclude: /noextract\.css$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                        },
                        {
                            loader: 'css-loader',
                            options: {
                                url: false,
                                sourceMap: true
                            },
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    plugins: [
                                        autoprefixer({
                                            env: browserTargets
                                        })
                                    ],
                                },
                            },
                        },
                        {
                            loader: 'less-loader',
                            options: { sourceMap: true },
                        }
                    ]
                }
            ]
        },
        devServer: {
            static: {
                directory: path.join(__dirname, 'src'),
            },
            port: 2576,
            proxy: {
                '/_api': {
                    target: aksoBase,
                    pathRewrite: { '^/_api': '' },
                    changeOrigin: true,
                },
            },
            magicHtml: false,
            historyApiFallback: true,
            setupMiddlewares (middlewares, server) {
                server.app.use('/assets', express.static('assets'));
                server.app.use('/notices', express.static('notices'));
                server.app.use('/apple-touch-icon.png', express.static('assets/apple-touch-icon.png'));

                return middlewares;
            }
        },
    };
};

class AksoPlugin {
    apply (compiler) {
        const config = {
            buildTime: new Date().toISOString(),
            base: aksoBase,
            version: getGitCommitHash(),
        };
        const fileContents = Object.entries(config)
            .map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`)
            .join('\n');

        compiler.hooks.compilation.tap('AksoPlugin', (compilation, { normalModuleFactory }) => {
            normalModuleFactory.hooks.resolveForScheme.for('akso').tap('AksoPlugin', res => {
                if (res.resource === 'akso:config') {
                    res.resource = `data:text/javascript;base64,${btoa(fileContents)}`;
                    return true;
                }
            });
            normalModuleFactory.hooks.resolveForScheme.for('worker-url').tap('AksoPlugin', res => {
                const resource = res.resource.substring('worker-url:'.length);
                res.resource = `worker-loader!${resource}`;
                return true;
            });
        });
    }
}

function getGitCommitHash () {
    return childProcess.execSync('git rev-parse --short HEAD', {
        cwd: __dirname,
        encoding: 'utf-8',
    }).trim();
}