import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import type { UserProfile, DailyLog, FoodItem, Meal, StoredFoodItem } from '../types';
import { analyzeFoodImage, generateMealPlan } from '../services/geminiService';
import { Card } from './common/Card';
import { Icon } from './common/Icon';
import { Button } from './common/Button';
import { Spinner } from './common/Spinner';

// --- PROPS ---
interface DashboardProps {
  userProfile: UserProfile;
  dailyLog: DailyLog;
  onProfileUpdate: (profileData: Partial<UserProfile>) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  addFoodToLog: (mealType: keyof DailyLog['meals'], foodItems: Omit<StoredFoodItem, 'id'>[]) => void;
  updateFoodInLog: (mealType: keyof Meal, updatedFood: StoredFoodItem) => void;
  deleteFoodFromLog: (mealType: keyof Meal, itemId: string) => void;
}

// --- GOAL MAPPING ---
const goalTextMap = { 
    lose_weight: 'Perder Peso', 
    maintain: 'Mantener Peso', 
    gain_muscle: 'Ganar Músculo',
    recomposition: 'Recomposición Corporal',
    performance: 'Mejorar Rendimiento',
};

// --- SUB-COMPONENTS ---

const ProfileSetup: React.FC<{ onProfileUpdate: (profileData: Partial<UserProfile>) => void }> = ({ onProfileUpdate }) => {
    const [formData, setFormData] = useState({
        age: '', gender: 'male', weight: '', height: '',
        activityLevel: 'moderate', goal: 'maintain',
    });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { age, gender, weight, height, activityLevel, goal } = formData;
        const ageN = parseInt(age), weightN = parseInt(weight), heightN = parseInt(height);

        if (!ageN || !weightN || !heightN) {
            alert("Por favor, completa todos los campos.");
            return;
        }

        let bmr = (gender === 'male')
            ? 88.362 + (13.397 * weightN) + (4.799 * heightN) - (5.677 * ageN)
            : 447.593 + (9.247 * weightN) + (3.098 * heightN) - (4.330 * ageN);
        
        const activityFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
        const tdee = bmr * activityFactors[activityLevel as keyof typeof activityFactors];

        let calorieGoal = Math.round(tdee);
        if(goal === 'lose_weight') calorieGoal -= 500;
        if(goal === 'gain_muscle') calorieGoal += 300;
        if(goal === 'recomposition') calorieGoal += 100;

        const proteinGoal = Math.round((calorieGoal * 0.35) / 4);
        const carbGoal = Math.round((calorieGoal * 0.40) / 4);
        const fatGoal = Math.round((calorieGoal * 0.25) / 9);

        onProfileUpdate({
            age: ageN, gender: gender as UserProfile['gender'], weight: weightN, height: heightN,
            activityLevel: activityLevel as UserProfile['activityLevel'],
            goal: goal as UserProfile['goal'],
            calorieGoal, proteinGoal, carbGoal, fatGoal,
        });
    };
    
    const inputStyle = "w-full p-2 border-2 border-gray-300 rounded-lg font-sans focus:border-primary focus:ring-primary";
    const labelStyle = "block mb-1 text-sm font-medium text-text-secondary";

    const fieldConfig = {
        age: { label: 'Edad (años)', placeholder: '25' },
        weight: { label: 'Peso (kg)', placeholder: '70' },
        height: { label: 'Altura (cm)', placeholder: '175' },
    };

    return (
        <Card>
            <h2 className="text-xl font-bold text-center mb-4 text-primary">¡Bienvenido a Nutrigym!</h2>
            <p className="text-center text-text-secondary mb-6">Completa tu perfil para obtener metas personalizadas.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label htmlFor="goal" className={labelStyle}>¿Cuál es tu objetivo principal?</label>
                    <select name="goal" id="goal" value={formData.goal} onChange={handleChange} className={inputStyle} required>
                        <option value="lose_weight">Perder Peso</option>
                        <option value="maintain">Mantener</option>
                        <option value="gain_muscle">Ganar Músculo</option>
                        <option value="recomposition">Recomposición Corporal</option>
                        <option value="performance">Mejorar Rendimiento</option>
                    </select>
                </div>
                {Object.entries(fieldConfig).map(([field, config]) => (
                    <div key={field}>
                       <label htmlFor={field} className={labelStyle}>{config.label}</label>
                       <input type="number" name={field} id={field} value={formData[field as 'age' | 'weight' | 'height']} onChange={handleChange} className={inputStyle} placeholder={`Ej: ${config.placeholder}`} required />
                   </div>
                ))}
                <div>
                     <label htmlFor="gender" className={labelStyle}>Género</label>
                     <select name="gender" id="gender" value={formData.gender} onChange={handleChange} className={inputStyle} required>
                        <option value="male">Masculino</option><option value="female">Femenino</option>
                     </select>
                </div>
                <div>
                     <label htmlFor="activityLevel" className={labelStyle}>Nivel de Actividad</label>
                     <select name="activityLevel" id="activityLevel" value={formData.activityLevel} onChange={handleChange} className={inputStyle} required>
                        <option value="sedentary">Sedentario (poco o nada de ejercicio)</option>
                        <option value="light">Ligero (ejercicio 1-3 días/semana)</option>
                        <option value="moderate">Moderado (ejercicio 3-5 días/semana)</option>
                        <option value="active">Activo (ejercicio 6-7 días/semana)</option>
                        <option value="very_active">Muy Activo (trabajo físico o ejercicio intenso)</option>
                     </select>
                </div>
                <Button type="submit" className="w-full">Calcular mis Metas</Button>
            </form>
        </Card>
    );
};

