import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { BookOpen, ArrowLeft, PlayCircle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../hooks/useAuth';

export default function SubjectRead() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'subjects', id)).then(snap => {
      if (snap.exists()) {
        setSubject({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    }).catch(console.error);
  }, [id]);

  if (loading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;
  if (!subject) return <div className="p-20 text-center text-gray-500">Mavzu topilmadi</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
       <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold transition">
         <ArrowLeft className="w-5 h-5" /> ORQAGA
       </button>
       
       <div className="bg-white p-10 md:p-14 rounded-[40px] shadow-xl border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none" />
          
          <div className="relative z-10 space-y-8">
             <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div>
                   <h1 className="text-3xl font-black text-gray-900">{subject.title}</h1>
                   <p className="text-gray-500 font-medium">Ma'ruza matni</p>
                </div>
             </div>
             
             <div className="prose prose-blue max-w-none prose-headings:font-black prose-p:font-medium prose-p:text-gray-600">
                <ReactMarkdown>{subject.content}</ReactMarkdown>
             </div>
             
             {user?.role === 'student' && (
                <div className="pt-10 mt-10 border-t border-gray-100 flex justify-center">
                   <button 
                      onClick={() => navigate(`/tests/subject_${subject.id}`)}
                      className="px-10 py-5 bg-blue-600 text-white flex items-center justify-center gap-3 rounded-2xl font-black text-xl hover:bg-blue-700 hover:scale-105 transition shadow-xl shadow-blue-200"
                   >
                     <PlayCircle className="w-8 h-8" /> TEST ISHLASH
                   </button>
                </div>
             )}
          </div>
       </div>
    </div>
  );
}
