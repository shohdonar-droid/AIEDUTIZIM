import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import firebaseConfig from "../../../firebase-applet-config.json";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc,
  getDoc,
  setDoc,
  where,
  getDocs
} from "firebase/firestore";
import { Check, X, Eye, Clock, User, CreditCard } from "lucide-react";
import { getNextSequentialId } from "../../lib/idUtils";

export default function AdminServices() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "connection_requests"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleApprove = async (req: any) => {
    if (!confirm("Ushbu so'rovni tasdiqlaysizmi?")) return;
    try {
      let targetUserId = req.userId;
      let approvedLogin = "";
      let approvedPassword = "";

      if (req.isNewOrgRequest) {
        // Create new user (either "teacher" for organizations or "mustaqil_o_qituvchi" for independent teachers)
        const isMustaqil = req.tariffName?.toLowerCase().includes("mustaqil");
        const role = isMustaqil ? "mustaqil_o_qituvchi" : "teacher";
        
        const cleanLogin = await getNextSequentialId(role);
        const pass = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit random password
        approvedLogin = cleanLogin;
        approvedPassword = pass;

        const email = `${cleanLogin}@teacher.uz`;
        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password: pass,
              returnSecureToken: false,
            }),
          },
        );
        if (!response.ok) throw new Error("Yangi foydalanuvchi yaratishda xatolik");
        const data = await response.json();
        const uid = data.localId;
        targetUserId = uid;

        if (isMustaqil) {
          // Get UY Home organization Id as teacherId
          let uyOrgId = "";
          const qUy = query(collection(db, 'users'), where('role', '==', 'teacher'), where('displayName', '==', 'UY'));
          const uySnap = await getDocs(qUy);
          if (!uySnap.empty) {
            uyOrgId = uySnap.docs[0].id;
          } else {
            const uyRef = await addDoc(collection(db, 'users'), {
              displayName: 'UY',
              role: 'teacher',
              status: 'active',
              createdAt: serverTimestamp(),
              limit_departments: 9999,
              limit_groups: 9999,
              limit_students: 9999,
              limit_subjects: 9999,
              limit_tests: 9999,
              limit_quizizz: 9999,
              limit_exams: 9999,
              limit_certificates: 9999
            });
            uyOrgId = uyRef.id;
          }

          const defaultLimits = {
            limit_departments: 1,
            limit_groups: 1,
            limit_students: 5,
            limit_subjects: 2,
            limit_tests: 2,
            limit_quizizz: 1,
            limit_exams: 1,
            limit_courses: 0,
            limit_certificates: 5,
            limit_tests_per_subject: 10,
            limit_questions_per_test: 10,
            limit_questions_per_quizizz: 5,
            limit_questions_per_exam: 10,
          };

          await setDoc(doc(db, "users", uid), {
            uid: uid,
            displayName: req.userName,
            phone: req.phone || "",
            login: cleanLogin,
            systemId: cleanLogin,
            password: pass,
            role: "mustaqil_o_qituvchi",
            teacherId: uyOrgId,
            email: email,
            status: 'active',
            total_spent: 0,
            customLimitPrices: {},
            createdAt: serverTimestamp(),
            ...defaultLimits
          });
        } else {
          // Map limits if provided (CORPORATE calculator)
          const customLimits: any = {};
          if (req.limits) {
            customLimits.studentLimit = Number(req.limits.students) || 0;
            customLimits.staffLimit = Number(req.limits.staff) || 0;
            customLimits.courseLimit = Number(req.limits.courses) || 0;
            customLimits.testLimit = Number(req.limits.tests) || 0;
            customLimits.examLimit = Number(req.limits.exams) || 0;
            customLimits.subjectLimit = Number(req.limits.subjects) || 0;
            customLimits.quizizzLimit = Number(req.limits.quizizz) || 0;
            customLimits.hasAi = !!req.limits.ai;
            customLimits.hasBot = !!req.limits.bot;
          } else {
            // Default limits based on requested tariff
            const isStandard = req.tariffName?.toLowerCase() === "standard";
            const isProfessional = req.tariffName?.toLowerCase() === "professional";
            customLimits.studentLimit = isStandard ? 200 : (isProfessional ? 1000 : 50);
            customLimits.staffLimit = isStandard ? 5 : (isProfessional ? 20 : 2);
            customLimits.courseLimit = isStandard ? 10 : (isProfessional ? 50 : 3);
            customLimits.testLimit = isStandard ? 50 : (isProfessional ? 300 : 15);
            customLimits.examLimit = isStandard ? 10 : (isProfessional ? 50 : 2);
            customLimits.subjectLimit = isStandard ? 20 : (isProfessional ? 100 : 5);
            customLimits.quizizzLimit = isStandard ? 15 : (isProfessional ? 100 : 4);
            customLimits.hasAi = isStandard || isProfessional;
            customLimits.hasBot = isStandard || isProfessional;
          }

          await setDoc(doc(db, "users", uid), {
            uid: uid,
            displayName: req.userName,
            phone: req.phone || "",
            login: cleanLogin,
            systemId: cleanLogin,
            password: pass,
            role: "teacher",
            email: email,
            tariffName: req.tariffName,
            createdAt: serverTimestamp(),
            ...customLimits
          });
        }
      }

      const updatePayload: any = { status: 'approved' };
      if (req.isNewOrgRequest) {
        updatePayload.approvedLogin = approvedLogin;
        updatePayload.approvedPassword = approvedPassword;
      }
      await updateDoc(doc(db, "connection_requests", req.id), updatePayload);
      
      if (req.isBalanceTopUp) {
        const userRef = doc(db, "users", targetUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const currentBalance = Number(userData.balance ?? userData.ball ?? 0);
          await updateDoc(userRef, { balance: currentBalance + Number(req.tariffPrice || 0) });
        }
      } else if (req.isLimitsRequest) {
        // Update Independent Teacher limits
        const userRef = doc(db, "users", targetUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const targetLimits = req.requestedLimits || req.requestedItems || {};
          const updates: any = {};
          Object.entries(targetLimits).forEach(([key, val]) => {
            const currentVal = userData[key] ?? 0;
            updates[key] = currentVal + Number(val);
          });
          await updateDoc(userRef, updates);
        }
      } else {
        // Standard org subscription or Corporate
        const customLimits: any = {};
        if (req.limits) {
          customLimits.studentLimit = Number(req.limits.students) || 0;
          customLimits.staffLimit = Number(req.limits.staff) || 0;
          customLimits.courseLimit = Number(req.limits.courses) || 0;
          customLimits.testLimit = Number(req.limits.tests) || 0;
          customLimits.examLimit = Number(req.limits.exams) || 0;
          customLimits.subjectLimit = Number(req.limits.subjects) || 0;
          customLimits.quizizzLimit = Number(req.limits.quizizz) || 0;
          customLimits.hasAi = !!req.limits.ai;
          customLimits.hasBot = !!req.limits.bot;
        }

        await addDoc(collection(db, "active_subscriptions"), {
          userId: targetUserId,
          userName: req.userName,
          tariffName: req.tariffName,
          startDate: serverTimestamp(),
          paymentType: req.paymentType,
          tariffPrice: req.tariffPrice,
          limits: req.limits || null
        });

        // Also update the user's primary tariff info
        await updateDoc(doc(db, "users", targetUserId), {
          tariffName: req.tariffName,
          lastTariffUpdate: serverTimestamp(),
          ...customLimits
        });
      }

      // Investigate user role to log in payment_history
      let payerType = "tashkilot";
      let payerName = req.userName;
      try {
        const uSnap = await getDoc(doc(db, "users", targetUserId));
        if (uSnap.exists()) {
          const uData = uSnap.data();
          if (uData.displayName) {
            payerName = uData.displayName;
          }
          if (uData.role === "staff") {
            payerType = "xodim";
          } else if (uData.role === "mustaqil_o_qituvchi") {
            payerType = "mustaqil_o_qituvchi";
          }
        }
      } catch (err) {
        console.warn("Failed to retrieve user info for payment history classification", err);
      }

      await addDoc(collection(db, "payment_history"), {
        userId: targetUserId,
        payerName: payerName,
        payerType: payerType,
        amount: req.tariffPrice || req.totalPrice || 0,
        tariffName: req.tariffName || "Noma'lum",
        paymentType: req.paymentType || "Chek",
        timestamp: serverTimestamp()
      });

      alert("So'rov muvaffaqiyatli tasdiqlandi!");
    } catch (err) { console.error(err); alert("Xatolik: " + (err instanceof Error ? err.message : String(err))); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !rejectId) return alert("Izoh kiriting");
    const req = requests.find(r => r.id === rejectId);
    try {
      await updateDoc(doc(db, "connection_requests", rejectId), { 
        status: 'rejected',
        rejectReason 
      });

      await addDoc(collection(db, "messages"), {
        senderId: 'admin',
        receiverId: req.userId,
        text: `Sizning ${req.tariffName} tarifiga ulanish so'rovingiz rad etildi.\nSababi: ${rejectReason}`,
        timestamp: serverTimestamp(),
        isRead: false
      });

      setRejectId(null);
      setRejectReason("");
      alert("So'rov rad etildi va xabar yuborildi");
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Ulanish so'rovlari</h2>
        <p className="text-gray-500 font-medium mt-1">Tashkilotlarning yangi tariflarga ulanish so'rovlarini boshqarish</p>
      </div>

      {selectedReceipt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedReceipt(null)}>
           <div className="max-w-2xl max-h-[90vh] bg-white p-2 rounded-3xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
              <img src={selectedReceipt} alt="Chek" className="w-full h-full object-contain rounded-2xl" />
              <button onClick={() => setSelectedReceipt(null)} className="absolute top-4 right-4 p-2 bg-white/40 hover:bg-white/40 text-white rounded-full transition-colors"><X/></button>
           </div>
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-black text-gray-900 mb-4 text-center">Rad etish sababi</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Foydalanuvchiga yuboriladigan izohni kiting..."
              className="w-full h-32 px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-600 outline-none text-sm font-medium mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectId(null)} className="flex-1 py-3.5 rounded-xl font-bold text-gray-400 hover:bg-gray-50 uppercase tracking-widest text-xs">Bekor qilish</button>
              <button onClick={handleReject} className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-lg">Tasdiqlash</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase w-16">#</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Sana</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Tashkilot</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Tarif</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase">Narxi</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-center">Chek</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-center">Holat</th>
                <th className="px-6 py-4 text-[11px] font-black tracking-widest text-slate-400 uppercase text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((req, idx) => (
                <tr key={req.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-6 py-4 text-xs font-black text-slate-300">{idx + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-mono">{req.timestamp?.toDate().toLocaleString('uz-UZ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 text-sm">{req.userName}</div>
                    {req.phone && <div className="text-[11px] font-bold text-slate-400 mt-0.5">{req.phone}</div>}
                    {req.approvedLogin && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <span>ID: <span className="font-mono underline">{req.approvedLogin}</span></span>
                        <span className="text-emerald-300">|</span>
                        <span>Parol: <span className="font-mono">{req.approvedPassword}</span></span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase tracking-tighter w-fit">
                        {req.tariffName}
                      </span>
                      {req.limits && (
                        <div className="text-[9px] font-bold text-slate-400 leading-tight">
                          {req.limits.students} talaba / {req.limits.staff} xodim / {req.limits.courses} kurs...
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-black font-mono whitespace-nowrap">
                    {(req.tariffPrice || 0).toLocaleString()} UZS
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => setSelectedReceipt(req.receiptUrl)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"
                    >
                      <Eye className="w-4.5 h-4.5" />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {req.status === 'pending' ? (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-500 text-[9px] font-black uppercase rounded animate-pulse">Kutilmoqda</span>
                    ) : req.status === 'approved' ? (
                      <span className="px-2 py-0.5 bg-green-50 text-green-500 text-[9px] font-black uppercase rounded">Tasdiqlangan</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[9px] font-black uppercase rounded">Rad etilgan</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleApprove(req)}
                          className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl"
                        >
                          <Check className="w-4.5 h-4.5" />
                        </button>
                        <button 
                          onClick={() => setRejectId(req.id)}
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl"
                        >
                          <X className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
