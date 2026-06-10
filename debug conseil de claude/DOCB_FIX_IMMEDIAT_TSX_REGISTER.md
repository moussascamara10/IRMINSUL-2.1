# DOC B — FIX IMMÉDIAT : TSX REGISTER API
## IRMINSUL V2 — La solution qui règle le dynamic import en 10 minutes

> Solution à appliquer MAINTENANT si railway.toml (tentative 10) n'a pas fonctionné
> Temps estimé : 10-15 minutes

---

## POURQUOI CETTE APPROCHE FONCTIONNE

La solution tsx register() enregistre tsx comme hook ESM **au niveau du processus Node.js entier**, **programmatiquement, depuis index.ts lui-même**, avant tout autre import. Ainsi, TOUS les `import()` dynamiques ultérieurs (y compris ceux de CommandLoader) passeront par tsx.

```
AVANT (toutes les tentatives précédentes) :
  tsx src/index.ts
    └── tsx traite index.ts
    └── CommandLoader → import(file.ts) → Node.js natif → ❌ ERR_UNKNOWN_FILE_EXTENSION

APRÈS (avec register) :
  tsx src/index.ts
    └── tsx traite index.ts
    └── tsx.register() enregistre tsx comme loader global ✅
    └── CommandLoader → import(file.ts) → tsx intercepte → ✅ TypeScript chargé
```

---

## ÉTAPE 1 — VÉRIFIER LA VERSION NODE.JS SUR RAILWAY

Avant tout, vérifier quelle version Node.js Railway utilise pour ce service.

**Sur Railway Dashboard :**
→ Service → Settings → Environment → Node.js version

Si < 18 ou pas spécifié → ajouter explicitement dans les paramètres ou via `.node-version`.

**Ajouter à la racine du projet :**
```
# .node-version
20.11.0
```

**OU ajouter dans package.json :**
```json
{
  "engines": {
    "node": ">=20.6.0"
  }
}
```

---

## ÉTAPE 2 — MODIFIER src/index.ts (OU src/core/Bootstrap.ts)

Trouver le point d'entrée principal du projet. C'est le fichier que tsx lance en premier (`tsx src/index.ts`).

**Chercher la toute première ligne qui n'est pas un commentaire.**

Ajouter CE BLOC avant toute autre ligne de code, avant tout `import` :

```typescript
// src/index.ts — DOIT ÊTRE LES PREMIÈRES LIGNES DU FICHIER

// ─────────────────────────────────────────────────────────────
// REGISTER TSX COMME HOOK ESM GLOBAL
// Sans ce bloc, les import() dynamiques dans CommandLoader
// utilisent Node.js natif qui ne comprend pas les fichiers .ts
// ─────────────────────────────────────────────────────────────
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

// Registrer tsx comme loader pour tous les import() dynamiques
let _unregisterTsx: (() => void) | undefined;
try {
  const tsxEsm = await import('tsx/esm/api');
  _unregisterTsx = tsxEsm.register();
  console.log('✅ tsx ESM hook enregistré — tous les imports .ts seront transpilés');
} catch (e) {
  console.warn('⚠️ tsx/esm/api non disponible, fallback en cours...', e);
  // Fallback : essayer tsx/cjs
  try {
    const { addHook } = _require('pirates');
    addHook(
      (code: string, filename: string) => {
        // Si pirates est disponible, utiliser comme fallback
        return code;
      },
      { exts: ['.ts', '.tsx'] }
    );
  } catch (_) {
    console.error('❌ Aucun transpileur TypeScript disponible. Le bot risque de ne pas démarrer.');
  }
}
// ─────────────────────────────────────────────────────────────

// ENSUITE, vos imports normaux...
// import { IrminsulClient } from './core/IrminsulClient.js';
// etc.
```

### Version simplifiée (si pas besoin du fallback)

