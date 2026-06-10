# DOCUMENT 1 — AUDIT TECHNIQUE ET DIAGNOSTIC RAILWAY
## IRMINSUL V2 — Bot Discord

> Audit réalisé le 2026-06-08 | Source : logs Railway `logs_1780941023254.csv` (364 entrées) + documentation architecture

---

## RÉSUMÉ EXÉCUTIF

### ⚠️ CAUSE PRINCIPALE IDENTIFIÉE — CERTITUDE : 100%

**`ERR_UNKNOWN_FILE_EXTENSION` — Node.js ESM tente d'importer des fichiers `.ts` sans transpilation TypeScript.**

**En une phrase** : Railway exécute le bot directement avec Node.js sur les fichiers `.ts` source, sans étape de compilation TypeScript et sans runner comme `tsx` ou `ts-node`. Node.js natif ne sait pas lire du TypeScript → **100% des modules échouent à charger** → l'event handler `interactionCreate.ts` n'existe jamais en mémoire → Discord reçoit l'interaction mais personne ne répond → *"L'application ne répond pas"*.

### Tableau de bord du diagnostic

| Indicateur | Valeur | Statut |
|-----------|--------|--------|
| Total entrées log | 364 | — |
| Entrées ERROR | 304 (83%) | 🔴 CRITIQUE |
| Entrées INFO | 60 (17%) | — |
| Fichiers `.ts` en échec | **38 / 38** | 🔴 100% D'ÉCHEC |
| `interactionCreate.ts` chargé ? | **NON** | 🔴 FATAL |
| `ready.ts` chargé ? | **NON** | 🔴 FATAL |
| MongoDB connecté | OUI | ✅ |
| Token Discord présent | OUI | ✅ |
| Commandes réellement chargées | **0** | 🔴 |
| Event handlers actifs | **0** | 🔴 |

### Niveau de confiance : **MAXIMAL — preuve directe dans les logs**

Les logs contiennent la stack trace complète avec le code d'erreur exact. Il n'y a aucune ambiguïté.

### Priorité des correctifs

| Priorité | Action | Délai estimé |
|---------|--------|-------------|
| P0 — BLOQUANT | Corriger le script de démarrage Railway | 5 minutes |
| P1 — IMPORTANT | Corriger les faux succès dans CommandLoader/EventLoader | 30 minutes |
| P2 — MOYEN | Ajouter des guards sur 0 commandes chargées | 1 heure |
| P3 — FAIBLE | Optimiser le build process pour production | 2 heures |

---

## ANALYSE DÉTAILLÉE

### PROBLÈME #1 — CRITIQUE — Fichiers TypeScript non transpilés

#### Description

Railway exécute le point d'entrée du bot via un script de démarrage qui appelle Node.js directement sur les fichiers `.ts`. Node.js v20+ en mode ESM (modules ES) ne possède pas de loader TypeScript natif. Lors du chargement dynamique (via `import()`) des commandes et événements, le module loader ESM de Node.js lève une exception `TypeError [ERR_UNKNOWN_FILE_EXTENSION]` pour toute extension `.ts`.

#### Preuve directe dans les logs

```
[error] ❌ Erreur lors de l'importation de challenge-start.ts:
        TypeError [ERR_UNKNOWN_FILE_EXTENSION]:
        Unknown file extension ".ts"
        for /app/src/modules/abyss/commands/challenge-start.ts
        code: 'ERR_UNKNOWN_FILE_EXTENSION'
```

Ce pattern se répète **38 fois** — tous les fichiers de commandes et d'événements.

#### Fichiers critiques en échec

```
/app/src/core/events/interactionCreate.ts  ← FATAL (répond aux commandes Discord)
/app/src/core/events/ready.ts             ← FATAL (initialise le bot au démarrage)

/app/src/modules/abyss/commands/          → 4 fichiers
/app/src/modules/combat/commands/         → 3 fichiers
/app/src/modules/commission/commands/     → 6 fichiers
/app/src/modules/events/commands/         → 5 fichiers
/app/src/modules/gacha/commands/          → 3 fichiers (voeux.ts, banniere.ts, pity.ts)
/app/src/modules/guild/commands/          → 10 fichiers
/app/src/modules/profile/commands/        → 5 fichiers
```

