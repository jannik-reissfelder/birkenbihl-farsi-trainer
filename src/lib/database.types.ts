export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lesson_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          level_id: string
          sentence_index: number
          completed_sentences: Json
          xp: number
          last_practice: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          level_id: string
          sentence_index?: number
          completed_sentences?: Json
          xp?: number
          last_practice?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          level_id?: string
          sentence_index?: number
          completed_sentences?: Json
          xp?: number
          last_practice?: string
        }
      }
      vocabulary_cards: {
        Row: {
          id: string
          user_id: string
          word: string
          farsi_word: string
          latin_word: string | null
          context: Json
          lesson_id: string | null
          level_id: string | null
          state: string
          created_at: string
          last_reviewed: string | null
          next_review: string | null
          repetitions: number
          consecutive_successes: number
          interval: number
          ease_factor: number
          review_counts: Json
        }
        Insert: {
          id?: string
          user_id: string
          word: string
          farsi_word: string
          latin_word?: string | null
          context: Json
          lesson_id?: string | null
          level_id?: string | null
          state?: string
          created_at?: string
          last_reviewed?: string | null
          next_review?: string | null
          repetitions?: number
          consecutive_successes?: number
          interval?: number
          ease_factor?: number
          review_counts?: Json
        }
        Update: {
          id?: string
          user_id?: string
          word?: string
          farsi_word?: string
          latin_word?: string | null
          context?: Json
          lesson_id?: string | null
          level_id?: string | null
          state?: string
          created_at?: string
          last_reviewed?: string | null
          next_review?: string | null
          repetitions?: number
          consecutive_successes?: number
          interval?: number
          ease_factor?: number
          review_counts?: Json
        }
      }
      srs_reviews: {
        Row: {
          id: string
          card_id: string
          user_id: string
          reviewed_at: string
          difficulty: string
          success: boolean
          interval: number | null
          ease_factor: number | null
        }
        Insert: {
          id?: string
          card_id: string
          user_id: string
          reviewed_at?: string
          difficulty: string
          success: boolean
          interval?: number | null
          ease_factor?: number | null
        }
        Update: {
          id?: string
          card_id?: string
          user_id?: string
          reviewed_at?: string
          difficulty?: string
          success?: boolean
          interval?: number | null
          ease_factor?: number | null
        }
      }
      gamification_stats: {
        Row: {
          user_id: string
          xp_total: number
          level: number
          streak: number
          last_login: string
          xp_per_level: Json
          created_at: string
        }
        Insert: {
          user_id: string
          xp_total?: number
          level?: number
          streak?: number
          last_login?: string
          xp_per_level?: Json
          created_at?: string
        }
        Update: {
          user_id?: string
          xp_total?: number
          level?: number
          streak?: number
          last_login?: string
          xp_per_level?: Json
          created_at?: string
        }
      }
      lesson_step_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          decode_sentence_index: number
          decode_answers: Json
          decode_completed: boolean
          decode_completed_at: string | null
          karaoke_completed: boolean
          karaoke_completed_at: string | null
          lesson_completed: boolean
          lesson_completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          decode_sentence_index?: number
          decode_answers?: Json
          decode_completed?: boolean
          decode_completed_at?: string | null
          karaoke_completed?: boolean
          karaoke_completed_at?: string | null
          lesson_completed?: boolean
          lesson_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          decode_sentence_index?: number
          decode_answers?: Json
          decode_completed?: boolean
          decode_completed_at?: string | null
          karaoke_completed?: boolean
          karaoke_completed_at?: string | null
          lesson_completed?: boolean
          lesson_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      free_speaking_sessions: {
        Row: {
          id: string
          user_id: string
          started_at: string
          ended_at: string | null
          message_count: number
          summary: string | null
          topics_discussed: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          started_at?: string
          ended_at?: string | null
          message_count?: number
          summary?: string | null
          topics_discussed?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          started_at?: string
          ended_at?: string | null
          message_count?: number
          summary?: string | null
          topics_discussed?: Json
          created_at?: string
        }
      }
    }
  }
}
