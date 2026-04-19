import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type IntentTask = 'prioritize' | 'email_classification' | 'datewise' | 'chatbot';

type IntentPrompt = {
  intent: IntentTask;
  description: string;
  system_prompt: string;
  output_format: string;
};

type OllamaGenerateResponse = {
  response?: string;
  done?: boolean;
};

const INTENTS_DIR = path.resolve(__dirname, '..', '..', 'intents');
const DEFAULT_OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'phi3';

const intentCache = new Map<IntentTask, IntentPrompt>();

async function loadIntent(intent: IntentTask): Promise<IntentPrompt> {
  const cached = intentCache.get(intent);
  if (cached) {
    return cached;
  }

  const filePath = path.join(INTENTS_DIR, `${intent}.json`);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as IntentPrompt;
  intentCache.set(intent, parsed);
  return parsed;
}

export async function generateWithOllama(params: {
  intent: IntentTask;
  userInput: string;
  model?: string;
  temperature?: number;
}) {
  const { intent, userInput, model, temperature } = params;
  const promptConfig = await loadIntent(intent);

  const composedPrompt = `${promptConfig.system_prompt}\n\nUser input:\n${userInput}\n\nExpected output format:\n${promptConfig.output_format}`;

  const response = await fetch(`${DEFAULT_OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      prompt: composedPrompt,
      stream: false,
      options: {
        temperature: typeof temperature === 'number' ? temperature : 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as OllamaGenerateResponse;
  const text = data.response?.trim();

  if (!text) {
    throw new Error('Ollama returned an empty response.');
  }

  return {
    model: model || DEFAULT_MODEL,
    intent,
    text,
  };
}
