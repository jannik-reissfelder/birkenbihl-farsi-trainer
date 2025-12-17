import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TokenColumnProps {
  farsi: string;
  latin: string;
  german: string;
  tokenId: string;
  wordIndex: number;
  isPunctuation: boolean;
  isMarked: boolean;
  isSelected?: boolean;
  isCorrect: boolean | null;
  isChecked: boolean;
  userAnswer: string;
  onAnswerChange: (value: string) => void;
  onToggleMark: (event?: React.MouseEvent) => void;
  markingMode?: boolean;
}

export const TokenColumn: React.FC<TokenColumnProps> = ({
  farsi,
  latin,
  german,
  isPunctuation,
  isMarked,
  isSelected = false,
  isCorrect,
  isChecked,
  userAnswer,
  onAnswerChange,
  onToggleMark,
  markingMode = false,
}) => {
  if (isPunctuation) {
    return (
      <div className="flex flex-col items-center gap-1 min-w-[2rem]">
        <span className="text-2xl md:text-3xl font-bold text-gray-300 h-10 flex items-end justify-center">
          {farsi}
        </span>
        <span className="text-sm text-gray-500 h-5">&nbsp;</span>
        <div className="h-10">&nbsp;</div>
        <div className="h-5">&nbsp;</div>
      </div>
    );
  }

  const isWrong = isChecked && isCorrect === false;
  const isRight = isChecked && isCorrect === true;

  return (
    <div className="flex flex-col items-center gap-1 min-w-[4rem]">
      <Button
        variant="ghost"
        onClick={(e) => onToggleMark(e)}
        className={cn(
          'h-10 px-2 text-2xl md:text-3xl font-bold font-mono tracking-wide relative transition-all',
          isSelected && 'text-purple-200 bg-purple-500/40 ring-2 ring-purple-400',
          !isSelected && isMarked && 'text-yellow-300 bg-yellow-500/20 hover:bg-yellow-500/30',
          !isSelected && !isMarked && markingMode && 'text-purple-300 hover:bg-purple-500/20',
          !isSelected && !isMarked && !markingMode && 'text-blue-300 cursor-default'
        )}
        title={
          markingMode
            ? isSelected
              ? 'Klicken zum Abwählen'
              : 'Klicken zum Auswählen'
            : undefined
        }
        dir="rtl"
      >
        {farsi}
        {isMarked && !isSelected && (
          <span className="absolute -top-1 -right-1 text-yellow-400 text-xs">★</span>
        )}
        {isSelected && (
          <span className="absolute -top-1 -right-1 text-purple-300 text-xs">✓</span>
        )}
      </Button>

      <span 
        className="text-sm text-gray-400 h-5 flex items-center justify-center"
        dir="ltr"
      >
        {latin}
      </span>

      <input
        type="text"
        value={userAnswer}
        onChange={(e) => onAnswerChange(e.target.value)}
        disabled={isRight}
        className={cn(
          'w-full min-w-[4rem] max-w-[6rem] h-10 bg-gray-700 border rounded-md text-center text-white px-2 text-sm',
          'focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors',
          isRight && 'border-green-500 bg-green-900/20',
          isWrong && 'border-red-500 bg-red-900/20',
          !isRight && !isWrong && 'border-gray-600'
        )}
        dir="ltr"
        aria-invalid={isWrong ? 'true' : 'false'}
      />

      <div className="h-5 flex items-center justify-center">
        {isWrong && (
          <span className="text-green-400 text-xs font-semibold animate-fade-in">
            {german}
          </span>
        )}
      </div>
    </div>
  );
};

export default TokenColumn;
