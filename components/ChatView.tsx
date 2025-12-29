import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { LiveServerMessage, Session, Blob } from '@google/genai';
import { Lesson, ChatMessage, Scenario } from '../types';
import { connectToLiveChat, generateRoleplayScenarios, generateFarsiTTSFromGerman } from '../services/geminiService';
import { useVocabulary } from '../contexts/VocabularyContext';
import { BotIcon } from './icons/BotIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { StopIcon } from './icons/StopIcon';
import { decode, encode, decodeAudioData, resampleAudioBuffer } from '../utils/audioUtils';
import { WandIcon } from './icons/WandIcon';

type Status = 'idle' | 'generatingScenarios' | 'scenarioChoice' | 'connecting' | 'listening' | 'speaking' | 'error' | 'timedOut';

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function getMicErrorMessage(err: unknown): string {
  const e = err as any;
  const name = e?.name as string | undefined;

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Mikrofonzugriff wurde verweigert. Bitte erlaube Mikrofonzugriff in den Browser-Einstellungen und lade die Seite neu.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Kein Mikrofon gefunden. Bitte schließe ein Mikrofon an und versuche es erneut.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Mikrofon ist gerade von einer anderen App belegt oder nicht verfügbar. Bitte schließe andere Apps (z.B. Teams/Zoom) und versuche es erneut.';
  }
  if (name === 'SecurityError') {
    return 'Mikrofonzugriff ist nur in einem sicheren Kontext möglich (HTTPS oder localhost).';
  }

  const msg = typeof e?.message === 'string' ? e.message : '';
  if (msg.toLowerCase().includes('secure context')) {
    return 'Mikrofonzugriff ist nur in einem sicheren Kontext möglich (HTTPS oder localhost).';
  }

  return 'Mikrofonzugriff nicht verfügbar. Bitte prüfe Browser-Berechtigungen und ob ein Mikrofon angeschlossen ist.';
}

function getLiveChatConnectErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message || '';

    if (msg.includes('API_KEY')) {
      return 'Live-Chat konnte nicht gestartet werden: API-Schlüssel fehlt. Bitte in den Einstellungen/Env konfigurieren.';
    }
    if (msg.includes('PERMISSION_DENIED') || msg.includes('401') || msg.includes('403')) {
      return 'Live-Chat konnte nicht gestartet werden: API-Schlüssel ungültig oder keine Berechtigung für das Live-Modell.';
    }
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
      return 'Live-Chat konnte nicht gestartet werden: API-Limit erreicht. Bitte später erneut versuchen.';
    }
    if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
      return 'Live-Chat konnte nicht gestartet werden: Netzwerkfehler. Bitte Internetverbindung prüfen.';
    }
    return `Live-Chat konnte nicht gestartet werden: ${msg}`;
  }

  return 'Live-Chat konnte nicht gestartet werden. Bitte versuche es erneut.';
}

