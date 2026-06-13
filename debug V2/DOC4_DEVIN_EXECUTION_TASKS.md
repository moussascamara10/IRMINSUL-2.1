# DOC 4 — DEVIN EXECUTION TASKS
## IRMINSUL V2 — Ordre strict, code exact, zéro ambiguïté

> **RÈGLE ABSOLUE** : Exécuter les tâches dans l'ordre T1 → T2 → ... → T10.
> Ne pas passer à la tâche N+1 avant que la tâche N soit validée.
> Ne pas improviser de variante. Le code fourni ici est définitif.

---

## T1 — NETTOYAGE (5 min)

### T1.1 — Supprimer les résidus des tentatives précédentes

```bash
# Depuis la racine du projet
rm -rf dist/
rm -f railway.toml    # sera recréé à T7
```

### T1.2 — Nettoyer src/index.ts

Ouvrir `src/index.ts`. Chercher et supprimer **toute ligne** contenant l'un de ces termes :

```
tsx/esm/api
tsx/esm
tsx/cjs
register()     ← si vient de tsx
install()      ← si vient de tsx
addHook        ← si vient de pirates
```

Le fichier doit être propre de toute référence à un loader runtime tsx.

### T1.3 — Nettoyer les variables Railway

Sur `railway.ai` → Service → Variables, **supprimer** ces variables si elles existent :

```
NODE_OPTIONS
NPM_FLAGS
```

### T1.4 — Validation T1

```bash
# Doit retourner vide (aucun résidu tsx dans index.ts)
grep -n "tsx" src/index.ts || echo "✅ Aucun résidu tsx trouvé"
```

---

## T2 — TSCONFIG.JSON (3 min)

Remplacer **intégralement** le contenu de `tsconfig.json` par :

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

### T2 — Validation

```bash
# Doit afficher le contenu sans erreur
cat tsconfig.json | python3 -c "import sys,json; json.load(sys.stdin); print('✅ JSON valide')"

# Vérifier la présence des clés critiques
grep '"include"' tsconfig.json && echo "✅ include présent"
grep '"src/\*\*/\*"' tsconfig.json && echo "✅ src/**/* présent"
grep '"outDir"' tsconfig.json && echo "✅ outDir présent"
grep '"NodeNext"' tsconfig.json && echo "✅ NodeNext présent"
```

---

## T3 — CODEMOD IMPORTS .JS (10 min)

Cette tâche ajoute `.js` à tous les imports relatifs. **Ne pas faire manuellement** — utiliser le script.

### T3.1 — Exécuter le codemod

```bash
# Depuis la racine du projet
find src -name "*.ts" ! -name "*.d.ts" | while read file; do
  perl -i -pe "s|from '(\.[^']+(?<!\.js)(?<!\.json)(?<!\.mjs)(?<!\.cjs))'|from '\1.js'|g" "$file"
  perl -i -pe "s|import\('(\.[^']+(?<!\.js)(?<!\.json)(?<!\.mjs)(?<!\.cjs))'\)|import('\1.js')|g" "$file"
done

echo "Codemod terminé."
```

### T3.2 — Vérifier l'absence de doublons .js.js

```bash
grep -rn "\.js\.js" src/
# Si résultats : corriger manuellement ces fichiers
# Exemple : from './Foo.js.js' → from './Foo.js'
```

### T3.3 — Vérifier qu'il ne reste pas d'imports relatifs sans .js

```bash
# Ces commandes doivent retourner 0 résultats
grep -rn --include="*.ts" "from '\.\." src/ | grep -v "\.js'" | grep -v "\.json'" | grep -v "\.mjs'"
grep -rn --include="*.ts" "from '\." src/ | grep -v "\.js'" | grep -v "\.json'" | grep -v "\.mjs'" | grep -v "from '\.\." 
```

### T3.4 — Vérifier que les imports npm sont intacts

```bash
# Ces imports ne doivent PAS avoir de .js (packages npm)
grep -rn "from 'discord" src/ | head -3
# Attendu : from 'discord.js'  (discord.js est un package npm, pas relatif — correct)

grep -rn "from 'mongoose" src/ | head -3
# Attendu : from 'mongoose'  (package npm — correct, pas de .js ajouté)
```

