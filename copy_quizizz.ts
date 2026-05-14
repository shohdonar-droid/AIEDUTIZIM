import fs from 'fs';
fs.copyFileSync('src/pages/teacher/TeacherQuizizz.tsx', 'src/pages/admin/AdminQuizizz.tsx');
let content = fs.readFileSync('src/pages/admin/AdminQuizizz.tsx', 'utf8');
content = content.replace(/TeacherQuizizz/g, 'AdminQuizizz');
// Admin sees all quizzes
content = content.replace(/query\(collection\(db, 'quiz_history'\), where\('teacherId', '==', orgId\)\)/g, "collection(db, 'quiz_history')");
// When admin creates quiz
content = content.replace(/const orgId = user\?\.role === 'staff' \? user\.teacherId \|\| user\.uid : user\?\.uid;/g, "const orgId = user?.uid;");

fs.writeFileSync('src/pages/admin/AdminQuizizz.tsx', content);
