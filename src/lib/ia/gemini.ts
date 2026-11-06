import "server-only";

import { GoogleGenAI, type Part } from "@google/genai";

// Gemini a veces se satura o se queda sin responder: cada modelo tiene un tiempo máximo
// y, si falla, se intenta con el siguiente de la lista.
export const MODELOS_LECTURA = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
export const MODELOS_REDACCION = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

const TIEMPO_MAXIMO_MS = 30_000;

export class ErrorIA extends Error {}

// Llama a Gemini pidiendo JSON con un esquema fijo. Solo corre en el servidor.
export async function generarJson<T>({
  instrucciones,
  partes,
  esquema,
  modelos,
}: {
  instrucciones: string;
  partes: Part[];
  esquema: object;
  modelos: string[];
}): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new ErrorIA("Falta GEMINI_API_KEY en el servidor.");
  const ai = new GoogleGenAI({ apiKey });

  const motivos: string[] = [];

  for (const model of modelos) {
    try {
      const respuesta = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: partes }],
        config: {
          systemInstruction: instrucciones,
          responseMimeType: "application/json",
          responseJsonSchema: esquema,
          temperature: 0.1,
          abortSignal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
        },
      });
      return JSON.parse(respuesta.text ?? "") as T;
    } catch (error) {
      const motivo = error instanceof Error ? error.message : String(error);
      console.error(`Gemini falló con ${model}:`, motivo);
      motivos.push(`${model}: ${motivo.slice(0, 200)}`);
    }
  }

  throw new ErrorIA(motivos.join(" | "));
}
