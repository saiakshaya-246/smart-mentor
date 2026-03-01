import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function analyzePdf(pdfBase64: string, prompt: string) {
  const model = "gemini-3-flash-preview";
  
  const pdfPart = {
    inlineData: {
      data: pdfBase64,
      mimeType: "application/pdf",
    },
  };

  const textPart = {
    text: prompt,
  };

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [pdfPart, textPart] },
  });

  return response.text;
}

export async function chatWithPdf(pdfBase64: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string) {
  const model = "gemini-3-flash-preview";
  
  const pdfPart = {
    inlineData: {
      data: pdfBase64,
      mimeType: "application/pdf",
    },
  };

  // We include the PDF in every message for context if it's a stateless call, 
  // or we can use the chat session. For simplicity and reliability with PDFs, 
  // we'll send the PDF part with the first message or as part of the context.
  
  const contents = [
    ...history.map(h => ({ role: h.role, parts: h.parts })),
    { role: 'user', parts: [pdfPart, { text: message }] }
  ];

  const response = await ai.models.generateContent({
    model,
    contents,
  });

  return response.text;
}
