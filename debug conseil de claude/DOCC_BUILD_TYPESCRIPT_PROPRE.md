# DOC C — BUILD TYPESCRIPT PROPRE
## IRMINSUL V2 — La solution définitive sans tsx en runtime

> Solution recommandée pour la production
> Compile TypeScript → JavaScript → Railway exécute du JS pur, zéro dépendance runtime

---

## POURQUOI C'EST LA BONNE SOLUTION LONG TERME

```
AVANT (approche actuelle) :
  Railway → npm start → tsx src/index.ts → tsx transpile .ts à la volée
  Problème : tsx doit intercepter TOUS les imports dynamiques (complexe)

APRÈS (cette approche) :
  Railway → npm run build → tsc → génère dist/*.js
  Railway → npm start → node dist/index.js → Node.js natif lit du JS pur
  Aucune dépendance tsx en runtime. Aucun hook. Aucune magie.
```

C'est comme ça que tous les projets TypeScript Node.js sérieux fonctionnent en production.

---

## DIAGNOSTIC INITIAL — POURQUOI LA COMPILATION AVAIT ÉCHOUÉ

La tentative 5 de Devin ("charger depuis dist/") a échoué parce que **`dist/modules/` était vide**. La cause : le `tsconfig.json` n'incluait pas `src/modules/` dans sa compilation.

**Preuve :** "Les fichiers dans src/modules ne sont pas compilés dans dist/modules."

C'est le seul vrai problème de la compilation. Il se règle en une ligne dans tsconfig.json.

---

## ÉTAPE 1 — AUDITER LE TSCONFIG.JSON ACTUEL

Ouvrir `tsconfig.json` à la racine du projet et vérifier :

```bash
# Afficher le tsconfig actuel
cat tsconfig.json
```

**Chercher ces points précis :**

```json
// ❌ Si vous voyez ça → c'est le bug :
"include": ["src/core/**/*", "src/services/**/*"]
// src/modules n'est pas inclus → dist/modules restera vide

// ❌ Ou si le champ include est absent complètement
// → par défaut TypeScript compile TOUT mais peut exclure des choses

// ❌ Si exclude contient "src/modules"
"exclude": ["node_modules", "src/modules"]
// → modules exclus de la compilation
```

---

## ÉTAPE 2 — ÉCRIRE LE TSCONFIG.JSON CORRECT

**Remplacer le contenu de tsconfig.json par exactement ceci :**

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
    "removeComments": true,
    "forceConsistentCasingInFileNames": true
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

**La ligne critique :** `"include": ["src/**/*"]` — inclut TOUS les fichiers TypeScript sous src/, y compris src/modules/.

### Pourquoi "module": "NodeNext" ?

NodeNext est le réglage correct pour Node.js moderne avec ESM. Il force TypeScript à utiliser les extensions `.js` dans les imports (même pour les fichiers .ts sources).

---

## ÉTAPE 3 — CORRIGER LES IMPORTS DANS LES FICHIERS SOURCE

**Le problème avec `"module": "NodeNext"` :** TypeScript exige que les imports utilisent l'extension `.js` (même si le fichier source est `.ts`). C'est contre-intuitif mais c'est la norme ESM.

**Trouver et corriger tous les imports :**

```bash
# Trouver tous les imports sans extension .js dans src/
grep -rn "from '\.\." src/ | grep -v "\.js'" | grep -v "\.json'" | grep -v "node_modules"
grep -rn "from '\." src/ | grep -v "\.js'" | grep -v "\.json'" | grep -v "node_modules"
```

**Exemple de correction :**

```typescript
// ❌ AVANT (manque l'extension .js)
import { UserRepository } from '../database/repositories/UserRepository';
import { logger } from '../../utils/logger';
import { GachaEngine } from './GachaEngine';

// ✅ APRÈS (avec extension .js obligatoire pour NodeNext)
import { UserRepository } from '../database/repositories/UserRepository.js';
import { logger } from '../../utils/logger.js';
import { GachaEngine } from './GachaEngine.js';
```

**⚠️ IMPORTANT :** On écrit `.js` même si le fichier est `.ts`. TypeScript sait que `.js` correspond au fichier `.ts` compilé.

### Script de migration automatique

Ce script trouve et corrige automatiquement tous les imports relatifs :

```bash
# Depuis la racine du projet
# Ajoute .js aux imports relatifs qui n'ont pas d'extension
find src -name "*.ts" ! -name "*.d.ts" -exec sed -i \
  "s/from '\(\.\.\/[^']*\)'\([^\.]\)/from '\1.js'\2/g; \
   s/from '\(\.[^']*\)'\([^\.]\)/from '\1.js'\2/g" {} \;

# Vérifier manuellement après (le sed peut avoir des cas limites)
# Chercher les doublons .js.js créés par accident
grep -rn "\.js\.js" src/
# Si trouvés : sed -i "s/\.js\.js/.js/g" src/**/*.ts
```

**Alternative manuelle (plus sûre) :** VSCode → Search & Replace avec Regex :
```
Chercher  : from '(\.{1,2}/[^'.]+)'
Remplacer : from '$1.js'
```

