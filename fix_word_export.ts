import fs from 'fs';

function updateWordExport(file: string) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<div>\+\+\+\+ \$\{q\.text\}<\/div>/g, '<div>++++<br/> ${q.text}</div>');
  content = content.replace(/<div>\+\+\+\+ \\r\\n\$\{q\.text\}<\/div>/g, '<div>++++<br/> ${q.text}</div>');
  fs.writeFileSync(file, content);
}

updateWordExport('src/components/SubjectsManager.tsx');
updateWordExport('src/pages/admin/AdminTests.tsx');
updateWordExport('src/pages/admin/AdminJurnal.tsx');
updateWordExport('src/pages/teacher/TeacherTests.tsx');
updateWordExport('src/pages/teacher/TeacherQuizizz.tsx');
