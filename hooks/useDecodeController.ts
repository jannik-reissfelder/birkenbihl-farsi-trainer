import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Sentence } from '../types';
import { useSentenceTokens, Token, validateSentenceIndex, sanitizeDecodeAnswers } from './useSentenceTokens';
import { useVocabulary } from '../contexts/VocabularyContext';

export interface DecodeControllerOptions {
  lessonId: string;
  sentences: Sentence[];
  initialIndex?: number;
  isFreePractice?: boolean;
  savedProgress?: {
    decodeSentenceIndex: number;
    decodeAnswers: Record<number, string[]>;
    decodeCompleted: boolean;
  };
  onSaveProgress?: (sentenceIndex: number, answers: Record<number, string[]>) => Promise<void>;
  onDecodeComplete?: () => void;
  onSentenceComplete?: (sentenceIndex: number, isLast: boolean) => void;
}

export interface DecodeControllerState {
  currentIndex: number;
  tokens: Token[];
  wordTokens: Token[];
  userAnswers: string[];
  decodeResults: boolean[];
  isChecked: boolean;
  isCorrect: boolean;
  isSaving: boolean;
  hasResumed: boolean;
}

export interface DecodeControllerActions {
  goToNext: () => void;
  goToPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  handleAnswerChange: (wordIndex: number, value: string) => void;
  handleCheck: () => void;
  handleMarkWord: (token: Token) => void;
  handleUnmarkWord: (german: string, farsi: string) => void;
  isTokenMarked: (german: string, farsi: string) => boolean;
  resetCheck: () => void;
  saveProgress: () => Promise<void>;
  totalSentences: number;
  currentSentence: Sentence | undefined;
}

export type DecodeController = DecodeControllerState & DecodeControllerActions;

export const useDecodeController = (options: DecodeControllerOptions): DecodeController => {
  const {
    lessonId,
    sentences,
    initialIndex = 0,
    isFreePractice = false,
    savedProgress,
    onSaveProgress,
    onDecodeComplete,
    onSentenceComplete,
  } = options;

  const { addCard, removeCardByWords, isWordMarked } = useVocabulary();
  
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (savedProgress && savedProgress.decodeSentenceIndex > 0) {
      return validateSentenceIndex(savedProgress.decodeSentenceIndex, sentences.length);
    }
    return validateSentenceIndex(initialIndex, sentences.length);
  });
  
  const [allDecodeAnswers, setAllDecodeAnswers] = useState<Record<number, string[]>>(() => {
    if (savedProgress && Object.keys(savedProgress.decodeAnswers).length > 0) {
      return sanitizeDecodeAnswers(savedProgress.decodeAnswers, sentences.length);
    }
    return {};
  });
  
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [decodeResults, setDecodeResults] = useState<boolean[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasResumed, setHasResumed] = useState(!!savedProgress);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const currentSentence = useMemo(() => sentences[currentIndex], [sentences, currentIndex]);
  const sentenceTokens = useSentenceTokens(currentSentence);
  
  const tokens = sentenceTokens?.tokens || [];
  const wordTokens = sentenceTokens?.wordTokens || [];
  const userAnswers = useMemo(() => allDecodeAnswers[currentIndex] || [], [allDecodeAnswers, currentIndex]);

  const canGoNext = currentIndex < sentences.length - 1;
  const canGoPrevious = currentIndex > 0;
  const totalSentences = sentences.length;

  const resetCheck = useCallback(() => {
    setIsChecked(false);
    setIsCorrect(false);
    setDecodeResults([]);
  }, []);

  useEffect(() => {
    resetCheck();
  }, [currentIndex, resetCheck]);

  const handleAnswerChange = useCallback((wordIndex: number, value: string) => {
    setAllDecodeAnswers(prev => {
      const currentAnswers = prev[currentIndex] || [];
      const newAnswers = [...currentAnswers];
      newAnswers[wordIndex] = value;
      
      const updated = { ...prev, [currentIndex]: newAnswers };
      
      if (!isFreePractice && onSaveProgress) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          onSaveProgress(currentIndex, updated);
        }, 500);
      }
      
      return updated;
    });
  }, [currentIndex, isFreePractice, onSaveProgress]);

  const handleCheck = useCallback(() => {
    const results = wordTokens.map((token, index) => {
      const userAnswer = (userAnswers[index] || '').trim().toLowerCase();
      const correctAnswer = token.german.toLowerCase();
      return userAnswer === correctAnswer;
    });
    
    setDecodeResults(results);
    const allCorrect = results.length > 0 && results.every(r => r);
    setIsCorrect(allCorrect);
    setIsChecked(true);
    
    if (allCorrect) {
      const isLastSentence = currentIndex === sentences.length - 1;
      onSentenceComplete?.(currentIndex, isLastSentence);
      
      if (isLastSentence) {
        onDecodeComplete?.();
      }
    }
  }, [wordTokens, userAnswers, currentIndex, sentences.length, onSentenceComplete, onDecodeComplete]);

  const goToNext = useCallback(() => {
    if (!canGoNext) return;
    
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    
    if (!isFreePractice && onSaveProgress) {
      onSaveProgress(nextIndex, allDecodeAnswers);
    }
  }, [canGoNext, currentIndex, isFreePractice, onSaveProgress, allDecodeAnswers]);

  const goToPrevious = useCallback(() => {
    if (!canGoPrevious) return;
    setCurrentIndex(currentIndex - 1);
  }, [canGoPrevious, currentIndex]);

  const handleMarkWord = useCallback((token: Token) => {
    if (token.isPunctuation || !token.german || !token.farsi) return;
    
    addCard(token.german, token.farsi, token.latin || '', currentSentence!);
  }, [addCard, currentSentence]);

  const handleUnmarkWord = useCallback((german: string, farsi: string) => {
    removeCardByWords(german, farsi);
  }, [removeCardByWords]);

  const isTokenMarked = useCallback((german: string, farsi: string): boolean => {
    return isWordMarked(german, farsi);
  }, [isWordMarked]);

  const saveProgress = useCallback(async () => {
    if (isFreePractice || !onSaveProgress) return;
    
    setIsSaving(true);
    try {
      await onSaveProgress(currentIndex, allDecodeAnswers);
    } finally {
      setIsSaving(false);
    }
  }, [isFreePractice, onSaveProgress, currentIndex, allDecodeAnswers]);

  return {
    currentIndex,
    tokens,
    wordTokens,
    userAnswers,
    decodeResults,
    isChecked,
    isCorrect,
    isSaving,
    hasResumed,
    goToNext,
    goToPrevious,
    canGoNext,
    canGoPrevious,
    handleAnswerChange,
    handleCheck,
    handleMarkWord,
    handleUnmarkWord,
    isTokenMarked,
    resetCheck,
    saveProgress,
    totalSentences,
    currentSentence,
  };
};

export default useDecodeController;
