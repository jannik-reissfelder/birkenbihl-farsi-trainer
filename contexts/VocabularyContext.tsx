import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { VocabularyCard, SRSState, ReviewResult, VocabularyStats, ActiveVocabulary } from '../types/vocabulary';
import { Sentence } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { vocabularyQueries } from '../src/lib/supabaseQueries';

interface VocabularyContextType {
  cards: VocabularyCard[];
  stats: VocabularyStats;
  activeVocabulary: ActiveVocabulary;
  addCard: (word: string, farsiWord: string, latinWord: string, sentence: Sentence) => void;
  removeCard: (cardId: string) => void;
  removeCardByWords: (german: string, farsi: string) => void;
  getCardById: (cardId: string) => VocabularyCard | undefined;
  getCardsByState: (state: SRSState) => VocabularyCard[];
  getDueCards: () => VocabularyCard[];
  submitReview: (result: ReviewResult) => void;
  isWordMarked: (word: string, farsiWord: string) => boolean;
  getStats: () => VocabularyStats;
  isLoading: boolean;
}

const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined);

export const VocabularyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cards, setCards] = useState<VocabularyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load cards from Supabase on mount
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    vocabularyQueries.getAll(user.id)
      .then(dbCards => {
        const cardsWithDates = dbCards.map((card: any) => ({
          id: card.id,
          word: card.word,
          farsiWord: card.farsi_word,
          latinWord: card.latin_word || '',
          contextSentence: card.context,
          lessonId: card.lesson_id,
          levelId: card.level_id,
          state: card.state as SRSState,
          createdAt: new Date(card.created_at),
          lastReviewed: card.last_reviewed ? new Date(card.last_reviewed) : null,
          graduatedAt: card.state === 'graduated' && card.last_reviewed ? new Date(card.last_reviewed) : null,
          nextReviewDate: card.next_review ? new Date(card.next_review) : new Date(),
          reviewCount: (card.review_counts?.easy || 0) + (card.review_counts?.good || 0) + (card.review_counts?.hard || 0) + (card.review_counts?.again || 0),
          successCount: (card.review_counts?.easy || 0) + (card.review_counts?.good || 0),
          failCount: (card.review_counts?.again || 0),
          consecutiveSuccesses: card.consecutive_successes,
          repetitions: card.repetitions,
          interval: card.interval,
          easeFactor: card.ease_factor,
          review_counts: card.review_counts || { easy: 0, good: 0, hard: 0, again: 0 },
        }));
        setCards(cardsWithDates);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to load vocabulary cards:', error);
        setIsLoading(false);
      });
  }, [user]);

  const addCard = useCallback(async (word: string, farsiWord: string, latinWord: string, sentence: Sentence) => {
    if (!user) return;

    try {
      const dbCard = await vocabularyQueries.create(user.id, {
        word,
        farsi_word: farsiWord,
        latin_word: latinWord,
        context: {
          farsi: sentence.farsi,
          latin: sentence.latin,
          germanDecode: sentence.germanDecode,
          germanTranslation: sentence.germanTranslation,
        },
        lesson_id: sentence.lessonId || '',
        level_id: sentence.levelId || '',
        state: 'new',
        next_review: new Date().toISOString(),
        last_reviewed: null,
        repetitions: 0,
        consecutive_successes: 0,
        interval: 0,
        ease_factor: 2.5,
        review_counts: { easy: 0, good: 0, hard: 0, again: 0 },
      });

      const newCard: VocabularyCard = {
        id: dbCard.id,
        word: dbCard.word,
        farsiWord: dbCard.farsi_word,
        latinWord: dbCard.latin_word || '',
        contextSentence: dbCard.context as any,
        lessonId: dbCard.lesson_id,
        levelId: dbCard.level_id,
        state: dbCard.state as SRSState,
        createdAt: new Date(dbCard.created_at),
        lastReviewed: dbCard.last_reviewed ? new Date(dbCard.last_reviewed) : null,
        graduatedAt: dbCard.state === 'graduated' && dbCard.last_reviewed ? new Date(dbCard.last_reviewed) : null,
        nextReviewDate: new Date(dbCard.next_review),
        reviewCount: 0,
        successCount: 0,
        failCount: 0,
        consecutiveSuccesses: dbCard.consecutive_successes,
        repetitions: dbCard.repetitions,
        interval: dbCard.interval,
        easeFactor: dbCard.ease_factor,
        review_counts: dbCard.review_counts as any || { easy: 0, good: 0, hard: 0, again: 0 },
      };

      setCards(prev => [...prev, newCard]);
    } catch (error) {
      console.error('Failed to save vocabulary card:', error);
    }
  }, [user]);

  const removeCard = useCallback((cardId: string) => {
    if (!user) return;

    setCards(prev => prev.filter(card => card.id !== cardId));

    vocabularyQueries.delete(cardId).catch(error => {
      console.error('Failed to delete vocabulary card:', error);
    });
  }, [user]);

  const removeCardByWords = useCallback((german: string, farsi: string) => {
    if (!user) return;

    const card = cards.find(c => 
      c.word.toLowerCase() === german.toLowerCase() || c.farsiWord === farsi
    );
    
    if (card) {
      setCards(prev => prev.filter(c => c.id !== card.id));
      
      vocabularyQueries.delete(card.id).catch(error => {
        console.error('Failed to delete vocabulary card:', error);
      });
    }
  }, [user, cards]);

  const getCardById = useCallback((cardId: string) => {
    return cards.find(card => card.id === cardId);
  }, [cards]);

  const getCardsByState = useCallback((state: SRSState) => {
    return cards.filter(card => card.state === state);
  }, [cards]);

  const getDueCards = useCallback(() => {
    const now = new Date();
    return cards.filter(card => 
      card.state !== 'graduated' && card.nextReviewDate <= now
    );
  }, [cards]);

  const isWordMarked = useCallback((word: string, farsiWord: string) => {
    return cards.some(card => 
      card.word.toLowerCase() === word.toLowerCase() || 
      card.farsiWord === farsiWord
    );
  }, [cards]);

  // Supermemo SM-2 algorithm for spaced repetition
  const calculateNextReview = useCallback((
    card: VocabularyCard,
    difficulty: 'easy' | 'medium' | 'hard' | 'failed'
  ): { interval: number; easeFactor: number; state: SRSState; repetitions: number; consecutiveSuccesses: number } => {
    let { interval, easeFactor, repetitions, consecutiveSuccesses } = card;
    let newState: SRSState = card.state;

    const qualityMap = { failed: 0, hard: 3, medium: 4, easy: 5 };
    const quality = qualityMap[difficulty];

    if (quality < 3) {
      // Failed: reset everything
      repetitions = 0;
      consecutiveSuccesses = 0;
      interval = 1; // Review again tomorrow, not 0
      newState = 'new';
    } else {
      // Passed: update ease factor and increment repetitions
      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
      repetitions += 1;
      consecutiveSuccesses += 1;

      // SM-2 interval calculation
      if (repetitions === 1) {
        interval = 1;
        newState = 'learning';
      } else if (repetitions === 2) {
        interval = 6;
        newState = 'learning';
      } else {
        interval = Math.round(interval * easeFactor);
        newState = 'learning';
        
        // Graduate only after at least 3 consecutive successes AND interval >= 21 days
        if (consecutiveSuccesses >= 3 && interval >= 21) {
          newState = 'graduated';
        }
      }
    }

    return { interval, easeFactor, state: newState, repetitions, consecutiveSuccesses };
  }, []);

  const submitReview = useCallback((result: ReviewResult) => {
    if (!user) return;

    setCards(prev => prev.map(card => {
      if (card.id !== result.cardId) return card;

      const wasGraduated = card.state === 'graduated';
      const { interval, easeFactor, state, repetitions, consecutiveSuccesses } = calculateNextReview(card, result.difficulty);
      const now = new Date();
      const nextReviewDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
      
      const isNowGraduated = state === 'graduated';
      const graduatedAt = isNowGraduated && !wasGraduated ? now : card.graduatedAt;

      const currentReviewCounts = (card as any).review_counts || { easy: 0, good: 0, hard: 0, again: 0 };
      const reviewCounts = {
        easy: result.difficulty === 'easy' ? currentReviewCounts.easy + 1 : currentReviewCounts.easy,
        good: result.difficulty === 'medium' ? currentReviewCounts.good + 1 : currentReviewCounts.good,
        hard: result.difficulty === 'hard' ? currentReviewCounts.hard + 1 : currentReviewCounts.hard,
        again: result.difficulty === 'failed' ? currentReviewCounts.again + 1 : currentReviewCounts.again,
      };

      const totalReviews = reviewCounts.easy + reviewCounts.good + reviewCounts.hard + reviewCounts.again;
      const successfulReviews = reviewCounts.easy + reviewCounts.good;
      const failedReviews = reviewCounts.again;

      const updatedCard = {
        ...card,
        state,
        lastReviewed: now,
        graduatedAt,
        nextReviewDate,
        reviewCount: totalReviews,
        successCount: successfulReviews,
        failCount: failedReviews,
        repetitions,
        consecutiveSuccesses,
        interval,
        easeFactor,
        review_counts: reviewCounts,
      };

      vocabularyQueries.update(card.id, {
        state,
        last_reviewed: now.toISOString(),
        next_review: nextReviewDate.toISOString(),
        repetitions,
        consecutive_successes: consecutiveSuccesses,
        interval,
        ease_factor: easeFactor,
        review_counts: reviewCounts,
      }).catch(error => {
        console.error('Failed to update vocabulary card:', error);
      });

      return updatedCard;
    }));
  }, [calculateNextReview, user]);

  const getStats = useCallback((): VocabularyStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      totalCards: cards.length,
      newCards: cards.filter(c => c.state === 'new').length,
      learningCards: cards.filter(c => c.state === 'learning').length,
      graduatedCards: cards.filter(c => c.state === 'graduated').length,
      dueForReview: cards.filter(c => c.state !== 'graduated' && c.nextReviewDate <= now).length,
      reviewedToday: cards.filter(c => c.lastReviewed && c.lastReviewed >= today).length,
    };
  }, [cards]);

  const stats = getStats();

  const activeVocabulary: ActiveVocabulary = {
    words: getCardsByState('graduated').map(c => c.word),
    farsiWords: getCardsByState('graduated').map(c => c.farsiWord),
    cards: getCardsByState('graduated'),
  };

  const value: VocabularyContextType = {
    cards,
    stats,
    activeVocabulary,
    addCard,
    removeCard,
    removeCardByWords,
    getCardById,
    getCardsByState,
    getDueCards,
    submitReview,
    isWordMarked,
    getStats,
    isLoading,
  };

  return <VocabularyContext.Provider value={value}>{children}</VocabularyContext.Provider>;
};

export const useVocabulary = () => {
  const context = useContext(VocabularyContext);
  if (!context) {
    throw new Error('useVocabulary must be used within VocabularyProvider');
  }
  return context;
};
