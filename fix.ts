import * as fs from 'fs';
let content = fs.readFileSync('src/pages/teacher/TeacherQuizizz.tsx', 'utf8');
content = content.replace(/reduce\(\(acc: number, ans: any\) => acc \+ Number\(ans\?\.timeTaken \|\| 0\), 0\)/g, 'reduce((acc: number, ans: any) => acc + Number(ans?.timeTaken || 0), 0) as number');
content = content.replace(/participants\.sort\(\(a,b\)/g, 'participants.sort((a: any, b: any)');
fs.writeFileSync('src/pages/teacher/TeacherQuizizz.tsx', content);
