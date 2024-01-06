const pkg = require('./package.json');

const browserTargets = {
    // >1% on 2022-06-12
    chrome: '97',
    firefox: '96',
    safari: '14',
};

module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: browserTargets,
                useBuiltIns: 'usage',
                corejs: pkg.dependencies['core-js'],
            },
        ],
        [
            '@babel/preset-react',
            { pragma: 'h' },
        ],
    ],
    plugins: [],
};

