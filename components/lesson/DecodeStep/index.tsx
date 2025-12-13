import React, { useState, useCallback, useEffect } from 'react';
import type { Lesson, Sentence } from '@/types';
import type { Token } from '@/hooks/useSentenceTokens';
import { useSentenceTokens, validateSentenceIndex } from '@/hooks/useSentenceTokens';
import { DecodeSentenceGrid } from './DecodeSentenceGrid';
import { WordMarkingToggle } from './WordMarkingToggle';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SpinnerIcon } from '@/components/icons/SpinnerIcon';
import { SpeakerIcon } from '@/components/icons/SpeakerIcon';
import { WandIcon } from '@/components/icons/WandIcon';
import { CheckIcon } from '@/components/icons/CheckIcon';
import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';
import { BotIcon } from '@/components/icons/BotIcon';
import { getHelpForSentence } from '@/services/geminiService';

export interface DecodeAnswers {
  [sentenceIndex: number]: string[];
}

interface DecodeStepProps {
  lesson: Lesson;
  currentIndex: number;
  allDecodeAnswers: DecodeAnswers;
  onAnswerChange: (sentenceIndex: number, wordIndex: number, value: string) => void;
  onCheck: (results: boolean[], isCorrect: boolean) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onMarkWord: (token: Token, sentence: Sentence) => void;
  onUnmarkWord: (german: string, farsi: string) => void;
  isWordMarked: (german: string, farsi: string) => boolean;
  isChecked: boolean;
  isCorrect: boolean;
  decodeResults: boolean[];
  isLastSentence: boolean;
  canGoNext: boolean;
  onDecodeComplete?: () => void;
  audioHook: {
    playAudio: () => void;
    audioState: 'idle' | 'loading' | 'ready' | 'error';
    isPlaying: boolean;
    error: string | null;
  };
}

