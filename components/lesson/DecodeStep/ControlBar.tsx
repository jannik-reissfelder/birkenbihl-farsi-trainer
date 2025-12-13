import React from 'react';
import { Button } from '@/components/ui/button';

interface ControlBarProps {
  onPrevious: () => void;
  onNext: () => void;
  onCheck: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isChecked: boolean;
  isCorrect: boolean;
  showNextStep?: boolean;
  nextStepLabel?: string;
  onNextStep?: () => void;
}

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"/>
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

export const ControlBar: React.FC<ControlBarProps> = ({
  onPrevious,
  onNext,
  onCheck,
  canGoPrevious,
  canGoNext,
  isChecked,
  isCorrect,
  showNextStep,
  nextStepLabel,
  onNextStep,
}) => {
  return (
    <div className="mt-6 space-y-4">
      {isChecked && (
        <div className={`p-3 rounded-lg text-center ${isCorrect ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          <p className="font-bold">
            {isCorrect ? 'Sehr gut! Weiter so!' : 'Nicht ganz richtig, versuch es nochmal!'}
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="gap-2"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Zurück
        </Button>

        {!isCorrect && (
          <Button onClick={onCheck} className="gap-2">
            <CheckIcon className="h-4 w-4" />
            Prüfen
          </Button>
        )}

        {isCorrect && canGoNext && (
          <Button onClick={onNext} className="gap-2">
            Weiter
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        )}

        {isCorrect && showNextStep && onNextStep && (
          <Button onClick={onNextStep} className="gap-2 bg-blue-600 hover:bg-blue-500">
            {nextStepLabel || 'Weiter'}
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ControlBar;
