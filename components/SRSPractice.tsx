import React, { useState, useEffect, useMemo } from 'react';
import { useVocabulary } from '../contexts/VocabularyContext';
import { VocabularyCard } from '../types/vocabulary';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { CheckIcon } from './icons/CheckIcon';
import { CloseIcon } from './icons/CloseIcon';

interface SRSPracticeProps {
  onComplete?: () => void;
}

const SRSPractice: React.FC<SRSPracticeProps> = ({ onComplete }) => {
  const { getDueCards, submitReview, stats } = useVocabulary();
  const [dueCards, setDueCards] = useState<VocabularyCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    const cards = getDueCards();
    setDueCards(cards);
    if (cards.length === 0) {
      setSessionComplete(true);
    }
  }, [getDueCards]);

  const currentCard = useMemo(() => dueCards[currentCardIndex], [dueCards, currentCardIndex]);

  const highlightWord = (text: string, targetWord: string): React.ReactNode => {
    if (!targetWord || targetWord.trim() === '') return text;
    
    // Simple highlight - wrap target word in styled span
    const parts = text.split(new RegExp(`(${targetWord})`, 'gi'));
    
    return parts.map((part, index) => 
      part.toLowerCase() === targetWord.toLowerCase() ? (
        <span key={index} className="bg-yellow-500/30 px-1 rounded font-semibold text-yellow-300">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const createClozeText = (text: string, targetWord: string, caseSensitive = true): React.ReactNode => {
    if (!targetWord || targetWord.trim() === '') {
      return text;
    }

    // Token regex that matches Unicode letters, numbers, apostrophes, hyphens, and punctuation
    const tokenRegex = /[\p{L}\p{N}'-]+|[.,!?؟«»]/gu;
    const textMatches = Array.from(text.matchAll(tokenRegex));
    const targetTokens = (targetWord.match(tokenRegex) || []).filter(Boolean);

    if (textMatches.length === 0 || targetTokens.length === 0) {
      return text;
    }

    const normalize = (s: string) => (caseSensitive ? s : s.toLowerCase());
    const normalizedTarget = targetTokens.map(normalize);
    const normalizedText = textMatches.map((m) => normalize(m[0]));

    // Find the first contiguous token-span match (supports multi-token grouped cards)
    let matchStart = -1;
    for (let i = 0; i <= normalizedText.length - normalizedTarget.length; i++) {
      let ok = true;
      for (let j = 0; j < normalizedTarget.length; j++) {
        if (normalizedText[i + j] !== normalizedTarget[j]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        matchStart = i;
        break;
      }
    }

    if (matchStart === -1) {
      return text;
    }

    const matchEnd = matchStart + normalizedTarget.length - 1;
    const startIndex = textMatches[matchStart].index ?? 0;
    const endMatch = textMatches[matchEnd];
    const endIndex = (endMatch.index ?? 0) + endMatch[0].length;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;

    // Pre-span
    if (startIndex > 0) {
      parts.push(text.substring(0, startIndex));
      lastIndex = startIndex;
    }

    // Cloze span
    const matchedText = text.substring(startIndex, endIndex);
    parts.push(
      <span key={key++} className="inline-block min-w-[140px] mx-1 px-4 py-1 bg-blue-500/30 border-b-2 border-blue-400 rounded">
        {showAnswer ? (
          <span className="text-blue-300 font-bold animate-fade-in">{matchedText}</span>
        ) : (
          <span className="text-transparent select-none">______</span>
        )}
      </span>
    );

    lastIndex = endIndex;

    // Post-span
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const handleDifficultySelect = (difficulty: 'easy' | 'medium' | 'hard' | 'failed') => {
    if (!currentCard) return;

    submitReview({
      cardId: currentCard.id,
      difficulty,
      success: difficulty !== 'failed',
      timestamp: new Date(),
    });

    setReviewedCount(prev => prev + 1);

    if (currentCardIndex < dueCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setSessionComplete(true);
    }
  };

  if (sessionComplete) {
    return (
      <div className="max-w-4xl mx-auto p-6 animate-fade-in">
        <Card className="p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-4">
              <CheckIcon className="h-10 w-10 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-green-400 mb-2">Session Complete!</h2>
            <p className="text-gray-400 text-lg">
              {reviewedCount > 0 
                ? `You reviewed ${reviewedCount} card${reviewedCount === 1 ? '' : 's'}`
                : 'No cards due for review right now'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 max-w-md mx-auto">
            <div className="p-4 bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-teal-400">{stats.totalCards}</div>
              <div className="text-sm text-gray-400">Total Cards</div>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{stats.graduatedCards}</div>
              <div className="text-sm text-gray-400">Graduated</div>
            </div>
          </div>

          <Button onClick={onComplete} variant="default" size="lg">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <p className="text-gray-400">Loading cards...</p>
        </Card>
      </div>
    );
  }

  const progress = ((currentCardIndex) / dueCards.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold text-teal-300">SRS Practice</h2>
          <span className="text-gray-400">
            Card {currentCardIndex + 1} of {dueCards.length}
          </span>
        </div>
        <Progress value={progress} max={100} className="h-2" />
      </div>

      <Card className="p-8 mb-6">
        <div className="mb-8">
          <div className="text-sm text-gray-500 uppercase tracking-wide mb-2">
            {currentCard.state === 'new' ? 'New Card' : `Interval: ${currentCard.interval} days`}
          </div>
          <h3 className="text-xl font-semibold text-gray-400 mb-6">
            Fill in the blank with the correct word
          </h3>

          <div className="space-y-6">
            <div className="p-6 bg-gray-900/50 rounded-lg" dir="rtl">
              <div className="text-sm text-gray-500 mb-2 text-left">Farsi:</div>
              <p className="text-2xl font-bold text-blue-300 font-mono leading-relaxed">
                {createClozeText(currentCard.contextSentence.farsi, currentCard.farsiWord, true)}
              </p>
            </div>

            <div className="p-6 bg-gray-900/50 rounded-lg">
              <div className="text-sm text-gray-500 mb-2">Latin Transliteration:</div>
              <p className="text-xl text-gray-400 leading-relaxed">
                {createClozeText(currentCard.contextSentence.latin, currentCard.latinWord, false)}
              </p>
            </div>

            <div className="p-6 bg-gray-900/50 rounded-lg">
              <div className="text-sm text-gray-500 mb-2">German Word-by-Word:</div>
              <p className="text-xl text-gray-300 leading-relaxed">
                {highlightWord(currentCard.contextSentence.germanDecode, currentCard.word)}
              </p>
            </div>

            {showAnswer && (
              <div className="p-6 bg-teal-900/20 border border-teal-500/30 rounded-lg animate-fade-in">
                <div className="text-sm text-teal-400 mb-2">Full Translation:</div>
                <p className="text-lg text-teal-300">{currentCard.contextSentence.germanTranslation}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {!showAnswer ? (
            <Button
              onClick={() => setShowAnswer(true)}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Show Answer
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-gray-400 text-sm mb-2">How well did you remember?</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleDifficultySelect('failed')}
                  variant="outline"
                  className="border-red-500/50 hover:bg-red-500/20 hover:border-red-500"
                >
                  <CloseIcon className="h-5 w-5 mr-2 text-red-400" />
                  Failed
                </Button>
                <Button
                  onClick={() => handleDifficultySelect('hard')}
                  variant="outline"
                  className="border-orange-500/50 hover:bg-orange-500/20 hover:border-orange-500"
                >
                  Hard
                </Button>
                <Button
                  onClick={() => handleDifficultySelect('medium')}
                  variant="outline"
                  className="border-yellow-500/50 hover:bg-yellow-500/20 hover:border-yellow-500"
                >
                  Medium
                </Button>
                <Button
                  onClick={() => handleDifficultySelect('easy')}
                  variant="outline"
                  className="border-green-500/50 hover:bg-green-500/20 hover:border-green-500"
                >
                  <CheckIcon className="h-5 w-5 mr-2 text-green-400" />
                  Easy
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Review Count: {currentCard.reviewCount} | 
          Success Rate: {currentCard.reviewCount > 0 
            ? Math.round((currentCard.successCount / currentCard.reviewCount) * 100) 
            : 0}%
        </p>
      </div>
    </div>
  );
};

export default SRSPractice;
