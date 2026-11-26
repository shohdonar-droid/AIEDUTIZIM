import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Phone,
  MapPin,
  UserCheck,
} from 'lucide-react';
import {
  formatDtmError,
  formatTimestamp,
  getDtmOrgDashboardData,
} from '../../../services/dtmService';
import {
  DtmAssignment,
  DtmOrganization,
  DtmResult,
} from '../../../types/dtm';
import { AssignmentStatusBadge, StatusBadge } from './DtmModuleNav';

interface DtmOrgDashboardProps {
  organizationId: string;
}

export default function DtmOrgDashboard({ organizationId }: DtmOrgDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [organization, setOrganization] = useState<DtmOrganization | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [checkedResultsCount, setCheckedResultsCount] = useState(0);
  const [averagePercentage, setAveragePercentage] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [recentAssignments, setRecentAssignments] = useState<DtmAssignment[]>([]);
  const [recentResults, setRecentResults] = useState<DtmResult[]>([]);

  const loadData = async () => {
    if (!organizationId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getDtmOrgDashboardData(organizationId);
      setOrganization(data.organization);
      setStudentCount(data.studentCount);
      setAssignmentCount(data.assignmentCount);
      setCheckedResultsCount(data.checkedResultsCount);
      setAveragePercentage(data.averagePercentage);
      setAverageScore(data.averageScore);
      setRecentAssignments(data.recentAssignments);
      setRecentResults(data.recentResults);
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const kpiCards = [
    {
      label: 'O‘quvchilar soni',
      value: studentCount,
      meta: '7 xonali unikal ID bilan',
      icon: Users,
      iconBg: 'bg-blue-50 text-blue-600',
      to: '/teacher/dtm/organization',
    },
    {
      label: 'Test variantlari',
      value: assignmentCount,
      meta: '90 talik individual to‘plam',
      icon: FileSpreadsheet,
      iconBg: 'bg-amber-50 text-amber-600',
      to: '/teacher/dtm/assignments',
    },
    {
      label: 'Tekshirilgan ishlar',
      value: checkedResultsCount,
      meta: 'Avtomatik baholangan',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      to: '/teacher/dtm/results',
    },
    {
      label: 'O‘rtacha natija',
      value: `${averagePercentage}%`,
      meta: `${averageScore} / 189.0 ball`,
      icon: TrendingUp,
      iconBg: 'bg-indigo-50 text-indigo-600',
      to: '/teacher/dtm/results',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Organization Header Card */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:flex-row lg:items-center">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
              <Building2 className="h-3.5 w-3.5" />
              DTM Tashkilot Kabineti
            </span>
            {organization && <StatusBadge status={organization.status} />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {organization ? organization.name : 'Tashkilot Dashboardi'}
          </h1>
          {organization && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
              <span>{organization.orgType || 'Tashkilot'}</span>
              {organization.region && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {organization.region}
                  {organization.address ? `, ${organization.address}` : ''}
                </span>
              )}
              {organization.responsiblePerson && (
                <span className="inline-flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                  Mas’ul: {organization.responsiblePerson}
                </span>
              )}
              {organization.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {organization.phone}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/teacher/dtm/organization"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
          >
            O‘quvchilar va PDF/ZIP
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/teacher/dtm/answer-check"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Javob tekshirish
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
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
      </div>

      {/* Recent Assignments & Recent Results */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Oxirgi test variantlari
              </h2>
              <p className="text-xs text-slate-500">Tashkilot o‘quvchilari uchun yaratilgan variantlar</p>
            </div>
            <Link
              to="/teacher/dtm/assignments"
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

        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Oxirgi natijalar</h2>
              <p className="text-xs text-slate-500">Tekshirilgan javob varaqalari bo‘yicha ballar</p>
            </div>
            <Link
              to="/teacher/dtm/results"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Barchasi
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-500">Yuklanmoqda...</div>
            ) : recentResults.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                Hozircha tekshirilgan natijalar mavjud emas.
              </div>
            ) : (
              recentResults.map((res) => (
                <div
                  key={res.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 tabular-nums">
                        {res.studentNumericId}
                      </span>
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {res.studentFullName}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      To‘g‘ri: {res.correctCount}/{res.totalQuestions} · {res.block1SubjectName} + {res.block2SubjectName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5 tabular-nums">
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      {res.score} ball
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      {res.percentage}%
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
