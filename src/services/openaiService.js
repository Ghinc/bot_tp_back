import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 1000;
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
  }

  /**
   * Envoie une requête à l'API OpenAI avec l'historique des messages
   * @param {Array} messages - Historique des messages [{role: 'user'|'assistant'|'system', content: string}]
   * @param {Object} options - Options supplémentaires (temperature, maxTokens, etc.)
   * @returns {Promise<Object>} - Réponse de l'API avec le texte et les métadonnées
   */
  async chat(messages, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || this.model,
        messages: messages,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature !== undefined ? options.temperature : this.temperature,
        n: 1,
      });

      return {
        success: true,
        message: response.choices[0].message.content,
        role: response.choices[0].message.role,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
        model: response.model,
      };
    } catch (error) {
      console.error('Erreur OpenAI API:', error);
      return {
        success: false,
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Vérifie que la clé API est configurée
   * @returns {boolean}
   */
  isConfigured() {
    return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';
  }
}

export default new OpenAIService();
