import { GoogleGenAI, Type } from "@google/genai";
import { Guest } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generatePersonalizedGreeting = async (guest: Guest): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a sophisticated, 1-sentence welcome message for ${guest.name} attending the Velana Awards. They are from ${guest.organization} ${guest.awardCategory !== 'Not an Award Recipient' ? `and are nominated for ${guest.awardCategory}` : ''}. Keep it elegant and professional.`,
    });
    return response.text || "Welcome to the Velana Awards. We are honored to have you with us.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Welcome to the Velana Awards.";
  }
};

export const getAdminInsights = async (guests: Guest[]): Promise<string> => {
  try {
    const stats = {
      total: guests.length,
      checkedIn: guests.filter(g => g.checkedIn).length,
      organizations: [...new Set(guests.map(g => g.organization))].length,
      recipients: guests.filter(g => g.awardCategory !== 'Not an Award Recipient').length
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze these event statistics and provide a brief (2 sentences) executive summary of the attendance for the Velana Awards. Stats: ${JSON.stringify(stats)}.`,
    });
    return response.text || "Attendance is proceeding according to expectations.";
  } catch (error) {
    return "Insights unavailable.";
  }
};