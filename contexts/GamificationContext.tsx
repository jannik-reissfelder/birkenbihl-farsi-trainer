import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { gamificationQueries } from '../src/lib/supabaseQueries';

interface GamificationState {
  xp: number;
  streak: number;
  lastStudiedDate: string | null;
}

interface GamificationContextType {
  xp: number;
  streak: number;
  addXp: (amount: number) => void;
  isLoading: boolean;
}

const GamificationContext = createContext<GamificationContextType>({
  xp: 0,
  streak: 0,
  addXp: () => {},
  isLoading: true,
});

const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

const isYesterday = (date1: Date, date2: Date): boolean => {
    const yesterday = new Date(date2);
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(date1, yesterday);
}

const GamificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState<GamificationState>({ xp: 0, streak: 0, lastStudiedDate: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    gamificationQueries.get(user.id)
      .then(stats => {
        if (stats) {
          setState({
            xp: stats.xp_total,
            streak: stats.streak,
            lastStudiedDate: stats.last_login,
          });
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Could not load gamification state from Supabase", error);
        setIsLoading(false);
      });
  }, [user]);

  const addXp = useCallback((amount: number) => {
    if (!user) return;

    setState(prevState => {
      const now = new Date();
      const lastStudied = prevState.lastStudiedDate ? new Date(prevState.lastStudiedDate) : null;
      let newStreak = prevState.streak;

      if (!lastStudied || !isSameDay(now, lastStudied)) {
          if (lastStudied && isYesterday(lastStudied, now)) {
              newStreak += 1;
          } else {
              newStreak = 1;
          }
      }

      const newState = {
        xp: prevState.xp + amount,
        streak: newStreak,
        lastStudiedDate: now.toISOString(),
      };

      gamificationQueries.upsert(user.id, {
        xp_total: newState.xp,
        level: Math.floor(newState.xp / 100),
        streak: newState.streak,
        last_login: newState.lastStudiedDate,
        xp_per_level: {},
      }).catch(error => {
        console.error("Could not save gamification state to Supabase", error);
      });

      return newState;
    });
  }, [user]);

  return (
    <GamificationContext.Provider value={{ xp: state.xp, streak: state.streak, addXp, isLoading }}>
      {children}
    </GamificationContext.Provider>
  );
};

export { GamificationContext, GamificationProvider };