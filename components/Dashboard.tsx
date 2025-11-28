import React, { useContext } from 'react';
import { CalendarIcon } from './icons/CalendarIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { PlaylistIcon } from './icons/PlaylistIcon';
import { RepeatIcon } from './icons/RepeatIcon';
import { useProgress } from '../hooks/useProgress';
import { useVocabulary } from '../contexts/VocabularyContext';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { StarIcon } from './icons/StarIcon';
import { FireIcon } from './icons/FireIcon';
import { Library, TrendingUp, CheckCircle2 } from 'lucide-react';
import { GamificationContext } from '../contexts/GamificationContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Progress } from './ui/progress';
import { useAllLessonProgress } from '../hooks/useLessonStepProgress';

interface DashboardProps {
  onResumeProgress: () => void;
  onBrowseLevels: () => void;
  onStartPlaylist: () => void;
  onStartFreeShadowing: () => void;
  onShowMethodology: () => void;
  onStartSRSPractice: () => void;
  onShowActiveVocabulary: () => void;
  onShowAnalytics: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  onResumeProgress, 
  onBrowseLevels, 
  onStartPlaylist, 
  onStartFreeShadowing, 
  onShowMethodology, 
  onStartSRSPractice, 
  onShowActiveVocabulary,
  onShowAnalytics 
}) => {
    const { getCurrentLessonInfo, isProgressLoading, progress } = useProgress();
    const { stats } = useVocabulary();
    const { xp, streak } = useContext(GamificationContext);
    const { completedCount, isLoading: isLessonProgressLoading } = useAllLessonProgress();

    if (isProgressLoading || isLessonProgressLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <SpinnerIcon />
            </div>
        );
    }

    const lessonInfo = getCurrentLessonInfo();
    
    // Calculate XP level and progress to next level
    const xpPerLevel = 100;
    const currentLevel = Math.floor(xp / xpPerLevel) + 1;
    const xpInCurrentLevel = xp % xpPerLevel;
    const progressToNextLevel = (xpInCurrentLevel / xpPerLevel) * 100;
    
  return (
    <div className="animate-fade-in max-w-4xl mx-auto px-4">
      {/* Header with Welcome Message */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold mb-2 text-gray-100">Willkommen zurück!</h2>
        {lessonInfo && (
          <p className="text-lg text-gray-400">
            Du arbeitest gerade an: <span className="font-semibold text-teal-300">{lessonInfo.levelTitle} - {lessonInfo.lessonTitle}</span>
          </p>
        )}
      </div>

      {/* Progress Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* XP Card */}
        <Card className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border-yellow-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-yellow-200">Level {currentLevel}</CardTitle>
              <StarIcon className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-yellow-50">{xp} XP</div>
              <Progress value={progressToNextLevel} className="h-2 bg-yellow-950" />
              <p className="text-xs text-yellow-300">{xpInCurrentLevel}/{xpPerLevel} bis Level {currentLevel + 1}</p>
            </div>
          </CardContent>
        </Card>

        {/* Streak Card */}
        <Card className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border-orange-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-orange-200">Lernstreak</CardTitle>
              <FireIcon className="h-5 w-5 text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-orange-50">{streak} Tage</div>
              <p className="text-xs text-orange-300">Bleib dran! 🔥</p>
            </div>
          </CardContent>
        </Card>

        {/* Vocabulary Progress Card - Clickable */}
        <Card 
          className="bg-gradient-to-br from-teal-900/40 to-teal-800/20 border-teal-700/50 cursor-pointer hover:border-teal-600 transition-colors"
          onClick={onShowAnalytics}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-teal-200">Vokabular</CardTitle>
              <TrendingUp className="h-5 w-5 text-teal-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-teal-50">{stats.graduated}</div>
              <p className="text-xs text-teal-300">gemeisterte Wörter • Klicken für Details</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completed Lessons Summary */}
      {completedCount > 0 && (
        <Card className="mb-8 bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-200">Abgeschlossene Lektionen</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-50">{completedCount}</div>
              <p className="text-xs text-green-300">Lektionen vollständig abgeschlossen</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Lesson Progress */}
      {lessonInfo && lessonInfo.lessonLength > 0 && (
        <Card className="mb-8 bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100">Aktuelle Lektion</CardTitle>
            <CardDescription className="text-gray-400">
              {lessonInfo.lessonTitle} - {lessonInfo.progressInLesson} von {lessonInfo.lessonLength} Sätzen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress 
              value={(lessonInfo.progressInLesson / lessonInfo.lessonLength) * 100} 
              className="h-3 bg-gray-800"
            />
          </CardContent>
        </Card>
      )}

      {/* Action Cards */}
      <div className="space-y-4">
        {/* Primary Action: Next Lesson */}
        <Button
          onClick={onResumeProgress}
          className="w-full h-auto p-5 bg-blue-600 hover:bg-blue-500 border border-blue-400 shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-1"
          size="lg"
        >
          <div className="flex items-center gap-4 w-full">
            <CalendarIcon className="h-10 w-10 text-white flex-shrink-0" />
            <div className="text-left flex-1">
              <h3 className="text-xl font-bold text-white">Nächste Lektion starten</h3>
              <p className="text-blue-200 text-sm font-normal">Starte deine tägliche Lerneinheit.</p>
            </div>
          </div>
        </Button>

        {/* SRS Practice */}
        <Button
          onClick={onStartSRSPractice}
          variant="outline"
          className="w-full h-auto p-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 border-yellow-400 shadow-md hover:shadow-yellow-500/30 transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-4">
              <StarIcon className="h-8 w-8 text-white fill-white flex-shrink-0" />
              <div className="text-left">
                <h3 className="text-lg font-semibold text-white">SRS Practice</h3>
                <p className="text-yellow-100 text-sm font-normal">Review your vocabulary with spaced repetition</p>
              </div>
            </div>
            {stats.dueForReview > 0 && (
              <div className="inline-flex items-center rounded-full bg-white text-orange-600 font-bold text-lg px-3 py-1 min-w-[2.5rem] justify-center">
                {stats.dueForReview}
              </div>
            )}
          </div>
        </Button>

        {/* Active Vocabulary */}
        <Button
          onClick={onShowActiveVocabulary}
          variant="outline"
          className="w-full h-auto p-4 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 border-teal-400 shadow-md hover:shadow-teal-500/30 transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-4">
              <Library className="h-8 w-8 text-white flex-shrink-0" />
              <div className="text-left">
                <h3 className="text-lg font-semibold text-white">Active Vocabulary</h3>
                <p className="text-teal-100 text-sm font-normal">View your mastered words</p>
              </div>
            </div>
            {stats.graduated > 0 && (
              <div className="inline-flex items-center rounded-full bg-white text-teal-600 font-bold text-lg px-3 py-1 min-w-[2.5rem] justify-center">
                {stats.graduated}
              </div>
            )}
          </div>
        </Button>

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={onBrowseLevels}
            variant="outline"
            className="h-auto p-4 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:shadow-teal-500/20 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center gap-3 w-full">
              <BookOpenIcon className="h-8 w-8 text-teal-400 flex-shrink-0" />
              <div className="text-left flex-1">
                <h3 className="text-base font-semibold text-gray-200">Alle Lektionen</h3>
                <p className="text-gray-400 text-xs font-normal">Übe frei oder wiederhole.</p>
              </div>
            </div>
          </Button>

          <Button
            onClick={onShowMethodology}
            variant="outline"
            className="h-auto p-4 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:shadow-teal-500/20 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center gap-3 w-full">
              <LightbulbIcon className="h-8 w-8 text-teal-400 flex-shrink-0" />
              <div className="text-left flex-1">
                <h3 className="text-base font-semibold text-gray-200">Lernmethode</h3>
                <p className="text-gray-400 text-xs font-normal">Verstehe die Regeln.</p>
              </div>
            </div>
          </Button>

          <Button
            onClick={onStartFreeShadowing}
            variant="outline"
            className="h-auto p-4 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:shadow-teal-500/20 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center gap-3 w-full">
              <RepeatIcon className="h-8 w-8 text-teal-400 flex-shrink-0" />
              <div className="text-left flex-1">
                <h3 className="text-base font-semibold text-gray-200">Freies Shadowing</h3>
                <p className="text-gray-400 text-xs font-normal">Übe zufällige Sätze.</p>
              </div>
            </div>
          </Button>

          <Button
            onClick={onStartPlaylist}
            variant="outline"
            className="h-auto p-4 bg-gray-800 hover:bg-gray-700 border-gray-700 hover:shadow-teal-500/20 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center gap-3 w-full">
              <PlaylistIcon className="h-8 w-8 text-teal-400 flex-shrink-0" />
              <div className="text-left flex-1">
                <h3 className="text-base font-semibold text-gray-200">Playlist</h3>
                <p className="text-gray-400 text-xs font-normal">Höre passiv.</p>
              </div>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
