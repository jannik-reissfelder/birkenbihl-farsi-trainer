import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
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
  const lastClickedIndexRef = useRef<number | null>(null);
  
  const nonPunctuationTokens = tokens.filter(t => !t.isPunctuation);

  const handleTokenClick = useCallback((token: Token, event: React.MouseEvent) => {
    if (token.isPunctuation) return;

    const marked = isWordMarked(token.german, token.farsi);
    const tokenIndex = nonPunctuationTokens.findIndex(t => t.id === token.id);

    if (selectionMode === 'single') {
      if (event.shiftKey && lastClickedIndexRef.current !== null) {
        setSelectionMode('multi');
        const start = Math.min(lastClickedIndexRef.current, tokenIndex);
        const end = Math.max(lastClickedIndexRef.current, tokenIndex);
        const rangeIds = nonPunctuationTokens
          .slice(start, end + 1)
          .map(t => t.id);
        setSelectedTokens(new Set(rangeIds));
      } else {
        if (marked) {
          onRemoveCard(token.german, token.farsi);
        } else {
          onAddCard(token.german, token.farsi, token.latin, sentence);
        }
        lastClickedIndexRef.current = tokenIndex;
      }
    } else {
      if (event.shiftKey && lastClickedIndexRef.current !== null) {
        const start = Math.min(lastClickedIndexRef.current, tokenIndex);
        const end = Math.max(lastClickedIndexRef.current, tokenIndex);
        const rangeIds = nonPunctuationTokens
          .slice(start, end + 1)
          .map(t => t.id);
        setSelectedTokens(prev => {
          const next = new Set(prev);
          rangeIds.forEach(id => next.add(id));
          return next;
        });
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
        lastClickedIndexRef.current = tokenIndex;
      }
    }
  }, [selectionMode, isWordMarked, onAddCard, onRemoveCard, sentence, nonPunctuationTokens]);

  const confirmMultiWordSelection = useCallback(() => {
    if (selectedTokens.size < 2) return;

    const selected = nonPunctuationTokens
      .filter(t => selectedTokens.has(t.id))
      .sort((a, b) => a.index - b.index);

    const combinedFarsi = selected.map(t => t.farsi).join(' ');
    const combinedLatin = selected.map(t => t.latin).join(' ');
    const combinedGerman = selected.map(t => t.german).join(' ');

    onAddCard(combinedGerman, combinedFarsi, combinedLatin, sentence);
    setSelectedTokens(new Set());
    setSelectionMode('single');
    lastClickedIndexRef.current = null;
  }, [selectedTokens, nonPunctuationTokens, onAddCard, sentence]);

  const cancelMultiWordSelection = useCallback(() => {
    setSelectedTokens(new Set());
    setSelectionMode('single');
    lastClickedIndexRef.current = null;
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        <ToggleGroup 
          type="single" 
          value={selectionMode}
          onValueChange={(value) => {
            if (value) setSelectionMode(value as 'single' | 'multi');
          }}
          className="bg-gray-800 rounded-lg p-1"
        >
          <ToggleGroupItem 
            value="single"
            className={cn(
              'px-3 py-1 text-sm rounded-md transition-colors',
              'data-[state=on]:bg-blue-600 data-[state=on]:text-white',
              'data-[state=off]:text-gray-300 data-[state=off]:hover:bg-gray-700'
            )}
          >
            Einzelwort
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="multi"
            className={cn(
              'px-3 py-1 text-sm rounded-md transition-colors',
              'data-[state=on]:bg-purple-600 data-[state=on]:text-white',
              'data-[state=off]:text-gray-300 data-[state=off]:hover:bg-gray-700'
            )}
          >
            Mehrere Wörter
          </ToggleGroupItem>
        </ToggleGroup>
        <span className="text-gray-500 text-xs hidden md:inline ml-2">
          (Shift+Klick für Bereich)
        </span>
      </div>

      {selectionMode === 'multi' && selectedTokens.size > 0 && (
        <div className="flex items-center justify-center gap-2 p-2 bg-purple-900/30 rounded-lg">
          <span className="text-purple-200 text-sm">
            {selectedTokens.size} Wörter ausgewählt
          </span>
          <Button
            onClick={confirmMultiWordSelection}
            disabled={selectedTokens.size < 2}
            size="sm"
            className="bg-purple-600 hover:bg-purple-500 text-white"
          >
            Als Gruppe markieren
          </Button>
          <Button
            onClick={cancelMultiWordSelection}
            variant="secondary"
            size="sm"
            className="bg-gray-600 hover:bg-gray-500 text-white"
          >
            Abbrechen
          </Button>
        </div>
      )}

      <div className="flex flex-row-reverse flex-wrap justify-center items-center gap-2" dir="rtl">
        {nonPunctuationTokens.map((token) => {
          const marked = isWordMarked(token.german, token.farsi);
          const isSelected = selectedTokens.has(token.id);

          return (
            <Button
              key={token.id}
              variant="ghost"
              onClick={(e) => handleTokenClick(token, e)}
              className={cn(
                'relative text-2xl md:text-3xl font-bold font-mono tracking-wide transition-all px-3 py-2 h-auto',
                isSelected && 'text-purple-200 bg-purple-500/40 ring-2 ring-purple-400',
                !isSelected && marked && 'text-yellow-300 bg-yellow-500/20 hover:bg-yellow-500/30',
                !isSelected && !marked && 'text-blue-300 hover:bg-blue-500/20'
              )}
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
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default WordMarkingToggle;
