import fs from 'fs';

// 1. Fix AdminQuizizz.tsx
let adminQuizizz = fs.readFileSync('src/pages/admin/AdminQuizizz.tsx', 'utf8');

adminQuizizz = adminQuizizz.replace(
  /const handleDeleteTest = async \(id: string\) => \{[\s\S]*?^\s*\};\s*$/m,
  `const handleDeleteTest = async (id: string) => {
    if(!window.confirm("Rostdan ham ushbu testni o'chirishni xohlaysizmi?")) return;
    try {
      // First, try to find any active sessions for this quiz and delete them
      const q = query(collection(db, 'quiz_sessions'), where('historyId', '==', id));
      const snaps = await getDocs(q);
      const delPromises = snaps.docs.map(d => deleteDoc(d.ref));
      await Promise.all(delPromises);
      
      // Delete from quiz_history
      await deleteDoc(doc(db, 'quiz_history', id));
    } catch(err: any) {
      handleFirestoreError(err, OperationType.DELETE, \`quiz_history/\${id}\`);
      alert("Xatolik yuz berdi: " + err.message);
    }
  };`
);
fs.writeFileSync('src/pages/admin/AdminQuizizz.tsx', adminQuizizz);

// 2. Fix AdminJurnal.tsx
let adminJurnal = fs.readFileSync('src/pages/admin/AdminJurnal.tsx', 'utf8');

adminJurnal = adminJurnal.replace(
  /const \[activeTab, setActiveTab\] = useState<'course' \| 'test' \| 'quizizz'>\('course'\);/,
  `const [activeTab, setActiveTab] = useState<'course' | 'test'>('course');`
);

adminJurnal = adminJurnal.replace(
  /<button\s*onClick=\{\(\) => setActiveTab\('quizizz'\)\}[\s\S]*?Quizizz\s*<\/button>/g,
  ''
);

// We should also remove the quizizz content block
// Find where the quizizz tab content starts and safely remove it.
const quizizzContentStart = `// Quizizz History Tab`;
if (adminJurnal.includes(quizizzContentStart)) {
    // Try regex
    adminJurnal = adminJurnal.replace(/\{\s*activeTab === 'quizizz' && \([\s\S]*?\}\s*<\/div>\s*\)\s*\}/, '');
    
    // There is no activeTab === 'quizizz' after this
}

fs.writeFileSync('src/pages/admin/AdminJurnal.tsx', adminJurnal);
