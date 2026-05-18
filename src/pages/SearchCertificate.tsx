import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Loader2, Search as SearchIcon, ShieldCheck, AlertCircle, Eye, Download, Award } from 'lucide-react';
import { motion } from 'motion/react';
import CertificateViewer from '../components/CertificateViewer';

export default function SearchCertificate() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowViewer(false);
    
    try {
      const term = searchTerm.trim().toUpperCase();
      let found: any = null;

      // 1. Try to find by exact ID in dedicated certificates collection (The new source of truth)
      const qCert = query(collection(db, 'certificates'), where('certificateId', '==', term));
      const snapCert = await getDocs(qCert);
      
      if (!snapCert.empty) {
        found = { id: snapCert.docs[0].id, ...snapCert.docs[0].data() };
        // Map to standard fields for viewer
        found.lastAccessed = found.issuedAt;
        found.courseTitle = found.entityTitle;
      } else {
        // 2. Try legacy collections
        const qEn = query(collection(db, 'enrollments'), where('certificateId', '==', term));
        const qTr = query(collection(db, 'testResults'), where('certificateId', '==', term));
        const [snapEn, snapTr] = await Promise.all([getDocs(qEn), getDocs(qTr)]);
        
        if (!snapEn.empty) found = { id: snapEn.docs[0].id, ...snapEn.docs[0].data() };
        else if (!snapTr.empty) found = { id: snapTr.docs[0].id, isSubjectItem: true, ...snapTr.docs[0].data() };
      }

      // 3. Dynamic search for fuzzy matches or dynamic IDs
      if (!found) {
        const enSnap = await getDocs(query(collection(db, 'enrollments'), where('completed', '==', true)));
        const trSnap = await getDocs(query(collection(db, 'testResults'), where('testType', '==', 'subject')));
        const certSnap = await getDocs(collection(db, 'certificates'));
        
        const allCerts = [
          ...certSnap.docs.map(d => ({ id: d.id, isFromCertCollection: true, ...d.data() })),
          ...enSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          ...trSnap.docs.map(d => ({ id: d.id, isSubjectItem: true, ...d.data() })).filter((c: any) => (c.score || 0) >= 90)
        ];

        for (const c of (allCerts as any[])) {
           const dynamicId = 'YAU-' + (c.id as string).replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase();
           const certId = (c as any).certificateId;
           if (
             (certId && certId.toUpperCase().endsWith(term)) || 
             dynamicId.endsWith(term) || 
             (c.id as string).toUpperCase().endsWith(term)
           ) {
              found = c;
              if (c.isFromCertCollection) {
                 found.lastAccessed = found.issuedAt;
                 found.courseTitle = found.entityTitle;
              }
              break;
           }
        }
      }

      if (found) {
        let studentName = found.studentName || 'Talaba';
        let courseTitle = found.courseTitle || 'Kurs';
        
        if (!found.studentName && found.userId && found.userId !== 'quizizz_anonymous') {
           const uSnap = await getDoc(doc(db, 'users', found.userId));
           if (uSnap.exists()) studentName = uSnap.data().displayName;
           else {
             // Maybe user is soft deleted, check enrollments etc. Not much we can do.
           }
        }
        
        if (!found.courseTitle && found.courseId && !found.isSubjectItem) {
           const cSnap = await getDoc(doc(db, 'courses', found.courseId));
           if (cSnap.exists()) courseTitle = cSnap.data().title;
        }

        const dispId = found.certificateId || ('YAU-' + found.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase());

        setResult({
          ...found,
          studentName,
          courseTitle,
          displayId: dispId,
          autoDownload: false
        });
      } else {
        setError('Bunday ID raqamga ega sertifikat topilmadi. Raqamni tekshirib qayta kiriting (Masalan: YAU-00001 yoki 00001).');
      }

    } catch (err) {
      console.error(err);
      setError('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDirectly = () => {
    if (result) {
      setResult({ ...result, autoDownload: true });
      setShowViewer(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-70" />
      <div className="absolute bottom-[-100px] left-[-100px] w-80 h-80 bg-[#c5a059]/10 rounded-full blur-[100px] opacity-70" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white/80 backdrop-blur-2xl rounded-3xl p-10 md:p-12 shadow-2xl relative z-10 border border-white"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto w-20 h-20 bg-blue-50 text-blue-600 flex items-center justify-center rounded-2xl shadow-inner mb-6">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-4">Sertifikatni tekshirish</h1>
          <p className="text-gray-500 font-medium">Sertifikat ID raqamini kiriting va hujjatning haqiqiyligini tekshirib olishingiz mumkun</p>
        </div>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
               <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Sertifikat ID... (Masalan: 45A2B yoki YAU-45A2B)"
              className="w-full pl-12 pr-4 bg-white/60 py-4 font-mono font-medium rounded-2xl border-2 border-gray-100 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 placeholder:font-sans placeholder:font-normal placeholder:text-gray-400"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-black shadow-lg shadow-blue-200 transition-all disabled:opacity-70 disabled:hover:bg-blue-600 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            {loading ? 'Izlanmoqda...' : 'TEKSHIRISH'}
          </button>
        </form>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 text-red-600 p-5 rounded-2xl flex items-start gap-4 border border-red-100 mb-8 font-medium"
          >
             <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
             <p>{error}</p>
          </motion.div>
        )}

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50/50 border border-green-100 p-6 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                 <Award className="w-5 h-5" />
               </div>
               <div>
                  <h3 className="font-bold text-green-800">Sertifikat tasdiqlandi!</h3>
                  <p className="text-sm font-medium text-green-600/80">Bu sertifikat haqiqiy va tizimda ro'yxatga olingan.</p>
               </div>
            </div>

            <div className="space-y-4 mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ID Raqami</p>
                  <p className="font-mono font-bold text-gray-900 border-b border-gray-100 pb-3">{result.displayId}</p>
               </div>
               <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Kimga berilgan</p>
                  <p className="font-black text-gray-900 border-b border-gray-100 pb-3">{result.studentName}</p>
               </div>
               <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Yo'nalish</p>
                  <p className="font-bold text-blue-600">{result.courseTitle}</p>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
               <button 
                 onClick={() => {
                   setResult({ ...result, autoDownload: false });
                   setShowViewer(true);
                 }}
                 className="flex-1 py-3.5 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
               >
                 <Eye className="w-5 h-5" />
                 Ko'rish
               </button>
               <button 
                 onClick={handleDownloadDirectly}
                 className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
               >
                 <Download className="w-5 h-5" />
                 Yuklab olish
               </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {showViewer && result && (
         <CertificateViewer 
           selectedCert={result} 
           onClose={() => setShowViewer(false)} 
         />
      )}
    </div>
  );
}
