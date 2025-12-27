import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sentence } from '../types';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { CheckIcon } from './icons/CheckIcon';

const TOTAL_LOOPS = 10;

const KaraokeView: React.FC<{ sentences: Sentence[], onComplete: () => void, lessonId: string }> = ({ sentences, onComplete, lessonId }) => {
    const [audioBuffers, setAudioBuffers] = useState<Map<number, AudioBuffer>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [loopCount, setLoopCount] = useState(1);
    const [sentenceIndex, setSentenceIndex] = useState(0);

    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    const fetchAllAudio = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const audioMap = new Map<number, AudioBuffer>();
        const audioContext = getAudioContext();
        try {
            await Promise.all(sentences.map(async (sentence) => {
                let buffer: AudioBuffer;
                
                if ((sentence as any).timings && (sentence as any).timings.length > 0) {
                    // Determine the level and lesson path
                    const level = lessonId.startsWith('a1') ? 'level_a1' : 'level_a2';
                    const audioPath = `/audio/level_a/${level}/${lessonId}/audio_${sentence.id}.wav`;
                    console.log(`Loading audio: ${audioPath}`);
                    
                    try {
                        const response = await fetch(audioPath);
                        if (!response.ok) {
                            throw new Error(`Failed to load audio file: ${audioPath}`);
                        }
                        const arrayBuffer = await response.arrayBuffer();
                        buffer = await audioContext.decodeAudioData(arrayBuffer);
                    } catch (fetchErr) {
                        console.warn(`Could not load hardcoded audio for sentence ${sentence.id}, falling back to TTS`, fetchErr);
                        const base64Audio = await generateSpeech(sentence.farsi);
                        buffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
                    }
                } else {
                    const base64Audio = await generateSpeech(sentence.farsi);
                    buffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
                }
                
                audioMap.set(sentence.id, buffer);
            }));
            setAudioBuffers(audioMap);
        } catch (err) {
            console.error("Error generating speech for karaoke:", err);
            setError("Audio konnte nicht geladen werden.");
        } finally {
            setIsLoading(false);
        }
    }, [sentences, getAudioContext]);

    useEffect(() => {
        if (sentences.length > 0) {
            fetchAllAudio();
        } else {
            setIsLoading(false);
        }
    }, [fetchAllAudio, sentences]);

    const stopAudio = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;
            audioSourceRef.current.stop();
            audioSourceRef.current = null;
        }
    }, []);
    
    const playNextSentence = useCallback(() => {
        if (sentenceIndex < sentences.length - 1) {
            setSentenceIndex(prev => prev + 1);
        } else {
            // End of a loop
            if (loopCount < TOTAL_LOOPS) {
                setLoopCount(prev => prev + 1);
                setSentenceIndex(0);
            } else {
                // All loops complete
                setIsPlaying(false);
            }
        }
    }, [sentenceIndex, sentences.length, loopCount]);

    const playAudio = useCallback((index: number) => {
        const sentence = sentences[index];
        const buffer = audioBuffers.get(sentence.id);
        if (!buffer) return;

        stopAudio();
        
        const audioContext = getAudioContext();
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.onended = () => {
            if (isPlaying) { // only advance if we are in playing state
                playNextSentence();
            }
        };
        source.start(0);
        audioSourceRef.current = source;
    }, [audioBuffers, sentences, stopAudio, isPlaying, playNextSentence, getAudioContext]);

    useEffect(() => {
        if (isPlaying && !isLoading && loopCount <= TOTAL_LOOPS) {
            playAudio(sentenceIndex);
        } else {
            stopAudio();
        }
        return stopAudio; // Cleanup on unmount or when dependencies change
    }, [isPlaying, isLoading, loopCount, sentenceIndex, playAudio, stopAudio]);

    if (isLoading) {
        return <div className="p-8 text-center"><SpinnerIcon /> <p className="mt-2">Bereite Karaoke-Phase vor...</p></div>;
    }

    if (error) {
        return <p className="text-red-400 text-center p-8">{error}</p>;
    }

    const isFinished = loopCount >= TOTAL_LOOPS && !isPlaying;

    return (
        <div className="p-6 md:p-8 animate-fade-in">
            <h3 className="text-2xl font-bold text-center mb-2 text-teal-300">Phase 3: Aktive Aufnahme (Karaoke)</h3>
            <p className="text-center text-gray-400 mb-6">Lies die deutsche Dekodierung mit, während du das Farsi hörst. Dies verbindet Klang und Bedeutung.</p>

            <div className="bg-gray-900/50 p-6 rounded-lg min-h-[250px] flex flex-col justify-center items-center text-center relative">
                <div className="absolute top-4 right-4 bg-blue-500/30 text-blue-200 font-bold px-3 py-1 rounded-full">
                    Loop: {Math.min(loopCount, TOTAL_LOOPS)} / {TOTAL_LOOPS}
                </div>
                {isFinished ? (
                    <div className="animate-fade-in">
                         <CheckIcon className="h-20 w-20 text-green-400 mx-auto" />
                         <p className="text-2xl font-bold mt-4 text-white">Sehr gut!</p>
                         <p className="text-gray-300">Aktives Hören abgeschlossen.</p>
                    </div>
                ) : (
                    <>
                        <p className="text-3xl md:text-4xl font-bold text-gray-300 h-24 flex items-center">{sentences[sentenceIndex].germanDecode}</p>
                        <div className="mt-8">
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                disabled={isLoading}
                                className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-105"
                                aria-label={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="mt-8 text-center">
                 <button 
                    onClick={onComplete}
                    disabled={!isFinished}
                    className="w-full sm:w-auto px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    <CheckIcon /> Tagesdosis abschließen
                </button>
            </div>
        </div>
    );
};

export default KaraokeView;