# DOCUMENT 4 — FEUILLE DE ROUTE DEVIN
## IRMINSUL V2 — Plan d'Action Concret

> Généré le 2026-06-08 | Basé sur l'audit Railway + documentation architecture

---

## APERÇU GLOBAL

```
PHASE 1 — Correction Critique      (Jour 1)         ← FAIRE EN PREMIER
PHASE 2 — Stabilisation            (Semaines 1-2)
PHASE 3 — Optimisation             (Semaines 2-4)
PHASE 4 — Refonte Système Vœux    (Semaines 4-8)
PHASE 5 — Préparation Production   (Semaines 8-10)
```

---

## PHASE 1 — CORRECTION CRITIQUE
### Objectif : Le bot répond à nouveau sur Discord

**Durée estimée : 1-4 heures**
**Priorité : P0 — BLOQUANT**

---

### TÂCHE 1.1 — Corriger le script de démarrage Railway

**Objectif** : Node.js doit pouvoir exécuter le code TypeScript sur Railway.

**Fichiers concernés** :
- `package.json` (modification du script `start`)
- Optionnel : `tsconfig.json` (si choix Option B)
- Railway dashboard (Settings → Build/Start Command)

**Risques** :
- Si `tsx` n'est pas dans les dépendances → installer avant le push
- Si le `tsconfig.json` est incorrect → le build TypeScript échoue
- Ne pas casser le script `dev` local

**Action (Option A — tsx, la plus rapide)** :

```bash
# 1. Installer tsx
npm install tsx

# 2. Modifier package.json
```

```json
{
  "scripts": {
    "dev":   "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "build": "tsc --noEmit"
  }
}
```

```bash
# 3. Vérifier en local
npm start
# → Attendre "✅ Prêt ! Connecté en tant que..."
# → Aucune erreur ERR_UNKNOWN_FILE_EXTENSION

# 4. Push + Railway redeploy
git add package.json package-lock.json
git commit -m "fix: use tsx to run TypeScript on Railway"
git push
```

**Sur Railway** :
- Build Command : `npm install` (ou laisser vide si Railway auto-détecte)
- Start Command : `npm start`

**Critères de réussite** :
- [ ] Zéro `ERR_UNKNOWN_FILE_EXTENSION` dans les logs Railway
- [ ] Log "✅ X commandes chargées" avec X > 0
- [ ] Log "✅ Prêt ! Connecté en tant que [NomBot]"
- [ ] `/profil` dans Discord → le bot répond

---

### TÂCHE 1.2 — Corriger les faux messages de succès du Loader

**Objectif** : Le bot doit crasher explicitement si aucune commande n'est chargée (plutôt que mentir).

**Fichiers concernés** :
- `src/core/CommandLoader.ts`
- `src/core/EventLoader.ts`

**Action** :

```typescript
// CommandLoader.ts — après la boucle d'import
const commandCount = this.client.commands.size;
const errorCount = /* compteur d'erreurs */;

if (commandCount === 0) {
  logger.error(`🚨 CRITIQUE: 0 commandes chargées sur ${totalFiles} tentées (${errorCount} erreurs)`);
  process.exit(1); // Railway détecte le crash et redémarre
}
logger.info(`✅ ${commandCount} commandes chargées (${errorCount} erreurs ignorées)`);
```

```typescript
// EventLoader.ts — même pattern
if (eventsLoaded === 0) {
  logger.error(`🚨 CRITIQUE: Aucun event handler chargé. Le bot ne peut pas fonctionner.`);
  process.exit(1);
}
```

**Critères de réussite** :
- [ ] Si le bug TypeScript réapparaît → Railway crash loop (visible, pas zombie)
- [ ] En mode normal → les chiffres réels sont loggués

---

### TÂCHE 1.3 — Mettre à jour le token local

**Fichier concerné** : `.env` local

**Action** :
```bash
# Récupérer le nouveau token Discord depuis Railway Variables
# Mettre à jour .env local
DISCORD_TOKEN=<nouveau_token>
```

**Vérifier** :
- `.env` est dans `.gitignore` ✓
- Le token local n'est jamais commité ✓

---

## PHASE 2 — STABILISATION
### Objectif : Bot fiable, sans surprises en production

**Durée estimée : 1-2 semaines**

---

