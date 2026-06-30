/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini AI client to prevent startup crashes when API key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      throw new Error('GEMINI_API_KEY is not configured in environment settings.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// 1. API Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    api: 'Noja ERP Engine v1.0',
    aiSupport: !!process.env.GEMINI_API_KEY,
  });
});

// 2. Simulated/Mock ERP API Endpoints (supporting the "API Documentation" view)
app.get('/api/companies', (req: Request, res: Response) => {
  res.json([
    { id: 'c1', name: 'Noja Technologies Uganda Ltd', industry: 'Software & Cloud Solutions', taxId: 'URA-992-881' },
    { id: 'c2', name: 'Noja Logistics East Africa Ltd', industry: 'Supply Chain & Freight Services', taxId: 'URA-445-120' }
  ]);
});

app.get('/api/branches', (req: Request, res: Response) => {
  const { companyId } = req.query;
  const branches = [
    { id: 'b1', companyId: 'c1', name: 'Kampala Central HQ', location: 'Nakasero, Kampala' },
    { id: 'b2', companyId: 'c1', name: 'Jinja Tech Hub', location: 'Jinja, Uganda' },
    { id: 'b3', companyId: 'c2', name: 'Kampala Main Warehouse', location: 'Industrial Area, Kampala' },
    { id: 'b4', companyId: 'c2', name: 'Mbarara Logistics Hub', location: 'Mbarara, Uganda' }
  ];
  if (companyId) {
    res.json(branches.filter(b => b.companyId === companyId));
  } else {
    res.json(branches);
  }
});

// 3. AI Assistant Route - Uses gemini-3.5-flash for intelligent ERP guidance
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { prompt, history, context } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    const ai = getAiClient();

    // Enrich the AI prompt with standard ERP context so it can talk about the active company & branch data
    const systemInstruction = `You are the Noja ERP Intelligent AI Business Assistant, an expert ERP consultant, accountant, and business optimizer.
You have active real-time context of the current business environment:
${JSON.stringify(context || {}, null, 2)}

Provide specific, helpful, professional, and actionable business optimization advice, calculations, formulas, or general assistance, specifically tailored to the Ugandan market context (using UGX for currency, local business practices, and URA tax guidelines where applicable).
Keep your answers professional, concise, and structured. Use Markdown for list, tables, or highlighted numbers.
Do not mention developer file paths, database architectures, or internal secret keys. Focus purely on user value.`;

    const formattedHistory = (history || []).map((h: any) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.text }],
    }));

    // Add the current prompt
    formattedHistory.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: formattedHistory,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I'm sorry, I encountered an issue generating a response.";
    res.json({ reply });
  } catch (error: any) {
    console.error('Gemini AI API Error:', error);
    res.status(500).json({
      error: error.message || 'An internal error occurred while contacting the AI Assistant.',
      hasKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    });
  }
});

// 4. Integrating Vite Middleware or static asset serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Noja ERP Server] running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
