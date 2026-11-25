import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  BookOpen,
  Building2,
  FileSpreadsheet,
  Award,
  CheckSquare,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { DtmAssignmentStatus, DtmDifficulty, DtmStatus } from '../../../types/dtm';

interface DtmModuleNavProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  basePath?: string;
}

const DTM_NAV_ITEMS = [
  { label: 'Dashboard', slug: 'dashboard', icon: LayoutDashboard },
  { label: 'Testlar bazasi', slug: 'questions', icon: Database },
  { label: 'Fanlar', slug: 'subjects', icon: BookOpen },
  { label: 'Tashkilotlar', slug: 'organizations', icon: Building2 },
  { label: 'Test variantlari', slug: 'assignments', icon: FileSpreadsheet },
  { label: 'Natijalar', slug: 'results', icon: Award },
  { label: 'Javoblarni tekshirish', slug: 'answer-check', icon: CheckSquare },
];

export function DtmModuleNav({
  title,
  subtitle,
  actions,
  basePath = '/dtm',
}: DtmModuleNavProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            DTM Tizimi
          </div>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
        )}
      </div>

      <nav
        aria-label="DTM bo'limlari"
        className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {DTM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const target = `${basePath}/${item.slug}`;
          return (
            <NavLink
              key={item.slug}
              to={target}
              className={({ isActive }) =>
                cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )
              }
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export function StatusBadge({ status }: { status: DtmStatus | string }) {
  const isActive = status === 'ACTIVE';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        isActive
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
          : 'bg-slate-100 text-slate-600 ring-slate-500/20'
      )}
    >
      {isActive ? 'Aktiv' : 'Nofaol'}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: DtmDifficulty | string }) {
  const map: Record<string, { label: string; classes: string }> = {
    EASY: { label: 'Oson', classes: 'bg-sky-50 text-sky-700 ring-sky-600/20' },
    MEDIUM: { label: "O'rta", classes: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
    HARD: { label: 'Qiyin', classes: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
  };
  const item = map[difficulty] || map.MEDIUM;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        item.classes
      )}
    >
      {item.label}
    </span>
  );
}

export function AssignmentStatusBadge({ status }: { status?: DtmAssignmentStatus | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
        Yaratilmagan
      </span>
    );
  }
  const map: Record<DtmAssignmentStatus, { label: string; classes: string }> = {
    GENERATED: { label: 'GENERATED', classes: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
    PDF_READY: { label: 'PDF_READY', classes: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
    DOWNLOADED: { label: 'DOWNLOADED', classes: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20' },
    CHECKED: { label: 'CHECKED', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
    CANCELLED: { label: 'CANCELLED', classes: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
    SUPERSEDED: { label: 'ALMASHTIRILGAN', classes: 'bg-slate-100 text-slate-500 ring-slate-400/20' },
  };
  const item = map[status] || map.GENERATED;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ring-inset',
        item.classes
      )}
    >
      {item.label}
    </span>
  );
}
