import React from 'react';
import { LevelMetadata, LessonMetadata } from '../types';
import { useProgress } from '../hooks/useProgress';
import { CheckIcon } from './icons/CheckIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface FreeShadowingSetupProps {
  levels: LevelMetadata[];
  onSelectLesson: (lessonId: string) => void;
}

const FreeShadowingSetup: React.FC<FreeShadowingSetupProps> = ({ levels, onSelectLesson }) => {
  const { isLessonCompleted, isProgressLoading } = useProgress();

  if (isProgressLoading) {
    return <div className="flex justify-center items-center h-64"><SpinnerIcon /></div>;
  }
  
  const hasAnyLessons = levels.some(level => level.lessons.length > 0);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-100">Lektion auswählen</h2>
        <p className="text-lg text-gray-400 mt-2">Wähle deine letzte abgeschlossene Lektion aus. Alle Sätze bis zu diesem Punkt werden für eine zufällige Übung verwendet.</p>
      </div>

      {!hasAnyLessons ? (
        <p className="text-center text-gray-500">Keine Lektionen verfügbar.</p>
      ) : (
        <div className="space-y-6">
          {levels.map(level => level.lessons.length > 0 && (
            <div key={level.id}>
              <h3 className="text-2xl font-semibold text-blue-400 border-b-2 border-blue-400/30 pb-2 mb-4">{level.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {level.lessons.map(lesson => {
                  const completed = isLessonCompleted(lesson.id);
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => onSelectLesson(lesson.id)}
                      className="text-left bg-gray-800 p-4 rounded-lg border border-gray-700 cursor-pointer transition-all duration-300 hover:bg-gray-700 hover:border-teal-500 flex items-center gap-4"
                    >
                      <div className="flex-grow">
                        <div className="flex items-center gap-3">
                            <h4 className="text-lg font-semibold text-gray-100">{lesson.title}</h4>
                            {completed && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                                    <CheckIcon className="h-3 w-3" />
                                    Fertig
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-400">{lesson.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FreeShadowingSetup;
