# DOC 3 — RAILWAY FIX PLAN ÉTAPE PAR ÉTAPE
## IRMINSUL V2 — Changements précis fichier par fichier

> Chaque section correspond à un fichier à modifier. L'ordre des sections = l'ordre d'exécution.

---

## §1 — TSCONFIG.JSON (remplacer intégralement)

C'est le fichier le plus critique. La tentative 5 de Devin a échoué parce que `include` ne couvrait pas `src/modules`. Ce nouveau tsconfig couvre l'intégralité de `src/`.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": false,
    "removeComments": false,
    "forceConsistentCasingInFileNames": true,
    "allowImportingTsExtensions": false
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.spec.ts",
    "**/*.test.ts"
  ]
}
```

**Points importants :**
- `"module": "NodeNext"` — ESM moderne, compatible Railway + Node 20+
- `"outDir": "./dist"` — tout le compilé va dans `dist/`
- `"rootDir": "./src"` — mirroring exact `src/X` → `dist/X`
- `"include": ["src/**/*"]` — inclut `src/modules/`, la ligne qui manquait
- `"strict": false` — évite que des erreurs de type bloquent le build
- `"allowImportingTsExtensions": false` — empêche d'importer des `.ts` depuis du `.ts` via extension explicite (force la convention `.js`)

---

## §2 — PACKAGE.JSON (scripts + dépendances)

**Remplacer uniquement la section `scripts` et ajuster les dépendances :**

```json
{
  "scripts": {
    "dev":            "tsx watch src/index.ts",
    "build":          "tsc",
    "start":          "node dist/index.js",
    "clean":          "rm -rf dist/",
    "rebuild":        "npm run clean && npm run build",
    "deploy-commands":"node dist/scripts/deploy-commands.js",
    "typecheck":      "tsc --noEmit"
  }
}
```

**Déplacer `tsx` de `dependencies` vers `devDependencies` :**

```json
{
  "dependencies": {
    "discord.js":   "^14.x",
    "mongoose":     "^8.x",
    "ioredis":      "^5.x",
    "bullmq":       "^5.x",
    "pino":         "^9.x",
    "pino-pretty":  "^11.x",
    "zod":          "^3.x"
  },
  "devDependencies": {
    "tsx":            "^4.7.0",
    "typescript":     "^5.4.0",
    "@types/node":    "^20.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm":  ">=10.0.0"
  },
  "type": "module"
}
```

**Note :** Ne pas modifier les numéros de version de vos packages existants. Adapter en conservant les versions actuelles.

---

## §3 — .NVMRC (créer à la racine)

```
20.11.0
```

Un seul fichier, une seule ligne. Railway le lit pour sélectionner la version Node.js lors du build Nixpacks.

---

## §4 — CODEMOD : AJOUTER .JS AUX IMPORTS RELATIFS

Cette étape migre tous les imports relatifs vers la convention NodeNext (`./Foo.js` au lieu de `./Foo`). À exécuter **une seule fois** sur tout le projet.

**Commande à exécuter depuis la racine du projet :**

```bash
# Script de migration — ajoute .js à tous les imports relatifs sans extension
find src -name "*.ts" ! -name "*.d.ts" | while read file; do
  # Ajoute .js aux from '.../..' sans extension (évite les doublons .js.js)
  perl -i -pe "s|from '(\.[^']+(?<!\.js)(?<!\.json)(?<!\.mjs))'|from '\1.js'|g" "$file"
  # Ajoute .js aux import('...') dynamiques sans extension
  perl -i -pe "s|import\('(\.[^']+(?<!\.js)(?<!\.json)(?<!\.mjs))'\)|import('\1.js')|g" "$file"
done

