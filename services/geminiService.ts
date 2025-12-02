import { GoogleGenAI, Type } from "@google/genai";
import { AIItineraryResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateItinerary = async (
  destination: string,
  duration: number,
  interests: string
): Promise<AIItineraryResponse | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Plan a ${duration}-day trip to ${destination}. The traveler is interested in: ${interests}. Provide a structured itinerary.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            destination: { type: Type.STRING },
            estimatedCost: { type: Type.STRING, description: "Estimated cost range for the trip excluding flights" },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  activities: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as AIItineraryResponse;
  } catch (error) {
    console.error("Error generating itinerary:", error);
    return null;
  }
};