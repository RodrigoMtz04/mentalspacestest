// scripts/patch-rollup.js
const fs = require('fs');
const path = require('path');

try {
  const nativePath = path.resolve(process.cwd(), 'node_modules', 'rollup', 'dist', 'native.js');
  if (fs.existsSync(nativePath)) {
    const backupPath = nativePath + '.bak';
    try {
      if (!fs.existsSync(backupPath)) fs.copyFileSync(nativePath, backupPath);
    } catch (e) {
      // ignore backup errors
    }
    const stub = `// patched by scripts/patch-rollup.js to avoid attempting to load native binaries
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
  } else {
    console.log('rollup native.js not present; nothing to patch.');
  }
} catch (err) {
  console.error('Failed to patch rollup native.js:', err && err.message ? err.message : err);
  process.exit(0);
}

