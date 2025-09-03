import { GoogleGenAI, Type } from "@google/genai";
import type { FoodItem } from '../types';

// Use a singleton pattern to lazy-initialize the AI client.
// This prevents the app from crashing on load if the API key is not yet available
// or not properly injected by the build environment.
let ai: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        // The constructor will throw an error if apiKey is missing or invalid.
        // This is handled by the calling function's try/catch block.
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

const fileToGenerativePart = (file: File) => {
  return new Promise<{ inlineData: { data: string, mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return reject(new Error("Failed to read file as base64 string"));
      }
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const foodItemSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "Name of the food item, in Spanish." },
        calories: { type: Type.NUMBER, description: "Estimated calories" },
        protein: { type: Type.NUMBER, description: "Estimated protein in grams" },
        carbs: { type: Type.NUMBER, description: "Estimated carbohydrates in grams" },
        fat: { type: Type.NUMBER, description: "Estimated fat in grams" },
        grams: { type: Type.NUMBER, description: "Estimated weight of the food item in grams" },
    },
    required: ["name", "calories", "protein", "carbs", "fat", "grams"],
};


export const analyzeFoodImage = async (imageFile: File): Promise<Omit<FoodItem, 'id'>[]> => {
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const generativeAi = getAiClient();
        
        const response = await generativeAi.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: "Analyze the food in this image. Identify each distinct food item and estimate its nutritional information (calories, protein, carbs, fat) and its estimated weight in grams. Return the data as a JSON array of objects. If there are multiple items, return an array with an object for each. For example, if you see a banana and an apple, return two separate objects in the array. IMPORTANT: The name of the food should be in Spanish." },
                    imagePart
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: foodItemSchema,
                },
            },
        });
        
        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);

        return data as Omit<FoodItem, 'id'>[];

    } catch (error) {
        console.error("Error analyzing food image:", error);
        if (error instanceof Error && (error.message.includes('API key') || error.message.includes('API_KEY') || error.message.includes('permission'))) {
             throw new Error("La clave de API no es válida o no está configurada. Verifica la configuración en Netlify.");
        }
        throw new Error("No se pudo analizar la imagen con la IA. Inténtalo de nuevo.");
    }
};

export const generateMealPlan = async (prompt: string): Promise<string> => {
    try {
        const generativeAi = getAiClient();
        const response = await generativeAi.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.7,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating meal plan:", error);
        if (error instanceof Error && (error.message.includes('API key') || error.message.includes('API_KEY') || error.message.includes('permission'))) {
             throw new Error("La clave de API no es válida o no está configurada. Verifica la configuración en Netlify.");
        }
        throw new Error("No se pudo generar el plan de comidas con la IA. Inténtalo de nuevo.");
    }
};