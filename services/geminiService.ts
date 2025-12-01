import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord, Student } from "../types";

// Safe initialization
const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
}

export const generateAttendanceReport = async (
  records: AttendanceRecord[],
  students: Student[],
  date: string
): Promise<string> => {
  if (!ai) {
    return "API Key not configured. Unable to generate AI insights.";
  }

  // Prepare a summary for the model to think about
  const totalStudents = students.length;
  const presentRecords = records.filter(r => r.entityType === 'STUDENT' && r.date === date);
  const presentCount = new Set(presentRecords.map(r => r.entityId)).size;
  const absenteeCount = totalStudents - presentCount;

  const prompt = `
    You are an AI assistant for a School Manager at Mlina Education Center in Kenya.
    Analyze the following daily attendance summary for ${date}:
    
    Total Students Enrolled: ${totalStudents}
    Total Present Today: ${presentCount}
    Absent: ${absenteeCount}
    
    Raw Records Sample (Last 5):
    ${JSON.stringify(records.slice(-5))}

    Provide a brief, professional 1-paragraph summary of the attendance situation. 
    Highlight any concerns about low attendance if the percentage is below 80%. 
    Keep the tone encouraging but factual.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error connecting to AI service for analysis.";
  }
};
