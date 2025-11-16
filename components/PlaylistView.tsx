import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProgress } from '../hooks/useProgress';
import { Sentence } from '../types';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { BotIcon } from './icons/BotIcon';

interface PlaylistViewProps {
    lessonId: string;
}

const PlaylistView: React.FC<PlaylistViewProps> = ({ lessonId }) => {
    const { getSentencesUpToLesson, isProgressLoading } = useProgress();
    const [sentences, setSentences] = useState<Sentence[]>([]);
    const [audioBuffers, setAudioBuffers] = useState<Map<number, AudioBuffer>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const isFetchingRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    useEffect(() => {
        if (!isProgressLoading) {
            const sentencesForPlaylist = getSentencesUpToLesson(lessonId);
            setSentences(sentencesForPlaylist);
            if (sentencesForPlaylist.length === 0) {
                setIsLoading(false);
            }
        }
    }, [lessonId, isProgressLoading, getSentencesUpToLesson]);

    const prefetchAudio = useCallback(async (index: number) => {
        if (index >= sentences.length || audioBuffers.has(sentences[index].id) || isFetchingRef.current) {
            return;
        }
        isFetchingRef.current = true;
        try {
            const sentence = sentences[index];
            const audioContext = getAudioContext();
            const base64Audio = await generateSpeech(sentence.farsi);
            const buffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
            setAudioBuffers(prev => new Map(prev).set(sentence.id, buffer));
        } catch (err) {
            console.error(`Failed to fetch audio for sentence ${index}`, err);
            setError("Einige Audio-Dateien konnten nicht geladen werden.");
        } finally {
            isFetchingRef.current = false;
        }
    }, [sentences, audioBuffers, getAudioContext]);

    useEffect(() => {
        if (sentences.length > 0) {
            prefetchAudio(0).then(() => setIsLoading(false));
        }
    }, [sentences, prefetchAudio]);
    
    const playNext = useCallback(() => {
        if(currentIndex < sentences.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Reached the end
            setCurrentIndex(0); // Loop
            setIsPlaying(false);
        }
    }, [currentIndex, sentences.length]);

    const playAudio = useCallback((index: number) => {
        const buffer = audioBuffers.get(sentences[index].id);
        if (!buffer) {
            // If buffer is not ready, try fetching, then play or move on
            prefetchAudio(index).then(() => {
                if(isPlaying) playNext();
            });
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
            if (isPlaying) playNext();
        };
        source.start(0);
        audioSourceRef.current = source;
        prefetchAudio(index + 1); // Prefetch next one

    }, [audioBuffers, sentences, isPlaying, playNext, prefetchAudio, getAudioContext]);

     const stopAudio = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;
            audioSourceRef.current.stop();
            audioSourceRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (isPlaying && sentences.length > 0) {
            playAudio(currentIndex);
        } else {
            stopAudio();
        }
        return stopAudio;
    }, [isPlaying, currentIndex, sentences, playAudio, stopAudio]);

    const handlePlayPause = () => {
        setIsPlaying(prev => !prev);
    };

    if (isLoading) {
        return <div className="text-center p-8"><SpinnerIcon /><p className="mt-2">Lade Playlist...</p></div>;
    }

    if (sentences.length === 0) {
        return (
            <div className="text-center p-8 flex flex-col items-center gap-4 text-gray-400">
                <BotIcon className="h-16 w-16 text-teal-400" />
                <h2 className="text-2xl font-bold text-white">Keine Sätze gefunden</h2>
                <p>Für die ausgewählte Lektion konnten keine Sätze gefunden werden.</p>
            </div>
        );
    }
    
    const currentSentence = sentences[currentIndex];
    const progress = (currentIndex / sentences.length) * 100;

    return (
        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl mx-auto animate-fade-in p-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
            <div className="w-full">
                <p className="text-lg text-gray-400">Aktueller Satz ({currentIndex + 1}/{sentences.length})</p>
                <p className="text-3xl font-mono text-blue-300 my-4 h-10">{currentSentence.farsi}</p>
                
                <div className="w-full bg-gray-700 h-2 rounded-full my-6">
                    <div 
                        className="bg-gradient-to-r from-blue-500 to-teal-400 h-2 rounded-full" 
                        style={{ width: `${progress}%`, transition: 'width 0.5s linear' }}
                    ></div>
                </div>
            </div>

            <button
                onClick={handlePlayPause}
                className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 disabled:bg-gray-600"
                aria-label={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <p className="mt-4 text-gray-400 h-5">
                {isPlaying ? "Wiedergabe läuft..." : "Pausiert"}
            </p>
            {error && <p className="text-red-400 mt-4">{error}</p>}
        </div>
    );
};

export default PlaylistView;