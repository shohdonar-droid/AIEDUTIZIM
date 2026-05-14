import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/AdminJurnal.tsx', 'utf8');

// Change sort order to ascending
content = content.replace(
  /allQuizizz\.sort\(\(a: any, b: any\) => \(b\.createdAt\?\.toMillis\(\) \|\| 0\) - \(a\.createdAt\?\.toMillis\(\) \|\| 0\)\);/,
  `allQuizizz.sort((a: any, b: any) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));`
);

// Replace Quizizz list with table
const listRegex = /<div className="space-y-4">[\s\S]*?\{quizizzHistory\.length === 0 && \([\s\S]*?Hech qanday Quizizz ma'lumoti topilmadi\.<\/div>\s*\)\}\s*<\/div>/;

const tableReplacement = `<div className="overflow-x-auto">
                    <table className="w-full text-left bg-white border border-gray-100 rounded-2xl">
                       <thead className="bg-gray-50/50">
                          <tr>
                             <th className="px-4 py-4 font-black text-gray-400 text-xs uppercase tracking-widest text-center w-16">T/r</th>
                             <th className="px-4 py-4 font-black text-gray-400 text-xs uppercase tracking-widest">Test nomi</th>
                             <th className="px-4 py-4 font-black text-gray-400 text-xs uppercase tracking-widest">Yaratilgan vaqti</th>
                             <th className="px-4 py-4 font-black text-gray-400 text-xs uppercase tracking-widest">PIN / Yaratuvchi</th>
                             <th className="px-4 py-4 font-black text-gray-400 text-xs uppercase tracking-widest text-center">Savollar</th>
                             <th className="px-4 py-4 font-black text-gray-400 text-xs uppercase tracking-widest text-center">Qatnashchilar</th>
                             <th className="px-4 py-4 font-black text-gray-400 text-xs uppercase tracking-widest text-right">Amallar</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                         {quizizzHistory.map((quiz, idx) => (
                            <tr key={quiz.id} className="hover:bg-gray-50/30 transition-colors">
                               <td className="px-4 py-4 text-center text-gray-400 font-bold">{idx + 1}</td>
                               <td className="px-4 py-4">
                                  <p className="font-bold text-gray-900">{quiz.title}</p>
                               </td>
                               <td className="px-4 py-4 text-sm text-gray-500 font-medium whitespace-nowrap">
                                  {quiz.createdAt ? new Date(quiz.createdAt.toMillis()).toLocaleString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '-'}
                               </td>
                               <td className="px-4 py-4">
                                  <div className="flex flex-col">
                                     <span className="text-blue-500 font-bold">{quiz.pin || quiz.id.substring(0,8).toUpperCase()}</span>
                                     <span className="text-xs text-gray-500">{quiz.creatorObj?.name || 'Noma\\'lum'}</span>
                                  </div>
                               </td>
                               <td className="px-4 py-4 text-center">
                                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold whitespace-nowrap">{quiz.questions?.length || 0} ta</span>
                               </td>
                               <td className="px-4 py-4 text-center font-bold text-green-600">
                                  {quiz.participants?.length || 0}
                               </td>
                               <td className="px-4 py-4">
                                  <div className="flex gap-2 justify-end">
                                     <button 
                                       onClick={() => {
                                          if (!quiz.questions || quiz.questions.length === 0) return alert("Test savollari yo'q");
                                          
                                          let content = \`<html><head><meta charset="UTF-8"></head><body><h2>\${quiz.title}</h2><br/>\`;
                                          quiz.questions.forEach((q: any) => {
                                            content += \`<div>++++<br/>\${q.text}</div>\`;
                                            q.options.forEach((opt: string, optIdx: number) => {
                                              const isCorrect = q.correctIdx === optIdx;
                                              const prefix = isCorrect ? '#' : '';
                                              content += \`<div>====</div><div>\${prefix}\${opt}</div>\`;
                                            });
                                            content += '<br/>';
                                          });
                                          content += '</body></html>';
                                          const blob = new Blob(['\\ufeff', content], { type: 'application/msword;charset=utf-8' });
                                          const url = URL.createObjectURL(blob);
                                          const link = document.createElement('a');
                                          link.href = url;
                                          link.download = \`Test_\${quiz.title.replace(/\\s+/g, '_')}.doc\`;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                          URL.revokeObjectURL(url); }} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-bold text-xs hover:bg-blue-100 transition-colors whitespace-nowrap"
                                     >Word</button>
                                     {quiz.participants?.length > 0 && (
                                       <button
                                         onClick={() => {
                                             if (!quiz.participants || quiz.participants.length === 0) return alert("Qatnashuvchilar yo'q");
                                             const pData = quiz.participants.map((p: any) => {
                                               let correctCount = 0;
                                               let totalTime = 0;
                                               const row: any = { "F.I.SH": p.name || p.displayName || 'Noma\\'lum' };
                                               
                                               quiz.questions?.forEach((q: any, i: number) => {
                                                  const ans = p.answers?.[i] || Object.values(p.answers || {}).find((a: any) => a.questionIdx === i);
                                                  const actualAns = (p.answers && Array.isArray(p.answers)) ? p.answers[i] : (p.answers ? p.answers[i] : null);
                                                  if (actualAns?.isCorrect) {
                                                     correctCount++;
                                                     totalTime += Number(actualAns.timeTaken || 0);
                                                     row[\`\${i+1}-test\`] = 'To\\'g\\'ri';
                                                  } else if (actualAns) {
                                                     row[\`\${i+1}-test\`] = 'Xato';
                                                  } else {
                                                     row[\`\${i+1}-test\`] = 'Belgilanmagan';
                                                  }
                                               });
                                               row["To'g'ri javoblar"] = correctCount;
                                               row["Sarflangan vaqt (s)"] = (totalTime).toFixed(2);
                                               return row;
                                             });
                                             pData.sort((a: any, b: any) => {
                                               const diff = b["To'g'ri javoblar"] - a["To'g'ri javoblar"];
                                               if (diff !== 0) return diff;
                                               return Number(a["Sarflangan vaqt (s)"]) - Number(b["Sarflangan vaqt (s)"]);
                                             });
                                             const worksheet = XLSX.utils.json_to_sheet(pData);
                                             const workbook = XLSX.utils.book_new();
                                             XLSX.utils.book_append_sheet(workbook, worksheet, "Natijalar");
                                             XLSX.writeFile(workbook, \`Natija_\${quiz.title.replace(/\\s+/g,'_')}.xlsx\`);
                                         }}
                                         className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-bold text-xs hover:bg-green-100 transition-colors whitespace-nowrap"
                                       >Excel</button>
                                     )}
                                     <button 
                                       onClick={() => setViewedQuizResult(quiz)} 
                                       className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-xs hover:bg-indigo-100 transition-colors whitespace-nowrap"
                                     >Ko'rish</button>
                                  </div>
                               </td>
                            </tr>
                         ))}
                       </tbody>
                    </table>
                    {quizizzHistory.length === 0 && (
                       <div className="p-8 text-center text-gray-400 font-bold opacity-50">Hech qanday Quizizz ma'lumoti topilmadi.</div>
                    )}
                 </div>`;

content = content.replace(listRegex, tableReplacement);

fs.writeFileSync('src/pages/admin/AdminJurnal.tsx', content);
