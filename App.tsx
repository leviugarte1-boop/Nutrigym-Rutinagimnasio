import React, { useState, useCallback, useEffect } from 'react';
import { DailyLog, UserProfile, StoredFoodItem, Meal } from './types';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { supabase } from './services/supabaseClient';

const getLogDateString = (date: Date) => date.toISOString().split('T')[0];

const App: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // All existing state remains the same
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const savedProfile = localStorage.getItem('nutrigym_userProfile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.goal && parsed.age) return parsed;
      }
    } catch (error) {
      console.error("Error al cargar el perfil desde localStorage", error);
    }
    return {
      name: "Alex",
      calorieGoal: 0,
      proteinGoal: 0,
      carbGoal: 0,
      fatGoal: 0,
    };
  });

  const [logsByDate, setLogsByDate] = useState<{ [key: string]: DailyLog }>(() => {
    try {
      const savedLogs = localStorage.getItem('nutrigym_logsByDate');
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        Object.keys(parsedLogs).forEach(dateString => {
          parsedLogs[dateString].date = new Date(parsedLogs[dateString].date);
        });
        return parsedLogs;
      }
    } catch (error) {
      console.error("Error al cargar los registros desde localStorage", error);
    }
    return {};
  });

  // Supabase Auth Effect with persistent caching for faster load times
  useEffect(() => {
    if (!supabase) {
        setIsAuthLoading(false);
        return;
    }

    const CACHE_KEY = 'nutrigym_profile_active';

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session) {
            localStorage.removeItem(CACHE_KEY);
            setSession(null);
            setIsAuthLoading(false);
            return;
        }

        // Fast path: Check for the persistent "active" flag in localStorage.
        const isProfileActiveCached = localStorage.getItem(CACHE_KEY) === 'true';

        if (isProfileActiveCached) {
            // User has successfully logged in before and hasn't logged out.
            // Trust the cache and load the app immediately.
            setSession(session);
            setIsAuthLoading(false);
            return;
        }

        // Slow path: No valid cache, must verify with the database.
        // This runs on the very first login after clearing storage.
        try {
            const { data, error } = await supabase.from('profiles').select('activo').eq('id', session.user.id).single();
            
            if (error || !data || data.activo !== true) {
                // If verification fails, sign out and ensure cache is clear.
                await supabase.auth.signOut();
                localStorage.removeItem(CACHE_KEY);
            } else {
                // Verification successful. Set the session and cache the active status persistently.
                setSession(session);
                localStorage.setItem(CACHE_KEY, 'true');
                setIsAuthLoading(false);
            }
        } catch (e) {
            // On any other error, sign out. The `!session` block above will handle clearing the cache.
            await supabase.auth.signOut();
        }
    });

    return () => {
        authListener?.subscription.unsubscribe();
    };
  }, []);

  // All existing effects for localStorage remain the same
  useEffect(() => {
    try {
      localStorage.setItem('nutrigym_userProfile', JSON.stringify(userProfile));
    } catch (error) {
      console.error("Error al guardar el perfil en localStorage", error);
    }
  }, [userProfile]);

  useEffect(() => {
    try {
      localStorage.setItem('nutrigym_logsByDate', JSON.stringify(logsByDate));
    } catch (error) {
      console.error("Error al guardar los registros en localStorage", error);
    }
  }, [logsByDate]);
  
  const currentLog = logsByDate[getLogDateString(selectedDate)] || {
    date: selectedDate,
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
  };

  // All existing callbacks remain the same
  const addFoodToLog = useCallback((mealType: keyof DailyLog['meals'], foodItems: Omit<StoredFoodItem, 'id'>[]) => {
    const dateString = getLogDateString(selectedDate);
    setLogsByDate(prevLogs => {
      const dayLog = prevLogs[dateString] || {
        date: selectedDate,
        meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
      };
      
      const newItemsWithIds = foodItems.map(item => ({
          ...item,
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      }));

      const updatedLog = {
        ...dayLog,
        meals: {
          ...dayLog.meals,
          [mealType]: [...dayLog.meals[mealType], ...newItemsWithIds],
        },
      };

      return { ...prevLogs, [dateString]: updatedLog };
    });
  }, [selectedDate]);

  const updateFoodInLog = useCallback((mealType: keyof Meal, updatedFood: StoredFoodItem) => {
    const dateString = getLogDateString(selectedDate);
    setLogsByDate(prevLogs => {
        const dayLog = prevLogs[dateString];
        if (!dayLog) return prevLogs;

        const updatedMeals = {
            ...dayLog.meals,
            [mealType]: dayLog.meals[mealType].map(item => item.id === updatedFood.id ? updatedFood : item),
        };

        return { ...prevLogs, [dateString]: { ...dayLog, meals: updatedMeals } };
    });
  }, [selectedDate]);

  const deleteFoodFromLog = useCallback((mealType: keyof Meal, itemId: string) => {
      const dateString = getLogDateString(selectedDate);
      setLogsByDate(prevLogs => {
          const dayLog = prevLogs[dateString];
          if (!dayLog) return prevLogs;

          const updatedMeals = {
              ...dayLog.meals,
              [mealType]: dayLog.meals[mealType].filter(item => item.id !== itemId),
          };

          return { ...prevLogs, [dateString]: { ...dayLog, meals: updatedMeals } };
      });
  }, [selectedDate]);

  const handleProfileUpdate = useCallback((updatedProfile: Partial<UserProfile>) => {
    setUserProfile(prevProfile => ({
      ...prevProfile,
      ...updatedProfile,
    }));
  }, []);

  const handleSignOut = async () => {
    if (supabase) {
      localStorage.removeItem('nutrigym_profile_active');
      await supabase.auth.signOut();
    }
  };
  
  // New conditional rendering logic
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }
  
  // Original render when logged in
  return (
    <div className="min-h-screen bg-background text-text-primary font-sans">
      <div className="max-w-lg mx-auto bg-surface shadow-lg">
        <header className="bg-gradient-to-r from-primary to-secondary text-white p-4 shadow-md rounded-b-xl flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-center flex-grow">Nutrigym</h1>
          {supabase && (
            <button
                onClick={handleSignOut}
                className="text-xs bg-white/20 hover:bg-white/30 text-white font-bold py-1 px-3 rounded-full transition-colors"
            >
                Salir
            </button>
          )}
        </header>

        <main className="p-4">
          <Dashboard 
            userProfile={userProfile} 
            dailyLog={currentLog} 
            onProfileUpdate={handleProfileUpdate}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate} 
            addFoodToLog={addFoodToLog}
            updateFoodInLog={updateFoodInLog}
            deleteFoodFromLog={deleteFoodFromLog}
          />
        </main>
      </div>
    </div>
  );
};

export default App;