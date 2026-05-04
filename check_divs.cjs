const fs = require('fs');

const content = fs.readFileSync('src/pages/admin/AdminTests.tsx', 'utf-8');
let stack = [];
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  let match;
  let re = /(<div)|(<\/div>)/g;
  while ((match = re.exec(line)) !== null) {
      if (match[1]) {
         stack.push(i + 1);
      } else if (match[2]) {
         if (stack.length > 0) stack.pop();
         else console.log(`Unmatched close at line ${i + 1}`);
      }
  }
}
console.log('Unmatched OPEN at line:', stack[stack.length - 1]);


