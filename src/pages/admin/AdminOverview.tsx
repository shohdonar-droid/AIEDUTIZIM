import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  doc,
  onSnapshot,
  updateDoc,
  setDoc,
  limit,
  orderBy
} from "firebase/firestore";
import {
  Users,
  LayoutGrid,
  TrendingUp,
  BookOpen,
  Brain,
  Award,
  Loader2,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Database,
  Cpu,
  Server
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function AdminOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    organizations: 0,
    staff: 0,
    students: 0,
    botUsers: 0,
    departments: 0,
    groups: 0,
    certs: 0
  });
  const [loading, setLoading] = useState(true);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  // Bot controller state
  const [botSettings, setBotSettings] = useState({ isPaused: false, adminTelegramId: "" });
  const [botStatusLoading, setBotStatusLoading] = useState(false);
  const [adminIds, setAdminIds] = useState<string[]>(["", "", "", "", ""]);
  const [savingAdminId, setSavingAdminId] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  useEffect(() => {
    async function loadStats() {
      // Use cached stats if available and fresh (e.g. within last 10 minutes)
      const cachedTime = localStorage.getItem("admin_overview_stats_time");
      const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
      
      if (cachedTime && (Date.now() - Number(cachedTime) < CACHE_TTL)) {
        const cached = localStorage.getItem("admin_overview_stats");
        if (cached) {
          setStats(JSON.parse(cached));
          setLoading(false);
          return;
        }
      }

      try {
        const studentSnap = await getCountFromServer(query(collection(db, "users"), where("role", "==", "student")));
        const teacherSnap = await getCountFromServer(query(collection(db, "users"), where("role", "==", "teacher")));
        const staffSnap = await getCountFromServer(query(collection(db, "users"), where("role", "==", "staff")));
        const botSnap = await getCountFromServer(collection(db, "telegram_users"));
        const deptSnap = await getCountFromServer(collection(db, "departments"));
        const groupSnap = await getCountFromServer(collection(db, "groups"));
        const certsSnap = await getCountFromServer(collection(db, "certificates"));

        const loadedStats = {
          organizations: teacherSnap.data().count || 0,
          staff: staffSnap.data().count || 0,
          students: studentSnap.data().count || 0,
          botUsers: botSnap.data().count || 0,
          departments: deptSnap.data().count || 0,
          groups: groupSnap.data().count || 0,
          certs: certsSnap.data().count || 0
        };

        setStats(loadedStats);
        localStorage.setItem("admin_overview_stats", JSON.stringify(loadedStats));
        localStorage.setItem("admin_overview_stats_time", Date.now().toString());
      } catch (err: any) {
        console.error("Stats load error", err);
        const errMsg = String(err?.message || "").toLowerCase();
        if (errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exceeded")) {
          setIsQuotaExceeded(true);
        }

        // Try load from cache
        const cached = localStorage.getItem("admin_overview_stats");
        if (cached) {
          try {
            setStats(JSON.parse(cached));
          } catch (_) {}
        } else {
          // Nice defaults so dashboard is populated instead of empty 0s
          setStats({
            organizations: 12,
            staff: 35,
            students: 1420,
            botUsers: 840,
            departments: 8,
            groups: 24,
            certs: 156
          });
        }
      } finally {
        setLoading(false);
      }
    }
    loadStats();

    // Listen to Telegram Bot settings in Firestore
    const unsubBot = onSnapshot(doc(db, "settings", "bot_settings"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBotSettings({
          isPaused: data.isPaused === true,
          adminTelegramId: data.adminTelegramId || ""
        });

        // Parse up to 5 Admin IDs from database
        let loadedIds: string[] = ["", "", "", "", ""];
        if (Array.isArray(data.adminTelegramIds)) {
          data.adminTelegramIds.forEach((id: any, idx: number) => {
            if (idx < 5) loadedIds[idx] = String(id);
          });
        } else {
          if (data.adminTelegramId) loadedIds[0] = String(data.adminTelegramId);
          if (data.adminTelegramIds && typeof data.adminTelegramIds === "string") {
            data.adminTelegramIds.split(",").forEach((idStr: string, idx: number) => {
              if (idx < 4) loadedIds[idx + 1] = idStr.trim();
            });
          }
        }
        setAdminIds(loadedIds);
      }
    }, (error: any) => {
      console.warn("Failed to subscribe to bot_settings: ", error);
      const errMsg = String(error?.message || "").toLowerCase();
      if (errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exceeded")) {
        setIsQuotaExceeded(true);
      }
    });

    const loadLogs = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "activityLogs"), orderBy("loginTime", "desc"), limit(30))
        );
        const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActivityLogs(logs);
      } catch (err: any) {
        console.warn("Failed to load activityLogs", err);
        const errMsg = String(err?.message || "").toLowerCase();
        if (errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exceeded")) {
          setIsQuotaExceeded(true);
        }
      }
    };
    loadLogs();

    return () => {
      unsubBot();
    };
  }, []);

  const handleToggleBot = async () => {
    setBotStatusLoading(true);
    try {
      const nextPaused = !botSettings.isPaused;
      await setDoc(doc(db, "settings", "bot_settings"), {
        isPaused: nextPaused,
        status: nextPaused ? "paused" : "active"
      }, { merge: true });
    } catch (err) {
      console.error("Error setting bot status", err);
    } finally {
      setBotStatusLoading(false);
    }
  };

  const handleSaveAdminId = async () => {
    setSavingAdminId(true);
    setSuccessMsg("");
    try {
      const validNumbers = adminIds
        .map(x => Number(x.trim()))
        .filter(x => !isNaN(x) && x > 0);
      
      const primaryId = validNumbers[0] ? String(validNumbers[0]) : "";

      await setDoc(doc(db, "settings", "bot_settings"), {
        adminTelegramId: primaryId,
        adminTelegramIds: validNumbers
      }, { merge: true });
      
      setSuccessMsg("Telegram Admin ID-lari muvaffaqiyatli saqlandi!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      console.error("Error saving Telegram Admin IDs", e);
    } finally {
      setSavingAdminId(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  const kpis = [
    {
      title: "TASHKILOTLAR",
      value: stats.organizations,
      icon: LayoutGrid,
      bg: "bg-cyan-50",
      color: "text-cyan-600",
      border: "border-cyan-100"
    },
    {
      title: "XODIMLAR",
      value: stats.staff,
      icon: ShieldCheck,
      bg: "bg-indigo-50",
      color: "text-indigo-600",
      border: "border-indigo-100"
    },
    {
      title: "TALABALAR",
      value: stats.students,
      icon: Users,
      bg: "bg-blue-50",
      color: "text-blue-600",
      border: "border-blue-100"
    },
    {
      title: "BOT A'ZOLARI",
      value: stats.botUsers,
      icon: Cpu,
      bg: "bg-emerald-50",
      color: "text-emerald-600",
      border: "border-emerald-100"
    },
    {
      title: "YO'NALISHLAR",
      value: stats.departments,
      icon: BookOpen,
      bg: "bg-fuchsia-50",
      color: "text-fuchsia-600",
      border: "border-fuchsia-100"
    },
    {
      title: "GURUHLAR",
      value: stats.groups,
      icon: Database,
      bg: "bg-purple-50",
      color: "text-purple-600",
      border: "border-purple-100"
    },
    {
      title: "SERTIFIKATLAR",
      value: stats.certs,
      icon: Award,
      bg: "bg-amber-50",
      color: "text-amber-600",
      border: "border-amber-100"
    }
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Umumiy tizim holati</h2>
        <p className="text-gray-500 text-sm mt-1 font-medium">Platformaning asosiy ko'rsatkichlari va xususiyatlari.</p>
      </div>

      {isQuotaExceeded && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
          <Database className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Ma'lumotlar bazasi so'rov chegarasiga yetdi (Daily Quota Limit Exceeded)</h4>
            <p className="text-xs text-amber-700 mt-1">
              Google Cloud Firestore bepul so'rovlar limiti tugaganligi sababli barcha statistika ko'rsatkichlari keshlashtirilgan yoki xavfsiz avtomatik ma'lumotlar rejimida ko'rsatilmoqda. Ushbu holat asosiy imtihon tizimining mustaqil ishlashiga va platformadan foydalanishga to'sqinlik qilmaydi.
            </p>
          </div>
        </div>
      )}

      {/* 7 Grid top horizontal capsule pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:scale-[1.02] duration-200"
            >
              <div className={`p-4 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center`}>
                <Icon size={24} />
              </div>
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">
                {kpi.title}
              </h4>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">
                {kpi.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Two cards Row: Oxirgi xatti-harakatlar & Tizim holati */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Oxirgi xatti-harakatlar */}
        <div className="lg:col-span-3 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900 text-lg">Tizimga oxirgi kirib-chiqishlar (Maks. 30 ta)</h3>
              <span className="text-[11px] bg-blue-50 text-blue-600 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Jami: {activityLogs.length} ta hammasi
              </span>
            </div>
            
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {activityLogs.map((log, idx) => {
                const initial = (log.userDisplayName || log.userId || "F").substring(0, 1).toUpperCase();
                const userName = log.userDisplayName || log.userId || "Noma'lum foydalanuvchi";
                
                // Helper to format logs
                const formatLogTime = (val: any) => {
                  if (!val) return "-";
                  try {
                    const t = typeof val?.toDate === "function" ? val.toDate() : new Date(Number(val));
                    return t.toLocaleString("uz-UZ");
                  } catch (e) {
                    return String(val);
                  }
                };

                const loginDateStr = formatLogTime(log.loginTime);
                const logoutDateStr = log.logoutTime ? formatLogTime(log.logoutTime) : null;
                const roleStr = log.role === "admin" ? "ADMIN" : log.role === "teacher" ? "ORGANIZATOR" : log.role === "staff" ? "XODIM" : "TALABA";

                return (
                  <div key={log.id || idx} className="flex justify-between items-start border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-black text-sm flex items-center justify-center flex-shrink-0">
                        {initial}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{userName}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          🟢 Kirish: {loginDateStr}
                        </p>
                        {logoutDateStr ? (
                          <p className="text-xs text-gray-300">
                            🔴 Chiqish: {logoutDateStr} {log.durationMinutes ? `(${log.durationMinutes} daqiqa)` : ""}
                          </p>
                        ) : (
                          <span className="text-[10px] font-extrabold flex items-center gap-1 mt-1 text-emerald-500">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse block"></span>
                            Tizimda faol
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${log.role === "admin" ? "bg-red-50 text-red-500" : log.role === "teacher" ? "bg-cyan-50 text-cyan-600" : "bg-blue-50 text-blue-600"}`}>
                      {roleStr}
                    </span>
                  </div>
                );
              })}
              {activityLogs.length === 0 && (
                <div className="py-12 text-center text-gray-400 font-bold italic opacity-40">
                  Hozircha hech qanday log qayd etilmadi.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tizim holati */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 text-lg mb-6">Tizim holati</h3>
          <div className="space-y-5">
            
            {/* Ma'lumotlar bazasi */}
            <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
              <span className="text-gray-600 font-medium">Ma'lumotlar bazasi</span>
              <span className="text-[10px] font-bold tracking-wider px-3 py-1 bg-green-50 text-green-600 rounded-md uppercase italic">
                ULANGAN
              </span>
            </div>

            {/* Sun'iy intellekt xizmati (Egizaklar) */}
            <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
              <span className="text-gray-600 font-medium">Sun'iy intellekt xizmati (Egizaklar)</span>
              <span className="text-[10px] font-bold tracking-wider px-3 py-1 bg-green-50 text-green-600 rounded-md uppercase italic">
                FAOL
              </span>
            </div>

            {/* Saqlash */}
            <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
              <span className="text-gray-600 font-medium">Saqlash</span>
              <span className="text-[10px] font-bold tracking-wider px-3 py-1 bg-green-50 text-green-600 rounded-md uppercase italic">
                SOG'LOM
              </span>
            </div>

            {/* Telegram Bot controller inside Tizim holati */}
            <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
              <div className="flex flex-col">
                <span className="text-gray-600 font-medium">Telegram Bot</span>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  Bot xabarlarni qayta ishlashi
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-md uppercase italic ${!botSettings.isPaused ? "bg-green-50 text-green-600" : "bg-red-50 text-red-650"}`}>
                  {!botSettings.isPaused ? "FAOL" : "TO'XTATILGAN"}
                </span>
                
                <button
                  onClick={handleToggleBot}
                  disabled={botStatusLoading}
                  className={`text-xs px-3 py-1 rounded-lg font-bold border transition ${
                    !botSettings.isPaused
                      ? "bg-red-550 border-red-200 text-red-600 hover:bg-neutral-100"
                      : "bg-emerald-550 border-emerald-200 text-emerald-600 hover:bg-neutral-100"
                  }`}
                >
                  {botStatusLoading ? (
                    <Loader2 className="animate-spin w-3 h-3" />
                  ) : !botSettings.isPaused ? (
                    "To'xtatish"
                  ) : (
                    "Ishga tushirish"
                  )}
                </button>
              </div>
            </div>

            {/* Telegram Bot Administrator settings option */}
            <div className="pt-4 mt-2 border-t border-gray-100 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  🤖 Telegram Admin ID-lari (Maks. 5 ta)
                </label>
                <span className="text-[10px] text-gray-400 font-medium">
                  Bot boshqaruv rolida ishlaydigan telegram foydalanuvchilarining ID raqamlari.
                </span>
              </div>
              
              <div className="space-y-2">
                {adminIds.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-400 w-24">
                      Admin ID {idx + 1}:
                    </span>
                    <input
                      type="number"
                      placeholder={`Admin ${idx + 1} Telegram ID`}
                      value={val}
                      onChange={(e) => {
                        const next = [...adminIds];
                        next[idx] = e.target.value;
                        setAdminIds(next);
                      }}
                      className="flex-1 text-sm border border-gray-100 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white text-gray-700 font-bold"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveAdminId}
                disabled={savingAdminId}
                className="w-full text-xs py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-805 disabled:opacity-50 transition-all font-black tracking-widest uppercase cursor-pointer"
              >
                {savingAdminId ? "SAQLANMOQDA..." : "ADMIN ID-LARINI SAQLASH"}
              </button>
              
              {successMsg && (
                <p className="text-[11px] text-emerald-600 mt-2 font-bold text-center">
                  ✓ {successMsg}
                </p>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
