# DOCUMENT 2 — ANALYSE DES LOGS ET STRATÉGIE DE DEBUG
## IRMINSUL V2 — Guide de Diagnostic Complet

> Audit réalisé le 2026-06-08 | Pour usage par Devin

---

## 1. ANALYSE DES LOGS RAILWAY ACTUELS

### 1.1 Statistiques globales

```
Total entrées  : 364
Erreurs        : 304 (83.5%)
Informations   : 60 (16.5%)
Durée totale   : ~4.7 secondes (de 17:49:49.156Z à 17:49:53.908Z)
```

### 1.2 Timeline annotée

```
T+0.000s  [INFO]  Starting Container
T+3.706s  [INFO]  🚀 Initialisation d'IRMINSUL V2...
T+4.079s  [INFO]  ✅ MongoDB connecté           ← OK
T+4.079s  [INFO]  ✅ Base de données connectée  ← OK
T+4.699s  [INFO]  ✅ GenshinDataService init     ← OK (119 persos, 234 armes, 61 artefacts)
T+4.699s  [INFO]  📂 7 modules trouvés

T+4.699s  [ERROR] ❌ challenge-start.ts → ERR_UNKNOWN_FILE_EXTENSION  ← DÉBUT CRASH
T+4.699s  [ERROR] ❌ challenges.ts      → ERR_UNKNOWN_FILE_EXTENSION
T+4.699s  [ERROR] ❌ raid-start.ts      → ERR_UNKNOWN_FILE_EXTENSION
T+4.699s  [ERROR] ❌ raids.ts           → ERR_UNKNOWN_FILE_EXTENSION
T+4.699s  [ERROR] ❌ boss.ts            → ERR_UNKNOWN_FILE_EXTENSION
T+4.699s  [ERROR] ❌ domain.ts          → ERR_UNKNOWN_FILE_EXTENSION
T+4.699s  [ERROR] ❌ expedition.ts      → ERR_UNKNOWN_FILE_EXTENSION
             ... (31 autres erreurs identiques)
T+4.699s  [ERROR] ❌ interactionCreate.ts → ERR_UNKNOWN_FILE_EXTENSION  ← FATAL
T+4.752s  [ERROR] ❌ ready.ts            → ERR_UNKNOWN_FILE_EXTENSION  ← FATAL

T+4.752s  [INFO]  ✅ Commandes chargées   ← TROMPEUR (0 commandes réelles)
T+4.752s  [INFO]  ✅ Événements chargés   ← TROMPEUR (0 événements réels)
T+4.752s  [INFO]  🔐 Tentative de connexion à Discord...
T+4.752s  [INFO]  DEBUG: DISCORD_TOKEN = DEFINED
             [Fin des logs — connexion Discord probablement réussie mais bot zombie]
```

### 1.3 Ce que les logs NE montrent PAS (à surveiller après fix)

Après la correction du problème TypeScript, les logs devraient contenir :
- `✅ [Nom du Bot] est prêt ! Serveurs : X` (depuis `ready.ts`)
- `🎮 Interaction reçue: /[commande] de [userId]` (depuis `interactionCreate.ts`)
- Les logs de connexion/déconnexion Discord

---

## 2. LOGS À EXAMINER PAR COUCHE

### 2.1 Couche Railway (Infrastructure)

**Où les trouver** : Railway Dashboard → Service → Logs

**Patterns critiques à surveiller** :

```bash
# ✅ Démarrage sain
"Starting Container"
"🚀 Initialisation d'IRMINSUL V2..."
"✅ Connexion MongoDB réussie"
"✅ X commandes chargées"           # X doit être > 0
"✅ Prêt ! Connecté en tant que"    # bot connecté à Discord

# 🔴 Signaux d'alerte
"ERR_UNKNOWN_FILE_EXTENSION"       # TypeScript non compilé
"Cannot find module"               # Module manquant ou import incorrect
"MongooseServerSelectionError"     # MongoDB inaccessible
"TokenInvalid"                     # Token Discord expiré ou invalide
"Missing Access"                   # Permissions Discord insuffisantes
"ECONNREFUSED"                     # Service externe inaccessible (Redis, etc.)

# 🟡 Warnings à investiguer
"0 commandes chargées"             # Loader en échec silencieux
"Unhandled promise rejection"      # Promesse non catchée
"MaxListenersExceededWarning"      # Memory leak d'event listeners
```

### 2.2 Couche Discord.js (Application)

**Logs à ajouter** dans `interactionCreate.ts` :