### Cas où l'extension est déjà présente

Si certains imports ont déjà `.js`, ne pas doubler. Le grep ci-dessus les ignorera.

---

## ÉTAPE 4 — CORRIGER COMMANDLOADER ET EVENTLOADER POUR DIST/

Une fois compilé, les fichiers seront des `.js` dans `dist/`. Les loaders doivent chercher dans `dist/`, pas `src/`.

**La solution propre : détecter l'environnement via `import.meta.url` :**

```typescript
// src/core/CommandLoader.ts — VERSION PRODUCTION CORRECTE
import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

export class CommandLoader {
  async loadCommands(): Promise<void> {
    // Détecter si on tourne depuis src/ ou dist/
    // import.meta.url pointe vers ce fichier lui-même
    const currentFile = fileURLToPath(import.meta.url);
    const coreDir = dirname(currentFile);
    const srcOrDist = dirname(coreDir); // remonte de core/ vers src/ ou dist/

    // En prod: /app/dist/core/CommandLoader.js → /app/dist/modules/
    // En dev:  /app/src/core/CommandLoader.ts  → /app/src/modules/
    const modulesPath = join(srcOrDist, 'modules');
    const fileExt = currentFile.endsWith('.js') ? '.js' : '.ts';

    logger.info(`📂 Chargement commandes depuis: ${modulesPath} (ext: ${fileExt})`);

    let loadedCount = 0;
    let errorCount = 0;
    let totalFiles = 0;

    let moduleDirs: string[];
    try {
      moduleDirs = readdirSync(modulesPath).filter(f => {
        try { return statSync(join(modulesPath, f)).isDirectory(); }
        catch { return false; }
      });
    } catch (e) {
      logger.error(`🚨 Impossible de lire le dossier modules: ${modulesPath}`);
      process.exit(1);
    }

    for (const moduleDir of moduleDirs) {
      const commandsPath = join(modulesPath, moduleDir, 'commands');
      let commandFiles: string[];
      try {
        commandFiles = readdirSync(commandsPath).filter(f =>
          f.endsWith(fileExt) && !f.endsWith('.d.ts') && !f.endsWith('.d.js')
        );
      } catch {
        continue; // Ce module n'a pas de dossier commands
      }

      for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        totalFiles++;
        try {
          const fileUrl = pathToFileURL(filePath).href;
          // Cache-busting en prod (évite les modules stale)
          const urlWithCache = fileExt === '.js' ? `${fileUrl}?v=${Date.now()}` : fileUrl;
          const mod = await import(urlWithCache);

          const command = mod.default || mod;
          if (!command?.data?.name || typeof command.execute !== 'function') {
            logger.warn(`⚠️ Structure invalide: ${file} (manque data.name ou execute)`);
            errorCount++;
            continue;
          }

          this.client.commands.set(command.data.name, command);
          loadedCount++;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logger.error(`❌ Import échoué [${file}]: ${errMsg}`);
          // Afficher la stack trace complète pour debug
          if (error instanceof Error && error.stack) {
            logger.error(error.stack.split('\n').slice(0, 5).join('\n'));
          }
          errorCount++;
        }
      }
    }

    if (loadedCount === 0) {
      logger.error(`🚨 CRITIQUE: 0/${totalFiles} commandes chargées (${errorCount} erreurs)`);
      logger.error(`🚨 Modules path: ${modulesPath} | Extension: ${fileExt}`);
      process.exit(1);
    }

    logger.info(`✅ ${loadedCount}/${totalFiles} commandes chargées (${errorCount} erreurs)`);
  }
}
```

**EventLoader.ts — même approche :**

```typescript
// src/core/EventLoader.ts — VERSION PRODUCTION CORRECTE
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

export class EventLoader {
  async loadEvents(): Promise<void> {
    const currentFile = fileURLToPath(import.meta.url);
    const coreDir = dirname(currentFile);
    const fileExt = currentFile.endsWith('.js') ? '.js' : '.ts';
    const eventsPath = join(coreDir, 'events'); // core/events/ relatif à core/

    logger.info(`📂 Chargement événements depuis: ${eventsPath}`);

    let eventFiles: string[];
    try {
      eventFiles = readdirSync(eventsPath).filter(f =>
        f.endsWith(fileExt) && !f.endsWith('.d.ts') && !f.endsWith('.d.js')
      );
    } catch (e) {
      logger.error(`🚨 Dossier events introuvable: ${eventsPath}`);
      process.exit(1);
    }

    let loadedCount = 0;
    let errorCount = 0;

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      try {
        const fileUrl = pathToFileURL(filePath).href;
        const mod = await import(fileUrl);
        const event = mod.default || mod;

        if (!event?.name || typeof event.execute !== 'function') {
          logger.warn(`⚠️ Événement invalide: ${file}`);
          errorCount++;
          continue;
        }

        if (event.once) {
          this.client.once(event.name, (...args: unknown[]) => event.execute(...args));
        } else {
          this.client.on(event.name, (...args: unknown[]) => event.execute(...args));
        }
        loadedCount++;
      } catch (error) {
        logger.error(`❌ Événement échoué [${file}]: ${error instanceof Error ? error.message : error}`);
        errorCount++;
      }
    }

    if (loadedCount === 0) {
      logger.error(`🚨 CRITIQUE: 0/${eventFiles.length} événements chargés (${errorCount} erreurs)`);
      process.exit(1);
    }

    logger.info(`✅ ${loadedCount}/${eventFiles.length} événements chargés (${errorCount} erreurs)`);
  }
}
```

