import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { lessonStepProgressQueries } from '../src/lib/supabaseQueries';
import type { Database } from '../src/lib/database.types';

type LessonStepProgress = Database['public']['Tables']['lesson_step_progress']['Row'];

export type DecodeAnswers = Record<number, string[]>;

export interface LessonProgress {
  decodeSentenceIndex: number;
  decodeAnswers: DecodeAnswers;
  decodeCompleted: boolean;
  karaokeCompleted: boolean;
  lessonCompleted: boolean;
  decodeCompletedAt: string | null;
  karaokeCompletedAt: string | null;
  lessonCompletedAt: string | null;
}

const defaultProgress: LessonProgress = {
  decodeSentenceIndex: 0,
  decodeAnswers: {},
  decodeCompleted: false,
  karaokeCompleted: false,
  lessonCompleted: false,
  decodeCompletedAt: null,
  karaokeCompletedAt: null,
  lessonCompletedAt: null,
};

export const useLessonStepProgress = (lessonId: string | null) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<LessonProgress>(defaultProgress);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !lessonId) {
      setProgress(defaultProgress);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    lessonStepProgressQueries.getByLessonId(user.id, lessonId)
      .then((data) => {
        if (data) {
          const savedAnswers = (data.decode_answers as DecodeAnswers) || {};
          setProgress({
            decodeSentenceIndex: data.decode_sentence_index ?? 0,
            decodeAnswers: savedAnswers,
            decodeCompleted: data.decode_completed ?? false,
            karaokeCompleted: data.karaoke_completed ?? false,
            lessonCompleted: data.lesson_completed ?? false,
            decodeCompletedAt: data.decode_completed_at,
            karaokeCompletedAt: data.karaoke_completed_at,
            lessonCompletedAt: data.lesson_completed_at,
          });
        } else {
          setProgress(defaultProgress);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load lesson step progress:', err);
        setError('Fortschritt konnte nicht geladen werden');
        setProgress(defaultProgress);
        setIsLoading(false);
      });

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [user, lessonId]);

  const saveDecodeProgress = useCallback((sentenceIndex: number, answers: DecodeAnswers) => {
    if (!user || !lessonId) return;

    // Update local state immediately
    setProgress(prev => ({ 
      ...prev, 
      decodeSentenceIndex: sentenceIndex,
      decodeAnswers: answers
    }));

    // Write directly to database - LessonView handles debouncing
    lessonStepProgressQueries.updateDecodeProgress(
      user.id, 
      lessonId, 
      sentenceIndex, 
      answers
    ).catch(err => console.error('Failed to save decode progress:', err));
  }, [user, lessonId]);

  const markDecodeComplete = useCallback(async () => {
    if (!user || !lessonId) return;

    try {
      await lessonStepProgressQueries.markDecodeComplete(user.id, lessonId);
      setProgress(prev => ({
        ...prev,
        decodeCompleted: true,
        decodeCompletedAt: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Failed to mark decode complete:', err);
    }
  }, [user, lessonId]);

  const markKaraokeComplete = useCallback(async () => {
    if (!user || !lessonId) return;

    try {
      await lessonStepProgressQueries.markKaraokeComplete(user.id, lessonId);
      setProgress(prev => ({
        ...prev,
        karaokeCompleted: true,
        karaokeCompletedAt: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Failed to mark karaoke complete:', err);
    }
  }, [user, lessonId]);

  const markLessonComplete = useCallback(async () => {
    if (!user || !lessonId) return;

    try {
      await lessonStepProgressQueries.markLessonComplete(user.id, lessonId);
      setProgress(prev => ({
        ...prev,
        lessonCompleted: true,
        lessonCompletedAt: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Failed to mark lesson complete:', err);
    }
  }, [user, lessonId]);

  const resetProgress = useCallback(async () => {
    if (!user || !lessonId) return;

    try {
      await lessonStepProgressQueries.delete(user.id, lessonId);
      setProgress(defaultProgress);
    } catch (err) {
      console.error('Failed to reset progress:', err);
    }
  }, [user, lessonId]);

  return {
    progress,
    isLoading,
    error,
    saveDecodeProgress,
    markDecodeComplete,
    markKaraokeComplete,
    markLessonComplete,
    resetProgress,
  };
};

export const useAllLessonProgress = () => {
  const { user } = useAuth();
  const [allProgress, setAllProgress] = useState<Map<string, LessonProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setAllProgress(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    lessonStepProgressQueries.getAll(user.id)
      .then((data) => {
        const progressMap = new Map<string, LessonProgress>();
        let completed = 0;

        data.forEach((item) => {
          if (item.lesson_completed) completed++;
          const savedAnswers = (item.decode_answers as DecodeAnswers) || {};
          progressMap.set(item.lesson_id, {
            decodeSentenceIndex: item.decode_sentence_index ?? 0,
            decodeAnswers: savedAnswers,
            decodeCompleted: item.decode_completed ?? false,
            karaokeCompleted: item.karaoke_completed ?? false,
            lessonCompleted: item.lesson_completed ?? false,
            decodeCompletedAt: item.decode_completed_at,
            karaokeCompletedAt: item.karaoke_completed_at,
            lessonCompletedAt: item.lesson_completed_at,
          });
        });

        setAllProgress(progressMap);
        setCompletedCount(completed);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load all lesson progress:', err);
        setAllProgress(new Map());
        setIsLoading(false);
      });
  }, [user]);

  const getLessonProgress = useCallback((lessonId: string): LessonProgress | null => {
    return allProgress.get(lessonId) || null;
  }, [allProgress]);

  const isLessonCompleted = useCallback((lessonId: string): boolean => {
    const progress = allProgress.get(lessonId);
    return progress?.lessonCompleted ?? false;
  }, [allProgress]);

  const isDecodeCompleted = useCallback((lessonId: string): boolean => {
    const progress = allProgress.get(lessonId);
    return progress?.decodeCompleted ?? false;
  }, [allProgress]);

  const isKaraokeCompleted = useCallback((lessonId: string): boolean => {
    const progress = allProgress.get(lessonId);
    return progress?.karaokeCompleted ?? false;
  }, [allProgress]);

  const refreshProgress = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await lessonStepProgressQueries.getAll(user.id);
      const progressMap = new Map<string, LessonProgress>();
      let completed = 0;

      data.forEach((item) => {
        if (item.lesson_completed) completed++;
        const savedAnswers = (item.decode_answers as DecodeAnswers) || {};
        progressMap.set(item.lesson_id, {
          decodeSentenceIndex: item.decode_sentence_index ?? 0,
          decodeAnswers: savedAnswers,
          decodeCompleted: item.decode_completed ?? false,
          karaokeCompleted: item.karaoke_completed ?? false,
          lessonCompleted: item.lesson_completed ?? false,
          decodeCompletedAt: item.decode_completed_at,
          karaokeCompletedAt: item.karaoke_completed_at,
          lessonCompletedAt: item.lesson_completed_at,
        });
      });

      setAllProgress(progressMap);
      setCompletedCount(completed);
    } catch (err) {
      console.error('Failed to refresh progress:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    allProgress,
    isLoading,
    completedCount,
    getLessonProgress,
    isLessonCompleted,
    isDecodeCompleted,
    isKaraokeCompleted,
    refreshProgress,
  };
};
