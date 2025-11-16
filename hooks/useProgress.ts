import { useState, useEffect, useCallback } from 'react';
import { Sentence, ProgressState, LevelMetadata } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { lessonProgressQueries } from '../src/lib/supabaseQueries';

const DAILY_DOSE_SIZE = 5;

const useProgressData = () => {
    const [allSentences, setAllSentences] = useState<Sentence[]>([]);
    const [levels, setLevels] = useState<LevelMetadata[]>([]);
    const [isProgressLoading, setIsLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/data/all-sentences.json').then(res => res.json()),
            fetch('/data/table-of-contents.json').then(res => res.json()),
        ]).then(([sentencesData, levelsData]) => {
            setAllSentences(sentencesData);
            setLevels(levelsData);
            setIsLoading(false);
        }).catch(err => {
            console.error("Failed to load progress data:", err);
            setIsLoading(false);
        });
    }, []);

    return { allSentences, levels, isProgressLoading };
};

export const useProgress = () => {
    const { user } = useAuth();
    const { allSentences, levels, isProgressLoading } = useProgressData();
    const [progress, setProgress] = useState<ProgressState>({ currentSentenceIndex: 0 });
    const [progressLoaded, setProgressLoaded] = useState(false);

    useEffect(() => {
        if (!user || isProgressLoading || allSentences.length === 0) {
            setProgressLoaded(true);
            return;
        }

        lessonProgressQueries.getAll(user.id)
            .then(allProgress => {
                if (allProgress.length > 0) {
                    const maxIndex = Math.max(...allProgress.map(p => p.sentence_index));
                    setProgress({ currentSentenceIndex: maxIndex });
                }
                setProgressLoaded(true);
            })
            .catch(error => {
                console.error('Failed to load progress:', error);
                setProgressLoaded(true);
            });
    }, [user, isProgressLoading, allSentences]);

    const isLessonCompleted = useCallback((lessonId: string): boolean => {
        if (isProgressLoading) return false;
        
        const lesson = levels.flatMap(l => l.lessons).find(l => l.id === lessonId);
        if (!lesson) return false;

        const sentencesInLesson = allSentences.filter(s => s.lessonId === lessonId);
        if(sentencesInLesson.length === 0) return true; // Empty lesson is complete

        const lastSentenceOfLesson = sentencesInLesson[sentencesInLesson.length - 1];
        if (!lastSentenceOfLesson) return true;

        const globalIndexOfLastSentence = allSentences.findIndex(s => s.id === lastSentenceOfLesson.id && s.lessonId === lessonId);
        if (globalIndexOfLastSentence === -1) return false;

        return progress.currentSentenceIndex > globalIndexOfLastSentence;
    }, [progress.currentSentenceIndex, allSentences, levels, isProgressLoading]);

    const getCurrentLessonInfo = useCallback(() => {
        if (isProgressLoading || allSentences.length === 0) {
            return null;
        }

        const effectiveIndex = Math.min(progress.currentSentenceIndex, allSentences.length - 1);
        const currentSentence = allSentences[effectiveIndex];

        if (!currentSentence) return null;

        const level = levels.find(l => l.id === currentSentence.levelId);
        const lesson = level?.lessons.find(le => le.id === currentSentence.lessonId);
        const sentencesInLesson = allSentences.filter(s => s.lessonId === lesson?.id);

        return {
            lessonId: lesson?.id,
            lessonTitle: lesson?.title || 'Unknown Lesson',
            levelTitle: level?.title || 'Unknown Level',
            progressInLesson: sentencesInLesson.findIndex(s => s.id === currentSentence.id) + 1,
            lessonLength: sentencesInLesson.length || 0,
        };
    }, [progress.currentSentenceIndex, allSentences, levels, isProgressLoading]);
    
    const getLearnedSentences = useCallback(() => {
        if (isProgressLoading) return [];
        return allSentences.slice(0, progress.currentSentenceIndex);
    }, [progress.currentSentenceIndex, allSentences, isProgressLoading]);

    const getSentencesUpToLesson = useCallback((lessonId: string) => {
        if (isProgressLoading) return [];
        
        let lastIndex = -1;
        // Find the index of the very last sentence that belongs to the target lesson
        for (let i = allSentences.length - 1; i >= 0; i--) {
            if (allSentences[i].lessonId === lessonId) {
                lastIndex = i;
                break;
            }
        }

        if (lastIndex === -1) {
             // Fallback: if lessonId not found, maybe return all learned sentences
            return getLearnedSentences();
        }

        return allSentences.slice(0, lastIndex + 1);

    }, [allSentences, isProgressLoading, getLearnedSentences]);

    const getGlobalSentenceIndex = useCallback((lessonId: string, sentenceId: number): number => {
        if (isProgressLoading) return -1;
        return allSentences.findIndex(s => s.lessonId === lessonId && s.id === sentenceId);
    }, [allSentences, isProgressLoading]);

    const getDailyDose = useCallback(() => {
        if (isProgressLoading || allSentences.length === 0) {
            return { sentencesForShadowing: [], sentencesForLearning: [], isFinished: false };
        }

        const isFinished = progress.currentSentenceIndex >= allSentences.length;
        if (isFinished) {
            return { sentencesForShadowing: [], sentencesForLearning: [], isFinished: true };
        }

        const sentencesForLearning = allSentences.slice(
            progress.currentSentenceIndex,
            progress.currentSentenceIndex + DAILY_DOSE_SIZE
        );

        const shadowingStartIndex = Math.max(0, progress.currentSentenceIndex - DAILY_DOSE_SIZE);
        const sentencesForShadowing = allSentences.slice(
            shadowingStartIndex,
            progress.currentSentenceIndex
        );

        return { sentencesForShadowing, sentencesForLearning, isFinished };
    }, [progress.currentSentenceIndex, allSentences, isProgressLoading]);

    const completeLearningSession = useCallback((learnedSentences: Sentence[]) => {
        if (!user || learnedSentences.length === 0) return;

        const newLearnedCount = learnedSentences.length;
        setProgress(prev => {
            const newIndex = Math.min(prev.currentSentenceIndex + newLearnedCount, allSentences.length);
            
            const currentLesson = allSentences[newIndex]?.lessonId || allSentences[0]?.lessonId;
            if (currentLesson) {
                lessonProgressQueries.upsert(user.id, {
                    lesson_id: currentLesson,
                    level_id: allSentences[newIndex]?.levelId || '',
                    sentence_index: newIndex,
                    completed_sentences: [],
                    xp: 0,
                    last_practice: new Date().toISOString(),
                }).catch(error => {
                    console.error('Failed to save progress:', error);
                });
            }

            return { ...prev, currentSentenceIndex: newIndex };
        });
    }, [user, allSentences]);

    return { 
        progress, 
        setProgress, 
        isLessonCompleted, 
        getCurrentLessonInfo, 
        getLearnedSentences,
        getSentencesUpToLesson,
        getGlobalSentenceIndex, 
        isProgressLoading,
        getDailyDose,
        completeLearningSession,
    };
};