const Calendar: React.FC<{ selectedDate: Date; onDateChange: (date: Date) => void; }> = ({ selectedDate, onDateChange }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());

  useEffect(() => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    setCurrentWeekStart(startOfWeek);
  }, [selectedDate]);

  const changeWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
  };
  
  const days = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(currentWeekStart);
    day.setDate(currentWeekStart.getDate() + i);
    return day;
  });

  const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => changeWeek('prev')} className="p-2 rounded-full hover:bg-gray-100"><Icon name="leftArrow" /></button>
        <h3 className="font-bold text-primary">{selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={() => changeWeek('next')} className="p-2 rounded-full hover:bg-gray-100"><Icon name="rightArrow" /></button>
      </div>
      <div className="flex justify-around">
        {days.map(day => (
          <div key={day.toISOString()} className="text-center">
            <span className="text-xs text-text-secondary">{dayNames[day.getDay()]}</span>
            <button
              onClick={() => onDateChange(day)}
              className={`w-10 h-10 mt-1 flex items-center justify-center rounded-full font-bold transition-colors ${
                isSameDay(day, selectedDate) ? 'bg-primary text-white' : 'hover:bg-primary/10'
              } ${isSameDay(day, new Date()) ? 'border-2 border-accent' : ''}`}
            >
              {day.getDate()}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
};

const GoalsCard: React.FC<{ profile: UserProfile, onUpdate: (data: Partial<UserProfile>) => void }> = ({ profile, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [goals, setGoals] = useState({ ...profile });
    
    const macroLabels = {
        calorieGoal: 'Kcal',
        proteinGoal: 'Prot',
        carbGoal: 'Carb',
        fatGoal: 'Gras'
    };

    useEffect(() => setGoals({ ...profile }), [profile]);

    const calculateNewGoals = (currentProfile: UserProfile) => {
        const { age, gender, weight, height, activityLevel, goal } = currentProfile;
        if (!age || !weight || !height || !gender || !activityLevel || !goal) return {};
        
        let bmr = (gender === 'male')
            ? 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
            : 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
        
        const activityFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
        const tdee = bmr * activityFactors[activityLevel];

        let calorieGoal = Math.round(tdee);
        if(goal === 'lose_weight') calorieGoal -= 500;
        if(goal === 'gain_muscle') calorieGoal += 300;
        if(goal === 'recomposition') calorieGoal += 100;

        const proteinGoal = Math.round((calorieGoal * 0.35) / 4);
        const carbGoal = Math.round((calorieGoal * 0.40) / 4);
        const fatGoal = Math.round((calorieGoal * 0.25) / 9);

        return { calorieGoal, proteinGoal, carbGoal, fatGoal };
    };

    useEffect(() => {
        if (isEditing) {
            const newMacros = calculateNewGoals(goals);
            setGoals(g => ({ ...g, ...newMacros }));
        }
    }, [goals.goal, isEditing]);
    
    const handleSave = () => { onUpdate(goals); setIsEditing(false); };

    const inputStyle = "w-full p-1 border-2 bg-gray-50 border-gray-200 rounded-md font-sans text-sm focus:border-primary focus:ring-primary";

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Mis Metas</h3>
              <button onClick={() => setIsEditing(!isEditing)} className="text-sm font-medium text-primary hover:underline">
                  {isEditing ? 'Cancelar' : 'Ajustar'}
              </button>
            </div>

            {isEditing ? (
                 <select name="goal" value={goals.goal} onChange={e => setGoals(g => ({ ...g, goal: e.target.value as UserProfile['goal'] }))} className={`${inputStyle} w-full mb-4`}>
                     {Object.entries(goalTextMap).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                 </select>
            ) : (
                <div className="text-center mb-4 p-2 bg-primary/10 rounded-lg">
                    <span className="font-bold text-primary">{goalTextMap[profile.goal || 'maintain']}</span>
                </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['calorieGoal', 'proteinGoal', 'carbGoal', 'fatGoal'] as const).map(key => (
                     <div key={key}>
                        <label className="text-xs text-text-secondary">{macroLabels[key]}</label>
                        {isEditing ? 
                            <input type="number" value={goals[key]} onChange={e => setGoals(g => ({...g, [key]: parseInt(e.target.value) || 0}))} className={inputStyle}/> : 
                            <p className="font-bold text-lg">{goals[key]}{key !== 'calorieGoal' && 'g'}</p>
                        }
                    </div>
                ))}
            </div>
            {isEditing && <Button onClick={handleSave} className="w-full mt-4">Guardar Cambios</Button>}
        </Card>
    );
};

interface EditableFoodItem extends FoodItem {
    original?: FoodItem;
}

const MealLoggerSection: React.FC<{ addFoodToLog: DashboardProps['addFoodToLog'] }> = ({ addFoodToLog }) => {
    const [mode, setMode] = useState<'camera' | 'manual'>('camera');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<EditableFoodItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedMeal, setSelectedMeal] = useState<keyof Meal>('lunch');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [manualFood, setManualFood] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', grams: '' });

    const resetState = () => {
        setImagePreview(null); setImageFile(null); setAnalysisResult([]); setManualFood({ name: '', calories: '', protein: '', carbs: '', fat: '', grams: ''});
    };

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
            setAnalysisResult([]); setError(null);
        }
    };

    const handleAnalyzeClick = async () => {
        if (!imageFile) return;
        setIsLoading(true); setError(null);
        try {
            const result = await analyzeFoodImage(imageFile);
            setAnalysisResult(result.map((item, i) => ({ ...item, id: `${Date.now()}-${i}`, original: { ...item, id: '' } })));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ocurrió un error desconocido.");
        } finally {
            setIsLoading(false);
        }
    };
  
    const handleAddItems = () => {
        if (analysisResult.length > 0) {
            addFoodToLog(selectedMeal, analysisResult.map(({ id, original, ...rest }) => rest));
            resetState();
        }
    };
    
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const {name, calories, protein, carbs, fat, grams} = manualFood;
        if(name && calories) {
            addFoodToLog(selectedMeal, [{
                name,
                calories: parseFloat(calories) || 0,
                protein: parseFloat(protein) || 0,
                carbs: parseFloat(carbs) || 0,
                fat: parseFloat(fat) || 0,
                grams: parseFloat(grams) || undefined,
            }]);
            resetState();
        } else {
            alert("Por favor, introduce al menos el nombre y las calorías.");
        }
    }
    
    const handleManualChange = (e: ChangeEvent<HTMLInputElement>) => setManualFood(p => ({...p, [e.target.name]: e.target.value}));

    const handleGramsChange = (itemId: string, newGrams: number) => {
        setAnalysisResult(prev => prev.map(item => {
            if (item.id === itemId && item.original?.grams && item.original.grams > 0) {
                const original = item.original;
                const ratio = newGrams / original.grams;
                return {
                    ...item,
                    grams: newGrams,
                    calories: Math.round(original.calories * ratio),
                    protein: Math.round((original.protein * ratio) * 10) / 10,
                    carbs: Math.round(original.carbs * ratio),
                    fat: Math.round((original.fat * ratio) * 10) / 10,
                };
            }
            return item;
        }));
    };

    const handleAddManualItemToAnalysis = () => {
        const newItem: EditableFoodItem = {
            id: `${Date.now()}-manual-${Math.random()}`,
            name: '', calories: 0, protein: 0, carbs: 0, fat: 0, grams: 0,
        };
        setAnalysisResult(prev => [...prev, newItem]);
    };

    const inputStyle = "w-full text-sm p-1 border-2 bg-white border-gray-200 rounded-md font-sans focus:border-primary focus:ring-primary";
    
    const macroLabelsAnalysis = {
        grams: 'Gramos',
        calories: 'Kcal',
        protein: 'Prot',
        carbs: 'Carb',
        fat: 'Gras'
    };

    return (
      <>
        <div className="flex justify-center border-b-2 border-gray-200 mb-4">
            {(['camera', 'manual'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 text-sm font-medium transition-colors ${mode === m ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-primary'}`}>
                    {m === 'camera' ? 'Con Foto' : 'Manualmente'}
                </button>
            ))}
        </div>

        {mode === 'camera' && (
            <div className="space-y-4">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                {imagePreview ? (
                    <div>
                        <img src={imagePreview} alt="Vista previa" className="rounded-lg w-full max-h-60 object-cover mb-2" />
                        <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full">Cambiar Imagen</Button>
                    </div>
                ) : (
                    <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-text-secondary hover:bg-gray-50 hover:border-primary transition-colors">
                        <Icon name="camera" className="w-12 h-12 mb-2" />
                        <span className="font-semibold">Toca para subir una foto</span>
                    </button>
                )}
                {imageFile && <Button onClick={handleAnalyzeClick} disabled={isLoading} className="w-full">{isLoading ? <Spinner /> : "Analizar Comida"}</Button>}
            </div>
        )}

        {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
                 <input type="text" name="name" value={manualFood.name} onChange={handleManualChange} placeholder="Nombre del alimento" className={inputStyle} required/>
                 <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                     <input type="number" name="grams" value={manualFood.grams} onChange={handleManualChange} placeholder="Gramos" className={inputStyle} />
                     <input type="number" name="calories" value={manualFood.calories} onChange={handleManualChange} placeholder="Calorías" className={inputStyle} required/>
                     <input type="number" name="protein" value={manualFood.protein} onChange={handleManualChange} placeholder="Proteína" className={inputStyle} />
                     <input type="number" name="carbs" value={manualFood.carbs} onChange={handleManualChange} placeholder="Carbs" className={inputStyle} />
                     <input type="number" name="fat" value={manualFood.fat} onChange={handleManualChange} placeholder="Grasas" className={inputStyle} />
                 </div>
                 <Button type="submit" className="w-full">Añadir Manualmente</Button>
            </form>
        )}

        {error && <p className="text-danger text-center mt-4">{error}</p>}

        {analysisResult.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Resultados (Editable)</h4>
            {analysisResult.map(item => (
              <div key={item.id} className="p-2 border rounded-md mb-2 bg-gray-50">
                <input type="text" value={item.name} onChange={e => setAnalysisResult(p => p.map(i => i.id === item.id ? {...i, name: e.target.value} : i))} className={`${inputStyle} font-bold mb-2`} />
                <div className="grid grid-cols-5 gap-2 text-center">
                    {(['grams', 'calories', 'protein', 'carbs', 'fat'] as const).map(field => (
                        <div key={field}>
                            <label className="text-xs text-text-secondary capitalize">{macroLabelsAnalysis[field]}</label>
                             <input type="number" value={item[field] ? (field === 'protein' || field === 'fat' ? item[field] : Math.round(item[field]!)) : ''} onChange={e => {
                                if (field === 'grams') {
                                    handleGramsChange(item.id, parseFloat(e.target.value) || 0);
                                } else {
                                    setAnalysisResult(p => p.map(i => i.id === item.id ? {...i, [field]: parseFloat(e.target.value) || 0} : i))
                                }
                             }} className={inputStyle} />
                        </div>
                    ))}
                </div>
              </div>
            ))}
            <Button onClick={handleAddManualItemToAnalysis} variant="outline" className="w-full mt-2 text-sm py-2">
                + Añadir otro alimento
            </Button>
          </div>
        )}

        {(analysisResult.length > 0 || (mode === 'manual' && manualFood.name)) && (
            <div className="mt-4">
                 <label htmlFor="meal-select" className="block text-sm font-medium text-text-secondary mb-1">Añadir a:</label>
                 <select id="meal-select" value={selectedMeal} onChange={e => setSelectedMeal(e.target.value as keyof Meal)} className="w-full p-2 border-2 border-gray-300 rounded-lg font-sans focus:ring-primary focus:border-primary">
                    <option value="breakfast">Desayuno</option><option value="lunch">Almuerzo</option>
                    <option value="dinner">Cena</option><option value="snacks">Snacks</option>
                 </select>
                 {mode === 'camera' && <Button onClick={handleAddItems} className="w-full mt-2">Añadir a mi registro</Button>}
            </div>
        )}
      </>
    );
};

