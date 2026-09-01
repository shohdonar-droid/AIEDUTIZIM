const fs = require('fs');
let content = fs.readFileSync('telegram.ts', 'utf8');
const oldLogic = `          if (test.groupIds && test.groupIds.includes(student.groupId)) match = true;
          if (test.groupId && test.groupId === student.groupId) match = true;
          if (test.departmentIds && test.departmentIds.includes(student.departmentId)) match = true;
          if (test.departmentId && test.departmentId === student.departmentId) match = true;
          if (test.teacherId && test.teacherId === student.teacherId) match = true;
          if (match) myTests.push({...test, realType: 'auto_test'});`;
console.log(content.includes(oldLogic));
