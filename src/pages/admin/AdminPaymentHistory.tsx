import { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  getDocs,
  setDoc,
  addDoc,
  serverTimestamp,
  arrayUnion,
  getDoc,
  where,
} from "firebase/firestore";
import {
  Clock,
  Search,
  Download,
  Coins,
  PlusCircle,
  X,
  Wallet,
  Building2,
  Users,
  GraduationCap,
  Bot,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Calendar,
  Filter,
  ArrowUpRight,
} from "lucide-react";
import * as XLSX from "xlsx";

interface PaymentRecord {
  id: string;
  userId?: string;
  systemId?: string | number;
  telegramId?: string | number | null;
  payerName: string;
  payerType: "tashkilot" | "xodim" | "talaba" | "bot_user" | "mustaqil_o_qituvchi" | string;
  amount: number;
  tariffName: string;
  paymentType: string;
  status?: string;
  timestamp?: any;
  createdAt?: any;
  date?: string;
}

interface UserSearchResult {
  id: string;
  uid?: string;
  displayName: string;
  systemId?: string | number;
  telegramId?: number | string;
  role?: string;
  balance: number;
  ball: number;
  phone?: string;
}

export default function AdminPaymentHistory() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  // Modal state for manual balance top-up
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<string>("");
  const [topUpMethod, setTopUpMethod] = useState<string>("Admin (Sayt)");
  const [topUpNote, setTopUpNote] = useState<string>("Balans to'ldirish");
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false);

  useEffect(() => {
    // 1. Listen to payment_history collection
    const qHistory = collection(db, "payment_history");
    const unsubHistory = onSnapshot(
      qHistory,
      async (snap) => {
        const list: PaymentRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: data.userId || "",
            systemId: data.systemId,
            telegramId: data.telegramId,
            payerName: data.payerName || data.userName || "Noma'lum foydalanuvchi",
            payerType: data.payerType || (data.telegramId ? "bot_user" : "tashkilot"),
            amount: Number(data.amount || 0),
            tariffName: data.tariffName || data.description || "To'lov",
            paymentType: data.paymentType || "Noma'lum",
            status: data.status || "approved",
            timestamp: data.timestamp || data.createdAt || data.date,
            createdAt: data.createdAt,
          };
        });

        // 2. Also fetch approved payments from `payments` collection that might not be in payment_history yet
        try {
          const pSnap = await getDocs(
            query(collection(db, "payments"), where("status", "==", "approved"))
          );
          const historyPaymentIds = new Set(
            snap.docs.map((d) => d.data().paymentDocId).filter(Boolean)
          );

          pSnap.docs.forEach((docSnap) => {
            if (!historyPaymentIds.has(docSnap.id)) {
              const pData = docSnap.data();
              // Check if already in list
              const alreadyExists = list.some(
                (item) =>
                  item.id === docSnap.id ||
                  (item.amount === Number(pData.amount) &&
                    String(item.userId) === String(pData.userId))
              );
              if (!alreadyExists) {
                list.push({
                  id: docSnap.id,
                  userId: String(pData.userId || ""),
                  telegramId: typeof pData.userId === "number" ? pData.userId : null,
                  payerName: pData.userName || "Telegram Foydalanuvchi",
                  payerType: "bot_user",
                  amount: Number(pData.amount || 0),
                  tariffName: `Chek orqali to'lov (${Number(pData.amount || 0).toLocaleString()} UZS)`,
                  paymentType: "Chek (Karta orqali)",
                  status: "approved",
                  timestamp: pData.processedAt || pData.timestamp,
                });
              }
            }
          });
        } catch (err) {
          console.warn("Could not check payments collection fallback:", err);
        }

        // Sort descending by date
        list.sort((a, b) => {
          const getTime = (val: any) => {
            if (!val) return 0;
            if (val.toMillis) return val.toMillis();
            if (val.seconds) return val.seconds * 1000;
            if (val instanceof Date) return val.getTime();
            const parsed = new Date(val).getTime();
            return isNaN(parsed) ? 0 : parsed;
          };
          return getTime(b.timestamp) - getTime(a.timestamp);
        });

        setPayments(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading payment_history:", error);
        setLoading(false);
      }
    );

    return () => unsubHistory();
  }, []);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Search term filter
      const search = searchTerm.toLowerCase().trim();
      const matchSearch =
        !search ||
        (p.payerName && p.payerName.toLowerCase().includes(search)) ||
        (p.tariffName && p.tariffName.toLowerCase().includes(search)) ||
        (p.userId && String(p.userId).toLowerCase().includes(search)) ||
        (p.systemId && String(p.systemId).toLowerCase().includes(search)) ||
        (p.telegramId && String(p.telegramId).toLowerCase().includes(search)) ||
        (p.paymentType && p.paymentType.toLowerCase().includes(search)) ||
        String(p.amount).includes(search);

      if (!matchSearch) return false;

      // Type filter
      if (typeFilter !== "all") {
        const type = (p.payerType || "").toLowerCase();
        if (typeFilter === "tashkilot" && !type.includes("tashkilot") && type !== "org") return false;
        if (typeFilter === "xodim" && !type.includes("xodim") && type !== "staff") return false;
        if (typeFilter === "talaba" && !type.includes("talaba") && type !== "student") return false;
        if (typeFilter === "bot_user" && !type.includes("bot") && !p.telegramId) return false;
        if (typeFilter === "mustaqil_o_qituvchi" && !type.includes("o_qituvchi") && !type.includes("teacher")) return false;
      }

      // Method filter
      if (methodFilter !== "all") {
        const m = (p.paymentType || "").toLowerCase();
        if (methodFilter === "bot" && !m.includes("bot")) return false;
        if (methodFilter === "site" && !m.includes("sayt") && !m.includes("admin")) return false;
        if (methodFilter === "chek" && !m.includes("chek")) return false;
        if (methodFilter === "online" && !m.includes("click") && !m.includes("payme") && !m.includes("uzum")) return false;
      }

      return true;
    });
  }, [payments, searchTerm, typeFilter, methodFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    let totalIncome = 0;
    let botIncome = 0;
    let siteIncome = 0;
    let todayIncome = 0;
    let todayCount = 0;

    const todayStr = new Date().toDateString();

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      totalIncome += amt;

      const pType = (p.payerType || "").toLowerCase();
      const pMethod = (p.paymentType || "").toLowerCase();

      if (pType.includes("bot") || p.telegramId || pMethod.includes("bot")) {
        botIncome += amt;
      } else {
        siteIncome += amt;
      }

      // Check date
      let pDate: Date | null = null;
      if (p.timestamp?.toDate) {
        pDate = p.timestamp.toDate();
      } else if (p.timestamp?.seconds) {
        pDate = new Date(p.timestamp.seconds * 1000);
      } else if (p.timestamp) {
        pDate = new Date(p.timestamp);
      }

      if (pDate && !isNaN(pDate.getTime()) && pDate.toDateString() === todayStr) {
        todayIncome += amt;
        todayCount += 1;
      }
    });

    return {
      totalIncome,
      botIncome,
      siteIncome,
      todayIncome,
      todayCount,
      totalCount: payments.length,
    };
  }, [payments]);

  // Search users for manual balance top-up
  const handleSearchUsers = async (queryText: string) => {
    setUserSearchTerm(queryText);
    if (!queryText || queryText.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const text = queryText.toLowerCase().trim();

      const results: UserSearchResult[] = [];
      snap.docs.forEach((d) => {
        const u = d.data();
        const name = u.displayName || u.name || u.login || "";
        const sysId = String(u.systemId || "");
        const tgId = String(u.telegramId || "");
        const phone = String(u.phone || "");
        const email = String(u.email || "");

        if (
          name.toLowerCase().includes(text) ||
          sysId.includes(text) ||
          tgId.includes(text) ||
          phone.includes(text) ||
          email.toLowerCase().includes(text) ||
          d.id.toLowerCase().includes(text)
        ) {
          results.push({
            id: d.id,
            uid: u.uid || d.id,
            displayName: name || `ID: ${sysId || d.id}`,
            systemId: u.systemId,
            telegramId: u.telegramId,
            role: u.role || (u.telegramId ? "bot_user" : "foydalanuvchi"),
            balance: Number(u.balance !== undefined ? u.balance : (u.ball || 0)),
            ball: Number(u.ball || 0),
            phone: u.phone,
          });
        }
      });

      setSearchResults(results.slice(0, 10));
    } catch (e) {
      console.error("Error searching users:", e);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  // Submit manual top-up
  const handleConfirmTopUp = async () => {
    if (!selectedUser) {
      alert("Iltimos, avval foydalanuvchini tanlang!");
      return;
    }

    const amountNum = Number(topUpAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Iltimos, to'g'ri to'lov summasini kiriting!");
      return;
    }

    setIsSubmittingTopUp(true);
    try {
      const userRef = doc(db, "users", selectedUser.id);
      const userSnap = await getDoc(userRef);

      let currentBal = selectedUser.balance;
      let currentBall = selectedUser.ball;

      if (userSnap.exists()) {
        const uData = userSnap.data();
        currentBal = Number(uData.balance !== undefined ? uData.balance : (uData.ball || 0));
        currentBall = Number(uData.ball || 0);
      }

      const newBal = currentBal + amountNum;
      const newBall = currentBall + amountNum;

      // 1. Update user balance
      await setDoc(
        userRef,
        {
          balance: newBal,
          ball: newBall,
          updatedAt: serverTimestamp(),
          billingHistory: arrayUnion({
            type: "kirim",
            amount: amountNum,
            date: new Date().toISOString(),
            description: `${topUpNote} (+${amountNum.toLocaleString()} UZS)`
          })
        },
        { merge: true }
      );

      // 2. Add to payment_history collection
      await addDoc(collection(db, "payment_history"), {
        userId: selectedUser.id,
        systemId: selectedUser.systemId || "",
        telegramId: selectedUser.telegramId || null,
        payerName: selectedUser.displayName,
        payerType: selectedUser.role || (selectedUser.telegramId ? "bot_user" : "tashkilot"),
        amount: amountNum,
        tariffName: topUpNote || "Balans to'ldirish",
        paymentType: topUpMethod,
        status: "approved",
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      // 3. Optional message in messages collection
      await addDoc(collection(db, "messages"), {
        senderId: "SYSTEM_ADMIN",
        receiverId: selectedUser.id,
        text: `Sizning balansingizga ${amountNum.toLocaleString()} UZS qo'shildi. Joriy balans: ${newBal.toLocaleString()} UZS.`,
        timestamp: serverTimestamp(),
        isRead: false,
      });

      alert(`✅ Muvaffaqiyatli! ${selectedUser.displayName} balansiga ${amountNum.toLocaleString()} UZS qo'shildi.`);
      setShowTopUpModal(false);
      setSelectedUser(null);
      setTopUpAmount("");
      setUserSearchTerm("");
      setSearchResults([]);
    } catch (err: any) {
      console.error("Top-up error:", err);
      alert("Xatolik yuz berdi: " + (err.message || String(err)));
    } finally {
      setIsSubmittingTopUp(false);
    }
  };

  const exportExcel = () => {
    const exportData = filteredPayments.map((p, idx) => ({
      "№": idx + 1,
      "To'lovchi": p.payerName,
      "Foydalanuvchi ID": p.systemId || p.userId || "-",
      "Telegram ID": p.telegramId || "-",
      "Turi": getPayerTypeLabel(p.payerType),
      "Tarif / Maqsad": p.tariffName,
      "Summa (UZS)": p.amount,
      "To'lov usuli": p.paymentType || "-",
      "Sana va vaqt": formatTimestamp(p.timestamp),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "To'lovlar Tarixi");
    XLSX.writeFile(wb, "Tolash_Tarixi.xlsx");
  };

  const getPayerTypeLabel = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("tashkilot") || t === "org") return "🏢 Tashkilot";
    if (t.includes("xodim") || t === "staff") return "👨‍💼 Xodim (FISH)";
    if (t.includes("talaba") || t === "student") return "🎓 Talaba";
    if (t.includes("bot") || t === "bot_user") return "🤖 Telegram Bot";
    if (t.includes("o_qituvchi") || t === "teacher") return "👨‍🏫 Mustaqil o'qituvchi";
    return "👤 Foydalanuvchi";
  };

  const getPayerTypeBadge = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("tashkilot") || t === "org") {
      return "bg-blue-50 text-blue-700 border-blue-100";
    }
    if (t.includes("xodim") || t === "staff") {
      return "bg-teal-50 text-teal-700 border-teal-100";
    }
    if (t.includes("talaba") || t === "student") {
      return "bg-purple-50 text-purple-700 border-purple-100";
    }
    if (t.includes("bot") || t === "bot_user") {
      return "bg-sky-50 text-sky-700 border-sky-100";
    }
    if (t.includes("o_qituvchi") || t === "teacher") {
      return "bg-amber-50 text-amber-700 border-amber-100";
    }
    return "bg-gray-50 text-gray-700 border-gray-100";
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return "-";
    if (ts.toDate) return ts.toDate().toLocaleString("uz-UZ");
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString("uz-UZ");
    const d = new Date(ts);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString("uz-UZ");
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 font-black text-indigo-600">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-bold">To'lovlar tarixi yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Coins className="w-8 h-8 text-indigo-600 shrink-0" />
            To'lovlar Tarixi
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">
            Telegram bot va sayt orqali o'tkazilgan barcha to'lovlar, hisob to'ldirishlar va daromadlar jurnali.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowTopUpModal(true)}
            className="flex-1 md:flex-initial px-5 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Balans To'ldirish
          </button>
          <button
            onClick={exportExcel}
            className="flex-1 md:flex-initial px-5 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Excelga Yuklash
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jami Tushum</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {stats.totalIncome.toLocaleString()} <span className="text-sm font-bold text-gray-400">UZS</span>
          </div>
          <p className="text-xs font-bold text-gray-400">Jami {stats.totalCount} ta to'lov operatsiyasi</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bugungi To'lovlar</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600">
            {stats.todayIncome.toLocaleString()} <span className="text-sm font-bold text-gray-400">UZS</span>
          </div>
          <p className="text-xs font-bold text-gray-400">Bugun: {stats.todayCount} ta tranzaksiya</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Telegram Bot Tushumi</span>
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl">
              <Bot className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-600">
            {stats.botIncome.toLocaleString()} <span className="text-sm font-bold text-gray-400">UZS</span>
          </div>
          <p className="text-xs font-bold text-gray-400">Bot foydalanuvchilari to'lovlari</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sayt & Tashkilotlar</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600">
            {stats.siteIncome.toLocaleString()} <span className="text-sm font-bold text-gray-400">UZS</span>
          </div>
          <p className="text-xs font-bold text-gray-400">Tashkilot, xodim va talabalar</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-indigo-600 font-bold text-sm"
              placeholder="Ism, ID, Telegram ID yoki tarif bo'yicha qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-xs text-gray-700 focus:ring-2 focus:ring-indigo-600"
            >
              <option value="all">Barcha manbalar</option>
              <option value="bot">🤖 Telegram Bot</option>
              <option value="site">💻 Admin Panel (Sayt)</option>
              <option value="chek">📄 Chek orqali</option>
              <option value="online">💳 Onlayn (Click / Payme)</option>
            </select>
          </div>
        </div>

        {/* Role Type Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-gray-50 text-xs font-bold">
          <span className="text-gray-400 shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filtr:
          </span>
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              typeFilter === "all"
                ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            Barchasi ({payments.length})
          </button>
          <button
            onClick={() => setTypeFilter("tashkilot")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              typeFilter === "tashkilot"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            🏢 Tashkilotlar
          </button>
          <button
            onClick={() => setTypeFilter("bot_user")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              typeFilter === "bot_user"
                ? "bg-sky-600 text-white shadow-md shadow-sky-200"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            🤖 Bot Foydalanuvchilari
          </button>
          <button
            onClick={() => setTypeFilter("xodim")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              typeFilter === "xodim"
                ? "bg-teal-600 text-white shadow-md shadow-teal-200"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            👨‍💼 Xodimlar
          </button>
          <button
            onClick={() => setTypeFilter("talaba")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              typeFilter === "talaba"
                ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            🎓 Talabalar
          </button>
          <button
            onClick={() => setTypeFilter("mustaqil_o_qituvchi")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              typeFilter === "mustaqil_o_qituvchi"
                ? "bg-amber-600 text-white shadow-md shadow-amber-200"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            👨‍🏫 Mustaqil o'qituvchilar
          </button>
        </div>
      </div>

      {/* History table */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest w-16">
                  №
                </th>
                <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                  Foydalanuvchi / To'lovchi
                </th>
                <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                  Turi
                </th>
                <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                  Tarif / Maqsad
                </th>
                <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                  To'lov Manbai
                </th>
                <th className="px-6 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest">
                  Summa
                </th>
                <th className="px-6 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                  Sana va Vaqt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPayments.map((p, idx) => (
                <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors group">
                  <td className="px-6 py-5 font-bold text-gray-400 text-sm">{idx + 1}</td>
                  <td className="px-6 py-5">
                    <div className="font-black text-gray-900 text-sm tracking-tight">
                      {p.payerName}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-0.5">
                      {p.systemId && <span>ID: {p.systemId}</span>}
                      {p.telegramId && (
                        <span className="text-sky-600 font-bold">TG: {p.telegramId}</span>
                      )}
                      {!p.systemId && !p.telegramId && p.userId && (
                        <span>ID: {p.userId.slice(0, 12)}...</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${getPayerTypeBadge(
                        p.payerType
                      )}`}
                    >
                      {getPayerTypeLabel(p.payerType)}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="font-bold text-xs text-gray-800">{p.tariffName}</div>
                  </td>
                  <td className="px-6 py-5 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-[11px] font-extrabold">
                      <CreditCard className="w-3 h-3 text-gray-500" />
                      {p.paymentType || "Admin"}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-sm text-emerald-600 whitespace-nowrap">
                    +{(p.amount || 0).toLocaleString()} UZS
                  </td>
                  <td className="px-6 py-5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5 text-gray-500 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{formatTimestamp(p.timestamp)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="p-20 text-center space-y-2">
            <Coins className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-gray-400 font-bold">Hech qanday to'lovlar tarixi topilmadi.</p>
            <p className="text-gray-400 text-xs font-medium">
              Qidiruv so'zini o'zgartirib yoki yuqoridagi "Balans To'ldirish" orqali yangi to'lov kiriting.
            </p>
          </div>
        )}
      </div>

      {/* Manual Balance Top-up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-6 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 font-bold">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Foydalanuvchi Balansini To'ldirish</h3>
                  <p className="text-xs text-gray-400 font-medium">
                    Sayt yoki Telegram bot foydalanuvchisi hisobiga mablag' kiritish
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTopUpModal(false);
                  setSelectedUser(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Select User */}
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block">
                1. Foydalanuvchini Qidirish
              </label>

              {!selectedUser ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-600"
                      placeholder="Ism, login, ID, telefon yoki Telegram ID..."
                      value={userSearchTerm}
                      onChange={(e) => handleSearchUsers(e.target.value)}
                    />
                  </div>

                  {isSearchingUsers && (
                    <div className="p-4 text-center text-xs text-gray-400 font-bold">
                      Qidirilmoqda...
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="border border-gray-100 rounded-2xl divide-y divide-gray-50 max-h-48 overflow-y-auto bg-white shadow-sm">
                      {searchResults.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedUser(u);
                            setSearchResults([]);
                          }}
                          className="p-3 hover:bg-indigo-50/50 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="font-bold text-xs text-gray-900">{u.displayName}</p>
                            <p className="text-[10px] text-gray-400">
                              ID: {u.systemId || u.id.slice(0, 8)} | Rol: {getPayerTypeLabel(u.role || "")}
                              {u.telegramId ? ` | TG: ${u.telegramId}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-emerald-600">
                              {u.balance.toLocaleString()} UZS
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-900">{selectedUser.displayName}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-white text-indigo-700 rounded-md font-bold">
                        {getPayerTypeLabel(selectedUser.role || "")}
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-700 font-medium mt-1">
                      Joriy balans: <b>{selectedUser.balance.toLocaleString()} UZS</b>
                      {selectedUser.telegramId && ` (Telegram ID: ${selectedUser.telegramId})`}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    O'zgartirish
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Amount */}
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider block">
                2. To'lov Summasi (UZS)
              </label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black text-gray-900 focus:ring-2 focus:ring-indigo-600"
                placeholder="Masalan: 50000"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
              />
              <div className="flex items-center gap-2 flex-wrap">
                {[10000, 25000, 50000, 100000, 200000, 500000].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setTopUpAmount(String(quick))}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    +{quick.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Payment Method & Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider block">
                  To'lov Usuli
                </label>
                <select
                  value={topUpMethod}
                  onChange={(e) => setTopUpMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="Admin (Sayt)">Admin Panel (Sayt)</option>
                  <option value="Naqd pul">Naqd pul</option>
                  <option value="Bank o'tkazmasi">Bank o'tkazmasi</option>
                  <option value="Chek (Karta orqali)">Chek (Karta)</option>
                  <option value="Bonus / Rag'bat">Bonus / Rag'bat</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-700 uppercase tracking-wider block">
                  To'lov Maqsadi / Izoh
                </label>
                <input
                  type="text"
                  value={topUpNote}
                  onChange={(e) => setTopUpNote(e.target.value)}
                  placeholder="Izoh..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowTopUpModal(false);
                  setSelectedUser(null);
                }}
                className="px-5 py-3 text-xs font-bold text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={!selectedUser || !topUpAmount || isSubmittingTopUp}
                onClick={handleConfirmTopUp}
                className="px-6 py-3 bg-indigo-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all cursor-pointer flex items-center gap-2"
              >
                {isSubmittingTopUp ? "Saqlanmoqda..." : "Balansni To'ldirish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
