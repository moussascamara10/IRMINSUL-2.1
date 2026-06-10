# DOC D — PROTOCOLE DE DEBUG RAILWAY
## IRMINSUL V2 — Ne plus jamais faire 10 tentatives à l'aveugle

> Guide méthodologique pour Devin
> Comment diagnostiquer précisément avant chaque tentative de fix

---

## LEÇON N°1 : LIRE L'ERREUR COMPLÈTE AVANT DE FIXER

Chaque tentative de Devin a commencé par "les logs montrent ERR_UNKNOWN_FILE_EXTENSION". Mais l'erreur complète contient beaucoup plus d'information. Voici comment l'extraire.

### Structure complète d'une erreur ERR_UNKNOWN_FILE_EXTENSION

```
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts"
    for /app/src/modules/gacha/commands/voeux.ts
                                                 ^^^ Extension qui pose problème
    at [file:///app/node_modules/tsx/dist/esm/index.cjs:1:1234] ← tsx est là!
    at ModuleLoader.load [node:internal/modules/esm/loader:415:12]
    at defaultLoad [node:internal/modules/esm/load:202:14]
    at ModuleLoader.loadAndTranslate [node:internal/modules/esm/loader:453:45]
    at async ModuleJob.run [node:internal/modules/esm/module_job:195:12]
    at async Promise.all (index 0)
    at async CommandLoader.loadCommands ← ICI : c'est CommandLoader qui appelle import()
         [file:///app/src/core/CommandLoader.js:45:27]
```

**Informations critiques dans cette stack trace :**

1. **`for /app/src/modules/gacha/commands/voeux.ts`** → Le fichier demandé est bien `.ts`
2. **`at [file:///app/node_modules/tsx/dist/esm/index.cjs:1:...]`** → tsx EST dans la stack, mais n'a pas réussi à intercepter
3. **`at CommandLoader.loadCommands [file:///app/src/core/CommandLoader.js:45:27]`** → L'appel `import()` vient de CommandLoader

**Ce que ça signifie :** tsx était présent mais n'était pas enregistré comme hook AVANT que CommandLoader appelle `import()`. Cela confirme le problème de dynamic import.

### Si la stack trace n'est pas visible dans les logs Railway

Ajouter dans CommandLoader.ts pour avoir plus d'infos :

```typescript
try {
  const mod = await import(fileUrl);
} catch (error: any) {
  // Log complet avec tous les détails
  logger.error({
    event: 'import_failed',
    file: filePath,
    fileUrl,
    errorCode: error.code,           // ERR_UNKNOWN_FILE_EXTENSION
    errorUrl: error.url,             // URL tentée par Node.js
    errorMessage: error.message,
    nodeVersion: process.version,    // Ex: v20.11.0 ou v18.12.0
    tsxVersion: (() => {
      try {
        // Essayer de voir si tsx est chargé comme hook
        const m = require.resolve?.('tsx');
        return m ? 'found' : 'not found';
      } catch { return 'not found'; }
    })(),
    stackTrace: error.stack?.split('\n').slice(0, 8).join('\n')
  });
}
```

---

## LEÇON N°2 : VÉRIFIER NODE.JS VERSION RAILWAY EN PREMIER

**Avant toute tentative de fix, vérifier la version Node.js sur Railway.**

```bash
# Dans les logs Railway, chercher cette ligne au tout début :
# Starting Container
# Ensuite les premières lignes de démarrage contiennent la version Node.js

# OU ajouter ce log dans src/index.ts pour voir la version :
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
```

### Table de compatibilité des solutions selon la version Node.js

| Node.js Version | tsx src/index.ts | node --import tsx/esm | node --loader tsx/esm | tsx register() API | dist/ + node |
|----------------|-----------------|----------------------|----------------------|-------------------|--------------|
| v18.0 - v18.18 | ❌ dynamic import | ❌ --import non dispo | ⚠️ experimental | ⚠️ peut marcher | ✅ fonctionne |
| v18.19+        | ❌ dynamic import | ✅ fonctionne         | ⚠️ deprecated | ✅ fonctionne | ✅ fonctionne |
| v20.0 - v20.5  | ❌ dynamic import | ❌ --import non dispo | ⚠️ experimental | ⚠️ peut marcher | ✅ fonctionne |
| v20.6+         | ❌ dynamic import | ✅ fonctionne         | ⚠️ deprecated | ✅ fonctionne | ✅ fonctionne |
| v22.x          | ❌ dynamic import | ✅ fonctionne         | ✅ fonctionne | ✅ fonctionne | ✅ fonctionne |

**La seule solution qui fonctionne sur TOUTES les versions : compiler vers dist/ et utiliser `node dist/index.js`.**

---

## PROTOCOLE DE DEBUG — ARBRE DE DÉCISION

