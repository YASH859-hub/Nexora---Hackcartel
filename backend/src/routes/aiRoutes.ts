import { Router } from 'express';
import { generateWithOllama, type IntentTask } from '../lib/ollamaClient.js';

type ChatMessage = {
  role: 'system' | 'user' | 'model';
  content: string;
};

function toTranscript(messages: ChatMessage[]) {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n\n');
}

export function createAiRouter() {
  const router = Router();

  router.post('/chat', async (req, res) => {
    try {
      const { messages, model } = req.body as {
        messages?: ChatMessage[];
        model?: string;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'messages[] is required',
        });
      }

      const transcript = toTranscript(messages.filter((m) => m?.content));
      const result = await generateWithOllama({
        intent: 'chatbot',
        userInput: transcript,
        model,
      });

      return res.json({
        success: true,
        model: result.model,
        response: result.text,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown AI error';
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  });

  router.post('/intent', async (req, res) => {
    try {
      const { intent, input, model, temperature } = req.body as {
        intent?: IntentTask;
        input?: unknown;
        model?: string;
        temperature?: number;
      };

      if (!intent) {
        return res.status(400).json({
          success: false,
          error: 'intent is required',
        });
      }

      const supported: IntentTask[] = ['prioritize', 'email_classification', 'datewise', 'chatbot'];
      if (!supported.includes(intent)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported intent: ${intent}`,
          supported,
        });
      }

      const userInput = typeof input === 'string' ? input : JSON.stringify(input ?? {}, null, 2);
      const result = await generateWithOllama({
        intent,
        userInput,
        model,
        temperature,
      });

      return res.json({
        success: true,
        model: result.model,
        intent: result.intent,
        response: result.text,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown AI error';
      return res.status(500).json({
        success: false,
        error: message,
      });
    }
  });

  return router;
}
