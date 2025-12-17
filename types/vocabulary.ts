export type SRSState = 'new' | 'learning' | 'graduated';

export type VocabularyMarkKind = 'single' | 'group';

export interface VocabularyCard {
  id: string;
  word: string;
  farsiWord: string;
  latinWord: string;
  contextSentence: {
    farsi: string;
    latin: string;
    germanDecode: string;
    germanTranslation: string;
    mark?: {
      tokenIds: string[];
      sentenceId?: number;
      kind: VocabularyMarkKind;
    };
  };
  lessonId: string;
  levelId: string;
  state: SRSState;
  createdAt: Date;
  lastReviewed: Date | null;
  graduatedAt: Date | null; // Timestamp when card was graduated (state became 'graduated')
  nextReviewDate: Date;
  reviewCount: number; // Total number of reviews
  successCount: number; // Total successful reviews
  failCount: number; // Total failed reviews
  consecutiveSuccesses: number; // Current streak of successful reviews (resets on failure)
  repetitions: number; // Successful repetitions for SM-2 algorithm (resets on failure)
  interval: number; // in days
  easeFactor: number; // Supermemo-style ease factor (2.5 default)
  review_counts?: { easy: number; good: number; hard: number; again: number }; // JSONB field from database
}

export interface VocabularyStats {
  totalCards: number;
  newCards: number;
  learningCards: number;
  graduatedCards: number;
  dueForReview: number;
  reviewedToday: number;
}

export interface ReviewResult {
  cardId: string;
  success: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'failed';
  timestamp: Date;
}

export interface ActiveVocabulary {
  words: string[];
  farsiWords: string[];
  cards: VocabularyCard[];
}