```typescript
client.on(Events.InteractionCreate, async (interaction) => {
  // LOG OBLIGATOIRE — toujours logguer les interactions reçues
  logger.info({
    event: 'interaction_received',
    type: interaction.type,
    commandName: interaction.isChatInputCommand() ? interaction.commandName : null,
    userId: interaction.user.id,
    guildId: interaction.guildId,
    timestamp: new Date().toISOString()
  });

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn({
      event: 'command_not_found',
      commandName: interaction.commandName,
      userId: interaction.user.id
    });
    return;
  }

  const startTime = Date.now();
  try {
    await command.execute(interaction);
    logger.info({
      event: 'command_success',
      commandName: interaction.commandName,
      userId: interaction.user.id,
      durationMs: Date.now() - startTime
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error({
      event: 'command_error',
      commandName: interaction.commandName,
      userId: interaction.user.id,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Toujours répondre à l'utilisateur même en cas d'erreur
    const errorMessage = '❌ Une erreur inattendue s\'est produite. L\'équipe a été notifiée.';
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      logger.error({ event: 'reply_error', error: replyError });
    }
  }
});
```

### 2.3 Couche Base de Données (MongoDB)

**Logs à ajouter** autour de chaque opération DB critique :

```typescript
// Wrapper de repository avec logging intégré
async function withDbLog<T>(
  operation: string,
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn({ event: 'slow_db_query', operation, userId, durationMs: duration });
    }
    return result;
  } catch (error) {
    logger.error({ event: 'db_error', operation, userId, error });
    throw error;
  }
}

// Utilisation
const user = await withDbLog('findUser', userId, () =>
  UserRepository.findByDiscordId(userId)
);
```

**Événements Mongoose à monitorer** :

```typescript
// Dans la connexion MongoDB
mongoose.connection.on('connected', () => logger.info('✅ MongoDB connecté'));
mongoose.connection.on('disconnected', () => logger.error('❌ MongoDB déconnecté'));
mongoose.connection.on('error', (err) => logger.error({ event: 'mongodb_error', err }));
mongoose.connection.on('reconnected', () => logger.warn('⚠️ MongoDB reconnecté'));
```

### 2.4 Couche Processus Node.js

**Capturer les erreurs silencieuses** — à ajouter dans `Bootstrap.ts` ou `index.ts` :

```typescript
// OBLIGATOIRE — sans ça, les promesses rejetées sont silencieuses
process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    event: 'unhandled_rejection',
    reason: String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise)
  });
  // En production : ne pas crash, loguer et continuer
  // En dev : process.exit(1) pour forcer la correction
});

process.on('uncaughtException', (error) => {
  logger.error({
    event: 'uncaught_exception',
    error: error.message,
    stack: error.stack
  });
  process.exit(1); // Crash obligatoire sur exception non catchée
});

process.on('SIGTERM', async () => {
  logger.info('📴 Signal SIGTERM reçu — arrêt propre...');
  await client.destroy();
  await mongoose.disconnect();
  process.exit(0);
});
```

---

## 3. INSTRUMENTATION RECOMMANDÉE

### 3.1 Logger structuré (Winston/Pino)

La documentation prévoit déjà Winston + Pino. Configuration recommandée pour Railway :

```typescript
// src/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' }
      }
    : undefined, // JSON brut en production (Railway lit le JSON)

  // Champs ajoutés à TOUS les logs
  base: {
    service: 'irminsul-v2',
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version
  },

  // Format des erreurs
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err
  }
});
```

### 3.2 Métriques de performance à logguer

```typescript
// Ajouter dans chaque commande critique
const metrics = {
  command: interaction.commandName,
  userId: interaction.user.id,
  dbQueryCount: 0,      // incrémenter à chaque query
  dbTotalMs: 0,         // cumuler le temps DB
  totalMs: 0,           // temps total de la commande
  cacheHits: 0,         // hits Redis
  cacheMisses: 0        // misses Redis
};
```

### 3.3 Health check endpoint

Ajouter un endpoint HTTP minimal pour les health checks Railway :

```typescript
// src/core/HealthServer.ts
import http from 'http';

export class HealthServer {
  private server: http.Server;

  start(port = 3000) {
    this.server = http.createServer((req, res) => {
      if (req.url === '/health') {
        const status = {
          status: client.isReady() ? 'ok' : 'degraded',
          uptime: process.uptime(),
          commandsLoaded: client.commands.size,
          dbConnected: mongoose.connection.readyState === 1,
          timestamp: new Date().toISOString()
        };

        const isHealthy = status.status === 'ok' && status.dbConnected && status.commandsLoaded > 0;
        res.writeHead(isHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
      } else {
        res.writeHead(404).end();
      }
    });

    this.server.listen(port, () => {
      logger.info(`🏥 Health check: http://localhost:${port}/health`);
    });
  }
}
```

---

## 4. PROCÉDURE DE REPRODUCTION

### 4.1 Reproduire le bug en local

```bash
# 1. Supprimer temporairement tsx ou ts-node
npm uninstall tsx ts-node

# 2. Modifier package.json start: "node src/index.ts"

# 3. Lancer
npm start

