import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebase';
import { Course, Test, Question, Department, Group } from '../../types';
import { generateDynamicTest } from '../../services/geminiService';
import { Brain, FileUp, Sparkles, Loader2, Save, Trash2, Clock, Calendar, Database, Edit, X, Plus, FileText, Globe, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminTests() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [testOrganizationIds, setTestOrganizationIds] = useState<string[]>([]);
  const [testDepartmentIds, setTestDepartmentIds] = useState<string[]>([]);
  const [testGroupIds, setTestGroupIds] = useState<string[]>([]);

  const [savedTests, setSavedTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'exam' | 'base'>('ai');
  const [editingTest, setEditingTest] = useState<any>(null);
  const [showFullEditor, setShowFullEditor] = useState<any>(null);
  
  // Custom filter for tests in Baza
  const [testCreatorFilter, setTestCreatorFilter] = useState<string>('all');
  const [teachersList, setTeachersList] = useState<any[]>([]);
  
  // AI Test Generation State
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [testCount, setTestCount] = useState(10);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [randomQuestionCount, setRandomQuestionCount] = useState<number | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [aiMode, setAiMode] = useState<'ai'|'manual'>('ai');
  const defaultManualTemplate = `++++
 savol matni
====
nato'g'ri_variant
====
#to'g'ri_variant
====
nato'g'ri_variant
====
nato'g'ri_variant`;
  const [manualText, setManualText] = useState(defaultManualTemplate);

  const parseManualText = () => {
    if (!topic) return alert("Test namini (Kurs yoki Mavzuni) kiriting.");
    if (!manualText.trim()) return;
    
    // Find all blocks starting with "++++"
    const blocks = manualText.split('++++').map(b => b.trim()).filter(b => b);
    const questions: Question[] = [];

    for (const block of blocks) {
      const parts = block.split('====').map(p => p.trim());
      if (parts.length < 2) continue; // No options found

      const qText = parts[0];
      const optionParts = parts.slice(1).filter(p => p !== '');

      const options = [];
      let correctIdx = 0;
      let idx = 0;

      for (let optText of optionParts) {
        const isCorrect = optText.startsWith('#');
        if (isCorrect) {
          optText = optText.substring(1).trim();
          correctIdx = idx;
        }
        
        options.push(optText);
        idx++;
      }

      if (options.length > 0) {
        questions.push({
          id: Math.random().toString(),
          text: qText,
          options: options,
          correctIdx: correctIdx
        });
      }
    }
    
    if (questions.length === 0) {
      alert("Matnda test savollari topilmadi. Formatni tekshiring: ++++ savol \\n ====\\n nato'g'ri \\n ====\\n #to'g'ri \\n ====\\n nato'g'ri \\n ====\\n nato'g'ri");
      return;
    }

    setGeneratedQuestions(questions);
  };


  // Exam state
  const [examAiMode, setExamAiMode] = useState<'ai'|'manual'>('ai');
  const [examManualText, setExamManualText] = useState(defaultManualTemplate);
  const [examData, setExamData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    rules: [
      { subject: '', context: '', count: 10 }
    ],
    questions: [] as Question[],
    maxAttempts: 1,
    randomQuestionCount: null as number | null
  });

  const parseExamManualText = () => {
    if (!examManualText.trim()) return;
    const blocks = examManualText.split('++++').map(b => b.trim()).filter(b => b);
    const questions: Question[] = [];

    for (const block of blocks) {
      const parts = block.split('====').map(p => p.trim());
      if (parts.length < 2) continue;
      
      const qText = parts[0];
      const optionParts = parts.slice(1).filter(p => p !== '');

      const options = [];
      let correctIdx = 0;
      let idx = 0;

      for (let optText of optionParts) {
        const isCorrect = optText.startsWith('#');
        if (isCorrect) {
          optText = optText.substring(1).trim();
          correctIdx = idx;
        }

        options.push(optText);
        idx++;
      }

      if (options.length > 0) {
        questions.push({
          id: Math.random().toString(),
          text: qText,
          options: options,
          correctIdx: correctIdx
        });
      }
    }
    
    if (questions.length === 0) {
      alert("Matnda test savollari topilmadi. Formatni tekshiring: ++++ savol \\n ====\\n nato'g'ri \\n ====\\n #to'g'ri \\n ====\\n nato'g'ri \\n ====\\n nato'g'ri");
      return;
    }

    setExamData(prev => ({ ...prev, questions }));
    alert(`${questions.length} ta savol olindi! Endi Saqlash tugmasini bosing.`);
  };

  const loadTests = async () => {
    if (!user) return;
    try {
      // RULE: Admin only sees their own tests in their profile
      const q = query(collection(db, 'tests'), where('creatorRole', '==', 'admin'), orderBy('createdAt', 'asc'));
      const tSnap = await getDocs(q);
      setSavedTests(tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      const q = query(collection(db, 'tests'), where('creatorRole', '==', 'admin'));
      const tSnap = await getDocs(q);
      const sorted = tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => {
        const t1 = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const t2 = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return t1 - t2;
      });
      setSavedTests(sorted);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'courses'));
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
      
      const dSnap = await getDocs(collection(db, 'departments'));
      setDepartments(dSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department)));

      const gSnap = await getDocs(collection(db, 'groups'));
      setGroups(gSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
      
      const tSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
      const sortedTeachers = tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => {
         const ta = (a.displayName || '').toLowerCase();
         const tb = (b.displayName || '').toLowerCase();
         return ta.localeCompare(tb);
      });
      setTeachersList(sortedTeachers);

      await loadTests();
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'admin-tests-loader');
    }
    }
    load();
  }, []);

  const handleGenerateAI = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const questions = await generateDynamicTest(topic, testCount, context);
      setGeneratedQuestions(questions);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const saveAITest = async (publish: boolean) => {
    if (!generatedQuestions.length || !user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'tests'), {
        title: topic,
        questions: generatedQuestions,
        type: 'topic',
        isPublished: publish,
        organizationIds: testOrganizationIds,
        departmentIds: testDepartmentIds,
        groupIds: testGroupIds,
        maxAttempts: maxAttempts,
        randomQuestionCount: randomQuestionCount || generatedQuestions.length,
        creatorId: user.uid,
        creatorRole: user.role,
        createdAt: serverTimestamp()
      });
      await loadTests();
      alert(`Test muvaffaqiyatli saqlandi ${publish ? 'va saytga chiqarildi' : '(faqat bazaga)'}!`);
      setTestOrganizationIds([]);
      setTestDepartmentIds([]);
      setTestGroupIds([]);
      setTopic('');
      setGeneratedQuestions([]);
      setManualText(defaultManualTemplate);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const publishTest = async (testId: string, isPublished: boolean) => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'tests', testId), { isPublished: isPublished }, { merge: true });
      await loadTests();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const downloadWord = (test: any) => {
    if (!test.questions || test.questions.length === 0) {
      alert("Bu testda savollar yo'q.");
      return;
    }
    
    let content = `<html><head><meta charset="UTF-8"></head><body><h2>${test.title}</h2><br/>`;
    test.questions.forEach((q: any, i: number) => {
      content += `<div>++++<br/> ${q.text}</div>`;
      q.options.forEach((opt: string, optIdx: number) => {
        const isCorrect = q.correctIdx === optIdx;
        const prefix = isCorrect ? '#' : '';
        content += `<div>====</div><div>${prefix}${opt}</div>`;
      });
      content += '<br/>';
    });
    content += '</body></html>';
    
    const blob = new Blob(['\ufeff', content], {
      type: 'application/msword;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${test.title || 'test'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteTest = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tests', id));
      await loadTests();
    } catch (err) { 
      console.error(err); 
      alert("O'chirishda xatolik yuz berdi.");
    }
  };

  const updateTestMetadata = async (id: string, newTitle: string, orgIds: string[], dIds: string[], gIds: string[], randCount: number | null) => {
    try {
      await setDoc(doc(db, 'tests', id), { 
        title: newTitle, 
        organizationIds: orgIds || [], 
        departmentIds: dIds || [], 
        groupIds: gIds || [],
        randomQuestionCount: randCount
      }, { merge: true });
      await loadTests();
      setEditingTest(null);
    } catch (err) { console.error(err); }
  };

  const updateFullTest = async () => {
    if(!showFullEditor) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'tests', showFullEditor.id), showFullEditor);
      await loadTests();
      setShowFullEditor(null);
      alert('Test muvaffaqiyatli yangilandi!');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const saveExam = async () => {
    if (!examData.title || !examData.startTime || !examData.endTime || !user) {
      alert("Iltimos, imtihon nomi va vaqtini kiriting.");
      return;
    }
    setLoading(true);
    try {
      let isPublished = true;
      const validRules = examAiMode === 'ai' ? examData.rules.filter(r => r.subject.trim()) : [];
      const questionsToSave = examAiMode === 'manual' ? examData.questions : [];

      await addDoc(collection(db, 'tests'), {
        title: examData.title,
        type: 'exam',
        startTime: new Date(examData.startTime).toISOString(),
        endTime: new Date(examData.endTime).toISOString(),
        generationRules: validRules,
        questions: questionsToSave,
        isPublished: isPublished,
        organizationIds: testOrganizationIds,
        departmentIds: testDepartmentIds,
        groupIds: testGroupIds,
        maxAttempts: examData.maxAttempts || 1,
        randomQuestionCount: examData.randomQuestionCount || (examAiMode === 'manual' ? examData.questions.length : null),
        creatorId: user.uid,
        creatorRole: user.role,
        createdAt: serverTimestamp()
      });
      await loadTests();
      alert('Imtihon saqlandi!');
      setTestOrganizationIds([]);
      setTestDepartmentIds([]);
      setTestGroupIds([]);
      setExamData({
        title: '', startTime: '', endTime: '',
        rules: [{ subject: '', context: '', count: 10 }],
        questions: [] as Question[],
        maxAttempts: 1,
        randomQuestionCount: null
      });
      setExamManualText('');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const renderTestsGrid = (filterType: 'topic' | 'exam') => {
    const list = savedTests.filter(test => test.type === filterType);
      
    if (list.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500 font-medium">Bazada hech qanday {filterType === 'topic' ? 'test' : 'imtihon'} yo'q.</div>
      );
    }

    return (
      <div className="grid gap-4 mt-8 pt-8 border-t border-gray-100">
        <h4 className="text-xl font-black text-gray-900 mb-2">Saqlangan {filterType === 'topic' ? 'Testlar' : 'Imtihonlar'}</h4>
        {list.map((test, index) => (
          <div key={test.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="flex-1 mr-4">
              {editingTest?.id === test.id ? (
                  <div className="flex flex-col gap-2 mb-2 w-full max-w-xl">
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={editingTest.title}
                      onChange={e => setEditingTest({ ...editingTest, title: e.target.value })}
                      className="px-3 py-1 font-bold rounded-lg border-gray-300 w-full"
                    />
                    <button onClick={() => updateTestMetadata(test.id, editingTest.title, editingTest.organizationIds || [], editingTest.departmentIds || [], editingTest.groupIds || [], editingTest.randomQuestionCount)} className="bg-blue-600 text-white p-2 rounded-lg"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setEditingTest(null)} className="bg-gray-200 text-gray-600 p-2 rounded-lg"><X className="w-4 h-4" /></button>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                       <div className="flex-1">
                         <label className="text-[10px] font-black text-gray-400 uppercase">Tasodifiy savollar soni</label>
                         <input 
                           type="number" 
                           value={editingTest.randomQuestionCount || ''}
                           onChange={e => setEditingTest({ ...editingTest, randomQuestionCount: e.target.value ? parseInt(e.target.value) : null })}
                           className="px-3 py-1 font-bold rounded-lg border-gray-300 w-full"
                         />
                       </div>
                    </div>
                    <MultiSelectDropdown
                      label="Tashkilotlar"
                      options={teachersList.map(t => ({ id: t.id, name: t.displayName }))}
                      selectedIds={editingTest.organizationIds || []}
                      onChange={(id, checked) => {
                          const newOrgs = checked 
                            ? [...(editingTest.organizationIds || []), id]
                            : (editingTest.organizationIds || []).filter((oId: string) => oId !== id);
                          setEditingTest({ 
                             ...editingTest, 
                             organizationIds: newOrgs,
                             departmentIds: [],
                             groupIds: []
                          });
                      }}
                      placeholder="Barcha uchun"
                    />
                    <MultiSelectDropdown
                      label="Yo'nalishlar"
                      options={(editingTest.organizationIds || []).length > 0 ? departments.filter(d => (editingTest.organizationIds || []).includes(d.creatorId || '')) : departments}
                      selectedIds={editingTest.departmentIds || []}
                      onChange={(id, checked) => {
                          const newDps = checked 
                            ? [...(editingTest.departmentIds || []), id]
                            : (editingTest.departmentIds || []).filter((dId: string) => dId !== id);
                          setEditingTest({ ...editingTest, departmentIds: newDps });
                      }}
                      placeholder="Barcha uchun"
                    />
                    {(editingTest.departmentIds || []).length > 0 && (
                        <MultiSelectDropdown
                          label="Guruhlar"
                          options={groups.filter(g => (editingTest.departmentIds || []).includes(g.departmentId))}
                          selectedIds={editingTest.groupIds || []}
                          onChange={(id, checked) => {
                            const newGrps = checked 
                                ? [...(editingTest.groupIds || []), id]
                                : (editingTest.groupIds || []).filter((gId: string) => gId !== id);
                            setEditingTest({ ...editingTest, groupIds: newGrps });
                          }}
                          placeholder="Barcha guruhlar"
                        />
                    )}
                  </div>
                </div>
              ) : (
                <h4 className="text-lg font-bold text-gray-900 flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-sm font-black text-gray-400 bg-gray-200 px-2 py-0.5 rounded-md">{index + 1}</span>
                  {test.title}
                  <button onClick={() => setEditingTest({ 
                    id: test.id, 
                    title: test.title, 
                    organizationIds: test.organizationIds || [], 
                    departmentIds: test.departmentIds || [], 
                    groupIds: test.groupIds || [],
                    randomQuestionCount: test.randomQuestionCount || null
                  })} className="text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setShowFullEditor({ ...test })} className="text-gray-400 hover:text-green-600 ml-2" title="Savollarni tahrirlash"><FileText className="w-4 h-4" /></button>
                  {test.isPublished ? (
                    <span className="ml-2 text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-md">Saytda</span>
                  ) : (
                    <span className="ml-2 text-xs font-bold px-2 py-1 bg-gray-200 text-gray-600 rounded-md">Bazadan (yashirin)</span>
                  )}
                </h4>
              )}
              <p className="text-sm text-gray-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                Tur: {test.type === 'topic' ? 'Mavzuli Test' : 'Imtihon'} 
                {test.questions?.length ? ` • Savollar: ${test.questions.length} ta` : ''}
                {test.randomQuestionCount && ` • Tasodifiy: ${test.randomQuestionCount} ta`}
                {test.createdAt && test.createdAt.seconds && (
                  <span> • Sana: {new Date(test.createdAt.seconds * 1000).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => downloadWord({ ...test })} className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold text-xs rounded-xl transition-colors whitespace-nowrap">
                  Word yuklash
              </button>
              {test.type !== 'exam' && (
                <button 
                  onClick={() => publishTest(test.id, !test.isPublished)} 
                  className={`p-2.5 font-bold text-xs rounded-xl transition-colors whitespace-nowrap ${test.isPublished ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                >
                  {test.isPublished ? "Olib tashlash" : "Saytga chiqarish"}
                </button>
              )}
              <button onClick={() => deleteTest(test.id)} className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                  <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-10">
      {showFullEditor && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto p-4 md:p-10 space-y-10">
           <header className="flex flex-col md:flex-row justify-between items-start md:items-center max-w-5xl mx-auto gap-4">
              <div>
                <h2 className="text-3xl font-black text-gray-900">Testni tahrirlash</h2>
                <p className="text-gray-500 mt-1">{showFullEditor.title}</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={() => setShowFullEditor(null)} className="flex-1 md:flex-none px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">BEKOR QILISH</button>
                <button onClick={updateFullTest} className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                   {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} SAQLASH
                </button>
              </div>
           </header>

           <div className="max-w-5xl mx-auto space-y-8 pb-20">
              <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 space-y-6">
                 <div className="space-y-2">
                   <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Test nomi</label>
                   <input 
                     type="text"
                     className="w-full px-5 py-4 rounded-xl border-none font-bold shadow-sm focus:ring-2 focus:ring-blue-600"
                     value={showFullEditor.title}
                     onChange={e => setShowFullEditor({ ...showFullEditor, title: e.target.value })}
                   />
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tasodifiy savollar soni</label>
                   <input 
                     type="number"
                     className="w-full px-5 py-4 rounded-xl border-none font-bold shadow-sm focus:ring-2 focus:ring-blue-600"
                     value={showFullEditor.randomQuestionCount || ''}
                     onChange={e => setShowFullEditor({ ...showFullEditor, randomQuestionCount: e.target.value ? parseInt(e.target.value) : null })}
                     placeholder="Barcha savollarni ko'rsatish"
                   />
                 </div>
                 
                 <div className="space-y-4 pt-4 border-t border-gray-200">
                    <MultiSelectDropdown
                       label="Tashkilotlar"
                       options={teachersList.map(t => ({ id: t.id, name: t.displayName }))}
                       selectedIds={showFullEditor.organizationIds || []}
                       onChange={(id, checked) => {
                          const newOrgs = checked 
                            ? [...(showFullEditor.organizationIds || []), id]
                            : (showFullEditor.organizationIds || []).filter((oId: string) => oId !== id);
                          setShowFullEditor({ 
                             ...showFullEditor, 
                             organizationIds: newOrgs,
                             departmentIds: [],
                             groupIds: []
                          });
                       }}
                       placeholder="Barcha tashkilotlar"
                       theme="blue"
                    />
                    <MultiSelectDropdown
                       label="Biriktirilgan yo'nalishlar"
                       options={(showFullEditor.organizationIds || []).length > 0 ? departments.filter(d => (showFullEditor.organizationIds || []).includes(d.creatorId || '')) : departments}
                       selectedIds={showFullEditor.departmentIds || []}
                       onChange={(id, checked) => {
                          const existingDeptIds = showFullEditor.departmentIds || [];
                          let nextDeptIds;
                          let nextGroupIds = showFullEditor.groupIds || [];
                          if (!checked) {
                             nextDeptIds = existingDeptIds.filter((dId: string) => dId !== id);
                             nextGroupIds = nextGroupIds.filter((gid: string) => {
                                const g = groups.find(x => x.id === gid);
                                return g && g.departmentId !== id;
                             });
                          } else {
                             nextDeptIds = [...existingDeptIds, id];
                          }
                          setShowFullEditor({ ...showFullEditor, departmentIds: nextDeptIds, groupIds: nextGroupIds });
                       }}
                       placeholder="Barcha uchun umumiy"
                       theme="blue"
                    />
                 </div>
                 
                 {(showFullEditor.departmentIds || []).length > 0 && (
                    <div className="space-y-4">
                       <MultiSelectDropdown
                          label="Biriktirilgan guruhlar"
                          options={groups.filter(g => showFullEditor.departmentIds.includes(g.departmentId))}
                          selectedIds={showFullEditor.groupIds || []}
                          onChange={(id, checked) => {
                             const existingGroupIds = showFullEditor.groupIds || [];
                             const nextGroupIds = !checked 
                               ? existingGroupIds.filter((gId: string) => gId !== id)
                               : [...existingGroupIds, id];
                             setShowFullEditor({ ...showFullEditor, groupIds: nextGroupIds });
                          }}
                          placeholder="Yo'nalishdagi barcha guruhlar"
                          theme="blue"
                       />
                    </div>
                 )}
              </div>

              <div className="space-y-6">
                 {showFullEditor.questions?.map((q: any, qIdx: number) => (
                   <div key={q.id || qIdx} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                      <div className="flex justify-between items-start gap-4">
                         <div className="flex-1 space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Savol {qIdx + 1}</label>
                            <textarea 
                              className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none font-bold text-sm min-h-[100px]"
                              value={q.text}
                              onChange={e => {
                                const qs = [...showFullEditor.questions];
                                qs[qIdx].text = e.target.value;
                                setShowFullEditor({ ...showFullEditor, questions: qs });
                              }}
                            />
                         </div>
                         <button 
                           onClick={() => {
                             const qs = showFullEditor.questions.filter((_: any, i: number) => i !== qIdx);
                             setShowFullEditor({ ...showFullEditor, questions: qs });
                           }}
                           className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                         >
                           <Trash2 className="h-5 w-5" />
                         </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {q.options?.map((opt: string, oIdx: number) => (
                           <div key={oIdx} className="flex items-center gap-3">
                              <input 
                                type="radio"
                                name={`correct-${qIdx}`}
                                checked={q.correctIdx === oIdx}
                                onChange={() => {
                                  const qs = [...showFullEditor.questions];
                                  qs[qIdx].correctIdx = oIdx;
                                  setShowFullEditor({ ...showFullEditor, questions: qs });
                                }}
                                className="w-5 h-5 text-blue-600 focus:ring-blue-600"
                              />
                              <input 
                                type="text"
                                className={`flex-1 px-4 py-2 rounded-lg border-none text-sm font-medium ${q.correctIdx === oIdx ? 'bg-green-50 text-green-700 font-bold' : 'bg-gray-50 text-gray-600'}`}
                                value={opt}
                                onChange={e => {
                                  const qs = [...showFullEditor.questions];
                                  qs[qIdx].options[oIdx] = e.target.value;
                                  setShowFullEditor({ ...showFullEditor, questions: qs });
                                }}
                              />
                           </div>
                         ))}
                      </div>
                   </div>
                 ))}
                 <button 
                   onClick={() => {
                     const newQ = { id: Math.random().toString(), text: 'Yangi savol...', options: ['', '', '', ''], correctIdx: 0 };
                     setShowFullEditor({ ...showFullEditor, questions: [...(showFullEditor.questions || []), newQ] });
                   }}
                   className="w-full py-8 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 font-black hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/10 transition-all flex items-center justify-center gap-2"
                 >
                   <Plus className="w-5 h-5" /> SAVOL QO'SHISH
                 </button>
              </div>
           </div>
        </div>
      )}

      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Testlar tizimi</h1>
          <p className="text-gray-500 mt-2 text-lg">AI orqali avtomatik testlar va vaqtli imtihonlar.</p>
        </div>
        <div className="flex bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'ai' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Mavzuli Testlar
          </button>
          <button
            onClick={() => setActiveTab('exam')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'exam' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Imtihonlar
          </button>
        </div>
      </header>

      {activeTab === 'ai' ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
            {/* AI Settings */}
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm space-y-8 h-fit">
            <div className="flex items-center gap-4 mb-4 justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Brain className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Test builder</h3>
              </div>
            </div>
            
            <div className="flex bg-gray-50 p-1 rounded-xl">
              <button 
                onClick={() => setAiMode('ai')} 
                className={`flex-1 py-2 font-bold text-sm tracking-wide rounded-lg transition-colors ${aiMode === 'ai' ? 'bg-white shadow text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                AI ORQALI
              </button>
              <button 
                onClick={() => setAiMode('manual')} 
                className={`flex-1 py-2 font-bold text-sm tracking-wide rounded-lg transition-colors ${aiMode === 'manual' ? 'bg-white shadow text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                QO'LDA KIRITISH
              </button>
            </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-4">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Test (Mavzu) nomi</label>
                    <input
                      type="text"
                      placeholder="Masalan: Python malumot turlari..."
                      className="w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 placeholder:text-gray-500 text-gray-900 focus:ring-2 focus:ring-purple-600 font-bold"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Jami savollar</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      className="w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 placeholder:text-gray-500 text-gray-900 focus:ring-2 focus:ring-purple-600 font-bold"
                      value={testCount}
                      onChange={(e) => setTestCount(parseInt(e.target.value) || 10)}
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Tasodifiy savollar</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Masalan: 10"
                      className="w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 placeholder:text-gray-500 text-gray-900 focus:ring-2 focus:ring-purple-600 font-bold"
                      value={randomQuestionCount || ''}
                      onChange={(e) => setRandomQuestionCount(e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="w-1/3 space-y-4">
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Imkoniyat</label>
                     <input
                       type="number"
                       min="1"
                       className="w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 focus:ring-2 focus:ring-purple-600 font-bold"
                       value={maxAttempts}
                       onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                     />
                  </div>
                  <div className="flex-1 space-y-4">
                     <div className="bg-purple-100/50 p-4 rounded-xl border border-purple-200 mb-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                            checked={(!testOrganizationIds || testOrganizationIds.length === 0) && (!testDepartmentIds || testDepartmentIds.length === 0) && (!testGroupIds || testGroupIds.length === 0)}
                            onChange={(e) => {
                               if(e.target.checked) {
                                  setTestOrganizationIds([]);
                                  setTestDepartmentIds([]);
                                  setTestGroupIds([]);
                                }
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-purple-900 uppercase">Barchaga ochiq</span>
                            <span className="text-[10px] text-purple-500 font-bold leading-tight">Filtrdan o'chiradi</span>
                          </div>
                        </label>
                     </div>
                     <MultiSelectDropdown
                       label="Tashkilotlar (Ixtiyoriy)"
                       options={teachersList.map(t => ({ id: t.id, name: t.displayName }))}
                       selectedIds={testOrganizationIds}
                       onChange={(id, checked) => {
                          if (!checked) {
                             setTestOrganizationIds(prev => prev.filter(orgId => orgId !== id));
                          } else {
                             setTestOrganizationIds(prev => [...prev, id]);
                          }
                       }}
                       placeholder="Barcha tashkilotlar"
                       theme="purple"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-4">
                     <MultiSelectDropdown
                      label="Yo'nalishlar (Ixtiyoriy, tanlanmasa barcha uchun)"
                      options={testOrganizationIds.length > 0 ? departments.filter(d => testOrganizationIds.includes(d.creatorId || '')) : departments}
                      selectedIds={testDepartmentIds}
                      onChange={(id, checked) => {
                         if (!checked) {
                            setTestDepartmentIds(prev => prev.filter(dId => dId !== id));
                            setTestGroupIds(prev => prev.filter(gid => {
                               const g = groups.find(x => x.id === gid);
                               return g && g.departmentId !== id;
                            }));
                         } else {
                            setTestDepartmentIds(prev => [...prev, id]);
                         }
                      }}
                      placeholder="Barcha uchun umumiy"
                      theme="purple"
                   />
                  </div>
                  {testDepartmentIds.length > 0 && (
                  <div className="flex-1 space-y-4">
                     <MultiSelectDropdown
                        label="Guruhlar (Ixtiyoriy)"
                        options={groups.filter(g => testDepartmentIds.includes(g.departmentId))}
                        selectedIds={testGroupIds}
                        onChange={(id, checked) => {
                           if (!checked) {
                              setTestGroupIds(prev => prev.filter(gId => gId !== id));
                           } else {
                              setTestGroupIds(prev => [...prev, id]);
                           }
                        }}
                        placeholder="Yo'nalishdagi barcha guruhlar"
                        theme="purple"
                     />
                  </div>
                  )}
                </div>
              </div>

              {aiMode === 'ai' ? (
                <>
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                      <FileUp className="h-4 w-4" />
                      Qo'shimcha malumot (Fayl matni)
                    </label>
                    <textarea
                      rows={10}
                      placeholder="Dars matnini shu yerga yozing yoki nusxalang..."
                      className="w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 placeholder:text-gray-500 text-gray-900 focus:ring-2 focus:ring-purple-600 font-medium text-sm leading-relaxed"
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleGenerateAI}
                    disabled={loading || !topic}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-purple-600 text-white rounded-xl font-black shadow-lg shadow-purple-200 hover:bg-purple-700 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
                    {testCount} TA TEST SAVOLI TUZISH (AI)
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                      <FileUp className="h-4 w-4" />
                      Matn shaklidagi test
                    </label>
                    <textarea
                      rows={8}
                      placeholder="++++ savol matni&#10;====&#10;nato'g'ri_variant&#10;====&#10;#to'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;===="
                      className="w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 placeholder:text-gray-500 text-gray-900 focus:ring-2 focus:ring-purple-600 font-medium text-sm leading-relaxed font-mono"
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={parseManualText}
                    disabled={loading || !topic}
                    className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-purple-600 text-white font-black shadow-xl shadow-purple-100 hover:bg-purple-700 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    MATNDAN TESTNI PARSE QILISH
                  </button>
                </>
              )}
            </div>
          </div>

          {/* AI Result */}
          <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm min-h-[500px] flex flex-col">
            <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-50">
              <h3 className="text-xl font-black text-gray-900">Generator natijalari</h3>
              {generatedQuestions.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => saveAITest(false)}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm font-bold text-gray-600 bg-gray-100 px-4 py-2 rounded-xl xl:whitespace-nowrap hover:bg-gray-200 transition-all"
                  >
                    Faqat bazaga
                  </button>
                  <button
                    onClick={() => saveAITest(true)}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm font-bold text-white bg-green-500 px-4 py-2 rounded-xl xl:whitespace-nowrap hover:bg-green-600 transition-all shadow-md shadow-green-100"
                  >
                    Saytga chiqarish
                  </button>
                  <button
                    onClick={() => downloadWord({ title: topic, questions: generatedQuestions })}
                    className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl xl:whitespace-nowrap hover:bg-blue-600 hover:text-white transition-all"
                  >
                    Tushirish (Word)
                  </button>
                </div>
              )}
            </div>

            {generatedQuestions.length > 0 ? (
              <div className="space-y-8 flex-1 overflow-y-auto max-h-[1000px] pr-4 custom-scrollbar">
                {generatedQuestions.map((q, i) => (
                  <div key={i} className="space-y-4 p-6 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="flex gap-2 relative">
                      <span className="text-purple-600 font-bold mt-2">{i + 1}.</span> 
                      <textarea
                        value={q.text}
                        onChange={(e) => {
                          const newQ = [...generatedQuestions];
                          newQ[i].text = e.target.value;
                          setGeneratedQuestions(newQ);
                        }}
                        className="w-full bg-white px-4 py-2 text-gray-900 font-bold rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-600 outline-none resize-y min-h-[60px]"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2 pl-6">
                       {q.options.map((opt, oIdx) => (
                         <div key={oIdx} className="flex gap-2 items-center">
                           <input 
                             type="radio" 
                             name={`gen-correct-${i}`} 
                             checked={oIdx === q.correctIdx}
                             onChange={() => {
                               const newQ = [...generatedQuestions];
                               newQ[i].correctIdx = oIdx;
                               setGeneratedQuestions(newQ);
                             }}
                             className="w-4 h-4 text-purple-600 focus:ring-purple-600"
                           />
                           <input
                             type="text"
                             value={opt}
                             onChange={(e) => {
                               const newQ = [...generatedQuestions];
                               newQ[i].options[oIdx] = e.target.value;
                               setGeneratedQuestions(newQ);
                             }}
                             className={`flex-1 px-4 py-2 rounded-xl border text-sm font-medium outline-none transition-colors ${
                               oIdx === q.correctIdx ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-white border-gray-200 text-gray-600 focus:border-purple-400'
                             }`}
                           />
                         </div>
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                <Brain className="h-16 w-16 mb-4 text-gray-300" />
                <p className="font-bold text-gray-400">Hozircha testlar shakllantirilmagan.</p>
                <p className="text-sm">Parametrlarni kiriting va "Tuzish" tugmasini bosing.</p>
              </div>
            )}
          </div>
          </div>
          <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm space-y-8">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">Mavzuli testlar bazasi</h3>
                    <p className="text-gray-500 text-sm mt-1">Barcha saqlangan AI testlar ro'yxati.</p>
                  </div>
                </div>
             </div>
             {renderTestsGrid('topic')}
          </div>
        </div>
      ) : activeTab === 'exam' ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
               <Clock className="h-6 w-6" />
             </div>
             <div>
               <h3 className="text-2xl font-black text-gray-900">Imtihon rejalashtirish</h3>
               <p className="text-gray-500 text-sm mt-1">Imtihon uchun ma'lumotlar va dinamik test yaratish qoidalari (3 tagacha).</p>
             </div>
          </div>
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Imtihon nomi</label>
                <input
                  type="text"
                  className="w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 placeholder:text-gray-500 text-gray-900 font-bold focus:ring-2 focus:ring-blue-600"
                  value={examData.title}
                  onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                  placeholder="Masalan: Yakuniy Imtihon"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Boshlanish
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 placeholder:text-gray-500 text-gray-900 font-medium focus:ring-2 focus:ring-blue-600"
                    value={examData.startTime}
                    onChange={(e) => setExamData({ ...examData, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Yakunlanish
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 placeholder:text-gray-500 text-gray-900 font-medium focus:ring-2 focus:ring-blue-600"
                    value={examData.endTime}
                    onChange={(e) => setExamData({ ...examData, endTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Imkoniyat
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 font-bold focus:ring-2 focus:ring-blue-600"
                    value={examData.maxAttempts}
                    onChange={(e) => setExamData({ ...examData, maxAttempts: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Tasodifiy savollar
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 font-bold focus:ring-2 focus:ring-blue-600"
                    value={examData.randomQuestionCount || ''}
                    onChange={(e) => setExamData({ ...examData, randomQuestionCount: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Barchasi"
                  />
                </div>
              </div>
            </div>

             <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-4">
                     <MultiSelectDropdown
                       label="Tashkilotlar (Ixtiyoriy)"
                       options={teachersList.map(t => ({ id: t.id, name: t.displayName }))}
                       selectedIds={testOrganizationIds}
                       onChange={(id, checked) => {
                          if (!checked) {
                             setTestOrganizationIds(prev => prev.filter(orgId => orgId !== id));
                          } else {
                             setTestOrganizationIds(prev => [...prev, id]);
                          }
                       }}
                       placeholder="Barcha tashkilotlar"
                       theme="blue"
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                     <MultiSelectDropdown
                        label="Yo'nalishlar (Ixtiyoriy, tanlanmasa barcha uchun)"
                        options={testOrganizationIds.length > 0 ? departments.filter(d => testOrganizationIds.includes(d.creatorId || '')) : departments}
                        selectedIds={testDepartmentIds}
                        onChange={(id, checked) => {
                           if (!checked) {
                              setTestDepartmentIds(prev => prev.filter(dId => dId !== id));
                              setTestGroupIds(prev => prev.filter(gid => {
                                 const g = groups.find(x => x.id === gid);
                                 return g && g.departmentId !== id;
                              }));
                           } else {
                              setTestDepartmentIds(prev => [...prev, id]);
                           }
                        }}
                        placeholder="Barcha uchun umumiy"
                        theme="blue"
                     />
                  </div>
                </div>
                {testDepartmentIds.length > 0 && (
                <div className="flex gap-4">
                  <div className="flex-1 space-y-4">
                     <MultiSelectDropdown
                        label="Guruhlar (Ixtiyoriy, tanlanmasa barcha yo'nalish talabalariga)"
                        options={groups.filter(g => testDepartmentIds.includes(g.departmentId))}
                        selectedIds={testGroupIds}
                        onChange={(id, checked) => {
                           if (!checked) {
                              setTestGroupIds(prev => prev.filter(gId => gId !== id));
                           } else {
                              setTestGroupIds(prev => [...prev, id]);
                           }
                        }}
                        placeholder="Yo'nalishdagi barcha guruhlar"
                        theme="blue"
                     />
                  </div>
                </div>
                )}
             </div>

            <div className="space-y-6 pt-6 border-t border-gray-100">
               <div className="flex bg-gray-50 p-1 rounded-xl">
                 <button 
                   onClick={() => setExamAiMode('ai')} 
                   className={`flex-1 py-2 font-bold text-sm tracking-wide rounded-lg transition-colors ${examAiMode === 'ai' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   DINAMIK TEST (AI QOIDASI)
                 </button>
                 <button 
                   onClick={() => setExamAiMode('manual')} 
                   className={`flex-1 py-2 font-bold text-sm tracking-wide rounded-lg transition-colors ${examAiMode === 'manual' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                 >
                   STATIK TEST (QO'LDA KIRITISH)
                 </button>
               </div>

               {examAiMode === 'ai' ? (
                 <>
                   <h4 className="text-lg font-bold text-gray-900">Test generatsiya (AI)</h4>
                   <p className="text-sm text-gray-500 mb-4">Talabalar imtihonga kirganda ushbu qoidalar yordamida har biri uchun noyob test savollari generatsiya qilinadi.</p>
                   
                   {examData.rules.map((rule, idx) => (
                     <div key={idx} className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100 relative">
                        <div className="absolute top-4 right-4 bg-blue-100 text-blue-800 text-xs font-black px-3 py-1 rounded-full">
                           QOG'OZ {idx + 1}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                           <div className="md:col-span-3 space-y-2">
                              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Fan yoki Mavzu nomi</label>
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
                              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Savollar soni</label>
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
                              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <FileUp className="h-3 w-3" /> Matn (Manba)
                              </label>
                              <textarea
                                rows={3}
                                placeholder="Qo'shimcha matn manbasini kiriting (ixtiyoriy)... Ushbu matndan AI foydalanib test tuzadi."
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 placeholder:text-gray-500 text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent font-medium text-sm"
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
                 </>
               ) : (
                 <div className="space-y-4">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Matn shakldagi savollar</label>
                    <p className="text-sm text-gray-500 mb-2">Barcha talabalar uchun yagona statik savollar to'plamini kiriting.</p>
                    <textarea
                      rows={8}
                      placeholder="++++ savol matni&#10;====&#10;nato'g'ri_variant&#10;====&#10;#to'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;====&#10;nato'g'ri_variant&#10;===="
                      className="w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 placeholder:text-gray-500 text-gray-900 focus:ring-2 focus:ring-blue-600 font-mono text-sm leading-relaxed"
                      value={examManualText}
                      onChange={(e) => setExamManualText(e.target.value)}
                    />
                    <button
                      onClick={parseExamManualText}
                      className="flex items-center gap-2 py-3 px-6 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-all text-sm"
                    >
                      SAVOLLARNI PARSE QILISH
                    </button>
                 </div>
               )}
            </div>

            {examAiMode === 'manual' && examData.questions.length > 0 && (
              <div className="space-y-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-gray-900">Parse qilingan savollar ({examData.questions.length})</h4>
                  <button onClick={() => setExamData({ ...examData, questions: [] })} className="text-sm text-red-500 font-bold hover:underline">Tozalash</button>
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {examData.questions.map((q, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                      <div className="flex gap-2">
                        <span className="text-blue-600 font-bold mt-2">{i + 1}.</span> 
                        <textarea
                          value={q.text}
                          onChange={(e) => {
                            const newQ = [...examData.questions];
                            newQ[i].text = e.target.value;
                            setExamData({ ...examData, questions: newQ });
                          }}
                          className="w-full bg-white px-4 py-2 text-gray-900 font-bold rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-600 outline-none resize-y min-h-[60px]"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-2 pl-6">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex gap-2 items-center">
                            <input 
                              type="radio" 
                              name={`exam-gen-correct-${i}`} 
                              checked={oIdx === q.correctIdx}
                              onChange={() => {
                                const newQ = [...examData.questions];
                                newQ[i].correctIdx = oIdx;
                                setExamData({ ...examData, questions: newQ });
                              }}
                              className="w-4 h-4 text-blue-600 focus:ring-blue-600"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newQ = [...examData.questions];
                                newQ[i].options[oIdx] = e.target.value;
                                setExamData({ ...examData, questions: newQ });
                              }}
                              className={`flex-1 px-4 py-2 rounded-xl border text-sm font-medium outline-none transition-colors ${
                                oIdx === q.correctIdx ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-white border-gray-200 text-gray-600 focus:border-blue-400'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newQ = { id: Math.random().toString(), text: 'Yangi savol...', options: ['', '', '', ''], correctIdx: 0 };
                      setExamData({ ...examData, questions: [...examData.questions, newQ] });
                    }}
                    className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="h-5 w-5" /> YANGI SAVOL QO'SHISH
                  </button>
                </div>
              </div>
            )}

            <button 
              onClick={saveExam}
              disabled={loading || (examAiMode === 'manual' && examData.questions.length === 0)}
              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              IMTIHONNI REJALASHTIRISH VA SAQLASH
            </button>
           </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm space-y-8">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Imtihonlar bazasi</h3>
                  <p className="text-gray-500 text-sm mt-1">Barcha saqlangan imtihonlar ro'yxati.</p>
                </div>
              </div>
           </div>
           {renderTestsGrid('exam')}
        </div>
       </div>
      ) : null}
    </div>
  );
}

function MultiSelectDropdown({ 
  label, 
  options,
  selectedIds, 
  onChange,
  placeholder,
  theme = 'blue'
}: { 
  label: string, 
  options: any[], 
  selectedIds: string[], 
  onChange: (id: string, checked: boolean) => void, 
  placeholder: string,
  theme?: 'blue' | 'purple'
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const themeClasses = theme === 'purple' ? 'focus:ring-purple-600 text-purple-600' : 'focus:ring-blue-600 text-blue-600';

  return (
    <div className="space-y-4 relative w-full" ref={dropdownRef}>
      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <div 
        className={`w-full px-5 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 cursor-pointer flex justify-between items-center transition-colors ${open ? 'border-gray-300' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className="font-bold text-gray-700">
          {selectedIds.length > 0 ? `${selectedIds.length} ta tanlandi` : placeholder}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      
      {open && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto p-2">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 font-medium">Ro'yxat bo'sh</div>
          ) : (
            options.map(opt => (
              <label key={opt.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                <input 
                  type="checkbox"
                  checked={selectedIds.includes(opt.id)}
                  onChange={(e) => onChange(opt.id, e.target.checked)}
                  className={`w-5 h-5 rounded border-gray-300 ${themeClasses}`}
                />
                <span className="font-bold text-gray-700">{opt.name}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
