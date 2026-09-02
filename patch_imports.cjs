const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');
code = code.replace('getDocs,', 'collection, query, where, getDocs,');
fs.writeFileSync('telegram.ts', code);
console.log("Patched imports");
