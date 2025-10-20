export interface FollowUp {
  question: string;
  answer: string;
}

export interface GuideStep {
  title: string;
  content: string;
  followUps?: FollowUp[];
  suggestedFollowUps?: string[];
}

export interface GuideResponse {
    guide: GuideStep[];
}

export type DetailLevel = 'overview' | 'standard' | 'detailed' | 'eli5';
export type ModelName = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface SolvedQuestion {
  title: string;
  answer: string;
  explanation: string;
  reference: string;
  followUps?: FollowUp[];
}

export interface PracticeResponse {
  solvedQuestions: SolvedQuestion[];
}

export type SolutionMode = 'direct' | 'guided';

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
}

export type ScriptAction = 'guide' | 'concepts' | 'flashcards' | 'exam';

// Prüfungsmodus
export interface ExamQuestion {
  id: string;
  questionText: string;
}

export interface ExamAnswer {
  questionId: string;
  answerText: string;
  questionText?: string;
}

export interface GradedAnswer {
  questionText: string;
  userAnswer: string;
  feedback: string;
  suggestedAnswer: string;
  isCorrect: boolean;
}

export interface ExamResult {
    gradedAnswers: GradedAnswer[];
}

// Simulationsmodus
export type SimulationModeType = 'coop' | 'vs';

export interface JudgedRound {
    questionText: string;
    userAnswer: string;
    aiAnswer: string;
    judgment: string;
    userScore: number;
    aiScore: number;
}

// Schlüsselkonzepte
export interface KeyConcept {
  term: string;
  definition: string;
}

export interface KeyConceptsResponse {
  keyConcepts: KeyConcept[];
}

// Lernkarten
export interface Flashcard {
  question: string;
  answer: string;
}

export interface FlashcardsResponse {
  flashcards: Flashcard[];
}

export interface GeneratedContent {
  guide?: GuideStep[] | null;
  solvedQuestions?: SolvedQuestion[] | null;
  keyConcepts?: KeyConcept[] | null;
  flashcards?: Flashcard[] | null;
  examResults?: GradedAnswer[] | null;
}

// Benachrichtigungen
export type NotificationType = 'success' | 'warning';