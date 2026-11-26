import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  DtmPdfAssignmentPayload,
  DtmPdfQuestionSnapshot,
  generateAnswerSheetPdfBuffer,
  generateTestBookletPdfBuffer,
} from "./dtmPdfService.js";

export type DtmOptionLetter = "A" | "B" | "C" | "D";
export type DtmMandatoryGroup = "ONA_TILI" | "MATEMATIKA" | "TARIX";

const MANDATORY_SPECS: Array<{
  group: DtmMandatoryGroup;
  label: string;
  questionCount: number;
}> = [
  { group: "ONA_TILI", label: "Ona tili (Majburiy)", questionCount: 10 },
  { group: "MATEMATIKA", label: "Matematika (Majburiy)", questionCount: 10 },
  { group: "TARIX", label: "O'zbekiston tarixi (Majburiy)", questionCount: 10 },
];

export interface EligibleDtmSubject {
  id: string;
  name: string;
  code: string;
  activeCount: number;
}

export interface TelegramDtmPurchaseResult {
  assignmentCode: string;
  numericId: string;
  mandatorySubjectsLabel: string;
  block1SubjectName: string;
  block2SubjectName: string;
  totalQuestions: number;
  testPdfBuffer: Buffer;
  answerPdfBuffer: Buffer;
}

