import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ShieldCheck, Award, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import CertificateViewer from '../components/CertificateViewer';

export default function VerifyCertificate() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<any>(null);
  const [error, setError] = useState(false);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    async function verify() {
      if (!id) return;
      try {
        // 1. Try new certificates collection first
        const certSnap = await getDoc(doc(db, 'certificates', id));
        if (certSnap.exists()) {
           const data = certSnap.data();
           setCert({
             ...data,
             id: certSnap.id,
             studentName: data.studentName,
             courseTitle: data.entityTitle,
             updatedAt: data.issuedAt,
             autoDownload: true
           });
           setShowViewer(true);
           setLoading(false);
           return;
        }

        // 2. Try legacy enrollments
        const docSnap = await getDoc(doc(db, 'enrollments', id));
        if (docSnap.exists() && docSnap.data().completed) {
          const data = docSnap.data();
          // Fetch student name and course name
          let studentName = 'Talaba';
          let courseTitle = 'Kurs';

          try {
            const uSnap = await getDoc(doc(db, 'users', data.userId));
            const cSnap = await getDoc(doc(db, 'courses', data.courseId));
            studentName = uSnap.exists() ? uSnap.data().displayName : 'Talaba';
            courseTitle = cSnap.exists() ? cSnap.data().title : 'Kurs';
          } catch (e: any) {
            if (!e?.message?.includes("Quota")) {
              console.error("Meta fetch error:", e);
            }
          }
          
          setCert({
            ...data,
            id: docSnap.id,
            studentName,
            courseTitle,
            autoDownload: true
          });
          setShowViewer(true);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[40px] shadow-[0_20px_50px_rgba(30,58,138,0.1)] p-10 text-center border border-blue-100"
      >
        {error ? (
          <>
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-red-100">
              <XCircle className="h-12 w-12" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight uppercase">Topilmadi!</h1>
            <p className="text-gray-500 mb-8 leading-relaxed font-medium">Ushbu sertifikat tizimda topilmadi yoki hali tasdiqlanmagan.</p>
            <Link to="/" className="inline-block w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-black transition-all">
              BOSH SAHIFA
            </Link>
          </>
        ) : (
          <>
            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-blue-100 relative">
               <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20" />
               <ShieldCheck className="h-12 w-12 relative z-10" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter">TASDIQLANGAN!</h1>
            <p className="text-blue-600 font-black uppercase tracking-[0.3em] text-[10px] mb-8">Haqiqiy Sertifikat №{cert.certificateId || cert.id.slice(-8).toUpperCase()}</p>
            
            <div className="bg-blue-50/50 rounded-[32px] p-8 text-left space-y-5 mb-8 border border-blue-100/50">
               <div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Ega bo'lgan shaxs</p>
                  <p className="text-2xl font-black text-gray-900 leading-tight">{cert.studentName}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Kurs yo'nalishi</p>
                  <p className="text-lg font-bold text-gray-800 italic leading-snug">"{cert.courseTitle}"</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Berilgan sana</p>
                  <p className="text-xl font-black text-gray-900">
                    {cert.updatedAt?.toDate ? cert.updatedAt.toDate().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('uz-UZ')}
                  </p>
               </div>
            </div>

            <div className="flex gap-4">
               <Link to="/" className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition-all text-sm uppercase">
                 Bosh sahifa
               </Link>
               <button 
                 onClick={() => setShowViewer(true)} 
                 className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 text-sm uppercase"
               >
                 Yuklab olish
               </button>
            </div>

            {showViewer && (
              <CertificateViewer 
                selectedCert={{ ...cert, autoDownload: true }} 
                onClose={() => setShowViewer(false)} 
              />
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
