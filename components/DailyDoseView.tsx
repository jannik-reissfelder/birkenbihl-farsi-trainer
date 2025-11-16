
import React, { useState, useMemo, useEffect } from 'react';
import { useProgress } from '../hooks/useProgress';
import ShadowingView from './ShadowingView';
import LessonView from './LessonView';
import { Lesson } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { StarIcon } from './icons/StarIcon';
import { CheckIcon } from './icons/CheckIcon';

type DosePhase = 'loading' | 'shadowing' | 'decoding' | 'karaoke' | 'completed' | 'finished';

interface DailyDoseViewProps {
    onCompleteNavigation: () => void;
}

const DailyDoseView: React.FC<DailyDoseViewProps> = ({ onCompleteNavigation }) => {
    const { getDailyDose, completeLearningSession } = useProgress();
    const [phase, setPhase] = useState<DosePhase>('loading');

    // useMemo is important here to prevent re-calculating on every render
    const doseData = useMemo(() => getDailyDose(), [getDailyDose]);

    useEffect(() => {
        if (doseData.isFinished) {
            setPhase('finished');
        } else if (doseData.sentencesForShadowing.length > 0) {
            setPhase('shadowing');
        } else if (doseData.sentencesForLearning.length > 0) {
            setPhase('decoding');
        } else {
             setPhase('finished'); // Handle case where there's nothing to learn
        }
    }, [doseData]);

    const handleShadowingComplete = () => {
        if (doseData.sentencesForLearning.length > 0) {
            setPhase('decoding');
        } else {
            // If there's nothing new to learn, just complete the session.
            setPhase('finished');
        }
    };

    const handleDecodingComplete = () => {
        setPhase('karaoke');
    };
    
    const handleKaraokeComplete = () => {
        completeLearningSession(doseData.sentencesForLearning);
        setPhase('completed');
    };

    const renderContent = () => {
        switch (phase) {
            case 'loading':
                return <div className="p-8 text-center"><SpinnerIcon /></div>;
            
            case 'shadowing':
                return <ShadowingView sentences={doseData.sentencesForShadowing} onComplete={handleShadowingComplete} />;

            case 'decoding':
                const learningLesson: Lesson = {
                    id: 'daily-dose-learn',
                    title: 'Neue Sätze lernen',
                    description: 'Dekodiere die heutigen Sätze.',
                    sentences: doseData.sentencesForLearning
                };
                return (
                    <div className="p-6 md:p-8 animate-fade-in">
                        <h3 className="text-2xl font-bold text-center mb-2 text-teal-300">Phase 2: De-kodieren</h3>
                        <p className="text-center text-gray-400 mb-6">Verstehe die neuen Sätze Wort-für-Wort und übersetze sie.</p>
                        <LessonView 
                            lesson={learningLesson} 
                            onLessonComplete={handleDecodingComplete} 
                            mode="decode-only"
                        />
                    </div>
                );
            
            case 'karaoke':
                 const karaokeLesson: Lesson = {
                    id: 'daily-dose-karaoke',
                    title: 'Karaoke',
                    description: 'Höre aktiv zu.',
                    sentences: doseData.sentencesForLearning
                 };
                 return (
                    <div className="animate-fade-in">
                        <LessonView 
                            lesson={karaokeLesson} 
                            onLessonComplete={handleKaraokeComplete} 
                            mode="karaoke-only"
                        />
                    </div>
                 );

            case 'completed':
                return (
                    <div className="text-center p-6 md:p-8 min-h-[350px] flex flex-col justify-center items-center">
                        <CheckIcon className="h-24 w-24 text-green-400 mb-4" />
                        <h2 className="text-3xl font-bold text-white mb-2">Lerneinheit abgeschlossen!</h2>
                        <p className="text-gray-400 mt-4">Sehr gut gemacht! Komm morgen wieder für die nächste Lektion.</p>
                        <button 
                            onClick={onCompleteNavigation}
                            className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                        >
                            Weiter zum Dashboard
                        </button>
                    </div>
                );
            case 'finished':
                 return (
                    <div className="text-center p-6 md:p-8 min-h-[350px] flex flex-col justify-center items-center">
                        <StarIcon className="h-24 w-24 text-yellow-400 mb-4" />
                        <h2 className="text-3xl font-bold text-white mb-2">Fantastisch!</h2>
                        <p className="text-gray-400 mt-4">Du hast alle Lektionen abgeschlossen. Großartige Arbeit!</p>
                         <button 
                            onClick={onCompleteNavigation}
                            className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                        >
                            Zurück zum Dashboard
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700 max-w-4xl mx-auto animate-fade-in">
            {renderContent()}
        </div>
    );
};

export default DailyDoseView;
