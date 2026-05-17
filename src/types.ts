export type UserRole = 'admin' | 'student' | 'teacher' | 'staff';

export interface Department {
  id: string;
  name: string;
  creatorId?: string;
  createdAt: any;
}

export interface Group {
  id: string;
  departmentId: string;
  name: string;
  creatorId?: string;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  phone?: string;
  birthDate?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  address?: string;
  login?: string;
  password?: string;
  ball?: number;
  ballPrice?: number;
  totalIncome?: number;
  totalSpentAmount?: number;
  aiTestLimit?: number;
  spentBalls?: number;
  lastIncomeDate?: any;
  departmentId?: string;
  groupId?: string;
  departmentName?: string;
  groupName?: string;
  teacherId?: string;
  teacherName?: string;
  isAnonymousContact?: boolean;
  billingHistory?: any[];
  isImpersonated?: boolean;
  createdAt: any;
}

export interface Module {
  id: string;
  title: string;
  content: string; // Markdown content
  videoUrl?: string; // Add video url
  testId?: string;
}

export interface Course {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
  modules: Module[];
  creatorId?: string;
  creatorRole?: string;
  creatorName?: string;
  teacherId?: string;
  departmentIds?: string[];
  groupIds?: string[];
  organizationIds?: string[];
  isPublic?: boolean;
  createdAt: any;
}

export interface Subject {
  id: string;
  title: string;
  content: string; // Maruza matni
  questions: Question[]; // Generated questions
  creatorId?: string;
  creatorRole?: string;
  organizationIds?: string[];
  departmentIds?: string[];
  groupIds?: string[];
  createdAt?: any;
}

export interface Question {
  id?: string;
  text: string;
  options: string[];
  correctIdx: number;
}

export interface GenerationRule {
  subject: string;
  context: string;
  count: number;
}

export interface Test {
  id: string;
  title: string;
  questions: Question[]; 
  type: 'module' | 'topic' | 'exam' | 'subject';
  moduleId?: string;
  courseId?: string;
  startTime?: any;
  endTime?: any;
  generationRules?: GenerationRule[];
  isPublished?: boolean;
  creatorId?: string;
  creatorRole?: string;
  organizationIds?: string[];
  departmentId?: string;
  groupId?: string;
  departmentIds?: string[];
  groupIds?: string[];
  maxAttempts?: number;
  randomQuestionCount?: number;
  teacherId?: string;
  createdAt?: any;
}

export interface SubjectResult {
  id: string;
  userId: string;
  subjectId: string;
  score: number;
  passed: boolean; // >= 90%
  completedAt: any;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  currentModuleIndex: number;
  grades: Record<string, number>; // moduleId -> score (%)
  completed: boolean;
  certificateId?: string;
  lastAccessed: any;
}

export interface Certificate {
  id: string;
  userId: string;
  studentName: string;
  entityId: string;
  entityTitle: string;
  entityType: 'course' | 'subject' | 'quizizz' | 'reward';
  score: number;
  issuedAt: any;
  certificateId: string; // Human readable ID like YAU-00001
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: any;
  isRead: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
  };
}

export interface InfoSection {
  id: string;
  name: string;
  isProtected?: boolean;
  content?: string;
  images?: string[];
  files?: Array<{ name: string; url: string; type: string }>;
}

export interface SiteContent {
  header?: {
    logoUrl?: string;
    siteName?: string;
    bgClass?: string;
    textClass?: string;
  };
  hero: {
    rightImage: string;
    rightBadge: string; // "Yangilik" etc
    rightText: string;
    detailHtml?: string; // Rich text / HTML for detail page
    detailFiles?: Array<{ name: string; url: string; type: string }>; // PDF, PPT etc
    infoSections?: InfoSection[];
  };
  banners: Array<{
    url: string;
    type: 'image' | 'video';
    title?: string;
    text?: string;
    description?: string;
  }>;
  footer: {
    logoUrl?: string;
    description?: string;
    top?: string;
    address?: string;
    phone?: string;
    email?: string;
    workingHours?: string;
    telegram?: string;
    instagram?: string;
    youtube?: string;
    bottom?: string;
  };
  contact?: {
    title?: string;
    description?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}
