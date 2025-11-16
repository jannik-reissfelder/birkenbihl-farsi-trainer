import { supabase } from '../lib/supabaseClient';
import { lessonProgressQueries, vocabularyQueries, gamificationQueries } from '../lib/supabaseQueries';

interface LocalStorageProgress {
  [lessonId: string]: {
    currentIndex: number;
    completedSentences: number[];
    xp: number;
    lastPractice: string;
  };
}

interface LocalStorageVocabCard {
  id: string;
  word: string;
  farsiWord: string;
  latinWord?: string;
  sentence: string;
  translation: string;
  lessonId: string;
  levelId: string;
  addedAt: string;
  state: 'new' | 'learning' | 'graduated';
  lastReviewed?: string;
  nextReview?: string;
  repetitions: number;
  consecutiveSuccesses: number;
  interval: number;
  easeFactor: number;
  reviewCounts: {
    easy: number;
    good: number;
    hard: number;
    again: number;
  };
}

interface LocalStorageGamification {
  xp: number;
  level: number;
  streak: number;
  lastLoginDate: string;
  xpPerLevel: Record<string, number>;
}

export async function migrateLocalStorageToSupabase(): Promise<{
  success: boolean;
  progressMigrated: number;
  vocabMigrated: number;
  gamificationMigrated: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let progressMigrated = 0;
  let vocabMigrated = 0;
  let gamificationMigrated = false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    const progressData = localStorage.getItem('lessonProgress');
    if (progressData) {
      try {
        const progress: LocalStorageProgress = JSON.parse(progressData);
        
        for (const [lessonId, data] of Object.entries(progress)) {
          try {
            const levelId = lessonId.split('-')[0] || 'A1';
            
            await lessonProgressQueries.upsert(user.id, {
              lesson_id: lessonId,
              level_id: levelId,
              sentence_index: data.currentIndex,
              completed_sentences: data.completedSentences,
              xp: data.xp,
              last_practice: data.lastPractice,
            });
            progressMigrated++;
          } catch (err) {
            errors.push(`Failed to migrate progress for ${lessonId}: ${err}`);
          }
        }
      } catch (err) {
        errors.push(`Failed to parse lesson progress: ${err}`);
      }
    }

    const vocabData = localStorage.getItem('vocabularyCards');
    if (vocabData) {
      try {
        const cards: LocalStorageVocabCard[] = JSON.parse(vocabData);
        
        for (const card of cards) {
          try {
            await vocabularyQueries.create(user.id, {
              word: card.word,
              farsi_word: card.farsiWord,
              latin_word: card.latinWord || null,
              context: {
                sentence: card.sentence,
                translation: card.translation,
                lessonId: card.lessonId,
              },
              lesson_id: card.lessonId,
              level_id: card.levelId,
              state: card.state,
              last_reviewed: card.lastReviewed || null,
              next_review: card.nextReview || null,
              repetitions: card.repetitions,
              consecutive_successes: card.consecutiveSuccesses,
              interval: card.interval,
              ease_factor: card.easeFactor,
              review_counts: card.reviewCounts,
            });
            vocabMigrated++;
          } catch (err) {
            errors.push(`Failed to migrate vocab card ${card.id}: ${err}`);
          }
        }
      } catch (err) {
        errors.push(`Failed to parse vocabulary cards: ${err}`);
      }
    }

    const gamificationData = localStorage.getItem('gamificationStats');
    if (gamificationData) {
      try {
        const stats: LocalStorageGamification = JSON.parse(gamificationData);
        
        await gamificationQueries.upsert(user.id, {
          xp_total: stats.xp,
          level: stats.level,
          streak: stats.streak,
          last_login: stats.lastLoginDate,
          xp_per_level: stats.xpPerLevel,
        });
        gamificationMigrated = true;
      } catch (err) {
        errors.push(`Failed to migrate gamification stats: ${err}`);
      }
    }

    if (progressMigrated > 0 || vocabMigrated > 0 || gamificationMigrated) {
      localStorage.setItem('migrated_to_supabase', 'true');
      localStorage.setItem('migration_date', new Date().toISOString());
    }

    return {
      success: errors.length === 0,
      progressMigrated,
      vocabMigrated,
      gamificationMigrated,
      errors,
    };
  } catch (err) {
    errors.push(`Migration failed: ${err}`);
    return {
      success: false,
      progressMigrated,
      vocabMigrated,
      gamificationMigrated,
      errors,
    };
  }
}

export function hasLocalStorageData(): boolean {
  const hasProgress = !!localStorage.getItem('lessonProgress');
  const hasVocab = !!localStorage.getItem('vocabularyCards');
  const hasGamification = !!localStorage.getItem('gamificationStats');
  const alreadyMigrated = localStorage.getItem('migrated_to_supabase') === 'true';
  
  return (hasProgress || hasVocab || hasGamification) && !alreadyMigrated;
}