---

## T4 — PACKAGE.JSON (5 min)

### T4.1 — Modifier la section scripts

Trouver la section `"scripts"` dans `package.json` et la **remplacer entièrement** par :

```json
"scripts": {
  "dev":            "tsx watch src/index.ts",
  "build":          "tsc",
  "start":          "node dist/index.js",
  "clean":          "rm -rf dist/",
  "rebuild":        "npm run clean && npm run build",
  "deploy-commands":"node dist/scripts/deploy-commands.js",
  "typecheck":      "tsc --noEmit"
}
```

### T4.2 — Déplacer tsx vers devDependencies

Dans `package.json`, déplacer `tsx` :

```json
"devDependencies": {
  "tsx": "^4.7.0",
  "typescript": "^5.4.0",
  "@types/node": "^20.0.0"
}
```

Supprimer `tsx` de `dependencies` si présent.

### T4.3 — Ajouter engines

```json
"engines": {
  "node": ">=20.0.0",
  "npm": ">=10.0.0"
}
```

### T4.4 — Vérifier "type": "module"

```bash
grep '"type"' package.json
# Doit afficher : "type": "module"
# Si absent → l'ajouter au niveau racine du JSON
```

### T4.5 — Validation T4

```bash
cat package.json | python3 -c "import sys,json; d=json.load(sys.stdin); \
  print('✅ start:', d['scripts']['start']); \
  print('✅ build:', d['scripts']['build']); \
  print('✅ engines:', d.get('engines', 'MANQUANT'))"
```

---

## T5 — COMMANDLOADER.TS (10 min)

Ouvrir `src/core/CommandLoader.ts`.

Localiser la méthode `loadCommands()`. **Remplacer son corps complet** par le code suivant. Le constructor et les autres méthodes/propriétés de la classe restent inchangés.

