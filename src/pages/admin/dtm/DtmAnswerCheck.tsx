import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Camera,
  SlidersHorizontal,
  X,
  RefreshCw,
  Eye,
  AlertTriangle,
  Smartphone,
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
import {
  canvasFromVideoFrame,
  loadSourceCanvasFromFile,
  OmrCorners,
  OmrPoint,
  OmrQuestionDetection,
  OmrScanResult,
  scanAnswerSheetFromCanvas,
} from '../../../lib/dtmOmrEngine';
import { AssignmentStatusBadge, DtmModuleNav } from './DtmModuleNav';

const OPTIONS: DtmAnswerOption[] = ['A', 'B', 'C', 'D'];

type CornerKey = keyof OmrCorners;
const CORNER_LABELS: Record<CornerKey, string> = {
  tl: 'Yuqori-Chap',
  tr: "Yuqori-O'ng",
  bl: 'Pastki-Chap',
  br: "Pastki-O'ng",
};

function answersToQuickString(
  answersMap: Record<string, DtmAnswerOption | ''>,
  totalQuestions = 90
): string {
  let out = '';
  let lastFilled = 0;
  for (let i = 1; i <= totalQuestions; i++) {
    if (answersMap[String(i)]) lastFilled = i;
  }
  for (let i = 1; i <= lastFilled; i++) {
    out += answersMap[String(i)] || '-';
  }
  return out;
}

