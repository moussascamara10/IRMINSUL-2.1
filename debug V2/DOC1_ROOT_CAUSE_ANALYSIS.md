# DOC 1 — ROOT CAUSE ANALYSIS
## IRMINSUL V2 — Pourquoi Railway casse TypeScript (analyse définitive)

> Source : `logs_1781034943807.csv` (1001 lignes, déploiement du 2026-06-09 19:55 UTC)
> Ce document explique la cause racine et justifie le choix d'architecture imposé dans DOC 2/3/4.

---

## VERDICT EN UNE PHRASE

**Le process Node.js qui tourne sur Railway n'a JAMAIS de hook TypeScript actif au moment où `CommandLoader` exécute `import()` — peu importe ce que `package.json` dit, peu importe la version de tsx. La seule solution qui élimine ce problème à 100%, sur n'importe quelle version de Node, est de compiler le TypeScript en JavaScript AVANT le démarrage (Option A).**

---

## 1. CE QUE LES NOUVEAUX LOGS RÉVÈLENT

### 1.1 Progrès réel depuis le dernier audit

Les guards recommandés précédemment ont été implémentés et fonctionnent **correctement** :

```
[error] 🚨 CRITIQUE: 0 commandes chargées sur 36 tentées (36 erreurs)
[error] 🚨 Le bot ne peut pas fonctionner sans commandes. Arrêt forcé.
```

C'est un succès partiel : le bot ne reste plus "zombie" silencieux, il crash explicitement avec un message clair. Le logging `📄 Importation: /app/src/modules/...` avant chaque tentative a aussi été ajouté — bon réflexe de debug.

### 1.2 Le vrai problème : BOUCLE DE CRASH (crash loop)

En analysant les timestamps, le cycle complet (init → 36 échecs → exit) se répète **toutes les 3-4 secondes**, **4 fois** dans cette capture de 1001 lignes :

```
T=19:55:22.81  → 1er cycle se termine : "Arrêt forcé"
T=19:55:24.74  → 🚀 Initialisation d'IRMINSUL V2... (2e tentative)
T=19:55:26.16  → 2e cycle se termine : "Arrêt forcé"
T=19:55:28.18  → 🚀 Initialisation d'IRMINSUL V2... (3e tentative)
T=19:55:29.61  → 3e cycle se termine : "Arrêt forcé"
T=19:55:31.75  → 🚀 Initialisation d'IRMINSUL V2... (4e tentative)
T=19:55:33.14  → 4e cycle se termine : "Arrêt forcé"
```

**Railway redémarre le container automatiquement** (`restartPolicyType: ON_FAILURE`), et chaque tentative échoue **de manière identique**. Sans intervention, Railway finira par marquer le déploiement comme `CRASHED` après avoir atteint `restartPolicyMaxRetries`.

### 1.3 La preuve définitive : tsx n'est PAS dans la pile d'appel

Voici la stack trace complète, sans modification, pour `voeux.ts` :

```
❌ Erreur lors de l'importation de voeux.ts:
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts"
for /app/src/modules/gacha/commands/voeux.ts
    at Object.getFileProtocolModuleFormat [as file:] (node:internal/modules/esm/get_format:189:9)
    at defaultGetFormat (node:internal/modules/esm/get_format:232:36)
    at defaultLoad (node:internal/modules/esm/load:145:22)
    at async ModuleLoader.loadAndTranslate (node:internal/modules/esm/loader:543:45)
    at async ModuleJob._link (node:internal/modules/esm/module_job:148:19)
```

**Chaque frame est `node:internal/...`. Zéro frame contenant `tsx`, `node_modules/tsx`, ou tout chemin de hook personnalisé.**

Ceci confirme, sans ambiguïté possible, que **le process qui tourne actuellement sur Railway exécute du Node.js pur, sans aucun loader TypeScript enregistré** — que ce soit via la commande `tsx ...`, via `--import tsx/esm`, ou via un `register()` programmatique dans `index.ts`. Si l'un de ces mécanismes était actif, sa frame apparaîtrait systématiquement entre `ModuleJob._link` et `defaultLoad`.

---

