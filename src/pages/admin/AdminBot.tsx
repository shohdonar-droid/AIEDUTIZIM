import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc
} from "firebase/firestore";
import {
  Trash2,
  Users,
  Settings,
  Shield,
  Loader2,
  Lock,
  Unlock,
  AlertCircle,
  Plus
} from "lucide-react";

export default function AdminBot() {
  const [botUsers, setBotUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [botSettings, setBotSettings] = useState({ isPaused: false, adminTelegramId: "" });
  const [botStatusLoading, setBotStatusLoading] = useState(false);
  const [newAdminId, setNewAdminId] = useState("");
  const [assistants, setAssistants] = useState<number[]>([]);
  const [newAssistantId, setNewAssistantId] = useState("");
  const [savingAdminId, setSavingAdminId] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchUsers();

    // Listen to Telegram Bot settings in Firestore
    const unsubBot = onSnapshot(doc(db, "settings", "bot_settings"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBotSettings({
          isPaused: data.isPaused === true,
          adminTelegramId: data.adminTelegramId || ""
        });
        setNewAdminId(data.adminTelegramId || "");

        let assistantList: any[] = [];
        if (Array.isArray(data.adminTelegramIds)) {
          assistantList = data.adminTelegramIds.filter(x => Number(x) !== Number(data.adminTelegramId));
        } else if (typeof data.adminTelegramIds === "string") {
          assistantList = data.adminTelegramIds.split(",").map(x => x.trim()).filter(x => Number(x) !== Number(data.adminTelegramId));
        }
        const parsedAssistants = assistantList.map(x => Number(x)).filter(x => !isNaN(x) && x > 0);
        setAssistants(parsedAssistants);
      }
    }, (error) => {
      console.warn("Failed to subscribe to bot_settings: ", error);
    });

    return () => unsubBot();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const querySnapshot = await getDocs(collection(db, "telegram_users"));
      setBotUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm("Haqiqatan ham ushbu bot a'zosini o'chirmoqchimisiz?")) {
      await deleteDoc(doc(db, "telegram_users", id));
      fetchUsers();
    }
  };

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

  const handleAddAssistant = () => {
    const cleanId = newAssistantId.trim();
    if (!cleanId) return;
    const num = Number(cleanId);
    if (isNaN(num) || num <= 0) {
      alert("Iltimos, faqat musbat raqam shaklidagi Telegram ID kiriting!");
      return;
    }
    if (num === Number(newAdminId.trim())) {
      alert("Ushbu ID asosiy administratorga tegishli. Uni yordamchilar ro'yxatiga qo'shish shart emas.");
      return;
    }
    if (assistants.includes(num)) {
      alert("Ushbu yordamchi administrator allaqachon ro'yxatda mavjud.");
      return;
    }
    setAssistants([...assistants, num]);
    setNewAssistantId("");
  };

  const handleRemoveAssistant = (idToRemove: number) => {
    setAssistants(assistants.filter(id => id !== idToRemove));
  };

  const handleSaveAdminId = async () => {
    setSavingAdminId(true);
    setSuccessMsg("");
    try {
      const primaryId = Number(newAdminId.trim());
      if (isNaN(primaryId) || primaryId <= 0) {
        alert("Iltimos, asosiy administrator Telegram ID-sini kiriting!");
        setSavingAdminId(false);
        return;
      }
      
      const allAdminIds = [primaryId, ...assistants.filter(x => x !== primaryId)];

      await setDoc(doc(db, "settings", "bot_settings"), {
        adminTelegramId: String(primaryId),
        adminTelegramIds: allAdminIds
      }, { merge: true });
      
      setSuccessMsg("Telegram Admin ID-lari muvaffaqiyatli saqlandi!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      console.error("Error saving Telegram Admin ID", e);
    } finally {
      setSavingAdminId(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Settings className="text-gray-400" /> Telegram Bot Sozlamalari
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Bot faoliyatini boshqarish, admin belgilash va a'zolar bazasini nazorat qilish paneli.
        </p>
      </div>

      {/* Control Card Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Status Card */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            Status va Nazorat
          </h3>
          <p className="text-gray-500 text-xs mb-6Leading-relaxed">
            Telegram bot ishini bir zumda to'xtatib turishingiz mumkin. Bot to'xtatilgan vaqtda foydalanuvchilar buyruqlariga dynamic tarzda javob bermaydi va API limiti tejaladi.
          </p>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-800">
                Hozirgi holat:
              </span>
              <span className={`text-xs mt-1 font-semibold ${!botSettings.isPaused ? "text-emerald-500" : "text-red-500"}`}>
                ● {!botSettings.isPaused ? "Bot Faol Rejimda" : "Bot To'xtatilgan Rejimda"}
              </span>
            </div>
            
            <button
              onClick={handleToggleBot}
              disabled={botStatusLoading}
              className={`text-sm px-5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                !botSettings.isPaused
                  ? "bg-red-50 text-red-650 border border-red-200 hover:bg-red-100"
                  : "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              {botStatusLoading ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : !botSettings.isPaused ? (
                <>
                  <Lock size={16} /> Botni To'xtatish
                </>
              ) : (
                <>
                  <Unlock size={16} /> Botni Yoqish
                </>
              )}
            </button>
          </div>
        </div>

        {/* Admin ID Mapping Card */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="text-blue-500" size={20} /> Telegram Admin ID Boshqaruvi
            </h3>
            <p className="text-gray-550 text-xs mb-6 leading-relaxed">
              Adminstratorlar ro'yxatini boshqaring. 1-saqlangan Telegram ID <b>ASOSIY ADMINISTRATOR</b> hisoblanadi (to'liq tizim va menyularni boshqarish huquqiga ega). Keyingi IDs <b>kichik admin (assistant)</b> sifatida murojaatlar va cheklarni birgalikda boshqarishadi.
            </p>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Asosiy Administrator Telegram ID
                </label>
                <input
                  type="number"
                  placeholder="Masalan: 604604604"
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value)}
                  className="w-full text-sm border border-gray-100 rounded-xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white text-gray-700 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Yordamchi Kichik Adminlar Telegram ID-lari
                </label>
                
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Masalan: 705705705"
                    value={newAssistantId}
                    onChange={(e) => setNewAssistantId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAssistant();
                      }
                    }}
                    className="flex-1 text-sm border border-gray-100 rounded-xl px-4 py-2.5 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white text-gray-700 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddAssistant}
                    className="bg-blue-600 text-white px-4 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center shadow-sm shrink-0"
                    title="Qo'shish"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {assistants.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Hozircha yordamchi administratorlar qo'shilmagan.</p>
                  ) : (
                    assistants.map((id, index) => (
                      <div
                        key={`${id}_${index}`}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-250 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                            #{index + 1} Assistant
                          </span>
                          <span className="font-mono text-xs font-semibold text-gray-700">{id}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssistant(id)}
                          className="text-red-500 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition"
                          title="Ushbu yordamchini o'chirish"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-6 flex justify-between items-center">
            <div>
              {successMsg && (
                <p className="text-xs text-emerald-600 font-semibold">✓ {successMsg}</p>
              )}
            </div>
            <button
              onClick={handleSaveAdminId}
              disabled={savingAdminId || !newAdminId}
              className="text-xs bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all font-bold flex items-center gap-2 shadow-sm"
            >
              {savingAdminId ? "Saqlanmoqda..." : "ID-larni Saqlash"}
            </button>
          </div>
        </div>

      </div>

      {/* Bot Users List */}
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-gray-400" /> Telegram Bot Foydalanuvchilari
          </h3>
          <button
            onClick={fetchUsers}
            className="text-xs text-blue-500 hover:underline font-bold"
          >
            Yangilash
          </button>
        </div>

        {loadingUsers ? (
          <div className="flex justify-center h-24 items-center">
            <Loader2 className="animate-spin text-gray-400 h-6 w-6" />
          </div>
        ) : botUsers.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-2xl text-gray-400 text-sm">
            Hozircha bot foydalanuvchilari mavjud emas.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[11px] font-black uppercase tracking-wider border-b border-gray-100">
                  <th className="p-4">T/r</th>
                  <th className="p-4">Ism-Sharif</th>
                  <th className="p-4">Telegram Username</th>
                  <th className="p-4">Telegram ID</th>
                  <th className="p-4 text-center">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {botUsers.map((u, i) => (
                  <tr key={`${u.id}_${i}`} className="hover:bg-gray-50/50 transition">
                    <td className="p-4 text-gray-400 text-xs font-bold">{i + 1}</td>
                    <td className="p-4 font-bold text-gray-800 text-sm">{u.name || "Noma'lum"}</td>
                    <td className="p-4 text-blue-500 text-xs font-semibold">
                      {u.username ? `@${u.username}` : <span className="text-gray-300">yo'q</span>}
                    </td>
                    <td className="p-4 font-mono text-xs text-gray-500">{u.telegramId || u.id}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="text-red-500 bg-red-50 hover:bg-red-100 p-2.5 rounded-xl transition"
                        title="O'chirish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
