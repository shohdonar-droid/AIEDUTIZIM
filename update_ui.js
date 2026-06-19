
import fs from 'fs';

const teacherPath = 'src/pages/teacher/TeacherTests.tsx';
const adminPath = 'src/pages/admin/AdminTests.tsx';

const replacement = `                {examAiMode === 'ai' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 space-y-6">
                      <div className="flex items-center justify-between">
                         <div>
                            <h4 className="text-lg font-bold text-gray-900">Test generatsiya (AI)</h4>
                            <p className="text-sm text-gray-500">Talabalar uchun noyob test qoidalari.</p>
                         </div>
                         <button
                           onClick={generateExamPreview}
                           type="button"
                           disabled={generatingPreview}
                           className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 text-sm whitespace-nowrap"
                         >
                           {generatingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                           AI ORQALI YARATISH (PREVIEW)
                         </button>
                      </div>
                      
                      {examData.rules.map((rule, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100 relative shadow-sm">
                           <div className="absolute top-4 right-4 flex gap-2">
                             {examData.rules.length > 1 && (
                               <button 
                                 type="button"
                                 onClick={() => {
                                   const newRules = examData.rules.filter((_, i) => i !== idx);
                                   setExamData({ ...examData, rules: newRules });
                                 }}
                                 className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors"
                               >
                                 <Trash2 className="h-4 w-4" />
                               </button>
                             )}
                             <div className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-3 py-1 rounded-full flex items-center">
                                QOIDALAR {idx + 1}
                             </div>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                              <div className="md:col-span-3 space-y-2">
                                 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Fan yoki Mavzu nomi</label>
                                 <input
                                   type="text"
                                   placeholder="Masalan: Frontend asoslari"
                                   className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 placeholder:text-gray-500 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium"
                                   value={rule.subject}
                                   onChange={(e) => {
                                      const newRules = [...examData.rules];
                                      newRules[idx].subject = e.target.value;
                                      setExamData({ ...examData, rules: newRules });
                                   }}
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Soni</label>
                                 <input
                                   type="number"
                                   min="1" max="50"
                                   className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium text-center"
                                   value={rule.count}
                                   onChange={(e) => {
                                      const newRules = [...examData.rules];
                                      newRules[idx].count = Number(e.target.value);
                                      setExamData({ ...examData, rules: newRules });
                                   }}
                                 />
                              </div>
                              <div className="md:col-span-4 space-y-2">
                                 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                   <FileUp className="h-3 w-3" /> Matn (Manba)
                                 </label>
                                 <textarea
                                   rows={2}
                                   placeholder="Qo'shimcha matn manbasini kiriting (ixtiyoriy)..."
                                   className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 placeholder:text-gray-500 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium text-xs h-20"
                                   value={rule.context}
                                   onChange={(e) => {
                                      const newRules = [...examData.rules];
                                      newRules[idx].context = e.target.value;
                                      setExamData({ ...examData, rules: newRules });
                                   }}
                                 />
                              </div>
                           </div>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => setExamData({ ...examData, rules: [...examData.rules, { subject: '', context: '', count: 10 }] })}
                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="h-5 w-5" /> YANGI QOIDA QO'SHISH
                      </button>
                    </div>

                    <div className="lg:col-span-5 bg-gray-50/50 rounded-3xl p-6 border border-gray-100 h-full min-h-[400px] flex flex-col">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                          <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                             <Brain className="w-5 h-5 text-indigo-600" />
                             Generator natijalari
                          </h4>
                          {examPreviewQuestions.length > 0 && (
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                               {examPreviewQuestions.length} ta savol
                            </span>
                          )}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[600px] custom-scrollbar">
                           {!generatingPreview && examPreviewQuestions.length === 0 && (
                             <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                                <Sparkles className="w-12 h-12 text-gray-300" />
                                <p className="font-bold text-gray-400 italic text-sm">
                                  Hali hech narsa yaratilmadi.<br/>
                                  "AI ORQALI YARATISH" tugmasini bosing.
                                </p>
                             </div>
                           )}

                           {generatingPreview && (
                              <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
                                 <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                 <p className="font-bold text-indigo-600 animate-pulse text-sm">
                                    AI tomonidan testlar yaratilmoqda...<br/>
                                    Iltimos, kuting...
                                 </p>
                              </div>
                           )}

                           {examPreviewQuestions.map((q, i) => (
                             <div key={i} className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm space-y-3">
                                <div className="flex gap-2">
                                   <span className="text-indigo-600 font-black text-xs mt-0.5">{i + 1}.</span>
                                   <p className="text-sm font-bold text-gray-800 leading-snug">{q.text}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-1.5 pl-5">
                                   {q.options.map((opt, oIdx) => (
                                     <div key={oIdx} className={\`p-2 rounded-lg text-[11px] font-medium border \${oIdx === q.correctIdx ? 'bg-green-50 border-green-100 text-green-700 font-bold' : 'bg-gray-50 border-gray-50 text-gray-500'}\`}>
                                        {opt}
                                     </div>
                                   ))}
                                </div>
                             </div>
                           ))}
                        </div>
                    </div>
                  </div>
                ) : (`;

function update(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  const startExpr = /\{\s*examAiMode\s*===\s*'ai'\s*\?\s*\(/;
  const match = content.match(startExpr);
  if (!match) {
    console.log(`Start expr not found in ${path}`);
    return;
  }
  const startIndex = match.index;
  
  const matchEnd = content.indexOf(') : (', startIndex);
  if (matchEnd === -1) {
    console.log(`End delimiter not found in ${path}`);
    return;
  }
  
  const originalPart = content.substring(startIndex, matchEnd + 5);
  content = content.replace(originalPart, replacement);
  fs.writeFileSync(path, content);
  console.log(`Successfully updated ${path}`);
}

update(teacherPath);
update(adminPath);
