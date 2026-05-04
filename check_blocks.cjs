const fs = require('fs');
const content = fs.readFileSync('src/pages/admin/AdminTests.tsx', 'utf-8');
const lines = content.split('\n');

function count(start, end) {
   let o = 0, c = 0;
   for(let i=start-1; i<end; i++) {
      o += (lines[i].match(/<div/g) || []).length;
      c += (lines[i].match(/<\/div>/g) || []).length;
   }
   return {o, c};
}

let last_start = 615;
for(let i=615; i<=856; i+=10) {
   console.log('AI chunk', i, count(last_start, i));
}


