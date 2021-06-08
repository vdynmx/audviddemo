

// const withCSS = require('@zeit/next-css')
const webpack = require('webpack');
const withPWA = require('next-pwa')
const isProd = process.env.NODE_ENV === 'production'
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})
// function HACK_removeMinimizeOptionFromCssLoaders(config) {
//   console.warn(
//     //'HACK: Removing `minimize` option from `css-loader` entries in Webpack config',
//   );
//   config.module.rules.forEach(rule => {
//     if (Array.isArray(rule.use)) {
//       rule.use.forEach(u => {
//         if (u.loader === 'css-loader' && u.options) {
//           delete u.options.minimize;
//         }
//       });
//     }
//   });
// }
const nextConfig = withPWA(
  {
    // cssLoaderOptions: {
    //   url: false,
    // },
    assetPrefix: isProd && process.env.CDN_URL_FOR_STATIC_RESOURCES ? process.env.CDN_URL_FOR_STATIC_RESOURCES : '',
    publicRuntimeConfig: {
      localeSubpaths: typeof process.env.LOCALE_SUBPATHS === 'string'
        ? process.env.LOCALE_SUBPATHS
        : 'none',
    },
    future: {
      webpack5: true,
    },
    webpack: function (config) {
      config.plugins.push(new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery',
        'window.jQuery': 'jquery'
      }))
      return config
    },
    pwa: {
      disable: process.env.NODE_ENV === 'production' ? false : true,
      dest: "public"
    },
    poweredByHeader:false,
  }
);

module.exports = withBundleAnalyzer(nextConfig)
