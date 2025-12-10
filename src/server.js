import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import openaiService from './services/openaiService.js';
import conversationManager from './services/conversationManager.js';
import { SYSTEM_PROMPTS, PromptBuilder } from './prompts/promptTemplates.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS - Configuration étendue pour Vercel
app.use(cors({
  origin: ['https://ghinc.github.io/bot_tp_front', 'https://ghinc.github.io', 'http://localhost:8080', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * Route de santé pour vérifier que l'API fonctionne
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openaiConfigured: openaiService.isConfigured(),
  });
});

/**
 * Crée une nouvelle session de conversation
 * POST /api/sessions
 * Body: { promptType?: string, context?: object }
 */
app.post('/api/sessions', (req, res) => {
  try {
    const { promptType = 'TP_ASSISTANT', context = {} } = req.body;

    // Génère un ID de session unique
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Sélectionne le prompt système approprié
    const basePrompt = SYSTEM_PROMPTS[promptType] || SYSTEM_PROMPTS.TP_ASSISTANT;
    const systemPrompt = PromptBuilder.buildSystemPrompt(basePrompt, context);

    // Crée la conversation
    const conversation = conversationManager.createConversation(sessionId, systemPrompt);

    // Met à jour les métadonnées
    conversationManager.updateMetadata(sessionId, {
      promptType,
      context,
    });

    res.status(201).json({
      success: true,
      sessionId,
      message: 'Session créée avec succès',
      createdAt: conversation.createdAt,
    });
  } catch (error) {
    console.error('Erreur création session:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la session',
    });
  }
});

/**
 * Envoie un message et reçoit une réponse
 * POST /api/chat
 * Body: { sessionId: string, message: string, options?: object }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { sessionId, message, options = {} } = req.body;

    // Validation
    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'sessionId et message sont requis',
      });
    }

    // Vérifie que la session existe
    const conversation = conversationManager.getConversation(sessionId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Session non trouvée',
      });
    }

    // Vérifie la configuration OpenAI
    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Service OpenAI non configuré - vérifiez la clé API',
      });
    }

    // Ajoute le message utilisateur à l'historique
    conversationManager.addMessage(sessionId, 'user', message);

    // Récupère l'historique complet
    const messages = conversationManager.getMessages(sessionId);

    // Appelle l'API OpenAI
    const response = await openaiService.chat(messages, options);

    if (!response.success) {
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la communication avec OpenAI',
        details: response.error,
      });
    }

    // Ajoute la réponse à l'historique
    conversationManager.addMessage(sessionId, 'assistant', response.message);

    res.json({
      success: true,
      response: response.message,
      usage: response.usage,
      model: response.model,
    });
  } catch (error) {
    console.error('Erreur chat:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du traitement du message',
    });
  }
});

/**
 * Récupère l'historique d'une conversation
 * GET /api/sessions/:sessionId/history
 */
app.get('/api/sessions/:sessionId/history', (req, res) => {
  try {
    const { sessionId } = req.params;

    const conversation = conversationManager.getConversation(sessionId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Session non trouvée',
      });
    }

    res.json({
      success: true,
      messages: conversation.messages,
      stats: conversationManager.getStats(sessionId),
    });
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique',
    });
  }
});

/**
 * Réinitialise une conversation
 * POST /api/sessions/:sessionId/reset
 */
app.post('/api/sessions/:sessionId/reset', (req, res) => {
  try {
    const { sessionId } = req.params;

    const success = conversationManager.resetConversation(sessionId);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Session non trouvée',
      });
    }

    res.json({
      success: true,
      message: 'Conversation réinitialisée',
    });
  } catch (error) {
    console.error('Erreur réinitialisation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la réinitialisation',
    });
  }
});

/**
 * Supprime une session
 * DELETE /api/sessions/:sessionId
 */
app.delete('/api/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;

    const success = conversationManager.deleteConversation(sessionId);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Session non trouvée',
      });
    }

    res.json({
      success: true,
      message: 'Session supprimée',
    });
  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression',
    });
  }
});

/**
 * Récupère les statistiques d'une session
 * GET /api/sessions/:sessionId/stats
 */
app.get('/api/sessions/:sessionId/stats', (req, res) => {
  try {
    const { sessionId } = req.params;

    const stats = conversationManager.getStats(sessionId);
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Session non trouvée',
      });
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
    });
  }
});

/**
 * Liste les types de prompts disponibles
 * GET /api/prompts
 */
app.get('/api/prompts', (req, res) => {
  res.json({
    success: true,
    promptTypes: Object.keys(SYSTEM_PROMPTS),
    descriptions: {
      TP_ASSISTANT: 'Assistant général pour les TP',
      PROGRAMMING_TUTOR: 'Tuteur spécialisé en programmation',
      DEBUG_HELPER: 'Assistant de débogage',
    },
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - TEST VERCEL DEPLOYMENT</title>
      <style>
        body {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        h1 {
          font-size: 5em;
          margin: 0;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        p {
          font-size: 1.5em;
          margin: 20px 0;
        }
        .timestamp {
          font-size: 0.9em;
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 404</h1>
        <p>VERCEL DEPLOYMENT TEST - Route non trouvée</p>
        <p>Path: ${req.path}</p>
        <p class="timestamp">Déployé à: ${new Date().toISOString()}</p>
      </div>
    </body>
    </html>
  `);
});

// Nettoyage automatique des conversations inactives toutes les 30 minutes
// Note: désactivé en environnement serverless (Vercel)
if (process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    const deleted = conversationManager.cleanupInactive(60);
    if (deleted > 0) {
      console.log(`[Cleanup] ${deleted} conversation(s) inactive(s) supprimée(s)`);
    }
  }, 30 * 60 * 1000);
}

// Démarrage du serveur (uniquement en développement local)
// En production sur Vercel, l'app est exportée comme serverless function
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Serveur Bot TP démarré sur le port ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🤖 OpenAI configuré: ${openaiService.isConfigured() ? '✅' : '❌'}\n`);

    if (!openaiService.isConfigured()) {
      console.warn('⚠️  ATTENTION: Clé API OpenAI non configurée!');
      console.warn('   Copiez .env.example vers .env et ajoutez votre clé API\n');
    }
  });
}

// Export pour Vercel (serverless)
export default app;
