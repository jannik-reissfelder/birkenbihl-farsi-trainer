import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StepHeaderProps {
  title: string;
  subtitle?: string;
  currentIndex: number;
  totalCount: number;
  audioState: 'idle' | 'loading' | 'ready' | 'error';
  isPlaying: boolean;
  audioError?: string | null;
  onPlayAudio: () => void;
  onToggleHelp?: () => void;
  showHelpButton?: boolean;
}

const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const SpeakerIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
  </svg>
);

const WandIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 4V2"/>
    <path d="M15 16v-2"/>
    <path d="M8 9h2"/>
    <path d="M20 9h2"/>
    <path d="M17.8 11.8 19 13"/>
    <path d="M15 9h.01"/>
    <path d="M17.8 6.2 19 5"/>
    <path d="m3 21 9-9"/>
    <path d="M12.2 6.2 11 5"/>
  </svg>
);

export const StepHeader: React.FC<StepHeaderProps> = ({
  title,
  subtitle,
  currentIndex,
  totalCount,
  audioState,
  isPlaying,
  audioError,
  onPlayAudio,
  onToggleHelp,
  showHelpButton = true,
}) => {
  const getAudioButtonStyles = () => {
    if (audioState === 'error') return 'text-red-400 hover:bg-red-900/20';
    if (audioState === 'loading') return 'text-gray-500 cursor-wait';
    if (audioState === 'ready' && !isPlaying) return 'text-teal-400 hover:bg-teal-900/20';
    if (isPlaying) return 'text-teal-300 bg-teal-900/30';
    return 'text-gray-500 cursor-not-allowed';
  };

  const getAudioTitle = () => {
    if (audioState === 'error') return `Fehler: ${audioError || 'Audio konnte nicht geladen werden'}`;
    if (audioState === 'loading') return 'Audio wird geladen...';
    if (isPlaying) return 'Audio wird abgespielt...';
    return 'Satz anhören';
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-teal-300">{title}</h3>
        {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Satz {currentIndex + 1} von {totalCount}
        </span>

        <div className="flex items-center gap-2">
          {showHelpButton && onToggleHelp && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleHelp}
              className="text-gray-400 hover:text-blue-300"
              title="Hilfe zum Satz"
            >
              <WandIcon className="h-5 w-5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onPlayAudio}
            disabled={audioState !== 'ready'}
            className={cn('transition-colors', getAudioButtonStyles())}
            title={getAudioTitle()}
          >
            {audioState === 'loading' ? (
              <SpinnerIcon className="h-5 w-5" />
            ) : (
              <SpeakerIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StepHeader;
