import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TokenColumn } from './TokenColumn';
import { cn } from '@/lib/utils';
import type { Token } from '@/hooks/useSentenceTokens';
import type { Sentence } from '@/types';

interface TokenStackGridProps {
  tokens: Token[];
  userAnswers: string[];
  decodeResults: boolean[];
  isChecked: boolean;
  onAnswerChange: (wordIndex: number, value: string) => void;
  onMarkWord: (token: Token) => void;
  onUnmarkWord: (german: string, farsi: string) => void;
  isWordMarked: (german: string, farsi: string) => boolean;
  markingMode: boolean;
  onAddCard: (german: string, farsi: string, latin: string, sentence: Sentence) => void;
  currentSentence: Sentence;
}

export const TokenStackGrid: React.FC<TokenStackGridProps> = ({
  tokens,
  userAnswers,
  decodeResults,
  isChecked,
  onAnswerChange,
  onMarkWord,
  onUnmarkWord,
  isWordMarked,
  markingMode,
  onAddCard,
  currentSentence,
}) => {
  const [selectionMode, setSelectionMode] = useState<'single' | 'multi'>('single');
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(new Set());
  const lastClickedIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectionMode('single');
    setSelectedTokenIds(new Set());
    lastClickedIndexRef.current = null;
  }, [markingMode]);

  useEffect(() => {
    lastClickedIndexRef.current = null;
  }, [tokens.length]);
  
  const nonPunctuationTokens = tokens.filter(t => !t.isPunctuation);
  
  let wordIndex = -1;

  const getWordIndex = (token: Token): number => {
    if (token.isPunctuation) return -1;
    wordIndex++;
    return wordIndex;
  };

  const handleTokenClick = useCallback((token: Token, event?: React.MouseEvent) => {
    if (token.isPunctuation) return;
    
    const tokenIndex = nonPunctuationTokens.findIndex(t => t.id === token.id);
    const marked = isWordMarked(token.german, token.farsi);
    const shiftKey = event?.shiftKey ?? false;

    if (selectionMode === 'single') {
      if (shiftKey && lastClickedIndexRef.current !== null) {
        setSelectionMode('multi');
        const start = Math.min(lastClickedIndexRef.current, tokenIndex);
        const end = Math.max(lastClickedIndexRef.current, tokenIndex);
        const rangeIds = nonPunctuationTokens.slice(start, end + 1).map(t => t.id);
        setSelectedTokenIds(new Set(rangeIds));
      } else {
        if (marked) {
          onUnmarkWord(token.german, token.farsi);
        } else {
          onAddCard(token.german, token.farsi, token.latin, currentSentence);
        }
        lastClickedIndexRef.current = tokenIndex;
      }
    } else {
      if (shiftKey && lastClickedIndexRef.current !== null) {
        const start = Math.min(lastClickedIndexRef.current, tokenIndex);
        const end = Math.max(lastClickedIndexRef.current, tokenIndex);
        const rangeIds = nonPunctuationTokens.slice(start, end + 1).map(t => t.id);
        setSelectedTokenIds(prev => {
          const next = new Set(prev);
          rangeIds.forEach(id => next.add(id));
          return next;
        });
      } else {
        setSelectedTokenIds(prev => {
          const next = new Set(prev);
          if (next.has(token.id)) {
            next.delete(token.id);
          } else {
            next.add(token.id);
          }
          return next;
        });
        lastClickedIndexRef.current = tokenIndex;
      }
    }
  }, [selectionMode, isWordMarked, onUnmarkWord, onAddCard, currentSentence, nonPunctuationTokens]);

  const confirmMultiWordSelection = useCallback(() => {
    if (selectedTokenIds.size < 2) return;

    const selected = nonPunctuationTokens
      .filter(t => selectedTokenIds.has(t.id))
      .sort((a, b) => a.index - b.index);

    const combinedFarsi = selected.map(t => t.farsi).join(' ');
    const combinedLatin = selected.map(t => t.latin).join(' ');
    const combinedGerman = selected.map(t => t.german).join(' ');

    onAddCard(combinedGerman, combinedFarsi, combinedLatin, currentSentence);
    setSelectedTokenIds(new Set());
    setSelectionMode('single');
    lastClickedIndexRef.current = null;
  }, [selectedTokenIds, nonPunctuationTokens, onAddCard, currentSentence]);

  const cancelMultiWordSelection = useCallback(() => {
    setSelectedTokenIds(new Set());
    setSelectionMode('single');
    lastClickedIndexRef.current = null;
  }, []);

  return (
    <Card className={cn(
      "border-gray-700 transition-colors",
      markingMode ? "bg-purple-900/20 border-purple-700/50" : "bg-gray-900/50"
    )}>
      <CardContent className="p-4 md:p-6">
        {markingMode && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-center gap-2">
              <ToggleGroup 
                type="single" 
                value={selectionMode}
                onValueChange={(value) => {
                  if (value) {
                    setSelectionMode(value as 'single' | 'multi');
                    setSelectedTokenIds(new Set());
                  }
                }}
                className="bg-gray-800 rounded-lg p-1"
              >
                <ToggleGroupItem 
                  value="single"
                  className={cn(
                    'px-3 py-1 text-sm rounded-md transition-colors',
                    'data-[state=on]:bg-purple-600 data-[state=on]:text-white',
                    'data-[state=off]:text-gray-300 data-[state=off]:hover:bg-gray-700'
                  )}
                >
                  Einzelwort
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="multi"
                  className={cn(
                    'px-3 py-1 text-sm rounded-md transition-colors',
                    'data-[state=on]:bg-purple-600 data-[state=on]:text-white',
                    'data-[state=off]:text-gray-300 data-[state=off]:hover:bg-gray-700'
                  )}
                >
                  Mehrere Wörter
                </ToggleGroupItem>
              </ToggleGroup>
              <span className="text-gray-500 text-xs hidden md:inline ml-2">
                (Shift+Klick für Bereich)
              </span>
            </div>

            {selectionMode === 'multi' && selectedTokenIds.size > 0 && (
              <div className="flex items-center justify-center gap-2 p-2 bg-purple-900/30 rounded-lg">
                <span className="text-purple-200 text-sm">
                  {selectedTokenIds.size} Wörter ausgewählt
                </span>
                <Button
                  onClick={confirmMultiWordSelection}
                  disabled={selectedTokenIds.size < 2}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Als Gruppe markieren
                </Button>
                <Button
                  onClick={cancelMultiWordSelection}
                  variant="secondary"
                  size="sm"
                  className="bg-gray-600 hover:bg-gray-500 text-white"
                >
                  Abbrechen
                </Button>
              </div>
            )}
          </div>
        )}

        <div 
          className="flex flex-wrap justify-center items-start gap-x-3 gap-y-4"
          dir="rtl"
        >
          {tokens.map((token) => {
            const currentWordIndex = getWordIndex(token);
            const marked = !token.isPunctuation && isWordMarked(token.german, token.farsi);
            const isCorrect = !token.isPunctuation && isChecked 
              ? decodeResults[currentWordIndex] ?? null 
              : null;
            const isSelected = markingMode && selectedTokenIds.has(token.id);

            const handleToggleMark = (event?: React.MouseEvent) => {
              if (markingMode) {
                handleTokenClick(token, event);
              } else {
                if (marked) {
                  onUnmarkWord(token.german, token.farsi);
                } else {
                  onMarkWord(token);
                }
              }
            };

            return (
              <TokenColumn
                key={token.id}
                tokenId={token.id}
                farsi={token.farsi}
                latin={token.latin}
                german={token.german}
                wordIndex={currentWordIndex}
                isPunctuation={token.isPunctuation}
                isMarked={marked}
                isSelected={isSelected}
                isCorrect={isCorrect}
                isChecked={isChecked}
                userAnswer={userAnswers[currentWordIndex] || ''}
                onAnswerChange={(value) => onAnswerChange(currentWordIndex, value)}
                onToggleMark={handleToggleMark}
                markingMode={markingMode}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenStackGrid;
