import React, { useState, useCallback, useEffect } from 'react';
import { DailyLog, UserProfile, StoredFoodItem, Meal } from './types';
import Dashboard from './components/Dashboard';

const getLogDateString = (date: Date) => date.toISOString().split('T')[0];

const App: React.FC = () => {
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
  
  return (
    <div className="min-h-screen bg-background text-text-primary font-sans">
      <div className="max-w-lg mx-auto bg-surface shadow-lg">
        <header className="bg-gradient-to-r from-primary to-secondary text-white p-4 shadow-md rounded-b-xl">
          <h1 className="text-3xl font-bold tracking-tight text-center">Nutrigym</h1>
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