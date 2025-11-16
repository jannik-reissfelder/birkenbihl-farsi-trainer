
import React from 'react';
import { LessonMetadata, LevelMetadata } from '../types';
import { ChatIcon } from './icons/ChatIcon';
import { useProgress } from '../hooks/useProgress';
import { CheckIcon } from './icons/CheckIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface LevelViewProps {
  level: LevelMetadata;
  onSelectLesson: (lesson: LessonMetadata) => void;
  onStartChat: (lesson: LessonMetadata) => void;
}

const LevelView: React.FC<LevelViewProps> = ({ level, onSelectLesson, onStartChat }) => {
  const { isLessonCompleted, isProgressLoading } = useProgress();

  if (isProgressLoading) {
    return <div className="flex justify-center items-center h-64"><SpinnerIcon /></div>;
  }

  return (
    <div className="animate-fade-in">
      <p className="text-lg text-center text-gray-400 mb-8">{level.description}</p>
      <div className="space-y-4">
        {level.lessons.map((lesson, index) => {
          const completed = isLessonCompleted(lesson.id);
          return (
            <div
              key={lesson.id}
              onClick={() => onSelectLesson(lesson)}
              className="bg-gray-800 p-5 rounded-lg border border-gray-700 cursor-pointer transition-all duration-300 hover:bg-gray-700 hover:border-blue-500 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <div className="flex items-center gap-4 flex-grow">
                  <div className="flex-shrink-0 bg-blue-500/20 text-blue-300 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">
                  {index + 1}
                  </div>
                  <div className="flex-grow">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-gray-100">{lesson.title}</h3>
                        {completed && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                              <CheckIcon className="h-4 w-4" />
                              Abgeschlossen
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400">{lesson.description}</p>
                  </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onStartChat(lesson);
                }}
                className="mt-4 sm:mt-0 ml-auto sm:ml-4 flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-teal-600/50 text-teal-200 rounded-full hover:bg-teal-600/80 transition-colors"
              >
                <ChatIcon />
                Dialog-Übung
              </button>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default LevelView;
