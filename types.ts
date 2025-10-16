export interface FollowUp {
  question: string;
  answer: string;
}

export interface GuideStep {
  title: string;
  content: string;
  followUps?: FollowUp[];
}

export interface GuideResponse {
    guide: GuideStep[];
}

export type DetailLevel = 'overview' | 'standard' | 'detailed';
export type ModelName = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface SolvedQuestion {
  title: string;
  answer: string;
  explanation: string;
  reference: string;
}

export interface PracticeResponse {
  solvedQuestions: SolvedQuestion[];
}

export type SolutionMode = 'direct' | 'guided';

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
}

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