### TÂCHE 2.1 — Ajouter deferReply sur toutes les commandes DB

**Objectif** : Éliminer les timeouts Discord de 3 secondes.

**Fichiers concernés** : Tous les fichiers de commandes dans `src/modules/*/commands/`

**Pattern obligatoire** :

```typescript
// À appliquer dans TOUTES les commandes qui font des appels DB
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  // LIGNE 1 — toujours en premier
  await interaction.deferReply({ ephemeral: true }); // ou ephemeral: false selon la commande

  try {
    // ... logique de la commande avec opérations DB ...
    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logger.error({ command: interaction.commandName, error });
    const msg = '❌ Une erreur est survenue. Réessaie dans quelques instants.';
    if (interaction.deferred) {
      await interaction.editReply({ content: msg });
    } else {
      await interaction.reply({ content: msg, ephemeral: true });
    }
  }
}
```

**Commandes prioritaires à corriger** (risque timeout élevé) :
1. `/voeux` (DB + calcul pity + write)
2. `/boss` (DB multiple + combat setup)
3. `/commission` (DB + génération)
4. `/profil` (DB read + formatting)
5. `/ameliorer` (DB read + write + validation)

**Critères de réussite** :
- [ ] Aucun "Interaction already acknowledged" dans les logs
- [ ] Aucun "Unknown Interaction" dans les logs (= timeout raté)

---

### TÂCHE 2.2 — Ajouter les handlers d'erreur globaux

**Fichier concerné** : `src/core/Bootstrap.ts` ou `src/index.ts`

**Action** : Ajouter en haut du fichier d'entrée :

```typescript
process.on('unhandledRejection', (reason: unknown) => {
  logger.error({
    event: 'unhandled_rejection',
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
  // Ne pas exit — loguer et continuer
});

process.on('uncaughtException', (error: Error) => {
  logger.error({ event: 'uncaught_exception', message: error.message, stack: error.stack });
  process.exit(1); // Crash → Railway redémarre
});

process.on('SIGTERM', async () => {
  logger.info('📴 SIGTERM reçu — arrêt propre...');
  client.destroy();
  await mongoose.disconnect();
  process.exit(0);
});
```

**Critères de réussite** :
- [ ] Les promesses non-catchées apparaissent dans les logs
- [ ] Pas de crash silencieux

---

### TÂCHE 2.3 — Vérifier et configurer les Variables Railway

**Sur Railway** : Service → Variables → Vérifier chaque variable

**Variables obligatoires** :

```env
DISCORD_TOKEN=          ← Nouveau token uniquement
DISCORD_CLIENT_ID=      ← ID de l'application Discord
DISCORD_GUILD_ID=       ← ID du serveur Discord de test (si dev)
MONGODB_URI=            ← URI MongoDB Atlas
NODE_ENV=production
LOG_LEVEL=info

# Si Redis utilisé
REDIS_URL=              ← URI Redis Cloud/Upstash

# Optionnel
RESINE_MAX=200
RESINE_REGEN_MINUTES=8
DAILY_RESET_HOUR=4
ADMIN_USER_IDS=
```

**Vérifier** que MongoDB Atlas accepte les connexions depuis l'IP de Railway (whitelist `0.0.0.0/0` pour Railway si IP dynamique).

**Critères de réussite** :
- [ ] Aucun "MongooseServerSelectionError" dans les logs
- [ ] Aucun "TokenInvalid"

---

### TÂCHE 2.4 — Déployer les commandes slash sur Discord

**Problème possible** : Les commandes slash doivent être enregistrées sur l'API Discord. Si elles ne l'ont pas été après la correction, les commandes n'apparaîtront pas dans Discord même si le bot répond.

**Fichier concerné** : `scripts/deploy-commands.ts`

**Action** :

```bash
# En local (après correction du script start)
npm run deploy-commands
# ou
npx tsx scripts/deploy-commands.ts
```

**Différence important** :
- `Routes.applicationGuildCommands(clientId, guildId)` → Déploiement serveur spécifique (instantané, pour le dev)
- `Routes.applicationCommands(clientId)` → Déploiement global (délai ~1h, pour la production)

**Critères de réussite** :
- [ ] Les commandes apparaissent dans le menu `/` de Discord
- [ ] L'autocomplete fonctionne (ex: noms de personnages)

