const fs = require('fs');
let code = fs.readFileSync('telegram.ts', 'utf8');

const oldLogic = `          const hasGroupArray = Array.isArray(test.groupIds) && test.groupIds.length > 0;
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
          }`;

const newLogic = `          const isAdminTest = test.creatorRole === 'admin' || !test.creatorRole || test.creatorName === 'Admin';
          const isGlobalAdminTest = isAdminTest && (!test.facultyIds || test.facultyIds.length === 0) && (!test.departmentIds || test.departmentIds.length === 0) && (!test.groupIds || test.groupIds.length === 0);
          
          if (isGlobalAdminTest) {
             match = true;
          } else {
             const hasGroupFilter = (test.groupIds?.length || 0) > 0;
             const hasDeptFilter = (test.departmentIds?.length || 0) > 0;
             const hasFacultyFilter = (test.facultyIds?.length || 0) > 0;
             
             if (hasGroupFilter) {
               match = test.groupIds?.includes(student.groupId || '') || false;
             } else if (hasDeptFilter) {
               match = test.departmentIds?.includes(student.departmentId || '') || false;
             } else if (hasFacultyFilter) {
               match = test.facultyIds?.includes(student.facultyId || '') || false;
             } else if (test.creatorId === student.teacherId || test.teacherId === student.teacherId) {
               match = true;
             }
          }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('telegram.ts', code);
console.log("Patched auto tests logic");