const AiPlannerSection: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
    const [preferences, setPreferences] = useState('');
    const [dietType, setDietType] = useState('balanced');
    const [mealPlan, setMealPlan] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGeneratePlan = async () => {
        setIsLoading(true); setError(null); setMealPlan('');
        const prompt = `Crea un plan de comidas de 1 día para un usuario con los siguientes detalles:\n- Objetivo: ${goalTextMap[userProfile.goal || 'maintain']}\n- Calorías: ${userProfile.calorieGoal} kcal, Proteínas: ${userProfile.proteinGoal}g, Carbs: ${userProfile.carbGoal}g, Grasas: ${userProfile.fatGoal}g\n- Tipo de dieta: ${dietType}\n- Preferencias: ${preferences || 'ninguna'}\n\nEstructura la respuesta en Markdown en español con un resumen total y un tono amigable.`;
        try {
            const result = await generateMealPlan(prompt);
            setMealPlan(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ocurrió un error desconocido.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="space-y-4">
                <select id="dietType" value={dietType} onChange={(e) => setDietType(e.target.value)} className="w-full p-2 border-2 border-gray-300 rounded-lg font-sans">
                    <option value="balanced">Balanceada</option><option value="low-carb">Baja en Carbs</option>
                    <option value="keto">Keto</option><option value="vegan">Vegana</option><option value="mediterranean">Mediterránea</option>
                </select>
                <textarea id="preferences" rows={2} value={preferences} onChange={(e) => setPreferences(e.target.value)} className="w-full p-2 border-2 border-gray-300 rounded-lg font-sans" placeholder="Ej: no me gusta el brócoli, soy alérgico..."/>
                <Button onClick={handleGeneratePlan} disabled={isLoading} className="w-full">{isLoading ? <Spinner /> : "Generar mi Plan"}</Button>
            </div>
            {error && <p className="text-danger text-center mt-4">{error}</p>}
            {mealPlan && <div className="mt-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: mealPlan.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />}
        </>
    );
};

const EditFoodModal: React.FC<{
    item: StoredFoodItem;
    onSave: (updatedItem: StoredFoodItem) => void;
    onClose: () => void;
}> = ({ item, onSave, onClose }) => {
    const [formData, setFormData] = useState(item);
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'name' ? value : parseFloat(value) || 0 }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const inputStyle = "w-full text-sm p-2 border-2 bg-white border-gray-300 rounded-md font-sans focus:border-primary focus:ring-primary";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-primary mb-4">Editar Alimento</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nombre" className={inputStyle} />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" name="grams" value={formData.grams || ''} onChange={handleChange} placeholder="Gramos" className={inputStyle} />
                        <input type="number" name="calories" value={formData.calories} onChange={handleChange} placeholder="Calorías" className={inputStyle} />
                        <input type="number" name="protein" value={formData.protein} onChange={handleChange} placeholder="Proteína" className={inputStyle} />
                        <input type="number" name="carbs" value={formData.carbs} onChange={handleChange} placeholder="Carbs" className={inputStyle} />
                        <input type="number" name="fat" value={formData.fat} onChange={handleChange} placeholder="Grasas" className={inputStyle} />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" onClick={onClose} variant="secondary" className="bg-gray-300 hover:bg-gray-400 text-gray-800">Cancelar</Button>
                        <Button type="submit">Guardar</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const MacroProgressBar: React.FC<{label: string, consumed: number, goal: number, color: string}> = ({label, consumed, goal, color}) => {
    const percentage = goal > 0 ? (consumed / goal) * 100 : 0;
    const displayPercentage = Math.min(percentage, 100);
    const remaining = goal - consumed;
    const isOver = remaining < 0;
    const barColor = isOver ? 'bg-danger' : color;

    return (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-text-primary">{label}</span>
                <span className={isOver ? "text-danger font-medium" : "text-text-secondary"}>
                    {isOver
                        ? `${Math.round(remaining)}g excedidos`
                        : `${Math.round(remaining)}g restantes`
                    }
                </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`${barColor} h-2 rounded-full`} style={{ width: `${displayPercentage}%` }}></div>
            </div>
        </div>
    );
}

const SectionWrapper: React.FC<{title: string, onClose: () => void, children: React.ReactNode}> = ({title, onClose, children}) => (
    <Card>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">{title}</h2>
            <button onClick={onClose} className="text-gray-400 bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-300 hover:text-gray-600 text-2xl font-light" aria-label="Cerrar">&times;</button>
        </div>
        {children}
    </Card>
);


// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC<DashboardProps> = ({ userProfile, dailyLog, onProfileUpdate, selectedDate, setSelectedDate, addFoodToLog, updateFoodInLog, deleteFoodFromLog }) => {
  const isProfileComplete = userProfile.weight && userProfile.height && userProfile.age && userProfile.gender && userProfile.activityLevel && userProfile.goal;
  const [activeSection, setActiveSection] = useState<'logger' | 'planner' | null>(null);
  const [editingItem, setEditingItem] = useState<{item: StoredFoodItem, mealType: keyof Meal} | null>(null);
  
  const totals = React.useMemo(() => Object.values(dailyLog.meals).flat().reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories, protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs, fat: acc.fat + item.fat,
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 }
    ), [dailyLog]);

  if (!isProfileComplete) {
    return <ProfileSetup onProfileUpdate={onProfileUpdate} />;
  }
  
  return (
    <div className="space-y-6 pb-24">
      {editingItem && (
          <EditFoodModal 
            item={editingItem.item}
            onClose={() => setEditingItem(null)}
            onSave={(updatedItem) => {
                updateFoodInLog(editingItem.mealType, updatedItem);
                setEditingItem(null);
            }}
          />
      )}
      
      <Calendar selectedDate={selectedDate} onDateChange={setSelectedDate} />

      {activeSection === 'logger' && (
        <SectionWrapper title="Registrar Comida" onClose={() => setActiveSection(null)}>
            <MealLoggerSection addFoodToLog={addFoodToLog} />
        </SectionWrapper>
      )}
      {activeSection === 'planner' && (
          <SectionWrapper title="Generador de Plan AI" onClose={() => setActiveSection(null)}>
              <AiPlannerSection userProfile={userProfile} />
          </SectionWrapper>
      )}
      
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-text-secondary">Calorías Restantes</p>
            <p className="text-4xl font-bold text-primary">{Math.round(userProfile.calorieGoal - totals.calories)}</p>
          </div>
          <div className="text-right">
             <p className="text-lg font-semibold">{Math.round(totals.calories)}</p>
             <p className="text-sm text-text-secondary">de {userProfile.calorieGoal} kcal</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
            <MacroProgressBar label="Proteínas" consumed={totals.protein} goal={userProfile.proteinGoal} color="bg-blue-500" />
            <MacroProgressBar label="Carbohidratos" consumed={totals.carbs} goal={userProfile.carbGoal} color="bg-orange-500" />
            <MacroProgressBar label="Grasas" consumed={totals.fat} goal={userProfile.fatGoal} color="bg-yellow-500" />
        </div>
      </Card>
      
      <GoalsCard profile={userProfile} onUpdate={onProfileUpdate} />
      
      <Card>
        <h3 className="text-lg font-semibold mb-4 text-text-primary">Comidas del Día</h3>
        {(Object.keys(dailyLog.meals) as Array<keyof Meal>).map(mealType => (
            dailyLog.meals[mealType].length > 0 && (
                <div key={mealType} className="mb-4">
                    <h4 className="font-bold capitalize text-primary">{mealType === 'breakfast' ? 'Desayuno' : mealType === 'lunch' ? 'Almuerzo' : mealType === 'dinner' ? 'Cena' : 'Snacks' }</h4>
                     <ul className="text-text-secondary">
                        {dailyLog.meals[mealType].map((item) => (
                            <li key={item.id} className="text-sm flex justify-between items-center group py-1">
                                <span>{item.name} <span className="text-xs">({item.grams ? `${item.grams}g` : ''})</span></span>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-text-primary">{Math.round(item.calories)} kcal</span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button onClick={() => setEditingItem({item, mealType})} className="text-blue-500 hover:text-blue-700"><Icon name="edit" className="w-4 h-4"/></button>
                                        <button onClick={() => {if(confirm(`¿Seguro que quieres eliminar "${item.name}"?`)) deleteFoodFromLog(mealType, item.id)}} className="text-danger hover:opacity-80"><Icon name="delete" className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )
        ))}
         {Object.values(dailyLog.meals).flat().length === 0 && (
            <div className="text-center py-6 text-text-secondary">
                <Icon name="logger" className="w-12 h-12 mx-auto mb-2" />
                <p>Aún no has registrado ninguna comida.</p>
                <p className="text-sm">Utiliza la barra de abajo para empezar.</p>
            </div>
         )}
      </Card>
      
      <div className="fixed bottom-0 left-0 right-0 bg-surface shadow-[0_-2px_10px_rgba(0,0,0,0.1)] max-w-lg mx-auto">
        <div className="flex justify-around items-center p-2">
            <button onClick={() => setActiveSection(s => s === 'logger' ? null : 'logger')} className={`flex flex-col items-center hover:text-primary transition-colors p-2 rounded-lg w-24 ${activeSection === 'logger' ? 'text-primary' : 'text-text-secondary'}`}>
                <Icon name="camera" className="w-7 h-7"/>
                <span className="text-xs font-medium mt-1">Registrar</span>
            </button>
            <button onClick={() => setActiveSection(s => s === 'planner' ? null : 'planner')} className={`flex flex-col items-center hover:text-primary transition-colors p-2 rounded-lg w-24 ${activeSection === 'planner' ? 'text-primary' : 'text-text-secondary'}`}>
                <Icon name="sparkles" className="w-7 h-7"/>
                <span className="text-xs font-medium mt-1">Plan AI</span>
            </button>
            <a href="https://app.rutinagimnasio.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center transition-colors p-2 rounded-lg w-24 bg-primary text-white shadow-lg hover:opacity-90">
                <Icon name="dumbbell" className="w-7 h-7"/>
                <span className="text-xs font-bold mt-1 tracking-wider">GYM</span>
            </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;