## 2. MÉCANIQUE INTERNE — POURQUOI `ERR_UNKNOWN_FILE_EXTENSION` SE PRODUIT

Le pipeline du chargeur de modules ESM de Node.js, pour chaque `import()`, suit ces étapes :

```
1. resolve()     → trouve le chemin absolu du fichier
2. load()        → lit le contenu du fichier
3. getFormat()   → détermine le TYPE de module (ESM/CJS/JSON/Wasm)
                    selon l'EXTENSION du fichier et package.json "type"
4. translate()   → si format reconnu, transforme en module exécutable
5. _link()       → lie les exports/imports entre modules
```

**`getFormat()` ne reconnaît que `.js`, `.mjs`, `.cjs`, `.json`, `.wasm`, `.node`.** Pour `.ts`, `defaultGetFormat` lève `ERR_UNKNOWN_FILE_EXTENSION` — **sauf** si un hook personnalisé (enregistré via `module.register()` côté process) intercepte l'étape `load`/`getFormat` AVANT le comportement par défaut.

C'est exactement ce que fait `tsx` quand il est correctement actif : il s'enregistre comme hook global pour TOUTE la durée du process, intercepte `.ts`, le transpile en mémoire, puis laisse le pipeline continuer normalement.

**Sur Railway, ce hook n'est jamais enregistré dans le process qui exécute réellement le bot.** Causes possibles (toutes aboutissent au même symptôme) :

| Cause possible | Explication |
|---|---|
| Start Command Railway ≠ package.json `start` | Railway peut avoir un override de Start Command dans son dashboard qui prévaut sur `package.json`, et qui pointe encore vers `node src/index.ts` ou un ancien `railway.toml` |
| `register()` jamais ajouté ou retiré | Si une tentative précédente a ajouté puis retiré ce code | 
| `tsx` invoqué mais en mode non-hook | Certaines invocations de tsx (selon la version/contexte) ne posent le hook que pour le fichier d'entrée, pas pour les `import()` dynamiques ultérieurs |
| Version Node < 20.6 + `--import` | `--import` (le mécanisme moderne de hook) n'existe qu'à partir de Node 18.19/20.6 |

**Peu importe laquelle de ces causes est la vraie — toutes partagent la même solution : ne plus dépendre d'un hook runtime du tout.**

---

## 3. L'ARCHITECTURE ACTUELLE EST SAINE — LE PROBLÈME EST UNIQUEMENT LE "TRANSPORT"

Il est important de noter ce qui **n'est PAS cassé** :

```
✅ MongoDB se connecte                    (✅ Connexion MongoDB réussie)
✅ GenshinDataService s'initialise         (119 persos, 234 armes, 61 artefacts, 124 talents)
✅ 7 modules sont détectés correctement    (📂 Modules trouvés: 7)
✅ Chaque dossier de commandes est listé   (📂 Dossier .../commands: N fichiers)
✅ Le guard anti-zombie fonctionne         (🚨 CRITIQUE: 0/36 → Arrêt forcé)
```

Le pattern architectural — **découverte dynamique de fichiers de commandes via `readdirSync` puis `import()` de chaque fichier** — est une excellente pratique (extensibilité, modules indépendants, ajout de commande = ajout de fichier). **Ce pattern doit être préservé intégralement.** Le seul changement nécessaire : que les fichiers découverts et importés soient des `.js` déjà compilés, pas des `.ts` source.

---

## 4. COMPARAISON DES 4 OPTIONS — POURQUOI A EST LE SEUL CHOIX VIABLE

