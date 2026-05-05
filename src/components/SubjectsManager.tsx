import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { generateDynamicTest } from '../services/geminiService';
import { BookOpen, Brain, Loader2, Save, Trash2, Plus, PlayCircle } from 'lucide-react';
import { TeacherTestModal } from '../pages/student/TestExecute'; // We might need to build a custom executor or just reuse TestExecute
import { useNavigate } from 'react-router-dom';

export default function SubjectsManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Create / Edit state
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [testCount, setTestCount] = useState(10);
  const [questions, setQuestions] = useState<any[]>([]);
  const [orgIds, setOrgIds] = useState<string[]>([]);
  const [deptIds, setDeptIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  
  // Data for filters
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      // 1. Load subjects
      let q;
      if (isAdmin) {
        q = query(collection(db, 'subjects'));
      } else if (isStudent) {
        // Students should see subjects assigned to their organization, department, and group
        // Or if no org/dept/group assigned (general subjects)
        // Simplified query: get all, then filter client-side for complex array-contains logic if needed
        // Or just trust client-side for now
        q = query(collection(db, 'subjects'));
      } else {
        // Teacher/Staff
        q = query(collection(db, 'subjects'), where('creatorId', '==', user.uid));
      }
      const snap = await getDocs(q);
      let loadedSubjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (isStudent && user) {
         // Filter based on user dept/group/organization
         loadedSubjects = loadedSubjects.filter(sub => {
            const hasNoFilters = (!sub.organizationIds || sub.organizationIds.length===0) && 
                                 (!sub.departmentIds || sub.departmentIds.length===0) && 
                                 (!sub.groupIds || sub.groupIds.length===0);
            const matchesOrg = sub.organizationIds?.includes(user.teacherId || '');
            const matchesDept = sub.departmentIds?.includes(user.departmentId || '');
            const matchesGroup = sub.groupIds?.includes(user.groupId || '');
            return hasNoFilters || matchesOrg || matchesDept || matchesGroup;
         });
      }
      
      setSubjects(loadedSubjects);

      // 2. Load filter options
      if (!isStudent) {
         const tSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')));
         setOrganizations(tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
         
         const dSnap = await getDocs(collection(db, 'departments'));
         setDepartments(dSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
         
         const gSnap = await getDocs(collection(db, 'groups'));
         setGroups(gSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerate = async () => {
    if (!title || !content) return alert('Mavzu nomi va maruza matnini kiriting');
    setLoading(true);
    try {
      const generated = await generateDynamicTest(title, testCount, content);
      setQuestions(generated);
      alert(`${generated.length} ta test savollari generatsiya qilindi!`);
    } catch (err) {
      console.error(err);
      alert('Test generatsiya qilishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !content || questions.length === 0) {
      return alert('Barcha maydonlarni to\'ldiring va testlarni generatsiya qiling');
    }
    setLoading(true);
    try {
      const payload = {
        title,
        content,
        questions,
        organizationIds: orgIds,
        departmentIds: deptIds,
        groupIds: groupIds,
        creatorId: user?.uid,
        creatorRole: user?.role,
        creatorName: user?.displayName,
        createdAt: serverTimestamp()
      };
      
      if (editingId) {
        await updateDoc(doc(db, 'subjects', editingId), payload);
      } else {
        await addDoc(collection(db, 'subjects'), payload);
      }
      setShowEditor(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error(err);
      alert('Xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Haqiqatan ham o\'chirmoqchimisiz?')) return;
    try {
      await deleteDoc(doc(db, 'subjects', id));
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setTestCount(10);
    setQuestions([]);
    setOrgIds([]);
    setDeptIds([]);
    setGroupIds([]);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Mavzular</h2>
          <p className="text-gray-500 font-medium">Maruza matnlari va sun'iy intellekt orqali test ishlash bo'limi</p>
        </div>
        {!isStudent && (
          <button 
            onClick={() => { resetForm(); setShowEditor(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" /> Mavzu qo'shish
          </button>
        )}
      </div>

      {showEditor && !isStudent && (
        <div className="bg-white p-8 rounded-[32px] border-2 border-gray-100 shadow-xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-gray-900">{editingId ? 'Mavzuni tahrirlash' : 'Yangi mavzu yaratish'}</h3>
            <button onClick={() => setShowEditor(false)} className="text-gray-400 hover:text-gray-600">BEKOR QILISH</button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Mavzu nomi</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none font-bold mt-1" 
                placeholder="Mavzu nomini kiriting" 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {isAdmin && (
                  <MultiSelectDropdown 
                     label="Tashkilotlar" 
                     options={organizations} 
                     selectedIds={orgIds} 
                     onChange={(id, c) => setOrgIds(c ? [...orgIds, id] : orgIds.filter(x => x !== id))} 
                     placeholder="Barcha uchun" 
                  />
               )}
               <MultiSelectDropdown 
                  label="Yo'nalishlar" 
                  options={departments} 
                  selectedIds={deptIds} 
                  onChange={(id, c) => setDeptIds(c ? [...deptIds, id] : deptIds.filter(x => x !== id))} 
                  placeholder="Barcha uchun" 
               />
               <MultiSelectDropdown 
                  label="Guruhlar" 
                  options={groups.filter(g => deptIds.includes(g.departmentId))} 
                  selectedIds={groupIds} 
                  onChange={(id, c) => setGroupIds(c ? [...groupIds, id] : groupIds.filter(x => x !== id))} 
                  placeholder="Barcha uchun" 
               />
            </div>
            
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Ma'ruza matni</label>
              <textarea 
                rows={8} 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none font-medium mt-1 text-sm custom-scrollbar" 
                placeholder="Ma'ruza matnini kiriting. Ushbu matn asosida testlar generatsiya qilinadi..." 
              />
            </div>
            
            <div className="flex items-end gap-4 p-6 bg-purple-50 rounded-2xl border border-purple-100">
               <div className="flex-1">
                 <label className="text-xs font-black text-purple-600 uppercase tracking-widest">Test savollari soni</label>
                 <input 
                   type="number" 
                   value={testCount} 
                   onChange={e => setTestCount(Number(e.target.value))} 
                   className="w-full px-5 py-4 rounded-xl bg-white border-none font-bold mt-1" 
                   min="1" max="30"
                 />
               </div>
               <button 
                 onClick={handleGenerate} 
                 disabled={loading}
                 className="flex items-center gap-2 bg-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-purple-700 transition"
               >
                 {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />} 
                 AI ORQALI TEST TUZISH
               </button>
            </div>
            
            {questions.length > 0 && (
              <div className="space-y-4 mt-6 border-t border-gray-100 pt-6">
                 <div className="p-4 bg-green-50 text-green-700 rounded-xl font-bold flex justify-between items-center">
                    <span>{questions.length} ta test savollari muvaffaqiyatli generatsiya qilindi. Quyida testlarni tahrirlashingiz mumkin.</span>
                    <button 
                      onClick={handleSave} 
                      disabled={loading}
                      className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} SAQLASH
                    </button>
                 </div>
                 <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                    {questions.map((q, idx) => (
                       <div key={idx} className="bg-gray-50 p-4 rounded-xl space-y-3">
                          <div className="font-bold text-gray-700 flex justify-between">
                             <span>{idx + 1}-Savol</span>
                             <button onClick={() => setQuestions(questions.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 p-1">
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                          <input 
                             type="text" 
                             value={q.text} 
                             onChange={(e) => {
                                const newQ = [...questions];
                                newQ[idx].text = e.target.value;
                                setQuestions(newQ);
                             }}
                             className="w-full px-4 py-2 rounded-lg border border-gray-200"
                             placeholder="Savol matni"
                          />
                          <div className="space-y-2">
                             {q.options.map((opt: string, oIdx: number) => (
                                <div key={oIdx} className="flex gap-2 items-center">
                                   <input 
                                     type="radio" 
                                     name={`correct-${idx}`} 
                                     checked={q.correctIdx === oIdx}
                                     onChange={() => {
                                        const newQ = [...questions];
                                        newQ[idx].correctIdx = oIdx;
                                        setQuestions(newQ);
                                     }}
                                   />
                                   <input 
                                     type="text" 
                                     value={opt}
                                     onChange={(e) => {
                                        const newQ = [...questions];
                                        newQ[idx].options[oIdx] = e.target.value;
                                        setQuestions(newQ);
                                     }}
                                     className={`flex-1 px-3 py-1.5 rounded-lg border ${q.correctIdx === oIdx ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                                   />
                                </div>
                             ))}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subjects.map(s => (
          <div key={s.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col h-full hover:shadow-lg transition">
             <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                {!isStudent && (
                   <div className="flex gap-2">
                     <button onClick={() => {
                        setEditingId(s.id);
                        setTitle(s.title);
                        setContent(s.content);
                        setQuestions(s.questions || []);
                        setOrgIds(s.organizationIds || []);
                        setDeptIds(s.departmentIds || []);
                        setGroupIds(s.groupIds || []);
                        setShowEditor(true);
                     }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">Tahrirlash</button>
                     <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
                   </div>
                )}
             </div>
             
             <h3 className="text-xl font-black text-gray-900 mb-2">{s.title}</h3>
             
             <div className="mt-auto pt-6 border-t border-gray-100 flex gap-4">
                <button 
                   onClick={() => navigate(isStudent ? `/student/subjects/read/${s.id}` : `/teacher/subjects/read/${s.id}`)}
                   className="flex-1 py-3 bg-gray-100 text-gray-900 text-center rounded-xl font-bold hover:bg-gray-200"
                >
                   O'qish
                </button>
                {isStudent && (
                   <button 
                      onClick={() => navigate(`/tests/subject_${s.id}`)}
                      className="flex-1 py-3 bg-blue-600 text-white flex items-center justify-center gap-2 rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-200"
                   >
                     <PlayCircle className="w-5 h-5" /> Test ishlash
                   </button>
                )}
             </div>
          </div>
        ))}
        {subjects.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center text-gray-500 font-medium bg-white rounded-3xl border border-gray-100">
            Hozircha fanlar va mavzular yo'q
          </div>
        )}
      </div>
    </div>
  );
}