const ChatView: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  const { activeVocabulary } = useVocabulary();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[] | null>(null);

  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [interventionText, setInterventionText] = useState('');
  const [isInjecting, setIsInjecting] = useState(false);
  const [showScenarioPrompt, setShowScenarioPrompt] = useState(false);
  const [chatMode, setChatMode] = useState<'lesson' | 'free'>('lesson');
  const [showLessonScenarioOptions, setShowLessonScenarioOptions] = useState(false);

  const sessionPromiseRef = useRef<Promise<Session> | null>(null);
  const isClosingIntentionalRef = useRef(false);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pingerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopCurrentPlayback = useCallback(() => {
    for (const source of audioSourcesRef.current.values()) {
      try { source.stop(); } catch (e) { }
    }
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setStatus(prevStatus => {
      if (prevStatus === 'speaking') {
        return 'listening';
      }
      return prevStatus;
    });
  }, []);

  const cleanupLiveResources = useCallback(async () => {
    if (pingerIntervalRef.current) {
      clearInterval(pingerIntervalRef.current);
      pingerIntervalRef.current = null;
    }

    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error("Error closing session:", e);
      }
    }

    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();

    if (inputAudioContextRef.current?.state !== 'closed') {
      await inputAudioContextRef.current?.close().catch(console.error);
    }
    if (outputAudioContextRef.current?.state !== 'closed') {
      await outputAudioContextRef.current?.close().catch(console.error);
    }

    stopCurrentPlayback();

    sessionPromiseRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    mediaStreamRef.current = null;
  }, [stopCurrentPlayback]);

  const stopConversation = useCallback(async () => {
    isClosingIntentionalRef.current = true;
    await cleanupLiveResources();
    setStatus('idle');
    setScenarios(null);
  }, [cleanupLiveResources]);

  useEffect(() => {
    return () => {
      cleanupLiveResources();
    };
  }, [cleanupLiveResources]);

  const getSystemInstruction = useCallback((mode: 'lesson' | 'free') => {
    // Build graduated vocabulary section with null safety
    const graduatedCards = activeVocabulary?.cards ?? [];
    let graduatedVocabSection = '';
    if (graduatedCards.length > 0) {
      const vocabList = graduatedCards
        .map(card => `- ${card.farsiWord} (${card.word})`)
        .join('\n');

      graduatedVocabSection = `\n\n**Student's Mastered Vocabulary (PRIORITY):**
The student has already mastered these words through spaced repetition practice. You MUST actively use these words in your conversation to help reinforce them through real usage:
${vocabList}

**Important:** These are words the student knows well, so naturally incorporate them into your conversation. This helps bridge their passive knowledge into active speaking ability.`;
    }

    if (mode === 'free') {
      return `You are a friendly Farsi speaker having a natural daily conversation with a German-speaking learner. Your persona is a regular local in Tehran, not a formal tutor. You must only speak Farsi.

**Daily Farsi Guidelines:**
- Use everyday, spoken Farsi (not formal/textbook Farsi)
- Incorporate common contractions and natural filler words
- Speak like real Tehran locals in daily situations
- Avoid textbook-style formalities
- Keep sentences simple and conversational

**Student Context:**
- This is a language learner, so be patient and helpful
- If they struggle, gently guide with simpler alternatives
- Use their mastered vocabulary when natural${graduatedVocabSection}

Start with a friendly, casual Farsi greeting like you would with a friend.`;
    }

    // Original lesson-based instruction
    const learnedSentences = lesson.sentences.map(s => `- "${s.farsi}" (German: "${s.germanTranslation}")`).join('\n');

    return `You are a Farsi language tutor playing a roleplay scenario with a German-speaking student to help them practice. Your persona is a friendly local in Tehran. You must only speak Farsi.

**Your Goal:**
Create a natural, immersive conversation based on the lesson's theme. Instead of directly testing vocabulary, weave the lesson's concepts into a real-life situation.

**Lesson Context:**
- Title: '${lesson.title}'
- Description: '${lesson.description}'

**Lesson Vocabulary & Sentences:**
Here are the specific sentences the student has just learned. Please use the vocabulary and grammar from these examples in your conversation.
${learnedSentences}${graduatedVocabSection}

**Instructions:**
1.  **Initiate a Scenario:** Start the conversation by setting a scene related to the lesson. For example, if the lesson is about food, pretend you are in a restaurant together. If it's about daily activities, start by asking about their day.
2.  **Natural Integration:** Gently guide the conversation to use the verbs, phrases, and vocabulary from the lesson. For example, instead of asking "How do you say 'I want tea'?", you could ask "Man yek chāy mikhāham, shomā chetor? (I'd like a tea, how about you?)" to prompt a similar response.
3.  **Reinforce Mastered Words:** Prioritize using the student's mastered vocabulary in your questions and responses. This helps them practice words they already know in real conversations.
4.  **Go Beyond the Lesson:** Encourage the user to talk about themselves. If they use a verb from the lesson, ask a follow-up question. For example, if they say "Man kār mikonam (I am working)", you can ask "Shoghl-e shomā chist? (What is your job?)". This makes the practice more memorable and personal.
5.  **Be encouraging and helpful:** If the user struggles or answers in German, gently guide them. You can rephrase the question or provide the start of the correct Farsi sentence. Maintain a positive and patient tone throughout.
6.  **Keep it Simple:** The user is a beginner. Use simple sentence structures and vocabulary, primarily focusing on the content they've learned up to this lesson.

Start the roleplay now with a friendly Farsi greeting that establishes the scene.`;
  }, [lesson, activeVocabulary]);

  const generateAndShowScenarios = async () => {
    setStatus('generatingScenarios');
    setError(null);
    setMessages([]);
    try {
      const baseInstruction = getSystemInstruction('lesson');
      const generatedScenarios = await generateRoleplayScenarios(baseInstruction);
      setScenarios(generatedScenarios);
      setStatus('scenarioChoice');
    } catch (err) {
      console.error("Failed to generate scenarios:", err);
      setError("Szenarien konnten nicht geladen werden. Starte das Gespräch ohne Szenario...");
      setStatus('idle');
      // Fall back to starting without scenarios
      startLiveChat();
    }
  };

  const startLiveChat = async (selectedScenario?: Scenario) => {
    setStatus('connecting');
    setError(null);

    let systemInstruction = getSystemInstruction(chatMode);
    if (selectedScenario) {
      systemInstruction += `\n\n**Role-play Scenario:** You must start a conversation based on the following situation: "${selectedScenario.german}". Greet the user in Farsi and begin the role-play.`;
    } else {
      systemInstruction += `\n\n**Role-play Scenario:** Start a general conversation related to the lesson's theme. Greet the user in Farsi and begin the role-play.`;
    }

    // 1) Preflight checks (avoid confusing errors)
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setError('Mikrofonzugriff ist nur in einem sicheren Kontext möglich (HTTPS oder localhost).');
      setStatus('error');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Dein Browser unterstützt keinen Mikrofonzugriff (getUserMedia). Bitte nutze einen aktuellen Chrome/Edge/Firefox.');
      setStatus('error');
      return;
    }

    // 2) Acquire microphone first (so we can report mic errors precisely)
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
    } catch (err) {
      console.error('Failed to acquire microphone:', err);
      setError(getMicErrorMessage(err));
      setStatus('error');
      await cleanupLiveResources();
      return;
    }

    // 3) Connect to live chat (separate error reporting from mic errors)
    try {
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      sessionPromiseRef.current = connectToLiveChat(systemInstruction, {
        onopen: () => {
          setStatus('listening');
          const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
          mediaStreamSourceRef.current = source;

          const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current = scriptProcessor;

          scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            sessionPromiseRef.current?.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContextRef.current!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
          }
          if (message.serverContent?.outputTranscription) {
            setStatus('speaking');
            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
          }

          if (message.serverContent?.turnComplete) {
            const finalInput = currentInputTranscriptionRef.current.trim();
            const finalOutput = currentOutputTranscriptionRef.current.trim();

            if (finalInput) setMessages(prev => [...prev, { role: 'user', text: finalInput }]);
            if (finalOutput) setMessages(prev => [...prev, { role: 'model', text: finalOutput }]);

            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
            setStatus('listening');
          }

          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio) {
            const outputCtx = outputAudioContextRef.current!;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);

            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
            const source = outputCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputCtx.destination);

            source.addEventListener('ended', () => {
              audioSourcesRef.current.delete(source);
            });

            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
          }

          if (message.serverContent?.interrupted) {
            for (const source of audioSourcesRef.current.values()) {
              source.stop();
            }
            audioSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e: ErrorEvent) => {
          setError("Verbindungsfehler. Bitte versuche es erneut.");
          setStatus('error');
          cleanupLiveResources();
        },
        onclose: (e: CloseEvent) => {
          cleanupLiveResources();
          if (isClosingIntentionalRef.current) {
            isClosingIntentionalRef.current = false; // Reset for next session
            return; // Status is already set to 'idle' by stopConversation.
          }

          // If it wasn't intentional, it's either a timeout or an error.
          if (!e.wasClean) {
            setError("Verbindung unerwartet getrennt. Prüfe dein Netzwerk.");
            setStatus('error');
          } else {
            // A clean close from the server is most likely an inactivity timeout.
            setStatus('timedOut');
          }
        },
      });

      await sessionPromiseRef.current;

    } catch (err) {
      console.error('Failed to start live chat session:', err);
      setError(getLiveChatConnectErrorMessage(err));
      setStatus('error');
      await cleanupLiveResources();
    }
  };

  const handleToggleConversation = useCallback(async () => {
    if (status === 'idle' || status === 'error' || status === 'timedOut') {
      setShowScenarioPrompt(true);
    } else {
      stopConversation();
    }
  }, [status]);

  const handleOpenInterventionModal = () => {
    stopCurrentPlayback();
    setIsInterventionModalOpen(true);
  };

  const handleInjectIntervention = async () => {
    if (!interventionText.trim() || !sessionPromiseRef.current) return;

    setIsInjecting(true);
    setError(null);
    
    const tempOutputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    try {
        const base64Audio24k = await generateFarsiTTSFromGerman(interventionText);
        const decodedBytes24k = decode(base64Audio24k);
        const audioBuffer24k = await decodeAudioData(decodedBytes24k, tempOutputCtx, 24000, 1);
        const audioBuffer16k = await resampleAudioBuffer(audioBuffer24k, 16000);
        const float32Array16k = audioBuffer16k.getChannelData(0);
        const pcmBlob = createBlob(float32Array16k);
        
        const session = await sessionPromiseRef.current;
        session.sendRealtimeInput({ media: pcmBlob });
        
        const interventionDisplay = `(Anweisung: ${interventionText})`;
        setMessages(prev => [...prev, { role: 'user', text: interventionDisplay }]);

        setInterventionText('');
        setIsInterventionModalOpen(false);

    } catch (err) {
        console.error("Failed to inject intervention:", err);
        setError("Anweisung konnte nicht gesendet werden.");
    } finally {
        setIsInjecting(false);
        tempOutputCtx.close();
    }
  };
  
  const getStatusInfo = () => {
      switch(status) {
          case 'idle': return { message: 'Tippe, um das Gespräch zu beginnen', buttonClass: 'bg-blue-600 hover:bg-blue-500', icon: <MicrophoneIcon className="h-8 w-8" />};
          case 'generatingScenarios': return { message: 'Generiere Szenarien...', buttonClass: 'bg-gray-600 cursor-not-allowed', icon: <SpinnerIcon className="h-8 w-8 text-white" />};
          case 'scenarioChoice': return { message: 'Wähle ein Szenario, um zu starten', buttonClass: 'bg-gray-600 cursor-not-allowed', icon: <MicrophoneIcon className="h-8 w-8" />};
          case 'connecting': return { message: 'Verbinde...', buttonClass: 'bg-gray-600 cursor-not-allowed', icon: <SpinnerIcon className="h-8 w-8 text-white" />};
          case 'listening': return { message: 'Höre zu... Sprich jetzt!', buttonClass: 'bg-red-500 animate-pulse', icon: <MicrophoneIcon className="h-8 w-8" /> };
          case 'speaking': return { message: 'Antwort wird wiedergegeben...', buttonClass: 'bg-red-500', icon: <StopIcon className="h-8 w-8" /> };
          case 'error': return { message: error || 'Ein Fehler ist aufgetreten', buttonClass: 'bg-yellow-600 hover:bg-yellow-500', icon: <MicrophoneIcon className="h-8 w-8" /> };
          case 'timedOut': return { message: 'Sitzung wegen Inaktivität beendet.', buttonClass: '', icon: null };
          default: return { message: '', buttonClass: '', icon: null };
      }
  }

  const { message, buttonClass, icon } = getStatusInfo();
  
  const hasStarted = status === 'listening' || status === 'speaking';
  const isPreChat = status === 'idle' || status === 'generatingScenarios' || status === 'scenarioChoice';

  return (
    <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-4xl mx-auto animate-fade-in flex flex-col h-[75vh] relative">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-center text-gray-200">
          Dialog-Übung: <span className="text-teal-300">{lesson.title}</span>
        </h3>
      </div>
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="space-y-4">
          {isPreChat && (
            <div className="text-center text-gray-400 p-8 flex flex-col items-center gap-4">
              <BotIcon className="h-16 w-16 text-teal-400" />
              {status === 'idle' && <p>Bereit für eine Unterhaltung auf Farsi? Drücke den Mikrofon-Button, um zu starten.</p>}
              {status === 'generatingScenarios' && <p>Einen Moment, ich denke mir ein paar Gesprächsszenarien für dich aus...</p>}
              {status === 'scenarioChoice' && scenarios && (
                <div className="w-full max-w-lg animate-fade-in">
                    <h4 className="text-xl font-bold text-white mb-4">Wähle ein Szenario</h4>
                    <div className="space-y-3">
                        {scenarios.map((scenario, index) => (
                            <button key={index} onClick={() => startLiveChat(scenario)} className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                                <p className="text-lg text-gray-100">{scenario.farsi}</p>
                                <p className="text-sm text-gray-400 mt-1">{scenario.german}</p>
                            </button>
                        ))}
                         <button onClick={() => startLiveChat()} className="w-full text-left p-3 bg-gray-700/60 hover:bg-gray-600 rounded-lg transition-colors text-gray-300">
                            Kein bestimmtes Szenario, beginne einfach das Gespräch.
                        </button>
                    </div>
                </div>
              )}
            </div>
          )}
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && <BotIcon className="flex-shrink-0 text-teal-400" />}
              <div
                className={`max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${
                  msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {hasStarted && (
        <button
            onClick={handleOpenInterventionModal}
            className="absolute bottom-24 right-4 md:bottom-28 md:right-8 z-20 w-14 h-14 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 border-2 border-purple-400"
            aria-label="Szenario anpassen"
            title="Szenario anpassen"
        >
            <WandIcon className="h-7 w-7" />
        </button>
      )}

      {isInterventionModalOpen && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-lg w-full p-6">
                <h4 className="text-xl font-bold text-white mb-4">Szenario anpassen</h4>
                <p className="text-gray-400 mb-4 text-sm">
                    Gib hier eine Anweisung auf Deutsch ein, um das Gespräch in eine neue Richtung zu lenken. Z.B: "Frage mich nach meinem Beruf" oder "Sei plötzlich verärgert".
                </p>
                <textarea
                    value={interventionText}
                    onChange={(e) => setInterventionText(e.target.value)}
                    className="w-full h-24 p-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Deine Anweisung..."
                    disabled={isInjecting}
                />
                <div className="flex justify-end gap-4 mt-4">
                    <button
                        onClick={() => setIsInterventionModalOpen(false)}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-md transition-colors"
                        disabled={isInjecting}
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={handleInjectIntervention}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-md transition-colors flex items-center justify-center gap-2 w-28 disabled:bg-gray-500 disabled:cursor-not-allowed"
                        disabled={isInjecting || !interventionText.trim()}
                    >
                        {isInjecting ? <SpinnerIcon className="h-5 w-5" /> : 'Senden'}
                    </button>
                </div>
            </div>
        </div>
       )}

      {showScenarioPrompt && !hasStarted && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <h4 className="text-xl font-bold text-white mb-4">Wie möchtest du üben?</h4>
            <p className="text-gray-400 mb-6">
              Wähle zwischen Lektions-basiertem Gespräch oder freiem Sprechen für den Alltag.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setChatMode('lesson');
                  setShowScenarioPrompt(false);
                  setShowLessonScenarioOptions(true);
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                📚 Lektions-basiertes Gespräch
              </button>
              <button
                onClick={() => {
                  setChatMode('free');
                  setShowScenarioPrompt(false);
                  startLiveChat();
                }}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                disabled={status === 'connecting'}
              >
                🗣️ Freies Sprechen (Alltag)
              </button>
            </div>
          </div>
        </div>
      )}

      {showLessonScenarioOptions && !hasStarted && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-30 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full p-6">
            <h4 className="text-xl font-bold text-white mb-4">Möchtest du ein Gesprächsszenario?</h4>
            <p className="text-gray-400 mb-6">
              Ein Szenario gibt dem Gespräch eine bestimmte Richtung (z.B. "Im Restaurant" oder "Beim Einkaufen").
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={async () => {
                  setShowLessonScenarioOptions(false);
                  await generateAndShowScenarios();
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors flex-1"
                disabled={status === 'generatingScenarios'}
              >
                {status === 'generatingScenarios' ? (
                  <span className="flex items-center justify-center gap-2">
                    <SpinnerIcon className="h-5 w-5" />
                    Lädt...
                  </span>
                ) : (
                  'Ja, Szenario vorschlagen'
                )}
              </button>
              <button
                onClick={() => {
                  setShowLessonScenarioOptions(false);
                  startLiveChat();
                }}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors flex-1"
                disabled={status === 'connecting'}
              >
                Nein, direkt starten
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-gray-700 flex flex-col items-center justify-center gap-2 min-h-[116px]">
        {status === 'timedOut' ? (
             <button
                onClick={handleToggleConversation}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
            >
                Neu starten
            </button>
        ) : (
            <button
                onClick={handleToggleConversation}
                disabled={status === 'connecting' || status === 'generatingScenarios' || status === 'scenarioChoice'}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg border-4 text-white ${buttonClass}`}
                aria-label={hasStarted ? "Stop conversation" : "Start conversation"}
            >
                {icon}
            </button>
        )}
        <p className="text-sm text-gray-400 h-5">{message}</p>
      </div>
    </div>
  );
};

export default ChatView;