---

## ÉTAPE 5 — METTRE À JOUR PACKAGE.JSON

```json
{
  "name": "irminsul-v2",
  "version": "2.0.0",
  "type": "module",
  "engines": {
    "node": ">=20.6.0",
    "npm": ">=10.0.0"
  },
  "scripts": {
    "dev":   "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "clean": "rm -rf dist/",
    "rebuild": "npm run clean && npm run build"
  },
  "dependencies": {
    "tsx": "^4.7.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0"
  }
}
```

**Points importants :**
- `tsx` reste en `dependencies` (utilisé pour le dev avec `npm run dev`)
- `start` utilise maintenant `node dist/index.js` — Node.js pur, aucun transpileur
- `engines` spécifie Node.js 20+ pour Railway

---

## ÉTAPE 6 — CONFIGURER RAILWAY BUILD COMMAND

**Sur Railway Dashboard :**
→ Service → Settings → Build

```
Build Command : npm ci && npm run build
Start Command : npm start
```

**OU via railway.toml :**

```toml
# railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build"

[deploy]
startCommand = "node dist/index.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

---

## ÉTAPE 7 — AJOUTER DIST/ DANS .GITIGNORE

```gitignore
# .gitignore — vérifier que ces lignes existent
node_modules/
dist/
.env
*.log
```

Le dossier `dist/` est généré par Railway lors du build — ne pas le committer.

---

## ÉTAPE 8 — TEST LOCAL COMPLET

```bash
# 1. Nettoyer
rm -rf dist/ node_modules/
npm install

# 2. Builder
npm run build

# 3. Vérifier que dist/ contient bien les modules
ls dist/modules/
# Doit afficher : abyss/ combat/ commission/ events/ gacha/ guild/ profile/ ...

ls dist/modules/gacha/commands/
# Doit afficher : voeux.js banniere.js pity.js ...

# 4. Démarrer
npm start

# Résultats attendus :
# ✅ Connexion MongoDB réussie
# 📂 Chargement commandes depuis: /chemin/dist/modules (ext: .js)
# ✅ 36/36 commandes chargées (0 erreurs)
# ✅ 2/2 événements chargés (0 erreurs)
# ✅ Prêt ! Connecté en tant que [NomBot]
```

---

## PROBLÈMES COURANTS ET SOLUTIONS

### Erreur : Cannot find module './SomeFile.js' (import path manquant)

```
Cause : Un fichier source a un import relatif sans extension .js
Fix   : Trouver et ajouter .js à tous les imports relatifs (voir étape 3)
```

### Erreur : ERR_MODULE_NOT_FOUND pour un import node_modules

```
Cause : Le package n'est pas installé ou n'est pas ESM compatible
Fix   : Vérifier que le package est dans dependencies (pas devDependencies)
        Pour les packages CJS utilisés depuis ESM, ajouter esModuleInterop: true
```

### Erreur : dist/ toujours vide malgré npm run build

```
Cause 1 : tsconfig.json "include" ne couvre pas src/modules
  Fix   : "include": ["src/**/*"]

Cause 2 : tsconfig.json "outDir" différent de "dist/"
  Fix   : "outDir": "./dist"

Cause 3 : Erreurs TypeScript bloquent le build
  Fix   : npm run build 2>&1 | head -50 → voir les erreurs de type
          Ajouter "strict": false temporairement pour avancer
```

### Erreur TypeScript : Property 'X' does not exist on type 'Y'

```
Cause : Erreurs de typage dans le code source
Fix   : Deux options selon l'urgence :
  1. "strict": false dans tsconfig → compile malgré les erreurs de type
  2. Corriger les erreurs une par une (recommandé long terme)
```

### Erreur : __dirname is not defined in ESM

```
Cause : __dirname n'existe pas en ESM natif
Fix   : Utiliser import.meta.url + fileURLToPath (déjà dans les loaders ci-dessus)
```

---

## COMPARAISON DES APPROCHES

| Critère | tsx runtime (DOC B) | Compilation TypeScript (DOC C) |
|---------|---------------------|-------------------------------|
| Temps de setup | 10 min | 30-60 min |
| Robustesse | Moyen (dépend du loader) | Élevé (Node.js pur) |
| Performance | Moins bon (transpilation à chaud) | Optimal (JS précompilé) |
| Debug prod | Difficile (pas de source map) | Facile (source maps optionnels) |
| Standard industrie | Dev uniquement | ✅ Production standard |
| Risque bugs | Moyen | Faible |

**Recommandation :** Appliquer DOC B d'abord pour débloquer Railway rapidement, puis migrer vers DOC C dans la semaine.
