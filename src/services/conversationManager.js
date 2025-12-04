/**
 * Gestionnaire d'historique de conversation
 * Maintient le contexte des échanges entre étudiants et le bot
 */

class ConversationManager {
  constructor() {
    // Stockage en mémoire des conversations (utiliser une BDD en production)
    this.conversations = new Map();
    this.maxHistoryLength = 20; // Limite de messages par conversation
  }

  /**
   * Initialise une nouvelle conversation
   * @param {string} sessionId - Identifiant unique de la session
   * @param {string} systemPrompt - Prompt système initial
   * @returns {Object} - Conversation créée
   */
  createConversation(sessionId, systemPrompt) {
    const conversation = {
      id: sessionId,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      metadata: {},
    };

    this.conversations.set(sessionId, conversation);
    return conversation;
  }

  /**
   * Récupère une conversation existante
   * @param {string} sessionId - Identifiant de la session
   * @returns {Object|null} - Conversation ou null si inexistante
   */
  getConversation(sessionId) {
    return this.conversations.get(sessionId) || null;
  }

  /**
   * Ajoute un message à l'historique
   * @param {string} sessionId - Identifiant de la session
   * @param {string} role - Rôle (user, assistant, system)
   * @param {string} content - Contenu du message
   * @returns {boolean} - Succès de l'opération
   */
  addMessage(sessionId, role, content) {
    const conversation = this.conversations.get(sessionId);

    if (!conversation) {
      return false;
    }

    conversation.messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });

    conversation.lastActivity = new Date().toISOString();

    // Limite la taille de l'historique (garde toujours le message system)
    if (conversation.messages.length > this.maxHistoryLength) {
      const systemMessage = conversation.messages[0];
      conversation.messages = [
        systemMessage,
        ...conversation.messages.slice(-this.maxHistoryLength + 1),
      ];
    }

    return true;
  }

  /**
   * Récupère l'historique des messages pour l'API OpenAI
   * @param {string} sessionId - Identifiant de la session
   * @returns {Array} - Messages formatés pour OpenAI
   */
  getMessages(sessionId) {
    const conversation = this.conversations.get(sessionId);

    if (!conversation) {
      return [];
    }

    return conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Met à jour les métadonnées d'une conversation
   * @param {string} sessionId - Identifiant de la session
   * @param {Object} metadata - Métadonnées à ajouter
   * @returns {boolean} - Succès de l'opération
   */
  updateMetadata(sessionId, metadata) {
    const conversation = this.conversations.get(sessionId);

    if (!conversation) {
      return false;
    }

    conversation.metadata = {
      ...conversation.metadata,
      ...metadata,
    };

    return true;
  }

  /**
   * Supprime une conversation
   * @param {string} sessionId - Identifiant de la session
   * @returns {boolean} - Succès de l'opération
   */
  deleteConversation(sessionId) {
    return this.conversations.delete(sessionId);
  }

  /**
   * Réinitialise une conversation en gardant le prompt système
   * @param {string} sessionId - Identifiant de la session
   * @returns {boolean} - Succès de l'opération
   */
  resetConversation(sessionId) {
    const conversation = this.conversations.get(sessionId);

    if (!conversation) {
      return false;
    }

    const systemMessage = conversation.messages[0];
    conversation.messages = [systemMessage];
    conversation.lastActivity = new Date().toISOString();

    return true;
  }

  /**
   * Nettoie les conversations inactives (utile pour libérer la mémoire)
   * @param {number} maxInactiveMinutes - Minutes d'inactivité avant suppression
   * @returns {number} - Nombre de conversations supprimées
   */
  cleanupInactive(maxInactiveMinutes = 60) {
    const now = new Date();
    let deletedCount = 0;

    for (const [sessionId, conversation] of this.conversations.entries()) {
      const lastActivity = new Date(conversation.lastActivity);
      const inactiveMinutes = (now - lastActivity) / (1000 * 60);

      if (inactiveMinutes > maxInactiveMinutes) {
        this.conversations.delete(sessionId);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Récupère les statistiques d'une conversation
   * @param {string} sessionId - Identifiant de la session
   * @returns {Object|null} - Statistiques ou null
   */
  getStats(sessionId) {
    const conversation = this.conversations.get(sessionId);

    if (!conversation) {
      return null;
    }

    const userMessages = conversation.messages.filter(m => m.role === 'user').length;
    const assistantMessages = conversation.messages.filter(m => m.role === 'assistant').length;

    return {
      totalMessages: conversation.messages.length - 1, // Exclut le message system
      userMessages,
      assistantMessages,
      createdAt: conversation.createdAt,
      lastActivity: conversation.lastActivity,
      metadata: conversation.metadata,
    };
  }
}

export default new ConversationManager();
