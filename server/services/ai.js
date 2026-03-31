import OpenAI from 'openai';

const MODEL = 'gpt-4o';

// Lazy initialization - only create client when needed
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Single AI service file - all OpenAI calls go through here
 * Makes it easy to swap to Anthropic by changing this file only
 */

export async function chatCompletion(messages, options = {}) {
  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4000,
      ...options,
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('AI service unavailable');
  }
}

export async function streamChatCompletion(messages, options = {}) {
  try {
    const client = getOpenAIClient();
    const stream = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4000,
      stream: true,
      ...options,
    });
    return stream;
  } catch (error) {
    console.error('OpenAI streaming error:', error);
    throw new Error('AI streaming service unavailable');
  }
}
