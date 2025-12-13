import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';
import type { Lesson, Sentence } from '@/types';
import type { Token } from '@/hooks/useSentenceTokens';
import { validateSentenceIndex } from '@/hooks/useSentenceTokens';
import { DecodeStep, DecodeAnswers } from './DecodeStep';
import { useVocabulary } from '@/contexts/VocabularyContext';
import { useLessonStepProgress } from '@/hooks/useLessonStepProgress';
import { useDecodeAudio } from '@/hooks/useDecodeAudio';
import { GamificationContext } from '@/contexts/GamificationContext';
import { useProgress } from '@/hooks/useProgress';

type BirkenbihlStep = 'decode' | 'listen' | 'speak' | 'karaoke';

interface LessonContainerProps {
  lesson: Lesson;
  onLessonComplete?: () => void;
  mode?: 'full' | 'decode-only' | 'karaoke-only';
  initialSentenceIndex?: number;
  isFreePractice?: boolean;
}

export const LessonContainer: React.FC<LessonContainerProps> = ({
  lesson,
  onLessonComplete,
  mode = 'full',
  initialSentenceIndex = 0,
  isFreePractice = false,
}) => {
  const { 
    progress: stepProgress, 
    isLoading: isStepProgressLoading,
    saveDecodeProgress,
    markDecodeComplete,
  } = useLessonStepProgress(lesson.id);

  const [currentIndex, setCurrentIndex] = useState(initialSentenceIndex);
  const [step, setStep] = useState<BirkenbihlStep>(mode === 'karaoke-only' ? 'karaoke' : 'decode');
  const [hasResumedFromProgress, setHasResumedFromProgress] = useState(false);

  const [allDecodeAnswers, setAllDecodeAnswers] = useState<DecodeAnswers>({});
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [decodeResults, setDecodeResults] = useState<boolean[]>([]);
  const [completedSteps, setCompletedSteps] = useState(new Set<BirkenbihlStep>());

  const { addCard, removeCardByWords, isWordMarked } = useVocabulary();
  const { addXp } = useContext(GamificationContext);
  const { progress, setProgress, getGlobalSentenceIndex } = useProgress();

  const saveAnswersTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const validIndex = validateSentenceIndex(currentIndex, lesson.sentences.length);
  const currentSentence = lesson.sentences[validIndex];

  const decodeAudio = useDecodeAudio(
    lesson.id,
    validIndex,
    currentSentence?.farsi || '',
    getAudioContext()
  );

  useEffect(() => {
    if (!isStepProgressLoading && !hasResumedFromProgress && mode !== 'karaoke-only') {
      if (Object.keys(stepProgress.decodeAnswers).length > 0) {
        setAllDecodeAnswers(stepProgress.decodeAnswers);
      }
      if (stepProgress.decodeSentenceIndex > 0) {
        const safeIndex = validateSentenceIndex(stepProgress.decodeSentenceIndex, lesson.sentences.length);
        setCurrentIndex(safeIndex);
      }
      setHasResumedFromProgress(true);
    }
  }, [isStepProgressLoading, stepProgress.decodeSentenceIndex, stepProgress.decodeAnswers, hasResumedFromProgress, mode, lesson.sentences.length]);

  useEffect(() => {
    setIsChecked(false);
    setIsCorrect(false);
    setDecodeResults([]);
  }, [currentIndex]);

  const handleAnswerChange = useCallback((sentenceIndex: number, wordIndex: number, value: string) => {
    setAllDecodeAnswers(prev => {
      const sentenceAnswers = [...(prev[sentenceIndex] || [])];
      sentenceAnswers[wordIndex] = value;
      const updated = { ...prev, [sentenceIndex]: sentenceAnswers };

      if (!isFreePractice) {
        if (saveAnswersTimeoutRef.current) {
          clearTimeout(saveAnswersTimeoutRef.current);
        }
        saveAnswersTimeoutRef.current = setTimeout(() => {
          saveDecodeProgress(currentIndex, updated);
        }, 500);
      }

      return updated;
    });
  }, [currentIndex, isFreePractice, saveDecodeProgress]);

  const handleCheck = useCallback((results: boolean[], allCorrect: boolean) => {
    setDecodeResults(results);
    setIsCorrect(allCorrect);
    setIsChecked(true);

    if (allCorrect && !completedSteps.has('decode')) {
      addXp(10);
      setCompletedSteps(prev => new Set(prev).add('decode'));

      if (!isFreePractice && currentSentence) {
        const currentGlobalIndex = getGlobalSentenceIndex(lesson.id, currentSentence.id);
        if (currentGlobalIndex !== -1) {
          const nextGlobalIndex = currentGlobalIndex + 1;
          if (nextGlobalIndex > progress.currentSentenceIndex) {
            setProgress({ currentSentenceIndex: nextGlobalIndex });
          }
        }

        const isLastSentence = validIndex === lesson.sentences.length - 1;
        if (isLastSentence && !stepProgress.decodeCompleted) {
          markDecodeComplete();
          addXp(50);
        }
      }
    }
  }, [completedSteps, isFreePractice, currentSentence, lesson.id, lesson.sentences.length, validIndex, stepProgress.decodeCompleted, getGlobalSentenceIndex, progress.currentSentenceIndex, setProgress, markDecodeComplete, addXp]);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < lesson.sentences.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      if (!isFreePractice) {
        saveDecodeProgress(nextIndex, allDecodeAnswers);
      }
    }
  }, [currentIndex, lesson.sentences.length, isFreePractice, saveDecodeProgress, allDecodeAnswers]);

  const handleMarkWord = useCallback((token: Token, sentence: Sentence) => {
    if (token.isPunctuation) return;
    if (isWordMarked(token.german, token.farsi)) return;
    addCard(token.german, token.farsi, token.latin, sentence);
  }, [addCard, isWordMarked]);

  const handleUnmarkWord = useCallback((german: string, farsi: string) => {
    removeCardByWords(german, farsi);
  }, [removeCardByWords]);

  const handleDecodeComplete = useCallback(() => {
    if (mode === 'decode-only') {
      onLessonComplete?.();
    } else {
      setStep('karaoke');
    }
  }, [mode, onLessonComplete]);

  const isLastSentence = validIndex === lesson.sentences.length - 1;
  const canGoNext = isChecked && isCorrect && !isLastSentence;

  if (isStepProgressLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (step === 'decode') {
    return (
      <DecodeStep
        lesson={lesson}
        currentIndex={validIndex}
        allDecodeAnswers={allDecodeAnswers}
        onAnswerChange={handleAnswerChange}
        onCheck={handleCheck}
        onNavigate={handleNavigate}
        onMarkWord={handleMarkWord}
        onUnmarkWord={handleUnmarkWord}
        isWordMarked={isWordMarked}
        isChecked={isChecked}
        isCorrect={isCorrect}
        decodeResults={decodeResults}
        isLastSentence={isLastSentence}
        canGoNext={canGoNext}
        onDecodeComplete={handleDecodeComplete}
        audioHook={decodeAudio}
      />
    );
  }

  return (
    <div className="p-4 text-center text-gray-400">
      <p>Step "{step}" not yet implemented in new component system.</p>
      <p>Use the original LessonView for full functionality.</p>
    </div>
  );
};

export default LessonContainer;