| Critère | A — Build tsc → dist/ | B — tsx runtime corrigé | C — Hybrid safe loader | D — Docker custom |
|---|---|---|---|---|
| Élimine la dépendance à un hook runtime | ✅ Total | ❌ Toujours dépendant | ⚠️ Partiellement | ❌ Le problème persiste DANS le container |
| Fonctionne sur n'importe quelle version Node ≥ 18 | ✅ Oui | ❌ `--import` nécessite ≥18.19/20.6 | ⚠️ Dépend | ✅ Oui (mais ne résout rien seul) |
| Performance runtime | ✅ Optimal (JS précompilé) | ❌ Transpilation à chaud à chaque import | ⚠️ Moyen | = A si combiné avec A |
| Risque de régression après 10+ échecs | ✅ Faible — approche totalement différente | 🔴 Élevé — déjà tenté 6+ fois sans succès | 🔴 Élevé — complexité ajoutée | 🔴 Élevé — n'adresse pas la cause |
| Conforme à "éviter dépendances fragiles" (contrainte utilisateur) | ✅ tsx devient dev-only | ❌ tsx reste critique en prod | ⚠️ tsx reste partiellement présent | Neutre |
| Effort d'implémentation | Moyen (1 codemod + 2 loaders + config) | Faible mais déjà épuisé | Élevé | Élevé (Dockerfile + tout le reste) |
| Standard industrie pour Node+TS en prod | ✅ Oui, c'est LA norme | Dev uniquement | Non-standard | Orthogonal au problème |

**Décision : OPTION A — Compilation TypeScript → `dist/` → `node dist/index.js`.**

L'option D (Docker custom) n'est pas rejetée par principe — Railway utilise déjà des containers (Nixpacks). Mais ajouter un Dockerfile custom ne change RIEN au problème central : à l'intérieur de ce Docker, il faudrait QUAND MÊME exécuter soit du JS compilé (= Option A, le Dockerfile devient juste un détail d'infra), soit retomber sur tsx (= Option B avec les mêmes risques). Option D est donc strictement redondante avec A pour résoudre ce bug spécifique.

---

## 5. RÉPONSES DIRECTES AUX 5 PROBLÈMES LISTÉS

| # | Problème énoncé | Cause racine réelle | Résolu par Option A ? |
|---|---|---|---|
| 1 | `ERR_UNKNOWN_FILE_EXTENSION` sur `.ts` | Node natif ne reconnaît pas `.ts`, aucun hook actif | ✅ Oui — dist/ ne contient que des `.js` |
| 2 | tsx ne se lance pas correctement en prod | Le hook tsx n'est jamais actif dans le process réel (zéro frame tsx dans la stack) | ✅ Oui — tsx devient dev-only, plus de dépendance prod |
| 3 | commands = 0 chargées | Conséquence directe de #1 | ✅ Oui — `dist/modules/**/*.js` se chargent nativement |
| 4 | Le loader casse en deploy | Le loader pointe vers `src/**/*.ts` au lieu de `dist/**/*.js` | ✅ Oui — loaders rendus environnement-aware (DOC 3/4) |
| 5 | Incohérence local vs Railway | Local = tsx watch (hook actif) ; Railway = process sans hook | ✅ Oui — les deux environnements utilisent désormais des artefacts homogènes pour leur contexte (`.ts` via tsx en dev, `.js` natif en prod) |

---

## 6. CE QUI DOIT ÊTRE NETTOYÉ AVANT DE COMMENCER

Les tentatives précédentes ont probablement laissé des traces qui peuvent entrer en conflit avec la nouvelle approche :

```
□ index.ts : chercher et supprimer tout import('tsx/esm/api'), register(), install()
□ package.json : tsx peut rester mais passe en devDependencies (plus nécessaire en prod)
□ railway.toml : si présent, contient peut-être un ancien startCommand="tsx ..." ou
                  des NPM_FLAGS liés aux tentatives précédentes → à remplacer entièrement
□ Variables Railway : vérifier l'absence de NODE_OPTIONS="--import tsx/esm" ou
                       NODE_OPTIONS="--loader=tsx" → à supprimer si présent
```

Ce nettoyage est détaillé étape par étape dans **DOC 4 (Tâche T1)**.

---

## CONCLUSION

Le projet a échoué 10+ fois en essayant de faire fonctionner un **hook de transpilation runtime** dans un environnement (Railway/Nixpacks) où ce hook n'est jamais correctement actif au moment critique. Plutôt que de continuer à chercher la bonne combinaison de flags/versions pour activer ce hook, **DOC 2, 3 et 4 retirent complètement le besoin d'un hook** : le code TypeScript est compilé en JavaScript standard pendant la phase de build Railway, et `node dist/index.js` — Node.js pur, zéro magie — exécute le bot. C'est l'approche utilisée par pratiquement tous les projets Node.js/TypeScript en production.
