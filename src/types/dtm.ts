export type DtmStatus = 'ACTIVE' | 'INACTIVE';

export type DtmBlockType = '1-blok' | '2-blok' | 'both' | string;

export type DtmDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type DtmAnswerOption = 'A' | 'B' | 'C' | 'D';

export type DtmAssignmentStatus =
  | 'GENERATED'
  | 'PDF_READY'
  | 'DOWNLOADED'
  | 'CHECKED'
  | 'CANCELLED'
  | 'SUPERSEDED';

export interface DtmBlockDefinition {
  id: DtmBlockType;
  label: string;
  questionCount: number;
  weightPerQuestion: number;
}

export const DEFAULT_DTM_BLOCKS: DtmBlockDefinition[] = [
  { id: '1-blok', label: '1-blok (Asosiy fan)', questionCount: 30, weightPerQuestion: 3.1 },
  { id: '2-blok', label: '2-blok (Ikkinchi fan)', questionCount: 30, weightPerQuestion: 2.1 },
];

export interface DtmSubject {
  id: string;
  name: string;
  code: string;
  blockType: DtmBlockType;
  description: string;
  status: DtmStatus;
  createdAt: any;
  updatedAt: any;
}

export interface DtmQuestion {
  id: string;
  subjectId: string;
  subjectName?: string;
  block: DtmBlockType;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: DtmAnswerOption;
  topic: string;
  difficulty: DtmDifficulty;
  status: DtmStatus;
  createdAt: any;
  updatedAt: any;
}

export interface DtmOrganization {
  id: string;
  name: string;
  orgType: string;
  region: string;
  address: string;
  phone: string;
  responsiblePerson: string;
  notes: string;
  status: DtmStatus;
  studentCount?: number;
  assignmentCount?: number;
  createdAt: any;
  updatedAt: any;
}

export interface DtmStudent {
  id: string;
  numericId: string; // Always exact 7-digit string e.g. "1000001"
  organizationId: string;
  organizationName?: string;
  fullName: string;
  groupOrClass: string;
  phone: string;
  notes: string;
  block1SubjectId: string;
  block1SubjectName?: string;
  block2SubjectId: string;
  block2SubjectName?: string;
  latestAssignmentId?: string | null;
  latestAssignmentCode?: string | null;
  latestAssignmentStatus?: DtmAssignmentStatus | null;
  latestResultId?: string | null;
  latestScore?: number | null;
  latestPercentage?: number | null;
  createdAt: any;
  updatedAt: any;
}

export interface DtmQuestionSnapshot {
  order: number; // 1..60
  questionId: string;
  originalQuestionId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: DtmAnswerOption;
  subjectId: string;
  subjectName?: string;
  block: DtmBlockType;
  difficulty?: DtmDifficulty;
  topic?: string;
}

export interface DtmAssignment {
  id: string;
  assignmentCode: string; // e.g. "DTM-2026-000001"
  version: number;
  isLatest: boolean;
  organizationId: string;
  organizationName: string;
  studentId: string;
  studentNumericId: string; // 7-digit ID
  studentFullName: string;
  studentGroupOrClass?: string;
  block1SubjectId: string;
  block1SubjectName: string;
  block2SubjectId: string;
  block2SubjectName: string;
  block1Questions: DtmQuestionSnapshot[]; // 30 items (1..30)
  block2Questions: DtmQuestionSnapshot[]; // 30 items (31..60)
  totalQuestions: number; // 60
  status: DtmAssignmentStatus;
  generatedBy?: string;
  createdAt: any;
  updatedAt: any;
}

export type DtmAnswerSourceType = 'MANUAL' | 'OMR_CAMERA' | 'OMR_IMAGE' | 'OMR_PDF' | 'SCANNER';

export interface DtmAnswerSheet {
  id: string;
  studentNumericId: string;
  studentId: string;
  assignmentId: string;
  assignmentCode: string;
  organizationId: string;
  sourceType: DtmAnswerSourceType;
  fileUrl?: string | null;
  fileName?: string | null;
  answers: Record<string, DtmAnswerOption | ''>; // "1".."60"
  ocrConfidence?: number | null;
  status: 'SUBMITTED' | 'CHECKED' | 'ERROR';
  checkedBy?: string;
  createdAt: any;
  updatedAt: any;
}

export interface DtmResultQuestionItem {
  order: number;
  subjectName: string;
  block: DtmBlockType;
  selectedAnswer: DtmAnswerOption | '';
  correctAnswer: DtmAnswerOption;
  isCorrect: boolean;
}

export interface DtmResult {
  id: string;
  organizationId: string;
  organizationName: string;
  studentId: string;
  studentNumericId: string;
  studentFullName: string;
  assignmentId: string;
  assignmentCode: string;
  answerSheetId: string;
  block1SubjectName: string;
  block2SubjectName: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  block1Correct: number;
  block2Correct: number;
  percentage: number;
  score: number; // Weighted DTM score (block1 * 3.1 + block2 * 2.1, max 156.0)
  questionBreakdown: DtmResultQuestionItem[];
  checkedBy?: string;
  checkedAt: any;
  createdAt: any;
  updatedAt: any;
}

export interface DtmDashboardStats {
  totalOrganizations: number;
  totalStudents: number;
  totalQuestions: number;
  activeQuestions: number;
  totalSubjects: number;
  totalAssignments: number;
  checkedResultsCount: number;
  averageScore: number;
  averagePercentage: number;
}
