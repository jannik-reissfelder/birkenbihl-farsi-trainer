
import React from 'react';
import { LevelMetadata } from '../types';

interface LevelSelectorProps {
  levels: LevelMetadata[];
  onSelectLevel: (level: LevelMetadata) => void;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({ levels, onSelectLevel }) => {
  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-200">Alle Stufen</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {levels.map((level) => (
          <div
            key={level.id}
            onClick={() => level.lessons.length > 0 && onSelectLevel(level)}
            className={`
              p-6 rounded-lg shadow-lg transform transition-all duration-300 
              ${level.lessons.length > 0 
                ? 'bg-gray-800 hover:bg-gray-700 hover:shadow-blue-500/20 hover:-translate-y-2 cursor-pointer' 
                : 'bg-gray-800/50 cursor-not-allowed'}
              border border-gray-700
            `}
          >
            <h3 className={`text-2xl font-bold mb-2 ${level.lessons.length > 0 ? 'text-blue-400' : 'text-gray-500'}`}>{level.title}</h3>
            <p className="text-gray-400">{level.description}</p>
            {level.lessons.length === 0 && (
                <span className="inline-block mt-4 bg-yellow-500/20 text-yellow-300 text-xs font-semibold px-2 py-1 rounded-full">
                    Demnächst
                </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LevelSelector;
