import React, { useContext, useMemo } from 'react';
import { useVocabulary } from '../contexts/VocabularyContext';
import { useProgress } from '../hooks/useProgress';
import { GamificationContext } from '../contexts/GamificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { TrendingUp, TrendingDown, Target, Award, BookOpen, Brain, Calendar, Flame } from 'lucide-react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';

interface AnalyticsDashboardProps {
  onBack: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onBack }) => {
  const { cards, stats } = useVocabulary();
  const { xp, streak } = useContext(GamificationContext);
  const { progress, isProgressLoading } = useProgress();

  // Calculate additional stats
  const totalWords = cards.length;
  const newWords = cards.filter(c => c.state === 'new').length;
  const learningWords = cards.filter(c => c.state === 'learning').length;
  const graduatedWords = stats.graduated;

  // Find words that need practice (high error count, low correct percentage)
  const strugglingWords = useMemo(() => {
    return cards
      .filter(c => c.reviewCount > 2) // At least 3 reviews
      .map(c => ({
        ...c,
        errorRate: c.reviewCount > 0 ? (c.errorCount / c.reviewCount) * 100 : 0
      }))
      .filter(c => c.errorRate > 40) // More than 40% error rate
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10); // Top 10 struggling words
  }, [cards]);

  // Calculate learning velocity (words graduated this week)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const wordsThisWeek = cards.filter(c => 
    c.graduatedAt && new Date(c.graduatedAt) >= oneWeekAgo
  ).length;

  // XP stats
  const xpPerLevel = 100;
  const currentLevel = Math.floor(xp / xpPerLevel) + 1;
  const xpInCurrentLevel = xp % xpPerLevel;

  // Vocabulary distribution
  const vocabDistribution = [
    { label: 'Neu', count: newWords, color: 'bg-blue-500', percentage: totalWords > 0 ? (newWords / totalWords) * 100 : 0 },
    { label: 'In Übung', count: learningWords, color: 'bg-yellow-500', percentage: totalWords > 0 ? (learningWords / totalWords) * 100 : 0 },
    { label: 'Gemeistert', count: graduatedWords, color: 'bg-green-500', percentage: totalWords > 0 ? (graduatedWords / totalWords) * 100 : 0 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          onClick={onBack}
          variant="outline"
          className="bg-gray-800 border-gray-700 hover:bg-gray-700"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Analytics</h1>
          <p className="text-gray-400">Deine Lernfortschritte im Detail</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-200 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Level & XP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-50">Level {currentLevel}</div>
            <p className="text-xs text-blue-300">{xp} Gesamt-XP</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border-orange-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-200 flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Lernstreak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-50">{streak} Tage</div>
            <p className="text-xs text-orange-300">Aktuelle Serie</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-200 flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Vokabeln
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-50">{totalWords}</div>
            <p className="text-xs text-green-300">{graduatedWords} gemeistert</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-200 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Diese Woche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-50">+{wordsThisWeek}</div>
            <p className="text-xs text-purple-300">Neue gemeisterte Wörter</p>
          </CardContent>
        </Card>
      </div>

      {/* Vocabulary Distribution */}
      <Card className="mb-8 bg-gray-900/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-100 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Vokabelverteilung
          </CardTitle>
          <CardDescription className="text-gray-400">
            Übersicht deines Lernfortschritts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {vocabDistribution.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300 font-medium">{item.label}</span>
                <span className="text-gray-400">{item.count} ({item.percentage.toFixed(0)}%)</span>
              </div>
              <div className="relative w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`absolute left-0 top-0 h-full ${item.color} transition-all duration-500`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
          <Separator className="my-4 bg-gray-700" />
          <div className="text-sm text-gray-400">
            <p className="mb-2"><strong className="text-gray-300">Tipp:</strong> Übe regelmäßig mit SRS Practice, um Wörter schneller zu meistern!</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Struggling Words */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-400" />
              Übungsbedarf
            </CardTitle>
            <CardDescription className="text-gray-400">
              Wörter mit hoher Fehlerquote (Top 10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {strugglingWords.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>Keine problematischen Wörter gefunden! 🎉</p>
                <p className="text-sm mt-2">Entweder hast du noch nicht genug geübt, oder du meisterst alles perfekt.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {strugglingWords.map((word, index) => (
                  <div key={word.id} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-200">{word.farsiWord}</div>
                        <div className="text-sm text-gray-400">{word.word}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-red-400">{word.errorRate.toFixed(0)}%</div>
                        <div className="text-xs text-gray-500">Fehlerquote</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{word.reviewCount} Wiederholungen</span>
                      <span>•</span>
                      <span>{word.errorCount} Fehler</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Learning Tips */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-teal-400" />
              Lern-Tipps
            </CardTitle>
            <CardDescription className="text-gray-400">
              Optimiere deinen Lernprozess
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-teal-900/20 border border-teal-800/50">
              <h4 className="font-semibold text-teal-300 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Tägliche Praxis
              </h4>
              <p className="text-sm text-gray-300">
                Lerne täglich {streak > 0 ? 'weiter' : 'mindestens'} 5-10 Minuten, um deinen Streak zu halten und Vokabeln besser im Gedächtnis zu behalten.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-800/50">
              <h4 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Spaced Repetition
              </h4>
              <p className="text-sm text-gray-300">
                {stats.dueForReview > 0 
                  ? `Du hast ${stats.dueForReview} Karten zur Wiederholung. Übe sie jetzt!` 
                  : 'Keine Wiederholungen fällig. Komm morgen wieder!'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-800/50">
              <h4 className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Fokus auf Schwächen
              </h4>
              <p className="text-sm text-gray-300">
                {strugglingWords.length > 0 
                  ? `Konzentriere dich besonders auf die ${strugglingWords.length} Wörter oben mit hoher Fehlerquote.`
                  : 'Du meisterst alle Wörter gut! Lerne weiter neue Vokabeln.'}
              </p>
            </div>

            {graduatedWords >= 50 && (
              <div className="p-4 rounded-lg bg-yellow-900/20 border border-yellow-800/50">
                <h4 className="font-semibold text-yellow-300 mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Milestone erreicht!
                </h4>
                <p className="text-sm text-gray-300">
                  Glückwunsch! Du hast {graduatedWords} Wörter gemeistert. Das ist ein großer Erfolg! 🎉
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
