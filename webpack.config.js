const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

/**
 * SillyTavern's core scripts (e.g. `../../../../script.js`,
 * `../../../../slash-commands/SlashCommandParser.js`) live outside this
 * extension and are loaded by the host page as ES modules. Webpack must NOT
 * try to bundle them — instead, they need to be left as runtime `import`
 * statements in the output bundle.
 *
 * Because all of our source files live one directory deep (in `src/`) and
 * the bundled output also lives one directory deep (in `dist/`), the
 * relative paths used in `import` statements remain valid as-is when copied
 * verbatim into the output. So we just mark every `../`-prefixed request as
 * an external module and pass the request through unchanged.
 */
const externalize = function ({ context, request }, callback) {
    // Exclude node_modules helpers (e.g. css-loader runtime, ajv internals) —
    // those still need to be bundled. Only host-page (SillyTavern) modules
    // referenced from our own source via a `../` relative path get
    // externalized. We detect "our own source" by checking that the issuer's
    // `context` directory isn't inside node_modules.
    const fromNodeModules = context && context.includes(`${path.sep}node_modules${path.sep}`);
    if (!fromNodeModules && request && request.startsWith('../') && !request.includes('node_modules')) {
        return callback(null, 'module ' + request);
    }
    callback();
};

module.exports = {
    entry: path.join(__dirname, 'src/index.js'),
    devtool: false,
    target: 'web',
    experiments: {
        outputModule: true,
    },
    output: {
        path: path.join(__dirname, 'dist/'),
        filename: 'index.js',
        module: true,
        chunkFormat: 'module',
        library: {
            type: 'module',
        },
    },
    externalsType: 'module',
    externals: [externalize],
    resolve: {
        extensions: ['.js'],
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.html$/,
                use: { loader: 'html-loader' },
            },
        ],
    },
    plugins: [],
    optimization: {
        minimize: false,
        minimizer: [
            new TerserPlugin({ extractComments: false, terserOptions: { mangle: false } }),
        ],
    },
    performance: {
        hints: false,
    },
};