```typescript
async loadCommands(): Promise<void> {
  const currentFile = fileURLToPath(import.meta.url);
  const coreDir     = dirname(currentFile);
  const rootDir     = dirname(coreDir);
  const fileExt     = extname(currentFile);   // '.ts' en dev, '.js' en prod
  const modulesPath = join(rootDir, 'modules');

  logger.info(`📂 Chargement depuis: ${modulesPath} (ext: ${fileExt})`);

  let loadedCount = 0;
  let errorCount  = 0;
  let totalFiles  = 0;

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
      continue;
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
          logger.warn(`⚠️ Structure invalide: ${file}`);
          errorCount++;
          continue;
        }

        this.client.commands.set(command.data.name, command);
        logger.debug(`✅ Importé: ${command.data.name}`);
        loadedCount++;

      } catch (error) {
        const errMsg  = error instanceof Error ? error.message : String(error);
        const errCode = (error as NodeJS.ErrnoException).code ?? 'UNKNOWN';
        logger.error(`❌ Erreur lors de l'importation de ${file}: [${errCode}] ${errMsg}`);
        errorCount++;
      }
    }
  }

  if (loadedCount === 0) {
    logger.error(`🚨 CRITIQUE: 0 commandes chargées sur ${totalFiles} tentées (${errorCount} erreurs)`);
    logger.error(`🚨 modulesPath=${modulesPath} | ext=${fileExt}`);
    logger.error(`🚨 Le bot ne peut pas fonctionner sans commandes. Arrêt forcé.`);
    process.exit(1);
  }

  logger.info(`✅ Commandes chargées: ${loadedCount}/${totalFiles} (${errorCount} erreurs)`);
}
```

**Ajouter ces imports en haut de `CommandLoader.ts`** s'ils ne sont pas déjà présents :

```typescript
import { readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
```

---

## T6 — EVENTLOADER.TS (10 min)

Ouvrir `src/core/EventLoader.ts`.

Localiser la méthode `loadEvents()`. **Remplacer son corps complet** :

```typescript
async loadEvents(): Promise<void> {
  const currentFile = fileURLToPath(import.meta.url);
  const coreDir     = dirname(currentFile);
  const fileExt     = extname(currentFile);    // '.ts' en dev, '.js' en prod
  const eventsPath  = join(coreDir, 'events');

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
        logger.warn(`⚠️ Événement invalide: ${file}`);
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
```

**Ajouter ces imports en haut de `EventLoader.ts`** s'ils manquent :

```typescript
import { readdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
```

---

## T7 — RAILWAY.TOML (2 min)

Créer ou remplacer `railway.toml` à la racine :

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build"

[deploy]
startCommand = "node dist/index.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```

---

## T8 — FICHIERS ANNEXES (3 min)

### T8.1 — Créer .nvmrc

```bash
echo "20.11.0" > .nvmrc
```

### T8.2 — Vérifier .gitignore

```bash
grep "^dist/" .gitignore || echo "dist/" >> .gitignore
grep "^node_modules/" .gitignore || echo "node_modules/" >> .gitignore
grep "^\.env$" .gitignore || echo ".env" >> .gitignore
```

### T8.3 — Retirer dist/ du tracking git si nécessaire

```bash
# Vérifier si dist/ est tracké
git ls-files dist/ | head -5

# Si des fichiers apparaissent, les retirer du tracking
git rm -r --cached dist/ 2>/dev/null && echo "✅ dist/ retiré du tracking" || echo "✅ dist/ non tracké — rien à faire"
```

---

## T9 — TEST LOCAL COMPLET (10 min)

**NE PAS sauter cette étape. Si le test local échoue, ne pas pusher.**

```bash
# Étape 1 : réinstaller proprement
rm -rf node_modules/
npm install

# Étape 2 : compiler
npm run build

# Étape 3 : vérifier la structure de dist/
echo "=== Structure dist/modules/ ==="
ls dist/modules/

echo "=== Contenu dist/modules/gacha/commands/ ==="
ls dist/modules/gacha/commands/
# Attendu : voeux.js  banniere.js  pity.js

echo "=== Contenu dist/core/events/ ==="
ls dist/core/events/
# Attendu : interactionCreate.js  ready.js

echo "=== Vérification critique : dist/modules/ non vide ==="
count=$(find dist/modules -name "*.js" | wc -l)
echo "Fichiers .js dans dist/modules : $count"
[ "$count" -gt "0" ] && echo "✅ dist/modules contient des .js" || echo "❌ dist/modules est VIDE — tsconfig à corriger"

# Étape 4 : test de démarrage (CTRL+C pour arrêter après validation)
node dist/index.js
```

**Logs attendus lors du démarrage :**

```
🚀 Initialisation d'IRMINSUL V2...
✅ Connexion MongoDB réussie
✅ GenshinDataService initialisé: 119 personnages...
📂 Chargement depuis: /chemin/dist/modules (ext: .js)   ← EXT = .js = PROD
📂 Modules trouvés: 7
📂 Dossier abyss/commands: 4 fichiers
...
✅ Commandes chargées: 36/36 (0 erreurs)               ← 36, PAS 0
📂 Chargement événements depuis: /chemin/dist/core/events (ext: .js)
✅ Événements chargés: 2/2 (0 erreurs)                 ← 2, PAS 0
🔐 Tentative de connexion à Discord...
✅ Prêt ! Connecté en tant que [NomBot]
```

**Si `ext: .ts` apparaît** (au lieu de `.js`) → le `dist/index.js` n'est pas exécuté. Vérifier que la commande est bien `node dist/index.js` (pas `tsx src/index.ts`).

**Si les commandes = 0** → `dist/modules/` est vide → vérifier `tsconfig.json` include.

**Si erreur MongoDB** → problème d'environnement, pas de compilation. Vérifier `.env` local.

---

## T10 — COMMIT ET DÉPLOIEMENT RAILWAY (5 min)

### T10.1 — Commit

```bash
git add tsconfig.json package.json package-lock.json railway.toml .nvmrc .gitignore
git add src/core/CommandLoader.ts src/core/EventLoader.ts src/index.ts
git add src/  # Capture tous les .ts modifiés par le codemod T3

# Vérifier avant de committer
git diff --cached --stat

git commit -m "fix: compile TypeScript to dist/ — node dist/index.js on Railway

- tsconfig: include src/**/* (modules were missing)
- CommandLoader/EventLoader: env-aware, auto-detect src/ vs dist/
- imports: add .js extension (NodeNext convention)
- package.json: build=tsc, start=node dist/index.js
- railway.toml: buildCommand=npm run build, startCommand=node dist/index.js
- remove tsx runtime dependency from production"

git push
```

### T10.2 — Surveiller Railway

Sur `railway.ai` → Service → Deployments → cliquer le déploiement en cours.

**Phase Build (onglet Build Logs) — attendre ces lignes :**

```
Installing dependencies...
> npm ci
...
Running build command...
> npm run build
> tsc
...
✅ Build successful
```

**Phase Deploy (onglet Deploy Logs) — attendre ces lignes dans l'ordre :**

```
Starting Container
🚀 Initialisation d'IRMINSUL V2...
✅ Connexion MongoDB réussie
✅ GenshinDataService initialisé
📂 Chargement depuis: /app/dist/modules (ext: .js)   ← CRITIQUE
✅ Commandes chargées: 36/36 (0 erreurs)             ← CRITIQUE
✅ Événements chargés: 2/2 (0 erreurs)               ← CRITIQUE
✅ Prêt ! Connecté en tant que [NomBot]              ← CONFIRMATION FINALE
```

**Si une de ces 4 lignes critiques est absente ou différente → ne pas considérer le déploiement comme réussi.**

### T10.3 — Test Discord final

```
□ /profil → embed profil affiché
□ /voeux standard 1 → embed tirage affiché
□ Cliquer un bouton sur l'embed → bot répond
□ /resine → données affichées
□ Attendre 2 minutes → aucun crash dans les logs
```

---

## ARBRE D'ERREURS POST-DÉPLOIEMENT

```
ERR_UNKNOWN_FILE_EXTENSION dans les logs Railway
│
├── ext: .js dans les logs ?
│   ├── OUI → CommandLoader pointe vers dist/ mais dist/ est vide
│   │         → Vérifier Build Logs : "tsc" a-t-il tourné ?
│   │         → Vérifier tsconfig.json include
│   └── NON (ext: .ts dans les logs)
│         → Le process tourne depuis src/ (pas dist/)
│         → Vérifier startCommand = "node dist/index.js" (pas tsx)
│         → Vérifier railway.toml ET le dashboard Railway
│
dist/modules/ vide après build
│   → tsc a tourné mais n'a pas compilé les modules
│   → Vérifier "include": ["src/**/*"] dans tsconfig.json
│   → Vérifier que "rootDir": "./src" correspond au bon chemin
│
Erreur tsc bloque le build
│   → "strict": false est dans tsconfig.json ?
│   → Si oui : erreur de SYNTAXE dans un fichier (pas juste de type)
│   → npm run build en local → lire la première erreur
│   → Corriger le fichier concerné
│
Bot démarre mais commandes ne répondent pas dans Discord
│   → Les slash commands ne sont PAS re-déployées automatiquement
│   → Exécuter : npm run deploy-commands
│   → Attendre 5-10 min (propagation Discord)
```

---

## CHECKLIST FINALE DE VALIDATION

```
BUILD
□ npm run build termine sans erreur
□ dist/ existe et est non vide
□ dist/modules/ contient les 7 dossiers de modules
□ dist/modules/gacha/commands/ contient voeux.js, banniere.js, pity.js
□ dist/core/events/ contient interactionCreate.js et ready.js
□ dist/index.js existe

LOGS RAILWAY (Deploy Logs)
□ "ext: .js" dans la ligne de chargement (pas .ts)
□ "36/36 commandes chargées" (ou nombre total réel)
□ "2/2 événements chargés"
□ "Prêt ! Connecté en tant que"
□ Zéro ligne "ERR_UNKNOWN_FILE_EXTENSION"
□ Zéro crash loop (pas de redémarrages répétés)

TESTS DISCORD
□ /profil répond
□ /voeux répond
□ Boutons répondent
□ Pas de "L'application ne répond pas"

PROPRETE PROJET
□ Aucune référence tsx dans src/index.ts
□ railway.toml contient "node dist/index.js"
□ dist/ dans .gitignore
□ tsx dans devDependencies uniquement
```