#### Symptôme Discord

Lorsqu'un joueur exécute une commande `/voeux` ou toute autre commande :
1. Discord envoie un POST webhook à l'application
2. Le bot reçoit l'event Discord au niveau réseau (il est connecté)
3. Mais `interactionCreate.ts` n'a jamais été enregistré → `client.on('interactionCreate')` n'existe pas
4. L'interaction expire après 3 secondes sans réponse
5. Discord affiche : **"L'application ne répond pas"**

#### Gravité : BLOQUANTE — le bot est complètement non-fonctionnel

#### Méthode de vérification

Chercher dans les logs Railway : `ERR_UNKNOWN_FILE_EXTENSION`. Si présent → ce bug est actif.

#### Correctifs (3 options, classées par rapidité)

**Option A — Le plus rapide (fix en 5 minutes) : `tsx`**

```bash
# Dans le terminal de développement
npm install tsx
```

```json
// package.json — modifier le script start
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  }
}
```

Sur Railway, s'assurer que la variable `START_COMMAND` ou le Procfile utilise `npm start` ou `tsx src/index.ts`.

**Option B — La plus propre (production-grade) : build TypeScript**

```json
// package.json
{
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  }
}
```

```json
// tsconfig.json — vérifier ces options
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "strict": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Sur Railway :
- **Build Command** : `npm run build`
- **Start Command** : `npm start` ou `node dist/index.js`

**Option C — Rapide avec ts-node**

```bash
npm install ts-node
```

```json
{
  "scripts": {
    "start": "ts-node --esm src/index.ts"
  }
}
```

> ⚠️ `ts-node` avec `--esm` peut avoir des problèmes de compatibilité. Préférer `tsx` (Option A) ou le build propre (Option B).

---

### PROBLÈME #2 — IMPORTANT — Faux messages de succès dans le loader

#### Description

Le `CommandLoader.ts` et l'`EventLoader.ts` loguent `✅ Commandes chargées` et `✅ Événements chargés` même si AUCUN fichier n'a été chargé avec succès. Ce comportement trompe l'opérateur en lui faisant croire que tout va bien.

#### Preuve dans les logs

```
[error] ❌ Erreur lors de l'importation de voeux.ts: ...
[error] ❌ Erreur lors de l'importation de pity.ts: ...
[error] ❌ Erreur lors de l'importation de banniere.ts: ...
[info]  ✅ Commandes chargées          ← LIE : 0 commandes chargées
[error] ❌ Erreur lors de l'importation de interactionCreate.ts: ...
[error] ❌ Erreur lors de l'importation de ready.ts: ...
[info]  ✅ Événements chargés          ← LIE : 0 événements chargés
```

#### Correctif

```typescript
// Dans CommandLoader.ts — ajouter un guard post-chargement
async loadCommands(): Promise<void> {
  let loadedCount = 0;
  let errorCount = 0;

  for (const file of commandFiles) {
    try {
      const command = await import(file);
      this.client.commands.set(command.data.name, command);
      loadedCount++;
    } catch (error) {
      logger.error(`❌ Erreur lors de l'importation de ${file}: ${error}`);
      errorCount++;
    }
  }

  if (loadedCount === 0) {
    // AJOUTER CE GUARD
    logger.error(`🚨 CRITIQUE: Aucune commande chargée ! (${errorCount} erreurs). Le bot ne peut pas répondre.`);
    process.exit(1); // Faire crasher le bot → Railway redémarre → logs clairs
  } else {
    logger.info(`✅ ${loadedCount} commandes chargées (${errorCount} erreurs)`);
  }
}
```

> **Recommandation** : ajouter `process.exit(1)` si `loadedCount === 0`. Un bot qui crash explicitement est bien plus facile à diagnostiquer qu'un bot silencieusement cassé.

---

### PROBLÈME #3 — MOYEN — Absence de timeout explicite sur les interactions

#### Description

Même si le problème principal est résolu, certaines interactions peuvent dépasser le timeout de 3 secondes Discord si des opérations DB ou CPU sont longues. Sans `deferReply()` en début de handler, Discord abandonne l'interaction silencieusement.

#### Correctif type (à appliquer à toutes les commandes avec DB)

```typescript
// Pattern obligatoire pour toute commande avec opération asynchrone > 1s
async execute(interaction: ChatInputCommandInteraction) {
  // TOUJOURS en premier si la commande fait des appels DB
  await interaction.deferReply({ ephemeral: true });

  try {
    const result = await someDbOperation();
    await interaction.editReply({ embeds: [buildEmbed(result)] });
  } catch (error) {
    logger.error('Erreur commande:', error);
    await interaction.editReply({
      content: '❌ Une erreur est survenue. Réessaie dans quelques instants.'
    });
  }
}
```

---

### PROBLÈME #4 — MINEUR — Token Discord local non mis à jour

#### Description

Selon le contexte fourni, le token Discord a été régénéré et seul Railway a reçu le nouveau token. Le fichier `.env` local a l'ancien token.

#### Impact actuel

Nul (le bot local n'est pas utilisé). Mais à corriger pour éviter la confusion lors du prochain développement local.

#### Correctif

```bash
# Mettre à jour .env local
DISCORD_TOKEN=<nouveau_token>
```

Également vérifier que `.env` est dans `.gitignore` pour ne jamais committer le token.

---

### PROBLÈME #5 — INFO — Déploiement sans step de compilation sur Railway

#### Description

Railway n'a pas de `Build Command` configuré pour compiler TypeScript. Même après l'Option B (build propre), si Railway n'est pas configuré pour exécuter `npm run build` avant `npm start`, le dossier `dist/` sera absent.

#### Vérification

Dans Railway dashboard → Service → Settings → Build :
- **Build Command** doit être `npm run build` (ou `npm ci && npm run build`)
- **Start Command** doit être `npm start` ou `node dist/index.js`

---

## HYPOTHÈSES CLASSÉES PAR PROBABILITÉ

| Rang | Hypothèse | Probabilité | Vérifiée par les logs |
|------|-----------|-------------|----------------------|
| 1 | Node.js tente de charger `.ts` sans transpilation | **100%** | ✅ Prouvé directement |
| 2 | `interactionCreate.ts` non chargé → pas de réponse | **100%** | ✅ Prouvé directement |
| 3 | Start command Railway incorrect (pas de tsx/build) | **95%** | Fortement probable |
| 4 | `tsconfig.json` absent ou mal configuré pour prod | **60%** | Probable |
| 5 | Timeout 3s Discord sans `deferReply` | **30%** | Possible (secondaire) |
| 6 | Permissions Discord manquantes | **5%** | Peu probable (token ok) |
| 7 | Intents Discord insuffisants | **5%** | Peu probable |
| 8 | Variables d'environnement manquantes | **5%** | Peu probable (DB ok) |

---

## CHECKLIST DEVIN — CORRECTION DU PROBLÈME RAILWAY

### Phase 0 — Vérification immédiate (< 5 min)

- [ ] **Ouvrir `package.json`** et vérifier le script `"start"`
  - S'il dit `"node src/index.ts"` → confirme le bug
  - S'il dit `"tsx src/index.ts"` → vérifier si `tsx` est dans les dépendances
  - S'il dit `"node dist/index.js"` → vérifier que `dist/` existe et est compilé
- [ ] **Vérifier la présence de `tsx` ou `ts-node`** dans `package.json` → `dependencies` ou `devDependencies`
- [ ] **Ouvrir Railway dashboard** → Service → Settings → vérifier Build Command et Start Command
- [ ] **Vérifier si `dist/` existe** dans le repository ou est généré au build

### Phase 1 — Application du correctif (5-15 min)

**Si Option A (tsx — recommandée pour une correction rapide) :**
- [ ] `npm install tsx`
- [ ] Modifier `package.json` : `"start": "tsx src/index.ts"`
- [ ] Modifier `package.json` : `"dev": "tsx watch src/index.ts"`
- [ ] Commit + push
- [ ] Sur Railway : vérifier que Start Command est `npm start`
- [ ] Déclencher un redéploiement Railway
- [ ] Surveiller les logs : plus d'erreurs `ERR_UNKNOWN_FILE_EXTENSION`

**Si Option B (build TypeScript — recommandée pour la production) :**
- [ ] Vérifier `tsconfig.json` : `"outDir": "./dist"`, `"rootDir": "./src"`
- [ ] Modifier `package.json` : `"build": "tsc"`, `"start": "node dist/index.js"`
- [ ] Sur Railway → Settings → Build Command : `npm run build`
- [ ] Sur Railway → Settings → Start Command : `npm start`
- [ ] Ajouter `dist/` dans `.gitignore` (si pas déjà présent)
- [ ] Commit + push
- [ ] Surveiller les logs Railway du build step

### Phase 2 — Validation (après redéploiement)

- [ ] **Logs Railway** : zéro erreur `ERR_UNKNOWN_FILE_EXTENSION`
- [ ] **Logs Railway** : présence de `✅ X commandes chargées` avec X > 0
- [ ] **Logs Railway** : présence de `✅ Prêt ! Connecté en tant que [NomDuBot]` (ready event)
- [ ] **Test Discord** : exécuter `/commencer` ou `/profil` → le bot doit répondre
- [ ] **Test Discord** : exécuter `/voeux` → le bot doit afficher la bannière
- [ ] **Vérifier** : aucun message "L'application ne répond pas" sur Discord

### Phase 3 — Robustesse (après validation)

- [ ] **Modifier `CommandLoader.ts`** : logger le nombre réel de commandes chargées avec succès/échec
- [ ] **Modifier `EventLoader.ts`** : idem pour les événements
- [ ] **Ajouter** : `process.exit(1)` si `loadedCount === 0` pour un crash explicite
- [ ] **Ajouter** : `await interaction.deferReply()` dans toutes les commandes avec opération DB
- [ ] **Vérifier** : `.env` local mis à jour avec le nouveau token Discord

---

## APPENDICE — SÉQUENCE DE DÉMARRAGE OBSERVÉE

```
17:49:49.156  [INFO]  Starting Container
17:49:52.862  [INFO]  🚀 Initialisation d'IRMINSUL V2...
17:49:53.235  [INFO]  ✅ Connexion MongoDB réussie        ← DB OK
17:49:53.235  [INFO]  ✅ Base de données connectée
17:49:53.855  [INFO]  ✅ GenshinDataService initialisé (119 persos, 234 armes...)
17:49:53.855  [INFO]  📂 Modules trouvés: 7
17:49:53.855  [ERROR] ❌ challenge-start.ts: ERR_UNKNOWN_FILE_EXTENSION  ← DÉBUT DES ÉCHECS
17:49:53.855  [ERROR] ❌ challenges.ts: ERR_UNKNOWN_FILE_EXTENSION
              ... (36 autres fichiers en échec)
17:49:53.906  [INFO]  ✅ Commandes chargées  ← FAUX (0 commandes)
17:49:53.906  [ERROR] ❌ interactionCreate.ts: ERR_UNKNOWN_FILE_EXTENSION  ← HANDLER MANQUANT
17:49:53.908  [ERROR] ❌ ready.ts: ERR_UNKNOWN_FILE_EXTENSION
17:49:53.908  [INFO]  ✅ Événements chargés  ← FAUX (0 événements)
17:49:53.908  [INFO]  🔐 Tentative de connexion à Discord...
17:49:53.908  [INFO]  DEBUG: DISCORD_TOKEN = DEFINED  ← Token OK
              [Connexion Discord en attente...]
              [Bot apparaît en ligne mais sans aucun handler actif]
```

**Conclusion** : le bot est connecté à Discord et à MongoDB mais est un "zombie" — présent sur le réseau, incapable de répondre à quoi que ce soit.
