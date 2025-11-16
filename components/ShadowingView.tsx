
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sentence } from '../types';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { CheckIcon } from './icons/CheckIcon';

const ShadowingView: React.FC<{ sentences: Sentence[], onComplete: () => void }> = ({ sentences, onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [audioData, setAudioData] = useState<Map<number, AudioBuffer>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    const currentSentence = sentences[currentIndex];

    const fetchAllAudio = useCallback(async () => {
        if (sentences.length === 0) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        const audioMap = new Map<number, AudioBuffer>();
        const audioContext = getAudioContext();
        try {
            await Promise.all(sentences.map(async (sentence) => {
                const base64Audio = await generateSpeech(sentence.farsi);
                const buffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
                audioMap.set(sentence.id, buffer);
            }));
            setAudioData(audioMap);
        } catch (err) {
            console.error("Error generating speech for shadowing:", err);
            setError("Audio konnte nicht geladen werden.");
        } finally {
            setIsLoading(false);
        }
    }, [sentences, getAudioContext]);

    useEffect(() => {
        fetchAllAudio();
    }, [fetchAllAudio]);

    const stopAudio = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
        }
        setIsPlaying(false);
    }, []);

    const playAudio = useCallback(() => {
        const buffer = audioData.get(currentSentence.id);
        if (!buffer) return;

        if (isPlaying) {
            stopAudio();
            return;
        }
        
        const audioContext = getAudioContext();
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.onended = () => {
            if (audioSourceRef.current === source) {
                setIsPlaying(false);
                audioSourceRef.current = null;
            }
        };
        source.start(0);
        audioSourceRef.current = source;
        setIsPlaying(true);
    }, [audioData, currentSentence, stopAudio, isPlaying, getAudioContext]);

    const goToNext = () => {
        stopAudio();
        if (currentIndex < sentences.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const goToPrev = () => {
        stopAudio();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center"><SpinnerIcon /> <p className="mt-2">Bereite Shadowing-Übung vor...</p></div>;
    }

    if (error) {
        return <p className="text-red-400 text-center p-8">{error}</p>;
    }

    return (
        <div className="p-6 md:p-8 animate-fade-in">
            <h3 className="text-2xl font-bold text-center mb-2 text-teal-300">Phase 1: Shadowing (Aufwärmen)</h3>
            <p className="text-center text-gray-400 mb-6">Wiederhole die Sätze von gestern. Höre zu und sprich gleichzeitig mit. Wiederhole jeden Satz 3-5 Mal.</p>

            <div className="bg-gray-900/50 p-6 rounded-lg min-h-[200px] flex flex-col justify-center items-center text-center">
                <p className="text-3xl md:text-4xl font-bold text-blue-300 font-mono tracking-wide">{currentSentence.farsi}</p>
                <p className="text-lg text-gray-400 mt-2 font-sans">{currentSentence.latin}</p>
                <p className="text-xl md:text-2xl text-gray-300 mt-4">{currentSentence.germanDecode}</p>
                 <div className="mt-6">
                    <button
                        onClick={playAudio}
                        disabled={!audioData.get(currentSentence.id)}
                        className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 disabled:bg-gray-600"
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                </div>
            </div>

            <div className="flex justify-between items-center mt-6">
                <button onClick={goToPrev} disabled={currentIndex === 0} className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50">
                    <ChevronLeftIcon /> Zurück
                </button>
                <span className="text-gray-400 font-mono">{currentIndex + 1} / {sentences.length}</span>
                <button onClick={goToNext} disabled={currentIndex === sentences.length - 1} className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50">
                    Weiter <ChevronRightIcon />
                </button>
            </div>
             <div className="mt-8 text-center">
                <button 
                    onClick={onComplete}
                    className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                    <CheckIcon /> Weiter zur De-kodierung
                </button>
            </div>
        </div>
    );
};

export default ShadowingView;
