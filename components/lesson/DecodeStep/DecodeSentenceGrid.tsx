import React from 'react';
import type { Token } from '@/hooks/useSentenceTokens';
import { Card } from '@/components/ui/card';

interface DecodeSentenceGridProps {
  tokens: Token[];
  userAnswers: string[];
  decodeResults: boolean[];
  isChecked: boolean;
  onAnswerChange: (wordIndex: number, value: string) => void;
  onMarkWord: (token: Token) => void;
  isWordMarked: (german: string, farsi: string) => boolean;
}

export const DecodeSentenceGrid: React.FC<DecodeSentenceGridProps> = ({
  tokens,
  userAnswers,
  decodeResults,
  isChecked,
  onAnswerChange,
  onMarkWord,
  isWordMarked,
}) => {
  let wordIndex = -1;

  return (
    <Card className="bg-gray-900/50 p-4 md:p-6 border-gray-700">
      <div className="flex flex-row-reverse flex-wrap justify-center items-end gap-x-3 gap-y-4">
        {tokens.map((token) => {
          if (token.isPunctuation) {
            return (
              <span key={token.id} className="text-2xl font-bold text-gray-300 pb-2">
                {token.farsi}
              </span>
            );
          }

          wordIndex++;
          const currentWordIndex = wordIndex;
          const marked = isWordMarked(token.german, token.farsi);
          const isCorrect = isChecked && decodeResults[currentWordIndex] === true;
          const isWrong = isChecked && decodeResults[currentWordIndex] === false;

          return (
            <div key={token.id} className="flex flex-col items-center gap-1 min-w-[7rem]">
              <button
                onClick={() => !marked && onMarkWord(token)}
                disabled={marked}
                className={`relative text-2xl md:text-3xl font-bold font-mono tracking-wide transition-all px-2 py-1 rounded text-center w-full ${
                  marked
                    ? 'text-yellow-300 bg-yellow-500/20 cursor-default'
                    : 'text-blue-300 hover:bg-blue-500/20 cursor-pointer'
                }`}
                title={marked ? 'Bereits markiert' : 'Für SRS markieren'}
                dir="rtl"
              >
                {token.farsi}
                {marked && (
                  <span className="absolute -top-1 -right-1 text-yellow-400 text-sm">★</span>
                )}
              </button>

              <span className="text-gray-400 text-sm h-5 flex items-center justify-center">
                {token.latin}
              </span>

              <input
                type="text"
                value={userAnswers[currentWordIndex] || ''}
                onChange={(e) => onAnswerChange(currentWordIndex, e.target.value)}
                disabled={isCorrect}
                className={`w-full bg-gray-700 border rounded-md text-center text-white p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors ${
                  isCorrect
                    ? 'border-green-500 bg-green-900/20'
                    : isWrong
                    ? 'border-red-500 bg-red-900/20'
                    : 'border-gray-600'
                }`}
                aria-invalid={isWrong ? 'true' : 'false'}
              />

              <div className="h-5 flex items-center justify-center">
                {isWrong && (
                  <span className="text-green-400 text-sm font-semibold animate-fade-in">
                    {token.german}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default DecodeSentenceGrid;
