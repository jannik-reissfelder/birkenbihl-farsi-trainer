import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProgress } from '../hooks/useProgress';
import { Sentence } from '../types';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { CheckIcon } from './icons/CheckIcon';
import { BotIcon } from './icons/BotIcon';

const SESSION_DURATION_SECONDS = 300; // 5 minutes
const SENTENCE_COUNT = 6;

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

const FreeShadowingSession: React.FC<{ lessonId: string, onComplete: () => void }> = ({ lessonId, onComplete }) => {
    const { getSentencesUpToLesson, isProgressLoading } = useProgress();
    
    const [selectedSentences, setSelectedSentences] = useState<Sentence[]>([]);
    const [audioBuffers, setAudioBuffers] = useState<Map<number, AudioBuffer>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(SESSION_DURATION_SECONDS);

    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const timerIntervalRef = useRef<number | null>(null);

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);
    
    // Step 1: Get sentences and select random ones
    useEffect(() => {
        if (!isProgressLoading) {
            const sentencePool = getSentencesUpToLesson(lessonId);
            const shuffled = shuffleArray(sentencePool);
            const selected = shuffled.slice(0, Math.min(SENTENCE_COUNT, shuffled.length));
            setSelectedSentences(selected);
        }
    }, [lessonId, isProgressLoading, getSentencesUpToLesson]);

    // Step 2: Fetch audio for selected sentences
    useEffect(() => {
        const fetchAllAudio = async () => {
            if (selectedSentences.length === 0) {
                if(!isProgressLoading) setIsLoading(false); // If there are no sentences, stop loading.
                return;
            };

            setIsLoading(true);
            setError(null);
            const audioMap = new Map<number, AudioBuffer>();
            const audioContext = getAudioContext();
            try {
                await Promise.all(selectedSentences.map(async (sentence) => {
                    const base64Audio = await generateSpeech(sentence.farsi);
                    const buffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
                    audioMap.set(sentence.id, buffer);
                }));
                setAudioBuffers(audioMap);
            } catch (err) {
                console.error("Error generating speech for shadowing:", err);
                setError("Audio konnte nicht geladen werden.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllAudio();
    }, [selectedSentences, getAudioContext]);

    const stopAudio = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;
            try { audioSourceRef.current.stop(); } catch(e) {}
            audioSourceRef.current = null;
        }
    }, []);

    const playNextSentence = useCallback(() => {
        if (selectedSentences.length > 0) {
            setCurrentSentenceIndex(prev => (prev + 1) % selectedSentences.length);
        }
    }, [selectedSentences.length]);

    // Audio playback logic
    useEffect(() => {
        if (isPlaying && !isLoading && audioBuffers.size > 0 && timeLeft > 0) {
            const sentence = selectedSentences[currentSentenceIndex];
            const buffer = audioBuffers.get(sentence.id);
            if (!buffer) return;

            stopAudio();
            const audioContext = getAudioContext();
            if (audioContext.state === 'suspended') audioContext.resume();
            
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.onended = () => { if (isPlaying) playNextSentence(); };
            source.start(0);
            audioSourceRef.current = source;
        } else {
            stopAudio();
        }
    }, [isPlaying, isLoading, audioBuffers, currentSentenceIndex, selectedSentences, stopAudio, getAudioContext, playNextSentence]);


    // Timer logic
    useEffect(() => {
        if (isPlaying && timeLeft > 0) {
            timerIntervalRef.current = window.setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (timeLeft <= 0) setIsPlaying(false);
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [isPlaying, timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const isFinished = timeLeft <= 0;

    if (isLoading) {
        return <div className="text-center p-8"><SpinnerIcon /><p className="mt-2">Lade zufällige Sätze und Audiodaten...</p></div>;
    }
    
    if (selectedSentences.length === 0) {
        return (
            <div className="text-center p-8 flex flex-col items-center gap-4 text-gray-400">
                <BotIcon className="h-16 w-16 text-teal-400" />
                <h2 className="text-2xl font-bold text-white">Keine Sätze gefunden</h2>
                <p>Es scheint, als gäbe es in den ausgewählten Lektionen keine Sätze zum Üben. Bitte wähle eine andere Lektion.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl mx-auto animate-fade-in p-8 text-center flex flex-col items-center justify-center min-h-[70vh]">
           
            {isFinished ? (
                 <div className="animate-fade-in flex flex-col items-center">
                    <CheckIcon className="h-24 w-24 text-green-400 mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-2">Sitzung beendet!</h2>
                    <p className="text-gray-400 mt-4">Großartige Arbeit! Regelmäßiges Shadowing verbessert deine Aussprache enorm.</p>
                    <button 
                        onClick={onComplete}
                        className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                    >
                        Zurück zur Auswahl
                    </button>
                </div>
            ) : (
                <>
                    <h2 className="text-4xl font-mono font-bold text-white mb-6">{formatTime(timeLeft)}</h2>
                    <div className="w-full bg-gray-900/50 p-6 rounded-lg mb-8">
                        <h3 className="text-lg text-gray-400 mb-4">Deine Sätze für diese Sitzung:</h3>
                        <div className="space-y-3">
                            {selectedSentences.map((sentence, index) => (
                                <p 
                                    key={`${sentence.id}-${index}`} 
                                    className={`text-xl font-mono transition-all duration-300 ${index === currentSentenceIndex && isPlaying ? 'text-blue-300 scale-105' : 'text-gray-500'}`}
                                >
                                    {sentence.farsi}
                                </p>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 disabled:bg-gray-600"
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <p className="mt-4 text-gray-400 h-5">
                        {isPlaying ? "Wiedergabe läuft..." : "Pausiert"}
                    </p>
                    {error && <p className="text-red-400 mt-4">{error}</p>}
                </>
            )}
        </div>
    );
};

export default FreeShadowingSession;