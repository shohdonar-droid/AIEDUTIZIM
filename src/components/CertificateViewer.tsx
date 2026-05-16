import React, { useRef, useState, useEffect } from 'react';
import { Download, X, Award, ShieldCheck, Loader2, Trophy, Star } from 'lucide-react';
import { motion } from 'motion/react';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Enrollment, SiteContent, Certificate } from '../types';

interface CertificateViewerProps {
  selectedCert: (Enrollment | Certificate) & { 
    courseTitle?: string, 
    studentName?: string, 
    lastAccessed?: any, 
    autoDownload?: boolean,
    isQuizizzItem?: boolean,
    isSubjectItem?: boolean,
    testType?: string 
  };
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
         const isReward = (selectedCert as any).courseId === 'reward' || (selectedCert as any).entityType === 'reward';
         
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

         if (isReward) {
            const rtSnap = await getDoc(doc(db, 'settings', 'certificate_reward_template'));
            if (rtSnap.exists()) {
               setTemplate(rtSnap.data() as CertTemplate);
            } else {
               setTemplate({
                  title: 'TIZIMNING FAOL FOYDALANUVCHISI',
                  completionText: "MAXSUS MUKOFOT",
                  coursePrefix: 'ushbu sertifikat platformadan faol qatnashib kelayotganligi uchun beriladi.',
                  courseSuffix: ''
               });
            }
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
  const isReward = (selectedCert as any).courseId === 'reward' || (selectedCert as any).entityType === 'reward';
  const certId = selectedCert.certificateId || (selectedCert as any).id?.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase();

  // Handle specific ID fallbacks for deleted courses
  let displayTitle = (selectedCert as any).entityTitle || selectedCert.courseTitle || 'MAXSUS KURSI';
  if (displayTitle === 'O\'chirilgan kurs' || !displayTitle || displayTitle === 'Kurs') {
    if (certId === 'YAU-00003') displayTitle = 'KOMPYUTER SAVODXONLIGI';
    if (certId === 'YAU-00005') displayTitle = 'GRAFIK DIZAYN';
    if (certId === 'YAU-00006') displayTitle = 'FRONTEND DASTURLASH';
  }

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
                            {selectedCert.certificateId || ((selectedCert as any).id?.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase())}
                         </p>
                      </div>
                   </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-4xl mt-[-30px]">
                       <h1 className="text-8xl font-black text-[#1e3a8a] tracking-[0.15em] mb-4 drop-shadow-sm uppercase">
                         {template.title}
                       </h1>
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
                         {isReward ? (
                           <span className="text-xl">{template.coursePrefix}</span>
                         ) : (
                           <>
                             {template.coursePrefix} <span className="font-black text-gray-900 not-italic font-serif border-b-[2px] border-[#c5a059]/40">"{displayTitle}"</span> {template.courseSuffix}
                           </>
                         )}
                       </p>
                    </div>

                   {/* Bottom Area: Three parts - Score (Left), QR (Center), Date (Right) */}
                   <div className={`w-full grid grid-cols-3 items-end mt-[10px] ${isReward ? 'translate-y-[75px]' : ''}`}>
                      {/* Score Result Bottom Left */}
                      {isReward ? (
                         <div className="text-left flex flex-col justify-center translate-y-[2px] translate-x-5 w-[190px]">
                            <div className="relative w-[170px] h-[170px] flex items-center justify-center">
                               <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 10px 20px rgba(220,38,38,0.3))' }}>
                                 <path d="M50 2 L58 12 L70 10 L75 20 L87 22 L88 34 L98 38 L94 48 L100 56 L94 62 L98 72 L88 76 L87 88 L75 90 L70 100 L58 98 L50 108 L42 98 L30 100 L25 90 L13 88 L12 76 L2 72 L6 62 L0 56 L6 48 L2 38 L12 34 L13 22 L25 20 L30 10 L42 12 Z" fill="#b91c1c" />
                                 <circle cx="50" cy="50" r="38" fill="none" stroke="#fbbf24" strokeWidth="2" />
                                 <circle cx="50" cy="50" r="32" fill="none" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 2" />
                               </svg>
                               <div className="relative z-10 flex flex-col items-center justify-center text-center">
                                  <div className="bg-white/10 backdrop-blur-sm px-4 py-1 border border-white/20 rounded-lg mb-1">
                                     <span className="text-[32px] font-black text-white leading-none whitespace-nowrap drop-shadow-lg tracking-widest italic">
                                        FAOL
                                     </span>
                                  </div>
                                  <div className="h-[2px] w-12 bg-[#fbbf24] mt-1" />
                                  <Star className="h-5 w-5 text-[#fbbf24] mt-1 fill-[#fbbf24]" />
                               </div>
                            </div>
                         </div>
                      ) : selectedCert.isQuizizzItem ? (
                         <div className="text-left flex flex-col justify-center translate-y-[2px] translate-x-5 w-[190px]">
                            {/* Decorative Seal for Quizizz */}
                            <div className="relative w-[170px] h-[170px] flex items-center justify-center">
                               <svg className="absolute inset-0 w-full h-full z-0 animate-spin-slow" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 15px 30px rgba(124,58,237,0.3))' }}>
                                  <path d="M50 0L54.7 9.4L65.1 2.8L67.1 13.1L78 9.5L77.3 19.9L88.2 19.4L84.8 29.2L95 31.9L88.9 40.4L98.1 46.1L89.8 52.6L96.8 60.1L86.8 63.8L91.4 73.1L80.6 74.1L82.6 84.5L71.8 82.5L70.8 92.9L60.5 88L56.8 98L50 91.5L43.2 98L39.5 88L29.2 92.9L28.2 82.5L17.4 84.5L19.4 74.1L8.6 73.1L13.2 63.8L3.2 60.1L10.2 52.6L1.9 46.1L11.1 40.4L5 31.9L15.2 29.2L11.8 19.4L22.7 19.9L22 9.5L32.9 13.1L34.9 2.8L45.3 9.4L50 0Z" fill="#7c3aed" />
                                  <circle cx="50" cy="50" r="35" fill="none" stroke="#d8b4fe" strokeWidth="1" strokeDasharray="3 3" />
                                  <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
                               </svg>
                               
                               <div className="relative z-10 flex flex-col items-center justify-center text-center">
                                  <div className="bg-white p-2.5 rounded-full shadow-lg mb-1 border border-purple-100 scale-110">
                                     <Trophy className="h-8 w-8 text-purple-600" />
                                  </div>
                                  <span className="text-[20px] font-black text-white leading-none drop-shadow-md tracking-tighter">WINNER</span>
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
                              value={`${window.location.origin}/verify/${selectedCert.certificateId || (selectedCert as any).id}`}
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
