import { useMemo } from 'react';
import type { Sentence } from '../types';

export interface Token {
  id: string;
  index: number;
  farsi: string;
  latin: string;
  german: string;
  isPunctuation: boolean;
}

export interface SentenceTokens {
  tokens: Token[];
  wordTokens: Token[];
  farsiText: string;
  latinText: string;
  germanDecode: string;
  germanTranslation: string;
}

const TOKEN_REGEX = /D\.O\.|[\p{L}\p{N}'-]+|[.,!?؟،؛:«»]/gu;
const PUNCTUATION_REGEX = /^[.,!?؟،؛:«»]$/u;

export const useSentenceTokens = (sentence: Sentence | undefined): SentenceTokens | null => {
  return useMemo(() => {
    if (!sentence) return null;

    const farsiParts = sentence.farsi.match(TOKEN_REGEX) || [];
    const latinParts = sentence.latin.match(TOKEN_REGEX) || [];
    const germanParts = sentence.germanDecode.match(TOKEN_REGEX) || [];

    const tokens: Token[] = farsiParts.map((farsi, index) => {
      const isPunctuation = PUNCTUATION_REGEX.test(farsi);
      return {
        id: `${sentence.id}-${index}`,
        index,
        farsi,
        latin: latinParts[index] || '',
        german: germanParts[index] || '',
        isPunctuation,
      };
    });

    const wordTokens = tokens.filter(t => !t.isPunctuation);

    return {
      tokens,
      wordTokens,
      farsiText: sentence.farsi,
      latinText: sentence.latin,
      germanDecode: sentence.germanDecode,
      germanTranslation: sentence.germanTranslation,
    };
  }, [sentence]);
};

export const validateSentenceIndex = (index: number, totalSentences: number): number => {
  if (totalSentences <= 0) return 0;
  if (index < 0) return 0;
  if (index >= totalSentences) return Math.max(0, totalSentences - 1);
  return index;
};

/**
 * Sanitizes decode answers to remove stale entries that don't correspond to valid sentence indices.
 * Also trims answer arrays to match the expected word count if needed.
 */
export const sanitizeDecodeAnswers = (
  answers: Record<number, string[]>,
  totalSentences: number
): Record<number, string[]> => {
  if (totalSentences <= 0) return {};
  
  const sanitized: Record<number, string[]> = {};
  
  for (const [indexStr, answerArray] of Object.entries(answers)) {
    const index = parseInt(indexStr, 10);
    // Only keep answers for valid sentence indices
    if (!isNaN(index) && index >= 0 && index < totalSentences && Array.isArray(answerArray)) {
      sanitized[index] = answerArray;
    }
  }
  
  return sanitized;
};
