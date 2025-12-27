import React, { useState, useCallback, useEffect } from 'react';
import { Lesson, LevelMetadata, LessonMetadata } from './types';
import Dashboard from './components/Dashboard';
import LevelSelector from './components/LevelSelector';
import LevelView from './components/LevelView';
import PracticeView from './components/PracticeView';
import ChatView from './components/ChatView';
import PlaylistSetup from './components/PlaylistSetup';
import PlaylistView from './components/PlaylistView';
import FreeShadowingSetup from './components/FreeShadowingSetup';
import FreeShadowingSession from './components/FreeShadowingSession';
import Methodology from './components/Methodology';
import SRSPractice from './components/SRSPractice';
import { ActiveVocabulary } from './components/ActiveVocabulary';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { ChevronLeftIcon } from './components/icons/ChevronLeftIcon';
import { GamificationProvider } from './contexts/GamificationContext';
import { VocabularyProvider } from './contexts/VocabularyContext';
import GamificationHeader from './components/GamificationHeader';
import { useProgress } from './hooks/useProgress';
import { SpinnerIcon } from './components/icons/SpinnerIcon';
import { useAuth } from './src/contexts/AuthContext';
import AuthView from './src/components/AuthView';

// The View type now includes vocabulary management views
type View = 'dashboard' | 'browseLevels' | 'browseLessons' | 'lesson' | 'chat' | 'playlistSetup' | 'playlist' | 'freeShadowingSetup' | 'freeShadowingSession' | 'methodology' | 'vocabulary' | 'srsReview' | 'activeVocabulary' | 'analytics';

