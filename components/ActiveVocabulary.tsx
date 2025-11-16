import React, { useState, useMemo } from 'react';
import { useVocabulary } from '../contexts/VocabularyContext';
import { ArrowLeft, Search, TrendingUp, Award, Calendar } from 'lucide-react';

interface ActiveVocabularyProps {
  onBack: () => void;
}

export const ActiveVocabulary: React.FC<ActiveVocabularyProps> = ({ onBack }) => {
  const { cards } = useVocabulary();
  const [searchQuery, setSearchQuery] = useState('');

  const graduatedCards = useMemo(() => {
    return cards.filter(card => card.state === 'graduated');
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return graduatedCards;
    
    const query = searchQuery.toLowerCase();
    return graduatedCards.filter(card => 
      card.word.toLowerCase().includes(query) ||
      card.farsiWord.includes(query) ||
      (card.latinWord && card.latinWord.toLowerCase().includes(query)) ||
      card.contextSentence.farsi.includes(query) ||
      card.contextSentence.germanDecode.toLowerCase().includes(query)
    );
  }, [graduatedCards, searchQuery]);

  const stats = useMemo(() => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    return {
      total: graduatedCards.length,
      recentDay: graduatedCards.filter(c => c.graduatedAt && c.graduatedAt.getTime() > oneDayAgo).length,
      recentWeek: graduatedCards.filter(c => c.graduatedAt && c.graduatedAt.getTime() > oneWeekAgo).length,
    };
  }, [graduatedCards]);

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold">Active Vocabulary</h1>
            <p className="text-gray-400 mt-2">
              Your mastered words - ready to use in conversations
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 p-6 rounded-xl shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Total Mastered</h3>
            </div>
            <p className="text-4xl font-bold">{stats.total}</p>
            <p className="text-teal-200 text-sm mt-1">Words in your active vocabulary</p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-xl shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6" />
              <h3 className="text-lg font-semibold">This Week</h3>
            </div>
            <p className="text-4xl font-bold">{stats.recentWeek}</p>
            <p className="text-blue-200 text-sm mt-1">New words graduated</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-6 rounded-xl shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Today</h3>
            </div>
            <p className="text-4xl font-bold">{stats.recentDay}</p>
            <p className="text-purple-200 text-sm mt-1">Words reviewed today</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search your vocabulary (German, Farsi, Latin)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-white placeholder-gray-500"
            />
          </div>
        </div>

        {/* Vocabulary List */}
        {filteredCards.length === 0 ? (
          <div className="text-center py-16">
            <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-400 mb-2">
              {searchQuery ? 'No matching words found' : 'No graduated words yet'}
            </h3>
            <p className="text-gray-500">
              {searchQuery 
                ? 'Try a different search term' 
                : 'Complete your SRS reviews to build your active vocabulary'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-teal-500/50 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Farsi Word */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Farsi</div>
                    <div className="text-2xl font-bold text-teal-400" dir="rtl">
                      {card.farsiWord}
                    </div>
                  </div>

                  {/* Latin Transliteration */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Latin</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {card.latinWord || '-'}
                    </div>
                  </div>

                  {/* German Translation */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">German</div>
                    <div className="text-2xl font-bold text-purple-400">
                      {card.word}
                    </div>
                  </div>
                </div>

                {/* Context Sentence */}
                <div className="border-t border-gray-700 pt-4 space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Context (Farsi)</div>
                    <div className="text-gray-300" dir="rtl">
                      {card.contextSentence.farsi}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-1">Translation</div>
                    <div className="text-gray-300">
                      {card.contextSentence.germanDecode}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-6 text-sm text-gray-500 mt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Graduated: {formatDate(card.graduatedAt)}</span>
                    </div>
                    <div>
                      <span>Interval: {card.interval} days</span>
                    </div>
                    <div>
                      <span>Ease: {(card.easeFactor * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Count */}
        {searchQuery && filteredCards.length > 0 && (
          <div className="mt-6 text-center text-gray-500">
            Showing {filteredCards.length} of {graduatedCards.length} words
          </div>
        )}
      </div>
    </div>
  );
};