```typescript
// src/index.ts — VERSION SIMPLE
// DOIT ÊTRE EN PREMIER — avant tous les autres imports

// Enregistrer tsx pour tous les import() dynamiques
import { register } from 'tsx/esm/api';
const unregister = register();

// (register() retourne une fonction de cleanup — utile pour les tests)
// Pour le bot en production, on n'a pas besoin du cleanup.

// Vos imports habituels APRÈS :
import { Bootstrap } from './core/Bootstrap.js';
// etc.
```

---

## ÉTAPE 3 — VÉRIFIER LA COMPATIBILITÉ DE LA VERSION TSX

tsx v4.x exporte `tsx/esm/api` depuis la version 4.0.0. Devin a tsx 4.7.0 → OK.

**Vérification rapide :**
```bash
# En local
node -e "import('tsx/esm/api').then(m => console.log(Object.keys(m))).catch(console.error)"
# Doit afficher : [ 'register' ]
```

Si `tsx/esm/api` n'existe pas (version très ancienne), utiliser cette alternative :
```typescript
// Alternative pour tsx < 4.0.0
import { install } from 'tsx/esm';
install(); // Installe le loader tsx pour le processus actuel
```

---

## ÉTAPE 4 — PACKAGE.JSON : VÉRIFIER LE SCRIPT START

Après les tentatives multiples de Devin, le `start` script est probablement dans un état incertain.

**Mettre package.json dans cet état exact :**

```json
{
  "scripts": {
    "dev":   "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "build": "tsc --noEmit"
  }
}
```

Avec `tsx` dans les `dependencies` (pas devDependencies) — Devin l'a déjà fait.

**⚠️ NE PAS utiliser `node --import tsx/esm src/index.ts`** pour l'instant.
Avec le `register()` dans index.ts, `tsx src/index.ts` suffit.

---

## ÉTAPE 5 — VÉRIFIER CommandLoader ET EventLoader

Après toutes les modifications de Devin, les loaders sont peut-être dans un état intermédiaire.

**CommandLoader.ts doit charger depuis `src/` avec l'extension `.ts` :**

```typescript
// src/core/CommandLoader.ts
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { logger } from '../utils/logger.js';

export class CommandLoader {
  async loadCommands(): Promise<void> {
    const modulesPath = join(process.cwd(), 'src', 'modules');
    let loadedCount = 0;
    let errorCount = 0;
    let totalFiles = 0;

    const moduleDirs = readdirSync(modulesPath).filter(f => {
      try { return statSync(join(modulesPath, f)).isDirectory(); }
      catch { return false; }
    });

    for (const moduleDir of moduleDirs) {
      const commandsPath = join(modulesPath, moduleDir, 'commands');
      let commandFiles: string[];
      try {
        commandFiles = readdirSync(commandsPath).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
      } catch {
        continue; // Ce module n'a pas de dossier commands
      }

      for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        totalFiles++;
        try {
          // pathToFileURL est nécessaire sur Windows ET sur Linux avec ESM
          const fileUrl = pathToFileURL(filePath).href;
          const command = await import(fileUrl);

          const cmd = command.default || command;
          if (!cmd?.data?.name || typeof cmd.execute !== 'function') {
            logger.warn(`⚠️ Module invalide (manque data.name ou execute): ${file}`);
            errorCount++;
            continue;
          }

          this.client.commands.set(cmd.data.name, cmd);
          loadedCount++;
        } catch (error) {
          logger.error(`❌ Import échoué: ${file}: ${error instanceof Error ? error.message : error}`);
          errorCount++;
        }
      }
    }

    // GUARD CRITIQUE — ne pas menter
    if (loadedCount === 0) {
      logger.error(`🚨 CRITIQUE: 0 commandes chargées sur ${totalFiles} fichiers (${errorCount} erreurs)`);
      logger.error('🚨 Vérifier que tsx est installé ET que register() a été appelé dans index.ts');
      process.exit(1);
    }

    logger.info(`✅ ${loadedCount}/${totalFiles} commandes chargées (${errorCount} erreurs)`);
  }
}
```

**EventLoader.ts — même logique :**

