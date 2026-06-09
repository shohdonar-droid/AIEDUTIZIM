import { getGeminiKeysPool } from "./src/lib/gemini";
import dotenv from "dotenv";
dotenv.config();

console.log("GEMINI_API_KEY in env:", process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 7)}...` : "not set");
console.log("GEMINI_API_KEYS in env:", process.env.GEMINI_API_KEYS ? `${process.env.GEMINI_API_KEYS.substring(0, 7)}...` : "not set");
console.log("Keys Pool:", getGeminiKeysPool().map(k => `${k.substring(0, 7)}...`));
