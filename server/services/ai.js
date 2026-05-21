import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'gpt-4o';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

// Lazy initialization - only create clients when needed
let openai = null;
let anthropic = null;

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

function getAnthropicClient() {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

/**
 * Single AI service file - all OpenAI calls go through here
 * Makes it easy to swap to Anthropic by changing this file only
 */

export async function chatCompletion(messages, options = {}) {
  try {
    const client = getOpenAIClient();

    // Normalize options - convert maxTokens to max_tokens if provided
    const apiOptions = { ...options };
    if (apiOptions.maxTokens) {
      apiOptions.max_tokens = apiOptions.maxTokens;
      delete apiOptions.maxTokens;
    }

    // Remove temperature from apiOptions to avoid duplication
    const { temperature, max_tokens, ...restOptions } = apiOptions;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 4000,
      ...restOptions,
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('AI service unavailable');
  }
}

/**
 * Anthropic completion — same interface as chatCompletion but routes to Claude.
 * Used today only by the debate agent (meta-layer reasoning across specialist outputs).
 * Accepts the same { role, content } messages array; system messages are extracted
 * into Anthropic's separate `system` parameter automatically.
 */
export async function anthropicCompletion(messages, options = {}) {
  try {
    const client = getAnthropicClient();

    const systemContent = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const conversation = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: options.maxTokens || options.max_tokens || 4000,
      temperature: options.temperature ?? 0.7,
      system: systemContent || undefined,
      messages: conversation,
    });

    return response.content.map((block) => block.text || '').join('');
  } catch (error) {
    console.error('Anthropic API error:', error);
    throw new Error('Anthropic service unavailable');
  }
}

export async function streamChatCompletion(messages, options = {}) {
  try {
    const client = getOpenAIClient();

    // Normalize options - convert maxTokens to max_tokens if provided
    const apiOptions = { ...options };
    if (apiOptions.maxTokens) {
      apiOptions.max_tokens = apiOptions.maxTokens;
      delete apiOptions.maxTokens;
    }

    // Remove temperature from apiOptions to avoid duplication
    const { temperature, max_tokens, ...restOptions } = apiOptions;

    const stream = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 4000,
      stream: true,
      ...restOptions,
    });
    return stream;
  } catch (error) {
    console.error('OpenAI streaming error:', error);
    throw new Error('AI streaming service unavailable');
  }
}
