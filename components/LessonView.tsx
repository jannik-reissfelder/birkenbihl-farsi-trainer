import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, useContext } from 'react';
import { Lesson, Sentence, PronunciationFeedback, WordTiming } from '../types';
import { generateSpeech, getWordTimings, getHelpForSentence } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { TranslateIcon } from './icons/TranslateIcon';
import { EarIcon } from './icons/EarIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { MusicNoteIcon } from './icons/MusicNoteIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { CheckIcon } from './icons/CheckIcon';
import { CloseIcon } from './icons/CloseIcon';
import { GamificationContext } from '../contexts/GamificationContext';
import { useVocabulary } from '../contexts/VocabularyContext';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { StarIcon } from './icons/StarIcon';
import { useProgress } from '../hooks/useProgress';
import { useDecodeAudio } from '../hooks/useDecodeAudio';
import { RepeatIcon } from './icons/RepeatIcon';
import { WandIcon } from './icons/WandIcon';
import { BotIcon } from './icons/BotIcon';

interface SpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start: () => void;
  stop: () => void;
}
interface SpeechRecognitionEvent { results: SpeechRecognitionResultList; }
interface SpeechRecognitionResultList { [index: number]: SpeechRecognitionResult; length: number; }
interface SpeechRecognitionResult { [index: number]: SpeechRecognitionAlternative; isFinal: boolean; length: number; }
interface SpeechRecognitionAlternative { transcript: string; }
interface SpeechRecognitionErrorEvent { error: string; }

type BirkenbihlStep = 'decode' | 'listen' | 'speak' | 'karaoke';
const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognitionAPI;
const motivationalMessages = ["Großartig!", "Perfekt!", "Weiter so!", "Ausgezeichnet!", "Fantastisch!"];
const KARAOKE_TOTAL_LOOPS = 8; // Reduced for better experience with full lesson playback

interface LessonViewProps {
    lesson: Lesson;
    onLessonComplete?: () => void;
    mode?: 'full' | 'decode-only' | 'karaoke-only';
    initialSentenceIndex?: number;
    isFreePractice?: boolean;
}

