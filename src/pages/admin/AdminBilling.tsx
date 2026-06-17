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
  getDoc,
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
  Eye,
  Settings,
} from "lucide-react";
import * as XLSX from "xlsx";

interface TariffConfig {
  price?: number;
  students?: number;
  staff?: number;
  hasAI?: boolean;
  hasBot?: boolean;
  maxCourses?: number;
  maxTests?: number;
  maxExams?: number;
  maxSubjects?: number;
  maxQuizizz?: number;
  
  // CORPORATE pricing per unit
  basePrice?: number;
  perStudent?: number;
  perStaff?: number;
  aiPrice?: number;
  botPrice?: number;
  perCourse?: number;
  perTest?: number;
  perExam?: number;
  perSubject?: number;
  perQuizizz?: number;

  // Independent Teacher service unit prices
  limit_departments_price?: number;
  limit_groups_price?: number;
  limit_students_price?: number;
  limit_subjects_price?: number;
  limit_tests_price?: number;
  limit_quizizz_price?: number;
  limit_exams_price?: number;
  limit_certificates_price?: number;
}

interface AllTariffsConfig {
  start: TariffConfig;
  standard: TariffConfig;
  professional: TariffConfig;
  corporate: TariffConfig;
  extra: TariffConfig;
}

const defaultTariffs: AllTariffsConfig = {
  start: {
    price: 300000,
    students: 50,
    staff: 2,
    hasAI: false,
    hasBot: false,
    maxCourses: 3,
    maxTests: 10,
    maxExams: 2,
    maxSubjects: 5,
    maxQuizizz: 4,
    limit_departments_price: 15000,
    limit_groups_price: 20000,
    limit_students_price: 5000,
    limit_subjects_price: 15000,
    limit_tests_price: 3000,
    limit_quizizz_price: 4000,
    limit_exams_price: 20000,
    limit_certificates_price: 10000
  },
  standard: {
    price: 700000,
    students: 200,
    staff: 5,
    hasAI: false,
    hasBot: true,
    maxCourses: 10,
    maxTests: 50,
    maxExams: 10,
    maxSubjects: 20,
    maxQuizizz: 15,
    limit_departments_price: 12000,
    limit_groups_price: 15000,
    limit_students_price: 4000,
    limit_subjects_price: 12000,
    limit_tests_price: 2500,
    limit_quizizz_price: 3000,
    limit_exams_price: 15000,
    limit_certificates_price: 8000
  },
  professional: {
    price: 1500000,
    students: 1000,
    staff: 20,
    hasAI: true,
    hasBot: true,
    maxCourses: 50,
    maxTests: 300,
    maxExams: 50,
    maxSubjects: 100,
    maxQuizizz: 100,
    limit_departments_price: 10000,
    limit_groups_price: 12000,
    limit_students_price: 3000,
    limit_subjects_price: 10000,
    limit_tests_price: 2000,
    limit_quizizz_price: 2500,
    limit_exams_price: 12000,
    limit_certificates_price: 6000
  },
  corporate: {
    basePrice: 500000,
    perStudent: 1000,
    perStaff: 10000,
    aiPrice: 300000,
    botPrice: 200000,
    maxCourses: 999,
    maxTests: 9999,
    maxExams: 999,
    maxSubjects: 999,
    maxQuizizz: 999,
    perCourse: 40000,
    perTest: 2000,
    perExam: 15000,
    perSubject: 5000,
    perQuizizz: 5000,
    limit_departments_price: 8000,
    limit_groups_price: 10000,
    limit_students_price: 2000,
    limit_subjects_price: 8000,
    limit_tests_price: 1500,
    limit_quizizz_price: 2000,
    limit_exams_price: 10000,
    limit_certificates_price: 5000
  },
  extra: {
    perStudent: 1500,
    perStaff: 15000,
    aiPrice: 350000,
    botPrice: 250000,
    perCourse: 50000,
    perTest: 3000,
    perExam: 20000,
    perSubject: 6000,
    perQuizizz: 6000,
    limit_departments_price: 15000,
    limit_groups_price: 20000,
    limit_students_price: 5000,
    limit_subjects_price: 15000,
    limit_tests_price: 4000,
    limit_quizizz_price: 4500,
    limit_exams_price: 20000,
    limit_certificates_price: 10000
  }
};

