# Bot TP - Backend

Backend pour un bot assistant pédagogique destiné aux travaux pratiques des étudiants, avec intégration OpenAI GPT-4-mini.

## Fonctionnalités

- Connexion à l'API OpenAI (GPT-4-mini)
- Gestion de sessions de conversation avec historique
- Prompt engineering avec templates prédéfinis
- Différents modes d'assistance (TP général, programmation, débogage)
- API REST pour intégration frontend
- Gestion automatique de la mémoire des conversations

## Structure du projet

```
bot_tp_back/
├── src/
│   ├── server.js                      # Serveur Express principal
│   ├── services/
│   │   ├── openaiService.js           # Service de connexion OpenAI
│   │   └── conversationManager.js     # Gestionnaire d'historique
│   └── prompts/
│       └── promptTemplates.js         # Templates de prompts
├── .env.example                       # Variables d'environnement exemple
├── package.json
└── README.md
```

## Installation

1. Clonez le repository et installez les dépendances :

```bash
npm install
```

2. Configurez les variables d'environnement :

```bash
# Copiez le fichier .env.example
cp .env.example .env

# Éditez .env et ajoutez votre clé API OpenAI
```

3. Obtenez votre clé API OpenAI sur [platform.openai.com](https://platform.openai.com/api-keys)

## Configuration (.env)

```env
# Configuration OpenAI
OPENAI_API_KEY=sk-proj-...              # Votre clé API OpenAI

# Configuration du serveur
PORT=3000                                # Port du serveur
NODE_ENV=development

# Paramètres du modèle
OPENAI_MODEL=gpt-4o-mini                 # Modèle à utiliser
OPENAI_MAX_TOKENS=1000                   # Tokens max par réponse
OPENAI_TEMPERATURE=0.7                   # Créativité (0-1)
```

## Lancement

### Mode développement (avec auto-reload)
```bash
npm run dev
```

### Mode production
```bash
npm start
```

Le serveur démarre sur `http://localhost:3000`

## API Endpoints

### Health Check
```http
GET /health
```
Vérifie l'état du serveur et la configuration OpenAI.

**Réponse:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-04T...",
  "openaiConfigured": true
}
```

---

### Créer une session
```http
POST /api/sessions
```

**Body:**
```json
{
  "promptType": "TP_ASSISTANT",
  "context": {
    "tpSubject": "Introduction à JavaScript",
    "tpObjectives": "Apprendre les bases des fonctions",
    "studentLevel": "débutant"
  }
}
```

**Réponse:**
```json
{
  "success": true,
  "sessionId": "session_1234567890_abc123",
  "message": "Session créée avec succès",
  "createdAt": "2025-12-04T..."
}
```

---

### Envoyer un message
```http
POST /api/chat
```

**Body:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "message": "Comment déclarer une fonction en JavaScript ?",
  "options": {
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

**Réponse:**
```json
{
  "success": true,
  "response": "Il existe plusieurs façons de déclarer une fonction...",
  "usage": {
    "promptTokens": 150,
    "completionTokens": 200,
    "totalTokens": 350
  },
  "model": "gpt-4o-mini"
}
```

---

### Récupérer l'historique
```http
GET /api/sessions/:sessionId/history
```

**Réponse:**
```json
{
  "success": true,
  "messages": [
    {
      "role": "system",
      "content": "Tu es un assistant...",
      "timestamp": "2025-12-04T..."
    },
    {
      "role": "user",
      "content": "Comment déclarer une fonction ?",
      "timestamp": "2025-12-04T..."
    }
  ],
  "stats": {
    "totalMessages": 4,
    "userMessages": 2,
    "assistantMessages": 2
  }
}
```

---

### Réinitialiser une conversation
```http
POST /api/sessions/:sessionId/reset
```

---

### Supprimer une session
```http
DELETE /api/sessions/:sessionId
```

---

### Récupérer les statistiques
```http
GET /api/sessions/:sessionId/stats
```

---

### Lister les types de prompts
```http
GET /api/prompts
```

**Réponse:**
```json
{
  "success": true,
  "promptTypes": ["TP_ASSISTANT", "PROGRAMMING_TUTOR", "DEBUG_HELPER"],
  "descriptions": {
    "TP_ASSISTANT": "Assistant général pour les TP",
    "PROGRAMMING_TUTOR": "Tuteur spécialisé en programmation",
    "DEBUG_HELPER": "Assistant de débogage"
  }
}
```

## Types de Prompts disponibles

### TP_ASSISTANT (par défaut)
Assistant pédagogique général qui guide sans donner la solution complète.

### PROGRAMMING_TUTOR
Tuteur spécialisé en programmation avec explications détaillées des concepts.

### DEBUG_HELPER
Assistant de débogage qui aide à identifier et comprendre les erreurs.

## Prompt Engineering

Le fichier [promptTemplates.js](src/prompts/promptTemplates.js) contient:

- **SYSTEM_PROMPTS**: Templates de prompts système prédéfinis
- **PromptBuilder**: Classe utilitaire pour construire des prompts dynamiques

### Exemple d'utilisation du PromptBuilder

```javascript
import { SYSTEM_PROMPTS, PromptBuilder } from './prompts/promptTemplates.js';

// Construire un prompt avec contexte
const prompt = PromptBuilder.buildSystemPrompt(
  SYSTEM_PROMPTS.TP_ASSISTANT,
  {
    tpSubject: "Algorithmes de tri",
    studentLevel: "intermédiaire"
  }
);

// Demander une clarification
const clarification = PromptBuilder.buildClarificationPrompt(
  "Comment optimiser mon code ?"
);

// Review de code
const review = PromptBuilder.buildCodeReviewPrompt(codeString);
```

## Gestion des Conversations

Le système maintient automatiquement:
- L'historique des messages (limité à 20 messages par défaut)
- Le prompt système initial
- Les métadonnées de session
- Le nettoyage automatique des sessions inactives (>60 min)

## Exemple d'utilisation complète

```javascript
// 1. Créer une session
const session = await fetch('http://localhost:3000/api/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    promptType: 'PROGRAMMING_TUTOR',
    context: {
      tpSubject: 'JavaScript ES6',
      studentLevel: 'débutant'
    }
  })
});
const { sessionId } = await session.json();

// 2. Envoyer un message
const chat = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    message: 'Peux-tu m\'expliquer les arrow functions ?'
  })
});
const { response } = await chat.json();
console.log(response);
```

## Améliorations futures possibles

- Persistance en base de données (MongoDB, PostgreSQL)
- Authentification et gestion multi-utilisateurs
- WebSockets pour réponses en streaming
- Rate limiting et quotas par utilisateur
- Logs structurés et monitoring
- Tests unitaires et d'intégration
- Support de fichiers (upload de code pour review)
- Intégration avec d'autres modèles (Anthropic Claude, etc.)

## Sécurité

- Ne jamais commiter le fichier `.env` avec vos clés API
- Limiter l'accès à l'API avec un reverse proxy (nginx)
- Implémenter un rate limiting en production
- Valider et nettoyer les entrées utilisateur
- Utiliser HTTPS en production

## Technologies utilisées

- Node.js (ES Modules)
- Express.js
- OpenAI API (SDK officiel)
- CORS
- dotenv

## Licence

MIT