const LessonView: React.FC<LessonViewProps> = ({ lesson, onLessonComplete, mode = 'full', initialSentenceIndex = 0, isFreePractice = false }) => {
  const [currentIndex, setCurrentIndex] = useState(initialSentenceIndex);
  const [step, setStep] = useState<BirkenbihlStep>(mode === 'karaoke-only' ? 'karaoke' : 'decode');
  
  // Audio for single-sentence steps
  const [audioData, setAudioData] = useState<AudioBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Playback state for single-sentence steps
  const [isPlaying, setIsPlaying] = useState(false);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const karaokeAnimationRef = useRef<number>(0);
  
  // Speak step state
  const [userTranscript, setUserTranscript] = useState<string | null>(null);
  
  // Lesson state
  const [isMastered, setIsMastered] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set<BirkenbihlStep>());
  const { addXp } = useContext(GamificationContext);
  const { addCard, isWordMarked } = useVocabulary();
  const { progress, setProgress, getGlobalSentenceIndex } = useProgress();
  
  // Decode step state
  const [userDecode, setUserDecode] = useState<string[]>([]);
  const [isDecodeChecked, setIsDecodeChecked] = useState(false);
  const [isDecodeCorrect, setIsDecodeCorrect] = useState(false);
  const [decodeResults, setDecodeResults] = useState<boolean[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);

  // Quick Help state
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpQuestion, setHelpQuestion] = useState('');
  const [helpAnswer, setHelpAnswer] = useState<string | null>(null);
  const [isAskingHelp, setIsAskingHelp] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);

  // Audio Context management
  const audioContextRef = useRef<AudioContext | null>(null);
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);
  
  // Karaoke step state
  const [isKaraokeDataReady, setIsKaraokeDataReady] = useState(false);
  const [isKaraokeLoading, setIsKaraokeLoading] = useState(false);
  const [karaokeAudio, setKaraokeAudio] = useState<Map<number, AudioBuffer>>(new Map());
  const [karaokeTimings, setKaraokeTimings] = useState<Map<number, WordTiming[]>>(new Map());
  const [karaokeState, setKaraokeState] = useState({
    isPlaying: false,
    currentSentenceIndex: 0,
    currentWordIndex: -1,
    loopCount: 1,
  });
  const [isLessonKaraokeCompleted, setIsLessonKaraokeCompleted] = useState(false);
  const [karaokeCompletedOnce, setKaraokeCompletedOnce] = useState(false);
  const karaokePauseOffsetRef = useRef(0);
  const sentenceStartTimeRef = useRef(0);
  const currentStepRef = useRef<BirkenbihlStep>(step);

  const currentSentence = useMemo(() => lesson.sentences[currentIndex], [lesson.sentences, currentIndex]);
  
  // A unicode-aware regex to correctly tokenize words with diacritics and punctuation.
  const tokenRegex = useMemo(() => /D\.O\.|[\p{L}\p{N}'-]+|[.,!?]/gu, []);
  
  const decodeParts = useMemo(() => currentSentence?.germanDecode.match(tokenRegex) || [], [currentSentence, tokenRegex]);
  const latinParts = useMemo(() => currentSentence?.latin.match(tokenRegex) || [], [currentSentence, tokenRegex]);
  const farsiParts = useMemo(() => currentSentence?.farsi.match(tokenRegex) || [], [currentSentence, tokenRegex]);
  
  const wordParts = useMemo(() => decodeParts.filter(p => !/^[.,!?]$/.test(p)), [decodeParts]);

  // Decode audio playback hook (always pass audioContext for proper caching)
  const decodeAudio = useDecodeAudio(
    lesson.id,
    currentIndex,
    currentSentence?.farsi || '',
    getAudioContext()
  );

  const fetchDataForSentence = useCallback(async (sentence: Sentence, requestedStep: BirkenbihlStep) => {
    if (!sentence) return;
    setIsLoading(true);
    setError(null);
    setAudioData(null);
    try {
      const base64Audio = await generateSpeech(sentence.farsi);
      const decodedBytes = decode(base64Audio);
      const buffer = await decodeAudioData(decodedBytes, getAudioContext(), 24000, 1);
      
      // Only update state if we're still on the step that requested audio
      // Use ref to check CURRENT step, not the step when fetch started
      const currentStep = currentStepRef.current;
      if (currentStep === requestedStep && (currentStep === 'listen' || currentStep === 'speak')) {
        setAudioData(buffer);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error fetching data for sentence:", err);
      
      // Only show error if we're still on the step that needs audio
      const currentStep = currentStepRef.current;
      if (currentStep === requestedStep && (currentStep === 'listen' || currentStep === 'speak')) {
        let errorMessage = "Daten konnten nicht geladen werden.";
        if (err instanceof Error) {
          if (err.message.includes("API_KEY")) {
            errorMessage = "API-Schlüssel fehlt. Bitte in den Einstellungen konfigurieren.";
          } else if (err.message.includes("quota") || err.message.includes("limit")) {
            errorMessage = "API-Limit erreicht. Bitte später erneut versuchen.";
          } else if (err.message.includes("No audio data")) {
            errorMessage = "Keine Audio-Daten empfangen. Bitte erneut versuchen.";
          } else {
            errorMessage = `Fehler: ${err.message}`;
          }
        }
        setError(errorMessage);
        setIsLoading(false);
      }
    }
  }, [getAudioContext]);

  // Update the ref whenever step changes (use LayoutEffect for synchronous update)
  useLayoutEffect(() => {
    currentStepRef.current = step;
  }, [step]);

  useEffect(() => {
    // Only fetch audio when it's actually needed (listen/speak steps)
    // Decode step doesn't need audio - it's just reading text!
    // Karaoke has its own fetcher for the entire lesson
    if (step === 'listen' || step === 'speak') {
      fetchDataForSentence(currentSentence, step);
    } else if (step === 'decode') {
      // Decode step doesn't need audio, so clear loading state
      setIsLoading(false);
      setError(null);
    }
  }, [currentSentence, fetchDataForSentence, step]);
  
  const stopAudio = useCallback(() => {
    cancelAnimationFrame(karaokeAnimationRef.current);
    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null;
      try {
        audioSourceRef.current.stop();
      } catch (e) { /* ignore if already stopped */ }
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);
  
  const playAudio = useCallback(() => { /* ... for single sentence steps ... */ }, []);

  const resetHelp = useCallback(() => {
      setIsHelpOpen(false);
      setHelpQuestion('');
      setHelpAnswer(null);
      setIsAskingHelp(false);
      setHelpError(null);
  }, []);

  const resetAttempt = useCallback(() => {
    setShowTranslation(false); setUserTranscript(null);
    setUserDecode(Array(wordParts.length).fill('')); setIsDecodeChecked(false); setIsDecodeCorrect(false); setDecodeResults([]);
    setCompletedSteps(new Set());
    setKaraokeState({ isPlaying: false, currentSentenceIndex: 0, currentWordIndex: -1, loopCount: 1 });
    stopAudio();
    setIsMastered(false);
  }, [stopAudio, wordParts.length]);
  
  useEffect(() => {
    resetAttempt();
    resetHelp();
  }, [currentIndex, resetAttempt, resetHelp]);
  
  useEffect(() => {
    const allStepsComplete = completedSteps.has('decode'); // Karaoke is a lesson-level activity, not per-sentence
    if (mode === 'full' && allStepsComplete && !isMastered) {
      setIsMastered(true);
      addXp(50);
    }
  }, [completedSteps, addXp, isMastered, mode]);
  
  const fetchAllKaraokeData = useCallback(async () => {
    if (isKaraokeDataReady || isKaraokeLoading || lesson.sentences.length === 0) return;
    
    setIsKaraokeLoading(true);
    setError(null);
    try {
        const audioMap = new Map<number, AudioBuffer>();
        const timingsMap = new Map<number, WordTiming[]>();
        const audioContext = getAudioContext();

        await Promise.all(lesson.sentences.map(async (sentence) => {
            const [base64Audio, timings] = await Promise.all([
                generateSpeech(sentence.farsi),
                getWordTimings(sentence.farsi)
            ]);
            const buffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
            audioMap.set(sentence.id, buffer);
            timingsMap.set(sentence.id, timings as WordTiming[]);
        }));

        setKaraokeAudio(audioMap);
        setKaraokeTimings(timingsMap);
        setIsKaraokeDataReady(true);
    } catch (err) {
        console.error("Error fetching karaoke data:", err);
        
        let errorMessage = "Daten für Karaoke konnten nicht geladen werden.";
        if (err instanceof Error) {
          if (err.message.includes("API_KEY")) {
            errorMessage = "API-Schlüssel fehlt. Bitte in den Einstellungen konfigurieren.";
          } else if (err.message.includes("quota") || err.message.includes("limit")) {
            errorMessage = "API-Limit erreicht. Bitte später erneut versuchen.";
          } else {
            errorMessage = `Karaoke-Fehler: ${err.message}`;
          }
        }
        setError(errorMessage);
    } finally {
        setIsKaraokeLoading(false);
    }
  }, [lesson.sentences, isKaraokeDataReady, isKaraokeLoading, getAudioContext]);


  const handleSetStep = (newStep: BirkenbihlStep) => { 
    stopAudio();
    setKaraokeState(prev => ({ ...prev, isPlaying: false })); // Stop karaoke playback if switching tabs
    setStep(newStep); 
    if (newStep === 'karaoke') {
      fetchAllKaraokeData();
    }
  }

  const goToNext = () => { stopAudio(); if (currentIndex < lesson.sentences.length - 1) setCurrentIndex(currentIndex + 1); };
  const goToPrev = () => { stopAudio(); if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };
  
  const handleDecodeInputChange = (index: number, value: string) => {
    const newUserDecode = [...userDecode];
    newUserDecode[index] = value;
    setUserDecode(newUserDecode);
  };

  const handleCheckDecode = () => {
    const results = wordParts.map((correctWord, index) => {
        return (userDecode[index] || '').trim().toLowerCase() === correctWord.toLowerCase();
    });
    setDecodeResults(results);
    const correct = results.every(res => res);
    setIsDecodeCorrect(correct);
    setIsDecodeChecked(true);

    if (correct && !completedSteps.has('decode')) {
        addXp(10);
        setCompletedSteps(prev => new Set(prev).add('decode'));
        if (!isFreePractice) {
            const currentGlobalIndex = getGlobalSentenceIndex(lesson.id, currentSentence.id);
            if (currentGlobalIndex !== -1) {
                const nextGlobalIndex = currentGlobalIndex + 1;
                if (nextGlobalIndex > progress.currentSentenceIndex) {
                    setProgress({ currentSentenceIndex: nextGlobalIndex });
                }
            }
        }
    }
  };

  const handleMarkWord = useCallback((wordIndex: number) => {
    const farsiWord = farsiParts[wordIndex];
    const germanWord = decodeParts[wordIndex];
    const latinWord = latinParts[wordIndex];

    if (!farsiWord || !germanWord || /^[.,!?]$/.test(farsiWord)) {
      return;
    }

    if (isWordMarked(germanWord, farsiWord)) {
      return;
    }

    addCard(germanWord, farsiWord, latinWord || '', currentSentence);
  }, [farsiParts, decodeParts, latinParts, isWordMarked, addCard, currentSentence]);
  
  const toggleHelp = () => {
    if (isHelpOpen) {
        resetHelp();
    } else {
        setIsHelpOpen(true);
    }
  };

  const handleAskForHelp = useCallback(async () => {
    if (!helpQuestion.trim()) return;
    
    setIsAskingHelp(true);
    setHelpAnswer(null);
    setHelpError(null);

    try {
        const answer = await getHelpForSentence(currentSentence, helpQuestion);
        setHelpAnswer(answer);
    } catch (err) {
        console.error(err);
        setHelpError("Entschuldigung, ich konnte keine Antwort finden. Bitte versuche es später erneut.");
    } finally {
        setIsAskingHelp(false);
    }
  }, [helpQuestion, currentSentence]);

  // --- START KARAOKE LOGIC ---
    const handleRestartKaraoke = useCallback(() => {
    stopAudio();
    setKaraokeState({
      isPlaying: false,
      currentSentenceIndex: 0,
      currentWordIndex: -1,
      loopCount: 1,
    });
    karaokePauseOffsetRef.current = 0;
  }, [stopAudio]);

  const playSentence = useCallback((sentenceIndex: number, offset: number = 0) => {
      stopAudio(); // Ensure no other audio is playing
      
      if (sentenceIndex >= lesson.sentences.length) {
          setKaraokeState(prev => {
              const newLoopCount = prev.loopCount + 1;
              if (newLoopCount > KARAOKE_TOTAL_LOOPS) {
                  if (!karaokeCompletedOnce) {
                      addXp(20);
                      setKaraokeCompletedOnce(true);
                  }
                  return { ...prev, isPlaying: false, currentSentenceIndex: 0, currentWordIndex: -1 };
              } else {
                  // Start next loop
                  playSentence(0);
                  return { ...prev, loopCount: newLoopCount, currentSentenceIndex: 0, currentWordIndex: -1 };
              }
          });
          return;
      }
      
      const sentence = lesson.sentences[sentenceIndex];
      const buffer = karaokeAudio.get(sentence.id);
      const timings = karaokeTimings.get(sentence.id);

      if (!buffer || !timings) {
          console.warn(`Audio/timing data missing for sentence index ${sentenceIndex}, skipping.`);
          setKaraokeState(prev => ({ ...prev, currentSentenceIndex: prev.currentSentenceIndex + 1 }));
          return;
      }
      
      const audioContext = getAudioContext();
      if (audioContext.state === 'suspended') audioContext.resume();
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
          cancelAnimationFrame(karaokeAnimationRef.current);
          karaokePauseOffsetRef.current = 0;
          audioSourceRef.current = null;
          
          setKaraokeState(prev => {
              // Only advance if we are still in playing mode (not paused)
              if (prev.isPlaying) {
                  return { ...prev, currentSentenceIndex: prev.currentSentenceIndex + 1, currentWordIndex: -1 };
              }
              return prev;
          });
      };

      source.start(0, offset);
      karaokePauseOffsetRef.current = offset;
      sentenceStartTimeRef.current = audioContext.currentTime - offset;
      audioSourceRef.current = source;
      
      const highlightLoop = () => {
          if (!audioSourceRef.current || !timings) return;
          const elapsedTime = (audioContext.currentTime - sentenceStartTimeRef.current);
          const currentWord = timings.findIndex(t => elapsedTime >= t.startTime && elapsedTime < t.endTime);
          
          setKaraokeState(prev => {
              if (prev.currentWordIndex !== currentWord) {
                  return { ...prev, currentWordIndex: currentWord };
              }
              return prev;
          });
          karaokeAnimationRef.current = requestAnimationFrame(highlightLoop);
      };
      highlightLoop();
  }, [stopAudio, lesson.sentences, karaokeAudio, karaokeTimings, getAudioContext, addXp, karaokeCompletedOnce]);

  useEffect(() => {
      if (karaokeState.isPlaying && step === 'karaoke' && isKaraokeDataReady) {
          playSentence(karaokeState.currentSentenceIndex, karaokePauseOffsetRef.current);
      } else {
          stopAudio();
      }
  }, [karaokeState.isPlaying, karaokeState.currentSentenceIndex, step, isKaraokeDataReady, playSentence, stopAudio]);

  const toggleKaraokePlayback = () => {
      if (karaokeState.loopCount > KARAOKE_TOTAL_LOOPS) return; // Don't allow playing after completion

      if (karaokeState.isPlaying) {
          const audioContext = getAudioContext();
          const elapsedTime = (audioContext.currentTime - sentenceStartTimeRef.current);
          karaokePauseOffsetRef.current = elapsedTime;
          stopAudio();
          setKaraokeState(prev => ({ ...prev, isPlaying: false }));
      } else {
          setKaraokeState(prev => ({ ...prev, isPlaying: true }));
      }
  };
  // --- END KARAOKE LOGIC ---
  
  const renderOptionalTranslation = () => (
    <div className="mt-4 text-center">
      <button onClick={() => setShowTranslation(!showTranslation)} className="text-sm text-gray-500 hover:text-gray-400 underline">
        {showTranslation ? 'Übersetzung ausblenden' : 'Korrekte Übersetzung anzeigen'}
      </button>
      {showTranslation && (
        <div className="mt-2 p-3 bg-gray-700/50 rounded-lg text-gray-300 animate-fade-in">
          <p><span className="font-semibold text-teal-300">Übersetzung:</span> "{currentSentence.germanTranslation}"</p>
        </div>
      )}
    </div>
  );

  const renderDecodeExercise = () => {
    let wordInputIndex = -1;
    const isLastSentence = currentIndex === lesson.sentences.length - 1;
    
    return (
      <div className="p-2 md:p-4 animate-fade-in text-center">
        <h3 className="text-2xl font-bold text-center mb-2 text-teal-300">Wort-für-Wort De-kodieren</h3>
        <p className="text-center text-gray-400 mb-6">Ordne die deutschen Wörter so an, wie sie im Farsi-Satz stehen.</p>

        <div className="bg-gray-900/50 p-6 rounded-lg min-h-[250px] flex flex-col justify-center">
          <div className="mb-4 text-right flex items-center justify-end gap-3" dir="rtl">
            <button onClick={toggleHelp} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-blue-300 transition-colors" title="Hilfe zum Satz">
                <WandIcon className="h-6 w-6" />
            </button>
            <button 
              onClick={decodeAudio.playAudio} 
              disabled={decodeAudio.audioState !== 'ready'}
              className={`p-2 rounded-full transition-colors ${
                decodeAudio.audioState === 'error' 
                  ? 'text-red-400 hover:bg-red-900/20 cursor-pointer' 
                  : decodeAudio.audioState === 'loading'
                  ? 'text-gray-500 cursor-wait'
                  : decodeAudio.audioState === 'ready' && !decodeAudio.isPlaying
                  ? 'text-teal-400 hover:bg-teal-900/20 cursor-pointer'
                  : decodeAudio.isPlaying
                  ? 'text-teal-300 bg-teal-900/30'
                  : 'text-gray-500 cursor-not-allowed'
              }`}
              title={
                decodeAudio.audioState === 'error' 
                  ? `Fehler: ${decodeAudio.error || 'Audio konnte nicht geladen werden'}`
                  : decodeAudio.audioState === 'loading'
                  ? 'Audio wird geladen...'
                  : decodeAudio.isPlaying
                  ? 'Audio wird abgespielt...'
                  : 'Satz anhören'
              }
            >
              {decodeAudio.audioState === 'loading' ? (
                <SpinnerIcon className="h-6 w-6" />
              ) : (
                <SpeakerIcon className="h-6 w-6" />
              )}
            </button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {farsiParts.map((part, index) => {
                const isPunctuation = /^[.,!?]$/.test(part);
                const germanWord = decodeParts[index];
                const marked = !isPunctuation && isWordMarked(germanWord, part);
                
                if (isPunctuation) {
                  return <span key={index} className="text-3xl font-bold text-blue-300 font-mono">{part}</span>;
                }
                
                return (
                  <button
                    key={index}
                    onClick={() => handleMarkWord(index)}
                    className={`relative text-3xl font-bold font-mono tracking-wide transition-all px-2 py-1 rounded ${
                      marked 
                        ? 'text-yellow-300 bg-yellow-500/20 cursor-default' 
                        : 'text-blue-300 hover:bg-blue-500/20 cursor-pointer'
                    }`}
                    disabled={marked}
                    title={marked ? 'Already marked for practice' : 'Click to mark for SRS practice'}
                  >
                    {part}
                    {marked && (
                      <StarIcon className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 fill-yellow-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {isHelpOpen && (
            <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700 animate-fade-in text-left">
                {isAskingHelp ? (
                    <div className="flex justify-center items-center p-4">
                        <SpinnerIcon />
                    </div>
                ) : helpAnswer ? (
                    <div>
                        <div className="flex items-start gap-3 text-gray-300">
                            <BotIcon className="flex-shrink-0 h-6 w-6 text-teal-400 mt-1" />
                            <p className="whitespace-pre-wrap">{helpAnswer}</p>
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={resetHelp} className="text-sm px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-full">Schließen</button>
                            <button onClick={() => { setHelpAnswer(null); setHelpQuestion(''); }} className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-full">Weitere Frage</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <label htmlFor="help-question" className="block text-sm font-medium text-gray-300 mb-2">Frage zur Vokabel oder Grammatik...</label>
                        <textarea
                            id="help-question"
                            value={helpQuestion}
                            onChange={(e) => setHelpQuestion(e.target.value)}
                            className="w-full h-20 p-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="z.B. Was ist der Infinitiv von...?"
                        />
                        {helpError && <p className="text-red-400 text-sm mt-2">{helpError}</p>}
                        <div className="flex justify-end mt-2">
                            <button 
                                onClick={handleAskForHelp} 
                                disabled={!helpQuestion.trim()}
                                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-500 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                Fragen
                            </button>
                        </div>
                    </div>
                )}
            </div>
          )}

          <div className="flex flex-row-reverse flex-wrap justify-center items-end gap-x-2 gap-y-4 mb-6">
            {decodeParts.map((part, index) => {
              const latinPart = latinParts[index] || '';
              const isPunctuation = /^[.,!?]$/.test(part);
              if (!isPunctuation) {
                wordInputIndex++;
              }
              const currentWordIndex = wordInputIndex;
              
              if (isPunctuation) {
                return <span key={index} className="text-2xl font-bold text-gray-300 pb-2">{part}</span>
              }

              const isChecked = isDecodeChecked && decodeResults.length > currentWordIndex;
              const isCorrect = isChecked && decodeResults[currentWordIndex];
              const isWrong = isChecked && !decodeResults[currentWordIndex];

              const inputClassName = `w-28 bg-gray-700 border rounded-md text-center text-white p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors ${
                  isCorrect ? 'border-green-500' : 
                  isWrong ? 'border-red-500' : 
                  'border-gray-600'
              }`;

              return (
                <div key={index} className="flex flex-col items-center gap-1">
                  <span className="text-gray-400 text-sm h-6 flex items-center justify-center w-28">{latinPart}</span>
                  <input
                    type="text"
                    value={userDecode[currentWordIndex] || ''}
                    onChange={(e) => handleDecodeInputChange(currentWordIndex, e.target.value)}
                    className={inputClassName}
                    disabled={isCorrect}
                    aria-invalid={isWrong ? 'true' : 'false'}
                  />
                  <div className="h-6 flex items-center justify-center">
                    {isWrong && (
                        <span className="text-green-400 text-sm font-semibold animate-fade-in">{wordParts[currentWordIndex]}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Feedback and Action Area */}
          {isDecodeChecked && (
            <div className={`p-3 rounded-lg text-center mx-auto mb-4 ${isDecodeCorrect ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              <p className="font-bold">{isDecodeCorrect ? motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)] : 'Nicht ganz richtig, versuch es nochmal!'}</p>
            </div>
          )}

          {!isDecodeCorrect && (
            <button
              onClick={handleCheckDecode}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md mx-auto hover:bg-blue-500 transition-colors"
            >
              Prüfen
            </button>
          )}
        </div>

        {renderOptionalTranslation()}
        
        {isDecodeCorrect && isLastSentence && (
            <div className="mt-8 text-center animate-fade-in">
                {mode === 'decode-only' && onLessonComplete ? (
                    <button
                        onClick={onLessonComplete}
                        className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                        <CheckIcon /> De-kodieren abschließen
                    </button>
                ) : mode === 'full' ? (
                    <button
                        onClick={() => handleSetStep('karaoke')}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                        Weiter zu Karaoke <ChevronRightIcon />
                    </button>
                ) : null}
            </div>
        )}

      </div>
    );
  };


  const renderContent = () => {
    if (isMastered && step !== 'karaoke') {
        const isLastSentence = currentIndex >= lesson.sentences.length - 1;
        const isReadyForKaraoke = isLastSentence && mode === 'full';

        return (
            <div className="text-center p-6 md:p-8 min-h-[350px] flex flex-col justify-center items-center animate-fade-in">
                <CheckIcon className="h-24 w-24 text-green-400 mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">Satz gemeistert!</h2>
                
                {isReadyForKaraoke ? (
                    <p className="text-gray-400 mt-4">Sehr gut! Du hast den letzten Satz de-kodiert. Zeit für die Karaoke-Übung!</p>
                ) : (
                    <p className="text-gray-400 mt-4">Sehr gut! Du kannst jetzt mit dem nächsten Satz fortfahren.</p>
                )}

                {isReadyForKaraoke ? (
                     <button
                        onClick={() => handleSetStep('karaoke')}
                        className="mt-8 flex items-center gap-2 px-6 py-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
                    >
                        Weiter zu Karaoke <ChevronRightIcon />
                    </button>
                ) : (
                    <button
                        onClick={goToNext}
                        disabled={isLastSentence}
                        className="mt-8 flex items-center gap-2 px-6 py-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        Weiter <ChevronRightIcon />
                    </button>
                )}
            </div>
        );
    }
    if (isLoading && step !== 'karaoke') return <div className="text-center p-8 min-h-[350px] flex items-center justify-center"><SpinnerIcon /></div>;
    if (error) return (
      <div className="text-center p-8 min-h-[350px] flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <button 
          onClick={() => step === 'karaoke' ? fetchAllKaraokeData() : fetchDataForSentence(currentSentence, step)}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    );

    if (step === 'decode') {
        return renderDecodeExercise();
    }

    if (step === 'karaoke') {
      const isFinished = karaokeState.loopCount > KARAOKE_TOTAL_LOOPS;
      
      if (isKaraokeLoading) {
        return <div className="text-center p-8 min-h-[450px] flex flex-col items-center justify-center"><SpinnerIcon /><p className="mt-4 text-gray-400">Bereite Karaoke-Audio vor...</p></div>;
      }
      if (!isKaraokeDataReady) {
        return <div className="text-center p-8 min-h-[450px] flex flex-col items-center justify-center"><p>Wähle Karaoke aus, um zu beginnen.</p></div>
      }
      
      return (
        <div className="p-2 md:p-4 animate-fade-in text-center">
            <h3 className="text-2xl font-bold text-center mb-2 text-teal-300">Aktive Aufnahme (Karaoke)</h3>
            <p className="text-center text-gray-400 mb-6">Lies mit, während du zuhörst, um Klang und Schrift zu verbinden.</p>

            <div className="bg-gray-900/50 p-1 rounded-lg min-h-[400px] flex flex-col justify-between relative">
                 <div className="absolute top-4 right-4 bg-blue-500/30 text-blue-200 font-bold px-3 py-1 rounded-full text-sm z-10">
                    Loop: {Math.min(karaokeState.loopCount, KARAOKE_TOTAL_LOOPS)} / {KARAOKE_TOTAL_LOOPS}
                </div>

                <div className="h-[300px] overflow-y-auto p-4 space-y-5">
                    {lesson.sentences.map((sentence, sIndex) => {
                        const farsiWords = sentence.farsi.split(' ');
                        const latinWords = sentence.latin.split(' ');
                        const germanWords = sentence.germanDecode.split(' ');
                        return (
                            <div key={sIndex} className="flex flex-row-reverse flex-wrap justify-end items-end gap-x-3 gap-y-2 leading-relaxed">
                                {farsiWords.map((fWord, wIndex) => {
                                    const isHighlighted = karaokeState.currentSentenceIndex === sIndex && karaokeState.currentWordIndex === wIndex;
                                    const opacityClass = karaokeState.currentSentenceIndex === sIndex ? 'opacity-100' : 'opacity-40';
                                    
                                    return (
                                        <div key={wIndex} className={`inline-block p-2 rounded transition-all duration-150 ${isHighlighted ? 'bg-blue-500/30' : ''} ${opacityClass}`}>
                                            <div dir="rtl" className={`text-xl text-center font-mono ${isHighlighted ? 'text-white' : 'text-gray-300'}`}>{fWord}</div>
                                            <div className={`text-sm text-center ${isHighlighted ? 'text-blue-300' : 'text-gray-400'}`}>{latinWords[wIndex] || ''}</div>
                                            <div className={`text-base text-center ${isHighlighted ? 'text-blue-200' : 'text-gray-500'}`}>{germanWords[wIndex] || ''}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>

                <div className="flex-shrink-0 pt-4 flex flex-col items-center justify-center border-t border-gray-700/50 min-h-[120px]">
                    {isFinished ? (
                         <div className="animate-fade-in text-center flex flex-col items-center gap-4">
                            <p className="text-lg font-bold text-green-300">Karaoke-Phase abgeschlossen!</p>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleRestartKaraoke}
                                    className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <RepeatIcon /> Erneut abspielen
                                </button>
                                {onLessonComplete && (
                                    <button
                                        onClick={onLessonComplete}
                                        className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        Lektion abschließen <ChevronRightIcon />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={toggleKaraokePlayback} 
                            disabled={!isKaraokeDataReady} 
                            className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 disabled:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={karaokeState.isPlaying ? "Pause Karaoke" : "Play Karaoke"}
                        >
                           {karaokeState.isPlaying ? <PauseIcon /> : <PlayIcon />}
                       </button>
                    )}
                </div>

            </div>
        </div>
      );
    }
    // ... (logic for 'listen' and 'speak' steps remains similar)
    return (
        <div className="text-center p-6 md:p-8 min-h-[350px] flex flex-col justify-center items-center relative">
          <p>Andere Modi werden bald implementiert.</p>
        </div>
    );
  };
  
  const progressPercentage = ((currentIndex + 1) / lesson.sentences.length) * 100;
  
  const progressComponent = (
    <div className="p-4 bg-gray-900/50 border-b border-gray-700">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-lg font-semibold">{lesson.title}</h2>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div className="bg-gradient-to-r from-blue-500 to-teal-400 h-2.5 rounded-full" style={{ width: `${progressPercentage}%`, transition: 'width 0.3s ease-in-out' }}></div>
      </div>
    </div>
  );

  const tabs = [
    ['decode', 'De-kodieren', <TranslateIcon />],
    // ['listen', 'Hören', <EarIcon />],
    // ['speak', 'Sprechen', <MicrophoneIcon />],
    ['karaoke', 'Karaoke', <MusicNoteIcon />],
  ] as const;

  const availableTabs = mode === 'full' ? tabs :
                        mode === 'decode-only' ? [tabs[0]] :
                        mode === 'karaoke-only' ? [tabs.find(t=>t[0] === 'karaoke')] : [];

  return (
    <div className={`${mode !== 'full' ? '' : 'bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl mx-auto'} overflow-hidden animate-fade-in`}>
      {mode !== 'karaoke-only' && progressComponent}
      
      <div className={mode === 'full' ? "p-6" : ""}>
        {availableTabs.length > 1 && (
            <div className="flex justify-center border border-gray-600 rounded-full p-1 mb-6 bg-gray-900/50 max-w-sm mx-auto">
            {availableTabs.map((tab) => {
                if (!tab) return null;
                const [stepId, label, icon] = tab;
                return (
                    <button key={stepId} onClick={() => handleSetStep(stepId)} className={`w-1/2 py-2 px-2 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${step === stepId ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:bg-gray-700'}`}>
                        {icon} <span className="hidden md:inline">{label}</span>
                    </button>
                )
            })}
            </div>
        )}

        {renderContent()}

        {mode !== 'karaoke-only' && !isMastered && step !== 'karaoke' && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700">
                <button onClick={goToPrev} disabled={currentIndex === 0} className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50">
                    <ChevronLeftIcon /> Zurück
                </button>
                <span className="text-gray-400 font-mono">{currentIndex + 1} / {lesson.sentences.length}</span>
                <button onClick={goToNext} disabled={currentIndex === lesson.sentences.length - 1 || !completedSteps.has('decode')} className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50">
                    Weiter <ChevronRightIcon />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default LessonView;