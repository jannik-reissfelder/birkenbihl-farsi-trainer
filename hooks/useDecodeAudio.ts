import { useState, useEffect, useRef, useCallback } from 'react';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';

type AudioState = 'idle' | 'loading' | 'ready' | 'error';

interface AudioCacheEntry {
  audioBuffer: AudioBuffer;
  timestamp: number;
}

interface DecodeAudioHook {
  audioState: AudioState;
  error: string | null;
  playAudio: () => void;
  isPlaying: boolean;
}

const MAX_CACHE_SIZE = 5;
const audioCache = new Map<string, AudioCacheEntry>();

const evictOldestCacheEntry = () => {
  if (audioCache.size < MAX_CACHE_SIZE) return;
  
  let oldestKey: string | null = null;
  let oldestTimestamp = Infinity;
  
  audioCache.forEach((entry, key) => {
    if (entry.timestamp < oldestTimestamp) {
      oldestTimestamp = entry.timestamp;
      oldestKey = key;
    }
  });
  
  if (oldestKey) {
    audioCache.delete(oldestKey);
  }
};

export const useDecodeAudio = (
  lessonId: string,
  sentenceIndex: number,
  farsiText: string,
  audioContext: AudioContext | null
): DecodeAudioHook => {
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const currentCacheKeyRef = useRef<string>('');

  const getCacheKey = useCallback((lessonId: string, index: number) => {
    return `${lessonId}-${index}`;
  }, []);

  const fetchAndCacheAudio = useCallback(async (
    lessonId: string,
    index: number,
    text: string,
    signal: AbortSignal
  ): Promise<AudioBuffer | null> => {
    const cacheKey = getCacheKey(lessonId, index);
    
    const cached = audioCache.get(cacheKey);
    if (cached) {
      cached.timestamp = Date.now();
      return cached.audioBuffer;
    }

    try {
      const base64Audio = await generateSpeech(text);
      
      if (signal.aborted) return null;

      if (!audioContext) return null;

      const audioData = decode(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
      
      if (signal.aborted) return null;

      evictOldestCacheEntry();
      audioCache.set(cacheKey, {
        audioBuffer,
        timestamp: Date.now()
      });

      return audioBuffer;
    } catch (err) {
      if (signal.aborted) return null;
      throw err;
    }
  }, [getCacheKey, audioContext]);

  useEffect(() => {
    const currentKey = getCacheKey(lessonId, sentenceIndex);
    currentCacheKeyRef.current = currentKey;
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const loadCurrentAndPrefetchNext = async () => {
      setAudioState('loading');
      setError(null);

      try {
        const audioBuffer = await fetchAndCacheAudio(lessonId, sentenceIndex, farsiText, controller.signal);
        
        if (!controller.signal.aborted && currentCacheKeyRef.current === currentKey) {
          if (audioBuffer) {
            setAudioState('ready');
          } else {
            setError('AudioContext nicht verfügbar.');
            setAudioState('error');
          }
        }
      } catch (err) {
        if (!controller.signal.aborted && currentCacheKeyRef.current === currentKey) {
          const errorMessage = err instanceof Error ? err.message : 'Audiodaten konnten nicht geladen werden.';
          setError(errorMessage);
          setAudioState('error');
        }
      }
    };

    loadCurrentAndPrefetchNext();

    return () => {
      controller.abort();
      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch (e) {
        }
        audioSourceRef.current = null;
      }
    };
  }, [lessonId, sentenceIndex, farsiText, getCacheKey, fetchAndCacheAudio]);

  const playAudio = useCallback(() => {
    if (!audioContext || audioState !== 'ready') return;

    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
      }
      audioSourceRef.current = null;
    }

    const cacheKey = getCacheKey(lessonId, sentenceIndex);
    const cached = audioCache.get(cacheKey);
    
    if (!cached) return;

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = cached.audioBuffer;
    source.connect(audioContext.destination);
    
    setIsPlaying(true);
    
    source.onended = () => {
      setIsPlaying(false);
      audioSourceRef.current = null;
    };

    source.start(0);
    audioSourceRef.current = source;
  }, [audioContext, audioState, lessonId, sentenceIndex, getCacheKey]);

  return {
    audioState,
    error,
    playAudio,
    isPlaying
  };
};
