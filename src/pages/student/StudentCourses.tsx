import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { Course, Enrollment } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { LayoutGrid, CheckCircle2, ChevronRight, PlayCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, Enrollment>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const cSnap = await getDocs(collection(db, 'courses'));
      let cData = cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      
      if (user) {
        cData = cData.filter(course => {
          // 1. Global content (Admin created, no assignments)
          const isGlobal = course.creatorRole === 'admin' && 
                           (!course.organizationIds || course.organizationIds.length === 0) &&
                           (!course.departmentIds || course.departmentIds.length === 0) &&
                           (!course.groupIds || course.groupIds.length === 0);
          
          if (isGlobal || course.isPublic === true) return true;

          // 2. Teacher/Organization assignment
          if (course.creatorId === user.teacherId) return true;
          if (course.organizationIds?.includes(user.teacherId || '')) return true;
          if (course.departmentIds?.includes(user.departmentId || '')) return true;
          if (course.groupIds?.includes(user.groupId || '')) return true;

          return false;
        });

        const eSnap = await getDocs(query(collection(db, 'enrollments'), where('userId', '==', user.uid)));
        const eData: Record<string, Enrollment> = {};
        eSnap.forEach(doc => {
          const en = doc.data() as Enrollment;
          eData[en.courseId] = { ...en, id: doc.id };
        });
        setEnrollments(eData);
      }
      setCourses(cData);
      setLoading(false);
    }
    loadData();
  }, [user]);

  if (loading) return (
    <div className="flex justify-center p-20">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mening kurslarim</h1>
          <p className="text-gray-500 mt-1">Platformadagi barcha kurslar va sizning natijalaringiz.</p>
        </div>
        <div className="bg-white border rounded-2xl px-5 py-2 flex items-center gap-3 text-sm font-bold text-gray-600">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          {courses.length} ta kurs mavjud
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course) => {
          const en = enrollments[course.id];
          const progress = en ? Math.min(100, (en.currentModuleIndex / 4) * 100) : 0;
          
          return (
            <div key={course.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl hover:shadow-blue-50 transition-all">
              <div className="relative h-48">
                <img src={course.thumbnail || null} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/20" />
                {en?.completed && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full shadow-lg ring-4 ring-white/20">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                )}
              </div>
              
              <div className="p-8 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
                {course.creatorName && (
                   <p className="text-xs font-semibold text-blue-600 mb-3 bg-blue-50 w-max px-2 py-1 rounded">Muallif: {course.creatorName}</p>
                )}
                <p className="text-gray-500 text-sm line-clamp-2 mb-6 flex-1">
                  {course.description}
                </p>

                {en ? (
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-400">
                      <span>Progress</span>
                      <span className="text-blue-600">{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-1000" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                    <Link
                      to={`/courses/${course.id}`}
                      className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all mt-2"
                    >
                      <PlayCircle className="h-5 w-5" />
                      Davom ettirish
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-2 bg-gray-50 rounded-full" />
                    <Link
                      to={`/courses/${course.id}`}
                      className="flex items-center justify-center gap-2 w-full py-3.5 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-blue-50 hover:text-blue-600 transition-all mt-2"
                    >
                      Boshlash
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
