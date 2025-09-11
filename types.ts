export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;

  fat: number;
  grams?: number;
}

export type StoredFoodItem = FoodItem;

export interface Meal {
  breakfast: StoredFoodItem[];
  lunch: StoredFoodItem[];
  dinner: StoredFoodItem[];
  snacks: StoredFoodItem[];
}

export interface DailyLog {
  date: Date;
  meals: Meal;
}

export interface UserProfile {
  name: string;
  age?: number;
  gender?: 'male' | 'female';
  height?: number; // cm
  weight?: number; // kg
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal?: 'lose_weight' | 'maintain' | 'gain_muscle' | 'recomposition' | 'performance';
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
}

export interface AnalyzedDish {
    dishName: string;
    ingredients: Omit<FoodItem, 'id'>[];
}
