import React, { useRef, useState, useEffect } from 'react';
import { Download, X, Award, ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Enrollment, SiteContent } from '../types';

interface CertificateViewerProps {
  selectedCert: Enrollment & { courseTitle?: string, studentName?: string, lastAccessed?: any, autoDownload?: boolean };
  onClose: () => void;
}

interface CertTemplate {
  title: string;
  completionText: string;
  coursePrefix: string;
  courseSuffix: string;
}

const DEFAULT_TEMPLATE: CertTemplate = {
  title: 'SERTIFIKAT',
  completionText: "Maxsus ta'lim dasturini yakunlagani uchun",
  coursePrefix: 'Ushbu sertifikat',
  courseSuffix: 'kursini muvaffaqiyatli tugatganligini tasdiqlaydi.'
};

export default function CertificateViewer({ selectedCert, onClose }: CertificateViewerProps) {
  const [downloading, setDownloading] = useState(false);
  const [template, setTemplate] = useState<CertTemplate>(DEFAULT_TEMPLATE);
  const [siteSettings, setSiteSettings] = useState<SiteContent['header']>({});
  const certRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const isSubject = (selectedCert as any).isSubjectItem || (selectedCert as any).testType === 'subject';
        const isQuizizz = (selectedCert as any).isQuizizzItem || (selectedCert as any).testType === 'quizizz';
        
        const siteSnap = await getDoc(doc(db, 'siteContent', 'main'));
        if (siteSnap.exists()) {
          setSiteSettings(siteSnap.data().header || {});
        }

        if (isQuizizz) {
          setTemplate({
            title: 'SERTIFIKAT',
            completionText: 'FAOL QATNASHUVCHI',
            coursePrefix: 'Ushbu sertifikat',
            courseSuffix: 'nomli quizizz testda faol qatnashgani uchun beriladi.'
          });
          return;
        }

        const templateDocRef = doc(db, 'settings', isSubject ? 'certificate_subject_template' : 'certificate_template');
        const templateSnap = await getDoc(templateDocRef);

        if (templateSnap.exists()) {
          setTemplate(templateSnap.data() as CertTemplate);
        } else if (isSubject) {
          setTemplate({
            title: 'SERTIFIKAT',
            completionText: "Mavzuni a'lo darajada o'zlashtirgani uchun",
            coursePrefix: 'Ushbu sertifikat',
            courseSuffix: 'mavzusidan muvaffaqiyatli o\'tganligini tasdiqlaydi.'
          });
        }

        if (siteSnap.exists()) {
          const siteData = siteSnap.data() as SiteContent;
          if (siteData.header) {
            setSiteSettings(siteData.header);
          }
        }
      } catch (err) {
        console.error("Data load error:", err);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCert.autoDownload && certRef.current) {
      const timer = setTimeout(() => {
        handleDownload();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedCert.autoDownload]);

  const handleDownload = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await htmlToImage.toJpeg(certRef.current, {
        quality: 0.8,
        pixelRatio: 1.5,
        backgroundColor: '#ffffff',
        style: {
          transform: 'none',
          boxShadow: 'none'
        }
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (794 * pdfWidth) / 1123;
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Sertifikat_${selectedCert.studentName?.replace(/ /g, '_') || 'Hujjat'}.pdf`);
    } catch (err) {
      console.error("Export error:", err);
      alert("Xatolik yuz berdi.");
    } finally {
      setDownloading(false);
    }
  };

  const getScore = (cert: any) => {
    if (!cert) return 100;
    if (typeof cert.score === 'number') return cert.score;
    if (!cert.grades) return 100;
    const scores = Object.values(cert.grades) as number[];
    if (scores.length === 0) return 100;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const score = getScore(selectedCert);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="relative w-full h-[90vh] max-w-6xl flex flex-col group justify-center items-center"
      >
        <div className="absolute top-0 right-0 z-20 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            PDF yuklash
          </button>
          <button
            onClick={onClose}
            className="p-3 bg-white/90 backdrop-blur-md text-gray-400 hover:text-red-500 rounded-2xl shadow-lg border border-gray-100 transition-all hover:scale-105"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 w-full flex items-center justify-center relative" style={{ containerType: 'size' } as any}>
            <div 
              ref={certRef}
              className="bg-white relative select-none shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/20 border-[16px] border-white"
              style={{ 
                width: '1123px',
                height: '794px',
                transform: 'scale(calc(min(100cqw / 1123, 100cqh / 794) * 0.95))',
                transformOrigin: 'center center',
                flexShrink: 0
              }}
            >
              <div className="w-full h-full bg-[#fcfdff] relative overflow-hidden">
                {/* Formal Background Pattern - CSS Only to avoid CORS/Fetch errors */}
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#1e3a8a 1px, transparent 0px)', backgroundSize: '20px 20px' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(45deg, #1e3a8a 25%, transparent 25%, transparent 50%, #1e3a8a 50%, #1e3a8a 75%, transparent 75%, transparent)' , backgroundSize: '4px 4px'}} />
                
                {/* Professional Multi-Layered Frame */}
                <div className="absolute inset-2 border-[12px] border-[#c5a059]/30 rounded-sm" />
                <div className="absolute inset-5 border-[1px] border-[#c5a059]/40 rounded-sm" />
                <div className="absolute inset-10 border-[1px] border-[#c5a059]/15 rounded-sm" />
                
                {/* Corner Ornaments */}
                <div className="absolute top-4 left-4 w-24 h-24 text-[#c5a059] opacity-80">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <path d="M0 0 v30 q0 -30 30 -30 h-30 Z" />
                    <path d="M15 15 v15 q0 -15 15 -15 h-15 Z" />
                  </svg>
                </div>
                <div className="absolute top-4 right-4 w-24 h-24 text-[#c5a059] opacity-80 rotate-90">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <path d="M0 0 v30 q0 -30 30 -30 h-30 Z" />
                  </svg>
                </div>
                <div className="absolute bottom-4 left-4 w-24 h-24 text-[#c5a059] opacity-80 -rotate-90">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <path d="M0 0 v30 q0 -30 30 -30 h-30 Z" />
                  </svg>
                </div>
                <div className="absolute bottom-4 right-4 w-24 h-24 text-[#c5a059] opacity-80 rotate-180">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <path d="M0 0 v30 q0 -30 30 -30 h-30 Z" />
                  </svg>
                </div>

                <div className="absolute inset-0 pt-16 pb-36 px-24 flex flex-col items-center">
                   {/* Top Header Row: Logo left, ID right */}
                   <div className="w-full flex justify-between items-start mb-6">
                      <div className="flex items-center gap-5">
                         <div className="w-20 h-20 bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] p-3 border-2 border-[#c5a059]/50 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                            {siteSettings?.logoUrl ? (
                               <img src={siteSettings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain drop-shadow-md" crossOrigin="anonymous" />
                            ) : (
                               <Award className="h-12 w-12 text-[#c5a059]" />
                            )}
                         </div>
                         <div className="text-left">
                            <h2 className="text-4xl font-black text-[#1e3a8a] tracking-tighter leading-none drop-shadow-sm">
                               {siteSettings?.siteName ? (
                                  siteSettings.siteName
                               ) : (
                                  <>EDU<span className="text-[#c5a059]">AI</span></>
                               )}
                            </h2>
                            <p className="text-[10px] font-bold text-[#c5a059] tracking-[0.4em] uppercase mt-2 font-serif">Raqamli Akademiya</p>
                         </div>
                      </div>
                      <div className="text-right mt-1.5">
                         <p className="text-[11px] font-black text-[#1e3a8a]/60 uppercase tracking-widest mb-1 px-3">Sertifikat ID</p>
                         <p className="font-mono font-bold text-2xl text-[#1e3a8a] px-3">
                            {selectedCert.certificateId || ('YAU-' + selectedCert.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase())}
                         </p>
                      </div>
                   </div>

                   {/* Main Content */}
                   <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-4xl mt-[-30px]">
                      <h1 className="text-8xl font-black text-[#1e3a8a] tracking-[0.15em] mb-4 drop-shadow-sm uppercase">{template.title}</h1>
                      <p className="text-2xl font-bold text-[#c5a059] uppercase tracking-[0.3em] mb-10 font-serif italic">
                        {template.completionText}
                      </p>

                      <div className="mb-2 relative w-full flex flex-col items-center">
                         <span 
                           className="font-black text-gray-900 px-16 py-1 uppercase tracking-tight italic font-serif leading-tight whitespace-nowrap"
                           style={{ fontSize: (selectedCert.studentName || "TALABA ISMI FAMILIYASI").length > 35 ? '2rem' : (selectedCert.studentName || "TALABA ISMI FAMILIYASI").length > 25 ? '2.5rem' : (selectedCert.studentName || "TALABA ISMI FAMILIYASI").length > 18 ? '3rem' : '3.75rem' }}
                         >
                            {selectedCert.studentName || "TALABA ISMI FAMILIYASI"}
                         </span>
                         <div className="w-[80%] h-[3px] bg-gradient-to-r from-transparent via-[#c5a059] to-transparent mt-1" />
                      </div>

                      <p className="text-2xl text-gray-700 font-medium max-w-4xl leading-loose italic -mt-2">
                        {template.coursePrefix} <span className="font-black text-gray-900 not-italic font-serif border-b-[2px] border-[#c5a059]/40">"{selectedCert.courseId === 'reward' ? 'FAOL FOYDALANUVCHI' : (selectedCert.courseTitle || 'MAXSUS KURSI')}"</span> {template.courseSuffix}
                      </p>
                   </div>

                   {/* Bottom Area: Three parts - Score (Left), QR (Center), Date (Right) */}
                   <div className="w-full grid grid-cols-3 items-end mt-[10px]">
                      {/* Score Result Bottom Left */}
                      {selectedCert.isQuizizzItem ? (
                         <div className="text-left flex flex-col justify-center translate-y-[2px] translate-x-5 w-[190px]">
                            {/* Decorative Seal for 1st Place */}
                            <div className="relative w-[170px] h-[170px] flex items-center justify-center">
                               <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 10px 15px rgba(30,58,138,0.15))' }}>
                                 {/* Burst Shape bg */}
                                 <path d="M50 2 L56 12 L67 9 L70 19 L81 20 L80 31 L90 35 L86 45 L95 50 L86 55 L90 65 L80 69 L81 80 L70 81 L67 91 L56 88 L50 98 L44 88 L33 91 L30 81 L19 80 L20 69 L10 65 L14 55 L5 50 L14 45 L10 35 L20 31 L19 20 L30 19 L33 9 L44 12 Z" fill="#1e3a8a" />
                                 {/* Outer gold border */}
                                 <path d="M50 4 L55 13 L65 10.5 L68 19.5 L78 20.5 L77 30.5 L86 34 L82.5 43.5 L91 48 L83.5 54 L87 63.5 L77 67 L78 77 L68 78 L65 87.5 L55 85 L50 94 L45 85 L35 87.5 L32 78 L22 77 L23 67 L13 63.5 L16.5 54 L9 48 L17.5 43.5 L14 34 L23 30.5 L22 20.5 L32 19.5 L35 10.5 L45 13 Z" fill="none" stroke="#c5a059" strokeWidth="1" />
                                 {/* Inner circles */}
                                 <circle cx="50" cy="50" r="35" fill="#fff" />
                                 <circle cx="50" cy="50" r="32" fill="none" stroke="#c5a059" strokeWidth="1" strokeDasharray="3 2" />
                                 <circle cx="50" cy="50" r="28" fill="none" stroke="#1e3a8a" strokeWidth="0.5" />
                               </svg>
                               <div className="relative z-10 flex flex-col items-center justify-center text-center">
                                  <span className="text-[26px] font-black text-[#c5a059] leading-none whitespace-nowrap drop-shadow-sm px-1">
                                     1-O'RIN
                                  </span>
                               </div>
                            </div>
                         </div>
                      ) : (
                         <div className="text-left flex flex-col gap-2 translate-y-5">
                            <p className="text-[12px] font-black text-[#1e3a8a]/60 uppercase tracking-widest leading-none">Umumiy natija</p>
                            <div className="flex items-center justify-center bg-white/80 rounded-2xl border-2 border-[#c5a059]/30 shadow-sm self-start w-[190px] h-[60px] -translate-x-10">
                               <span className="text-4xl font-black text-[#1e3a8a]">{score}%</span>
                            </div>
                         </div>
                      )}

                      {/* QR Code Center with Text */}
                      <div className="flex flex-col items-center gap-3 translate-y-[24px]">
                        <div className="p-3 bg-white border-2 border-[#c5a059]/30 rounded-2xl shadow-xl shadow-[#1e3a8a]/5">
                           <QRCodeSVG
                              value="aiedutizim.vercel.app saytining ID menyusi orqali sertifikatni haqiqiyligini tekshiring"
                              size={110}
                              level="H"
                              fgColor="#1e3a8a"
                           />
                        </div>
                        <div className="flex flex-col items-center leading-none">
                           <p className="text-[10px] font-black text-[#c5a059] uppercase tracking-[0.25em]">Haqiqiyligini tekshirish</p>
                        </div>
                      </div>

                      {/* Date Right Bottom */}
                      <div className="text-right flex flex-col items-end gap-2 translate-y-5">
                         <p className="text-[12px] font-black text-[#1e3a8a]/60 uppercase tracking-widest leading-none">Berilgan sana</p>
                         <div className="flex items-center justify-center bg-white/80 rounded-2xl border-2 border-[#c5a059]/30 shadow-sm w-[190px] h-[60px] translate-x-10">
                            <p className="text-3xl font-black text-[#1e3a8a] tracking-tighter">
                               {(() => {
                                  const ts = selectedCert.lastAccessed;
                                  const dateObj = ts?.toMillis ? new Date(ts.toMillis()) : (ts instanceof Date ? ts : new Date());
                                  const day = dateObj.getDate();
                                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                  const year = dateObj.getFullYear();
                                  return `${day}.${month}.${year}`;
                                })()}
                            </p>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
}
