import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { Course, Module, Department, Group, UserProfile } from '../../types';
import { MultiSelectDropdown } from '../../components/MultiSelectDropdown';
import { Plus, Edit, Trash2, Loader2, Book, Layout, Save, X, Database, PlayCircle } from 'lucide-react';
import { seedCourses } from './seed_courses';
import { useAuth } from '../../hooks/useAuth';

export default function AdminCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  type TabType = 'base' | 'orgs' | 'all';
  const [activeTab, setActiveTab] = useState<TabType>('base');

  useEffect(() => {
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'courses'));
    
    // Fetch all depts, groups and teachers (organizations)
    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap) => {
      setDepartments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'departments'));

    const unsubGroups = onSnapshot(collection(db, 'groups'), (snap) => {
      setGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'groups'));

    const unsubTeachers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'teacher')), (snap) => {
      const teachers = snap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
      setTeachers(teachers);
      setTeachersList(teachers);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'teachers'));

    return () => { unsubCourses(); unsubDepts(); unsubGroups(); unsubTeachers(); };
  }, []);

  const handleSeed = async () => {
    if(!confirm("Yangi 7 ta kurs yaratilsinmi?")) return;
    setSeedLoading(true);
    try {
       await seedCourses();
       alert("Kurslar yaratildi!");
    } catch(err) {
       console.error(err);
    } finally {
       setSeedLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingCourse?.title) return;
    setLoading(true);

    try {
      if (editingCourse.id) {
        await updateDoc(doc(db, 'courses', editingCourse.id), editingCourse);
      } else {
        await addDoc(collection(db, 'courses'), {
          ...editingCourse,
          creatorRole: user?.role || 'admin',
          creatorId: user?.uid || 'admin',
          modules: editingCourse.modules || Array(5).fill(null).map((_, i) => ({
            id: `m${i+1}`,
            title: i === 4 ? `Yakuniy Imtihon` : `Modul ${i+1}`,
            content: 'Darslik matni bu yerda bo\'ladi...',
            videoUrl: ''
          })),
          createdAt: serverTimestamp()
        });
      }
      setEditingCourse(null);
    } catch (err: any) { 
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'courses');
    }
    finally { setLoading(false); }
  };

  const handleDelete = async (courseId: string) => {
    if (!courseId) return;
    if (!window.confirm('Kursni o\'chirishni xohlaysizmi? Ushbu amal ortga qaytarilmaydi.')) return;
    
    setLoading(true);
    try {
      console.log("Deleting course:", courseId);
      // 1. Delete associated tests and their results
      const qTests = query(collection(db, 'tests'), where('courseId', '==', courseId));
      const snapTests = await getDocs(qTests);
      for (const d of snapTests.docs) {
         // Delete test results
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
      console.error("Delete error:", err);
      alert("Xatolik: " + (err.message || "Kursni o'chirishda xato"));
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

  // Improved filtering by tab
  const filteredCourses = courses.filter(c => {
    if (activeTab === 'base') return !c.creatorRole || c.creatorRole === 'admin';
    if (activeTab === 'orgs') return c.creatorRole === 'teacher' || c.teacherId;
    return true; // 'all'
  });

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Kurslar boshqaruvi</h1>
          <p className="text-gray-500 mt-2 text-lg">Yangi kurslar yarating va mavjudlarini tahrirlang.</p>
        </div>
        <div className="flex gap-4">
           <button
             onClick={() => setEditingCourse({ 
                 title: '', description: '', thumbnail: '',
                 creatorId: user?.uid,
                 creatorRole: 'admin',
                 creatorName: user?.displayName || 'Admin',
                 modules: Array(5).fill(null).map((_, i) => ({
                   id: `m${i+1}`, title: i === 4 ? 'Yakuniy Imtihon' : `Modul ${i+1}`, content: 'Darslik matni...', videoUrl: ''
                 })) 
             })}
             className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black shadow-2xl hover:bg-black transition-all"
           >
             <Plus className="h-5 w-5" />
             YANGI KURS
           </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm w-fit max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('base')}
          className={`px-8 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'base' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Asosiy Kurslar
        </button>
        <button
          onClick={() => setActiveTab('orgs')}
          className={`px-8 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'orgs' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Tashkilotlar Kurslari
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-8 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Barchasi ({courses.length})
        </button>
      </div>

      {editingCourse && (
        <div className="bg-white rounded-3xl p-10 border-4 border-blue-100 shadow-2xl space-y-8 animate-in fade-in slide-in-from-top-4">
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
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-bold"
                value={editingCourse.title}
                onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
              />
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Muqova URL</label>
              <input
                type="text"
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-medium"
                value={editingCourse.thumbnail}
                onChange={(e) => setEditingCourse({ ...editingCourse, thumbnail: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Ko'rinish filtri</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <MultiSelectDropdown
                  label="Tashkilotlar"
                  options={teachersList.map(t => ({ id: t.id, name: t.displayName }))}
                  selectedIds={editingCourse.organizationIds || []}
                  onChange={(id, checked) => {
                    const nextOrgs = checked 
                      ? [...(editingCourse.organizationIds || []), id]
                      : (editingCourse.organizationIds || []).filter(oId => oId !== id);
                    setEditingCourse({ 
                      ...editingCourse, 
                      organizationIds: nextOrgs,
                      departmentIds: [],
                      groupIds: []
                    });
                  }}
                  placeholder="Barcha uchun ochiq"
                />
                <MultiSelectDropdown
                  label="Yo'nalishlar"
                  options={(editingCourse.organizationIds || []).length > 0 
                    ? departments.filter(d => (editingCourse.organizationIds || []).includes(d.creatorId || '')) 
                    : departments}
                  selectedIds={editingCourse.departmentIds || []}
                  onChange={(id, checked) => {
                    const nextDepts = checked 
                      ? [...(editingCourse.departmentIds || []), id]
                      : (editingCourse.departmentIds || []).filter(dId => dId !== id);
                    setEditingCourse({ 
                      ...editingCourse, 
                      departmentIds: nextDepts,
                      groupIds: (editingCourse.groupIds || []).filter(gid => {
                         const g = groups.find(x => x.id === gid);
                         return g && (nextDepts.includes(g.departmentId));
                      })
                    });
                  }}
                  placeholder="Barcha yo'nalishlar"
                />
                <MultiSelectDropdown
                  label="Guruhlar"
                  options={(editingCourse.departmentIds || []).length > 0
                    ? groups.filter(g => (editingCourse.departmentIds || []).includes(g.departmentId))
                    : []}
                  selectedIds={editingCourse.groupIds || []}
                  onChange={(id, checked) => {
                    const nextGroups = checked 
                      ? [...(editingCourse.groupIds || []), id]
                      : (editingCourse.groupIds || []).filter(gId => gId !== id);
                    setEditingCourse({ ...editingCourse, groupIds: nextGroups });
                  }}
                  placeholder={(editingCourse.departmentIds || []).length > 0 ? "Barcha guruhlar" : "Oldin yo'nalishni tanlang"}
                />
              </div>
            </div>
            
            <div className="md:col-span-2 space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Tavsif</label>
              <textarea
                rows={3}
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-600 font-medium leading-relaxed"
                value={editingCourse.description}
                onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
              />
            </div>
          </div>
          
          {/* Modules Section */}
          <div className="space-y-6 pt-6 border-t border-gray-100">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Layout className="h-5 w-5"/> Modullar va Kontent</h3>
             </div>
             
             {editingCourse.modules?.map((mod, idx) => (
                <div key={idx} className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-100 relative">
                   <div className="absolute top-4 right-4 bg-blue-100 text-blue-800 text-xs font-black px-3 py-1 rounded-full">
                      MODUL {idx + 1}
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Mavzu</label>
                         <input
                           type="text"
                           className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 font-bold"
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
                           className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 font-medium"
                           value={mod.videoUrl || ''}
                           onChange={(e) => updateModule(idx, 'videoUrl', e.target.value)}
                         />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                         <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Matn/Ma'lumotlar</label>
                         <textarea
                           rows={3}
                           className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 font-medium text-sm"
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
               className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              SAQLASH
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredCourses.map((course) => (
          <div key={course.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all">
            <div className="relative h-48 overflow-hidden">
               <img src={course.thumbnail || null} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-8 space-y-4 flex flex-col flex-1">
               <h3 className="text-xl font-black text-gray-900">{course.title}</h3>
               <div className="flex flex-col gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest opacity-60">
                  <span>{course.creatorRole === 'teacher' ? (course.creatorName || 'Tashkilot Kursi') : 'Asosiy Kurs'}</span>
               </div>
               <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest mt-auto mb-2">
                  <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                    <Layout className="h-4 w-4" />
                    {course.modules?.length || 0} Modul
                  </div>
               </div>
               <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
                  {course.description}
               </p>

               <div className="pt-4 mt-4 border-t border-gray-50 flex justify-between items-center gap-3 relative z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingCourse(course); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Edit className="h-4 w-4" />
                    Tahrir
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(course.id); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    O'chirish
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