echo "Migration terminée. Vérification des doublons..."
grep -rn "\.js\.js" src/ && echo "⚠️ Doublons trouvés — corriger manuellement" || echo "✅ Aucun doublon"
```

**Vérification post-codemod :**

```bash
# Doit retourner 0 résultats (aucun import relatif sans .js)
grep -rn "from '\.\." src/ | grep -v "\.js'" | grep -v "\.json'"
grep -rn "from '\." src/ | grep -v "\.js'" | grep -v "\.json'" | grep -v "node_modules"
```

**Cas particuliers à vérifier manuellement :**

```typescript
// Imports de fichiers .json → garder .json, ne pas changer
import data from '../data/characters.json';     // ✅ ok tel quel

// Imports de packages npm → jamais touchés par le codemod
import { Client } from 'discord.js';            // ✅ ok tel quel

// Re-exports avec * → vérifier que le .js est bien ajouté
export * from './types.js';                     // ✅ doit avoir .js
```

---

## §5 — SRC/CORE/COMMANDLOADER.TS (réécriture du loader)

Remplacer le corps de la méthode `loadCommands()` par cette implémentation environnement-aware :

```typescript
import { readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

export class CommandLoader {
  // ... constructor existant conservé ...

  async loadCommands(): Promise<void> {
    // AUTO-DÉTECTION : src/ en dev (.ts), dist/ en prod (.js)
    const currentFile = fileURLToPath(import.meta.url);
    const coreDir    = dirname(currentFile);
    const rootDir    = dirname(coreDir);              // src/ ou dist/
    const fileExt    = extname(currentFile);          // .ts ou .js
    const modulesPath = join(rootDir, 'modules');

    logger.info(`📂 Chargement depuis: ${modulesPath} (ext: ${fileExt})`);

    let loadedCount = 0;
    let errorCount  = 0;
    let totalFiles  = 0;

    // Lister les dossiers de modules
    let moduleDirs: string[];
    try {
      moduleDirs = readdirSync(modulesPath).filter(f => {
        try { return statSync(join(modulesPath, f)).isDirectory(); }
        catch { return false; }
      });
    } catch {
      logger.error(`🚨 Dossier modules introuvable: ${modulesPath}`);
      process.exit(1);
    }

    logger.info(`📂 Modules trouvés: ${moduleDirs.length}`);

    for (const moduleDir of moduleDirs) {
      const commandsPath = join(modulesPath, moduleDir, 'commands');
      let commandFiles: string[];

      try {
        commandFiles = readdirSync(commandsPath).filter(f =>
          f.endsWith(fileExt) && !f.includes('.d.')
        );
      } catch {
        continue; // Module sans dossier commands — pas une erreur
      }

      logger.info(`📂 Dossier ${moduleDir}/commands: ${commandFiles.length} fichiers`);

      for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        totalFiles++;

        try {
          const fileUrl = pathToFileURL(filePath).href;
          const mod     = await import(fileUrl);
          const command = mod.default ?? mod;

          if (!command?.data?.name || typeof command.execute !== 'function') {
            logger.warn(`⚠️ Structure invalide (data.name ou execute manquant): ${file}`);
            errorCount++;
            continue;
          }

          this.client.commands.set(command.data.name, command);
          logger.debug(`✅ Importé: ${command.data.name}`);
          loadedCount++;

        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          const errCode = (error as NodeJS.ErrnoException).code ?? 'UNKNOWN';
          logger.error(`❌ Erreur lors de l'importation de ${file}: [${errCode}] ${errMsg}`);
          errorCount++;
        }
      }
    }

    // GUARD ANTI-ZOMBIE — ne jamais mentir sur l'état réel
    if (loadedCount === 0) {
      logger.error(`🚨 CRITIQUE: 0 commandes chargées sur ${totalFiles} tentées (${errorCount} erreurs)`);
      logger.error(`🚨 modulesPath=${modulesPath} | ext=${fileExt}`);
      logger.error(`🚨 Le bot ne peut pas fonctionner sans commandes. Arrêt forcé.`);
      process.exit(1);
    }

    logger.info(`✅ Commandes chargées: ${loadedCount}/${totalFiles} (${errorCount} erreurs)`);
  }
}
```

---

## §6 — SRC/CORE/EVENTLOADER.TS (réécriture du loader)

Même logique environnement-aware que CommandLoader :

```typescript
import { readdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

export class EventLoader {
  // ... constructor existant conservé ...

  async loadEvents(): Promise<void> {
    // AUTO-DÉTECTION : même mécanique que CommandLoader
    const currentFile = fileURLToPath(import.meta.url);
    const coreDir    = dirname(currentFile);
    const fileExt    = extname(currentFile);           // .ts ou .js
    const eventsPath = join(coreDir, 'events');        // core/events/ = toujours relatif à core/

    logger.info(`📂 Chargement événements depuis: ${eventsPath} (ext: ${fileExt})`);

    let eventFiles: string[];
    try {
      eventFiles = readdirSync(eventsPath).filter(f =>
        f.endsWith(fileExt) && !f.includes('.d.')
      );
    } catch {
      logger.error(`🚨 Dossier events introuvable: ${eventsPath}`);
      process.exit(1);
    }

    let loadedCount = 0;
    let errorCount  = 0;

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      try {
        const fileUrl = pathToFileURL(filePath).href;
        const mod     = await import(fileUrl);
        const event   = mod.default ?? mod;

        if (!event?.name || typeof event.execute !== 'function') {
          logger.warn(`⚠️ Événement invalide (name ou execute manquant): ${file}`);
          errorCount++;
          continue;
        }

        if (event.once) {
          this.client.once(event.name, (...args: unknown[]) => event.execute(...args));
        } else {
          this.client.on(event.name, (...args: unknown[]) => event.execute(...args));
        }

        logger.debug(`✅ Événement enregistré: ${event.name}`);
        loadedCount++;

      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error(`❌ Erreur lors de l'importation de ${file}: ${errMsg}`);
        errorCount++;
      }
    }

    if (loadedCount === 0) {
      logger.error(`🚨 CRITIQUE: 0 événements chargés (${errorCount} erreurs)`);
      logger.error(`🚨 Sans interactionCreate, aucune commande Discord ne peut répondre.`);
      process.exit(1);
    }

    logger.info(`✅ Événements chargés: ${loadedCount}/${eventFiles.length} (${errorCount} erreurs)`);
  }
}
```

---

## §7 — SRC/INDEX.TS — NETTOYAGE OBLIGATOIRE

**Supprimer toute tentative de hook tsx** laissée par les tentatives précédentes.

Chercher et supprimer dans `src/index.ts` ces blocs s'ils existent :

```typescript
// ❌ SUPPRIMER — toute variante de register tsx
import { register } from 'tsx/esm/api';
const unregister = register();

