// scripts/patch-rollup.cjs
const fs = require('fs');
const path = require('path');

try {
  const distDir = path.resolve(process.cwd(), 'node_modules', 'rollup', 'dist');
  const nativePath = path.join(distDir, 'native.js');
  const nativeMjsPath = path.join(distDir, 'native.mjs');

  if (fs.existsSync(distDir)) {
    if (fs.existsSync(nativePath)) {
      const backupPath = nativePath + '.bak';
      try {
        if (!fs.existsSync(backupPath)) fs.copyFileSync(nativePath, backupPath);
      } catch (e) {
        // ignore backup errors
      }
      const stub = `// patched by scripts/patch-rollup.cjs to avoid attempting to load native binaries
// This stub prevents crash in environments where optional native binaries are not present.
module.exports = {
  // When rollup expects native helpers, degrade gracefully by throwing a clear error
  requireWithFriendlyError: function() {
    throw new Error('Native rollup binary disabled by patch.');
  }
};
`;
      fs.writeFileSync(nativePath, stub, 'utf8');
      console.log('Patched rollup native.js to avoid loading native binaries.');
    }

    // write ESM stub for environments that import '../../native.js' as an ESM module
    const esmStub = `// patched ESM stub for rollup native helpers
export default {
  requireWithFriendlyError: () => { throw new Error('Native rollup binary disabled by patch (ESM stub).'); }
};
`;
    try {
      fs.writeFileSync(nativeMjsPath, esmStub, 'utf8');
      console.log('Wrote rollup native.mjs ESM stub.');
    } catch (e) {
      console.warn('Could not write native.mjs ESM stub:', e && e.message ? e.message : e);
    }
  } else {
    console.log('rollup dist directory not present; nothing to patch.');
  }
} catch (err) {
  console.error('Failed to patch rollup native files:', err && err.message ? err.message : err);
  process.exit(0);
}