# Résultat attendu : erreur ERR_UNKNOWN_FILE_EXTENSION identique
# → confirme que c'est bien le même bug
```

### 4.2 Valider le correctif en local avant Railway

```bash
# Tester avec tsx
npx tsx src/index.ts

# Vérifier les logs :
# - Plus d'erreur ERR_UNKNOWN_FILE_EXTENSION
# - "X commandes chargées" avec X > 0
# - "✅ Prêt ! Connecté en tant que [NomBot]"

# Tester dans Discord :
# /profil → doit répondre
# /voeux → doit répondre
```

### 4.3 Protocol de test complet post-déploiement

```
PHASE 1 — Vérification des logs Railway (30 secondes après déploiement)
  ✓ Zéro ERR_UNKNOWN_FILE_EXTENSION
  ✓ "✅ X commandes chargées" (X = nombre total attendu)
  ✓ "✅ Prêt !" dans les logs

PHASE 2 — Tests fonctionnels Discord (5 minutes)
  ✓ /profil → réponse avec embed profil (ou message "compte non trouvé")
  ✓ /voeux standard 1 → embed bannière + confirmation
  ✓ /commencer → tutoriel ou message "déjà inscrit"
  ✓ Bouton sur un embed → bot répond (test interactionCreate button handler)
  ✓ Commande avec autocomplete → liste s'affiche

PHASE 3 — Tests de stabilité (10 minutes)
  ✓ Spam de /profil 5x rapidement → cooldown actif
  ✓ Commande inexistante → pas de crash dans les logs
  ✓ /resine → données de résine affichées

PHASE 4 — Surveillance (24h)
  ✓ Aucun "Unhandled rejection" dans les logs
  ✓ Mémoire stable (pas de leak)
  ✓ Latence de réponse < 3s en permanent
```

---

## 5. JOURNAL DE RÉSOLUTION — TEMPLATE DEVIN

```markdown
# Journal de Résolution — IRMINSUL V2

## Metadata
- **Date** : _______________
- **Devin Session** : _______________
- **Environnement** : [ ] Local  [ ] Railway Dev  [ ] Railway Prod

---

## Problème initial
Discord affiche "L'application ne répond pas" après déploiement Railway.

## Hypothèse principale vérifiée
- [x] ERR_UNKNOWN_FILE_EXTENSION → TypeScript non transpilé sur Railway
- [ ] Autre hypothèse : _______________

## Actions effectuées

### Action 1 — [HEURE]
**Fichier modifié** : `package.json`
**Modification** : 
```diff
- "start": "node src/index.ts"
+ "start": "tsx src/index.ts"
```
**Résultat** : [succès / échec / en cours]

### Action 2 — [HEURE]
**Fichier modifié** : _______________
**Modification** : _______________
**Résultat** : _______________

---

## Tests effectués

| Test | Résultat | Notes |
|------|----------|-------|
| /profil | ✅ / ❌ | |
| /voeux | ✅ / ❌ | |
| Bouton embed | ✅ / ❌ | |
| Logs Railway propres | ✅ / ❌ | |

---

## Résolution confirmée
- [ ] Le bot répond aux commandes Discord
- [ ] Les logs ne montrent plus ERR_UNKNOWN_FILE_EXTENSION
- [ ] Plus aucun "L'application ne répond pas"

## Notes pour la prochaine session
_______________
```

---

## 6. GUIDE DE LECTURE RAPIDE DES LOGS RAILWAY

### Pattern de logs sains (après correction)

```
[INFO] Starting Container
[INFO] 🚀 Initialisation d'IRMINSUL V2...
[INFO] ✅ Connexion MongoDB réussie
[INFO] ✅ GenshinDataService initialisé: 119 personnages...
[INFO] 📂 7 modules trouvés
[INFO] 📂 Dossier abyss/commands: 4 fichiers
[INFO] ✅ Chargé: challenge-start       ← PLUS D'ERREUR ICI
[INFO] ✅ Chargé: challenges
           ... (X fichiers chargés avec succès)
[INFO] ✅ 38 commandes chargées (0 erreurs)   ← CHIFFRE RÉEL
[INFO] ✅ 2 événements chargés (0 erreurs)
[INFO] 🔐 Tentative de connexion à Discord...
[INFO] ✅ Prêt ! Connecté en tant que IRMINSUL#1234  ← CONFIRMATION FINALE
[INFO] 🎮 Serveurs actifs : 1
```

### Commande grep Railway-style (à utiliser dans les logs)

```bash
# Dans les logs Railway, filtrer par niveau
# Erreurs uniquement
grep -i "error\|❌\|CRITICAL\|ERR_" logs.txt

# Compter les commandes chargées
grep -i "commandes chargées\|chargé:" logs.txt

# Vérifier la présence de l'event handler critique
grep -i "interactionCreate\|prêt\|ready" logs.txt

# Timeouts Discord (interactions non répondues)
grep -i "timeout\|3 second\|expired\|Unknown interaction" logs.txt
```