// ❌ SUPPRIMER
import { install } from 'tsx/esm';
install();

// ❌ SUPPRIMER
const tsxEsm = await import('tsx/esm/api');
tsxEsm.register();

// ❌ SUPPRIMER — toute ligne touchant tsx au runtime
```

`src/index.ts` doit démarrer proprement, sans aucune dépendance à tsx :

```typescript
// src/index.ts — structure attendue après nettoyage
import { Bootstrap } from './core/Bootstrap.js';
import { logger }    from './utils/logger.js';

process.on('unhandledRejection', (reason: unknown) => {
  logger.error({
    event: 'unhandled_rejection',
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error({ event: 'uncaught_exception', message: error.message, stack: error.stack });
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('📴 SIGTERM — arrêt propre...');
  // cleanup si nécessaire
  process.exit(0);
});

await Bootstrap.start();
```

---

## §8 — .GITIGNORE (vérifier que dist/ est exclu)

```gitignore
# Doit contenir ces lignes
node_modules/
dist/
.env
*.log
.DS_Store
```

Si `dist/` a été committé lors d'une tentative précédente, le retirer du tracking :

```bash
git rm -r --cached dist/
git add .gitignore
git commit -m "chore: remove dist/ from git tracking"
```

---

## §9 — RAILWAY.TOML (remplacer intégralement)

```toml
# railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build"

[deploy]
startCommand = "node dist/index.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```

**Lignes critiques :**
- `buildCommand = "npm ci && npm run build"` → Railway exécute `tsc` avant de démarrer
- `startCommand = "node dist/index.js"` → Node.js pur, zéro tsx

**⚠️ Vérifier aussi Railway Dashboard :**
`Service → Settings → Build` — si un `Build Command` ou `Start Command` est défini dans le dashboard Railway, **il prévaut sur `railway.toml`**. S'assurer que le dashboard est configuré de façon cohérente ou **vider les champs** pour laisser `railway.toml` faire autorité.

---

## §10 — VARIABLES RAILWAY (nettoyage)

Dans `Service → Variables`, **supprimer** ces variables si elles ont été ajoutées lors des tentatives précédentes :

```
NODE_OPTIONS   (toute valeur contenant --import, --loader, tsx)
NPM_FLAGS      (toute valeur liée aux tentatives précédentes)
```

**Variables qui doivent rester :**

```
DISCORD_TOKEN      = <le token Discord actuel, valide>
DISCORD_CLIENT_ID  = <client ID application Discord>
DISCORD_GUILD_ID   = <guild ID pour tests — optionnel>
MONGODB_URI        = <URI MongoDB Atlas>
REDIS_URL          = <URI Redis — si activé>
NODE_ENV           = production
LOG_LEVEL          = info
```

---

## §11 — VÉRIFICATION BUILD LOCALE AVANT PUSH

Avant tout commit, valider que la compilation fonctionne en local :

```bash
# Depuis la racine du projet
npm run clean          # Supprime dist/
npm run build          # Lance tsc

# Vérifications immédiates
echo "=== dist/ existe ?"
ls -la dist/

echo "=== dist/modules/ contient les bons dossiers ?"
ls dist/modules/
# Attendu : abyss  combat  commission  events  gacha  guild  profile

echo "=== dist/modules/gacha/commands/ contient des .js ?"
ls dist/modules/gacha/commands/
# Attendu : voeux.js  banniere.js  pity.js

echo "=== dist/core/events/ contient les handlers critiques ?"
ls dist/core/events/
# Attendu : interactionCreate.js  ready.js

# Test de démarrage complet
node dist/index.js
# Attendu dans les logs :
#   ✅ Connexion MongoDB réussie
#   ✅ 36/36 commandes chargées
#   ✅ 2/2 événements chargés
#   ✅ Prêt ! Connecté en tant que [NomBot]
```

**Si `dist/modules/` est vide** → le tsconfig `include` n'est pas appliqué. Vérifier que `tsconfig.json` contient bien `"include": ["src/**/*"]` et relancer `npm run build`.

**Si des erreurs TypeScript bloquent le build** → `"strict": false` est dans le tsconfig, donc les erreurs de type ne devraient pas bloquer. Si elles bloquent quand même, chercher des erreurs de syntaxe réelles (import circulaire, fichier malformé) dans l'output de `tsc`.

---

## RÉCAPITULATIF DES FICHIERS MODIFIÉS

| Fichier | Action | Criticité |
|---|---|---|
| `tsconfig.json` | Remplacement complet | 🔴 Bloquant |
| `package.json` | Scripts + deps réorganisés | 🔴 Bloquant |
| `src/core/CommandLoader.ts` | Réécriture loader env-aware | 🔴 Bloquant |
| `src/core/EventLoader.ts` | Réécriture loader env-aware | 🔴 Bloquant |
| `railway.toml` | Remplacement complet | 🔴 Bloquant |
| `src/index.ts` | Nettoyage tsx hooks | 🔴 Bloquant |
| Tous `src/**/*.ts` | Codemod extensions .js | 🟡 Nécessaire |
| `.nvmrc` | Création | 🟡 Recommandé |
| `.gitignore` | Vérification + dist/ | 🟡 Recommandé |
| Railway Variables | Nettoyage NODE_OPTIONS | 🟡 Recommandé |
