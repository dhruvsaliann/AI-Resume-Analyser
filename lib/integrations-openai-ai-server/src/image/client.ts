import OpenAI from "openai";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error("Set GROQ_API_KEY in your .env file");
}

export const openai = new OpenAI({
  apiKey,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function generateImageBuffer(): Promise<Buffer> {
  throw new Error("Image generation not supported");
}

export async function editImages(): Promise<Buffer> {
  throw new Error("Image editing not supported");
}
