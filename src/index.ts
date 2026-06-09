import { setServers } from 'node:dns/promises';
setServers(['1.1.1.1', '8.8.8.8']);

import 'dotenv/config';
import { IrminsulClient } from './core/IrminsulClient.js';
import { loadCommands } from './core/CommandLoader.js';
import { loadEvents } from './core/EventLoader.js';

// Gestion des erreurs non gérées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('🚨 Arrêt forcé du processus suite à une exception non capturée.');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('📢 SIGTERM reçu - Arrêt gracieux en cours...');
  process.exit(0);
});

async function main() {
  const client = new IrminsulClient();

  // Override les méthodes de chargement
  client.loadCommands = async () => await loadCommands(client);
  client.loadEvents = async () => await loadEvents(client);

  await client.initialize();
}

main().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
