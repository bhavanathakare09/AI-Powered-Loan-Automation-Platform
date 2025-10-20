// src/services/ai.js
import { askAI } from "./api";
export async function queryAI(question) {
  try {
    const { answer } = await askAI(question);
    return answer || "No answer.";
  } catch (e) {
    return `AI error: ${e?.message || e}`;
  }
}