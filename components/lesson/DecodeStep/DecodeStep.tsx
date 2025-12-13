import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StepHeader } from './StepHeader';
import { ControlBar } from './ControlBar';
import { TokenStackGrid } from './TokenStackGrid';
import { cn } from '@/lib/utils';
import type { Token } from '@/hooks/useSentenceTokens';
import type { Sentence } from '@/types';

interface DecodeStepProps {
  tokens: Token[];
  wordTokens: Token[];
  currentSentence: Sentence;
  currentIndex: number;
  totalSentences: number;
  userAnswers: string[];
  decodeResults: boolean[];
  isChecked: boolean;
  isCorrect: boolean;
  audioState: 'idle' | 'loading' | 'ready' | 'error';
  isPlaying: boolean;
  audioError?: string | null;
  onPlayAudio: () => void;
  onAnswerChange: (wordIndex: number, value: string) => void;
  onCheck: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onMarkWord: (token: Token) => void;
  onUnmarkWord: (german: string, farsi: string) => void;
  isWordMarked: (german: string, farsi: string) => boolean;
  showTranslation: boolean;
  onToggleTranslation: () => void;
  isLastSentence: boolean;
  mode: 'full' | 'decode-only' | 'karaoke-only';
  onNextStep?: () => void;
  onComplete?: () => void;
  helpState?: {
    isOpen: boolean;
    question: string;
    answer: string | null;
    isAsking: boolean;
    error: string | null;
  };
  onToggleHelp?: () => void;
  onAskHelp?: () => void;
  onResetHelp?: () => void;
  onQuestionChange?: (question: string) => void;
  onClearHelpAnswer?: () => void;
}

const BotIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 8V4H8"/>
    <rect width="16" height="12" x="4" y="8" rx="2"/>
    <path d="M2 14h2"/>
    <path d="M20 14h2"/>
    <path d="M15 13v2"/>
    <path d="M9 13v2"/>
  </svg>
);

const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export const DecodeStep: React.FC<DecodeStepProps> = ({
  tokens,
  currentSentence,
  currentIndex,
  totalSentences,
  userAnswers,
  decodeResults,
  isChecked,
  isCorrect,
  audioState,
  isPlaying,
  audioError,
  onPlayAudio,
  onAnswerChange,
  onCheck,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  onMarkWord,
  onUnmarkWord,
  isWordMarked,
  showTranslation,
  onToggleTranslation,
  isLastSentence,
  mode,
  onNextStep,
  onComplete,
  helpState,
  onToggleHelp,
  onAskHelp,
  onResetHelp,
  onQuestionChange,
  onClearHelpAnswer,
}) => {
  return (
    <div className="p-2 md:p-4 animate-fade-in">
      <StepHeader
        title="Wort-für-Wort De-kodieren"
        subtitle="Ordne die deutschen Wörter so an, wie sie im Farsi-Satz stehen."
        currentIndex={currentIndex}
        totalCount={totalSentences}
        audioState={audioState}
        isPlaying={isPlaying}
        audioError={audioError}
        onPlayAudio={onPlayAudio}
        onToggleHelp={onToggleHelp}
        showHelpButton={!!onToggleHelp}
      />

      {helpState?.isOpen && (
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            {helpState.isAsking ? (
              <div className="flex justify-center items-center p-4">
                <SpinnerIcon className="h-6 w-6" />
              </div>
            ) : helpState.answer ? (
              <div>
                <div className="flex items-start gap-3 text-gray-300">
                  <BotIcon className="flex-shrink-0 h-6 w-6 text-teal-400 mt-1" />
                  <p className="whitespace-pre-wrap">{helpState.answer}</p>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={onResetHelp}
                  >
                    Schließen
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      onQuestionChange?.('');
                      onClearHelpAnswer?.();
                    }}
                  >
                    Weitere Frage
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="help-question" className="block text-sm font-medium text-gray-300 mb-2">
                  Frage zur Vokabel oder Grammatik...
                </label>
                <textarea
                  id="help-question"
                  value={helpState.question}
                  onChange={(e) => onQuestionChange?.(e.target.value)}
                  className="w-full h-20 p-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="z.B. Was ist der Infinitiv von...?"
                />
                {helpState.error && (
                  <p className="text-red-400 text-sm mt-2">{helpState.error}</p>
                )}
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={onAskHelp}
                    disabled={!helpState.question.trim()}
                  >
                    Fragen
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <TokenStackGrid
        tokens={tokens}
        userAnswers={userAnswers}
        decodeResults={decodeResults}
        isChecked={isChecked}
        onAnswerChange={onAnswerChange}
        onMarkWord={onMarkWord}
        onUnmarkWord={onUnmarkWord}
        isWordMarked={isWordMarked}
      />

      <ControlBar
        onPrevious={onPrevious}
        onNext={onNext}
        onCheck={onCheck}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext && isCorrect}
        isChecked={isChecked}
        isCorrect={isCorrect}
        showNextStep={isCorrect && isLastSentence && mode !== 'karaoke-only'}
        nextStepLabel={mode === 'decode-only' ? 'De-kodieren abschließen' : 'Weiter zu Karaoke'}
        onNextStep={mode === 'decode-only' ? onComplete : onNextStep}
      />

      <Separator className="my-4 bg-gray-700" />

      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleTranslation}
          className="text-gray-500 hover:text-gray-400 underline"
        >
          {showTranslation ? 'Übersetzung ausblenden' : 'Korrekte Übersetzung anzeigen'}
        </Button>
        {showTranslation && (
          <div className="mt-2 p-3 bg-gray-700/50 rounded-lg text-gray-300 animate-fade-in">
            <p>
              <span className="font-semibold text-teal-300">Übersetzung:</span>{' '}
              "{currentSentence.germanTranslation}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DecodeStep;
