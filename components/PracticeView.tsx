import React, { useMemo } from 'react';
import { Lesson } from '../types';
import LessonView from './LessonView';
import { useProgress } from '../hooks/useProgress';

interface PracticeViewProps {
    lesson: Lesson;
    onComplete: () => void;
}

const PracticeView: React.FC<PracticeViewProps> = ({ lesson, onComplete }) => {
    const { getCurrentLessonInfo } = useProgress();

    const initialSentenceIndex = useMemo(() => {
        const info = getCurrentLessonInfo();
        // If the lesson being practiced is the user's current active lesson,
        // resume from their last position in that lesson.
        if (info && info.lessonId === lesson.id) {
            // progressInLesson is 1-based, convert to 0-based index
            const index = info.progressInLesson > 0 ? info.progressInLesson - 1 : 0;
            // Handle case where they finished the lesson but haven't started the next one yet
            if (index >= lesson.sentences.length) return 0;
            return index;
        }
        // For all other cases (practicing past or future lessons), start from the beginning.
        return 0;
    }, [lesson, getCurrentLessonInfo]);

    return (
        // The main container is now handled inside LessonView when mode="full"
        <LessonView 
            lesson={lesson} 
            onLessonComplete={onComplete}
            mode="full"
            initialSentenceIndex={initialSentenceIndex}
            isFreePractice={true}
        />
    );
};

export default PracticeView;
