// Point d'entrée pour Vercel Serverless
import app from '../src/server.js';

// Wrapper pour convertir l'app Express en fonction serverless Vercel
export default async function handler(req, res) {
  return app(req, res);
}
