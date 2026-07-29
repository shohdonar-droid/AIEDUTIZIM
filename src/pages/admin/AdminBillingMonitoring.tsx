import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import {
  Users,
  Coins,
  Wallet,
  Search,
  Download,
  RefreshCw,
  Globe,
  Bot,
  Filter,
  Eye,
  Sliders,
  X,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  ShieldAlert,
} from "lucide-react";
import * as XLSX from "xlsx";

interface UserBillingRecord {
  id: string;
  systemId: string;
  displayName: string;
  username?: string;
  email?: string;
  login?: string;
  role: string;
  platform: "site" | "bot" | "both";
  usedTokens: number;
  totalPaid: number;
  balance: number;
  lastActive?: any;
  createdAt?: any;
}

export default function AdminBillingMonitoring() {
  const [users, setUsers] = useState<UserBillingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "site" | "bot">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [tokenRate, setTokenRate] = useState<number>(1); // 1 Token = 1 UZS default
  const [selectedUser, setSelectedUser] = useState<UserBillingRecord | null>(null);

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  const fetchMonitoringData = async () => {
    setLoading(true);
    try {
      // 1. Fetch site users from `users` collection
      const usersSnap = await getDocs(collection(db, "users"));
      // 2. Fetch bot users from `telegram_users` collection
      const botUsersSnap = await getDocs(collection(db, "telegram_users"));
      // 3. Fetch payment records from `payment_history` and `payments`
      const paymentHistorySnap = await getDocs(collection(db, "payment_history"));
      const paymentsSnap = await getDocs(collection(db, "payments"));

      // Build payment totals map by userId or systemId
      const paymentMap: Record<string, number> = {};

      paymentHistorySnap.docs.forEach((doc) => {
        const data = doc.data();
        const uid = data.userId || data.systemId;
        const amt = Number(data.amount || 0);
        if (uid && amt > 0) {
          paymentMap[uid] = (paymentMap[uid] || 0) + amt;
        }
      });

      paymentsSnap.docs.forEach((doc) => {
        const data = doc.data();
        const uid = data.userId || data.systemId;
        const amt = Number(data.amount || 0);
        if (uid && amt > 0 && !paymentMap[uid]) {
          // Add if not already recorded in payment_history
          paymentMap[uid] = (paymentMap[uid] || 0) + amt;
        }
      });

      const recordsMap = new Map<string, UserBillingRecord>();

      // Process site users
      usersSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        const systemId = String(data.systemId || data.login || docId).trim();

        const isBot = data.isBotUser || data.fromTelegram || data.role === "bot_user" || data.displayName?.endsWith("(Telegram)");
        const platform: "site" | "bot" = isBot ? "bot" : "site";

        const paidFromDb = Number(data.totalPaid || 0);
        const paidFromHistory = (paymentMap[docId] || 0) + (paymentMap[systemId] || 0);
        const totalPaid = Math.max(paidFromDb, paidFromHistory);

        const usedTokens = Number(data.usedTokens || data.tokensUsed || data.aiTokens || data.tokens || 0);

        recordsMap.set(systemId || docId, {
          id: docId,
          systemId: systemId || docId,
          displayName: data.displayName || data.name || data.login || "Noma'lum",
          username: data.username || data.login || "",
          email: data.email || "",
          login: data.login || "",
          role: data.role || (isBot ? "bot_user" : "student"),
          platform,
          usedTokens,
          totalPaid,
          balance: Number(data.balance || data.ball || 0),
          lastActive: data.updatedAt || data.createdAt,
          createdAt: data.createdAt,
        });
      });

      // Process telegram_users
      botUsersSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        const systemId = String(data.systemId || data.telegramId || docId).trim();

        const existing = recordsMap.get(systemId) || recordsMap.get(docId);

        const paidFromHistory = (paymentMap[docId] || 0) + (paymentMap[systemId] || 0);
        const paidFromDb = Number(data.totalPaid || data.totalPayment || 0);
        const totalPaid = Math.max(paidFromDb, paidFromHistory, existing?.totalPaid || 0);

        const usedTokens = Math.max(
          Number(data.usedTokens || data.tokensUsed || data.tokens || 0),
          existing?.usedTokens || 0
        );

        if (existing) {
          existing.platform = "both";
          existing.usedTokens = usedTokens;
          existing.totalPaid = totalPaid;
          if (data.username) existing.username = data.username;
        } else {
          recordsMap.set(systemId || docId, {
            id: docId,
            systemId: systemId || String(data.telegramId || docId),
            displayName: data.name || data.firstName || data.displayName || "Telegram Foydalanuvchi",
            username: data.username || "",
            role: "bot_user",
            platform: "bot",
            usedTokens,
            totalPaid,
            balance: Number(data.balance || data.ball || 0),
            lastActive: data.createdAt,
            createdAt: data.createdAt,
          });
        }
      });

      const list = Array.from(recordsMap.values());
      // Sort by usedTokens desc, then totalPaid desc
      list.sort((a, b) => b.usedTokens - a.usedTokens || b.totalPaid - a.totalPaid);

      setUsers(list);
    } catch (err) {
      console.error("Error fetching monitoring data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Platform filter
      if (platformFilter === "site" && u.platform === "bot") return false;
      if (platformFilter === "bot" && u.platform === "site") return false;

      // Role filter
      if (roleFilter !== "all" && u.role !== roleFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchId = u.systemId.toLowerCase().includes(term);
        const matchName = u.displayName.toLowerCase().includes(term);
        const matchUser = u.username?.toLowerCase().includes(term);
        const matchEmail = u.email?.toLowerCase().includes(term);
        const matchLogin = u.login?.toLowerCase().includes(term);
        return matchId || matchName || matchUser || matchEmail || matchLogin;
      }

      return true;
    });
  }, [users, platformFilter, roleFilter, searchTerm]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalUsersCount = users.length;
    const totalTokensCount = users.reduce((acc, u) => acc + (u.usedTokens || 0), 0);
    const totalTokensCostSum = totalTokensCount * tokenRate;
    const totalPaidSum = users.reduce((acc, u) => acc + (u.totalPaid || 0), 0);
    const siteUsersCount = users.filter((u) => u.platform === "site" || u.platform === "both").length;
    const botUsersCount = users.filter((u) => u.platform === "bot" || u.platform === "both").length;

    return {
      totalUsersCount,
      totalTokensCount,
      totalTokensCostSum,
      totalPaidSum,
      siteUsersCount,
      botUsersCount,
    };
  }, [users, tokenRate]);

  const exportExcel = () => {
    const exportData = filteredUsers.map((u, idx) => ({
      "T/r": idx + 1,
      "Foydalanuvchi ID": u.systemId,
      "Foydalanuvchi nomi": u.displayName,
      "Username / Login": u.username ? `@${u.username}` : u.login || "-",
      "Platforma": u.platform === "both" ? "Sayt va Bot" : u.platform === "site" ? "Sayt (🌐)" : "Telegram Bot (🤖)",
      "Rol": getRoleLabel(u.role),
      "Sarflagan tokeni": u.usedTokens,
      "Token qiymati (so'm)": u.usedTokens * tokenRate,
      "To'lov qilgan summasi (so'm)": u.totalPaid,
      "Joriy balansi (so'm)": u.balance,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Token_va_Tolovir_Monitoring");
    XLSX.writeFile(wb, `Billing_Monitoring_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider rounded-lg border border-indigo-100">
              Billing & AI Analytics
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Token & To'lovlar Monitoringi
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Tizimdagi barcha foydalanuvchilar (Sayt va Telegram Bot) ning AI token sarfi va to'lovlari hisoboti
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMonitoringData}
            disabled={loading}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Yangilash</span>
          </button>

          <button
            onClick={exportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Excel Eksport</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Jami Foydalanuvchilar</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-slate-900">{stats.totalUsersCount.toLocaleString("uz-UZ")}</div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium mt-1">
              <span className="flex items-center gap-1 text-sky-600 font-bold">
                <Globe className="w-3.5 h-3.5" /> Sayt: {stats.siteUsersCount}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-blue-600 font-bold">
                <Bot className="w-3.5 h-3.5" /> Bot: {stats.botUsersCount}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Sarflangan Tokenlar</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-slate-900">{stats.totalTokensCount.toLocaleString("uz-UZ")} token</div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Barcha generatsiyalar va AI so'rovlari bo'yicha
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Token Qiymati (So'm)</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-purple-700">
              {stats.totalTokensCostSum.toLocaleString("uz-UZ")} UZS
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
              <span>Stavka: 1 token = {tokenRate} so'm</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Jami Tushgan To'lovlar</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-emerald-600">
              {stats.totalPaidSum.toLocaleString("uz-UZ")} UZS
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Click, Payme va tizim to'lovlari
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Foydalanuvchi ID, Ismi, Username yoki Login..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Platform Toggle Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 self-start lg:self-auto">
            <button
              onClick={() => setPlatformFilter("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                platformFilter === "all"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Barchasi ({users.length})
            </button>
            <button
              onClick={() => setPlatformFilter("site")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                platformFilter === "site"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Sayt
            </button>
            <button
              onClick={() => setPlatformFilter("bot")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                platformFilter === "bot"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Bot className="w-3.5 h-3.5" /> Telegram Bot
            </button>
          </div>
        </div>

        {/* Secondary Filters & Rate Config */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Rol bo'yicha:
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Barcha rollar</option>
              <option value="teacher">O'qituvchi</option>
              <option value="student">Talaba</option>
              <option value="mustaqil_o_qituvchi">Mustaqil O'qituvchi</option>
              <option value="staff">Xodim</option>
              <option value="admin">Admin / Subadmin</option>
              <option value="bot_user">Bot foydalanuvchisi</option>
            </select>
          </div>

          {/* Adjustable Token Rate */}
          <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-100 px-3 py-1.5 rounded-xl">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-900">1 Token narxi:</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={tokenRate}
              onChange={(e) => setTokenRate(Math.max(0, Number(e.target.value)))}
              className="w-16 px-2 py-0.5 bg-white border border-indigo-200 rounded-lg text-xs font-black text-center text-indigo-700 focus:outline-none"
            />
            <span className="text-xs font-bold text-indigo-800">so'm</span>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-4 px-4 text-center w-12">T/R</th>
                <th className="py-4 px-4">Foydalanuvchi ID</th>
                <th className="py-4 px-4">Foydalanuvchi nomi</th>
                <th className="py-4 px-4">Platforma / Rol</th>
                <th className="py-4 px-4 text-right">Sarflagan tokeni</th>
                <th className="py-4 px-4 text-right">Sarflagan tokeni (so'mda)</th>
                <th className="py-4 px-4 text-right">To'lov qilgan summasi</th>
                <th className="py-4 px-4 text-right">Joriy balans</th>
                <th className="py-4 px-4 text-center w-20">Tafsilot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                      <span className="font-semibold text-xs">Monitoring ma'lumotlari yuklanmoqda...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="w-8 h-8 text-slate-300" />
                      <span className="font-bold text-slate-600">Foydalanuvchi topilmadi</span>
                      <span className="text-[11px] text-slate-400">Qidiruv yoki filtrlarni o'zgartirib ko'ring</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const tokenCost = u.usedTokens * tokenRate;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* T/R */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 group-hover:text-slate-700">
                        {idx + 1}
                      </td>

                      {/* Foydalanuvchi ID raqami */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 font-mono text-[11px] font-black text-slate-800">
                          {u.systemId}
                        </span>
                      </td>

                      {/* Foydalanuvchi nomi */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {u.displayName}
                          </span>
                          {u.username && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              @{u.username.replace("@", "")}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Platforma va Rol */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {u.platform === "site" && (
                            <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100 text-[10px] font-bold flex items-center gap-1">
                              <Globe className="w-3 h-3" /> Sayt
                            </span>
                          )}
                          {u.platform === "bot" && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold flex items-center gap-1">
                              <Bot className="w-3 h-3" /> Bot
                            </span>
                          )}
                          {u.platform === "both" && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold flex items-center gap-1">
                              <Globe className="w-3 h-3" /> Sayt + Bot
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                            {getRoleLabel(u.role)}
                          </span>
                        </div>
                      </td>

                      {/* Sarflagan tokeni */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-amber-600">
                          {u.usedTokens.toLocaleString("uz-UZ")}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 ml-1">token</span>
                      </td>

                      {/* Sarflagan tokeni (so'mda) */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-purple-700">
                          {tokenCost.toLocaleString("uz-UZ")}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 ml-1">UZS</span>
                      </td>

                      {/* To'lov qilgan summasi */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={`font-black ${u.totalPaid > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                          {u.totalPaid.toLocaleString("uz-UZ")}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 ml-1">UZS</span>
                      </td>

                      {/* Joriy balansi */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-700">
                        {u.balance.toLocaleString("uz-UZ")} <span className="text-[10px] text-slate-400 font-medium">UZS</span>
                      </td>

                      {/* Amallar / Tafsilot */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Tafsilotlarni ko'rish"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 font-bold">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedUser.displayName}</h3>
                  <p className="text-xs text-slate-400 font-medium">ID: {selectedUser.systemId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sarflangan Token</span>
                <div className="text-lg font-black text-amber-600 mt-1">
                  {selectedUser.usedTokens.toLocaleString("uz-UZ")} token
                </div>
                <div className="text-xs text-purple-700 font-bold mt-1">
                  ≈ {(selectedUser.usedTokens * tokenRate).toLocaleString("uz-UZ")} UZS
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Jami To'lov Qilingan</span>
                <div className="text-lg font-black text-emerald-600 mt-1">
                  {selectedUser.totalPaid.toLocaleString("uz-UZ")} UZS
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">
                  Balans: {selectedUser.balance.toLocaleString("uz-UZ")} UZS
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Platforma:</span>
                <span className="font-bold text-slate-800">
                  {selectedUser.platform === "both"
                    ? "Sayt + Telegram Bot"
                    : selectedUser.platform === "site"
                    ? "Sayt (🌐)"
                    : "Telegram Bot (🤖)"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Rol:</span>
                <span className="font-bold text-slate-800">{getRoleLabel(selectedUser.role)}</span>
              </div>
              {selectedUser.username && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Telegram / Username:</span>
                  <span className="font-bold text-indigo-600">@{selectedUser.username.replace("@", "")}</span>
                </div>
              )}
              {selectedUser.email && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Email:</span>
                  <span className="font-bold text-slate-800">{selectedUser.email}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "teacher":
      return "O'qituvchi";
    case "mustaqil_o_qituvchi":
      return "Mustaqil O'qituvchi";
    case "student":
      return "Talaba";
    case "staff":
      return "Xodim";
    case "admin":
      return "Admin";
    case "subadmin":
      return "Subadmin";
    case "bot_user":
      return "Bot Foydalanuvchisi";
    default:
      return role || "Foydalanuvchi";
  }
}
