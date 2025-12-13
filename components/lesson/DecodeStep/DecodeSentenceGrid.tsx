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
  onUnmarkWord: (german: string, farsi: string) => void;
  isWordMarked: (german: string, farsi: string) => boolean;
}

export const DecodeSentenceGrid: React.FC<DecodeSentenceGridProps> = ({
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

  return (
    <Card className="bg-gray-900/50 p-4 md:p-6 border-gray-700">
      <div 
        className="grid gap-x-2 gap-y-1 justify-center"
        dir="rtl"
        style={{
          gridTemplateColumns: `repeat(${tokens.length}, minmax(4rem, auto))`,
          gridTemplateRows: 'auto auto auto auto',
        }}
      >
        {tokens.map((token, tokenIndex) => {
          if (token.isPunctuation) {
            return (
              <React.Fragment key={token.id}>
                <span 
                  className="text-2xl md:text-3xl font-bold text-gray-300 text-center self-end pb-1"
                  style={{ gridRow: 1, gridColumn: tokenIndex + 1 }}
                >
                  {token.farsi}
                </span>
                <span 
                  className="text-gray-500 text-sm text-center"
                  style={{ gridRow: 2, gridColumn: tokenIndex + 1 }}
                >
                  &nbsp;
                </span>
                <span 
                  style={{ gridRow: 3, gridColumn: tokenIndex + 1 }}
                >
                  &nbsp;
                </span>
                <span 
                  style={{ gridRow: 4, gridColumn: tokenIndex + 1 }}
                >
                  &nbsp;
                </span>
              </React.Fragment>
            );
          }

          wordIndex++;
          const currentWordIndex = wordIndex;
          const marked = isWordMarked(token.german, token.farsi);
          const isCorrect = isChecked && decodeResults[currentWordIndex] === true;
          const isWrong = isChecked && decodeResults[currentWordIndex] === false;

          const handleToggleMark = () => {
            if (marked) {
              onUnmarkWord(token.german, token.farsi);
            } else {
              onMarkWord(token);
            }
          };

          return (
            <React.Fragment key={token.id}>
              <button
                onClick={handleToggleMark}
                className={`text-2xl md:text-3xl font-bold font-mono tracking-wide transition-all px-2 py-1 rounded text-center relative ${
                  marked
                    ? 'text-yellow-300 bg-yellow-500/20 hover:bg-yellow-500/30 cursor-pointer'
                    : 'text-blue-300 hover:bg-blue-500/20 cursor-pointer'
                }`}
                style={{ gridRow: 1, gridColumn: tokenIndex + 1 }}
                title={marked ? `★ ${token.german} - Klicken zum Entfernen` : 'Für SRS markieren'}
                dir="rtl"
              >
                {token.farsi}
                {marked && (
                  <span className="absolute -top-1 -right-1 text-yellow-400 text-xs">★</span>
                )}
              </button>

              <span 
                className="text-gray-400 text-sm text-center h-5 flex items-center justify-center"
                style={{ gridRow: 2, gridColumn: tokenIndex + 1 }}
                dir="ltr"
              >
                {token.latin}
              </span>

              <input
                type="text"
                value={userAnswers[currentWordIndex] || ''}
                onChange={(e) => onAnswerChange(currentWordIndex, e.target.value)}
                disabled={isCorrect}
                className={`w-full min-w-[4rem] bg-gray-700 border rounded-md text-center text-white p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors text-sm ${
                  isCorrect
                    ? 'border-green-500 bg-green-900/20'
                    : isWrong
                    ? 'border-red-500 bg-red-900/20'
                    : 'border-gray-600'
                }`}
                style={{ gridRow: 3, gridColumn: tokenIndex + 1 }}
                dir="ltr"
                aria-invalid={isWrong ? 'true' : 'false'}
              />

              <div 
                className="h-5 flex items-center justify-center"
                style={{ gridRow: 4, gridColumn: tokenIndex + 1 }}
              >
                {isWrong && (
                  <span className="text-green-400 text-xs font-semibold animate-fade-in">
                    {token.german}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
};

export default DecodeSentenceGrid;