```typescript
// src/core/EventLoader.ts
import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { logger } from '../utils/logger.js';

export class EventLoader {
  async loadEvents(): Promise<void> {
    const eventsPath = join(process.cwd(), 'src', 'core', 'events');
    let loadedCount = 0;
    let errorCount = 0;

    let eventFiles: string[];
    try {
      eventFiles = readdirSync(eventsPath).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
    } catch {
      logger.error(`🚨 Dossier événements introuvable: ${eventsPath}`);
      process.exit(1);
    }

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      try {
        const fileUrl = pathToFileURL(filePath).href;
        const event = await import(fileUrl);

        const evt = event.default || event;
        if (!evt?.name || typeof evt.execute !== 'function') {
          logger.warn(`⚠️ Événement invalide: ${file}`);
          errorCount++;
          continue;
        }

        if (evt.once) {
          this.client.once(evt.name, (...args: unknown[]) => evt.execute(...args));
        } else {
          this.client.on(evt.name, (...args: unknown[]) => evt.execute(...args));
        }
        loadedCount++;
      } catch (error) {
        logger.error(`❌ Événement échoué: ${file}: ${error instanceof Error ? error.message : error}`);
        errorCount++;
      }
    }

    if (loadedCount === 0) {
      logger.error(`🚨 CRITIQUE: 0 événements chargés sur ${eventFiles.length} tentées (${errorCount} erreurs)`);
      process.exit(1);
    }

    logger.info(`✅ ${loadedCount}/${eventFiles.length} événements chargés (${errorCount} erreurs)`);
  }
}
```

---

## ÉTAPE 6 — VÉRIFICATION LOCALE

```bash
# 1. Nettoyer node_modules et réinstaller
rm -rf node_modules
npm install

# 2. Tester
npm start

# Résultats attendus dans les logs :
# ✅ tsx ESM hook enregistré — tous les imports .ts seront transpilés
# ✅ Connexion MongoDB réussie
# ✅ GenshinDataService initialisé
# ✅ 36/36 commandes chargées (0 erreurs)
# ✅ 2/2 événements chargés (0 erreurs)
# ✅ Prêt ! Connecté en tant que [NomBot]
```

---

## ÉTAPE 7 — ÉTAT EXACT DU RAILWAY.TOML

Après la tentative 10, Devin a créé un `railway.toml`. L'état correct de ce fichier :

```toml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "tsx src/index.ts"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[[services]]
[services.variables]
NODE_ENV = "production"
```

**OU, encore plus simple :** supprimer railway.toml entièrement et laisser Railway utiliser le script `start` de package.json (plus simple, moins de friction).

---

## ÉTAPE 8 — COMMIT ET PUSH

```bash
git add src/index.ts src/core/CommandLoader.ts src/core/EventLoader.ts package.json railway.toml
git commit -m "fix: register tsx as global ESM hook for dynamic imports"
git push
```

---

## VÉRIFICATION POST-DÉPLOIEMENT

Dans les logs Railway, chercher dans l'ordre :

```
1. ✅ tsx ESM hook enregistré         ← La ligne qui confirme que register() a marché
2. ✅ X/X commandes chargées (0 err)  ← X doit être > 0
3. ✅ X/X événements chargés          ← X doit être > 0
4. ✅ Prêt ! Connecté en tant que...  ← Confirmation finale

Si on voit toujours ERR_UNKNOWN_FILE_EXTENSION :
→ Le register() n'a pas été appelé avant les imports
→ Vérifier que register() est bien LA PREMIÈRE CHOSE dans index.ts
→ Vérifier la version de tsx : doit être 4.x
→ Passer au DOC C (compilation TypeScript)
```

---

## SI CETTE SOLUTION ÉCHOUE AUSSI

Si `tsx/esm/api` n'est pas disponible ou que register() ne fonctionne pas sur Railway, passer directement au **DOC C** (compilation TypeScript propre). La solution DOC C est plus robuste car elle ne dépend d'aucun loader runtime — elle compile vers du JavaScript standard que Node.js comprend nativement.

**Ne pas faire d'autres tentatives variantes de tsx.** Si register() échoue → DOC C immédiatement.
