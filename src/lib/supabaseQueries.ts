import { supabase } from './supabaseClient';
import type { Database } from './database.types';

type LessonProgress = Database['public']['Tables']['lesson_progress']['Row'];
type VocabularyCard = Database['public']['Tables']['vocabulary_cards']['Row'];
type SrsReview = Database['public']['Tables']['srs_reviews']['Row'];
type GamificationStats = Database['public']['Tables']['gamification_stats']['Row'];

export const lessonProgressQueries = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data as LessonProgress[];
  },

  async getByLessonId(userId: string, lessonId: string) {
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as LessonProgress | null;
  },

  async upsert(userId: string, progress: Omit<LessonProgress, 'id' | 'user_id'>) {
    const { data, error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: userId,
        ...progress,
      } as any, {
        onConflict: 'user_id,lesson_id',
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as LessonProgress;
  },

  async delete(userId: string, lessonId: string) {
    const { error } = await supabase
      .from('lesson_progress')
      .delete()
      .eq('user_id', userId)
      .eq('lesson_id', lessonId);
    
    if (error) throw error;
  },
};

export const vocabularyQueries = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('vocabulary_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as VocabularyCard[];
  },

  async getByState(userId: string, state: string) {
    const { data, error } = await supabase
      .from('vocabulary_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('state', state)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as VocabularyCard[];
  },

  async getDueForReview(userId: string) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('vocabulary_cards')
      .select('*')
      .eq('user_id', userId)
      .in('state', ['new', 'learning'])
      .or(`next_review.is.null,next_review.lte.${now}`)
      .order('next_review', { ascending: true, nullsFirst: true });
    
    if (error) throw error;
    return data as VocabularyCard[];
  },

  async create(userId: string, card: Omit<VocabularyCard, 'id' | 'user_id' | 'created_at'>) {
    const { data, error} = await supabase
      .from('vocabulary_cards')
      .insert({
        user_id: userId,
        ...card,
      } as any)
      .select()
      .single();
    
    if (error) throw error;
    return data as VocabularyCard;
  },

  async update(cardId: string, updates: Partial<Omit<VocabularyCard, 'id' | 'user_id'>>) {
    const { data, error } = await supabase
      .from('vocabulary_cards')
      .update(updates as any)
      .eq('id', cardId)
      .select()
      .single();
    
    if (error) throw error;
    return data as VocabularyCard;
  },

  async delete(cardId: string) {
    const { error } = await supabase
      .from('vocabulary_cards')
      .delete()
      .eq('id', cardId);
    
    if (error) throw error;
  },
};

export const srsReviewQueries = {
  async create(userId: string, review: Omit<SrsReview, 'id' | 'user_id' | 'reviewed_at'>) {
    const { data, error } = await supabase
      .from('srs_reviews')
      .insert({
        user_id: userId,
        ...review,
      } as any)
      .select()
      .single();
    
    if (error) throw error;
    return data as SrsReview;
  },

  async getByCardId(cardId: string) {
    const { data, error } = await supabase
      .from('srs_reviews')
      .select('*')
      .eq('card_id', cardId)
      .order('reviewed_at', { ascending: false });
    
    if (error) throw error;
    return data as SrsReview[];
  },
};

export const gamificationQueries = {
  async get(userId: string) {
    const { data, error } = await supabase
      .from('gamification_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as GamificationStats | null;
  },

  async upsert(userId: string, stats: Omit<GamificationStats, 'user_id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('gamification_stats')
      .upsert({
        user_id: userId,
        ...stats,
      } as any)
      .select()
      .single();
    
    if (error) throw error;
    return data as GamificationStats;
  },

  async incrementXP(userId: string, amount: number) {
    const current = await this.get(userId);
    if (!current) {
      return this.upsert(userId, {
        xp_total: amount,
        level: 1,
        streak: 0,
        last_login: new Date().toISOString(),
        xp_per_level: { "1": amount },
      });
    }

    const newTotal = current.xp_total + amount;
    const newLevel = Math.floor(newTotal / 1000) + 1;
    const xpPerLevel = current.xp_per_level as Record<string, number>;
    xpPerLevel[newLevel.toString()] = (xpPerLevel[newLevel.toString()] || 0) + amount;

    return this.upsert(userId, {
      xp_total: newTotal,
      level: newLevel,
      streak: current.streak,
      last_login: new Date().toISOString(),
      xp_per_level: xpPerLevel,
    });
  },

  async updateStreak(userId: string) {
    const current = await this.get(userId);
    if (!current) return null;

    const now = new Date();
    const lastLogin = new Date(current.last_login);
    const hoursDiff = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);

    let newStreak = current.streak;
    if (hoursDiff < 24) {
      newStreak = current.streak;
    } else if (hoursDiff < 48) {
      newStreak = current.streak + 1;
    } else {
      newStreak = 1;
    }

    return this.upsert(userId, {
      ...current,
      streak: newStreak,
      last_login: now.toISOString(),
    });
  },
};
