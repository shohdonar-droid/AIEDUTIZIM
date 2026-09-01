const fs = require('fs');
let content = fs.readFileSync('telegram.ts', 'utf8');

const oldAutoLogic = `          let match = false;
          if (test.groupIds && test.groupIds.includes(student.groupId)) match = true;
          if (test.groupId && test.groupId === student.groupId) match = true;
          if (test.departmentIds && test.departmentIds.includes(student.departmentId)) match = true;
          if (test.departmentId && test.departmentId === student.departmentId) match = true;
          if (test.teacherId && test.teacherId === student.teacherId) match = true;
          if (match) myTests.push({...test, realType: 'auto_test'});`;

const newAutoLogic = `          let match = false;
          const hasGroupArray = Array.isArray(test.groupIds) && test.groupIds.length > 0;
          if (hasGroupArray || test.groupId) {
            match = (hasGroupArray && test.groupIds.includes(student.groupId)) || (test.groupId === student.groupId);
          } else {
            const hasDeptArray = Array.isArray(test.departmentIds) && test.departmentIds.length > 0;
            if (hasDeptArray || test.departmentId) {
              match = (hasDeptArray && test.departmentIds.includes(student.departmentId)) || (test.departmentId === student.departmentId);
            } else {
              const hasFacultyArray = Array.isArray(test.facultyIds) && test.facultyIds.length > 0;
              if (hasFacultyArray || test.facultyId) {
                match = (hasFacultyArray && test.facultyIds.includes(student.facultyId)) || (test.facultyId === student.facultyId);
              } else if (test.teacherId) {
                match = test.teacherId === student.teacherId;
              }
            }
          }
          if (match) myTests.push({...test, realType: 'auto_test'});`;

const oldExamLogic = `                let match = false;
                if (test.groupIds && test.groupIds.includes(student.groupId)) match = true;
                if (test.departmentIds && test.departmentIds.includes(student.departmentId)) match = true;
                if (test.organizationIds && test.organizationIds.includes(student.teacherId)) match = true;
                if (test.creatorId === student.teacherId || test.teacherId === student.teacherId) match = true;
                if (match) myTests.push({...test, realType: 'test'});`;

const newExamLogic = `                let match = false;
                const isAdminTest = test.creatorRole === 'admin' || !test.creatorRole;
                const isGlobalAdminTest = isAdminTest && (!test.organizationIds || test.organizationIds.length === 0) && (!test.departmentIds || test.departmentIds.length === 0) && (!test.groupIds || test.groupIds.length === 0);
                if (isGlobalAdminTest) {
                   match = true;
                } else {
                   const hasGroupFilter = (test.groupIds?.length || 0) > 0;
                   const hasDeptFilter = (test.departmentIds?.length || 0) > 0;
                   const hasOrgFilter = (test.organizationIds?.length || 0) > 0;
                   if (hasGroupFilter) {
                     match = test.groupIds?.includes(student.groupId || '') || false;
                   } else if (hasDeptFilter) {
                     match = test.departmentIds?.includes(student.departmentId || '') || false;
                   } else if (hasOrgFilter) {
                     match = test.organizationIds?.includes(student.teacherId || '') || false;
                   } else if (test.creatorId === student.teacherId || test.teacherId === student.teacherId) {
                     match = true;
                   }
                }
                if (match) myTests.push({...test, realType: 'test'});`;

content = content.replace(oldAutoLogic, newAutoLogic);
content = content.replace(oldExamLogic, newExamLogic);
fs.writeFileSync('telegram.ts', content);
console.log("Patched test filtering logic");
