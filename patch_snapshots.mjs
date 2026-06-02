import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.resolve(process.cwd(), './src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Change firebase/firestore onSnapshot to your custom safeSnapshot
  if (content.includes("import {") && (content.includes("'firebase/firestore'") || content.includes('"firebase/firestore"'))) {
    if (content.includes('onSnapshot') && !file.includes('safeSnapshot.ts')) {
        const importRegex = /import\s+{([^}]+)}\s+from\s+['"]firebase\/firestore['"];?/g;
        content = content.replace(importRegex, (match, p1) => {
           let parts = p1.split(',').map(s => s.trim()).filter(s => s);
           if (parts.includes('onSnapshot')) {
              let idx = parts.indexOf('onSnapshot');
              parts.splice(idx, 1);
              
              changed = true;
              let relPath = path.relative(path.dirname(file), path.resolve(process.cwd(), './src/lib/safeSnapshot'));
              if (!relPath.startsWith('.')) relPath = './' + relPath;
              relPath = relPath.replace(/\\/g, '/');
              return `import { ${parts.join(', ')} } from 'firebase/firestore';\nimport safeOnSnapshot from '${relPath}';`;
           }
           return match;
        });
        
        if (changed) {
           content = content.replace(/\bonSnapshot\(/g, "safeOnSnapshot(");
        }
    }
  }
  
  if (changed) {
     fs.writeFileSync(file, content);
     console.log('Patched', file);
  }
});