function inferMandatoryGroupFromName(name: string): DtmMandatoryGroup | "" {
  const norm = String(name || "").toLowerCase().trim();
  if (!norm) return "";
  if (
    norm.includes("ona tili") ||
    norm.includes("onatili") ||
    norm.includes("onatil") ||
    norm.includes("o'zbek tili") ||
    norm.includes("o‘zbek tili") ||
    norm.includes("uzbek tili")
  ) {
    return "ONA_TILI";
  }
  if (norm.includes("matematika") || norm.includes("math")) return "MATEMATIKA";
  if (norm.includes("tarix")) return "TARIX";
  return "";
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shuffleQuestionOptions(q: any): {
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: DtmOptionLetter;
} {
  const letters: DtmOptionLetter[] = ["A", "B", "C", "D"];
  const originalCorrect = (letters.includes(q.correctAnswer) ? q.correctAnswer : "A") as DtmOptionLetter;
  const entries = [
    { key: "A" as DtmOptionLetter, text: String(q.optionA || "") },
    { key: "B" as DtmOptionLetter, text: String(q.optionB || "") },
    { key: "C" as DtmOptionLetter, text: String(q.optionC || "") },
    { key: "D" as DtmOptionLetter, text: String(q.optionD || "") },
  ];

  const shuffled = shuffleArray(entries);
  const newCorrectIdx = shuffled.findIndex((item) => item.key === originalCorrect);
  const newCorrectAnswer = letters[newCorrectIdx >= 0 ? newCorrectIdx : 0];

  return {
    optionA: shuffled[0].text,
    optionB: shuffled[1].text,
    optionC: shuffled[2].text,
    optionD: shuffled[3].text,
    correctAnswer: newCorrectAnswer,
  };
}

function pickQuestionsPreferringUnseen(
  pool: any[],
  count: number,
  seenOriginalIds: Set<string>,
  startOrder: number,
  blockLabel: string,
  subjectName: string,
  mandatoryGroup: DtmMandatoryGroup | "" = ""
): DtmPdfQuestionSnapshot[] {
  const unseen = shuffleArray(pool.filter((q) => !seenOriginalIds.has(q.id)));
  const seen = shuffleArray(pool.filter((q) => seenOriginalIds.has(q.id)));
  const selected = [...unseen, ...seen].slice(0, count);

  return selected.map((q, idx) => {
    const shuffled = shuffleQuestionOptions(q);
    return {
      order: startOrder + idx,
      questionId: q.id,
      originalQuestionId: q.id,
      questionText: String(q.questionText || ""),
      optionA: shuffled.optionA,
      optionB: shuffled.optionB,
      optionC: shuffled.optionC,
      optionD: shuffled.optionD,
      correctAnswer: shuffled.correctAnswer,
      subjectId: String(q.subjectId || ""),
      subjectName,
      block: blockLabel,
      mandatoryGroup,
    };
  });
}

export async function getEligibleDtmSubjects(db: any): Promise<EligibleDtmSubject[]> {
  const [subSnap, qSnap] = await Promise.all([
    getDocs(collection(db, "dtmSubjects")),
    getDocs(collection(db, "dtmQuestions")),
  ]);

  const activeCounts: Record<string, number> = {};
  qSnap.forEach((docSnap) => {
    const data = docSnap.data() as any;
    const isMandatoryQ = Boolean(data.isMandatory || data.block === "majburiy");
    if (data.status === "ACTIVE" && data.subjectId && !isMandatoryQ) {
      activeCounts[data.subjectId] = (activeCounts[data.subjectId] || 0) + 1;
    }
  });

  const subjects: EligibleDtmSubject[] = [];
  subSnap.forEach((docSnap) => {
    const data = docSnap.data() as any;
    const isMandatorySub = Boolean(data.isMandatory || data.blockType === "majburiy");
    if (data.status === "ACTIVE" && !isMandatorySub) {
      const count = activeCounts[docSnap.id] || 0;
      if (count >= 30) {
        subjects.push({
          id: docSnap.id,
          name: String(data.name || "Nomsiz fan"),
          code: String(data.code || ""),
          activeCount: count,
        });
      }
    }
  });

  return subjects.sort((a, b) => a.name.localeCompare(b.name, "uz"));
}

export async function createTelegramDtmAssignmentAndPdfs(
  db: any,
  params: {
    telegramUserId: number;
    fullName: string;
    block1SubjectId: string;
    block2SubjectId: string;
  }
): Promise<TelegramDtmPurchaseResult> {
  const { telegramUserId, fullName, block1SubjectId, block2SubjectId } = params;

  const [b1SubSnap, b2SubSnap, allSubSnap, allActiveQSnap, prevAssignSnap] = await Promise.all([
    getDoc(doc(db, "dtmSubjects", block1SubjectId)),
    getDoc(doc(db, "dtmSubjects", block2SubjectId)),
    getDocs(collection(db, "dtmSubjects")),
    getDocs(query(collection(db, "dtmQuestions"), where("status", "==", "ACTIVE"))),
    getDocs(
      query(collection(db, "dtmAssignments"), where("telegramUserId", "==", telegramUserId))
    ),
  ]);

  if (!b1SubSnap.exists() || !b2SubSnap.exists()) {
    throw new Error("Tanlangan fanlardan biri bazada topilmadi.");
  }

  const subjectById = new Map<string, any>();
  allSubSnap.docs.forEach((d) => {
    subjectById.set(d.id, { id: d.id, ...(d.data() as any) });
  });

  const block1SubjectName = String((b1SubSnap.data() as any).name || "1-blok fani");
  const block2SubjectName = String((b2SubSnap.data() as any).name || "2-blok fani");

  const allActiveQuestions = allActiveQSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  const isQuestionMandatory = (q: any): boolean => {
    const sub = subjectById.get(q.subjectId);
    return Boolean(
      q.isMandatory ||
        q.block === "majburiy" ||
        sub?.isMandatory ||
        sub?.blockType === "majburiy"
    );
  };

  const resolveMandatoryGroup = (q: any): DtmMandatoryGroup | "" => {
    const sub = subjectById.get(q.subjectId);
    return (
      q.mandatoryGroup ||
      sub?.mandatoryGroup ||
      inferMandatoryGroupFromName(sub?.name || q.subjectName || "")
    );
  };

  const mandatoryPools: Record<DtmMandatoryGroup, any[]> = {
    ONA_TILI: [],
    MATEMATIKA: [],
    TARIX: [],
  };
  for (const q of allActiveQuestions) {
    if (!isQuestionMandatory(q)) continue;
    const grp = resolveMandatoryGroup(q);
    if (grp && mandatoryPools[grp]) {
      mandatoryPools[grp].push(q);
    }
  }

  for (const spec of MANDATORY_SPECS) {
    const avail = mandatoryPools[spec.group].length;
    if (avail < spec.questionCount) {
      throw new Error(
        `Majburiy "${spec.label}" fani bo'yicha kamida ${spec.questionCount} ta faol majburiy test savoli kerak (hozir: ${avail} ta).`
      );
    }
  }

  const b1Pool = allActiveQuestions.filter(
    (q) => q.subjectId === block1SubjectId && !isQuestionMandatory(q)
  );
  const b2Pool = allActiveQuestions.filter(
    (q) => q.subjectId === block2SubjectId && !isQuestionMandatory(q)
  );

  if (b1Pool.length < 30) {
    throw new Error(`1-blok (${block1SubjectName}) fanida kamida 30 ta faol asosiy test kerak (hozir: ${b1Pool.length}).`);
  }
  if (b2Pool.length < 30) {
    throw new Error(`2-blok (${block2SubjectName}) fanida kamida 30 ta faol asosiy test kerak (hozir: ${b2Pool.length}).`);
  }

  // Avoid repeating questions from earlier purchases by the same Telegram user whenever possible
  const seenOriginalIds = new Set<string>();
  prevAssignSnap.forEach((docSnap) => {
    const a = docSnap.data() as any;
    (a.mandatoryQuestions || []).forEach((q: any) => {
      if (q?.originalQuestionId) seenOriginalIds.add(String(q.originalQuestionId));
    });
    (a.block1Questions || []).forEach((q: any) => {
      if (q?.originalQuestionId) seenOriginalIds.add(String(q.originalQuestionId));
    });
    (a.block2Questions || []).forEach((q: any) => {
      if (q?.originalQuestionId) seenOriginalIds.add(String(q.originalQuestionId));
    });
  });

  const mandatoryQuestions: DtmPdfQuestionSnapshot[] = [
    ...pickQuestionsPreferringUnseen(
      mandatoryPools.ONA_TILI,
      10,
      seenOriginalIds,
      1,
      "majburiy",
      "Ona tili (Majburiy)",
      "ONA_TILI"
    ),
    ...pickQuestionsPreferringUnseen(
      mandatoryPools.MATEMATIKA,
      10,
      seenOriginalIds,
      11,
      "majburiy",
      "Matematika (Majburiy)",
      "MATEMATIKA"
    ),
    ...pickQuestionsPreferringUnseen(
      mandatoryPools.TARIX,
      10,
      seenOriginalIds,
      21,
      "majburiy",
      "O'zbekiston tarixi (Majburiy)",
      "TARIX"
    ),
  ];

  const block1Questions = pickQuestionsPreferringUnseen(
    b1Pool,
    30,
    seenOriginalIds,
    31,
    "1-blok",
    block1SubjectName
  );
  const block1UsedIds = new Set(block1Questions.map((q) => q.originalQuestionId || q.questionId));
  const b2EligiblePool = b2Pool.filter((q) => !block1UsedIds.has(q.id));
  if (b2EligiblePool.length < 30) {
    throw new Error(`2-blok (${block2SubjectName}) fanida takrorlanmas kamida 30 ta faol asosiy test kerak.`);
  }
  const block2Questions = pickQuestionsPreferringUnseen(
    b2EligiblePool,
    30,
    seenOriginalIds,
    61,
    "2-blok",
    block2SubjectName
  );

  const studentCounterRef = doc(db, "dtmCounters", "student_numeric_id");
  const assignCounterRef = doc(db, "dtmCounters", "assignment_seq_2026");
  const studentId = `tg_${telegramUserId}`;
  const cleanName = (fullName || `Telegram_${telegramUserId}`).trim().slice(0, 180);
  const mandatorySubjectsLabel = "Ona tili, Matematika, O'zbekiston tarixi";

  const { assignmentCode, numericId, payload } = await runTransaction(db, async (tx) => {
    const [stuCounterSnap, assignCounterSnap] = await Promise.all([
      tx.get(studentCounterRef),
      tx.get(assignCounterRef),
    ]);

    const nextNumericNum = stuCounterSnap.exists()
      ? Number(stuCounterSnap.data().nextValue || 1000001)
      : 1000001;
    const allocatedNumericId = String(nextNumericNum).padStart(7, "0");

    const nextAssignSeq = assignCounterSnap.exists()
      ? Number(assignCounterSnap.data().nextValue || 1)
      : 1;
    const year = new Date().getFullYear();
    const generatedCode = `DTM-${year}-${String(nextAssignSeq).padStart(6, "0")}`;

    const assignRef = doc(db, "dtmAssignments", generatedCode);

    const assignmentPayload: Omit<DtmPdfAssignmentPayload, "id"> & Record<string, any> = {
      assignmentCode: generatedCode,
      version: 1,
      isLatest: true,
      organizationId: "telegram_bot",
      organizationName: "Telegram Bot (@AIEDUTIZIM_bot)",
      studentId,
      studentNumericId: allocatedNumericId,
      studentFullName: cleanName,
      studentGroupOrClass: "Telegram Bot",
      telegramUserId,
      sourceChannel: "TELEGRAM_BOT",
      mandatorySubjectsLabel,
      mandatoryQuestions,
      block1SubjectId,
      block1SubjectName,
      block2SubjectId,
      block2SubjectName,
      block1Questions,
      block2Questions,
      totalQuestions: 90,
      status: "DOWNLOADED",
      generatedBy: `tg_${telegramUserId}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    tx.set(
      studentCounterRef,
      { nextValue: nextNumericNum + 1, updatedAt: serverTimestamp() },
      { merge: true }
    );
    tx.set(
      assignCounterRef,
      { nextValue: nextAssignSeq + 1, updatedAt: serverTimestamp() },
      { merge: true }
    );
    tx.set(assignRef, assignmentPayload);

    return {
      assignmentCode: generatedCode,
      numericId: allocatedNumericId,
      payload: {
        ...assignmentPayload,
        id: generatedCode,
      },
    };
  });

  const [testPdfBuffer, answerPdfBuffer] = await Promise.all([
    generateTestBookletPdfBuffer(payload),
    generateAnswerSheetPdfBuffer(payload),
  ]);

  return {
    assignmentCode,
    numericId,
    mandatorySubjectsLabel,
    block1SubjectName,
    block2SubjectName,
    totalQuestions: 90,
    testPdfBuffer,
    answerPdfBuffer,
  };
}

export async function listUserTelegramDtmAssignments(
  db: any,
  telegramUserId: number
): Promise<any[]> {
  const snap = await getDocs(
    query(collection(db, "dtmAssignments"), where("telegramUserId", "==", telegramUserId))
  );
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return items.sort((a, b) => {
    const ta = a.createdAt?.seconds || 0;
    const tb = b.createdAt?.seconds || 0;
    return tb - ta;
  });
}

export async function getDtmAssignmentByCode(db: any, codeInput: string): Promise<any | null> {
  const code = String(codeInput || "").trim().toUpperCase();
  if (!code) return null;

  const directSnap = await getDoc(doc(db, "dtmAssignments", code));
  if (directSnap.exists()) {
    return { id: directSnap.id, ...(directSnap.data() as any) };
  }

  const qSnap = await getDocs(
    query(collection(db, "dtmAssignments"), where("assignmentCode", "==", code))
  );
  if (!qSnap.empty) {
    const d = qSnap.docs[0];
    return { id: d.id, ...(d.data() as any) };
  }

  return null;
}

export async function getResultByAssignmentId(db: any, assignmentId: string): Promise<any | null> {
  const snap = await getDocs(
    query(collection(db, "dtmResults"), where("assignmentId", "==", assignmentId))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as any) };
}

export function parseQuickAnswerString(
  rawInput: string,
  expectedCount = 60
): { ok: true; answers: Record<string, DtmOptionLetter | "">; enteredLength: number } | { ok: false; error: string } {
  const compact = String(rawInput || "")
    .toUpperCase()
    .replace(/\s+/g, "");

  if (!compact) {
    return {
      ok: false,
      error: `Javoblar matni bo'sh. 1–${expectedCount} javoblarni kiriting (masalan: ABCDABCD...).`,
    };
  }

  if (compact.length > expectedCount) {
    return {
      ok: false,
      error: `Siz ${compact.length} ta belgi kiritdingiz. Maksimum ${expectedCount} ta belgi bo'lishi kerak.`,
    };
  }

  if (!/^[ABCD\-_.]+$/.test(compact)) {
    return {
      ok: false,
      error:
        "Faqat A, B, C, D harflari va bo'sh qoldirish uchun - (chiziqcha) belgisidan foydalaning.",
    };
  }

  const answers: Record<string, DtmOptionLetter | ""> = {};
  for (let i = 1; i <= expectedCount; i++) {
    const ch = compact[i - 1];
    answers[String(i)] = ch === "A" || ch === "B" || ch === "C" || ch === "D" ? ch : "";
  }

  return { ok: true, answers, enteredLength: compact.length };
}

export async function gradeTelegramDtmAssignment(
  db: any,
  params: {
    assignment: any;
    telegramUserId: number;
    answers: Record<string, DtmOptionLetter | "">;
  }
): Promise<{ alreadyChecked: boolean; result: any }> {
  const { assignment, telegramUserId, answers } = params;

  const existing = await getResultByAssignmentId(db, assignment.id);
  if (existing || assignment.status === "CHECKED") {
    return {
      alreadyChecked: true,
      result: existing,
    };
  }

  const hasMandatory =
    Array.isArray(assignment.mandatoryQuestions) && assignment.mandatoryQuestions.length > 0;

  const allQuestions = [
    ...(assignment.mandatoryQuestions || []),
    ...(assignment.block1Questions || []),
    ...(assignment.block2Questions || []),
  ].sort((a: any, b: any) => Number(a.order) - Number(b.order));

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  let mandatoryCorrect = 0;
  const mandatoryBreakdown = { onaTili: 0, matematika: 0, tarix: 0 };
  let block1Correct = 0;
  let block2Correct = 0;

  const questionBreakdown = allQuestions.map((q: any) => {
    const order = Number(q.order);
    const selected = (answers[String(order)] || "") as DtmOptionLetter | "";
    const isCorrect = selected !== "" && selected === q.correctAnswer;
    const isMandatoryItem = hasMandatory && (order <= 30 || q.block === "majburiy");
    const isBlock1Item = hasMandatory ? order >= 31 && order <= 60 : order <= 30;

    if (selected === "") {
      unansweredCount++;
    } else if (isCorrect) {
      correctCount++;
      if (isMandatoryItem) {
        mandatoryCorrect++;
        if (q.mandatoryGroup === "ONA_TILI" || order <= 10) mandatoryBreakdown.onaTili++;
        else if (q.mandatoryGroup === "MATEMATIKA" || order <= 20) mandatoryBreakdown.matematika++;
        else mandatoryBreakdown.tarix++;
      } else if (isBlock1Item) {
        block1Correct++;
      } else {
        block2Correct++;
      }
    } else {
      wrongCount++;
    }

    return {
      order,
      subjectName:
        q.subjectName ||
        (isMandatoryItem
          ? "Majburiy fan"
          : isBlock1Item
          ? assignment.block1SubjectName
          : assignment.block2SubjectName),
      block: q.block || (isMandatoryItem ? "majburiy" : isBlock1Item ? "1-blok" : "2-blok"),
      mandatoryGroup: q.mandatoryGroup || "",
      selectedAnswer: selected,
      correctAnswer: q.correctAnswer,
      isCorrect,
    };
  });

  const totalQuestions = allQuestions.length || (hasMandatory ? 90 : 60);
  const percentage = Math.round((correctCount / totalQuestions) * 1000) / 10;
  const maxScore = hasMandatory ? 189.0 : 156.0;
  const score = hasMandatory
    ? Math.round((mandatoryCorrect * 1.1 + block1Correct * 3.1 + block2Correct * 2.1) * 10) / 10
    : Math.round((block1Correct * 3.1 + block2Correct * 2.1) * 10) / 10;

  const batch = writeBatch(db);
  const sheetRef = doc(collection(db, "dtmAnswerSheets"));
  const resultRef = doc(collection(db, "dtmResults"));
  const checker = `tg_${telegramUserId}`;

  const sheetPayload = {
    studentNumericId: assignment.studentNumericId,
    studentId: assignment.studentId,
    assignmentId: assignment.id,
    assignmentCode: assignment.assignmentCode,
    organizationId: "telegram_bot",
    sourceType: "MANUAL",
    fileUrl: null,
    fileName: null,
    answers,
    ocrConfidence: 100,
    status: "CHECKED",
    checkedBy: checker,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const resultPayload = {
    organizationId: "telegram_bot",
    organizationName: assignment.organizationName || "Telegram Bot (@AIEDUTIZIM_bot)",
    studentId: assignment.studentId,
    studentNumericId: assignment.studentNumericId,
    studentFullName: assignment.studentFullName,
    assignmentId: assignment.id,
    assignmentCode: assignment.assignmentCode,
    answerSheetId: sheetRef.id,
    block1SubjectName: assignment.block1SubjectName,
    block2SubjectName: assignment.block2SubjectName,
    totalQuestions,
    correctCount,
    wrongCount,
    unansweredCount,
    ...(hasMandatory ? { mandatoryCorrect, mandatoryBreakdown } : {}),
    block1Correct,
    block2Correct,
    maxScore,
    percentage,
    score,
    questionBreakdown,
    checkedBy: checker,
    checkedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  batch.set(sheetRef, sheetPayload);
  batch.set(resultRef, resultPayload);
  batch.update(doc(db, "dtmAssignments", assignment.id), {
    status: "CHECKED",
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  return {
    alreadyChecked: false,
    result: { id: resultRef.id, ...resultPayload },
  };
}

export async function lookupDtmResultByNumericId(
  db: any,
  numericId: string
): Promise<
  | { state: "NOT_FOUND" }
  | { state: "CHECKED"; result: any; student: any | null; assignment: any | null }
  | { state: "PENDING"; student: any | null; assignment: any | null }
> {
  const cleanId = String(numericId || "").replace(/\D/g, "");
  if (!/^\d{7}$/.test(cleanId)) {
    return { state: "NOT_FOUND" };
  }

  const [resSnap, stuSnap, assignSnap] = await Promise.all([
    getDocs(query(collection(db, "dtmResults"), where("studentNumericId", "==", cleanId))),
    getDocs(query(collection(db, "dtmStudents"), where("numericId", "==", cleanId))),
    getDocs(query(collection(db, "dtmAssignments"), where("studentNumericId", "==", cleanId))),
  ]);

  const student = stuSnap.empty ? null : { id: stuSnap.docs[0].id, ...(stuSnap.docs[0].data() as any) };

  const assignments = assignSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .sort((a, b) => (b.version || 0) - (a.version || 0));
  const latestAssignment =
    assignments.find((a) => a.isLatest && a.status !== "CANCELLED") || assignments[0] || null;

  if (!resSnap.empty) {
    const results = resSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return {
      state: "CHECKED",
      result: results[0],
      student,
      assignment: latestAssignment,
    };
  }

  if (student || latestAssignment) {
    return {
      state: "PENDING",
      student,
      assignment: latestAssignment,
    };
  }

  return { state: "NOT_FOUND" };
}

export function formatTelegramResultMessage(result: any, titlePrefix = "📊 <b>DTM NATIJANGIZ</b>"): string {
  const breakdown: any[] = Array.isArray(result.questionBreakdown) ? result.questionBreakdown : [];
  const wrongItems = breakdown
    .filter((q) => !q.isCorrect)
    .slice(0, 35)
    .map((q) => `${q.order}:${q.selectedAnswer || "—"}→<b>${q.correctAnswer}</b>`);

  const extraWrongCount = Math.max(0, breakdown.filter((q) => !q.isCorrect).length - 35);
  const totalQ = Number(result.totalQuestions || (result.mandatoryCorrect !== undefined ? 90 : 60));
  const maxScore = Number(result.maxScore || (totalQ === 90 ? 189.0 : 156.0)).toFixed(1);

  const mandatoryLine =
    result.mandatoryCorrect !== undefined
      ? `📙 <b>Majburiy fanlar (1–30 · 1.1 ball):</b> ${result.mandatoryCorrect} / 30` +
        (result.mandatoryBreakdown
          ? ` <i>(Ona tili: ${result.mandatoryBreakdown.onaTili}, Mat: ${result.mandatoryBreakdown.matematika}, Tarix: ${result.mandatoryBreakdown.tarix})</i>`
          : "") +
        "\n"
      : "";

  let msg =
    `${titlePrefix}\n\n` +
    `👤 <b>F.I.Sh.:</b> ${result.studentFullName || "—"}\n` +
    `🏢 <b>Manba / Tashkilot:</b> ${result.organizationName || "—"}\n` +
    `🆔 <b>7 xonali ID:</b> <code>${result.studentNumericId}</code>\n` +
    `📄 <b>Variant ID:</b> <code>${result.assignmentCode}</code>\n\n` +
    `🏆 <b>Umumiy ball:</b> <b>${result.score} / ${maxScore} ball</b> (${result.percentage}%)\n` +
    mandatoryLine +
    `📘 <b>1-blok (${result.block1SubjectName}):</b> ${result.block1Correct} / 30\n` +
    `📗 <b>2-blok (${result.block2SubjectName}):</b> ${result.block2Correct} / 30\n\n` +
    `✅ To'g'ri: <b>${result.correctCount}</b> | ❌ Xato: <b>${result.wrongCount}</b> | ➖ Bo'sh: <b>${result.unansweredCount}</b>\n`;

  if (wrongItems.length > 0) {
    msg += `\n❌ <b>Xato / bo'sh savollar (sizniki→to'g'risi):</b>\n${wrongItems.join(", ")}`;
    if (extraWrongCount > 0) {
      msg += ` ... (+${extraWrongCount} ta)`;
    }
  } else {
    msg += `\n🎉 Barcha ${totalQ} ta savolga to'g'ri javob berdingiz!`;
  }

  return msg;
}
