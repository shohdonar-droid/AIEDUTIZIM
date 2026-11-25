import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  CheckSquare,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import {
  formatDtmError,
  getLatestAssignmentByStudentNumericId,
  submitAndCheckAnswerSheet,
} from '../../../services/dtmService';
import {
  DtmAnswerOption,
  DtmAnswerSourceType,
  DtmAssignment,
  DtmResult,
  DtmStudent,
} from '../../../types/dtm';
import { AssignmentStatusBadge, DtmModuleNav } from './DtmModuleNav';

const OPTIONS: DtmAnswerOption[] = ['A', 'B', 'C', 'D'];

export default function DtmAnswerCheck({ scopedOrgId }: { scopedOrgId?: string }) {
  const [numericIdInput, setNumericIdInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [student, setStudent] = useState<DtmStudent | null>(null);
  const [assignment, setAssignment] = useState<DtmAssignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, DtmAnswerOption | ''>>({});
  const [quickString, setQuickString] = useState('');

  // Future-ready OMR/Scanner upload state
  const [sourceType, setSourceType] = useState<DtmAnswerSourceType>('MANUAL');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [savedResult, setSavedResult] = useState<DtmResult | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = numericIdInput.replace(/\D/g, '').slice(0, 7);
    if (!/^\d{7}$/.test(cleaned)) {
      setError("Iltimos, aniq 7 xonali raqamli ID kiriting (masalan: 1000001).");
      return;
    }

    setSearching(true);
    setError('');
    setSavedResult(null);
    try {
      const { student: foundStudent, assignment: foundAssignment } =
        await getLatestAssignmentByStudentNumericId(cleaned, scopedOrgId);
      setStudent(foundStudent);
      setAssignment(foundAssignment);

      const initial: Record<string, DtmAnswerOption | ''> = {};
      for (let i = 1; i <= 60; i++) initial[String(i)] = '';
      setAnswers(initial);
      setQuickString('');
    } catch (err) {
      setStudent(null);
      setAssignment(null);
      setError(formatDtmError(err));
    } finally {
      setSearching(false);
    }
  };

  const handleSelectOption = (order: number, opt: DtmAnswerOption) => {
    setAnswers((prev) => ({
      ...prev,
      [String(order)]: prev[String(order)] === opt ? '' : opt,
    }));
  };

  const handleApplyQuickString = (val: string) => {
    const cleaned = val.toUpperCase().replace(/[^ABCD\-_.\s]/g, '');
    setQuickString(cleaned);
    const tokens = cleaned.replace(/\s+/g, '').split('');
    const next: Record<string, DtmAnswerOption | ''> = {};
    for (let i = 1; i <= 60; i++) {
      const ch = tokens[i - 1];
      next[String(i)] = ch === 'A' || ch === 'B' || ch === 'C' || ch === 'D' ? ch : '';
    }
    setAnswers(next);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    if (file.name.toLowerCase().endsWith('.pdf')) {
      setSourceType('OMR_PDF');
    } else {
      setSourceType('OMR_IMAGE');
    }
  };

  const handleClearAnswers = () => {
    const empty: Record<string, DtmAnswerOption | ''> = {};
    for (let i = 1; i <= 60; i++) empty[String(i)] = '';
    setAnswers(empty);
    setQuickString('');
  };

  const handleSubmitAndCheck = async () => {
    if (!student || !assignment) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await submitAndCheckAnswerSheet({
        student,
        assignment,
        answers,
        sourceType,
        fileName: uploadedFileName,
      });
      setSavedResult(result);
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const filledCount = Object.values(answers).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl">
      {scopedOrgId ? (
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            DTM Tashkilot
          </div>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
            Javoblarni tekshirish
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tashkilot o‘quvchisining 7 xonali ID raqami orqali javoblar varaqasini tekshirish
          </p>
        </div>
      ) : (
        <DtmModuleNav
          title="Javoblarni tekshirish"
          subtitle="Javoblar varaqasidagi 7 xonali ID orqali o‘quvchining individual variantini topish va avtomatik baholash"
        />
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: 7-digit ID Lookup */}
      <form
        onSubmit={handleLookup}
        className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
            O‘quvchining 7 xonali ID raqami
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              maxLength={7}
              value={numericIdInput}
              onChange={(e) => setNumericIdInput(e.target.value.replace(/\D/g, '').slice(0, 7))}
              placeholder="Masalan: 1000001"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 font-mono text-base font-bold tracking-widest text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={searching}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Variantni topish
        </button>
      </form>

      {/* Found Student & Assignment */}
      {student && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 font-mono text-sm font-bold text-blue-700 tabular-nums">
                    ID: {student.numericId}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">{student.fullName}</h2>
                  {assignment && <AssignmentStatusBadge status={assignment.status} />}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {student.organizationName} · Sinf/Guruh: {student.groupOrClass || '—'} ·{' '}
                  1-blok: <strong className="text-slate-800">{student.block1SubjectName}</strong> ·{' '}
                  2-blok: <strong className="text-slate-800">{student.block2SubjectName}</strong>
                </p>
              </div>
              {assignment && (
                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-slate-800">
                    {assignment.assignmentCode}
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    Belgilangan javoblar: {filledCount} / 60
                  </div>
                </div>
              )}
            </div>

            {!assignment && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Ushbu o‘quvchi uchun hali faol test varianti yaratilmagan. Avval tashkilot sahifasidan test variantini yarating.
              </div>
            )}
          </div>

          {/* Saved Result Banner */}
          {savedResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="h-5 w-5" />
                    <h3 className="text-base font-bold">
                      Natija saqlandi va avtomatik tekshirildi!
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-emerald-900 tabular-nums">
                    To‘g‘ri: <strong>{savedResult.correctCount}</strong> / {savedResult.totalQuestions}{' '}
                    ({savedResult.percentage}%) · Ball: <strong>{savedResult.score} / 156.0</strong>{' '}
                    (1-blok: {savedResult.block1Correct}/30, 2-blok: {savedResult.block2Correct}/30)
                  </p>
                </div>
                <Link
                  to={scopedOrgId ? '/teacher/dtm/results' : '/dtm/results'}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Natijalar jadvaliga o‘tish
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Answer Input Area */}
          {assignment && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left Tools: Quick Paste & Future OMR Upload */}
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900">
                    Tezkor kiritish (60 harf)
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    1–60 javoblarni ketma-ket kiriting (bo‘sh qoldirish uchun <code className="font-mono">-</code> yozing).
                  </p>
                  <textarea
                    rows={3}
                    value={quickString}
                    onChange={(e) => handleApplyQuickString(e.target.value)}
                    placeholder="Masalan: ABCDABCD..."
                    className="mt-2.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs uppercase tracking-widest outline-none focus:border-blue-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleClearAnswers}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Barchasini tozalash
                  </button>
                </div>

                {/* Future OMR / Scanner Upload Ready Panel */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900">
                    OMR / Skaner varaqasi yuklash (ixtiyoriy)
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Kelajakdagi kamera/OMR integratsiyasi uchun rasm (JPG/PNG) yoki PDF skanerni biriktirish mumkin.
                  </p>
                  <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                    <Upload className="h-4 w-4 text-blue-600" />
                    <span>{uploadedFileName || 'Rasm yoki PDF tanlash'}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileAttach}
                      className="hidden"
                    />
                  </label>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Manba turi: <strong className="text-slate-700">{sourceType}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitAndCheck}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckSquare className="h-4 w-4" />
                  )}
                  Javoblarni tekshirish va saqlash
                </button>
              </div>

              {/* Right: 60-Question Bubble Grid */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {[
                    {
                      title: `1-blok: ${assignment.block1SubjectName} (1–30)`,
                      start: 1,
                      end: 30,
                    },
                    {
                      title: `2-blok: ${assignment.block2SubjectName} (31–60)`,
                      start: 31,
                      end: 60,
                    },
                  ].map((block) => (
                    <div key={block.title}>
                      <h4 className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                        {block.title}
                      </h4>
                      <div className="space-y-1.5">
                        {Array.from(
                          { length: block.end - block.start + 1 },
                          (_, idx) => block.start + idx
                        ).map((qNum) => {
                          const current = answers[String(qNum)] || '';
                          return (
                            <div
                              key={qNum}
                              className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-1 hover:bg-slate-50"
                            >
                              <span className="w-8 font-mono text-xs font-bold text-slate-600 tabular-nums">
                                {qNum}.
                              </span>
                              <div className="flex items-center gap-1.5">
                                {OPTIONS.map((opt) => {
                                  const active = current === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => handleSelectOption(qNum, opt)}
                                      className={`h-7 w-8 rounded-md font-mono text-xs font-bold transition ${
                                        active
                                          ? 'bg-blue-600 text-white shadow-xs'
                                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