```
PROBLÈME : Bot ne répond pas sur Railway
│
├── ÉTAPE 1 : Lire les premières lignes des logs Railway
│   ├── "Starting Container" suivi par Node.js vX.Y.Z ?
│   │   → Noter la version
│   ├── "ERR_UNKNOWN_FILE_EXTENSION" ?
│   │   → Problème TypeScript → continuer cet arbre
│   └── Autre erreur (MongooseServerSelection, TokenInvalid, etc.) ?
│       → Problème différent → voir section "Autres erreurs" en bas
│
├── ÉTAPE 2 : Vérifier ce qui est dans dist/
│   ├── dist/modules/ contient des .js ?
│   │   ├── OUI → Charger depuis dist/ (DOC C)
│   │   └── NON → Fixer le tsconfig (DOC C étape 2)
│   └── dist/ n'existe pas du tout ?
│       → Aucune compilation lancée → DOC C
│
├── ÉTAPE 3 : Vérifier l'approche tsx
│   ├── tsx dans dependencies (pas devDependencies) ?
│   │   └── NON → le déplacer
│   ├── register() appelé au début de index.ts ?
│   │   └── NON → l'ajouter (DOC B)
│   └── Node.js >= 20.6 sur Railway ?
│       └── NON → pinner Node.js version (DOC B étape 1)
│
└── ÉTAPE 4 : Si tout le reste échoue
    → Approche build TypeScript (DOC C) — fonctionne TOUJOURS
```

---

## PROTOCOLE POUR CHAQUE TENTATIVE DE FIX

**Avant de push, obligatoirement :**

```
□ 1. Savoir précisément QUELLE ERREUR est attendue en moins
□ 2. Savoir QUELLE LIGNE de log devrait apparaître si ça marche
□ 3. Avoir testé localement avec npm start (pas npm run dev)
□ 4. Avoir vérifié que le fix ne régresse pas une autre fonctionnalité
□ 5. Avoir un message de commit clair qui décrit exactement le changement
```

**Après le push, dans les logs Railway :**

```
□ 1. Attendre que le déploiement soit marqué "Deployed" (pas juste "Building")
□ 2. Filtrer les logs sur la date du nouveau déploiement uniquement
□ 3. Chercher les 3 lignes de confirmation (voir section "Logs sains" plus bas)
□ 4. Si erreur → lire la STACK TRACE COMPLÈTE, pas juste le message
□ 5. Si succès → tester manuellement dans Discord (/profil)
```

---

## LOGS SAINS — CE QUE DEVIN DOIT VOIR

### Séquence de démarrage correcte (tsx route - DOC B)

```log
[INFO] Starting Container
[INFO] ✅ tsx ESM hook enregistré — tous les imports .ts seront transpilés
[INFO] 🚀 Initialisation d'IRMINSUL V2...
[INFO] ✅ Connexion MongoDB réussie
[INFO] ✅ GenshinDataService initialisé: 119 personnages, 234 armes, 61 artefacts
[INFO] 📂 Chargement commandes depuis: /app/src/modules (ext: .ts)
[INFO] ✅ 36/36 commandes chargées (0 erreurs)
[INFO] 📂 Chargement événements depuis: /app/src/core/events (ext: .ts)
[INFO] ✅ 2/2 événements chargés (0 erreurs)
[INFO] 🔐 Tentative de connexion à Discord...
[INFO] ✅ Prêt ! Connecté en tant que IRMINSUL#XXXX
[INFO] 🎮 Serveurs actifs : 1
```

### Séquence de démarrage correcte (build route - DOC C)

```log
[INFO] Starting Container
[INFO] > npm run build
[INFO] > tsc
[INFO] Build completed. Files in dist/
[INFO] ✅ 36 fichiers compilés dans dist/modules/
[INFO] 🚀 Initialisation d'IRMINSUL V2...
[INFO] ✅ Connexion MongoDB réussie
[INFO] 📂 Chargement commandes depuis: /app/dist/modules (ext: .js)
[INFO] ✅ 36/36 commandes chargées (0 erreurs)
[INFO] ✅ 2/2 événements chargés (0 erreurs)
[INFO] ✅ Prêt ! Connecté en tant que IRMINSUL#XXXX
```

### Signaux d'alerte à surveiller même si le bot démarre

```log
# MAUVAIS : 0 sur X
[ERROR] 🚨 CRITIQUE: 0/36 commandes chargées

# MAUVAIS : avertissement de version
[WARN] tsx/esm/api non disponible

# MAUVAIS : reconnexions fréquentes
[WARN] MongoDB reconnecté
[WARN] MongoDB reconnecté
[WARN] MongoDB reconnecté

# MAUVAIS : interactions non répondues (dans les logs Discord.js)
[ERROR] Unknown Interaction (10062)
[ERROR] Interaction already acknowledged

# MAUVAIS : unhandled rejections qui s'accumulent
[ERROR] unhandled_rejection: ...
[ERROR] unhandled_rejection: ...
# → bug dans une commande qui n'a pas de try/catch
```

---

