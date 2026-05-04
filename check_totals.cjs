const fs = require('fs');

const content = fs.readFileSync('src/pages/teacher/TeacherTests.tsx', 'utf-8');
const lines = content.split('\n');
let o = 0, c = 0;
for(let i=0; i<lines.length; i++) {
   o += (lines[i].match(/<div/g) || []).length;
   c += (lines[i].match(/<\/div>/g) || []).length;
}
console.log('Total divs:', o, c);

