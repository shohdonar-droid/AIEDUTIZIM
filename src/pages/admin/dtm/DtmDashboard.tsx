import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Database,
  BookOpen,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  formatDtmError,
  formatTimestamp,
  getDtmDashboardData,
} from '../../../services/dtmService';
import {
  DtmAssignment,
  DtmDashboardStats,
  DtmOrganization,
} from '../../../types/dtm';
import { AssignmentStatusBadge, DtmModuleNav, StatusBadge } from './DtmModuleNav';

export default function DtmDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<DtmDashboardStats>({
    totalOrganizations: 0,
    totalStudents: 0,
    totalQuestions: 0,
    activeQuestions: 0,
    totalSubjects: 0,
    totalAssignments: 0,
    checkedResultsCount: 0,
    averageScore: 0,
    averagePercentage: 0,
  });
  const [recentOrganizations, setRecentOrganizations] = useState<DtmOrganization[]>([]);
  const [recentAssignments, setRecentAssignments] = useState<DtmAssignment[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDtmDashboardData();
      setStats(data.stats);
      setRecentOrganizations(data.recentOrganizations);
      setRecentAssignments(data.recentAssignments);
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpiCards = [
    {
      label: 'Jami tashkilotlar',
      value: stats.totalOrganizations,
      meta: 'Ro‘yxatdan o‘tgan muassasalar',
      icon: Building2,
      iconBg: 'bg-blue-50 text-blue-600',
      to: '/dtm/organizations',
    },
    {
      label: 'Jami o‘quvchilar',
      value: stats.totalStudents,
      meta: '7 xonali unikal ID bilan',
      icon: Users,
      iconBg: 'bg-indigo-50 text-indigo-600',
      to: '/dtm/organizations',
    },
    {
      label: 'Jami testlar',
      value: stats.totalQuestions,
      meta: `${stats.activeQuestions} ta aktiv savol`,
      icon: Database,
      iconBg: 'bg-violet-50 text-violet-600',
      to: '/dtm/questions',
    },
    {
      label: 'Jami fanlar',
      value: stats.totalSubjects,
      meta: 'Majburiy + 1-blok va 2-blok',
      icon: BookOpen,
      iconBg: 'bg-sky-50 text-sky-600',
      to: '/dtm/subjects',
    },
    {
      label: 'Yaratilgan test variantlari',
      value: stats.totalAssignments,
      meta: '90 talik individual snapshot',
      icon: FileSpreadsheet,
      iconBg: 'bg-amber-50 text-amber-600',
      to: '/dtm/assignments',
    },
    {
      label: 'Tekshirilgan ishlar',
      value: stats.checkedResultsCount,
      meta: 'Avtomatik baholangan',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      to: '/dtm/results',
    },
    {
      label: 'O‘rtacha natija',
      value: `${stats.averagePercentage}%`,
      meta: `${stats.averageScore} / 189.0 ball`,
      icon: TrendingUp,
      iconBg: 'bg-teal-50 text-teal-600',
      to: '/dtm/results',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <DtmModuleNav
        title="DTM tizimi boshqaruv paneli"
        subtitle="Testlar bazasi, tashkilotlar, individual variantlar va natijalarning umumiy holati"
        actions={
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
        }
      />

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-blue-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {loading ? '—' : card.value}
                  </p>
                </div>
                <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{card.meta}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
              </div>
            </Link>
          );
        })}

        {/* Quick Workflow Action Card */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-900 p-5 text-white shadow-xs">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
              Tezkor amallar
            </p>
            <p className="mt-1.5 text-sm font-medium text-slate-200">
              Yangi tashkilot ochish yoki javoblar varaqasini tekshirish
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/dtm/organizations"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              Tashkilotlar
            </Link>
            <Link
              to="/dtm/answer-check"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              Tekshirish
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Tables */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Organizations */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Oxirgi tashkilotlar</h2>
              <p className="text-xs text-slate-500">So‘nggi qo‘shilgan ta’lim muassasalari</p>
            </div>
            <Link
              to="/dtm/organizations"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Barchasi
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-500">Yuklanmoqda...</div>
            ) : recentOrganizations.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Hozircha tashkilotlar yaratilmagan.
              </div>
            ) : (
              recentOrganizations.map((org) => (
                <Link
                  key={org.id}
                  to={`/dtm/organizations/${org.id}`}
                  className="flex items-center justify-between px-5 py-3.5 transition hover:bg-slate-50"
                >
                  <div className="min-w-0 pr-3">
                    <p className="truncate text-sm font-semibold text-slate-900">{org.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {org.orgType || 'Tashkilot'} · {org.region || 'Hudud ko‘rsatilmagan'} ·{' '}
                      <span className="tabular-nums font-medium text-slate-700">
                        {org.studentCount || 0}
                      </span>{' '}
                      o‘quvchi
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={org.status} />
                    <span className="text-xs text-slate-400 tabular-nums">
                      {formatTimestamp(org.createdAt)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Assignments */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Oxirgi yaratilgan test variantlari
              </h2>
              <p className="text-xs text-slate-500">Har bir o‘quvchi uchun 90 talik individual to‘plam</p>
            </div>
            <Link
              to="/dtm/assignments"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Barchasi
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-500">Yuklanmoqda...</div>
            ) : recentAssignments.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Hozircha test variantlari yaratilmagan.
              </div>
            ) : (
              recentAssignments.map((assign) => (
                <div
                  key={assign.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 tabular-nums">
                        {assign.studentNumericId}
                      </span>
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {assign.studentFullName}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {assign.assignmentCode} · {assign.block1SubjectName} + {assign.block2SubjectName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <AssignmentStatusBadge status={assign.status} />
                    <span className="text-xs text-slate-400 tabular-nums">
                      {formatTimestamp(assign.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