## AUTRES ERREURS POSSIBLES (non liées au TypeScript)

### MongooseServerSelectionError

```
Cause   : MongoDB Atlas ne répond pas depuis Railway
Solutions :
  1. MongoDB Atlas → Network Access → whitelist 0.0.0.0/0 (toutes IPs)
  2. Vérifier que MONGODB_URI dans Railway Variables est correct
  3. Vérifier que le cluster Atlas est actif (pas en pause)
  4. Tester l'URI depuis un outil comme MongoDB Compass
```

### TokenInvalid / DiscordjsError: TOKEN INVALID

```
Cause   : Token Discord expiré ou incorrect dans Railway Variables
Solutions :
  1. Discord Dev Portal → Application → Bot → Reset Token
  2. Copier le nouveau token dans Railway Variables → DISCORD_TOKEN
  3. Forcer un redéploiement Railway après la mise à jour
  Note   : Un token invalide ne cause pas ERR_UNKNOWN_FILE_EXTENSION
           Les deux erreurs sont distinctes
```

### Missing Access / Missing Permissions

```
Cause   : Le bot n'a pas les permissions nécessaires dans le serveur
Solutions :
  1. Vérifier les permissions du bot dans Discord Server Settings
  2. Vérifier que les Privileged Gateway Intents sont activés si MESSAGE_CONTENT est utilisé
  3. Réinviter le bot avec les bonnes permissions via OAuth2 URL Generator
```

### Slash commands apparaissent mais ne répondent pas

```
Cause   : Les slash commands sont enregistrées (ancienne version) mais le code actuel a changé
Solutions :
  1. Exécuter le script deploy-commands.ts
  2. Si guild deployment : instantané
  3. Si global deployment : attendre 1h
  4. Vérifier que le DISCORD_CLIENT_ID est correct
```

---

## ÉTAT ACTUEL DU PROJET (APRÈS 10 TENTATIVES)

Avant de commencer le fix DOC B ou DOC C, Devin doit vérifier l'état exact des fichiers modifiés :

```bash
# Voir les fichiers modifiés depuis le dernier état stable
git log --oneline -15

# Voir l'état actuel des fichiers clés
git diff HEAD~10 package.json
git diff HEAD~10 src/core/CommandLoader.ts
git diff HEAD~10 src/core/EventLoader.ts
git diff HEAD~10 src/index.ts
cat tsconfig.json
cat railway.toml 2>/dev/null || echo "railway.toml absent"
```

### Remettre le projet dans un état propre (si confus)

```bash
# Option 1 : Revenir à l'état avant les 10 tentatives
git log --oneline | head -20
# Identifier le commit AVANT la première tentative Railway
git checkout <hash_avant_tentatives> -- src/core/CommandLoader.ts src/core/EventLoader.ts src/index.ts package.json

# Option 2 : Partir d'un état propre connu
git stash
git checkout main
git pull
```

---

## CHECKLIST DE VALIDATION FINALE (APRÈS LE FIX)

### Validation Railway (logs)

```
□ Zéro ligne "ERR_UNKNOWN_FILE_EXTENSION" dans les logs
□ "✅ X commandes chargées" avec X = 36 (ou le nombre total)
□ "✅ X événements chargés" avec X = 2 (minimum)
□ "✅ Prêt ! Connecté en tant que [NomBot]"
□ Aucun "Unhandled rejection" dans la première minute
□ Aucun crash loop (redémarrages répétés)
```

### Validation Discord (tests manuels)

```
□ /profil → l'embed s'affiche avec les stats du joueur
□ /voeux standard 1 → l'embed de tirage s'affiche
□ /resine → les informations de résine s'affichent
□ Un bouton sur un embed → le bot répond (test interactionCreate)
□ Une commande inexistante → pas de crash dans les logs
□ Attendre 5 minutes → aucun crash, bot toujours en ligne
```

### Validation économique (si des joueurs existent)

```
□ Faire un /voeux → les Primogens sont bien déduits
□ Vérifier en DB que les données sont cohérentes
□ Aucune transaction économique en double
```

---

## COMMANDES UTILES RAILWAY

```bash
# Voir les logs en temps réel via Railway CLI
railway logs --service <service-name> --follow

# Déclencher un redéploiement forcé (sans push)
railway redeploy --service <service-name>

# Voir les variables d'environnement (sans les valeurs)
railway variables --service <service-name>

# SSH dans le container Railway (si disponible sur votre plan)
railway shell --service <service-name>
# Depuis le shell : node --version, ls dist/, cat package.json
```

---

## RÈGLE D'OR POUR LES PROCHAINS DÉBOGUAGES

> **Règle : Maximum 3 tentatives de la même approche. Après 3 échecs identiques, changer radicalement d'approche.**

Si la tentative N échoue avec la même erreur que la tentative N-1 : ce n'est pas une question de détail, c'est une question d'approche. Passer au DOC C sans hésiter.
