import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/AdminQuizizz.tsx', 'utf8');

const importRegex = /import \{ collection, addDoc, getDocs, doc, setDoc, query, where, onSnapshot, serverTimestamp, deleteDoc \} from 'firebase\/firestore';/;
content = content.replace(importRegex, `import { collection, addDoc, getDocs, doc, setDoc, query, where, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';\nimport { handleFirestoreError, OperationType } from '../../lib/firebase';`);

const useEffectRegex = /  useEffect\(\(\) => \{\s*if \(\!user\) return;\s*const orgId = user\.role === 'staff' \? user\.teacherId \|\| user\.uid : user\.uid;\s*const unsub = onSnapshot\(collection\(db, 'quiz_history'\), \(snap\) => \{\s*const qs = snap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\);\s*qs\.sort\(\(a: any, b: any\) => \(b\.createdAt\?\.toMillis\(\) \|\| 0\) - \(a\.createdAt\?\.toMillis\(\) \|\| 0\)\);\s*setQuizzes\(qs\);\s*\}\);\s*return unsub;\s*\}, \[user\]\);/;

const replacementEffect = `  useEffect(() => {
    if (!user) return;
    const orgId = user.role === 'staff' ? user.teacherId || user.uid : user.uid;
    
    const unsub = onSnapshot(collection(db, 'quiz_history'), async (snap) => {
       try {
           const uSnap = await getDocs(collection(db, 'users'));
           const usersMap: any = {};
           uSnap.docs.forEach(d => {
              const ud = d.data();
              usersMap[d.id] = ud;
           });
           
           const qs = snap.docs.map(d => ({ 
              id: d.id, 
              ...d.data(), 
              creatorName: usersMap[d.data().teacherId]?.displayName || usersMap[d.data().teacherId]?.name || 'Noma\\'lum',
              creatorRole: usersMap[d.data().teacherId]?.role || 'Noma\\'lum'
           }));
           qs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
           setQuizzes(qs);
       } catch (err) {
           handleFirestoreError(err, OperationType.LIST, 'admin-quizizz');
       }
    });
    return unsub;
  }, [user]);`;

content = content.replace(useEffectRegex, replacementEffect);

// Wait, let's look at the JSX for the table inside AdminQuizizz.tsx
const tableHeaderRegex = /<th className="px-6 py-4">Test Nomi<\/th>\s*<th className="px-6 py-4">PIN KOD<\/th>/;
content = content.replace(tableHeaderRegex, `<th className="px-6 py-4">Test Nomi</th>
                        <th className="px-6 py-4">Yaratuvchi</th>
                        <th className="px-6 py-4">PIN KOD</th>`);

const qatnashchilarHeaderRegex = /<th className="px-6 py-4">Testlar Soni<\/th>\s*<th className="px-6 py-4">Yaratilgan vaqti<\/th>/;
content = content.replace(qatnashchilarHeaderRegex, `<th className="px-6 py-4">Testlar Soni</th>
                        <th className="px-6 py-4">Qatnashchilar</th>
                        <th className="px-6 py-4">Yaratilgan vaqti</th>`);

const tableBodyRegex = /<td className="px-6 py-4">\s*<div className="font-bold text-gray-900">\{quiz\.title\}<\/div>\s*<div className="text-gray-500 max-w-xs truncate" title=\{quiz\.context\}>\{quiz\.context \|\| "Qo'shimcha matn mavjud emas"\}<\/div>\s*<\/td>\s*<td className="px-6 py-4 font-black text-blue-600 tracking-widest">\{quiz\.pin \|\| 'Yo\\'q'\}<\/td>/;
content = content.replace(tableBodyRegex, `<td className="px-6 py-4">
                              <div className="font-bold text-gray-900">{quiz.title}</div>
                              <div className="text-gray-500 max-w-xs truncate" title={quiz.context}>{quiz.context || "Qo'shimcha matn mavjud emas"}</div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="font-bold text-gray-700">{quiz.creatorName}</div>
                              <div className="text-xs text-gray-400 capitalize">{quiz.creatorRole}</div>
                           </td>
                           <td className="px-6 py-4 font-black text-blue-600 tracking-widest">{quiz.pin || 'Yo\\'q'}</td>`);

const testlarSoniRegex = /<td className="px-6 py-4 font-bold text-gray-700">\{quiz\.questions\?\.length \|\| 0\} ta<\/td>\s*<td className="px-6 py-4 text-gray-500 font-medium font-mono">/;
content = content.replace(testlarSoniRegex, `<td className="px-6 py-4 font-bold text-gray-700">{quiz.questions?.length || 0} ta</td>
                           <td className="px-6 py-4 font-bold text-green-600">{quiz.participants?.length || 0} ta</td>
                           <td className="px-6 py-4 text-gray-500 font-medium font-mono">`);

fs.writeFileSync('src/pages/admin/AdminQuizizz.tsx', content);
