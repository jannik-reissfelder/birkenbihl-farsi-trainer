
export interface Sentence {
  id: number;
  farsi: string;
  latin: string;
  germanDecode: string;
  germanTranslation: string;
  // Add lesson and level info for context
  lessonId?: string;
  levelId?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  sentences: Sentence[];
}

export interface Level {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface LessonMetadata extends Omit<Lesson, 'sentences'> {}

export interface LevelMetadata {
  id: string;
  title: string;
  description: string;
  lessons: LessonMetadata[];
}


export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface PronunciationFeedback {
  germanText: string;
  farsiAudioText: string;
}

export interface ProgressState {
    currentSentenceIndex: number; // Overall index across all sentences
}

export interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
}

export interface Scenario {
  farsi: string;
  german: string;
}