---

### TÂCHE 2.5 — Health Check HTTP

**Objectif** : Railway doit pouvoir vérifier que le bot est sain.

**Fichier à créer** : `src/core/HealthServer.ts`

```typescript
import http from 'http';
import { IrminsulClient } from './IrminsulClient';
import mongoose from 'mongoose';

export function startHealthServer(client: IrminsulClient, port = 3000): void {
  const server = http.createServer((req, res) => {
    if (req.url !== '/health') {
      res.writeHead(404).end();
      return;
    }

    const healthy = client.isReady()
      && mongoose.connection.readyState === 1
      && client.commands.size > 0;

    res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: healthy ? 'ok' : 'degraded',
      discord: client.isReady(),
      db: mongoose.connection.readyState === 1,
      commands: client.commands.size,
      uptime: Math.floor(process.uptime())
    }));
  });

  server.listen(port, () => logger.info(`🏥 Health: http://localhost:${port}/health`));
}
```

Sur Railway → Settings → HTTP Health Check Path : `/health`

---

## PHASE 3 — OPTIMISATION
### Objectif : Performance, qualité de code, expérience joueur

**Durée estimée : 2-4 semaines**

---

### TÂCHE 3.1 — Système de cooldowns Redis

**Objectif** : Implémenter les cooldowns documentés dans `/architecture` pour éviter le spam.

**Fichier concerné** : `src/utils/cooldown.ts`

```typescript
export async function checkCooldown(
  userId: string,
  commandName: string,
  cooldownMs: number
): Promise<{ allowed: boolean; remainingMs: number }> {
  const key = `cooldown:${userId}:${commandName}`;
  const lastUsed = await redis.get(key);

  if (lastUsed) {
    const elapsed = Date.now() - parseInt(lastUsed);
    if (elapsed < cooldownMs) {
      return { allowed: false, remainingMs: cooldownMs - elapsed };
    }
  }

  await redis.set(key, Date.now().toString(), 'PX', cooldownMs);
  return { allowed: true, remainingMs: 0 };
}
```

**Cooldowns à configurer** (selon DOC 04) :
- `/voeux ×1` : 3s
- `/voeux ×10` : 10s
- `/boss hebdomadaire` : 60s
- `/classement` : 30s
- `/marche vendre` : 30s
- `/partager` : 10m
- `/theiere visiter` : 8h

---

### TÂCHE 3.2 — Pagination des listes longues

**Objectif** : Toutes les listes (inventaire, artefacts, historique) doivent être paginées.

**Fichier à vérifier** : `src/builders/PaginationHelper.ts`

```typescript
// Pattern standard de pagination avec boutons
export async function paginateEmbeds(
  interaction: ChatInputCommandInteraction,
  embeds: EmbedBuilder[],
  options: { timeout?: number; ephemeral?: boolean } = {}
): Promise<void> {
  if (embeds.length === 0) {
    await interaction.editReply({ content: 'Aucun résultat.' });
    return;
  }

  if (embeds.length === 1) {
    await interaction.editReply({ embeds: [embeds[0]] });
    return;
  }

  let currentPage = 0;
  const getRow = (page: number) => new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('page_prev')
      .setLabel('◀')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('page_next')
      .setLabel('▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === embeds.length - 1),
    new ButtonBuilder()
      .setCustomId('page_close')
      .setLabel('✕')
      .setStyle(ButtonStyle.Danger)
  );

  // ... collector et gestion des boutons
}
```

---

### TÂCHE 3.3 — Optimisation des requêtes MongoDB

**Fichiers concernés** : `src/database/repositories/`

**Optimisations à appliquer** :

```typescript
// 1. Utiliser les index existants (ne pas faire de scan complet)
// ❌ Lent
const users = await User.find({ mora: { $gt: 100000 } });

// ✅ Rapide (index sur adventureRank)
const topPlayers = await User.find({})
  .sort({ adventureRank: -1 })
  .limit(20)
  .select('discordId username adventureRank'); // projection

// 2. Éviter les N+1 queries — utiliser .populate() ou aggregate
// ❌ N+1 : une query par personnage
for (const charId of user.characters) {
  const char = await Character.findById(charId); // N queries !
}

// ✅ Une seule query
const characters = await Character.find({ _id: { $in: user.characters } });

