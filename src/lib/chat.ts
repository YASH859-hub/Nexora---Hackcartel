export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export async function generateChatResponse(messages: ChatMessage[]): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY in environment variables.');
  }

  // Gemini API uses 'user' and 'model' as roles
  const systemMessages = messages.filter(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');

  const systemInstruction = systemMessages.length > 0 
    ? { parts: systemMessages.map(m => ({ text: m.content })) }
    : undefined;

  const contents = otherMessages.map(m => ({
    role: m.role,
    parts: [{ text: m.content }]
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: 0.7,
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Gemini API error:', errorData);
    throw new Error('Failed to generate response from AI.');
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new Error('Unexpected response format from Gemini API.');
  }

  return text;
}
