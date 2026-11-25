import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  UserPlus,
  Upload,
  Sparkles,
  FileArchive,
  FileText,
  ClipboardList,
  Search,
  Pencil,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  bulkImportDtmStudents,
  createDtmStudent,
  deleteDtmStudent,
  downloadAnswerSheetPdf,
  downloadOrganizationZip,
  downloadTestBookletPdf,
  formatDtmError,
  generateAssignmentsForOrganization,
  generateStudentAssignment,
  getDtmAssignmentById,
  getDtmOrganizationById,
  listDtmAssignments,
  listDtmStudentsByOrg,
  listDtmSubjects,
  updateDtmStudent,
} from '../../../services/dtmService';
import {
  DtmAssignment,
  DtmOrganization,
  DtmStudent,
  DtmSubject,
} from '../../../types/dtm';
import { AssignmentStatusBadge, DtmModuleNav } from './DtmModuleNav';

interface ExcelPreviewRow {
  fullName: string;
  groupOrClass: string;
  phone: string;
  block1Input: string;
  block2Input: string;
  block1Subject?: DtmSubject;
  block2Subject?: DtmSubject;
  error?: string;
}

export default function DtmOrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const [org, setOrg] = useState<DtmOrganization | null>(null);
  const [students, setStudents] = useState<DtmStudent[]>([]);
  const [subjects, setSubjects] = useState<DtmSubject[]>([]);
  const [assignmentsById, setAssignmentsById] = useState<Record<string, DtmAssignment>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Add / Edit Student Modal
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<DtmStudent | null>(null);
  const [fullName, setFullName] = useState('');
  const [groupOrClass, setGroupOrClass] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [block1SubjectId, setBlock1SubjectId] = useState('');
  const [block2SubjectId, setBlock2SubjectId] = useState('');
  const [generateImmediately, setGenerateImmediately] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);

  // Batch Generation & ZIP States
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null);
  const [busyPdfKey, setBusyPdfKey] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [batchErrors, setBatchErrors] = useState<Array<{ studentName: string; numericId: string; message: string }>>([]);
  const [zipGenerating, setZipGenerating] = useState(false);

  // Excel Import Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ExcelPreviewRow[]>([]);
  const [importing, setImporting] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [orgData, studentList, subjectList, orgAssignments] = await Promise.all([
        getDtmOrganizationById(id),
        listDtmStudentsByOrg(id),
        listDtmSubjects(),
        listDtmAssignments(id),
      ]);
      setOrg(orgData);
      setStudents(studentList);
      setSubjects(subjectList.filter((s) => s.status === 'ACTIVE'));
      const map: Record<string, DtmAssignment> = {};
      orgAssignments.forEach((a) => {
        map[a.id] = a;
      });
      setAssignmentsById(map);
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const block1Subjects = useMemo(
    () => subjects.filter((s) => s.blockType === '1-blok' || s.blockType === 'both' || s.blockType !== '2-blok'),
    [subjects]
  );
  const block2Subjects = useMemo(
    () => subjects.filter((s) => s.blockType === '2-blok' || s.blockType === 'both' || s.blockType !== '1-blok'),
    [subjects]
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (s) =>
        s.numericId.includes(term) ||
        s.fullName.toLowerCase().includes(term) ||
        (s.groupOrClass || '').toLowerCase().includes(term) ||
        (s.block1SubjectName || '').toLowerCase().includes(term) ||
        (s.block2SubjectName || '').toLowerCase().includes(term)
    );
  }, [students, search]);

  const readyAssignments = useMemo(() => {
    const list: DtmAssignment[] = [];
    for (const st of students) {
      if (
        st.latestAssignmentId &&
        st.latestAssignmentStatus !== 'CANCELLED' &&
        st.latestAssignmentStatus !== 'SUPERSEDED'
      ) {
        const assign = assignmentsById[st.latestAssignmentId];
        if (assign) list.push(assign);
      }
    }
    return list;
  }, [students, assignmentsById]);

  const missingAssignmentCount = students.length - readyAssignments.length;

  const openCreateStudent = () => {
    setEditingStudent(null);
    setFullName('');
    setGroupOrClass('');
    setPhone('');
    setNotes('');
    setBlock1SubjectId(block1Subjects[0]?.id || subjects[0]?.id || '');
    setBlock2SubjectId(block2Subjects[1]?.id || block2Subjects[0]?.id || subjects[0]?.id || '');
    setGenerateImmediately(false);
    setError('');
    setIsStudentModalOpen(true);
  };

  const openEditStudent = (st: DtmStudent) => {
    setEditingStudent(st);
    setFullName(st.fullName);
    setGroupOrClass(st.groupOrClass);
    setPhone(st.phone || '');
    setNotes(st.notes || '');
    setBlock1SubjectId(st.block1SubjectId);
    setBlock2SubjectId(st.block2SubjectId);
    setGenerateImmediately(false);
    setError('');
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    if (!fullName.trim()) {
      setError("O‘quvchi F.I.Sh. ni kiriting.");
      return;
    }
    if (!block1SubjectId || !block2SubjectId) {
      setError("1-blok va 2-blok fanlarini tanlang.");
      return;
    }

    const sub1 = subjects.find((s) => s.id === block1SubjectId);
    const sub2 = subjects.find((s) => s.id === block2SubjectId);

    setSavingStudent(true);
    setError('');
    setSuccess('');
    try {
      if (editingStudent) {
        await updateDtmStudent(editingStudent.id, {
          fullName: fullName.trim(),
          groupOrClass: groupOrClass.trim(),
          phone: phone.trim(),
          notes: notes.trim(),
          block1SubjectId,
          block1SubjectName: sub1?.name || editingStudent.block1SubjectName || '',
          block2SubjectId,
          block2SubjectName: sub2?.name || editingStudent.block2SubjectName || '',
        });
        setSuccess(`O‘quvchi (ID: ${editingStudent.numericId}) ma’lumotlari yangilandi.`);
      } else {
        const res = await createDtmStudent(
          {
            organizationId: org.id,
            organizationName: org.name,
            fullName: fullName.trim(),
            groupOrClass: groupOrClass.trim(),
            phone: phone.trim(),
            notes: notes.trim(),
            block1SubjectId,
            block1SubjectName: sub1?.name || '',
            block2SubjectId,
            block2SubjectName: sub2?.name || '',
          },
          generateImmediately
        );
        setSuccess(
          res.assignment
            ? `O‘quvchi yaratildi (ID: ${res.student.numericId}) va 60 talik test varianti (${res.assignment.assignmentCode}) biriktirildi.`
            : `O‘quvchi yaratildi! Unikal 7 xonali ID: ${res.student.numericId}`
        );
      }
      setIsStudentModalOpen(false);
      await loadData();
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setSavingStudent(false);
    }
  };

  const handleGenerateForStudent = async (st: DtmStudent) => {
    const hasExisting =
      Boolean(st.latestAssignmentId) &&
      st.latestAssignmentStatus !== 'CANCELLED' &&
      st.latestAssignmentStatus !== 'SUPERSEDED';

    if (hasExisting) {
      const ok = window.confirm(
        "Ushbu o‘quvchi uchun test varianti allaqachon yaratilgan. Qayta yaratish mavjud variantni almashtiradi. Davom etasizmi?"
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(
        "O‘quvchi uchun tanlangan fanlardan 60 ta tasodifiy test biriktiriladi. Davom etasizmi?"
      );
      if (!ok) return;
    }

    setBusyStudentId(st.id);
    setError('');
    setSuccess('');
    try {
      const created = await generateStudentAssignment({
        student: st,
        allowRegenerate: hasExisting,
      });
      setSuccess(
        `${st.fullName} (ID: ${st.numericId}) uchun ${created.assignmentCode} varianti (60 ta savol) yaratildi.`
      );
      await loadData();
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setBusyStudentId(null);
    }
  };

  const handleBatchGenerate = async () => {
    const pendingCount = students.filter(
      (s) => !s.latestAssignmentId || s.latestAssignmentStatus === 'CANCELLED'
    ).length;
    if (pendingCount === 0) {
      setSuccess("Barcha o‘quvchilarda test variantlari allaqachon yaratilgan.");
      return;
    }
    if (
      !window.confirm(
        `Test varianti yaratilmagan ${pendingCount} ta o‘quvchi uchun 60 tadan tasodifiy test varianti generatsiya qilinsinmi?`
      )
    ) {
      return;
    }

    setBatchGenerating(true);
    setBatchErrors([]);
    setError('');
    setSuccess('');
    try {
      const result = await generateAssignmentsForOrganization(students, (current, total, name) => {
        setBatchProgress({ current, total, name });
      });
      setBatchErrors(result.errors);
      setSuccess(
        `Yaratildi: ${result.createdCount} ta · O‘tkazib yuborildi (allaqachon bor): ${result.skippedCount} ta · Xatoliklar: ${result.errors.length} ta.`
      );
      await loadData();
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setBatchGenerating(false);
      setBatchProgress(null);
    }
  };

  const handleDownloadSinglePdf = async (
    st: DtmStudent,
    type: 'test' | 'answer'
  ) => {
    if (!st.latestAssignmentId) {
      setError("Avval o‘quvchi uchun test variantini yarating.");
      return;
    }
    const key = `${st.id}_${type}`;
    setBusyPdfKey(key);
    setError('');
    try {
      let assignment: DtmAssignment | null | undefined = assignmentsById[st.latestAssignmentId];
      if (!assignment) {
        assignment = await getDtmAssignmentById(st.latestAssignmentId);
      }
      if (!assignment) {
        throw new Error("Test varianti ma’lumotlari topilmadi.");
      }
      if (type === 'test') {
        await downloadTestBookletPdf(assignment);
      } else {
        await downloadAnswerSheetPdf(assignment);
      }
      await loadData();
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setBusyPdfKey(null);
    }
  };

  const handleDownloadOrgZip = async () => {
    if (!org) return;
    if (students.length === 0) {
      setError("Tashkilotda hali o‘quvchilar mavjud emas.");
      return;
    }
    if (readyAssignments.length === 0) {
      setError(
        `${students.length} ta o‘quvchidan birortasida ham test varianti yaratilmagan. Avval test variantlarini yarating.`
      );
      return;
    }

    if (missingAssignmentCount > 0) {
      const proceed = window.confirm(
        `${students.length} ta o‘quvchidan ${readyAssignments.length} tasida test varianti tayyor. ${missingAssignmentCount} ta o‘quvchida test varianti mavjud emas.\n\nTayyor ${readyAssignments.length} ta o‘quvchi uchun ZIP arxiv yaratilsinmi?`
      );
      if (!proceed) return;
    }

    setZipGenerating(true);
    setError('');
    setSuccess('');
    try {
      await downloadOrganizationZip(org.name, readyAssignments);
      setSuccess(
        `${readyAssignments.length} ta o‘quvchining Test kitobchasi va Javoblar varaqasi bitta ZIP arxivga yuklab olindi.`
      );
      await loadData();
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setZipGenerating(false);
    }
  };

  const handleDeleteStudent = async (st: DtmStudent) => {
    if (!org) return;
    if (!window.confirm(`${st.fullName} (ID: ${st.numericId}) o‘quvchisini o‘chirishni tasdiqlaysizmi?`)) {
      return;
    }
    try {
      await deleteDtmStudent(st.id, org.id);
      setStudents((prev) => prev.filter((item) => item.id !== st.id));
      setSuccess(`O‘quvchi (ID: ${st.numericId}) o‘chirildi.`);
    } catch (err) {
      setError(formatDtmError(err));
    }
  };

  // Excel Template & Parser
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'F.I.Sh.': 'Aliyev Anvar Baxtiyorovich',
        'Sinf/Guruh': '11-A',
        Telefon: '+998901234567',
        '1-blok': subjects[0]?.name || 'Matematika',
        '2-blok': subjects[1]?.name || subjects[0]?.name || 'Fizika',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Oquvchilar');
    XLSX.writeFile(wb, 'DTM_Oquvchilar_Shablon.xlsx');
  };

  const resolveSubjectByNameOrCode = (val: string): DtmSubject | undefined => {
    const norm = (val || '').trim().toLowerCase();
    if (!norm) return undefined;
    return subjects.find(
      (s) => s.name.toLowerCase() === norm || s.code.toLowerCase() === norm
    );
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });

      const mapped: ExcelPreviewRow[] = rawRows.map((row) => {
        const fullNameVal = String(
          row['F.I.Sh.'] || row['FISH'] || row['Ism'] || row['fullName'] || ''
        ).trim();
        const groupVal = String(
          row['Sinf/Guruh'] || row['Sinf'] || row['Guruh'] || row['groupOrClass'] || ''
        ).trim();
        const phoneVal = String(row['Telefon'] || row['phone'] || '').trim();
        const b1Raw = String(row['1-blok'] || row['block1'] || '').trim();
        const b2Raw = String(row['2-blok'] || row['block2'] || '').trim();

        const b1Sub = resolveSubjectByNameOrCode(b1Raw);
        const b2Sub = resolveSubjectByNameOrCode(b2Raw);

        const rowErrors: string[] = [];
        if (!fullNameVal) rowErrors.push('F.I.Sh. bo‘sh');
        if (!b1Sub) rowErrors.push(`1-blok topilmadi (“${b1Raw || '—'}”)`);
        if (!b2Sub) rowErrors.push(`2-blok topilmadi (“${b2Raw || '—'}”)`);

        return {
          fullName: fullNameVal,
          groupOrClass: groupVal,
          phone: phoneVal,
          block1Input: b1Raw,
          block2Input: b2Raw,
          block1Subject: b1Sub,
          block2Subject: b2Sub,
          error: rowErrors.length > 0 ? rowErrors.join('; ') : undefined,
        };
      });

      setImportRows(mapped);
    } catch (err) {
      setError("Excel faylni o‘qishda xatolik: " + formatDtmError(err));
    }
  };

  const handleConfirmExcelImport = async () => {
    if (!org) return;
    const validRows = importRows.filter((r) => !r.error && r.block1Subject && r.block2Subject);
    if (validRows.length === 0) {
      setError("Import qilish uchun yaroqli qatorlar topilmadi.");
      return;
    }

    setImporting(true);
    setError('');
    try {
      const created = await bulkImportDtmStudents(
        org.id,
        org.name,
        validRows.map((r) => ({
          fullName: r.fullName,
          groupOrClass: r.groupOrClass,
          phone: r.phone,
          block1SubjectId: r.block1Subject!.id,
          block1SubjectName: r.block1Subject!.name,
          block2SubjectId: r.block2Subject!.id,
          block2SubjectName: r.block2Subject!.name,
        }))
      );
      setSuccess(
        `${created.length} ta o‘quvchi avtomatik 7 xonali ID bilan import qilindi.`
      );
      setIsImportOpen(false);
      setImportRows([]);
      await loadData();
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <DtmModuleNav
        title={org ? org.name : 'Tashkilot tafsilotlari'}
        subtitle={
          org
            ? `${org.orgType || 'Tashkilot'} · ${org.region || 'Hudud ko‘rsatilmagan'} · Jami ${students.length} o‘quvchi · ${readyAssignments.length} tayyor variant`
            : "O‘quvchilar va test variantlarini boshqarish"
        }
        actions={
          <Link
            to="/dtm/organizations"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tashkilotlar ro‘yxati
          </Link>
        }
      />

      {error && (
        <div className="mb-4 whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {batchErrors.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-bold">Ayrim o‘quvchilar uchun variant yaratilmadi ({batchErrors.length} ta):</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {batchErrors.map((item, idx) => (
              <li key={idx}>
                <span className="font-mono font-bold">{item.numericId}</span> {item.studentName}:{' '}
                {item.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="7 xonali ID, F.I.Sh., sinf yoki fan bo‘yicha qidirish..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openCreateStudent}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
          >
            <UserPlus className="h-3.5 w-3.5" />
            O‘quvchi qo‘shish
          </button>

          <button
            onClick={() => {
              setImportRows([]);
              setIsImportOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Upload className="h-3.5 w-3.5" />
            Excel import
          </button>

          <button
            onClick={handleBatchGenerate}
            disabled={batchGenerating || students.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
          >
            {batchGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Barcha o‘quvchilar uchun test yaratish
          </button>

          <button
            onClick={handleDownloadOrgZip}
            disabled={zipGenerating || students.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50"
          >
            {zipGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileArchive className="h-3.5 w-3.5" />
            )}
            PDF + javoblar varaqasi + ZIP yaratish
          </button>
        </div>
      </div>

      {/* Progress banner for batch generation */}
      {batchGenerating && batchProgress && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
            <span>
              Test variantlari yaratilmoqda: {batchProgress.name}
            </span>
            <span className="tabular-nums">
              {batchProgress.current} / {batchProgress.total}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-200">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Partial readiness notice */}
      {students.length > 0 && missingAssignmentCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-xs text-amber-900">
          <span>
            <strong className="tabular-nums">{students.length}</strong> ta o‘quvchidan{' '}
            <strong className="tabular-nums">{readyAssignments.length}</strong> tasida test varianti tayyor.{' '}
            <strong className="tabular-nums">{missingAssignmentCount}</strong> ta o‘quvchida test varianti mavjud emas.
          </span>
        </div>
      )}

      {/* Students Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">ID (7 xonali)</th>
                <th className="px-4 py-3.5">F.I.Sh.</th>
                <th className="px-4 py-3.5">Sinf / Guruh</th>
                <th className="px-4 py-3.5">1-blok</th>
                <th className="px-4 py-3.5">2-blok</th>
                <th className="px-4 py-3.5">Test holati</th>
                <th className="px-4 py-3.5">PDF fayllar</th>
                <th className="px-4 py-3.5">Natija</th>
                <th className="px-4 py-3.5 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    O‘quvchilar yuklanmoqda...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Hozircha o‘quvchilar qo‘shilmagan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const hasAssignment =
                    Boolean(st.latestAssignmentId) &&
                    st.latestAssignmentStatus !== 'CANCELLED' &&
                    st.latestAssignmentStatus !== 'SUPERSEDED';
                  const isBusy = busyStudentId === st.id;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-slate-900 tabular-nums">
                          {st.numericId}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{st.fullName}</p>
                        {st.phone && <p className="text-xs text-slate-500">{st.phone}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium text-slate-700">
                        {st.groupOrClass || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium text-slate-800">
                        {st.block1SubjectName || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-medium text-slate-800">
                        {st.block2SubjectName || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <AssignmentStatusBadge status={st.latestAssignmentStatus} />
                          {st.latestAssignmentCode && (
                            <span className="font-mono text-[10px] text-slate-400">
                              {st.latestAssignmentCode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {hasAssignment ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              onClick={() => handleDownloadSinglePdf(st, 'test')}
                              disabled={busyPdfKey === `${st.id}_test`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              title={`Test_${st.numericId}.pdf`}
                            >
                              {busyPdfKey === `${st.id}_test` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <FileText className="h-3 w-3 text-blue-600" />
                              )}
                              Test PDF
                            </button>
                            <button
                              onClick={() => handleDownloadSinglePdf(st, 'answer')}
                              disabled={busyPdfKey === `${st.id}_answer`}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              title={`Javoblar_${st.numericId}.pdf`}
                            >
                              {busyPdfKey === `${st.id}_answer` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ClipboardList className="h-3 w-3 text-emerald-600" />
                              )}
                              Javoblar PDF
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        {st.latestScore !== null && st.latestScore !== undefined ? (
                          <div className="text-xs">
                            <span className="font-bold text-emerald-700">
                              {st.latestScore} ball
                            </span>
                            <div className="text-slate-500">{st.latestPercentage}%</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Tekshirilmagan</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleGenerateForStudent(st)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                            title={
                              hasAssignment
                                ? 'Test variantini qayta yaratish'
                                : '60 talik test yaratish'
                            }
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : hasAssignment ? (
                              <RefreshCw className="h-3.5 w-3.5" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            {hasAssignment ? 'Qayta' : 'Test yaratish'}
                          </button>
                          <button
                            onClick={() => openEditStudent(st)}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            title="Tahrirlash"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(st)}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                            title="O‘chirish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingStudent ? 'O‘quvchini tahrirlash' : 'Yangi DTM o‘quvchisi qo‘shish'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingStudent
                    ? `Unikal 7 xonali ID: ${editingStudent.numericId} (o‘zgartirib bo‘lmaydi)`
                    : 'Avtomatik 7 xonali unikal ID beriladi. Alohida login profil yaratilmaydi.'}
                </p>
              </div>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  F.I.Sh. *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masalan: Aliyev Anvar"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Sinf / Guruh *
                  </label>
                  <input
                    type="text"
                    required
                    value={groupOrClass}
                    onChange={(e) => setGroupOrClass(e.target.value)}
                    placeholder="Masalan: 11-A"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Telefon (ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 ..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    1-blok fani (30 ta savol) *
                  </label>
                  <select
                    required
                    value={block1SubjectId}
                    onChange={(e) => setBlock1SubjectId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Fan tanlang...</option>
                    {block1Subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    2-blok fani (30 ta savol) *
                  </label>
                  <select
                    required
                    value={block2SubjectId}
                    onChange={(e) => setBlock2SubjectId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Fan tanlang...</option>
                    {block2Subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Izoh</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Qo‘shimcha eslatma..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {!editingStudent && (
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-2.5 text-xs font-medium text-blue-900">
                  <input
                    type="checkbox"
                    checked={generateImmediately}
                    onChange={(e) => setGenerateImmediately(e.target.checked)}
                    className="h-4 w-4 rounded border-blue-300 text-blue-600"
                  />
                  <span>
                    Saqlash bilan darhol 60 talik tasodifiy test variantini yaratish (30 + 30)
                  </span>
                </label>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingStudent}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingStudent && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Excel (.xlsx) orqali o‘quvchilarni import qilish
                </h3>
                <p className="text-xs text-slate-500">
                  Ustunlar: F.I.Sh. | Sinf/Guruh | Telefon | 1-blok | 2-blok
                </p>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs text-slate-600">
                1-blok va 2-blok ustunlarida Fanlar bo‘limidagi fan nomi yoki kodi ko‘rsatilishi kerak.
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleExcel}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Download className="h-3.5 w-3.5" />
                Namuna Excel (.xlsx)
              </button>
            </div>

            <div className="mb-4">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelFileChange}
                className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-700"
              />
            </div>

            {importRows.length > 0 && (
              <div className="mb-4 max-h-64 overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">F.I.Sh.</th>
                      <th className="px-3 py-2">Sinf</th>
                      <th className="px-3 py-2">1-blok</th>
                      <th className="px-3 py-2">2-blok</th>
                      <th className="px-3 py-2">Holat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importRows.map((row, idx) => (
                      <tr key={idx} className={row.error ? 'bg-rose-50/50' : ''}>
                        <td className="px-3 py-2 tabular-nums">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium">{row.fullName || '—'}</td>
                        <td className="px-3 py-2">{row.groupOrClass || '—'}</td>
                        <td className="px-3 py-2">{row.block1Subject?.name || row.block1Input || '—'}</td>
                        <td className="px-3 py-2">{row.block2Subject?.name || row.block2Input || '—'}</td>
                        <td className="px-3 py-2">
                          {row.error ? (
                            <span className="font-medium text-rose-600">{row.error}</span>
                          ) : (
                            <span className="font-medium text-emerald-700">Tayyor</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={importing || importRows.filter((r) => !r.error).length === 0}
                onClick={handleConfirmExcelImport}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Import qilish ({importRows.filter((r) => !r.error).length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