// 3. Transactions pour les opérations économiques
const session = await mongoose.startSession();
session.startTransaction();
try {
  await User.findByIdAndUpdate(userId, { $inc: { mora: -cost } }, { session });
  await Inventory.findByIdAndUpdate(inventoryId, { $push: { items: item } }, { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

### TÂCHE 3.4 — Mise en cache Redis des données fréquentes

**Fichiers concernés** : `src/cache/`

**Données à mettre en cache** :
- Profil utilisateur : TTL 5 minutes (déjà documenté)
- Données statiques des personnages : TTL 24h
- Bannières actives : TTL 1h
- Classements : TTL 15 minutes

```typescript
// Pattern wrapper cache-aside
async function getCachedUser(discordId: string): Promise<IUser> {
  const cacheKey = `user:${discordId}:profile`;

  // 1. Essayer le cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Aller en DB
  const user = await UserRepository.findByDiscordId(discordId);
  if (!user) throw new UserNotFoundError(discordId);

  // 3. Mettre en cache
  await redis.set(cacheKey, JSON.stringify(user), 'EX', 300); // 5 min

  return user;
}
```

---

## PHASE 4 — REFONTE DU SYSTÈME DE VŒUX
### Objectif : Implémenter les innovations du DOC 3

**Durée estimée : 4-6 semaines**

---

### TÂCHE 4.1 — Soft Pity Dynamique (Sprint 1 - 1 jour)

**Fichier concerné** : `src/services/GachaEngine.ts`

```typescript
function calculateFiveStarRate(pullsSinceLast: number): number {
  const BASE_RATE = 0.006;
  const SOFT_PITY_START = 74;
  const HARD_PITY = 90;

  if (pullsSinceLast >= HARD_PITY) return 1.0;
  if (pullsSinceLast < SOFT_PITY_START) return BASE_RATE;

  // Courbe exponentielle douce
  const stepsAboveSoftPity = pullsSinceLast - SOFT_PITY_START;
  const multiplier = Math.pow(1.5, stepsAboveSoftPity);
  return Math.min(BASE_RATE * multiplier, 1.0);
}
```

---

### TÂCHE 4.2 — Météo de Teyvat (Sprint 1 - 2 jours)

**Fichiers concernés** :
- `src/jobs/DailyResetJob.ts` (sélection météo)
- `src/data/weather-effects.json` (configuration des effets)
- Salon Discord : #teyvat-aujourd-hui

**Schema météo** :
```typescript
interface WeatherEffect {
  id: string;
  name: string;
  emoji: string;
  description: string;
  effects: {
    moraBonus?: number;        // ex: 1.15 = +15%
    resinCostReduction?: number; // ex: 0.9 = -10%
    primosOnLogin?: number;
    elementBonus?: { element: string; multiplier: number };
  };
  rarity: 'common' | 'rare' | 'legendary';
  weight: number; // Pour la sélection pondérée
}
```

---

### TÂCHE 4.3 — Marchands Itinérants (Sprint 2 - 3 jours)

**Fichiers à créer** :
- `src/jobs/WanderingMerchantJob.ts`
- `src/modules/events/handlers/merchant.ts`

**Logique** :
```
Timer : toutes les 4-8h (aléatoire)
Stock : 3-5 items sélectionnés aléatoirement
Durée : 20-40 minutes
Limite : 5 acheteurs par item
Clé Redis : merchant:current (TTL = durée de la vente)
```

---

### TÂCHE 4.4 — Bannière Communautaire Mensuelle (Sprint 3 - 4 jours)

**Fichiers concernés** :
- `src/modules/gacha/` (nouveau type de bannière)
- `src/jobs/MonthlyResetJob.ts` (nouveau job)

**Flow** :
```
J-7 du mois : Annonce des 3 candidats au vote
J-4 : Clôture du vote
J-3 : Annonce du gagnant + bannière activée
Fin de mois : Clôture bannière + reset vote
```

---

### TÂCHE 4.5 — Invasion de l'Abîme (Sprint 3 - 5 jours)

**Fichier à créer** : `src/modules/events/handlers/abyss-invasion.ts`

**Structure embed dynamique** :
```typescript
// L'embed est edité toutes les 30s avec les nouvelles stats
async function updateInvasionEmbed(
  message: Message,
  invasion: AbyssInvasion
): Promise<void> {
  const hpPercent = (invasion.currentHp / invasion.maxHp) * 100;
  const bar = generateProgressBar(hpPercent, 20);

  const embed = new EmbedBuilder()
    .setTitle('🌑 INVASION DE L\'ABÎME EN COURS')
    .addFields(
      { name: 'HP de l\'Abîme', value: `${bar} ${hpPercent.toFixed(1)}%`, inline: false },
      { name: 'Participants', value: String(invasion.participants.size), inline: true },
      { name: 'Temps restant', value: formatDuration(invasion.endsAt - Date.now()), inline: true }
    );

  await message.edit({ embeds: [embed], components: [getActionRow()] });
}
```

---

## PHASE 5 — PRÉPARATION PRODUCTION
### Objectif : Bot prêt pour de vrais joueurs

**Durée estimée : 2-4 semaines**

---

### TÂCHE 5.1 — Déploiement des commandes en production

```bash
# Passer du déploiement guild au déploiement global
# scripts/deploy-commands.ts — modifier la cible

# Développement (instantané)
await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });

# Production (délai 1h)
await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
```

---

### TÂCHE 5.2 — Monitoring et alertes

**Mettre en place** :
- [ ] Logs Railway configurés avec filtres (errors uniquement en alertes)
- [ ] Alerte si le bot tombe offline (Railway restart policy)
- [ ] Log des anomalies économiques (Mora > 500M, pulls > 100 en 10min)

---

### TÂCHE 5.3 — Backup MongoDB

**Action** :
- Configurer MongoDB Atlas avec backup automatique quotidien
- Point de restauration avant chaque migration de schema

---

### TÂCHE 5.4 — Rate limiting anti-abus

**Fichier concerné** : `src/utils/cooldown.ts`

Implémenter le rate limiting global :
```typescript
// Rate limiter par userId (Redis sliding window)
async function isRateLimited(userId: string, action: string, maxPerMinute: number): Promise<boolean> {
  const key = `ratelimit:${userId}:${action}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60); // fenêtre de 1 minute
  return count > maxPerMinute;
}
```

---

### TÂCHE 5.5 — Tests de charge

Avant le lancement public :
- [ ] Simuler 50 joueurs simultanés (combat, gacha, etc.)
- [ ] Vérifier qu'aucune interaction ne dépasse 3 secondes sans `deferReply`
- [ ] Vérifier les verrous Redis (Redlock) sur les transactions économiques

---

## TABLEAU DE BORD DE PROGRESSION

```
PHASE 1 — Correction Critique
  □ 1.1 Script démarrage Railway corrigé
  □ 1.2 Faux succès loader corrigés
  □ 1.3 Token local mis à jour

PHASE 2 — Stabilisation
  □ 2.1 deferReply sur toutes les commandes DB
  □ 2.2 Handlers d'erreur globaux
  □ 2.3 Variables Railway vérifiées
  □ 2.4 Commandes slash déployées
  □ 2.5 Health check HTTP

PHASE 3 — Optimisation
  □ 3.1 Cooldowns Redis
  □ 3.2 Pagination des listes
  □ 3.3 Requêtes MongoDB optimisées
  □ 3.4 Cache Redis données fréquentes

PHASE 4 — Refonte Vœux
  □ 4.1 Soft Pity Dynamique
  □ 4.2 Météo de Teyvat
  □ 4.3 Marchands Itinérants
  □ 4.4 Bannière Communautaire
  □ 4.5 Invasions de l'Abîme

PHASE 5 — Production
  □ 5.1 Déploiement global Discord
  □ 5.2 Monitoring et alertes
  □ 5.3 Backup MongoDB
  □ 5.4 Rate limiting anti-abus
  □ 5.5 Tests de charge
```

---

## CRITÈRES DE RÉUSSITE GLOBAUX

| Critère | Mesure | Cible |
|---------|--------|-------|
| Commandes qui répondent | % interactions répondues | 100% |
| Temps de réponse | Latence commande | < 2s |
| Disponibilité | Uptime Railway | > 99% |
| Erreurs silencieuses | Unhandled rejections/24h | 0 |
| Commandes chargées | Au démarrage | = Total défini |
| Satisfaction joueur | "L'app ne répond pas" | 0 occurrences |
