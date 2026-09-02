const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const regex = /const \{ collection, query, where, getDocs \} = require\('firebase\/firestore'\);/;
code = code.replace(regex, '');

fs.writeFileSync('telegram.ts', code);
console.log("Patched getAuthedUser import");