export default function AdminBilling() {
  const [organizations, setOrganizations] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"org" | "student" | "staff">(
    "org",
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Tariff configuration state
  const [tariffsConfig, setTariffsConfig] = useState<AllTariffsConfig>(defaultTariffs);
  const [editingTariffKey, setEditingTariffKey] = useState<keyof AllTariffsConfig | null>(null);
  const [editingTariffForm, setEditingTariffForm] = useState<TariffConfig | null>(null);
  const [savingTariff, setSavingTariff] = useState(false);

  useEffect(() => {
    async function loadTariffsConfig() {
      try {
        const snap = await getDoc(doc(db, "settings", "tariffs"));
        if (snap.exists()) {
          setTariffsConfig({ ...defaultTariffs, ...snap.data() } as AllTariffsConfig);
        }
      } catch (err) {
        console.warn("Failed to load tariffs config from Firestore, using defaults", err);
      }
    }
    loadTariffsConfig();
  }, []);
  
  // Custom Calculators
  const [corpCalc, setCorpCalc] = useState({
    students: 1000,
    staff: 20,
    ai: true,
    bot: true,
    courses: 50,
    tests: 300,
    exams: 50,
    subjects: 100,
    quizizz: 100,
  });
  const [extraCalc, setExtraCalc] = useState({
    students: 0,
    staff: 0,
    ai: false,
    bot: false,
    courses: 0,
    tests: 0,
    exams: 0,
    subjects: 0,
    quizizz: 0,
  });

  const calcCorpPrice = () => {
    const base = tariffsConfig.corporate.basePrice ?? 500000;
    const stdPrice = corpCalc.students * (tariffsConfig.corporate.perStudent ?? 1000);
    const staffPrice = corpCalc.staff * (tariffsConfig.corporate.perStaff ?? 10000);
    const aiPrice = corpCalc.ai ? (tariffsConfig.corporate.aiPrice ?? 300000) : 0;
    const botPrice = corpCalc.bot ? (tariffsConfig.corporate.botPrice ?? 200000) : 0;
    
    const coursesPrice = (corpCalc.courses ?? 0) * (tariffsConfig.corporate.perCourse ?? 40000);
    const testsPrice = (corpCalc.tests ?? 0) * (tariffsConfig.corporate.perTest ?? 2000);
    const examsPrice = (corpCalc.exams ?? 0) * (tariffsConfig.corporate.perExam ?? 15000);
    const subjectsPrice = (corpCalc.subjects ?? 0) * (tariffsConfig.corporate.perSubject ?? 5000);
    const quizizzPrice = (corpCalc.quizizz ?? 0) * (tariffsConfig.corporate.perQuizizz ?? 5000);
    
    return base + stdPrice + staffPrice + aiPrice + botPrice + coursesPrice + testsPrice + examsPrice + subjectsPrice + quizizzPrice;
  };

  const calcExtraPrice = () => {
    const stdPrice = extraCalc.students * (tariffsConfig.extra.perStudent ?? 1500);
    const staffPrice = extraCalc.staff * (tariffsConfig.extra.perStaff ?? 15000);
    const aiPrice = extraCalc.ai ? (tariffsConfig.extra.aiPrice ?? 350000) : 0;
    const botPrice = extraCalc.bot ? (tariffsConfig.extra.botPrice ?? 250000) : 0;
    
    const coursesPrice = (extraCalc.courses ?? 0) * (tariffsConfig.extra.perCourse ?? 50000);
    const testsPrice = (extraCalc.tests ?? 0) * (tariffsConfig.extra.perTest ?? 3000);
    const examsPrice = (extraCalc.exams ?? 0) * (tariffsConfig.extra.perExam ?? 20000);
    const subjectsPrice = (extraCalc.subjects ?? 0) * (tariffsConfig.extra.perSubject ?? 6000);
    const quizizzPrice = (extraCalc.quizizz ?? 0) * (tariffsConfig.extra.perQuizizz ?? 6000);
    
    return stdPrice + staffPrice + aiPrice + botPrice + coursesPrice + testsPrice + examsPrice + subjectsPrice + quizizzPrice;
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

  const handleSaveTariff = async () => {
    if (!editingTariffKey || !editingTariffForm) return;
    setSavingTariff(true);
    try {
      const updatedConfigs = {
        ...tariffsConfig,
        [editingTariffKey]: editingTariffForm
      };
      await setDoc(doc(db, "settings", "tariffs"), updatedConfigs);
      setTariffsConfig(updatedConfigs);
      setEditingTariffKey(null);
      setEditingTariffForm(null);
    } catch (e) {
      console.error("Failed to save tariff", e);
    } finally {
      setSavingTariff(false);
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
            <div className="p-8 rounded-[40px] border-2 border-gray-50 hover:border-orange-100 transition-all bg-gray-50/30 group relative flex flex-col justify-between shadow-sm">
               <div className="flex justify-between items-start mb-6">
                 <span className="text-4xl">🥉</span>
                 <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTariffKey("start");
                        setEditingTariffForm(tariffsConfig.start);
                      }}
                      className="p-2 bg-white text-gray-400 hover:text-orange-500 rounded-xl border border-gray-100 transition-all"
                      title="Tarifni tahrirlash"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-1.5 bg-white rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 group-hover:border-orange-200">Start</span>
                 </div>
               </div>
               <div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">START</h3>
                  <div className="text-3xl font-black text-orange-600 mb-6 font-mono">{(tariffsConfig.start.price ?? 300000).toLocaleString()} <small className="text-sm">sum/oy</small></div>
                  <ul className="space-y-2 mb-8">
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-orange-500" /> {tariffsConfig.start.students ?? 50} ta-talabalar
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-orange-500" /> {tariffsConfig.start.staff ?? 2} ta-xodimlar
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-orange-500" /> {tariffsConfig.start.maxCourses ?? 3} ta kurs
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-orange-500" /> {tariffsConfig.start.maxTests ?? 15} ta test (mavzu & matn)
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-orange-500" /> {tariffsConfig.start.maxExams ?? 2} ta imtihon
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-orange-500" /> {tariffsConfig.start.maxSubjects ?? 5} ta mavzu
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-orange-500" /> {tariffsConfig.start.maxQuizizz ?? 4} ta quizizz
                     </li>
                     <li className={`text-xs font-bold flex items-center gap-2 ${tariffsConfig.start.hasAI ? "text-gray-600" : "text-gray-400 line-through"}`}>
                        <Check className={`w-3.5 h-3.5 ${tariffsConfig.start.hasAI ? "text-orange-500" : "text-gray-200"}`} /> AI imkoniyatlari
                     </li>
                     <li className={`text-xs font-bold flex items-center gap-2 ${tariffsConfig.start.hasBot ? "text-gray-600" : "text-gray-400 line-through"}`}>
                        <Check className={`w-3.5 h-3.5 ${tariffsConfig.start.hasBot ? "text-orange-500" : "text-gray-200"}`} /> Telegram Bot integratsiyasi
                     </li>
                  </ul>
               </div>
               <button className="w-full py-4 bg-white border-2 border-orange-100 text-orange-600 rounded-2xl font-black hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all uppercase text-sm tracking-widest mt-auto">Tanlash</button>
            </div>
            
            {/* STANDARD */}
            <div className="p-8 rounded-[40px] border-2 border-indigo-100 bg-white shadow-xl shadow-indigo-50 relative group flex flex-col justify-between">
               <div className="absolute -top-4 right-10 bg-indigo-600 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-200">Ommabop</div>
               <div className="flex justify-between items-start mb-6">
                 <span className="text-4xl">🥈</span>
                 <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTariffKey("standard");
                        setEditingTariffForm(tariffsConfig.standard);
                      }}
                      className="p-2 bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded-xl border border-indigo-100 transition-all"
                      title="Tarifni tahrirlash"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-1.5 bg-indigo-50 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-100 group-hover:border-indigo-200">Standard</span>
                 </div>
               </div>
               <div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">STANDARD</h3>
                  <div className="text-3xl font-black text-indigo-600 mb-6 font-mono">{(tariffsConfig.standard.price ?? 700000).toLocaleString()} <small className="text-sm">sum/oy</small></div>
                  <ul className="space-y-2 mb-8">
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-indigo-500" /> {tariffsConfig.standard.students ?? 200} ta-talabalar
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-indigo-500" /> {tariffsConfig.standard.staff ?? 5} ta-xodimlar
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-indigo-500" /> {tariffsConfig.standard.maxCourses ?? 10} ta kurs
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-indigo-500" /> {tariffsConfig.standard.maxTests ?? 50} ta test (mavzu & matn)
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-indigo-500" /> {tariffsConfig.standard.maxExams ?? 10} ta imtihon
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-indigo-500" /> {tariffsConfig.standard.maxSubjects ?? 20} ta mavzu
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-indigo-500" /> {tariffsConfig.standard.maxQuizizz ?? 15} ta quizizz
                     </li>
                     <li className={`text-xs font-bold flex items-center gap-2 ${tariffsConfig.standard.hasAI ? "text-gray-600" : "text-gray-400 line-through"}`}>
                        <Check className={`w-3.5 h-3.5 ${tariffsConfig.standard.hasAI ? "text-indigo-500" : "text-gray-200"}`} /> AI imkoniyatlari
                     </li>
                     <li className={`text-xs font-bold flex items-center gap-2 ${tariffsConfig.standard.hasBot ? "text-gray-600" : "text-gray-400 line-through"}`}>
                        <Check className={`w-3.5 h-3.5 ${tariffsConfig.standard.hasBot ? "text-indigo-500" : "text-gray-200"}`} /> Telegram Bot integratsiyasi
                     </li>
                  </ul>
               </div>
               <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-sm tracking-widest mt-auto">Tanlash</button>
            </div>
            
            {/* PROFESSIONAL */}
            <div className="p-8 rounded-[40px] border-2 border-gray-50 hover:border-amber-100 transition-all bg-gray-50/30 group relative flex flex-col justify-between">
               <div className="flex justify-between items-start mb-6">
                 <span className="text-4xl">🥇</span>
                 <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTariffKey("professional");
                        setEditingTariffForm(tariffsConfig.professional);
                      }}
                      className="p-2 bg-white text-gray-400 hover:text-amber-500 rounded-xl border border-gray-100 transition-all"
                      title="Tarifni tahrirlash"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-1.5 bg-white rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 group-hover:border-amber-200">Pro</span>
                 </div>
               </div>
               <div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">PROFESSIONAL</h3>
                  <div className="text-3xl font-black text-amber-600 mb-6 font-mono">{(tariffsConfig.professional.price ?? 1500000).toLocaleString()} <small className="text-sm">sum/oy</small></div>
                  <ul className="space-y-2 mb-8">
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-500" /> {tariffsConfig.professional.students ?? 1000} ta-talabalar
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-500" /> {tariffsConfig.professional.staff ?? 20} ta-xodimlar
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-500" /> {tariffsConfig.professional.maxCourses ?? 50} ta kurs
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-500" /> {tariffsConfig.professional.maxTests ?? 300} ta test (mavzu & matn)
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-500" /> {tariffsConfig.professional.maxExams ?? 50} ta imtihon
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-500" /> {tariffsConfig.professional.maxSubjects ?? 100} ta mavzu
                     </li>
                     <li className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-500" /> {tariffsConfig.professional.maxQuizizz ?? 100} ta quizizz
                     </li>
                     <li className={`text-xs font-bold flex items-center gap-2 ${tariffsConfig.professional.hasAI ? "text-gray-600" : "text-gray-400 line-through"}`}>
                        <Check className={`w-3.5 h-3.5 ${tariffsConfig.professional.hasAI ? "text-amber-500" : "text-gray-200"}`} /> AI orqali test generatori
                     </li>
                     <li className={`text-xs font-bold flex items-center gap-2 ${tariffsConfig.professional.hasBot ? "text-gray-600" : "text-gray-400 line-through"}`}>
                        <Check className={`w-3.5 h-3.5 ${tariffsConfig.professional.hasBot ? "text-amber-500" : "text-gray-200"}`} /> Full Telegram Bot Features
                     </li>
                  </ul>
               </div>
               <button className="w-full py-4 bg-white border-2 border-amber-100 text-amber-600 rounded-2xl font-black hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all uppercase text-sm tracking-widest mt-auto">Tanlash</button>
            </div>
         </div>

         {/* Dynamic Plans Row */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* CORPORATE CALCULATOR */}
            <div className="bg-white rounded-3xl p-8 text-slate-800 shadow-sm relative overflow-hidden group border border-slate-200">
               <button
                 onClick={() => {
                   setEditingTariffKey("corporate");
                   setEditingTariffForm(tariffsConfig.corporate);
                 }}
                 className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition-all border border-slate-100 z-20"
                 title="Korporativ tarif narxlarini sozlash"
               >
                 <Settings className="w-4 h-4" />
               </button>
               <div className="relative z-10">
                  <div className="flex items-center gap-3.5 mb-6">
                     <span className="text-2xl">👑</span>
                     <div>
                        <h3 className="text-xl font-bold text-slate-900">CORPORATE</h3>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Kelishuv va hisob-kitob asosida</p>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Talabalar soni</label>
                        <input 
                          type="number" 
                          value={corpCalc.students}
                          onChange={(e) => setCorpCalc({...corpCalc, students: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Xodimlar soni</label>
                        <input 
                          type="number" 
                          value={corpCalc.staff}
                          onChange={(e) => setCorpCalc({...corpCalc, staff: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Yaratiladigan Kurslar soni</label>
                        <input 
                          type="number" 
                          value={corpCalc.courses}
                          onChange={(e) => setCorpCalc({...corpCalc, courses: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Testlar soni (mavzu & matn)</label>
                        <input 
                          type="number" 
                          value={corpCalc.tests}
                          onChange={(e) => setCorpCalc({...corpCalc, tests: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Imtihonlar soni</label>
                        <input 
                          type="number" 
                          value={corpCalc.exams}
                          onChange={(e) => setCorpCalc({...corpCalc, exams: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Mavzular soni</label>
                        <input 
                          type="number" 
                          value={corpCalc.subjects}
                          onChange={(e) => setCorpCalc({...corpCalc, subjects: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>

                     <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Quizizzlar soni</label>
                        <input 
                          type="number" 
                          value={corpCalc.quizizz}
                          onChange={(e) => setCorpCalc({...corpCalc, quizizz: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>
                     <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100/85 hover:bg-slate-100/50 transition-colors">
                        <input 
                          type="checkbox" 
                          id="corp_ai"
                          checked={corpCalc.ai}
                          onChange={(e) => setCorpCalc({...corpCalc, ai: e.target.checked})}
                          className="w-5 h-5 rounded-md accent-indigo-600 cursor-pointer" 
                        />
                        <label htmlFor="corp_ai" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">AI Test Generator</label>
                     </div>
                     <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100/85 hover:bg-slate-100/50 transition-colors">
                        <input 
                          type="checkbox" 
                          id="corp_bot"
                          checked={corpCalc.bot}
                          onChange={(e) => setCorpCalc({...corpCalc, bot: e.target.checked})}
                          className="w-5 h-5 rounded-md accent-indigo-600 cursor-pointer" 
                        />
                        <label htmlFor="corp_bot" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">Advanced TG Bot</label>
                     </div>
                  </div>
  
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Oylik to'lov summasi:</p>
                        <div className="text-2xl font-mono font-black text-indigo-600 mt-0.5">{calcCorpPrice().toLocaleString()} <span className="text-xs text-slate-400">sum</span></div>
                     </div>
                     <button className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all uppercase text-xs tracking-wider shadow-sm shadow-indigo-100">Shartnoma Tuzish</button>
                  </div>
               </div>
            </div>
  
            {/* EXTRA LIMITS */}
            <div className="bg-white rounded-3xl p-8 text-slate-800 shadow-sm relative overflow-hidden group border border-slate-200">
               <button
                 onClick={() => {
                   setEditingTariffKey("extra");
                   setEditingTariffForm(tariffsConfig.extra);
                 }}
                 className="absolute top-6 right-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition-all border border-slate-100 z-20"
                 title="Qo'shimcha tarif narxlarini sozlash"
               >
                 <Settings className="w-4 h-4" />
               </button>
               <div className="relative z-10">
                  <div className="flex items-center gap-3.5 mb-6">
                     <span className="text-2xl">➕</span>
                     <div>
                        <h3 className="text-xl font-bold text-slate-900">EXTRA LIMITS</h3>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Bir martalik qo'shimcha imkoniyatlar</p>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Qo'shish (Talaba)</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={extraCalc.students || ""}
                          onChange={(e) => setExtraCalc({...extraCalc, students: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Qo'shish (Xodim)</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={extraCalc.staff || ""}
                          onChange={(e) => setExtraCalc({...extraCalc, staff: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Kurs qo'shish</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={extraCalc.courses || ""}
                          onChange={(e) => setExtraCalc({...extraCalc, courses: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Test qo'shish (mavzu & matn)</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={extraCalc.tests || ""}
                          onChange={(e) => setExtraCalc({...extraCalc, tests: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Imtihon qo'shish</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={extraCalc.exams || ""}
                          onChange={(e) => setExtraCalc({...extraCalc, exams: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Mavzu qo'shish</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={extraCalc.subjects || ""}
                          onChange={(e) => setExtraCalc({...extraCalc, subjects: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>

                     <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Quizizz qo'shish</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          value={extraCalc.quizizz || ""}
                          onChange={(e) => setExtraCalc({...extraCalc, quizizz: Number(e.target.value)})}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none font-bold text-sm text-slate-800 transition-all"
                        />
                     </div>
                     <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100/85 hover:bg-slate-100/50 transition-colors">
                        <input 
                          type="checkbox" 
                          id="extra_ai"
                          checked={extraCalc.ai}
                          onChange={(e) => setExtraCalc({...extraCalc, ai: e.target.checked})}
                          className="w-5 h-5 rounded-md accent-emerald-600 cursor-pointer" 
                        />
                        <label htmlFor="extra_ai" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">Darsliklar/AI (1 oy)</label>
                     </div>
                     <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100/85 hover:bg-slate-100/50 transition-colors">
                        <input 
                          type="checkbox" 
                          id="extra_bot"
                          checked={extraCalc.bot}
                          onChange={(e) => setExtraCalc({...extraCalc, bot: e.target.checked})}
                          className="w-5 h-5 rounded-md accent-emerald-600 cursor-pointer" 
                        />
                        <label htmlFor="extra_bot" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">Xabar yuborish/Bot</label>
                     </div>
                  </div>
  
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qo'shimcha to'lov summasi:</p>
                        <div className="text-2xl font-mono font-black text-emerald-600 mt-0.5">{calcExtraPrice().toLocaleString()} <span className="text-xs text-slate-400">sum</span></div>
                     </div>
                     <button className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all uppercase text-xs tracking-wider shadow-sm shadow-emerald-100">Sotib olish</button>
                  </div>
                  <p className="mt-3 text-[9px] font-bold text-slate-400 leading-relaxed italic text-center">
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

      {editingTariffKey && editingTariffForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-350">
          <div className="bg-white max-w-lg w-full rounded-[40px] p-10 shadow-3xl animate-in zoom-in-95 duration-350 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase">
                  {editingTariffKey} sozlamalari
                </h3>
                <p className="text-xs font-bold text-gray-400 mt-1">
                  Tarif limitlari va narxlarini sozlash
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingTariffKey(null);
                  setEditingTariffForm(null);
                }}
                className="p-3 hover:bg-gray-100 rounded-2xl"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* For standard tiers */}
              {(editingTariffKey === "start" || editingTariffKey === "standard" || editingTariffKey === "professional") && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                      Oylik Summa (so'm)
                    </label>
                    <input
                      type="number"
                      value={editingTariffForm.price ?? 0}
                      onChange={(e) => setEditingTariffForm({ ...editingTariffForm, price: Number(e.target.value) })}
                      className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        m ta Talaba
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.students ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, students: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        n ta Xodim
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.staff ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, staff: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 py-2 pl-1">
                    <input
                      type="checkbox"
                      id="edit_hasAI"
                      checked={editingTariffForm.hasAI ?? false}
                      onChange={(e) => setEditingTariffForm({ ...editingTariffForm, hasAI: e.target.checked })}
                      className="w-5 h-5 rounded cursor-pointer accent-indigo-600"
                    />
                    <label htmlFor="edit_hasAI" className="text-sm font-bold text-gray-700 cursor-pointer">
                      AI imkoniyatlari kiritilgan
                    </label>
                  </div>
                  <div className="flex items-center gap-4 py-2 pl-1">
                    <input
                      type="checkbox"
                      id="edit_hasBot"
                      checked={editingTariffForm.hasBot ?? false}
                      onChange={(e) => setEditingTariffForm({ ...editingTariffForm, hasBot: e.target.checked })}
                      className="w-5 h-5 rounded cursor-pointer accent-indigo-600"
                    />
                    <label htmlFor="edit_hasBot" className="text-sm font-bold text-gray-700 cursor-pointer">
                      Telegram Bot integratsiyasi kiritilgan
                    </label>
                  </div>

                  <div className="border-t border-gray-100 pt-6 space-y-4">
                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest pl-1">
                      Imkoniyatlar limiti cheklovlari
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 leading-tight block">
                          Nechta kurs yarata bilishligi
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.maxCourses ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, maxCourses: Number(e.target.value) })}
                          className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 leading-tight block">
                          Nechta test (mavzu & matn)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.maxTests ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, maxTests: Number(e.target.value) })}
                          className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 leading-tight block">
                          Nechta imtihon yarata olishi
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.maxExams ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, maxExams: Number(e.target.value) })}
                          className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 leading-tight block">
                          Nechta mavzu yarata olishi
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.maxSubjects ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, maxSubjects: Number(e.target.value) })}
                          className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 block">
                        Nechta quizizz yarata olishligi
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.maxQuizizz ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, maxQuizizz: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* For Corporate tier */}
              {editingTariffKey === "corporate" && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                      Asosiy oylik to'lov (Base Price) - so'm
                    </label>
                    <input
                      type="number"
                      value={editingTariffForm.basePrice ?? 0}
                      onChange={(e) => setEditingTariffForm({ ...editingTariffForm, basePrice: Number(e.target.value) })}
                      className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        1 ta Talaba narxi/oy
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perStudent ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perStudent: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        1 ta Xodim narxi/oy
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perStaff ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perStaff: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        AI modulu narxi/oy
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.aiPrice ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, aiPrice: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        Telegram Bot narxi/oy
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.botPrice ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, botPrice: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        1 ta Kurs narxi/oy (Corporate)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perCourse ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perCourse: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        1 ta Test narxi/oy (Corporate)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perTest ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perTest: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        1 ta Imtihon narxi/oy (Corporate)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perExam ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perExam: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                        1 ta Mavzu narxi/oy (Corporate)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perSubject ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perSubject: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                      1 ta Quizizz narxi/oy (Corporate)
                    </label>
                    <input
                      type="number"
                      value={editingTariffForm.perQuizizz ?? 0}
                      onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perQuizizz: Number(e.target.value) })}
                      className="w-full px-5 py-4 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold shadow-sm"
                    />
                  </div>
                </>
              )}

              {/* For Extra Limits */}
              {editingTariffKey === "extra" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shimcha 1 ta Talaba
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perStudent ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perStudent: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shimcha 1 ta Xodim
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perStaff ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perStaff: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shimcha AI (1 oy)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.aiPrice ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, aiPrice: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shimcha TG Bot/Xabarlar
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.botPrice ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, botPrice: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shish: 1 ta Kurs narxi (Extra)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perCourse ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perCourse: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shish: 1 ta Test narxi (Extra)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perTest ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perTest: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shish: 1 ta Imtihon narxi (Extra)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perExam ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perExam: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                        Qo'shish: 1 ta Mavzu narxi (Extra)
                      </label>
                      <input
                        type="number"
                        value={editingTariffForm.perSubject ?? 0}
                        onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perSubject: Number(e.target.value) })}
                        className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pl-1">
                      Qo'shish: 1 ta Quizizz narxi (Extra)
                    </label>
                    <input
                      type="number"
                      value={editingTariffForm.perQuizizz ?? 0}
                      onChange={(e) => setEditingTariffForm({ ...editingTariffForm, perQuizizz: Number(e.target.value) })}
                      className="w-full px-5 py-4 bg-emerald-50/20 rounded-2xl border-2 border-emerald-50 focus:border-emerald-600 outline-none font-bold shadow-sm"
                    />
                  </div>
                </>
              )}

                  <div className="border-t border-gray-150 pt-6 mt-6 space-y-4">
                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest pl-1">
                      Mustaqil o'qituvchi 1 birlik limit narxlari (so'm)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Yo'nalish (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_departments_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_departments_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Guruhlar (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_groups_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_groups_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Talabalar (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_students_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_students_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Mavzular (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_subjects_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_subjects_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Testlar (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_tests_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_tests_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Quizizz (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_quizizz_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_quizizz_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Imtihonlar (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_exams_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_exams_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 block">
                          Sertifikatlar (+1 ta)
                        </label>
                        <input
                          type="number"
                          value={editingTariffForm.limit_certificates_price ?? 0}
                          onChange={(e) => setEditingTariffForm({ ...editingTariffForm, limit_certificates_price: Number(e.target.value) })}
                          className="w-full px-5 py-3.5 bg-indigo-50/20 rounded-2xl border-2 border-indigo-50 focus:border-indigo-600 outline-none font-bold text-sm"
                        />
                      </div>
                    </div>
                  </div>

              <button
                onClick={handleSaveTariff}
                disabled={savingTariff}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
              >
                {savingTariff ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Tarif Ma'lumotlarini Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
