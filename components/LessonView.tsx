import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, useContext } from 'react';
import { Lesson, Sentence, PronunciationFeedback, WordTiming } from '../types';
import { generateSpeech, getWordTimings, getHelpForSentence } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { TranslateIcon } from './icons/TranslateIcon';
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
import { useProgress } from '../hooks/useProgress';
import { useDecodeAudio } from '../hooks/useDecodeAudio';
import { RepeatIcon } from './icons/RepeatIcon';
import { useLessonStepProgress } from '../hooks/useLessonStepProgress';
import { validateSentenceIndex, sanitizeDecodeAnswers, useSentenceTokens } from '../hooks/useSentenceTokens';
import { DecodeStep } from './lesson/DecodeStep';

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
  const { 
    progress: stepProgress, 
    isLoading: isStepProgressLoading,
    saveDecodeProgress,
    markDecodeComplete,
    markKaraokeComplete,
    markLessonComplete 
  } = useLessonStepProgress(lesson.id);
  
  const [currentIndex, setCurrentIndex] = useState(initialSentenceIndex);
  const [step, setStep] = useState<BirkenbihlStep>(mode === 'karaoke-only' ? 'karaoke' : 'decode');
  const [hasResumedFromProgress, setHasResumedFromProgress] = useState(false);
  
  // Save/Exit dialog state
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
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
  const [completedSteps, setCompletedSteps] = useState(new Set<BirkenbihlStep>());
  const { addXp } = useContext(GamificationContext);
  const { cards: vocabularyCards, addCard, removeCard, removeCardByWords, isWordMarked } = useVocabulary();
  const { progress, setProgress, getGlobalSentenceIndex } = useProgress();
  
  // Resume from saved progress (sentence index + decode answers)
  useEffect(() => {
    if (!isStepProgressLoading && !hasResumedFromProgress && mode !== 'karaoke-only') {
      // Validate that we have sentences to work with
      if (lesson.sentences.length === 0) {
        console.warn('Lesson has no sentences, cannot resume progress');
        setHasResumedFromProgress(true);
        return;
      }
      
      // Restore saved decode answers with sanitization
      if (Object.keys(stepProgress.decodeAnswers).length > 0) {
        const sanitizedAnswers = sanitizeDecodeAnswers(stepProgress.decodeAnswers, lesson.sentences.length);
        setAllDecodeAnswers(sanitizedAnswers);
      }
      // Restore sentence index with bounds validation to prevent black screen bug
      if (stepProgress.decodeSentenceIndex > 0) {
        const safeIndex = validateSentenceIndex(stepProgress.decodeSentenceIndex, lesson.sentences.length);
        setCurrentIndex(safeIndex);
      }
      setHasResumedFromProgress(true);
    }
  }, [isStepProgressLoading, stepProgress.decodeSentenceIndex, stepProgress.decodeAnswers, hasResumedFromProgress, mode, lesson.sentences.length]);
  
  // Decode step state
  const [allDecodeAnswers, setAllDecodeAnswers] = useState<Record<number, string[]>>({});
  const [isDecodeChecked, setIsDecodeChecked] = useState(false);
  const [isDecodeCorrect, setIsDecodeCorrect] = useState(false);
  const [decodeResults, setDecodeResults] = useState<boolean[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);
  
  // Get current sentence's decode answers
  const userDecode = useMemo(() => allDecodeAnswers[currentIndex] || [], [allDecodeAnswers, currentIndex]);

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
  
  // Token data from useSentenceTokens hook for DecodeStep component
  const sentenceTokens = useSentenceTokens(currentSentence);
  const tokens = sentenceTokens?.tokens || [];
  const wordTokens = sentenceTokens?.wordTokens || [];

  const groupMarkedTokenIdToCardId = useMemo(() => {
    const map = new Map<string, string>();

    const tokenRegex = /[\p{L}\p{N}'-]+|[.,!?؟«»]/gu;
    const sentenceWordTokens = wordTokens;
    const sentenceWords = sentenceWordTokens.map(t => t.farsi);

    for (const card of vocabularyCards) {
      const context = card.contextSentence as any;
      const mark = context?.mark;

      // Preferred: explicit tokenIds stored when marking
      if (mark?.kind === 'group' && mark?.sentenceId === currentSentence?.id && Array.isArray(mark.tokenIds)) {
        for (const tokenId of mark.tokenIds) {
          map.set(tokenId, card.id);
        }
        continue;
      }

      // Fallback for older grouped cards: detect multi-token farsi_word and match it as a contiguous span
      if (context?.farsi !== currentSentence?.farsi) continue;
      const targetTokens = (card.farsiWord?.match(tokenRegex) || []).filter(Boolean);
      if (targetTokens.length < 2) continue;

      let matchStart = -1;
      for (let i = 0; i <= sentenceWords.length - targetTokens.length; i++) {
        let ok = true;
        for (let j = 0; j < targetTokens.length; j++) {
          if (sentenceWords[i + j] !== targetTokens[j]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          matchStart = i;
          break;
        }
      }

      if (matchStart !== -1) {
        for (let k = 0; k < targetTokens.length; k++) {
          const tokenId = sentenceWordTokens[matchStart + k]?.id;
          if (tokenId) map.set(tokenId, card.id);
        }
      }
    }

    return map;
  }, [vocabularyCards, currentSentence?.id, currentSentence?.farsi, wordTokens]);

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
    setIsDecodeChecked(false); setIsDecodeCorrect(false); setDecodeResults([]);
    setCompletedSteps(new Set());
    setKaraokeState({ isPlaying: false, currentSentenceIndex: 0, currentWordIndex: -1, loopCount: 1 });
    stopAudio();
  }, [stopAudio]);
  
  useEffect(() => {
    resetAttempt();
    resetHelp();
  }, [currentIndex, resetAttempt, resetHelp]);
  
  const fetchAllKaraokeData = useCallback(async () => {
    if (isKaraokeDataReady || isKaraokeLoading || lesson.sentences.length === 0) return;
    
    setIsKaraokeLoading(true);
    setError(null);
    try {
        const audioMap = new Map<number, AudioBuffer>();
        const timingsMap = new Map<number, WordTiming[]>();
        const audioContext = getAudioContext();

        await Promise.all(lesson.sentences.map(async (sentence) => {
            let buffer: AudioBuffer;
            let timings: WordTiming[];
            
            if ((sentence as any).timings && (sentence as any).timings.length > 0) {
                const level = lesson.id.startsWith('a1') ? 'level_a1' : 'level_a2';
                const lessonFolder = lesson.id;
                const audioPath = `/audio/level_a/${level}/${lessonFolder}/audio_${sentence.id}.wav`;
                console.log(`Loading hardcoded audio: ${audioPath}`);
                
                try {
                    const response = await fetch(audioPath);
                    if (!response.ok) {
                        throw new Error(`Failed to load audio file: ${audioPath}`);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    buffer = await audioContext.decodeAudioData(arrayBuffer);
                    
                    timings = (sentence as any).timings.map((t: any) => ({
                        word: t.word,
                        startTime: t.start,
                        endTime: t.end
                    }));
                    
                    console.log(`✓ Loaded hardcoded audio for sentence ${sentence.id}`);
                } catch (fetchErr) {
                    console.warn(`Could not load hardcoded audio for sentence ${sentence.id}, falling back to TTS`, fetchErr);
                    const [base64Audio, apiTimings] = await Promise.all([
                        generateSpeech(sentence.farsi),
                        getWordTimings(sentence.farsi)
                    ]);
                    buffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
                    timings = apiTimings as WordTiming[];
                }
            } else {
                const [base64Audio, apiTimings] = await Promise.all([
                    generateSpeech(sentence.farsi),
                    getWordTimings(sentence.farsi)
                ]);
                buffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
                timings = apiTimings as WordTiming[];
            }
            
            audioMap.set(sentence.id, buffer);
            timingsMap.set(sentence.id, timings);
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
  }, [lesson.sentences, lesson.id, isKaraokeDataReady, isKaraokeLoading, getAudioContext]);

  const handleSetStep = (newStep: BirkenbihlStep) => { 
    stopAudio();
    setKaraokeState(prev => ({ ...prev, isPlaying: false })); // Stop karaoke playback if switching tabs
    setStep(newStep); 
    if (newStep === 'karaoke') {
      fetchAllKaraokeData();
    }
  }

  const goToNext = () => { 
    stopAudio(); 
    if (currentIndex < lesson.sentences.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      if (!isFreePractice) {
        saveDecodeProgress(nextIndex, allDecodeAnswers);
      }
    }
  };
  const goToPrev = () => { stopAudio(); if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };
  
  // Debounce ref for auto-saving decode answers
  const saveAnswersTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleDecodeInputChange = (index: number, value: string) => {
    const newUserDecode = [...userDecode];
    newUserDecode[index] = value;
    
    const updatedAnswers = {
      ...allDecodeAnswers,
      [currentIndex]: newUserDecode
    };
    setAllDecodeAnswers(updatedAnswers);
    
    // Auto-save with debouncing (500ms after last keystroke)
    if (!isFreePractice) {
      if (saveAnswersTimeoutRef.current) {
        clearTimeout(saveAnswersTimeoutRef.current);
      }
      saveAnswersTimeoutRef.current = setTimeout(() => {
        saveDecodeProgress(currentIndex, updatedAnswers);
      }, 500);
    }
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
            
            const isLastSentence = currentIndex === lesson.sentences.length - 1;
            if (isLastSentence && !stepProgress.decodeCompleted) {
              markDecodeComplete();
              addXp(50);
            }
        }
    }
  };

  const handleSkipAnyway = () => {
    // Mark as completed for this sentence to allow navigation
    setCompletedSteps(prev => new Set(prev).add('decode'));
    // Reset check state for next sentence
    setIsDecodeChecked(false);
    setIsDecodeCorrect(false);
    // Move to next sentence
    goToNext();
  };

  // Handler for Token-based word marking (used by DecodeStep component)
  const handleMarkToken = useCallback((token: { german: string; farsi: string; latin: string; isPunctuation: boolean }) => {
    if (token.isPunctuation || !token.german || !token.farsi) return;
    
    if (isWordMarked(token.german, token.farsi)) {
      removeCardByWords(token.german, token.farsi);
    } else {
      addCard(token.german, token.farsi, token.latin || '', currentSentence);
    }
  }, [isWordMarked, addCard, removeCardByWords, currentSentence]);
  
  // Save progress immediately
  const handleSaveProgress = useCallback(async () => {
    if (isFreePractice) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await saveDecodeProgress(currentIndex, allDecodeAnswers);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save progress:', err);
    } finally {
      setIsSaving(false);
    }
  }, [currentIndex, allDecodeAnswers, saveDecodeProgress, isFreePractice]);
  
  // Handle exit with save option
  const handleExitWithSave = useCallback(async () => {
    if (!isFreePractice) {
      setIsSaving(true);
      try {
        await saveDecodeProgress(currentIndex, allDecodeAnswers);
      } catch (err) {
        console.error('Failed to save on exit:', err);
      } finally {
        setIsSaving(false);
      }
    }
    setShowExitDialog(false);
    onLessonComplete?.();
  }, [currentIndex, allDecodeAnswers, saveDecodeProgress, isFreePractice, onLessonComplete]);
  
  // Handle exit without save
  const handleExitWithoutSave = useCallback(() => {
    setShowExitDialog(false);
    onLessonComplete?.();
  }, [onLessonComplete]);
  
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
  
  const renderContent = () => {
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
        return (
          <DecodeStep
            tokens={tokens}
            wordTokens={wordTokens}
            currentSentence={currentSentence}
            currentIndex={currentIndex}
            totalSentences={lesson.sentences.length}
            userAnswers={userDecode}
            decodeResults={decodeResults}
            isChecked={isDecodeChecked}
            isCorrect={isDecodeCorrect}
            audioState={decodeAudio.audioState}
            isPlaying={decodeAudio.isPlaying}
            audioError={decodeAudio.error}
            onPlayAudio={decodeAudio.playAudio}
            onAnswerChange={handleDecodeInputChange}
            onCheck={handleCheckDecode}
            onSkipAnyway={handleSkipAnyway}
            onPrevious={goToPrev}
            onNext={goToNext}
            canGoPrevious={currentIndex > 0}
            canGoNext={currentIndex < lesson.sentences.length - 1}
            onMarkWord={handleMarkToken}
            onUnmarkWord={removeCardByWords}
            isWordMarked={isWordMarked}
            onAddCard={addCard}
            groupMarkedTokenIdToCardId={groupMarkedTokenIdToCardId}
            onRemoveCardById={removeCard}
            showTranslation={showTranslation}
            onToggleTranslation={() => setShowTranslation(!showTranslation)}
            isLastSentence={currentIndex === lesson.sentences.length - 1}
            mode={mode}
            onNextStep={() => handleSetStep('karaoke')}
            onComplete={onLessonComplete}
            helpState={{
              isOpen: isHelpOpen,
              question: helpQuestion,
              answer: helpAnswer,
              isAsking: isAskingHelp,
              error: helpError,
            }}
            onToggleHelp={toggleHelp}
            onAskHelp={handleAskForHelp}
            onResetHelp={resetHelp}
            onQuestionChange={setHelpQuestion}
            onClearHelpAnswer={() => setHelpAnswer(null)}
          />
        );
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
                                <button
                                    onClick={async () => {
                                        if (!isFreePractice) {
                                          if (!stepProgress.karaokeCompleted) {
                                            await markKaraokeComplete();
                                          }
                                          if (!stepProgress.lessonCompleted) {
                                            await markLessonComplete();
                                            addXp(100);
                                          }
                                        }
                                        onLessonComplete?.();
                                    }}
                                    className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <CheckIcon /> Lektion abschließen
                                </button>
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
  
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-4">
      <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        stepProgress.decodeCompleted 
          ? 'bg-green-600/30 text-green-300 border border-green-500/50' 
          : step === 'decode'
            ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
            : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
      }`}>
        {stepProgress.decodeCompleted ? <CheckIcon /> : <TranslateIcon />}
        <span>Dekodieren</span>
        {!stepProgress.decodeCompleted && currentIndex > 0 && (
          <span className="ml-1 text-xs opacity-75">({currentIndex}/{lesson.sentences.length})</span>
        )}
      </div>
      
      <div className="w-8 h-0.5 bg-gray-600"></div>
      
      <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        stepProgress.karaokeCompleted 
          ? 'bg-green-600/30 text-green-300 border border-green-500/50' 
          : step === 'karaoke'
            ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
            : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
      }`}>
        {stepProgress.karaokeCompleted ? <CheckIcon /> : <MusicNoteIcon />}
        <span>Karaoke</span>
      </div>
      
      {stepProgress.lessonCompleted && (
        <>
          <div className="w-8 h-0.5 bg-green-500"></div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-green-600/30 text-green-300 border border-green-500/50">
            <CheckIcon />
            <span>Fertig!</span>
          </div>
        </>
      )}
    </div>
  );
  
  const progressComponent = (
    <div className="p-4 bg-gray-900/50 border-b border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">{lesson.title}</h2>
        {stepProgress.decodeSentenceIndex > 0 && !stepProgress.decodeCompleted && (
          <span className="text-xs text-teal-400 bg-teal-900/30 px-2 py-1 rounded">
            Fortgesetzt bei Satz {stepProgress.decodeSentenceIndex + 1}
          </span>
        )}
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
        <div className="bg-gradient-to-r from-blue-500 to-teal-400 h-2.5 rounded-full" style={{ width: `${progressPercentage}%`, transition: 'width 0.3s ease-in-out' }}></div>
      </div>
      {mode === 'full' && <StepIndicator />}
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

        {mode !== 'karaoke-only' && step !== 'karaoke' && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-2">
                  {!isFreePractice && onLessonComplete && (
                    <button 
                      onClick={() => setShowExitDialog(true)} 
                      className="flex items-center gap-1 px-3 py-2 rounded-md bg-red-900/50 hover:bg-red-800/50 text-red-200 text-sm"
                      title="Lektion beenden"
                    >
                      <CloseIcon />
                      <span className="hidden sm:inline">Menü</span>
                    </button>
                  )}
                  <button onClick={goToPrev} disabled={currentIndex === 0} className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50">
                      <ChevronLeftIcon /> Zurück
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {!isFreePractice && (
                    <button 
                      onClick={handleSaveProgress} 
                      disabled={isSaving}
                      className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition-colors ${
                        saveSuccess 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                      title="Fortschritt speichern"
                    >
                      {isSaving ? (
                        <SpinnerIcon />
                      ) : saveSuccess ? (
                        <CheckIcon />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                      )}
                      <span className="hidden sm:inline">{saveSuccess ? 'Gespeichert!' : 'Speichern'}</span>
                    </button>
                  )}
                  <span className="text-gray-400 font-mono">{currentIndex + 1} / {lesson.sentences.length}</span>
                </div>
                <button onClick={goToNext} disabled={currentIndex === lesson.sentences.length - 1 || !completedSteps.has('decode')} className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50">
                    Weiter <ChevronRightIcon />
                </button>
            </div>
        )}
        
        {/* Exit Confirmation Dialog */}
        {showExitDialog && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-3">Lektion verlassen?</h3>
              <p className="text-gray-300 mb-6">Möchtest du deinen Fortschritt speichern, bevor du gehst?</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleExitWithSave}
                  disabled={isSaving}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <SpinnerIcon /> : <CheckIcon />}
                  Speichern & Beenden
                </button>
                <button 
                  onClick={handleExitWithoutSave}
                  className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-semibold"
                >
                  Ohne Speichern beenden
                </button>
                <button 
                  onClick={() => setShowExitDialog(false)}
                  className="w-full py-2 px-4 text-gray-400 hover:text-gray-200"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonView;