import React, { useState, useCallback } from 'react';
import type { Token } from '@/hooks/useSentenceTokens';
import type { Sentence } from '@/types';

interface WordMarkingToggleProps {
  tokens: Token[];
  sentence: Sentence;
  onAddCard: (german: string, farsi: string, latin: string, sentence: Sentence) => void;
  onRemoveCard: (german: string, farsi: string) => void;
  isWordMarked: (german: string, farsi: string) => boolean;
}

export const WordMarkingToggle: React.FC<WordMarkingToggleProps> = ({
  tokens,
  sentence,
  onAddCard,
  onRemoveCard,
  isWordMarked,
}) => {
  const [selectionMode, setSelectionMode] = useState<'single' | 'multi'>('single');
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());

  const handleTokenClick = useCallback((token: Token) => {
    if (token.isPunctuation) return;

    const marked = isWordMarked(token.german, token.farsi);

    if (selectionMode === 'single') {
      if (marked) {
        onRemoveCard(token.german, token.farsi);
      } else {
        onAddCard(token.german, token.farsi, token.latin, sentence);
      }
    } else {
      setSelectedTokens(prev => {
        const next = new Set(prev);
        if (next.has(token.id)) {
          next.delete(token.id);
        } else {
          next.add(token.id);
        }
        return next;
      });
    }
  }, [selectionMode, isWordMarked, onAddCard, onRemoveCard, sentence]);

  const confirmMultiWordSelection = useCallback(() => {
    if (selectedTokens.size < 2) return;

    const selected = tokens
      .filter(t => selectedTokens.has(t.id))
      .sort((a, b) => a.index - b.index);

    const combinedFarsi = selected.map(t => t.farsi).join(' ');
    const combinedLatin = selected.map(t => t.latin).join(' ');
    const combinedGerman = selected.map(t => t.german).join(' ');

    onAddCard(combinedGerman, combinedFarsi, combinedLatin, sentence);
    setSelectedTokens(new Set());
    setSelectionMode('single');
  }, [selectedTokens, tokens, onAddCard, sentence]);

  const cancelMultiWordSelection = useCallback(() => {
    setSelectedTokens(new Set());
    setSelectionMode('single');
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setSelectionMode('single')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            selectionMode === 'single'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Einzelwort
        </button>
        <button
          onClick={() => setSelectionMode('multi')}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            selectionMode === 'multi'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Mehrere Wörter
        </button>
      </div>

      {selectionMode === 'multi' && selectedTokens.size > 0 && (
        <div className="flex items-center justify-center gap-2 p-2 bg-purple-900/30 rounded-lg">
          <span className="text-purple-200 text-sm">
            {selectedTokens.size} Wörter ausgewählt
          </span>
          <button
            onClick={confirmMultiWordSelection}
            disabled={selectedTokens.size < 2}
            className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-full disabled:opacity-50"
          >
            Als Gruppe markieren
          </button>
          <button
            onClick={cancelMultiWordSelection}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded-full"
          >
            Abbrechen
          </button>
        </div>
      )}

      <div className="flex flex-row-reverse flex-wrap justify-center items-center gap-2" dir="rtl">
        {tokens.filter(t => !t.isPunctuation).map((token) => {
          const marked = isWordMarked(token.german, token.farsi);
          const isSelected = selectedTokens.has(token.id);

          return (
            <button
              key={token.id}
              onClick={() => handleTokenClick(token)}
              className={`relative text-2xl md:text-3xl font-bold font-mono tracking-wide transition-all px-3 py-2 rounded ${
                isSelected
                  ? 'text-purple-200 bg-purple-500/40 ring-2 ring-purple-400'
                  : marked
                  ? 'text-yellow-300 bg-yellow-500/20'
                  : 'text-blue-300 hover:bg-blue-500/20'
              }`}
              title={
                selectionMode === 'multi'
                  ? isSelected
                    ? 'Klicken zum Abwählen'
                    : 'Klicken zum Auswählen'
                  : marked
                  ? 'Klicken zum Entfernen'
                  : 'Klicken zum Markieren'
              }
            >
              {token.farsi}
              {marked && !isSelected && (
                <span className="absolute -top-1 -right-1 text-yellow-400 text-sm">★</span>
              )}
              {isSelected && (
                <span className="absolute -top-1 -right-1 text-purple-300 text-sm">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WordMarkingToggle;
