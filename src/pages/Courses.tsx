import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Course } from '../types';
import { BookOpen, Search, ArrowRight, Loader2, Globe, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      // Load from cache or default
      const cached = localStorage.getItem('cache_courses_list');
      if (cached) {
         setCourses(JSON.parse(cached));
         setLoading(false);
      }

      try {
        const snap = await getDocs(collection(db, 'courses'));
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        setCourses(data);
        localStorage.setItem('cache_courses_list', JSON.stringify(data));
      } catch (err: any) {
        console.error('Courses fetch error:', err);
        // If not in cache, fallback to defaults
        if (!courses.length) {
          const defaults = [
            { id: '1', title: 'Python Asoslari', thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=400', description: 'Sun\'iy intellekt uchun asosiy tilni o\'rganing.', modules: [], createdAt: null },
            { id: '2', title: 'Machine Learning', thumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&q=80&w=400', description: 'Ma\'lumotlar tahlili va bashoratlash.', modules: [], createdAt: null },
            { id: '3', title: 'Frontend Development', thumbnail: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?auto=format&fit=crop&q=80&w=400', description: 'Zamonaviy web interfeyslar.', modules: [], createdAt: null },
            { id: '4', title: 'Backend Development', thumbnail: 'https://images.unsplash.com/photo-1623479322729-28b25c16b011?auto=format&fit=crop&q=80&w=400', description: 'Node.js va ma\'lumotlar bazalari.', modules: [], createdAt: null },
            { id: '5', title: 'Data Science', thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400', description: 'Katta hajmdagi ma\'lumotlarni ishlash.', modules: [], createdAt: null },
            { id: '6', title: 'Mobile Development', thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=400', description: 'Zamonaviy mobil ilovalar yaratish.', modules: [], createdAt: null }
          ] as any;
          setCourses(defaults);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = courses.filter(c => {
    // Title search
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;

    // RULE: On the general list, only show content created by ADMIN
    // If user is not logged in, they ONLY see Admin's global content
    const isAdminCourse = c.creatorRole === 'admin' || !c.creatorRole;
    const isGlobalAdminCourse = isAdminCourse && 
                               (!c.organizationIds || c.organizationIds.length === 0) &&
                               (!c.departmentIds || c.departmentIds.length === 0) &&
                               (!c.groupIds || c.groupIds.length === 0);

    if (!user) {
      return isGlobalAdminCourse && c.isPublic !== false;
    }

    if (user.role === 'admin' || user.role === 'subadmin') {
      return isAdminCourse;
    }

    // 2. Assignment logic for logged-in students
    if (user.role === 'student') {
       // Students see Admin content (if global/public)
       if (isGlobalAdminCourse) return true;

       // Strictly check hierarchy if assigned
       const hasGroupFilter = (c.groupIds?.length || 0) > 0;
       const hasDeptFilter = (c.departmentIds?.length || 0) > 0;
       const hasOrgFilter = (c.organizationIds?.length || 0) > 0;

       if (hasGroupFilter) {
          return c.groupIds?.includes(user.groupId || '') || false;
       }
       if (hasDeptFilter) {
          return c.departmentIds?.includes(user.departmentId || '') || false;
       }
       if (hasOrgFilter) {
          return c.organizationIds?.includes(user.teacherId || '') || false;
       }

       // Secondary case: if course was created by their teacher directly
       if (c.creatorId === user.teacherId) return true;
    }

    // 3. Teachers/Organizations see their own courses
    if (user.role === 'teacher' && (c.creatorId === user.uid)) return true;

    return false;
  });

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-[#00f2ff]" /></div>;

  return (
    <div className="py-24 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-20 text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-6 uppercase">Kurslarimiz</h1>
          <p className="text-gray-500 text-xl font-medium">Eng zamonaviy sun'iy intellekt va dasturlash yo'nalishlarida ta'lim oling.</p>
          
          <div className="mt-12 relative max-w-xl mx-auto group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              className="w-full pl-16 pr-8 py-5 rounded-[2rem] bg-white border border-gray-100 shadow-xl shadow-gray-200/20 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-gray-900 placeholder-gray-400"
              placeholder="Kurs qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filtered.map((course) => (
            <div key={course.id} className="bg-white rounded-[2.5rem] overflow-hidden flex flex-col hover:-translate-y-2 transition-all duration-500 group border border-gray-50 shadow-2xl shadow-gray-200/40">
              <div className="h-64 overflow-hidden relative">
                <img src={course.thumbnail || null} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={course.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              <div className="p-10 flex-1 flex flex-col">
                <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tight">{course.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-10 flex-1 font-medium">
                  {course.description}
                </p>
                <div className="flex items-center justify-between pt-8 border-t border-gray-50">
                  <div className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest">
                    <BookOpen className="h-4 w-4" />
                    {course.modules?.length || 0} Modul
                  </div>
                  <Link 
                    to={`/courses/${course.id}`}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm tracking-wide hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  >
                    Boshlash
                    <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
