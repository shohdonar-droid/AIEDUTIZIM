import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../../lib/firebase";
import { UserProfile } from "../../types";
import {
  Loader2,
  Search,
  Filter,
  Edit,
  Save,
  X,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  LayoutDashboard,
  Users,
  Zap,
  DollarSign,
  TrendingUp,
  PlusCircle,
  Calculator,
  Check,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function AdminBilling() {
  const [organizations, setOrganizations] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"org" | "student" | "staff">(
    "org",
  );
  const [searchTerm, setSearchTerm] = useState("");
  
  // Custom Calculators
  const [corpCalc, setCorpCalc] = useState({
    students: 1000,
    staff: 20,
    ai: true,
    bot: true,
  });
  const [extraCalc, setExtraCalc] = useState({
    students: 0,
    staff: 0,
    ai: false,
    bot: false,
  });

  const calcCorpPrice = () => {
    const base = 500000;
    const stdPrice = corpCalc.students * 1000;
    const staffPrice = corpCalc.staff * 10000;
    const aiPrice = corpCalc.ai ? 300000 : 0;
    const botPrice = corpCalc.bot ? 200000 : 0;
    return base + stdPrice + staffPrice + aiPrice + botPrice;
  };

  const calcExtraPrice = () => {
    const stdPrice = extraCalc.students * 1500; // Higher rate for extra
    const staffPrice = extraCalc.staff * 15000;
    const aiPrice = extraCalc.ai ? 350000 : 0;
    const botPrice = extraCalc.bot ? 250000 : 0;
    return stdPrice + staffPrice + aiPrice + botPrice;
  };

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [viewingHistoryUser, setViewingHistoryUser] =
    useState<UserProfile | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editIncome, setEditIncome] = useState(0);
  const [editExpense, setEditExpense] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    totalOrgs: 0,
    staffCount: 0,
    totalIncome: 0,
    totalDocs: 0,
    totalSpentAmount: 0,
    tgBotUsers: 0,
  });

  useEffect(() => {
    async function loadData() {
      // Use cached stats if available and fresh (e.g. within last 15 minutes)
      const cachedTime = localStorage.getItem('admin_billing_stats_time');
      const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
      
      const cachedUsers = localStorage.getItem('admin_billing_users_cache');
      if (cachedTime && (Date.now() - Number(cachedTime) < CACHE_TTL) && cachedUsers) {
        try {
          const users = JSON.parse(cachedUsers);
          const orgs = users.filter((u: any) => u.role === "teacher").map((org: any) => ({
              ...org,
              staffCount: users.filter((s: any) => s.role === "staff" && s.teacherId === org.uid).length,
          }));
          setOrganizations(orgs);
          setStudents(users.filter((u: any) => u.role === "student"));
          setStaff(users.filter((u: any) => u.role === "staff"));
          
          const cachedCounts = localStorage.getItem('admin_billing_counts');
          if (cachedCounts) {
             const parsed = JSON.parse(cachedCounts);
             setStats({
                totalOrgs: orgs.length,
                staffCount: users.filter((u: any) => u.role === "staff").length,
                totalIncome: users.reduce((acc: number, u: any) => acc + (u.totalIncome || 0), 0),
                totalDocs: parsed.tests + parsed.courses + parsed.results,
                totalSpentAmount: users.reduce((acc: number, u: any) => acc + (u.totalSpentAmount || 0), 0),
                tgBotUsers: parsed.tgUsers || 0,
             });
             setLoading(false);
             return;
          }
        } catch (e) {
          console.warn("Failed to parse billing cache", e);
        }
      }

      try {
        const uSnap = await getDocs(collection(db, "users"));
        const users = uSnap.docs.map(
          (d) => ({ uid: d.id, ...d.data() }) as UserProfile,
        );
        localStorage.setItem('admin_billing_users_cache', JSON.stringify(users));

        const orgs = users
          .filter((u) => u.role === "teacher")
          .map((org) => ({
            ...org,
            staffCount: users.filter(
              (s) => s.role === "staff" && s.teacherId === org.uid,
            ).length,
          }));
        const stds = users.filter((u) => u.role === "student");
        const stf = users.filter((u) => u.role === "staff");

        setOrganizations(orgs);
        setStudents(stds);
        setStaff(stf);

        // Check if we can use cached counts for others
        let testsCount = 0, coursesCount = 0, resultsCount = 0, tgCount = 0;
        const cachedCounts = localStorage.getItem('admin_billing_counts');
        if (cachedTime && (Date.now() - Number(cachedTime) < CACHE_TTL) && cachedCounts) {
           const parsed = JSON.parse(cachedCounts);
           testsCount = parsed.tests;
           coursesCount = parsed.courses;
           resultsCount = parsed.results;
           tgCount = parsed.tgUsers || 0;
        } else {
           const [tSnap, cSnap, rSnap, tgSnap] = await Promise.all([
             getCountFromServer(collection(db, "tests")),
             getCountFromServer(collection(db, "courses")),
             getCountFromServer(collection(db, "testResults")),
             getCountFromServer(collection(db, "telegram_users"))
           ]);
           testsCount = tSnap.data().count;
           coursesCount = cSnap.data().count;
           resultsCount = rSnap.data().count;
           tgCount = tgSnap.data().count;
           localStorage.setItem('admin_billing_counts', JSON.stringify({ tests: testsCount, courses: coursesCount, results: resultsCount, tgUsers: tgCount }));
           localStorage.setItem('admin_billing_stats_time', Date.now().toString());
        }

        setStats({
          totalOrgs: orgs.length,
          staffCount: stf.length,
          totalIncome: users.reduce((acc, u) => acc + (u.totalIncome || 0), 0),
          totalDocs: testsCount + coursesCount + resultsCount,
          totalSpentAmount: users.reduce(
            (acc, u) => acc + (u.totalSpentAmount || 0),
            0,
          ),
          tgBotUsers: tgCount
        });
      } catch (err: any) {
        if (!err?.message?.includes("quota")) {
          handleFirestoreError(err, OperationType.LIST, "admin-billing-loader");
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setLoading(true);
    try {
      let totalInc = editingUser.totalIncome || 0;
      let totalSpent = editingUser.totalSpentAmount || 0;
      let transactions = editingUser.billingHistory || [];

      if (Number(editIncome) > 0) {
        totalInc += Number(editIncome);
        const newRecord = {
          type: "kirim",
          amount: Number(editIncome),
          date: new Date().toISOString(),
        };
        transactions = [...transactions, newRecord];
      }

      const expense = Number(editExpense);
      if (Math.abs(expense) > 0) {
        const spentVal = Math.abs(expense);
        totalSpent += spentVal;

        const newRecord = {
          type: "chiqim",
          amount: expense < 0 ? expense : -expense,
          date: new Date().toISOString(),
        };
        transactions = [...transactions, newRecord];
      }

      const updateData: any = {
        totalIncome: totalInc,
        totalSpentAmount: totalSpent,
        billingHistory: transactions,
        updatedAt: serverTimestamp(),
      };

      if (Number(editIncome) > 0) {
        updateData.lastIncomeDate = serverTimestamp();
      }

      await setDoc(doc(db, "users", editingUser.uid), updateData, { merge: true });

      // Update local state
      const updatedUser = { ...editingUser, ...updateData };
      if (activeTab === "org") {
        setOrganizations(
          organizations.map((u) =>
            u.uid === editingUser.uid ? updatedUser : u,
          ),
        );
      } else if (activeTab === "student") {
        setStudents(
          students.map((u) => (u.uid === editingUser.uid ? updatedUser : u)),
        );
      } else {
        setStaff(
          staff.map((u) => (u.uid === editingUser.uid ? updatedUser : u)),
        );
      }

      setEditingUser(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    const data =
      activeTab === "org"
        ? organizations
        : activeTab === "student"
          ? students
          : staff;
    const exportData = data.map((u, i) => ({
      "№": i + 1,
      "Nomi / F.I.SH": u.displayName,
      "Tushgan To'lov": u.totalIncome || 0,
      "Ishlatilgan Summa": u.totalSpentAmount || 0,
      "Oxirgi To'lov Sanasi": u.lastIncomeDate?.toDate
        ? u.lastIncomeDate.toDate().toLocaleString()
        : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Billing");
    XLSX.writeFile(
      wb,
      `Billing_${activeTab === "org" ? "Tashkilotlar" : activeTab === "student" ? "Talabalar" : "Xodimlar"}.xlsx`,
    );
  };

  const currentList =
    activeTab === "org"
      ? organizations
      : activeTab === "student"
        ? students
        : staff;
  const filteredList = currentList.filter((u) =>
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading && !editingUser)
    return (
      <div className="flex h-96 items-center justify-center font-black text-indigo-600">
        Yuklanmoqda...
      </div>
    );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Moliyaviy Hisobot (Billing)
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            Tushumlar, ballar va foydalanuvchilar balansi boshqaruvi.
          </p>
        </div>
        <div className="flex bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm">
          <button
            onClick={() => setActiveTab("org")}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === "org" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"}`}
          >
            Tashkilotlar ({organizations.length})
          </button>
          <button
            onClick={() => setActiveTab("student")}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === "student" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"}`}
          >
            Talabalar ({students.length})
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === "staff" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"}`}
          >
            Xodimlar ({staff.length})
          </button>
        </div>
      </header>

      {/* Stats Board - One row redesign */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Tashkilotlar */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform">
            <Users className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Tashkilotlar
            </span>
          </div>
          <h3 className="text-2xl font-black text-gray-900">
            {stats.totalOrgs.toLocaleString()}
          </h3>
        </div>

        {/* Xodimlar */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform">
            <Users className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Xodimlar
            </span>
          </div>
          <h3 className="text-2xl font-black text-gray-900">
            {stats.staffCount.toLocaleString()}
          </h3>
        </div>

        {/* Talabalar */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform">
            <Users className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Talabalar
            </span>
          </div>
          <h3 className="text-2xl font-black text-gray-900">
            {students.length.toLocaleString()}
          </h3>
        </div>

        {/* Telegram Bot */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform text-blue-400">
            <Zap className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Telegram Bot
            </span>
          </div>
          <h3 className="text-2xl font-black text-gray-900">
            {stats.tgBotUsers.toLocaleString()}{" "}
            <span className="text-xs font-bold text-gray-400">a'zo</span>
          </h3>
        </div>

        {/* Umumiy Tushum */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group border-b-4 border-b-green-500">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform text-green-500">
            <TrendingUp className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-50 text-green-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Umumiy Tushum
            </span>
          </div>
          <h3 className="text-2xl font-black text-gray-900">
            {stats.totalIncome.toLocaleString()}
            <small className="text-[10px] ml-1 text-gray-400">so'm</small>
          </h3>
        </div>
      </div>

      {/* Tariflar Section */}
      <div className="bg-white p-10 md:p-16 rounded-[50px] border border-gray-100 shadow-sm space-y-16">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
           <div className="inline-flex p-4 bg-amber-50 text-amber-600 rounded-3xl mb-2">
              <Zap className="w-8 h-8 mx-auto" />
           </div>
           <h2 className="text-4xl font-black text-gray-900 tracking-tight">Tariflar Rejasi</h2>
           <p className="text-gray-400 font-bold text-lg">
             Tizimning kengaytirilgan imkoniyatlaridan foydalanish uchun o'zingizga mos tarifni tanlang. 
             Har bir tarif tashkilot ehtiyojlariga moslab chiqilgan.
           </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {/* START */}
           <div className="p-8 rounded-[40px] border-2 border-gray-50 hover:border-orange-100 transition-all bg-gray-50/30 group">
              <div className="flex justify-between items-start mb-6">
                <span className="text-4xl">🥉</span>
                <span className="px-4 py-1.5 bg-white rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 group-hover:border-orange-200">Start</span>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">START</h3>
              <div className="text-3xl font-black text-orange-600 mb-6 font-mono">300,000 <small className="text-sm">sum/oy</small></div>
              <ul className="space-y-4 mb-8">
                 <li className="text-sm font-bold text-gray-500 flex items-center gap-3">
                    <Check className="w-4 h-4 text-orange-500" /> 50 tagacha talaba
                 </li>
                 <li className="text-sm font-bold text-gray-500 flex items-center gap-3">
                    <Check className="w-4 h-4 text-orange-500" /> 2 ta xodim (o'qituvchi)
                 </li>
                 <li className="text-sm font-bold text-gray-500 flex items-center gap-3">
                    <Check className="w-4 h-4 text-orange-500" /> Asosiy testlar moduli
                 </li>
                 <li className="text-sm font-bold text-gray-400 flex items-center gap-3 line-through">
                    <Check className="w-4 h-4 text-gray-200" /> AI imkoniyatlari
                 </li>
              </ul>
              <button className="w-full py-4 bg-white border-2 border-orange-100 text-orange-600 rounded-2xl font-black hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all uppercase text-sm tracking-widest">Tanlash</button>
           </div>
           
           {/* STANDARD */}
           <div className="p-8 rounded-[40px] border-2 border-indigo-100 bg-white shadow-xl shadow-indigo-50 relative group">
              <div className="absolute -top-4 right-10 bg-indigo-600 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-200">Ommabop</div>
              <div className="flex justify-between items-start mb-6">
                <span className="text-4xl">🥈</span>
                <span className="px-4 py-1.5 bg-indigo-50 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-100 group-hover:border-indigo-200">Standard</span>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">STANDARD</h3>
              <div className="text-3xl font-black text-indigo-600 mb-6 font-mono">700,000 <small className="text-sm">sum/oy</small></div>
              <ul className="space-y-4 mb-8">
                 <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-500" /> 200 tagacha talaba
                 </li>
                 <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-500" /> 5 ta xodim
                 </li>
                 <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-500" /> Murakkab testlar va Hisobotlar
                 </li>
                 <li className="text-sm font-bold text-gray-600 flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-500" /> Telegram Bot integratsiyasi
                 </li>
              </ul>
              <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-sm tracking-widest">Tanlash</button>
           </div>
           
           {/* PROFESSIONAL */}
           <div className="p-8 rounded-[40px] border-2 border-gray-50 hover:border-amber-100 transition-all bg-gray-50/30 group">
              <div className="flex justify-between items-start mb-6">
                <span className="text-4xl">🥇</span>
                <span className="px-4 py-1.5 bg-white rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 group-hover:border-amber-200">Pro</span>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">PROFESSIONAL</h3>
              <div className="text-3xl font-black text-amber-600 mb-6 font-mono">1,500,000 <small className="text-sm">sum/oy</small></div>
              <ul className="space-y-4 mb-8">
                 <li className="text-sm font-bold text-gray-500 flex items-center gap-3">
                    <Check className="w-4 h-4 text-amber-500" /> 1000 tagacha talaba
                 </li>
                 <li className="text-sm font-bold text-gray-500 flex items-center gap-3">
                    <Check className="w-4 h-4 text-amber-500" /> 20 ta xodim
                 </li>
                 <li className="text-sm font-bold text-gray-500 flex items-center gap-3">
                    <Check className="w-4 h-4 text-amber-500" /> AI orqali test generatori
                 </li>
                 <li className="text-sm font-bold text-gray-500 flex items-center gap-3">
                    <Check className="w-4 h-4 text-amber-500" /> Full Telegram Bot Features
                 </li>
              </ul>
              <button className="w-full py-4 bg-white border-2 border-amber-100 text-amber-600 rounded-2xl font-black hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all uppercase text-sm tracking-widest">Tanlash</button>
           </div>
        </div>

        {/* Dynamic Plans Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* CORPORATE CALCULATOR */}
           <div className="bg-indigo-900 rounded-[50px] p-10 text-white shadow-2xl relative overflow-hidden group border-4 border-indigo-800">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-110 transition-transform">
                 <Calculator className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                 <div className="flex items-center gap-4 mb-6">
                    <span className="text-4xl">👑</span>
                    <div>
                       <h3 className="text-2xl font-black">CORPORATE</h3>
                       <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Kelishuv va hisob-kitob asosida</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Talabalar soni</label>
                       <input 
                         type="number" 
                         value={corpCalc.students}
                         onChange={(e) => setCorpCalc({...corpCalc, students: Number(e.target.value)})}
                         className="w-full px-5 py-4 bg-indigo-800/50 rounded-2xl border-2 border-indigo-700 focus:border-white outline-none font-black text-xl transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Xodimlar soni</label>
                       <input 
                         type="number" 
                         value={corpCalc.staff}
                         onChange={(e) => setCorpCalc({...corpCalc, staff: Number(e.target.value)})}
                         className="w-full px-5 py-4 bg-indigo-800/50 rounded-2xl border-2 border-indigo-700 focus:border-white outline-none font-black text-xl transition-all"
                       />
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-indigo-800/30 rounded-2xl border border-indigo-700/50">
                       <input 
                         type="checkbox" 
                         checked={corpCalc.ai}
                         onChange={(e) => setCorpCalc({...corpCalc, ai: e.target.checked})}
                         className="w-6 h-6 rounded-lg accent-white" 
                       />
                       <span className="text-sm font-bold text-indigo-100">AI Test Generator</span>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-indigo-800/30 rounded-2xl border border-indigo-700/50">
                       <input 
                         type="checkbox" 
                         checked={corpCalc.bot}
                         onChange={(e) => setCorpCalc({...corpCalc, bot: e.target.checked})}
                         className="w-6 h-6 rounded-lg accent-white" 
                       />
                       <span className="text-sm font-bold text-indigo-100">Advanced TG Bot</span>
                    </div>
                 </div>

                 <div className="bg-indigo-800/50 p-6 rounded-3xl border-2 border-indigo-700 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                       <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Oylik to'lov summasi:</p>
                       <div className="text-4xl font-black text-white font-mono mt-1">{calcCorpPrice().toLocaleString()} <span className="text-sm text-indigo-400">sum</span></div>
                    </div>
                    <button className="px-10 py-4 bg-white text-indigo-900 rounded-2xl font-black hover:bg-indigo-100 transition-all uppercase text-xs tracking-widest shadow-lg">Shartnoma Tuzish</button>
                 </div>
              </div>
           </div>

           {/* EXTRA LIMITS */}
           <div className="bg-emerald-900 rounded-[50px] p-10 text-white shadow-2xl relative overflow-hidden group border-4 border-emerald-800">
              <div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12 group-hover:scale-110 transition-transform">
                 <PlusCircle className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                 <div className="flex items-center gap-4 mb-6">
                    <span className="text-4xl">➕</span>
                    <div>
                       <h3 className="text-2xl font-black">EXTRA LIMITS</h3>
                       <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest">Bir martalik qo'shimcha imkoniyatlar</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">Qo'shish (Talaba)</label>
                       <input 
                         type="number" 
                         placeholder="0"
                         value={extraCalc.students || ""}
                         onChange={(e) => setExtraCalc({...extraCalc, students: Number(e.target.value)})}
                         className="w-full px-5 py-4 bg-emerald-800/50 rounded-2xl border-2 border-emerald-700 focus:border-white outline-none font-black text-xl transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">Qo'shish (Xodim)</label>
                       <input 
                         type="number" 
                         placeholder="0"
                         value={extraCalc.staff || ""}
                         onChange={(e) => setExtraCalc({...extraCalc, staff: Number(e.target.value)})}
                         className="w-full px-5 py-4 bg-emerald-800/50 rounded-2xl border-2 border-emerald-700 focus:border-white outline-none font-black text-xl transition-all"
                       />
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-emerald-800/30 rounded-2xl border border-emerald-700/50">
                       <input 
                         type="checkbox" 
                         checked={extraCalc.ai}
                         onChange={(e) => setExtraCalc({...extraCalc, ai: e.target.checked})}
                         className="w-6 h-6 rounded-lg accent-white" 
                       />
                       <span className="text-sm font-bold text-emerald-100">Darsliklar/AI (1 oy)</span>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-emerald-800/30 rounded-2xl border border-emerald-700/50">
                       <input 
                         type="checkbox" 
                         checked={extraCalc.bot}
                         onChange={(e) => setExtraCalc({...extraCalc, bot: e.target.checked})}
                         className="w-6 h-6 rounded-lg accent-white" 
                       />
                       <span className="text-sm font-bold text-emerald-100">Xabar yuborish/Bot</span>
                    </div>
                 </div>

                 <div className="bg-emerald-800/50 p-6 rounded-3xl border-2 border-emerald-700 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                       <p className="text-xs font-black text-emerald-400 uppercase tracking-widest">Qo'shimcha to'lov summasi:</p>
                       <div className="text-4xl font-black text-white font-mono mt-1">{calcExtraPrice().toLocaleString()} <span className="text-sm text-emerald-400">sum</span></div>
                    </div>
                    <button className="px-10 py-4 bg-white text-emerald-900 rounded-2xl font-black hover:bg-emerald-100 transition-all uppercase text-xs tracking-widest shadow-lg">Sotib olish</button>
                 </div>
                 <p className="mt-4 text-[9px] font-bold text-emerald-400 leading-relaxed italic text-center">
                   * Diqqat: Qo'shimcha imkoniyatlar faqat joriy oy uchun amal qiladi. Keyingi oyda tizim o'zining asosiy tarif limitlariga qaytadi.
                 </p>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-indigo-600 font-bold"
            placeholder={`${activeTab === "org" ? "Tashkilot" : activeTab === "student" ? "Talaba" : "Xodim"} nomini yozing...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={exportExcel}
          className="w-full md:w-auto px-8 py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center gap-2 uppercase tracking-tight"
        >
          <CreditCard className="w-5 h-5" /> Excelga Yuklash
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-6 py-8 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                  №
                </th>
                <th className="px-6 py-8 text-left text-xs font-black text-gray-400 uppercase tracking-widest">
                  Nomi / F.I.SH
                </th>
                {activeTab === "org" && (
                  <th className="px-6 py-8 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                    Xodimlar soni
                  </th>
                )}
                <th className="px-6 py-8 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                  Jami tushum
                </th>
                <th className="px-6 py-8 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                  Ishlatilgan Summa
                </th>
                <th className="px-6 py-8 text-right text-xs font-black text-gray-400 uppercase tracking-widest">
                  Amallar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredList.map((u, i) => (
                <tr
                  key={`${u.uid || "user"}_${i}`}
                  className="hover:bg-gray-50/30 transition-colors group"
                >
                  <td className="px-6 py-6 font-bold text-gray-400">{i + 1}</td>
                  <td className="px-6 py-6">
                    <div className="font-black text-gray-900">
                      {u.displayName}
                    </div>
                    <div className="text-xs font-bold text-gray-400">
                      {u.login || u.email}
                    </div>
                  </td>
                  {activeTab === "org" && (
                    <td className="px-6 py-6 text-center font-bold text-sm">
                      <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg">
                        {(u as any).staffCount || 0} ta
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-6 text-center font-black text-green-600 bg-green-50/20">
                    {u.totalIncome?.toLocaleString() || "0"}
                  </td>
                  <td className="px-6 py-6 text-center font-bold text-red-500 bg-red-50/20">
                    {u.totalSpentAmount?.toLocaleString() || "0"}
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setViewingHistoryUser(u);
                        }}
                        className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setEditIncome(0);
                          setEditExpense(0);
                        }}
                        className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white max-w-lg w-full rounded-[40px] p-10 shadow-3xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900">
                  Billing sozlamalari
                </h3>
                <p className="text-sm font-bold text-gray-400 mt-1">
                  {editingUser.displayName}
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-3 hover:bg-gray-100 rounded-2xl"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  Yangi to'lov summasi (so'mda)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Masalan: 50000"
                    value={editIncome || ""}
                    onChange={(e) => setEditIncome(Number(e.target.value))}
                    className="w-full px-6 py-5 bg-indigo-50/30 rounded-2xl border-2 border-indigo-100 focus:border-indigo-600 focus:bg-white transition-all font-black text-2xl text-indigo-700"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-indigo-300 uppercase tracking-tighter">
                    sum
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-400 italic mt-1">
                  * Bu summa jami tushumga qo'shiladi.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  Chiqim summasi
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Masalan: 5000"
                    value={editExpense || ""}
                    onChange={(e) => setEditExpense(Number(e.target.value))}
                    className="w-full px-6 py-5 bg-red-50/30 rounded-2xl border-2 border-red-100 focus:border-red-600 focus:bg-white transition-all font-black text-2xl text-red-700"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-red-300 uppercase tracking-tighter">
                    sum
                  </span>
                </div>
                <p className="text-[10px] font-bold text-gray-400 italic mt-1">
                  * Bu summa ishlatilgan summaga qo'shiladi.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl space-y-3">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-400">Jami tushum bo'ladi:</span>
                  <span className="text-gray-900">
                    {(
                      (editingUser.totalIncome || 0) + (editIncome || 0)
                    ).toLocaleString()}{" "}
                    so'm
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-400">
                    Ishlatilgan summa bo'ladi:
                  </span>
                  <span className="text-red-500 font-black">
                    {(
                      (editingUser.totalSpentAmount || 0) +
                      Math.abs(editExpense || 0)
                    ).toLocaleString()}{" "}
                    so'm
                  </span>
                </div>
              </div>

              <button
                onClick={handleUpdateUser}
                disabled={loading}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Save className="w-6 h-6" />
                )}
                SOZLAMALARNI SAQLASH
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingHistoryUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white max-w-2xl w-full rounded-[40px] p-10 shadow-3xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900">
                  To'lovlar tarixi
                </h3>
                <p className="text-sm font-bold text-gray-400 mt-1">
                  {viewingHistoryUser.displayName}
                </p>
              </div>
              <button
                onClick={() => setViewingHistoryUser(null)}
                className="p-3 hover:bg-gray-100 rounded-2xl"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-3xl p-6 overflow-x-auto max-h-[60vh]">
              {!viewingHistoryUser.billingHistory ||
              viewingHistoryUser.billingHistory.length === 0 ? (
                <p className="text-center font-bold text-gray-400 py-10">
                  Tarix mavjud emas
                </p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 text-xs font-black text-gray-400 uppercase tracking-widest">
                        Sana
                      </th>
                      <th className="py-3 text-xs font-black text-gray-400 uppercase tracking-widest">
                        Turi
                      </th>
                      <th className="py-3 text-xs font-black text-gray-400 uppercase tracking-widest text-right">
                        Summa
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...viewingHistoryUser.billingHistory]
                      .reverse()
                      .map((record: any, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-white transition-colors"
                        >
                          <td className="py-4 font-bold text-gray-600 text-sm">
                            {new Date(record.date).toLocaleString()}
                          </td>
                          <td className="py-4">
                            <span
                              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${record.type === "kirim" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                            >
                              {record.type}
                            </span>
                          </td>
                          <td
                            className={`py-4 font-black text-right ${record.type === "kirim" ? "text-green-600" : "text-red-600"}`}
                          >
                            {record.description || (
                              <>
                                {record.amount > 0 ? "+" : ""}
                                {record.amount.toLocaleString()} so'm
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
