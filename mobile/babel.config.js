// Hermes (RN's bytecode compiler) refuses to parse dynamic import() with a
// non-string-literal argument. @supabase/supabase-js >= 2.106 ships exactly
// that pattern to lazy-load @opentelemetry/api. We don't use OTEL tracing in
// mobile, so rewrite the expression to a no-op before it reaches Hermes.
function stripHermesIncompatibleDynamicImport({ types: t }) {
  return {
    name: 'strip-hermes-incompatible-dynamic-import',
    visitor: {
      CallExpression(path) {
        const { node } = path;

        if (node.callee.type !== 'Import') return;
        if (node.arguments.length !== 1) return;

        const arg = node.arguments[0];
        if (arg.type !== 'Identifier' || arg.name !== 'OTEL_PKG') return;

        path.replaceWith(
          t.callExpression(
            t.memberExpression(t.identifier('Promise'), t.identifier('resolve')),
            [t.nullLiteral()]
          )
        );
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [stripHermesIncompatibleDynamicImport],
  };
};
