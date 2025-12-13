import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TokenColumn } from './TokenColumn';
import type { Token } from '@/hooks/useSentenceTokens';

interface TokenStackGridProps {
  tokens: Token[];
  userAnswers: string[];
  decodeResults: boolean[];
  isChecked: boolean;
  onAnswerChange: (wordIndex: number, value: string) => void;
  onMarkWord: (token: Token) => void;
  onUnmarkWord: (german: string, farsi: string) => void;
  isWordMarked: (german: string, farsi: string) => boolean;
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
}) => {
  let wordIndex = -1;

  const getWordIndex = (token: Token): number => {
    if (token.isPunctuation) return -1;
    wordIndex++;
    return wordIndex;
  };

  return (
    <Card className="bg-gray-900/50 border-gray-700">
      <CardContent className="p-4 md:p-6">
        <div 
          className="grid gap-x-3 gap-y-0 justify-center items-start"
          dir="rtl"
          style={{
            gridTemplateColumns: `repeat(${tokens.length}, minmax(4rem, auto))`,
          }}
        >
          {tokens.map((token, tokenIndex) => {
            const currentWordIndex = getWordIndex(token);
            const marked = !token.isPunctuation && isWordMarked(token.german, token.farsi);
            const isCorrect = !token.isPunctuation && isChecked 
              ? decodeResults[currentWordIndex] ?? null 
              : null;

            const handleToggleMark = () => {
              if (marked) {
                onUnmarkWord(token.german, token.farsi);
              } else {
                onMarkWord(token);
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
                isCorrect={isCorrect}
                isChecked={isChecked}
                userAnswer={userAnswers[currentWordIndex] || ''}
                onAnswerChange={(value) => onAnswerChange(currentWordIndex, value)}
                onToggleMark={handleToggleMark}
                gridColumn={tokenIndex + 1}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenStackGrid;
