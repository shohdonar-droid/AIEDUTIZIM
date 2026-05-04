import React, { useRef, useState } from 'react';
import { Download, X, Sparkles, BrainCircuit, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import { Enrollment } from '../types';

interface CertificateViewerProps {
  selectedCert: Enrollment & { courseTitle?: string, studentName?: string, lastAccessed?: number };
  onClose: () => void;
}

export default function CertificateViewer({ selectedCert, onClose }: CertificateViewerProps) {
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await domtoimage.toPng(certRef.current, {
        width: 1000,
        height: 707,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      // A4 Landscape is 297 x 210 mm
      const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210);
      pdf.save(`Sertifikat_${selectedCert?.courseTitle?.replace(/ /g, '_') || 'Kurs'}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const getDegreeText = (cert: Enrollment | null) => {
    if (!cert || !cert.grades) return { text: "A'lo darajada", score: 100 };
    const scores = Object.values(cert.grades);
    if (scores.length === 0) return { text: "Muvaffaqiyatli", score: 100 };
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg >= 90) return { text: "A'lo darajada", score: Math.round(avg) };
    if (avg >= 70) return { text: "Yaxshi darajada", score: Math.round(avg) };
    return { text: "Qoniqarli darajada", score: Math.round(avg) };
  };

  const degree = getDegreeText(selectedCert);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl bg-white rounded-[40px] shadow-2xl p-6 overflow-hidden flex flex-col"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-gray-900">Sertifikatni yuklash (PDF)</h3>
          <div className="flex gap-4">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              PDF qilib saqlash
            </button>
            <button onClick={onClose} className="p-3 text-gray-400 hover:text-red-500 bg-gray-100 rounded-xl">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Certificate Render Area (A4 proportionate 1.414) */}
        <div className="relative w-full aspect-[1.414/1] md:aspect-[1.5/1] bg-gray-100 rounded-3xl overflow-hidden flex items-center justify-center shadow-inner">
          <div className="absolute top-0 left-0" style={{ width: '1000px', height: '707px', transformOrigin: 'top left', transform: 'scale(min(1, 100cqw / 1000))' }} style-container="true">
            <div ref={certRef} className="w-[1000px] h-[707px] bg-white overflow-hidden relative shadow-lg text-gray-900 font-sans">

              {/* Elegant Modern Background Pattern */}
              <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-[0.4]" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50" />
              
              {/* Subtle Decorative elements */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] -mr-40 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[120px] -ml-40 -mb-20 pointer-events-none" />

              {/* Elegant Double Border */}
              <div className="absolute inset-8 border border-gray-100 rounded-[32px] pointer-events-none z-10 box-border" />
              <div className="absolute inset-10 border-2 border-blue-600/10 rounded-[28px] pointer-events-none z-10 box-border" />

              {/* Top Section with Logo and ID */}
              <div className="absolute top-[70px] left-[90px] right-[90px] flex justify-between items-start z-20">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100">
                    <BrainCircuit className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight text-gray-900">EDU<span className="text-blue-600">AI</span></h2>
                    <p className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase mt-1">Raqamli Ta'lim</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sertifikat ID</p>
                  <p className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-xl shadow-sm text-sm">
                    {selectedCert.certificateId || ('YAU' + selectedCert.id.slice(0, 5).toUpperCase())}
                  </p>
                </div>
              </div>

              {/* Main Content */}
              <div className="absolute inset-x-20 top-[140px] bottom-[250px] flex flex-col items-center justify-center text-center z-20">

                <h1 className="text-[72px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 tracking-tighter leading-none mb-4">
                  SERTIFIKAT
                </h1>

                <p className="text-sm font-bold text-blue-600/60 uppercase tracking-[0.4em] mb-8 flex items-center justify-center gap-4 w-full">
                  <span className="w-16 h-[1px] bg-gradient-to-r from-transparent to-blue-200" />
                  Maxsus ta'lim dasturini yakunlagani uchun
                  <span className="w-16 h-[1px] bg-gradient-to-l from-transparent to-blue-200" />
                </p>

                <div className="text-xl text-gray-600 font-medium max-w-4xl flex flex-col items-center justify-center gap-5">
                  <span className="text-5xl font-black text-gray-900 border-b-[4px] border-gray-900 px-8 py-2 relative inline-block leading-tight">
                    {selectedCert.studentName || "Talaba ismi familiyasi"}
                  </span> 
                  
                  <span className="text-2xl text-gray-500 leading-relaxed max-w-3xl px-8 font-medium">
                     Ushbu sertifikat <span className="font-bold text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg mx-2">{selectedCert.courseTitle || 'O\'quv kursi'}</span>  
                     kursini muvaffaqiyatli tugatganligini tasdiqlaydi.
                  </span>
                </div>

              </div>

              {/* Bottom Section */}
              <div className="absolute bottom-[70px] left-[90px] right-[90px] flex justify-between items-end z-20">
                
                {/* Result */}
                <div className="flex flex-col items-start gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Umumiy Natija</span>
                  <span className="text-4xl font-black text-gray-900 border-l-4 border-blue-600 pl-4 py-1 flex items-center gap-3">
                     {degree.score}%
                  </span>
                  <span className="text-sm font-bold text-blue-600 tracking-wide uppercase">{degree.text}</span>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-xl shadow-blue-50 border border-gray-100">
                    <QRCodeSVG
                      value={`https://aistudio-edu.com/verify/${selectedCert.id}`}
                      size={90}
                      level="H"
                      fgColor="#1e293b"
                      bgColor="transparent"
                    />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Haqiqiylikni tekshirish</p>
                </div>

                {/* Date and Signature */}
                <div className="flex flex-col items-end gap-1">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 border-b border-gray-100 pb-2 mb-2 w-32 text-right">Berilgan sana:</p>
                  <p className="font-black text-gray-900 text-2xl">
                    {(() => {
                      const ts = selectedCert.lastAccessed;
                      const dateObj = ts?.toMillis ? new Date(ts.toMillis()) : (ts instanceof Date ? ts : new Date());
                      return dateObj.toLocaleDateString('uz-UZ');
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
