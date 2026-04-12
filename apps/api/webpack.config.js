const swcDefaultConfig =
  require('@nestjs/cli/lib/compiler/defaults/swc-defaults').swcDefaultsFactory()
    .swcOptions;

module.exports = function (options) {
  const originalExternals = options.externals || [];

  return {
    ...options,
    externals: originalExternals.map((externalFn) => {
      if (typeof externalFn !== 'function') return externalFn;
      return function (ctx, callback) {
        if (ctx.request && /^@repo\//.test(ctx.request)) {
          return callback();
        }
        return externalFn(ctx, callback);
      };
    }),
    resolve: {
      ...options.resolve,
      extensionAlias: {
        '.js': ['.ts', '.js'],
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'swc-loader',
            options: swcDefaultConfig,
          },
        },
      ],
    },
  };
};
