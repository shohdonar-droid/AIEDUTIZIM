import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { Clock, Plus, Trash2, Layers, Users, HelpCircle } from 'lucide-react';

export default function IndependentExams() {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [duration, setDuration] = useState(45); // in mins

  // Questions state
  const [questions, setQuestions] = useState<any[]>([]);
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrectIdx, setQCorrectIdx] = useState(0);

  const [currentCount, setCurrentCount] = useState(0);
  const limit = (user as any)?.limit_exams ?? 1;
  const maxQuestions = (user as any)?.limit_questions_per_exam ?? 10;

  const loadData = async () => {
    if (!user) return;
    try {
      const deptQ = query(collection(db, 'departments'), where('teacherId', '==', user.uid));
      const deptSnap = await getDocs(deptQ);
      setDepartments(deptSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const grpQ = query(collection(db, 'groups'), where('teacherId', '==', user.uid));
      const grpSnap = await getDocs(grpQ);
      setGroups(grpSnap.docs.map(g => ({ id: g.id, ...g.data() })));

      const examQ = query(collection(db, 'tests'), where('teacherId', '==', user.uid), where('type', '==', 'exam'));
      const examSnap = await getDocs(examQ);
      const list = examSnap.docs.map(e => ({ id: e.id, ...e.data() }));
      setExams(list);
      setCurrentCount(list.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleAddQuestion = () => {
    if (!qText.trim()) return;
    if (questions.length >= maxQuestions) {
      alert(`Siz imtihonga ko'pi bilan ${maxQuestions} ta savol qo'sha olasiz.`);
      return;
    }
    if (qOptions.some(o => !o.trim())) {
      alert("Iltimos, barcha variantlarni kiriting!");
      return;
    }

    const newQ = {
      text: qText.trim(),
      options: [...qOptions],
      correctIdx: qCorrectIdx,
      correctAnswer: qOptions[qCorrectIdx]
    };

    setQuestions([...questions, newQ]);
    setQText('');
    setQOptions(['', '', '', '']);
    setQCorrectIdx(0);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedDeptId || !selectedGroupId || !user) return;
    if (questions.length === 0) {
      alert("Iltimos, kamida 1 ta savol qo'shing!");
      return;
    }

    if (currentCount >= limit) {
      alert(`Sizning imtihonlar limiti tugagan (${currentCount} / ${limit}). Iltimos, limitlar bo'limida yangi limit sotib oling.`);
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'tests'), {
        title: title.trim(),
        type: 'exam',
        departmentId: selectedDeptId,
        groupId: selectedGroupId,
        timeLimit: Number(duration),
        questions,
        teacherId: user.uid,
        createdAt: serverTimestamp()
      });

      setTitle('');
      setSelectedDeptId('');
      setSelectedGroupId('');
      setQuestions([]);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ushbu Imtihonni o'chirishni tasdiqlaysizmi?")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'tests', id));
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && exams.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Imtihonlar</h1>
        <p className="text-gray-500 font-medium text-sm mt-1">
          Guruhlar uchun yakuniy nazorat va rasmiy imtihonlarni shakllantirish.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit space-y-6">
          <h3 className="text-lg font-bold text-gray-900">Yangi Imtihon</h3>

          <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between text-xs font-bold text-gray-500">
            <span>Imtihonlar limiti:</span>
            <span className={`${currentCount >= limit ? 'text-red-500' : 'text-blue-600'}`}>{currentCount} / {limit}</span>
          </div>

          <form onSubmit={handleCreateExam} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Yo'nalish (Majburiy)</label>
              <select
                required
                value={selectedDeptId}
                onChange={e => setSelectedDeptId(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tanlang...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Guruh (Majburiy)</label>
              <select
                required
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tanlang...</option>
                {groups.filter(g => g.departmentId === selectedDeptId).map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Imtihon sarlavhasi</label>
              <input
                type="text"
                required
                placeholder="Masalan: JavaScript Yakuniy Nazorati"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 ml-1">Bajarish vaqti (Daqiqa)</label>
              <input
                type="number"
                required
                min={1}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Questions composer */}
            <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
              <span className="text-xs font-black text-gray-700 flex items-center gap-1">
                <HelpCircle className="h-4 w-4 text-cyan-600" /> Savollar ({questions.length} / {maxQuestions})
              </span>

              {questions.length < maxQuestions && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Imtihon savoli matni..."
                    value={qText}
                    onChange={e => setQText(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                  />
                  <div className="space-y-1">
                    {qOptions.map((opt, oIdx) => (
                      <div key={oIdx} className="flex gap-2 items-center">
                        <input
                          type="radio"
                          name="exam_correct_idx"
                          checked={qCorrectIdx === oIdx}
                          onChange={() => setQCorrectIdx(oIdx)}
                        />
                        <input
                          type="text"
                          placeholder={`${oIdx + 1}-variant`}
                          value={opt}
                          onChange={e => {
                            const copy = [...qOptions];
                            copy[oIdx] = e.target.value;
                            setQOptions(copy);
                          }}
                          className="flex-1 px-2 py-1 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="w-full py-1.5 bg-cyan-50 text-cyan-700 rounded-xl text-xs font-bold hover:bg-cyan-100 transition-colors"
                  >
                    Savolni qo'shish
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || currentCount >= limit || questions.length === 0}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Yaratish ({questions.length} savol bilan)
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {questions.length > 0 && (
            <div className="p-6 bg-cyan-50 border border-cyan-100 rounded-3xl space-y-3">
              <h4 className="text-sm font-black text-cyan-900">Yaratilayotgan Imtihon Savollari ({questions.length})</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 bg-white rounded-2xl border border-cyan-250 flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{qIdx + 1}. {q.text}</p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {q.options.map((opt: any, oIdx: number) => (
                          <span key={oIdx} className={`text-[10px] px-2 py-1 rounded-lg ${q.correctIdx === oIdx ? 'bg-green-50 text-green-700 font-bold' : 'bg-gray-50 text-gray-500'}`}>
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button type="button" onClick={() => handleRemoveQuestion(qIdx)} className="text-red-500 hover:text-red-700 text-xs font-bold">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Mavjud Imtihonlar ({exams.length})</h3>
            </div>

            {exams.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-medium">
                Imtihonlar topilmadi.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {exams.map((exam, idx) => {
                  const grp = groups.find(g => g.id === exam.groupId);
                  const dept = departments.find(d => d.id === exam.departmentId);
                  return (
                    <div key={exam.id} className="p-6 hover:bg-gray-50/50 transition-all flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{exam.title}</p>
                            <p className="text-[10px] text-gray-400 font-bold">Muddati: <strong className="text-gray-600">{exam.timeLimit} daqiqa</strong></p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-400">
                          <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            <Layers className="h-3 w-3" /> {dept?.name || "Noma'lum"}
                          </span>
                          <span className="flex items-center gap-1 bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                            <Users className="h-3 w-3" /> {grp?.name || "Noma'lum"}
                          </span>
                          <span className="flex items-center gap-1 bg-cyan-50 text-cyan-600 px-2 py-0.5 rounded-full">
                            Savollar: {exam.questions?.length || 0} ta
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(exam.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