export const DecodeStep: React.FC<DecodeStepProps> = ({
  lesson,
  currentIndex,
  allDecodeAnswers,
  onAnswerChange,
  onCheck,
  onNavigate,
  onMarkWord,
  onUnmarkWord,
  isWordMarked,
  isChecked,
  isCorrect,
  decodeResults,
  isLastSentence,
  canGoNext,
  onDecodeComplete,
  audioHook,
}) => {
  const validIndex = validateSentenceIndex(currentIndex, lesson.sentences.length);
  const sentence = lesson.sentences[validIndex];
  const tokenData = useSentenceTokens(sentence);
  
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpQuestion, setHelpQuestion] = useState('');
  const [helpAnswer, setHelpAnswer] = useState<string | null>(null);
  const [isAskingHelp, setIsAskingHelp] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);

  const userAnswers = allDecodeAnswers[validIndex] || [];

  useEffect(() => {
    setIsHelpOpen(false);
    setHelpQuestion('');
    setHelpAnswer(null);
    setHelpError(null);
    setShowTranslation(false);
  }, [currentIndex]);

  const handleAnswerChange = useCallback((wordIndex: number, value: string) => {
    onAnswerChange(validIndex, wordIndex, value);
  }, [validIndex, onAnswerChange]);

  const handleCheck = useCallback(() => {
    if (!tokenData) return;
    
    const results = tokenData.wordTokens.map((token, index) => {
      const userAnswer = (userAnswers[index] || '').trim().toLowerCase();
      return userAnswer === token.german.toLowerCase();
    });
    
    const allCorrect = results.every(r => r);
    onCheck(results, allCorrect);
  }, [tokenData, userAnswers, onCheck]);

  const handleAskHelp = useCallback(async () => {
    if (!helpQuestion.trim() || !sentence) return;
    
    setIsAskingHelp(true);
    setHelpError(null);
    
    try {
      const answer = await getHelpForSentence(sentence, helpQuestion);
      setHelpAnswer(answer);
    } catch (err) {
      setHelpError('Hilfe konnte nicht geladen werden.');
    } finally {
      setIsAskingHelp(false);
    }
  }, [helpQuestion, sentence]);

  const handleMarkWord = useCallback((token: Token) => {
    if (sentence) {
      onMarkWord(token, sentence);
    }
  }, [sentence, onMarkWord]);

  if (!sentence || !tokenData) {
    return (
      <div className="text-center p-8 min-h-[350px] flex items-center justify-center">
        <p className="text-red-400">Satz nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-4 animate-fade-in">
      <h3 className="text-2xl font-bold text-center mb-2 text-teal-300">
        Wort-für-Wort De-kodieren
      </h3>
      <p className="text-center text-gray-400 mb-6">
        Ordne die deutschen Wörter so an, wie sie im Farsi-Satz stehen.
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="text-gray-400 hover:text-blue-300"
            title="Hilfe zum Satz"
          >
            <WandIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={audioHook.playAudio}
            disabled={audioHook.audioState !== 'ready'}
            className={`${
              audioHook.audioState === 'error'
                ? 'text-red-400'
                : audioHook.audioState === 'loading'
                ? 'text-gray-500'
                : audioHook.isPlaying
                ? 'text-teal-300 bg-teal-900/30'
                : 'text-teal-400 hover:text-teal-300'
            }`}
            title={
              audioHook.audioState === 'error'
                ? `Fehler: ${audioHook.error}`
                : audioHook.audioState === 'loading'
                ? 'Audio wird geladen...'
                : 'Satz anhören'
            }
          >
            {audioHook.audioState === 'loading' ? (
              <SpinnerIcon className="h-5 w-5" />
            ) : (
              <SpeakerIcon className="h-5 w-5" />
            )}
          </Button>
        </div>

        {isHelpOpen && (
          <Card className="p-4 bg-gray-800 border-gray-700 animate-fade-in">
            {isAskingHelp ? (
              <div className="flex justify-center p-4">
                <SpinnerIcon />
              </div>
            ) : helpAnswer ? (
              <div>
                <div className="flex items-start gap-3 text-gray-300">
                  <BotIcon className="flex-shrink-0 h-6 w-6 text-teal-400 mt-1" />
                  <p className="whitespace-pre-wrap">{helpAnswer}</p>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsHelpOpen(false)}
                  >
                    Schließen
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setHelpAnswer(null);
                      setHelpQuestion('');
                    }}
                  >
                    Weitere Frage
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Frage zur Vokabel oder Grammatik...
                </label>
                <textarea
                  value={helpQuestion}
                  onChange={(e) => setHelpQuestion(e.target.value)}
                  className="w-full h-20 p-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="z.B. Was ist der Infinitiv von...?"
                />
                {helpError && (
                  <p className="text-red-400 text-sm mt-2">{helpError}</p>
                )}
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={handleAskHelp}
                    disabled={!helpQuestion.trim()}
                    size="sm"
                  >
                    Fragen
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        <WordMarkingToggle
          tokens={tokenData.tokens}
          sentence={sentence}
          onAddCard={(german, farsi, latin, sent) => {
            const token = tokenData.tokens.find(t => t.german === german && t.farsi === farsi);
            if (token) onMarkWord(token, sent);
          }}
          onRemoveCard={onUnmarkWord}
          isWordMarked={isWordMarked}
        />

        <DecodeSentenceGrid
          tokens={tokenData.tokens}
          userAnswers={userAnswers}
          decodeResults={decodeResults}
          isChecked={isChecked}
          onAnswerChange={handleAnswerChange}
          onMarkWord={handleMarkWord}
          onUnmarkWord={onUnmarkWord}
          isWordMarked={isWordMarked}
        />

        <div className="flex justify-center gap-4 mt-6">
          {!isChecked ? (
            <Button
              onClick={handleCheck}
              disabled={userAnswers.filter(a => a?.trim()).length < tokenData.wordTokens.length}
              className="bg-blue-600 hover:bg-blue-500"
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Überprüfen
            </Button>
          ) : isCorrect ? (
            <div className="text-center">
              <p className="text-green-400 font-bold mb-3 animate-fade-in">
                Perfekt! Alle Wörter richtig!
              </p>
              {isLastSentence && onDecodeComplete && (
                <Button onClick={onDecodeComplete} className="bg-green-600 hover:bg-green-500">
                  <CheckIcon className="h-4 w-4 mr-2" />
                  De-kodieren abschließen
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-yellow-400 mb-3">
                Einige Antworten sind noch nicht richtig. Schau dir die Korrekturen an.
              </p>
              <Button onClick={handleCheck} variant="secondary">
                Erneut prüfen
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className="text-sm text-gray-500 hover:text-gray-400 underline"
          >
            {showTranslation ? 'Übersetzung ausblenden' : 'Korrekte Übersetzung anzeigen'}
          </button>
          {showTranslation && (
            <div className="mt-2 p-3 bg-gray-700/50 rounded-lg text-gray-300 animate-fade-in">
              <p>
                <span className="font-semibold text-teal-300">Übersetzung:</span>{' '}
                "{tokenData.germanTranslation}"
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700">
          <Button
            onClick={() => onNavigate('prev')}
            disabled={currentIndex === 0}
            variant="secondary"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Zurück
          </Button>
          <span className="text-gray-400 font-mono">
            {validIndex + 1} / {lesson.sentences.length}
          </span>
          <Button
            onClick={() => onNavigate('next')}
            disabled={!canGoNext}
            variant="secondary"
          >
            Weiter
            <ChevronRightIcon className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DecodeStep;