const AuthenticatedApp: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [levels, setLevels] = useState<LevelMetadata[] | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<LevelMetadata | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [freeShadowingLessonId, setFreeShadowingLessonId] = useState<string | null>(null);
  const [playlistLessonId, setPlaylistLessonId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const { isProgressLoading, getCurrentLessonInfo } = useProgress();

  useEffect(() => {
    fetch('/data/table-of-contents.json')
      .then(res => res.json())
      .then(data => setLevels(data))
      .catch(err => console.error("Failed to load table of contents:", err));
  }, []);

  const handleBrowseLevels = useCallback(() => setView('browseLevels'), []);
  const handleStartPlaylist = useCallback(() => setView('playlistSetup'), []);
  const handleStartFreeShadowing = useCallback(() => setView('freeShadowingSetup'), []);
  const handleShowMethodology = useCallback(() => setView('methodology'), []);
  const handleStartSRSPractice = useCallback(() => setView('srsReview'), []);
  const handleShowActiveVocabulary = useCallback(() => setView('activeVocabulary'), []);
  const handleShowAnalytics = useCallback(() => setView('analytics'), []);

  const handleSelectLevel = useCallback((level: LevelMetadata) => {
    setSelectedLevel(level);
    setView('browseLessons');
  }, []);

  const handleSelectLesson = useCallback(async (lesson: LessonMetadata) => {
    setIsNavigating(true);
    try {
        const level = lesson.id.startsWith('a1') ? 'level_a1' : 'level_a2';
        const response = await fetch(`/data/lessons/level_a/${level}/${lesson.id}.json`);
        if (!response.ok) throw new Error(`Lesson ${lesson.id} not found`);
        const lessonData = await response.json();
        setSelectedLesson(lessonData);
        setView('lesson');
    } catch(err) {
        console.error("Failed to load lesson:", err);
    }
    setIsNavigating(false);
  }, []);
  
  // This function now acts as a direct shortcut to the user's current lesson.
  const handleResumeProgress = useCallback(async () => {
    if (isProgressLoading || !levels) return;

    const lessonInfo = getCurrentLessonInfo();
    if (!lessonInfo || !lessonInfo.lessonId) {
        // Default to browsing levels if no progress is found
        handleBrowseLevels();
        return;
    }
    
    // Find the full lesson metadata from the loaded levels data
    let lessonToResume: LessonMetadata | undefined;
    for (const level of levels) {
        lessonToResume = level.lessons.find(l => l.id === lessonInfo.lessonId);
        if (lessonToResume) break;
    }

    if (lessonToResume) {
        // Use the existing function to load and navigate to the lesson
        await handleSelectLesson(lessonToResume);
    } else {
        // Fallback if the lesson from progress isn't in the table of contents
        console.warn(`Lesson with id ${lessonInfo.lessonId} not found.`);
        handleBrowseLevels();
    }
  }, [isProgressLoading, levels, getCurrentLessonInfo, handleBrowseLevels, handleSelectLesson]);

  const handleStartChat = useCallback(async (lessonMeta: LessonMetadata) => {
      // ChatView needs the full lesson, so we fetch it.
      setIsNavigating(true);
      try {
        const level = lessonMeta.id.startsWith('a1') ? 'level_a1' : 'level_a2';
        const response = await fetch(`/data/lessons/level_a/${level}/${lessonMeta.id}.json`);
        const lessonData = await response.json();
        setSelectedLesson(lessonData);
        setView('chat');
      } catch(err) {
        console.error("Failed to load lesson for chat:", err);
      }
      setIsNavigating(false);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setSelectedLevel(null);
    setSelectedLesson(null);
    setView('dashboard');
  }, []);

  const handleBackToLevelSelect = useCallback(() => {
    setSelectedLevel(null);
    setView('browseLevels');
  }, []);
  
  const handleBackToLessonSelect = useCallback(() => {
      setSelectedLesson(null);
      setView('browseLessons');
  }, []);
  
  const handleSelectPlaylistLesson = (lessonId: string) => {
    setPlaylistLessonId(lessonId);
    setView('playlist');
  };

  const handleSelectFreeShadowingLesson = (lessonId: string) => {
    setFreeShadowingLessonId(lessonId);
    setView('freeShadowingSession');
  };
  
  const renderHeader = () => {
    // Determine the correct back function based on the current view
    let backAction: (() => void) | null = null;
    let title = "Birkenbihl Farsi Trainer";

    if (view === 'browseLevels') {
      backAction = handleBackToDashboard;
      title = "Alle Stufen";
    } else if (view === 'browseLessons' && selectedLevel) {
      backAction = handleBackToLevelSelect;
      title = selectedLevel.title;
    } else if (view === 'lesson' || view === 'chat') {
      backAction = handleBackToLessonSelect;
      title = selectedLesson?.title || "Lektion";
    } else if (view === 'playlistSetup' || view === 'freeShadowingSetup' || view === 'methodology' || view === 'srsReview' || view === 'activeVocabulary' || view === 'analytics') {
      backAction = handleBackToDashboard;
      title = view === 'playlistSetup' ? "Playlist erstellen" : view === 'freeShadowingSetup' ? "Freies Shadowing" : view === 'srsReview' ? "SRS Practice" : view === 'activeVocabulary' ? "Active Vocabulary" : view === 'analytics' ? "Analytics" : "Lernmethode";
    } else if (view === 'playlist') {
        backAction = () => setView('playlistSetup');
        title = "Hintergrund-Playlist";
    } else if (view === 'freeShadowingSession') {
        backAction = () => setView('freeShadowingSetup');
        title = "Freies Shadowing";
    }

    return (
      <header className="flex items-center justify-between p-4 mb-8">
        <div className="w-1/3">
          {backAction && (
            <button
              onClick={backAction}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeftIcon /> Zurück
            </button>
          )}
        </div>
        <div className="w-1/3 text-center">
            <h1 className="text-xl font-bold text-gray-200 whitespace-nowrap">{title}</h1>
        </div>
        <div className="w-1/3 flex justify-end">
          <GamificationHeader />
        </div>
      </header>
    );
  };

  const renderContent = () => {
    if (isProgressLoading || (!levels && view !== 'dashboard')) {
        return <div className="text-center p-8"><SpinnerIcon /></div>;
    }
    if (isNavigating) {
        return <div className="text-center p-8"><SpinnerIcon /></div>;
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard 
                    onResumeProgress={handleResumeProgress} 
                    onBrowseLevels={handleBrowseLevels} 
                    onStartPlaylist={handleStartPlaylist}
                    onStartFreeShadowing={handleStartFreeShadowing}
                    onShowMethodology={handleShowMethodology}
                    onStartSRSPractice={handleStartSRSPractice}
                    onShowActiveVocabulary={handleShowActiveVocabulary}
                    onShowAnalytics={handleShowAnalytics}
                />;
      case 'browseLevels':
        return levels ? <LevelSelector levels={levels} onSelectLevel={handleSelectLevel} /> : null;
      case 'browseLessons':
        return selectedLevel ? <LevelView level={selectedLevel} onSelectLesson={handleSelectLesson} onStartChat={handleStartChat} /> : null;
      case 'lesson':
        return selectedLesson ? <PracticeView lesson={selectedLesson} onComplete={handleBackToLessonSelect} /> : null;
      case 'chat':
        return selectedLesson ? <ChatView lesson={selectedLesson} /> : null;
      case 'srsReview':
        return <SRSPractice onComplete={handleBackToDashboard} />;
      case 'activeVocabulary':
        return <ActiveVocabulary onBack={handleBackToDashboard} />;
      case 'analytics':
        return <AnalyticsDashboard onBack={handleBackToDashboard} />;
      case 'playlistSetup':
        return levels ? <PlaylistSetup levels={levels} onSelectLesson={handleSelectPlaylistLesson} /> : null;
      case 'playlist':
        return playlistLessonId ? <PlaylistView lessonId={playlistLessonId} /> : null;
      case 'freeShadowingSetup':
        return levels ? <FreeShadowingSetup levels={levels} onSelectLesson={handleSelectFreeShadowingLesson} /> : null;
      case 'freeShadowingSession':
        return freeShadowingLessonId ? <FreeShadowingSession lessonId={freeShadowingLessonId} onComplete={() => setView('freeShadowingSetup')} /> : null;
      case 'methodology':
        return <Methodology />;
      default:
        return <Dashboard 
                    onResumeProgress={handleResumeProgress} 
                    onBrowseLevels={handleBrowseLevels} 
                    onStartPlaylist={handleStartPlaylist}
                    onStartFreeShadowing={handleStartFreeShadowing}
                    onShowMethodology={handleShowMethodology}
                    onStartSRSPractice={handleStartSRSPractice}
                    onShowActiveVocabulary={handleShowActiveVocabulary}
                    onShowAnalytics={handleShowAnalytics}
                />;
    }
  };

  return (
    <GamificationProvider>
      <VocabularyProvider>
        <div className="min-h-screen p-4 sm:p-6 md:p-8">
          {renderHeader()}
          <main>
            {renderContent()}
          </main>
        </div>
      </VocabularyProvider>
    </GamificationProvider>
  );
};

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <SpinnerIcon />
          <p className="text-white mt-4">Lädt...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return <AuthenticatedApp />;
};

export default App;
