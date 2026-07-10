import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firebase';
import { Faculty, Department, Group, Question } from '../../types';
import { generateDynamicTest } from '../../services/geminiService';
import { Brain, FileUp, Sparkles, Loader2, Save, Trash2, Calendar, Database, X, Plus, PlayCircle, GraduationCap, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminAutoTests() {
  const { user } = useAuth();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [savedTests, setSavedTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Form State
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Generation Settings
  const [creationMethod, setCreationMethod] = useState<'ai' | 'manual'>('ai');
  const [topic, setTopic] = useState('');
  const [testCount, setTestCount] = useState(10);
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

      setFaculties(facs.docs.map(d => ({ id: d.id, ...d.data() } as Faculty)));
      setDepartments(depts.docs.map(d => ({ id: d.id, ...d.data() } as Department)));
      setGroups(grps.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
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

  // Filter depts and groups based on hierarchy
  const filteredDepts = departments.filter(d => d.facultyId === selectedFacultyId);
  const filteredGroups = groups.filter(g => g.departmentId === selectedDeptId);

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

  // Save full auto test to Firestore
  const handleSaveTest = async () => {
    if (!title.trim()) {
      alert("Iltimos, test sarlavhasini kiriting.");
      return;
    }
    if (!selectedFacultyId) {
      alert("Tashkilot/Fakultetni tanlang.");
      return;
    }
    if (!selectedDeptId) {
      alert("Yo'nalishni tanlang.");
      return;
    }
    if (!selectedGroupId) {
      alert("Guruhni tanlang.");
      return;
    }
    if (generatedQuestions.length === 0) {
      alert("Hech qanday savol qo'shilmagan. Avval AI orqali yoki qo'lda savollar yarating.");
      return;
    }

    setLoading(true);
    try {
      const facName = faculties.find(f => f.id === selectedFacultyId)?.name || '';
      const deptName = departments.find(d => d.id === selectedDeptId)?.name || '';
      const grpName = groups.find(g => g.id === selectedGroupId)?.name || '';

      const testData = {
        title,
        facultyId: selectedFacultyId,
        facultyName: facName,
        departmentId: selectedDeptId,
        departmentName: deptName,
        groupId: selectedGroupId,
        groupName: grpName,
        questions: generatedQuestions,
        creatorId: user?.uid || '',
        creatorName: user?.displayName || 'Admin',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'auto_tests'), testData);
      alert("Avto test muvaffaqiyatli saqlandi!");
      
      // Reset form
      setTitle('');
      setSelectedFacultyId('');
      setSelectedDeptId('');
      setSelectedGroupId('');
      setGeneratedQuestions([]);
      setTopic('');
      setContext('');
      setIsCreating(false);
      fetchAutoTests();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'auto_tests');
    } finally {
      setLoading(false);
    }
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
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-8">
          <div className="flex justify-between items-center border-b border-gray-50 pb-5">
            <h3 className="text-xl font-bold text-gray-900">Yangi Avto Test Builder</h3>
            <button
              onClick={() => {
                setIsCreating(false);
                setGeneratedQuestions([]);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="col-span-1 md:col-span-2">
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
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tashkilot / Fakultet</label>
              <select
                value={selectedFacultyId}
                onChange={e => {
                  setSelectedFacultyId(e.target.value);
                  setSelectedDeptId('');
                  setSelectedGroupId('');
                }}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium transition"
              >
                <option value="">Tanlang...</option>
                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Yo'nalish</label>
              <select
                value={selectedDeptId}
                disabled={!selectedFacultyId}
                onChange={e => {
                  setSelectedDeptId(e.target.value);
                  setSelectedGroupId('');
                }}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium transition disabled:bg-gray-50 disabled:opacity-60"
              >
                <option value="">Tanlang...</option>
                {filteredDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Guruh</label>
              <select
                value={selectedGroupId}
                disabled={!selectedDeptId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium transition disabled:bg-gray-50 disabled:opacity-60"
              >
                <option value="">Tanlang...</option>
                {filteredGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
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

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleSaveTest}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition shadow-md hover:shadow-lg hover:shadow-emerald-100 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  Avto Testni Saqlash
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
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full font-bold">
                      {test.questions?.length || 0} ta Savol
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                      {test.facultyName}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                      {test.departmentName}
                    </span>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full font-bold">
                      Guruh: {test.groupName}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-gray-900">{test.title}</h4>
                  <p className="text-xs text-gray-400 font-medium">Yaratuvchi: {test.creatorName || 'Admin'}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
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