export default function DtmAnswerCheck({ scopedOrgId }: { scopedOrgId?: string }) {
  const [numericIdInput, setNumericIdInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [student, setStudent] = useState<DtmStudent | null>(null);
  const [assignment, setAssignment] = useState<DtmAssignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, DtmAnswerOption | ''>>({});
  const [quickString, setQuickString] = useState('');

  // Classic OMR state
  const [sourceType, setSourceType] = useState<DtmAnswerSourceType>('MANUAL');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [omrScanning, setOmrScanning] = useState(false);
  const [omrResult, setOmrResult] = useState<OmrScanResult | null>(null);
  const [resolvedOrders, setResolvedOrders] = useState<Record<number, boolean>>({});
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera modal state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // OMR Inspection / 4-Corner Calibration Modal
  const [inspectOpen, setInspectOpen] = useState(false);
  const [inspectTab, setInspectTab] = useState<'overlay' | 'corners'>('overlay');
  const [draftCorners, setDraftCorners] = useState<OmrCorners | null>(null);
  const [draggingCorner, setDraggingCorner] = useState<CornerKey | null>(null);
  const cornerStageRef = useRef<HTMLDivElement | null>(null);

  const [savedResult, setSavedResult] = useState<DtmResult | null>(null);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  useEffect(() => {
    if (!cameraOpen) {
      stopCameraStream();
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      stopCameraStream();
      setCameraError('');
      setCameraReady(false);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Brauzeringiz kamerani qo‘llab-quvvatlamaydi. Rasm yuklash tugmasidan foydalaning.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: cameraFacingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCameraReady(true);
        }
      } catch {
        setCameraError(
          "Kameraga ruxsat berilmadi yoki kamera topilmadi. Iltimos ruxsat bering yoki rasm/PDF yuklang."
        );
      }
    };

    void startCamera();
    return () => {
      cancelled = true;
      stopCameraStream();
    };
  }, [cameraOpen, cameraFacingMode]);

  const omrQuestionMap = useMemo(() => {
    const map: Record<number, OmrQuestionDetection> = {};
    if (omrResult) {
      for (const q of omrResult.questions) {
        map[q.order] = q;
      }
    }
    return map;
  }, [omrResult]);

  const hasMandatory =
    Boolean(assignment?.mandatoryQuestions && assignment.mandatoryQuestions.length > 0) ||
    assignment?.totalQuestions === 90;
  const totalQuestionsCount = assignment?.totalQuestions || (hasMandatory ? 90 : 60);
  const omrQuestionCount: 60 | 90 = totalQuestionsCount === 60 ? 60 : 90;

  const applyOmrResult = (
    res: OmrScanResult,
    nextSourceType: DtmAnswerSourceType,
    fileName: string,
    qTotal = totalQuestionsCount
  ) => {
    setOmrResult(res);
    setDraftCorners(res.corners);
    setResolvedOrders({});
    setAnswers(res.answers);
    setQuickString(answersToQuickString(res.answers, qTotal));
    setSourceType(nextSourceType);
    setUploadedFileName(fileName);
    if (!res.autoDetected) {
      setInspectTab('corners');
    } else {
      setInspectTab('overlay');
    }
  };

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
    setOmrResult(null);
    setDraftCorners(null);
    setResolvedOrders({});
    setUploadedFileName(null);
    setSourceType('MANUAL');
    sourceCanvasRef.current = null;

    try {
      const { student: foundStudent, assignment: foundAssignment } =
        await getLatestAssignmentByStudentNumericId(cleaned, scopedOrgId);
      setStudent(foundStudent);
      setAssignment(foundAssignment);

      const qCount =
        foundAssignment?.totalQuestions ||
        (foundAssignment?.mandatoryQuestions?.length ? 90 : 60);
      const initial: Record<string, DtmAnswerOption | ''> = {};
      for (let i = 1; i <= qCount; i++) initial[String(i)] = '';
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
    setAnswers((prev) => {
      const nextValue: DtmAnswerOption | '' = prev[String(order)] === opt ? '' : opt;
      const next: Record<string, DtmAnswerOption | ''> = {
        ...prev,
        [String(order)]: nextValue,
      };
      setQuickString(answersToQuickString(next, totalQuestionsCount));
      return next;
    });
    setResolvedOrders((prev) => ({ ...prev, [order]: true }));
  };

  const handleApplyQuickString = (val: string) => {
    const cleaned = val.toUpperCase().replace(/[^ABCD\-_.\s]/g, '');
    setQuickString(cleaned);
    const tokens = cleaned.replace(/\s+/g, '').split('');
    const next: Record<string, DtmAnswerOption | ''> = {};
    for (let i = 1; i <= totalQuestionsCount; i++) {
      const ch = tokens[i - 1];
      next[String(i)] = ch === 'A' || ch === 'B' || ch === 'C' || ch === 'D' ? ch : '';
    }
    setAnswers(next);
  };

  const handleFileAttach = async (
    e: React.ChangeEvent<HTMLInputElement>,
    preferredSource?: DtmAnswerSourceType
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setOmrScanning(true);
    setError('');
    try {
      const canvas = await loadSourceCanvasFromFile(file);
      sourceCanvasRef.current = canvas;
      const result = scanAnswerSheetFromCanvas(canvas, undefined, { questionCount: omrQuestionCount });
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const resolvedSource: DtmAnswerSourceType =
        preferredSource || (isPdf ? 'OMR_PDF' : 'OMR_IMAGE');

      applyOmrResult(result, resolvedSource, file.name, omrQuestionCount);
      if (!result.autoDetected) {
        setInspectOpen(true);
      }
    } catch (err) {
      setError(formatDtmError(err, "OMR varaqasini o'qishda xatolik yuz berdi."));
    } finally {
      setOmrScanning(false);
    }
  };

  const handleCaptureCameraFrame = () => {
    if (!videoRef.current || !cameraReady) return;
    setOmrScanning(true);
    setError('');
    try {
      const canvas = canvasFromVideoFrame(videoRef.current);
      sourceCanvasRef.current = canvas;
      const result = scanAnswerSheetFromCanvas(canvas, undefined, { questionCount: omrQuestionCount });
      const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
      applyOmrResult(result, 'OMR_CAMERA', `camera_${stamp}.jpg`, omrQuestionCount);
      setCameraOpen(false);
      if (!result.autoDetected) {
        setInspectOpen(true);
      }
    } catch (err) {
      setError(formatDtmError(err, "Kamera rasmini OMR orqali o'qishda xatolik."));
    } finally {
      setOmrScanning(false);
    }
  };

  const handleRescanWithManualCorners = () => {
    if (!sourceCanvasRef.current || !draftCorners) return;
    setOmrScanning(true);
    setError('');
    try {
      const result = scanAnswerSheetFromCanvas(sourceCanvasRef.current, draftCorners, {
        questionCount: omrQuestionCount,
      });
      applyOmrResult(
        result,
        sourceType === 'MANUAL' ? 'OMR_IMAGE' : sourceType,
        uploadedFileName || 'omr_scan.jpg',
        omrQuestionCount
      );
      setInspectTab('overlay');
    } catch (err) {
      setError(formatDtmError(err, "Burchaklar bo'yicha qayta o'qib bo'lmadi."));
    } finally {
      setOmrScanning(false);
    }
  };

  const updateCornerFromPointer = (clientX: number, clientY: number, key: CornerKey) => {
    const stage = cornerStageRef.current;
    if (!stage || !omrResult) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const nextPt: OmrPoint = {
      x: normX * omrResult.sourceWidth,
      y: normY * omrResult.sourceHeight,
    };

    setDraftCorners((prev) => (prev ? { ...prev, [key]: nextPt } : prev));
  };

  const handleClearAnswers = () => {
    const empty: Record<string, DtmAnswerOption | ''> = {};
    for (let i = 1; i <= totalQuestionsCount; i++) empty[String(i)] = '';
    setAnswers(empty);
    setQuickString('');
    setOmrResult(null);
    setDraftCorners(null);
    setResolvedOrders({});
    setUploadedFileName(null);
    setSourceType('MANUAL');
    sourceCanvasRef.current = null;
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
        ocrConfidence: omrResult?.ocrConfidence ?? (sourceType === 'MANUAL' ? 100 : null),
      });
      setSavedResult(result);
    } catch (err) {
      setError(formatDtmError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToQuestion = (order: number) => {
    const el = document.getElementById(`dtm-q-row-${order}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const filledCount = Object.values(answers).filter(Boolean).length;
  const unresolvedAmbiguous = (omrResult?.ambiguousOrders || []).filter((o) => !resolvedOrders[o]);
  const unresolvedLowConf = (omrResult?.lowConfidenceOrders || []).filter((o) => !resolvedOrders[o]);

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
                    Belgilangan javoblar: {filledCount} / {totalQuestionsCount}
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
                    ({savedResult.percentage}%) · Ball:{' '}
                    <strong>
                      {savedResult.score} / {savedResult.maxScore || (savedResult.totalQuestions === 90 ? 189 : 156)}.0
                    </strong>{' '}
                    (
                    {savedResult.mandatoryCorrect !== undefined
                      ? `Majburiy: ${savedResult.mandatoryCorrect}/30, `
                      : ''}
                    1-blok: {savedResult.block1Correct}/30, 2-blok: {savedResult.block2Correct}/30)
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
              {/* Left Tools: Classic OMR Camera/Scanner + Quick Paste */}
              <div className="space-y-4">
                {/* Classic OMR / Camera Scanner Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Klassik OMR / Kamera skaneri
                    </h3>
                    {omrResult && (
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                          omrResult.ocrConfidence >= 80
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        Aniqlik: {omrResult.ocrConfidence}%
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Javoblar varaqasini kamera orqali suratga oling yoki JPG/PNG/PDF faylni yuklang — tizim {totalQuestionsCount} ta javobni avtomatik o‘qiydi.
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      disabled={omrScanning}
                      onClick={() => setCameraOpen(true)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Camera className="h-4 w-4 text-emerald-400" />
                      Kamera orqali skanerlash
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                        <Upload className="h-3.5 w-3.5 text-blue-600" />
                        <span>Rasm / PDF</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileAttach(e)}
                          className="hidden"
                        />
                      </label>

                      <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                        <Smartphone className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Foto olish</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleFileAttach(e, 'OMR_CAMERA')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {omrScanning && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      OMR katakchalari tahlil qilinmoqda...
                    </div>
                  )}

                  {omrResult && !omrScanning && (
                    <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">Fayl:</span>
                        <span className="max-w-[160px] truncate font-mono text-[11px] font-semibold text-slate-800">
                          {uploadedFileName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">O‘qilgan javoblar:</span>
                        <span className="font-bold text-slate-900 tabular-nums">
                          {omrResult.filledCount} / {totalQuestionsCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">4 burchak belgilari:</span>
                        <span
                          className={`font-semibold ${
                            omrResult.autoDetected ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {omrResult.autoDetected ? 'Avtomatik topildi' : "Qo'lda to'g'rilang"}
                        </span>
                      </div>

                      {!omrResult.autoDetected && (
                        <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            Varaqaning 4 qora burchak kvadrati aniq topilmadi. Pastdagi tugma orqali burchaklarni to‘g‘rilab qayta o‘qing.
                          </span>
                        </div>
                      )}

                      {unresolvedAmbiguous.length > 0 && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
                          <div className="font-semibold">
                            2+ belgi qo‘yilgan savollar ({unresolvedAmbiguous.length}):
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {unresolvedAmbiguous.map((ord) => (
                              <button
                                key={ord}
                                type="button"
                                onClick={() => scrollToQuestion(ord)}
                                className="rounded bg-rose-100 px-1.5 py-0.5 font-mono font-bold text-rose-700 hover:bg-rose-200"
                              >
                                #{ord}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {unresolvedLowConf.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                          <div className="font-semibold">
                            Shubhali katakchalar ({unresolvedLowConf.length}):
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {unresolvedLowConf.map((ord) => (
                              <button
                                key={ord}
                                type="button"
                                onClick={() => scrollToQuestion(ord)}
                                className="rounded bg-amber-100 px-1.5 py-0.5 font-mono font-bold text-amber-800 hover:bg-amber-200"
                              >
                                #{ord}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setInspectOpen(true)}
                        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
                        Varaqani ko‘rish / Burchaklarni to‘g‘rilash
                      </button>
                    </div>
                  )}

                  <div className="mt-2.5 text-[11px] text-slate-500">
                    Manba turi: <strong className="text-slate-700">{sourceType}</strong>
                  </div>
                </div>

                {/* Quick Paste Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900">
                    Tezkor kiritish ({totalQuestionsCount} harf)
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    1–{totalQuestionsCount} javoblarni ketma-ket kiriting (bo‘sh qoldirish uchun <code className="font-mono">-</code> yozing).
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

                <button
                  type="button"
                  disabled={submitting || omrScanning}
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

              {/* Right: 90-Question (3 cols) or Legacy 60-Question (2 cols) Bubble Grid */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
                <div
                  className={`grid grid-cols-1 gap-5 ${
                    hasMandatory ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'
                  }`}
                >
                  {(hasMandatory
                    ? [
                        {
                          title: 'Majburiy fanlar (1–30 · 1.1)',
                          start: 1,
                          end: 30,
                          isMandatoryCol: true,
                        },
                        {
                          title: `1-blok: ${assignment.block1SubjectName} (31–60)`,
                          start: 31,
                          end: 60,
                          isMandatoryCol: false,
                        },
                        {
                          title: `2-blok: ${assignment.block2SubjectName} (61–90)`,
                          start: 61,
                          end: 90,
                          isMandatoryCol: false,
                        },
                      ]
                    : [
                        {
                          title: `1-blok: ${assignment.block1SubjectName} (1–30)`,
                          start: 1,
                          end: 30,
                          isMandatoryCol: false,
                        },
                        {
                          title: `2-blok: ${assignment.block2SubjectName} (31–60)`,
                          start: 31,
                          end: 60,
                          isMandatoryCol: false,
                        },
                      ]
                  ).map((block) => (
                    <div key={block.title}>
                      <h4
                        className={`mb-3 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider ${
                          block.isMandatoryCol
                            ? 'bg-indigo-50 text-indigo-900'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {block.title}
                      </h4>
                      <div className="space-y-1.5">
                        {Array.from(
                          { length: block.end - block.start + 1 },
                          (_, idx) => block.start + idx
                        ).map((qNum) => {
                          const current = answers[String(qNum)] || '';
                          const omrDet = omrQuestionMap[qNum];
                          const isUnresolved = !resolvedOrders[qNum];
                          const isMultiple = isUnresolved && omrDet?.status === 'MULTIPLE';
                          const isLowConf = isUnresolved && omrDet?.status === 'LOW_CONFIDENCE';
                          const subLabel =
                            block.isMandatoryCol && qNum === 1
                              ? 'Ona tili (1–10)'
                              : block.isMandatoryCol && qNum === 11
                              ? 'Matematika (11–20)'
                              : block.isMandatoryCol && qNum === 21
                              ? "O'zbekiston tarixi (21–30)"
                              : null;

                          return (
                            <React.Fragment key={qNum}>
                              {subLabel && (
                                <div className="pt-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                                  {subLabel}
                                </div>
                              )}
                              <div
                                id={`dtm-q-row-${qNum}`}
                                className={`flex items-center justify-between rounded-lg border px-2 py-1 transition ${
                                  isMultiple
                                    ? 'border-rose-300 bg-rose-50/70'
                                    : isLowConf
                                    ? 'border-amber-300 bg-amber-50/70'
                                    : 'border-slate-100 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  <span className="w-6 font-mono text-xs font-bold text-slate-600 tabular-nums">
                                    {qNum}.
                                  </span>
                                  {isMultiple && (
                                    <span className="rounded bg-rose-100 px-1 py-0.5 text-[10px] font-bold text-rose-700">
                                      2+
                                    </span>
                                  )}
                                  {isLowConf && (
                                    <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-800">
                                      ?
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {OPTIONS.map((opt) => {
                                    const active = current === opt;
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => handleSelectOption(qNum, opt)}
                                        className={`h-7 w-7 rounded-md font-mono text-xs font-bold transition ${
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
                            </React.Fragment>
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

      {/* LIVE CAMERA CAPTURE MODAL */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-bold">OMR Kamera Skaneri</h3>
                <p className="text-xs text-slate-400">
                  Javoblar varaqasining 4 burchagidagi qora kvadratlarni ramkaga to‘g‘ri tuting
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCameraOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex aspect-[3/4] max-h-[65vh] w-full items-center justify-center bg-black sm:aspect-[4/3]">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-contain"
              />

              {/* A4 Portrait Alignment Overlay */}
              {!cameraError && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                  <div className="relative aspect-[595/842] h-full max-h-full rounded-lg border-2 border-dashed border-emerald-400/70">
                    <span className="absolute -left-1 -top-1 h-5 w-5 border-l-4 border-t-4 border-emerald-400" />
                    <span className="absolute -right-1 -top-1 h-5 w-5 border-r-4 border-t-4 border-emerald-400" />
                    <span className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-emerald-400" />
                    <span className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-emerald-400" />
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center">
                  <AlertCircle className="h-10 w-10 text-rose-400" />
                  <p className="mt-3 max-w-sm text-sm text-slate-200">{cameraError}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-4">
              <button
                type="button"
                onClick={() =>
                  setCameraFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Kamerani almashtirish
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCameraOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={!cameraReady || omrScanning}
                  onClick={handleCaptureCameraFrame}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                  Suratga olish va o‘qish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OMR INSPECTION & 4-CORNER CALIBRATION MODAL */}
      {inspectOpen && omrResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  OMR Tekshirish va 4 burchakni moslash
                </h3>
                <p className="text-xs text-slate-500">
                  Yashil — aniq o‘qilgan, sariq — shubhali, qizil — 2+ belgi qo‘yilgan katakchalar
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectTab('overlay')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    inspectTab === 'overlay'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Tekshirilgan ko‘rinish
                </button>
                <button
                  type="button"
                  onClick={() => setInspectTab('corners')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    inspectTab === 'corners'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  4 burchakni surish
                </button>
                <button
                  type="button"
                  onClick={() => setInspectOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 p-4">
              {inspectTab === 'overlay' ? (
                <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs">
                  <img
                    src={omrResult.warpedOverlayDataUrl}
                    alt="Tekshirilgan OMR varaqasi"
                    className="h-auto w-full select-none"
                  />
                </div>
              ) : (
                <div className="mx-auto max-w-2xl space-y-3">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs text-blue-800">
                    Har bir ko‘k doirani varaqaning 4 burchagidagi <strong>qora kvadrat markaziga</strong> surib joylashtiring, so‘ngra <strong>&ldquo;Qayta o‘qish&rdquo;</strong> tugmasini bosing.
                  </div>

                  {draftCorners && (
                    <div
                      ref={cornerStageRef}
                      onPointerMove={(e) => {
                        if (draggingCorner) {
                          updateCornerFromPointer(e.clientX, e.clientY, draggingCorner);
                        }
                      }}
                      onPointerUp={() => setDraggingCorner(null)}
                      onPointerCancel={() => setDraggingCorner(null)}
                      className="relative mx-auto w-full select-none overflow-hidden rounded-xl border border-slate-300 bg-black touch-none"
                    >
                      <img
                        src={omrResult.sourceDataUrl}
                        alt="Asl yuklangan rasm"
                        draggable={false}
                        className="block h-auto w-full select-none"
                      />

                      {/* Connecting quadrilateral polygon */}
                      <svg
                        viewBox={`0 0 ${omrResult.sourceWidth} ${omrResult.sourceHeight}`}
                        className="pointer-events-none absolute inset-0 h-full w-full"
                      >
                        <polygon
                          points={`${draftCorners.tl.x},${draftCorners.tl.y} ${draftCorners.tr.x},${draftCorners.tr.y} ${draftCorners.br.x},${draftCorners.br.y} ${draftCorners.bl.x},${draftCorners.bl.y}`}
                          fill="rgba(37, 99, 235, 0.12)"
                          stroke="#2563eb"
                          strokeWidth={Math.max(2, omrResult.sourceWidth * 0.004)}
                        />
                      </svg>

                      {/* 4 Draggable Handles */}
                      {(['tl', 'tr', 'bl', 'br'] as CornerKey[]).map((key) => {
                        const pt = draftCorners[key];
                        const leftPct = (pt.x / omrResult.sourceWidth) * 100;
                        const topPct = (pt.y / omrResult.sourceHeight) * 100;
                        return (
                          <button
                            key={key}
                            type="button"
                            title={CORNER_LABELS[key]}
                            onPointerDown={(e) => {
                              e.currentTarget.setPointerCapture(e.pointerId);
                              setDraggingCorner(key);
                              updateCornerFromPointer(e.clientX, e.clientY, key);
                            }}
                            onPointerMove={(e) => {
                              if (draggingCorner === key) {
                                updateCornerFromPointer(e.clientX, e.clientY, key);
                              }
                            }}
                            onPointerUp={() => setDraggingCorner(null)}
                            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-600/90 text-[9px] font-bold text-white shadow-md">
                              {key.toUpperCase()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3.5">
              <div className="text-xs text-slate-600 tabular-nums">
                Aniqlik: <strong>{omrResult.ocrConfidence}%</strong> · O‘qilgan javoblar:{' '}
                <strong>{omrResult.filledCount}/{totalQuestionsCount}</strong>
              </div>
              <div className="flex items-center gap-2">
                {inspectTab === 'corners' && (
                  <button
                    type="button"
                    disabled={omrScanning}
                    onClick={handleRescanWithManualCorners}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {omrScanning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Shu burchaklar bilan qayta o‘qish
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
