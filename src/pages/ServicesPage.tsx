import React, { useState } from 'react';
import { BrainCircuit, BookText, FileSpreadsheet, Presentation, CheckSquare, Newspaper, Loader2, Download, Trash2, Layers } from 'lucide-react';
import { generateAIDocument, ServiceType } from '../services/aiService';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { updateDoc, doc, increment, addDoc, collection, Timestamp } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import PptxGenJS from 'pptxgenjs';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIdx: number;
}

const services = [
  { id: 'course_work', name: 'Kurs ishi', icon: BookText, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'independent_work', name: 'Mustaqil ish', icon: FileSpreadsheet, color: 'text-green-600', bg: 'bg-green-50' },
  { id: 'presentation', name: 'Taqdimot', icon: Presentation, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'test_builder', name: 'Test tayyorlash', icon: CheckSquare, color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'article', name: 'Maqola', icon: Newspaper, color: 'text-pink-600', bg: 'bg-pink-50' },
];

export default function ServicesPage() {
  const { user } = useAuth();
  const [selectedService, setSelectedService] = useState<typeof services[0] | null>(null);
  const [topic, setTopic] = useState('');
  const [additionalText, setAdditionalText] = useState('');
  const [pages, setPages] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const parseQuestions = (text: string): Question[] => {
    const blocks = text.split('++++').map(b => b.trim()).filter(b => b);
    const parsed: Question[] = [];

    for (const block of blocks) {
      const parts = block.split('====').map(p => p.trim());
      if (parts.length < 2) continue;

      const qText = parts[0];
      const optionParts = parts.slice(1).filter(p => p !== '');

      const options: string[] = [];
      let correctIdx = 0;
      let idx = 0;

      for (let optText of optionParts) {
        if (idx >= 4) break; // limit to 4 options
        const isCorrect = optText.startsWith('#');
        if (isCorrect) {
          optText = optText.substring(1).trim();
          correctIdx = idx;
        }
        options.push(optText);
        idx++;
      }

      if (options.length > 0) {
        parsed.push({
          id: Math.random().toString(),
          text: qText,
          options,
          correctIdx
        });
      }
    }
    return parsed;
  };

  const handleGenerate = async () => {
    if (!user || user.uid === undefined) return;
    if (!topic.trim() && !additionalText.trim()) {
      alert('Iltimos, mavzu yoki matn kiriting');
      return;
    }

    const isAdmin = user?.email && ['shohdonar@gmail.com', 'elyorbek@admin.uz', 'elyorbek@gmail.com'].includes(user.email) || user?.role === 'admin';

    if (!isAdmin && (user.ball || 0) < 1) {
      alert('Balansda ball yetarli emas (Kamida 1 ball kerak)');
      return;
    }

    setGenerating(true);
    try {
      // Deduct points if NOT admin
      const userRef = doc(db, 'users', user.uid);
      const newBall = (user.ball || 0) - 1;
      
      if (!isAdmin) {
        await updateDoc(userRef, {
          ball: increment(-1),
          spentBalls: increment(1)
        });
      }

      // Send system notification if balance hits 3 (only for non-admins)
      if (!isAdmin && newBall === 3) {
        try {
          await addDoc(collection(db, 'messages'), {
            senderId: 'SYSTEM_ADMIN',
            receiverId: user.uid,
            text: "Hisobingizda 3 ball qoldi. Iltimos, xizmatlardan foydalanishni davom ettirish uchun balansingizni to'ldiring.",
            createdAt: Timestamp.now(),
            isRead: false
          });
        } catch (msgErr) {
          console.error("System notification error:", msgErr);
        }
      }

      const content = await generateAIDocument({
        type: selectedService?.id as ServiceType,
        topic: topic,
        pages: pages,
        additionalText: additionalText
      });

      if (selectedService?.id === 'test_builder') {
        const parsed = parseQuestions(content);
        setQuestions(parsed);
      }
      setResult(content);
    } catch (error) {
      console.error(error);
      alert('AI yaratishda xatolik yuz berdi');
    } finally {
      setGenerating(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    setTopic('');
    setAdditionalText('');
    setPages(5);
    setSelectedService(null);
    setQuestions([]);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Math.random().toString(),
        text: 'Yangi savol...',
        options: ['Variant 1', 'Variant 2', 'Variant 3', 'Variant 4'],
        correctIdx: 0
      }
    ]);
  };

  const downloadDocx = async () => {
    if (!result) return;
    
    const children: any[] = [];
    const defaultStyles = { font: "Times New Roman", size: 28 };

    if (selectedService?.id === 'test_builder') {
      children.push(new Paragraph({
        children: [new TextRun({ text: topic, bold: true, ...defaultStyles, size: 32 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }));

      questions.forEach((q, idx) => {
        children.push(new Paragraph({
          children: [new TextRun({ text: `++++ ${q.text}`, bold: true, ...defaultStyles })],
          spacing: { before: 200 }
        }));
        q.options.forEach((opt, oIdx) => {
          children.push(new Paragraph({
            children: [new TextRun({ text: `====`, ...defaultStyles })]
          }));
          const isCorrect = q.correctIdx === oIdx;
          children.push(new Paragraph({
            children: [new TextRun({ text: `${isCorrect ? '#' : ''}${opt}`, ...defaultStyles })]
          }));
        });
        children.push(new Paragraph({
          children: [new TextRun({ text: `====`, ...defaultStyles })],
          spacing: { after: 200 }
        }));
      });
    } else {
      const lines = result.split('\n');
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed && children.length > 0) {
           children.push(new Paragraph({ spacing: { after: 200 } }));
           return;
        }

        let p: any;
        if (trimmed.startsWith('# ')) {
          p = new Paragraph({ 
            children: [new TextRun({ text: trimmed.replace('# ', ''), bold: true, ...defaultStyles, size: 32 })], 
            heading: HeadingLevel.HEADING_1, 
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 } 
          });
        } else if (trimmed.startsWith('## ')) {
          p = new Paragraph({ 
            children: [new TextRun({ text: trimmed.replace('## ', ''), bold: true, ...defaultStyles, size: 30 })], 
            heading: HeadingLevel.HEADING_2, 
            spacing: { before: 300, after: 150 } 
          });
        } else if (trimmed.startsWith('### ')) {
          p = new Paragraph({ 
            children: [new TextRun({ text: trimmed.replace('### ', ''), bold: true, ...defaultStyles })], 
            heading: HeadingLevel.HEADING_3, 
            spacing: { before: 200, after: 100 } 
          });
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          p = new Paragraph({ 
            children: [new TextRun({ text: trimmed.substring(2), ...defaultStyles })],
            bullet: { level: 0 }, 
            spacing: { after: 100 } 
          });
        } else {
          p = new Paragraph({ 
            children: [new TextRun({ text: trimmed, ...defaultStyles })], 
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED
          });
        }
        children.push(p);
      });
    }

    const docxFile = new Document({
      sections: [{ 
        properties: {
          page: {
            margin: {
              top: 1134,
              right: 851,
              bottom: 1134,
              left: 1701,
            }
          }
        }, 
        children 
      }],
    });

    const blob = await Packer.toBlob(docxFile);
    const filename = selectedService?.id === 'test_builder' ? `${topic.replace(/\s+/g, '_')}_test` : topic.replace(/\s+/g, '_');
    saveAs(blob, `${filename}.docx`);
    setTimeout(clearResult, 1500);
  };

  const downloadPptx = async () => {
    if (!result) return;
    const pptx = new PptxGenJS();
    
    // Better parsing
    const slidesData = result.split(/### Slayd|Slayd \d+:|Slayd \d+/i).filter(s => s.trim().length > 10);
    
    if (slidesData.length === 0) {
       const slide = pptx.addSlide();
       slide.addText(topic, { x: 0.5, y: 1, w: '90%', h: 1, fontSize: 36, bold: true, align: pptx.AlignH.center });
       slide.addText(result, { x: 0.5, y: 2.5, w: '90%', h: 4, fontSize: 18 });
    } else {
      slidesData.forEach((sContent, idx) => {
        const slide = pptx.addSlide();
        slide.background = { color: 'FFFFFF' };
        
        // Header bar
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: '2563EB' } });
        
        const lines = sContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let title = lines[0] || `Slayd ${idx + 1}`;
        let imageQuery = "";
        const bodyLines: string[] = [];

        lines.slice(1).forEach(line => {
           if (line.includes('[IMAGE_QUERY:')) {
              imageQuery = line.match(/\[IMAGE_QUERY: (.*?)\]/)?.[1] || "";
           } else {
              bodyLines.push(line.replace(/^[-*]\s?/, '• '));
           }
        });

        slide.addText(title, { 
          x: 0, y: 0, w: '100%', h: 0.6, 
          fontSize: 24, bold: true, color: 'FFFFFF',
          align: pptx.AlignH.center, valign: pptx.AlignV.middle
        });

        if (imageQuery) {
          // Layout with image
          slide.addText(bodyLines.join('\n'), { 
            x: 0.5, y: 1, w: '45%', h: '75%', 
            fontSize: 16, color: '334155'
          });
          
          const imgUrl = `https://images.weserv.nl/?url=https://loremflickr.com/800/600/${encodeURIComponent(imageQuery)}`;
          slide.addImage({ 
            path: imgUrl, 
            x: '55%', y: 1.2, w: '40%', h: '60%',
            rounding: true
          });
          
          slide.addText(`Visual: ${imageQuery}`, {
            x: '55%', y: '75%', w: '40%', h: 0.4,
            fontSize: 10, italic: true, color: '94A3B8', align: pptx.AlignH.center
          });
        } else {
          // Full width layout
          slide.addText(bodyLines.join('\n'), { 
            x: 0.5, y: 1, w: '90%', h: '80%', 
            fontSize: 18, color: '334155'
          });
        }

        // Footer
        slide.addText(`${idx + 1} / ${slidesData.length}`, {
           x: '85%', y: '92%', w: '10%', h: 0.3,
           fontSize: 12, color: 'CBD5E1', align: pptx.AlignH.right
        });
      });
    }

    await pptx.writeFile({ fileName: `${topic.replace(/\s+/g, '_')}.pptx` });
    setTimeout(clearResult, 1500);
  };

  const downloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(result, 180);
    doc.text(splitText, 15, 20);
    doc.save(`${topic || 'ai-hujjat'}.pdf`);
    setTimeout(clearResult, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">AI Xizmatlar</h1>
        <p className="text-gray-500 font-medium">Har bir AI yaratish xizmati uchun hisobingizdan <span className="text-blue-600 font-bold">1 ball</span> yechib olinadi.</p>
      </div>

      {!selectedService ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => setSelectedService(service)}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all text-left group"
            >
              <div className={`w-14 h-14 ${service.bg} ${service.color} rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform`}>
                <service.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{service.name}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Sun'iy intellekt yordamida sifatli {service.name.toLowerCase()} tayyorlash.</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${selectedService.bg} ${selectedService.color} rounded-xl flex items-center justify-center shadow-sm`}>
                <selectedService.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedService.name} yaratish</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">AI Assistent</p>
              </div>
            </div>
            <button 
              onClick={() => { setSelectedService(null); setResult(null); }}
              className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-gray-900 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>

          <div className="p-8 space-y-8">
            {!result ? (
              <div className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-400 uppercase tracking-widest pl-1">Mavzu yoki sarlavha</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Mavzuni kiriting..."
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all text-gray-900 font-medium placeholder:text-gray-300 shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-400 uppercase tracking-widest pl-1">
                      {selectedService.id === 'presentation' ? 'Slaydlar soni' : selectedService.id === 'test_builder' ? 'Testlar soni' : 'Varaqlar soni'}
                    </label>
                    <div className="flex items-center bg-gray-50 rounded-2xl border-2 border-transparent focus-within:border-blue-500 transition-all shadow-inner">
                      <Layers className="ml-5 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={pages}
                        onChange={(e) => setPages(parseInt(e.target.value) || 1)}
                        className="w-full px-5 py-4 bg-transparent border-none focus:ring-0 text-gray-900 font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-400 uppercase tracking-widest pl-1">Qoshimcha matn (ixtiyoriy)</label>
                  <textarea
                    value={additionalText}
                    onChange={(e) => setAdditionalText(e.target.value)}
                    placeholder="Agar matn kiritilsa, AI shu matn asosida ish tayyorlaydi..."
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all text-gray-900 font-medium placeholder:text-gray-300 shadow-inner min-h-[150px]"
                  />
                </div>
                
                <button
                  onClick={handleGenerate}
                  disabled={generating || (!topic.trim() && !additionalText.trim())}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      Yaratilmoqda...
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="h-6 w-6" />
                      AI Yaratish (1 Ball)
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-8 animate-in zoom-in-95 duration-500">
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-blue-700">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shadow-sm">
                      <CheckSquare className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Hujjat tayyor!</p>
                      <p className="text-sm opacity-80">Ma'lumotlar yuklab olinganidan so'ng o'chiriladi.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedService.id === 'presentation' ? (
                      <button 
                        onClick={downloadPptx}
                        className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all"
                      >
                        <Download className="h-4 w-4" />
                        PPTX Yuklash
                      </button>
                    ) : (
                      <button 
                        onClick={downloadDocx}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                      >
                        <Download className="h-4 w-4" />
                        DOCX Yuklash
                      </button>
                    )}
                    <button 
                      onClick={downloadPDF}
                      className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </button>
                  </div>
                </div>

                <div className="prose prose-blue max-w-none bg-gray-50 p-10 rounded-3xl border border-gray-100">
                   {selectedService.id === 'test_builder' && questions.length > 0 ? (
                     <div className="space-y-8 not-prose">
                        <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                           <p className="text-blue-700 font-bold">Test Builder: {questions.length} ta savol</p>
                           <button 
                             onClick={addQuestion}
                             className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-blue-700 transition-all flex items-center gap-2"
                           >
                             <Layers className="h-4 w-4" />
                             Savol qo'shish
                           </button>
                        </div>
                        {questions.map((q, qIdx) => (
                          <div key={q.id} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                             <div className="flex justify-between items-start gap-4">
                               <div className="flex-1 space-y-2">
                                 <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Savol {qIdx + 1}</label>
                                 <textarea 
                                   className="w-full px-5 py-4 rounded-xl bg-gray-50 border-none font-bold text-sm min-h-[80px]"
                                   value={q.text}
                                   onChange={e => {
                                     const newQs = [...questions];
                                     newQs[qIdx].text = e.target.value;
                                     setQuestions(newQs);
                                   }}
                                 />
                               </div>
                               <button 
                                 onClick={() => setQuestions(questions.filter((_, i) => i !== qIdx))}
                                 className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                               >
                                 <Trash2 className="h-5 w-5" />
                               </button>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {q.options.map((opt, oIdx) => (
                                 <div key={oIdx} className="flex items-center gap-3">
                                   <input 
                                     type="radio"
                                     name={`correct-${qIdx}`}
                                     checked={q.correctIdx === oIdx}
                                     onChange={() => {
                                       const newQs = [...questions];
                                       newQs[qIdx].correctIdx = oIdx;
                                       setQuestions(newQs);
                                     }}
                                     className="w-5 h-5 text-blue-600 focus:ring-blue-600"
                                   />
                                   <input 
                                     type="text"
                                     className={`flex-1 px-4 py-2 rounded-lg border-none text-sm font-medium ${q.correctIdx === oIdx ? 'bg-green-50 text-green-700 font-bold' : 'bg-gray-50 text-gray-600'}`}
                                     value={opt}
                                     onChange={e => {
                                       const newQs = [...questions];
                                       newQs[qIdx].options[oIdx] = e.target.value;
                                       setQuestions(newQs);
                                     }}
                                   />
                                 </div>
                               ))}
                             </div>
                          </div>
                        ))}
                     </div>
                   ) : (
                     <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result}
                     </ReactMarkdown>
                   )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
