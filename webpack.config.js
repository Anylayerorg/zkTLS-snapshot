const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const target = env?.target || 'chrome';
  
  // Get notary URL from environment variable
  // Defaults to public notary for dev/test
  // Override via: TLSNOTARY_NOTARY_URL=https://notary-staging.anylayer.com npm run build
  const notaryUrl = process.env.TLSNOTARY_NOTARY_URL || 'https://notary.pse.dev';
  
  console.log(`[Webpack] Building with notary URL: ${notaryUrl}`);

  return {
    entry: {
      background: './src/background/background.ts',
      popup: './src/popup/popup.tsx',
      options: './src/options/options.tsx',
      content: './src/content/content.ts',
      injected: './src/content/injected.ts'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name]/[name].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: false,
              compilerOptions: {
                noEmit: false
              }
            }
          },
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/popup/popup.html',
        filename: 'popup/popup.html',
        chunks: ['popup']
      }),
      new HtmlWebpackPlugin({
        template: './src/options/options.html',
        filename: 'options/options.html',
        chunks: ['options']
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'manifest.json', to: 'manifest.json' },
          { from: 'public/icons', to: 'icons' }
        ]
      }),
      // Inject TLSNOTARY_NOTARY_URL as environment variable
      // This allows build-time configuration per environment
      new webpack.DefinePlugin({
        'process.env.TLSNOTARY_NOTARY_URL': JSON.stringify(notaryUrl),
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
      })
    ],
    devtool: isProduction ? false : 'source-map',
    optimization: {
      minimize: isProduction
    }
  };
};

