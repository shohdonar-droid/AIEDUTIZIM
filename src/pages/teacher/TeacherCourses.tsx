import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDoc, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where, onSnapshot, limit } from 'firebase/firestore';
import { Course, Module, Department, Group } from '../../types';
import { MultiSelectDropdown } from '../../components/MultiSelectDropdown';
import { Plus, Edit, Trash2, Loader2, Layout, Save, X, Sparkles, BookOpen } from 'lucide-react';
import { generateDynamicCourse } from '../../services/geminiService';
import { useAuth } from '../../hooks/useAuth';

export default function TeacherCourses() {
  const { user, refreshUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [baseCourses, setBaseCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [originalCourse, setOriginalCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'templates'>('my');
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const orgId = user?.role === 'staff' ? user.teacherId : user?.uid;
    if (!orgId) return;

    // Listen to all changes in courses
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const allList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      
      const myLocalCourses = allList.filter(c => c.teacherId === orgId);
      const templates = allList.filter(c => !c.teacherId || c.creatorRole === 'admin');
      
      setCourses(myLocalCourses);
      setBaseCourses(templates);
      setLoading(false);
    });

    const unsubDepts = onSnapshot(query(collection(db, 'departments'), where('teacherId', '==', orgId)), (snap) => {
      setDepartments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department)));
    });

    const unsubGroups = onSnapshot(query(collection(db, 'groups'), where('teacherId', '==', orgId)), (snap) => {
       setGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
    });

    return () => { unsubCourses(); unsubDepts(); unsubGroups(); }
  }, [user]);

  const handleImportCourse = async (selectedTemplate: Course) => {
    if (!user) return;
    const orgId = user?.role === 'staff' ? user.teacherId : user?.uid;
    if (!orgId) return;

    if (!window.confirm(`"${selectedTemplate.title}" kursini va unga tegishli barcha darslik va testlarni o'zlashtirishni (Tashkilotingizga import qilishni) xohlaysizmi?`)) {
      return;
    }

    setImportingId(selectedTemplate.id);
    try {
      // 1. Create a deep copy of the course
      const newCourseRef = await addDoc(collection(db, 'courses'), {
        title: selectedTemplate.title,
        description: selectedTemplate.description || '',
        thumbnail: selectedTemplate.thumbnail || '',
        modules: selectedTemplate.modules || [],
        creatorId: user.uid,
        creatorRole: user.role,
        creatorName: user.displayName || 'Tashkilot',
        teacherId: orgId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const newCourseId = newCourseRef.id;

      // 2. Fetch original tests of the template course
      const qTests = query(collection(db, 'tests'), where('courseId', '==', selectedTemplate.id));
      const testSnap = await getDocs(qTests);
      
      let clonedTestsCount = 0;
      for (const tDoc of testSnap.docs) {
        const testData = tDoc.data();
        await addDoc(collection(db, 'tests'), {
          ...testData,
          courseId: newCourseId,
          teacherId: orgId,
          creatorId: user.uid,
          creatorRole: user.role,
          createdAt: serverTimestamp()
        });
        clonedTestsCount++;
      }

      alert(`"${selectedTemplate.title}" muvaffaqiyatli o'zlashtirildi!\n📚 Kurs ko'chirildi.\n📝 ${clonedTestsCount} ta test ko'chirildi.`);
      setActiveTab('my');
    } catch (err: any) {
      console.error("Import error:", err);
      alert("Xatolik: " + err.message);
    } finally {
      setImportingId(null);
    }
  };

  const handleSave = async () => {
    if (!editingCourse?.title || !user) return;
    setLoading(true);

    const isNew = !editingCourse.id;

    try {
      let finalModules = editingCourse.modules || [];
      
      // AI Generation if modules are mostly empty
      const isMostlyEmpty = !finalModules.some(m => m.content && m.content.length > 50);
      if (isMostlyEmpty) {
        const aiCourse = await generateDynamicCourse(editingCourse.title);
        if (aiCourse && aiCourse.modules) {
          finalModules = aiCourse.modules.map((m: any, i: number) => ({
            id: `m${i+1}`,
            title: m.title,
            content: m.content,
            videoUrl: ''
          }));
        }
      }

      const courseData = {
        ...editingCourse,
        modules: finalModules,
        creatorId: user.uid,
        creatorRole: user.role,
        creatorName: user.displayName,
        updatedAt: serverTimestamp()
      };

      if (!isNew) {
        await updateDoc(doc(db, 'courses', editingCourse.id!), {
          ...courseData,
          teacherId: user.role === 'staff' ? user.teacherId : user.uid,
        });
        try {
           await addDoc(collection(db, 'admin_notifications'), {
              text: `📝 Kurs tahrirlandi:\n👤 Yaratuvchi: ${user.displayName}\n📚 Kurs nomi: ${courseData.title}`,
              timestamp: serverTimestamp()
           });
        } catch (e) {}
      } else {
        await addDoc(collection(db, 'courses'), {
           ...courseData,
           teacherId: user.role === 'staff' ? user.teacherId : user.uid,
           createdAt: serverTimestamp()
        });
        try {
           await addDoc(collection(db, 'admin_notifications'), {
              text: `➕ Yangi kurs yaratildi:\n👤 Yaratuvchi: ${user.displayName}\n📚 Kurs nomi: ${courseData.title}`,
              timestamp: serverTimestamp()
           });
        } catch (e) {}
      }

      setEditingCourse(null);
      setOriginalCourse(null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (courseId: string) => {
    if (!courseId) return;
    if (!window.confirm('Kursni o\'chirishni xohlaysizmi? Ushbu amal ortga qaytarilmaydi.')) return;
    
    setLoading(true);
    try {
      console.log("Teacher deleting course:", courseId);
      // 1. Delete associated tests and results
      const qTests = query(collection(db, 'tests'), where('courseId', '==', courseId));
      const snapTests = await getDocs(qTests);
      for (const d of snapTests.docs) {
         const qRes = query(collection(db, 'testResults'), where('testId', '==', d.id));
         const snapRes = await getDocs(qRes);
         for (const resDoc of snapRes.docs) {
           await deleteDoc(doc(db, 'testResults', resDoc.id));
         }
         await deleteDoc(doc(db, 'tests', d.id));
      }

      // 2. Delete enrollments
      const qEnr = query(collection(db, 'enrollments'), where('courseId', '==', courseId));
      const snapEnr = await getDocs(qEnr);
      for (const d of snapEnr.docs) {
         await deleteDoc(doc(db, 'enrollments', d.id));
      }

      // 3. Delete the course itself
      await deleteDoc(doc(db, 'courses', courseId));
      
      alert("Kurs muvaffaqiyatli o'chirildi.");
    } catch(err: any) {
      console.error("Teacher delete error:", err);
      alert('Xatolik yuz berdi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateModule = (index: number, field: keyof Module, value: string) => {
     if(!editingCourse?.modules) return;
     const newModules = [...editingCourse.modules];
     newModules[index] = { ...newModules[index], [field]: value };
     setEditingCourse({ ...editingCourse, modules: newModules });
  };

  const toggleDepartment = (deptId: string) => {
     if (!editingCourse) return;
     const currentDepts = editingCourse.departmentIds || [];
     let newDepts;
     if (currentDepts.includes(deptId)) {
        newDepts = currentDepts.filter(id => id !== deptId);
     } else {
        newDepts = [...currentDepts, deptId];
     }
     setEditingCourse({ ...editingCourse, departmentIds: newDepts });
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">O'z Kurslarim</h1>
          <p className="text-gray-500 mt-2 text-lg">Yangi kurslar yarating va o'z yo'nalishlaringizga biriktiring.</p>
        </div>
        <div className="flex gap-4">
            <button
             onClick={() => setEditingCourse({ 
                 title: '', description: '', thumbnail: '', departmentIds: [], groupIds: [],
                 modules: Array(5).fill(null).map((_, i) => ({
                   id: `m${i+1}`, title: i === 4 ? 'Yakuniy Imtihon' : `Modul ${i+1}`, content: '', videoUrl: ''
                 })) 
             })}
             className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
           >
             <Plus className="h-5 w-5" />
             YANGI KURS
           </button>
        </div>
      </header>

      {editingCourse && (
        <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-xl space-y-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center">
             <h2 className="text-2xl font-black text-gray-900">{editingCourse.id ? 'Kursni tahrirlash' : 'Yangi kurs yaratish'}</h2>
             <button onClick={() => setEditingCourse(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                <X className="h-6 w-6" />
             </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Kurs nomi</label>
              <input
                type="text"
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-600 font-bold"
                value={editingCourse.title}
                onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
              />
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Muqova URL</label>
              <input
                type="text"
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-600 font-medium"
                value={editingCourse.thumbnail}
                onChange={(e) => setEditingCourse({ ...editingCourse, thumbnail: e.target.value })}
              />
            </div>
            
            <div className="md:col-span-2 space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Qaysi yo'nalishlar va guruhlarga ko'rinsin?</label>
              {departments.length === 0 ? (
                <p className="text-sm text-red-500 font-bold bg-red-50 p-4 rounded-xl">Oldin yo'nalish yarating!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <MultiSelectDropdown
                      label="Yo'nalishlar"
                      options={departments}
                      selectedIds={editingCourse.departmentIds || []}
                      onChange={(id, checked) => toggleDepartment(id)}
                      placeholder="Barcha yo'nalishlar"
                      theme="blue"
                    />
                  </div>
                  {editingCourse.departmentIds && editingCourse.departmentIds.length > 0 && (
                    <div>
                      <MultiSelectDropdown
                        label="Guruhlar"
                        options={groups.filter(g => editingCourse.departmentIds?.includes(g.departmentId))}
                        selectedIds={editingCourse.groupIds || []}
                        onChange={(id, checked) => {
                          const current = editingCourse.groupIds || [];
                          const next = checked ? [...current, id] : current.filter(x => x !== id);
                          setEditingCourse({ ...editingCourse, groupIds: next });
                        }}
                        placeholder="Barcha guruhlar"
                        theme="blue"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Tavsif</label>
              <textarea
                rows={3}
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-600 font-medium leading-relaxed"
                value={editingCourse.description}
                onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
              />
            </div>
          </div>
          
          {/* Modules Section */}
          <div className="space-y-6 pt-6 border-t border-gray-100">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Layout className="h-5 w-5"/> Modullar va Kontent</h3>
                <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Har bir modul uchun AI 5 ta test generatsiya qiladi. Yakuniyda 15 ta.</span>
             </div>
             
             {editingCourse.modules?.map((mod, idx) => (
                <div key={idx} className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100 relative">
                   <div className="absolute top-4 right-4 bg-indigo-100 text-indigo-800 text-xs font-black px-3 py-1 rounded-full">
                      MODUL {idx + 1}
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Mavzu</label>
                         <input
                           type="text"
                           className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 font-bold"
                           value={mod.title}
                           onChange={(e) => updateModule(idx, 'title', e.target.value)}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="block text-xs font-black text-gray-400 uppercase tracking-widest flex justify-between">
                            <span>Video URL (YouTube embed)</span>
                         </label>
                         <input
                           type="text"
                           placeholder="https://www.youtube.com/embed/..."
                           className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 font-medium"
                           value={mod.videoUrl || ''}
                           onChange={(e) => updateModule(idx, 'videoUrl', e.target.value)}
                         />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                         <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Matn/Ma'lumotlar (Shu asosida AI test yaratadi)</label>
                         <textarea
                           rows={3}
                           className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-600 font-medium text-sm"
                           value={mod.content}
                           onChange={(e) => updateModule(idx, 'content', e.target.value)}
                         />
                      </div>
                   </div>
                </div>
             ))}
          </div>

          <div className="pt-6 border-t border-gray-50 flex justify-end gap-4">
            <button
               onClick={() => setEditingCourse(null)}
               className="px-8 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              BEKOR QILISH
            </button>
            <button
               onClick={handleSave}
               disabled={loading}
               className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              SAQLASH
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm w-fit max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('my')}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'my' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <BookOpen className="h-5 w-5" />
          Mening Kurslarim ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'templates' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500/20" />
          Asosiy Kurslar / Shablonlar ({baseCourses.length})
        </button>
      </div>

      {activeTab === 'my' ? (
        courses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-dashed border-gray-200 text-center space-y-4">
             <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full w-fit mx-auto">
                <BookOpen className="h-8 w-8" />
             </div>
             <h3 className="text-xl font-black text-gray-800">Sizda hali kurslar yaratilmagan</h3>
             <p className="text-gray-500 max-w-md mx-auto">Tashkilotingiz talabalari o'rganishi uchun yangi kurs yarating yoki yuqoridagi <b>Asosiy Kurslar / Shablonlar</b> tabidan tayyor kurslarni o'zlashtiring!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all">
                <div className="relative h-48 overflow-hidden">
                   <img src={course.thumbnail || undefined} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                   <div className="absolute top-4 right-4 flex gap-2 z-30">
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         setOriginalCourse(course);
                         setEditingCourse(course);
                       }}
                       className="p-2.5 bg-white/90 backdrop-blur text-indigo-600 rounded-xl shadow-lg hover:bg-white transition-colors cursor-pointer"
                     >
                       <Edit className="h-4 w-4" />
                     </button>
                     <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(course.id); }}
                      className="p-2.5 bg-white/90 backdrop-blur text-red-600 rounded-xl shadow-lg hover:bg-white transition-colors cursor-pointer"
                     >
                       <Trash2 className="h-4 w-4" />
                     </button>
                   </div>
                </div>
                <div className="p-8 space-y-4">
                   <h3 className="text-xl font-black text-gray-900">{course.title}</h3>
                   <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                        <Layout className="h-4 w-4" />
                        {course.modules?.length || 0} Modul
                      </div>
                   </div>
                   <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
                      {course.description}
                   </p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        baseCourses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-dashed border-gray-200 text-center text-gray-500">
             Hozirda tizimda shablon kurslar mavjud emas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {baseCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all">
                <div className="relative h-48 overflow-hidden">
                   <img src={course.thumbnail || undefined} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                   <div className="absolute top-4 left-4 bg-amber-500 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1">
                      <Sparkles className="h-3 w-3 fill-white" />
                      TIZIM SHABLONI
                   </div>
                </div>
                <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                   <div className="space-y-4">
                      <h3 className="text-xl font-black text-gray-900">{course.title}</h3>
                      <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                         <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                           <Layout className="h-4 w-4" />
                           {course.modules?.length || 0} Modul
                         </div>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                         {course.description}
                      </p>
                   </div>
                   
                   <button
                     onClick={() => handleImportCourse(course)}
                     disabled={importingId !== null}
                     className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all text-sm uppercase tracking-wider"
                   >
                     {importingId === course.id ? (
                       <Loader2 className="h-5 w-5 animate-spin" />
                     ) : (
                       <Sparkles className="h-5 w-5 text-amber-300 fill-amber-300/20" />
                     )}
                     O'ZLASHTIRISH (IMPORT)
                   </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
