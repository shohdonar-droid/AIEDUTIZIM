import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy, where, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebase';
import { Faculty, Department, Group, Question } from '../../types';
import { generateDynamicTest } from '../../services/geminiService';
import { Brain, FileUp, Sparkles, Loader2, Save, Trash2, Calendar, Database, X, Plus, PlayCircle, GraduationCap, ArrowRight, CheckCircle, AlertTriangle, Edit2, Download, Copy } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminAutoTests() {
  const { user } = useAuth();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [savedTests, setSavedTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Form State
  const [isCreating, setIsCreating] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  
  // Multiple Selection Arrays
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<string[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Generation Settings
  const [creationMethod, setCreationMethod] = useState<'ai' | 'manual'>('ai');
  const [topic, setTopic] = useState('');
  const [testCount, setTestCount] = useState(10);
  const [randomCount, setRandomCount] = useState<number>(10);
  const [context, setContext] = useState('');

  const defaultManualTemplate = `++++
Savol matni shu yerda bo'ladi?
====
Noto'g'ri variant 1
====
#To'g'ri variant (oldida # belgisi bilan)
====
Noto'g'ri variant 2
====
Noto'g'ri variant 3

++++
Inson tanasidagi eng katta organ nima?
====
#Teri
====
Yurak
====
Jigar
====
O'pka`;

  const [manualText, setManualText] = useState(defaultManualTemplate);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);

  useEffect(() => {
    fetchAcademicData();
    fetchAutoTests();
  }, []);

  const fetchAcademicData = async () => {
    try {
      const facs = await getDocs(collection(db, 'faculties'));
      const depts = await getDocs(collection(db, 'departments'));
      const grps = await getDocs(collection(db, 'groups'));
      const orgsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));

      setFaculties(facs.docs.map(d => ({ id: d.id, ...d.data() } as Faculty)));
      setDepartments(depts.docs.map(d => ({ id: d.id, ...d.data() } as Department)));
      setGroups(grps.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
      setOrganizations(orgsSnap.docs.map(d => ({ uid: d.id, ...d.data() })));

      // Pre-select if current user is a teacher (organization)
      if (user?.role === 'teacher') {
        setSelectedOrgId(user?.uid || '');
      }
    } catch (err) {
      console.error("Error fetching academic data:", err);
    } finally {
      setFetchingData(false);
    }
  };

  const fetchAutoTests = async () => {
    try {
      const q = query(collection(db, 'auto_tests'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setSavedTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching auto tests:", err);
    }
  };

  // Filter based on cascading hierarchy (multi-select arrays)
  const filteredFaculties = faculties.filter(f => !selectedOrgId || f.teacherId === selectedOrgId);
  const filteredDepts = departments.filter(d => 
    selectedFacultyIds.length === 0 
      ? (!selectedOrgId || faculties.filter(f => f.teacherId === selectedOrgId).map(f => f.id).includes(d.facultyId || ''))
      : selectedFacultyIds.includes(d.facultyId || '')
  );
  const filteredGroups = groups.filter(g => 
    selectedDeptIds.length === 0 
      ? (selectedFacultyIds.length === 0 
          ? (!selectedOrgId || faculties.filter(f => f.teacherId === selectedOrgId).map(f => f.id).includes(g.facultyId || ''))
          : departments.filter(d => selectedFacultyIds.includes(d.facultyId || '')).map(d => d.id).includes(g.departmentId))
      : selectedDeptIds.includes(g.departmentId)
  );

  // Parse manual input template
  const parseManualText = () => {
    if (!manualText.trim()) {
      alert("Iltimos, shablon bo'yicha matnni kiriting.");
      return;
    }

    const blocks = manualText.split('++++').map(b => b.trim()).filter(b => b);
    const questions: Question[] = [];

    for (const block of blocks) {
      const parts = block.split('====').map(p => p.trim());
      if (parts.length < 2) continue;

      const qText = parts[0];
      const optionParts = parts.slice(1).filter(p => p !== '');

      const options: string[] = [];
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
          options,
          correctIdx
        });
      }
    }

    if (questions.length === 0) {
      alert("Shablon formatida xatolik bor. Har bir savol ++++ bilan boshlanishi va variantlar ==== bilan ajratilishi kerak.");
      return;
    }

    setGeneratedQuestions(questions);
    alert(`${questions.length} ta savol muvaffaqiyatli o'qildi va yuklandi!`);
  };

  // Generate questions using AI (Gemini)
  const handleAiGenerate = async () => {
    if (!topic.trim()) {
      alert("Iltimos, AI uchun test mavzusini kiriting.");
      return;
    }

    setLoading(true);
    try {
      const questions = await generateDynamicTest(topic, testCount, context);
      const withIds = questions.map(q => ({
        ...q,
        id: Math.random().toString()
      }));
      setGeneratedQuestions(withIds);
      alert(`${withIds.length} ta test savollari AI orqali muvaffaqiyatli yaratildi!`);
    } catch (err: any) {
      alert(err.message || "AI test yaratishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  // Delete question from preview
  const handleDeleteQuestion = (id: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q.id !== id));
  };

  // Save full auto test to Firestore (supports save/update and cloning as copy)
  const handleSaveTest = async (saveAsCopy: boolean = false) => {
    if (!title.trim()) {
      alert("Iltimos, test sarlavhasini kiriting.");
      return;
    }
    if (!selectedOrgId) {
      alert("Tashkilotni tanlang.");
      return;
    }
    if (selectedFacultyIds.length === 0) {
      alert("Iltimos, kamida bitta fakultetni tanlang.");
      return;
    }
    if (selectedDeptIds.length === 0) {
      alert("Iltimos, kamida bitta yo'nalishni tanlang.");
      return;
    }
    if (selectedGroupIds.length === 0) {
      alert("Iltimos, kamida bitta guruhni tanlang.");
      return;
    }
    if (generatedQuestions.length === 0) {
      alert("Hech qanday savol qo'shilmagan. Avval AI orqali yoki qo'lda savollar yarating.");
      return;
    }

    setLoading(true);
    try {
      const orgName = organizations.find(o => o.uid === selectedOrgId)?.displayName || '';
      const facNames = faculties.filter(f => selectedFacultyIds.includes(f.id)).map(f => f.name);
      const deptNames = departments.filter(d => selectedDeptIds.includes(d.id)).map(d => d.name);
      const grpNames = groups.filter(g => selectedGroupIds.includes(g.id)).map(g => g.name);

      let finalRandomCount = Number(randomCount);
      if (!finalRandomCount || finalRandomCount <= 0) {
        finalRandomCount = generatedQuestions.length;
      } else if (finalRandomCount > generatedQuestions.length) {
        finalRandomCount = generatedQuestions.length;
      }

      const testData = {
        title,
        teacherId: selectedOrgId,
        teacherName: orgName,
        facultyIds: selectedFacultyIds,
        facultyNames: facNames,
        departmentIds: selectedDeptIds,
        departmentNames: deptNames,
        groupIds: selectedGroupIds,
        groupNames: grpNames,
        
        // Single field fallbacks for backward compatibility
        facultyId: selectedFacultyIds[0] || '',
        facultyName: facNames[0] || '',
        departmentId: selectedDeptIds[0] || '',
        departmentName: deptNames[0] || '',
        groupId: selectedGroupIds[0] || '',
        groupName: grpNames[0] || '',

        questions: generatedQuestions,
        randomCount: finalRandomCount,
        creatorId: user?.uid || '',
        creatorName: user?.displayName || 'Admin',
        createdAt: serverTimestamp()
      };

      if (editingTestId && !saveAsCopy) {
        await setDoc(doc(db, 'auto_tests', editingTestId), testData, { merge: true });
        alert("Avto test muvaffaqiyatli tahrirlandi va yangilandi!");
      } else {
        await addDoc(collection(db, 'auto_tests'), testData);
        alert(saveAsCopy ? "Avto test nusxa sifatida saqlandi!" : "Avto test muvaffaqiyatli saqlandi!");
      }
      
      // Reset form
      setTitle('');
      setEditingTestId(null);
      if (user?.role !== 'teacher') {
        setSelectedOrgId('');
      }
      setSelectedFacultyIds([]);
      setSelectedDeptIds([]);
      setSelectedGroupIds([]);
      setGeneratedQuestions([]);
      setTopic('');
      setContext('');
      setRandomCount(10);
      setIsCreating(false);
      fetchAutoTests();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'auto_tests');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTest = (test: any) => {
    setEditingTestId(test.id);
    setTitle(test.title || '');
    setSelectedOrgId(test.teacherId || '');
    
    // Load arrays or fallback to single values
    const facs = test.facultyIds || (test.facultyId ? [test.facultyId] : []);
    const depts = test.departmentIds || (test.departmentId ? [test.departmentId] : []);
    const grps = test.groupIds || (test.groupId ? [test.groupId] : []);
    
    setSelectedFacultyIds(facs);
    setSelectedDeptIds(depts);
    setSelectedGroupIds(grps);
    
    setGeneratedQuestions(test.questions || []);
    setRandomCount(test.randomCount || 10);
    setIsCreating(true);
  };

  const exportToWord = (test: any) => {
    const formattedTitle = test.title || "avto_test";
    const dateStr = test.createdAt ? new Date(test.createdAt.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString();
    
    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${test.title}</title>
        <style>
          body { font-family: "Calibri", "Arial", sans-serif; line-height: 1.5; font-size: 11pt; color: #1e293b; }
          h1 { font-family: "Georgia", serif; font-size: 20pt; font-weight: bold; color: #1e3a8a; margin-bottom: 5px; text-align: center; }
          .meta-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 30px; }
          .meta-table td { padding: 6px 12px; border: 1px solid #cbd5e1; font-size: 9.5pt; font-weight: bold; background-color: #f8fafc; }
          .question-block { margin-bottom: 25px; page-break-inside: avoid; }
          .question-text { font-size: 11.5pt; font-weight: bold; color: #0f172a; margin-bottom: 8px; }
          .options-grid { margin-left: 20px; }
          .option-item { font-size: 10.5pt; margin-bottom: 4px; }
          .correct-mark { color: #10b981; font-weight: bold; }
          .answer-key-section { margin-top: 40px; border-top: 2px solid #1e3a8a; padding-top: 20px; page-break-before: always; }
          .key-title { font-size: 14pt; font-weight: bold; color: #1e3a8a; margin-bottom: 15px; }
          .key-table { width: 100%; max-width: 400px; border-collapse: collapse; }
          .key-table th, .key-table td { border: 1px solid #cbd5e1; padding: 6px; text-align: center; }
          .key-table th { background-color: #f1f5f9; font-weight: bold; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 20px;">
          <h1>${formattedTitle.toUpperCase()}</h1>
          <p style="font-size: 10pt; color: #64748b; margin-top: 0;">Sana: ${dateStr}</p>
        </div>

        <table class="meta-table">
          <tr>
            <td>Tashkilot / O'qituvchi:</td>
            <td>${test.teacherName || 'Admin'}</td>
            <td>Yaratuvchi:</td>
            <td>${test.creatorName || 'Tizim'}</td>
          </tr>
          <tr>
            <td>Fakultet(lar):</td>
            <td>${test.facultyNames?.join(', ') || test.facultyName || 'Barchasi'}</td>
            <td>Yo'nalish(lar):</td>
            <td>${test.departmentNames?.join(', ') || test.departmentName || 'Barchasi'}</td>
          </tr>
          <tr>
            <td>Guruh(lar):</td>
            <td>${test.groupNames?.join(', ') || test.groupName || 'Barchasi'}</td>
            <td>Savollar soni:</td>
            <td>${test.questions?.length || 0} ta</td>
          </tr>
        </table>

        <hr style="border: 1px solid #e2e8f0; margin-bottom: 30px;" />

        <div style="margin-top: 20px;">
          ${(test.questions || []).map((q: any, idx: number) => `
            <div class="question-block">
              <div class="question-text">${idx + 1}. ${q.text}</div>
              <div class="options-grid">
                ${(q.options || []).map((opt: string, optIdx: number) => {
                  const prefix = String.fromCharCode(65 + optIdx); // A, B, C, D
                  const isCorrect = optIdx === q.correctIdx;
                  return `
                    <div class="option-item">
                      <strong>${prefix})</strong> ${opt} ${isCorrect ? '<span class="correct-mark"> (To\'g\'ri javob)</span>' : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="answer-key-section">
          <div class="key-title">JAVOBLAR KALITI</div>
          <table class="key-table">
            <thead>
              <tr>
                <th>Savol №</th>
                <th>To'g'ri javob</th>
              </tr>
            </thead>
            <tbody>
              ${(test.questions || []).map((q: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${String.fromCharCode(65 + q.correctIdx)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formattedTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_shablon.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Delete saved auto test
  const handleDeleteTest = async (testId: string) => {
    if (!confirm("Ushbu Avto Testni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteDoc(doc(db, 'auto_tests', testId));
      setSavedTests(prev => prev.filter(t => t.id !== testId));
      alert("O'chirildi!");
    } catch (err) {
      console.error(err);
    }
  };

  if (fetchingData) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">AVTO TEST</h2>
          <p className="text-gray-500 font-medium mt-1">AI va qo'lda kiritish orqali tezkor javobli guruh testlarini boshqarish</p>
        </div>

        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition shadow-md hover:shadow-lg hover:shadow-blue-100"
          >
            <Plus className="w-5 h-5" />
            Yangi Avto Test yaratish
          </button>
        )}
      </div>

      {isCreating ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center border-b border-gray-50 pb-5">
            <h3 className="text-xl font-bold text-gray-900">{editingTestId ? "Avto Testni Tahrirlash" : "Yangi Avto Test Builder"}</h3>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingTestId(null);
                setTitle('');
                setSelectedOrgId(user?.role === 'teacher' ? (user?.uid || '') : '');
                setSelectedFacultyIds([]);
                setSelectedDeptIds([]);
                setSelectedGroupIds([]);
                setGeneratedQuestions([]);
                setTopic('');
                setContext('');
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Test Sarlavhasi</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Masalan: Fizika fanidan oraliq avto test"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tasodifiy Savollar Soni (Har safar)</label>
              <input
                type="number"
                value={randomCount}
                min={1}
                onChange={e => setRandomCount(Number(e.target.value))}
                placeholder="Har safar nechtasi chiqishi kerak"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium transition"
              />
              <span className="text-[10px] text-gray-400 mt-1 block px-1">Talabaga umumiy jamg'armadan tasodifiy ravishda shuncha savol chiqariladi.</span>
            </div>
          </div>

          {/* Org Selector & Multi-selection Targeting lists */}
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tashkilot</label>
              <select
                value={selectedOrgId}
                disabled={user?.role === 'teacher'}
                onChange={e => {
                  setSelectedOrgId(e.target.value);
                  setSelectedFacultyIds([]);
                  setSelectedDeptIds([]);
                  setSelectedGroupIds([]);
                }}
                className="max-w-md w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium transition disabled:bg-gray-50 disabled:opacity-60"
              >
                <option value="">Tanlang...</option>
                {organizations.map(o => <option key={o.uid} value={o.uid}>{o.displayName}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {/* Faculty Checkbox Grid */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Fakultetlar (Bir nechta tanlash mumkin)</label>
                <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50/50 max-h-56 overflow-y-auto space-y-2">
                  {filteredFaculties.map(f => {
                    const isSelected = selectedFacultyIds.includes(f.id);
                    return (
                      <label key={f.id} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50/80 transition-all">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedFacultyIds(selectedFacultyIds.filter(id => id !== f.id));
                            } else {
                              setSelectedFacultyIds([...selectedFacultyIds, f.id]);
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-gray-300"
                        />
                        <span className="text-xs font-bold text-gray-700">{f.name}</span>
                      </label>
                    );
                  })}
                  {filteredFaculties.length === 0 && (
                    <span className="text-xs text-gray-400 block p-2 text-center">Fakultetlar topilmadi.</span>
                  )}
                </div>
              </div>

              {/* Department Checkbox Grid */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Yo'nalishlar (Bir nechta tanlash mumkin)</label>
                <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50/50 max-h-56 overflow-y-auto space-y-2">
                  {filteredDepts.map(d => {
                    const isSelected = selectedDeptIds.includes(d.id);
                    return (
                      <label key={d.id} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50/80 transition-all">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedDeptIds(selectedDeptIds.filter(id => id !== d.id));
                            } else {
                              setSelectedDeptIds([...selectedDeptIds, d.id]);
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-gray-300"
                        />
                        <span className="text-xs font-bold text-gray-700">{d.name}</span>
                      </label>
                    );
                  })}
                  {filteredDepts.length === 0 && (
                    <span className="text-xs text-gray-400 block p-2 text-center">Tegishli yo'nalishlar topilmadi.</span>
                  )}
                </div>
              </div>

              {/* Group Checkbox Grid */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Guruhlar (Bir nechta tanlash mumkin)</label>
                <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50/50 max-h-56 overflow-y-auto space-y-2">
                  {filteredGroups.map(g => {
                    const isSelected = selectedGroupIds.includes(g.id);
                    return (
                      <label key={g.id} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50/80 transition-all">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedGroupIds(selectedGroupIds.filter(id => id !== g.id));
                            } else {
                              setSelectedGroupIds([...selectedGroupIds, g.id]);
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-gray-300"
                        />
                        <span className="text-xs font-bold text-gray-700">{g.name}</span>
                      </label>
                    );
                  })}
                  {filteredGroups.length === 0 && (
                    <span className="text-xs text-gray-400 block p-2 text-center">Tegishli guruhlar topilmadi.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 space-y-6">
            <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-2xl w-fit border border-gray-100">
              <button
                type="button"
                onClick={() => setCreationMethod('ai')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-xs ${
                  creationMethod === 'ai' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI Orqali Yaratish
              </button>
              <button
                type="button"
                onClick={() => setCreationMethod('manual')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-xs ${
                  creationMethod === 'manual' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <FileUp className="w-4 h-4" />
                Qo'lda Kiritish (Shablon)
              </button>
            </div>

            {creationMethod === 'ai' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-blue-50/20 p-6 rounded-3xl border border-blue-100/30">
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-blue-600 uppercase tracking-widest mb-2 px-1">AI uchun Mavzu</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="Mavzu: Informatika asoslari, HTML va CSS"
                      className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-blue-600 uppercase tracking-widest mb-2 px-1">Qo'shimcha Kontekst (Ixtiyoriy)</label>
                    <textarea
                      value={context}
                      onChange={e => setContext(e.target.value)}
                      placeholder="Masalan: Test oson darajada bo'lsin, asosan amaliy misollar bo'lsin"
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium transition resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-blue-600 uppercase tracking-widest mb-2 px-1">Savollar Soni</label>
                    <input
                      type="number"
                      value={testCount}
                      min={1}
                      max={30}
                      onChange={e => setTestCount(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium transition"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Brain className="w-5 h-5" />
                        AI Test Yaratish
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border border-gray-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest px-1">Savollarni shablon asosida kiriting</label>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold">Maxsus Shablon</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Sarlavha satrini boshida <code className="font-mono bg-white px-1 text-gray-700 font-bold border border-gray-200 rounded">++++</code> qo'ying. Variantlarni <code className="font-mono bg-white px-1 text-gray-700 font-bold border border-gray-200 rounded">====</code> bilan ajrating. To'g'ri variant oldiga <code className="font-mono bg-white px-1 text-gray-700 font-bold border border-gray-200 rounded">#</code> belgisini qo'ying.
                  </p>
                </div>

                <textarea
                  value={manualText}
                  onChange={e => setManualText(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 font-mono text-xs border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={parseManualText}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-sm"
                  >
                    <Database className="w-4 h-4" />
                    Shablondan o'qish (Parse)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Generated Questions Preview list */}
          {generatedQuestions.length > 0 && (
            <div className="border-t border-gray-100 pt-8 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-bold text-gray-900">Savollar ro'yxati ({generatedQuestions.length} ta)</h4>
                <button
                  type="button"
                  onClick={() => setGeneratedQuestions([])}
                  className="text-xs text-red-500 hover:text-red-700 font-bold"
                >
                  Hammasini tozalash
                </button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {generatedQuestions.map((q, qIdx) => (
                  <div key={q.id || qIdx} className="bg-slate-50 border border-gray-100 rounded-2xl p-5 relative group">
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id || '')}
                      className="absolute right-4 top-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <p className="font-bold text-gray-900 pr-8">{qIdx + 1}. {q.text}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                            oIdx === q.correctIdx
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-white border-gray-200 text-gray-600'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${oIdx === q.correctIdx ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-4 border-t border-gray-50">
                {editingTestId && (
                  <button
                    type="button"
                    onClick={() => handleSaveTest(true)} // saveAsCopy = true
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md hover:shadow-blue-100 disabled:opacity-50 w-full sm:w-auto"
                  >
                    <Copy className="w-4.5 h-4.5" />
                    Nusxa sifatida saqlash
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSaveTest(false)} // saveAsCopy = false
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition shadow-md hover:shadow-lg hover:shadow-emerald-100 disabled:opacity-50 w-full sm:w-auto"
                >
                  <Save className="w-5 h-5" />
                  {editingTestId ? "O'zgarishlarni Saqlash" : "Avto Testni Saqlash"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
            <h3 className="font-bold text-gray-900">Mavjud Avto Testlar ({savedTests.length} ta)</h3>
          </div>

          <div className="divide-y divide-gray-50">
            {savedTests.map((test) => (
              <div key={test.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50/40 transition">
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full font-bold">
                      {test.questions?.length || 0} ta Savol
                    </span>
                    {test.randomCount && test.randomCount < (test.questions?.length || 0) && (
                      <span className="text-xs bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded-full font-bold">
                        Tasodifiy: {test.randomCount} ta savol
                      </span>
                    )}
                    {test.teacherName && (
                      <span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-0.5 rounded-full font-bold">
                        Tashkilot: {test.teacherName}
                      </span>
                    )}
                  </div>

                  <h4 className="text-lg font-bold text-gray-900">{test.title}</h4>
                  
                  <div className="mt-2 space-y-1 text-xs text-gray-500 font-medium">
                    <p>
                      <strong className="text-gray-700">Fakultet(lar):</strong>{' '}
                      {test.facultyNames?.join(', ') || test.facultyName || 'Barchasi'}
                    </p>
                    <p>
                      <strong className="text-gray-700">Yo'nalish(lar):</strong>{' '}
                      {test.departmentNames?.join(', ') || test.departmentName || 'Barchasi'}
                    </p>
                    <p>
                      <strong className="text-gray-700">Guruh(lar):</strong>{' '}
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                        {test.groupNames?.join(', ') || test.groupName || 'Barchasi'}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">Yaratuvchi: {test.creatorName || 'Admin'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => exportToWord(test)}
                    className="p-3 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition"
                    title="Word formatida yuklab olish"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEditTest(test)}
                    className="p-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition"
                    title="Tahrirlash"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTest(test.id)}
                    className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition"
                    title="O'chirish"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}

            {savedTests.length === 0 && (
              <div className="p-12 text-center text-gray-400">
                <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-bold text-sm">Hozircha hech qanday Avto Test yaratilmagan.</p>
                <p className="text-xs mt-1">Yangi Avto test yaratish tugmasi orqali boshlang.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
