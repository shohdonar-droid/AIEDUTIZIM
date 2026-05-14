import fs from 'fs';

let admin = fs.readFileSync('src/pages/admin/AdminTests.tsx', 'utf8');
admin = admin.replace(/const defaultManualTemplate = `\+\+\+\+ savol matni[\s\S]*?nato'g'ri_variant`;/g, 
`const defaultManualTemplate = \`++++
 savol matni
====
nato'g'ri_variant
====
#to'g'ri_variant
====
nato'g'ri_variant
====
nato'g'ri_variant\`;`);
admin = admin.replace(/placeholder="\+\+\+\+ savol matni&#10;====&#10;nato'g'ri_variant&#10;====&#10;#to'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;====">/g, 
`placeholder="++++&#10; savol matni&#10;====&#10;nato'g'ri_variant&#10;====&#10;#to'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;====&#10;nato'g'ri_variant">`);
admin = admin.replace(/placeholder="\+\+\+\+ savol matni&#10;====&#10;nato'g'ri_variant&#10;====&#10;#to'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;===="\//g, 
`placeholder="++++&#10; savol matni&#10;====&#10;nato'g'ri_variant&#10;====&#10;#to'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;====&#10;nato'g'ri_variant"\//`);

fs.writeFileSync('src/pages/admin/AdminTests.tsx', admin);

let teacher = fs.readFileSync('src/pages/teacher/TeacherTests.tsx', 'utf8');
teacher = teacher.replace(/const defaultManualTemplate = `\+\+\+\+ savol matni[\s\S]*?nato'g'ri_variant`;/g, 
`const defaultManualTemplate = \`++++
 savol matni
====
nato'g'ri_variant
====
#to'g'ri_variant
====
nato'g'ri_variant
====
nato'g'ri_variant\`;`);
teacher = teacher.replace(/placeholder="\+\+\+\+ savol matni&#10;====&#10;nato'g'ri_variant&#10;====&#10;#to'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;====">/g, 
`placeholder="++++&#10; savol matni&#10;====&#10;nato'g'ri_variant&#10;====&#10;#to'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;====&#10;nato'g'ri_variant">`);
teacher = teacher.replace(/placeholder="\+\+\+\+ savol matni&#10;====&#10;nato'g'ri_variant&#10;====&#10;#to'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;===="\//g, 
`placeholder="++++&#10; savol matni&#10;====&#10;nato'g'ri_variant&#10;====&#10;#to'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;====&#10;nato'g'ri_variant"\//`);

fs.writeFileSync('src/pages/teacher/TeacherTests.tsx', teacher);
