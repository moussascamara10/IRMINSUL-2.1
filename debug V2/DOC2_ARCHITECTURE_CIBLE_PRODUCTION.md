# DOC 2 — ARCHITECTURE CIBLE PRODUCTION
## IRMINSUL V2 — Structure finale, flow d'exécution, conventions définitives

> Ce document décrit l'état FINAL vers lequel le projet converge. DOC 3 et DOC 4 décrivent comment y arriver.

---

## 1. DÉCISION D'ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────┐
│  TYPESCRIPT (.ts) reste le langage source — AUCUN CHANGEMENT      │
│  de logique métier, de structure de modules, ou de gameplay.      │
│                                                                     │
│  CE QUI CHANGE : comment ce TypeScript devient exécutable.         │
│                                                                     │
│  AVANT : tente d'exécuter .ts directement (échoue sur Railway)    │
│  APRÈS : .ts est compilé en .js AVANT le démarrage (fonctionne    │
│          partout, toujours, sans condition de version Node)        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. STRUCTURE DE RÉPERTOIRES FINALE

```
/app
├── src/                          ← SOURCE — committé dans git, jamais exécuté directement en prod
│   ├── index.ts                  ← Point d'entrée
│   ├── core/
│   │   ├── Bootstrap.ts
│   │   ├── CommandLoader.ts      ← Devient environnement-aware (voir §4)
│   │   ├── EventLoader.ts        ← Idem
│   │   └── events/
│   │       ├── interactionCreate.ts
│   │       └── ready.ts
│   ├── modules/
│   │   ├── abyss/commands/*.ts        (4 fichiers)
│   │   ├── combat/commands/*.ts       (3 fichiers)
│   │   ├── commission/commands/*.ts   (6 fichiers)
│   │   ├── events/commands/*.ts       (5 fichiers)
│   │   ├── gacha/commands/*.ts        (3 fichiers)
│   │   ├── guild/commands/*.ts        (10 fichiers)
│   │   └── profile/commands/*.ts      (5 fichiers)
│   ├── services/
│   ├── database/
│   ├── utils/
│   ├── data/
│   └── scripts/
│       └── deploy-commands.ts
│
├── dist/                         ← GÉNÉRÉ — jamais committé (.gitignore), recréé à chaque build
│   └── (structure IDENTIQUE à src/, mais en .js)
│       ├── index.js
│       ├── core/CommandLoader.js
│       ├── modules/gacha/commands/voeux.js
│       └── ... (mirroring exact de src/)
│
├── node_modules/                 ← ignoré git
├── tsconfig.json                 ← config de compilation (DOC 3 §1)
├── package.json                  ← scripts build/start (DOC 3 §2)
├── railway.toml                  ← config Railway (DOC 3 §9)
├── .nvmrc                        ← version Node figée
├── .gitignore
└── .env                          ← local uniquement, jamais committé
```

**Règle d'or : tout ce qui existe dans `src/` est reproduit à l'identique dans `dist/`, fichier pour fichier, dossier pour dossier — `tsc` fait ce mirroring automatiquement grâce à `rootDir`/`outDir`.**

---

## 3. FLOW D'EXÉCUTION — DEV vs PRODUCTION

```
┌─────────────────────────────────────────────────────────────────┐
│ DÉVELOPPEMENT LOCAL                                                │
│                                                                     │
│   npm run dev                                                      │
│        │                                                           │
│        ▼                                                           │
│   tsx watch src/index.ts                                           │
│        │                                                           │
│        ├─ tsx transpile à la volée (hook actif pour CE process)   │
│        ├─ lit directement src/**/*.ts                              │
│        ├─ hot-reload sur changement de fichier                     │
│        └─ CommandLoader détecte ext=".ts" → lit src/modules/       │
│                                                                     │
│   AUCUN CHANGEMENT vs aujourd'hui — l'expérience dev reste intacte │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PRODUCTION (Railway)                                               │
│                                                                     │
│   ── PHASE BUILD (Nixpacks, dans "Build Logs") ──                  │
│   npm ci                                                            │
│   npm run build                                                     │
│        │                                                           │
│        ▼                                                           │
│   tsc  (lit tsconfig.json)                                          │
│        │                                                           │
│        └─ src/**/*.ts ──compile──> dist/**/*.js                    │
│            (structure mirroring exact)                             │
│                                                                     │
│   ── PHASE START (container, dans "Deploy Logs") ──                │
│   node dist/index.js                                                │
│        │                                                           │
│        ├─ Node.js NATIF — zéro transpilation, zéro hook            │
│        ├─ lit dist/**/*.js                                          │
│        └─ CommandLoader détecte ext=".js" → lit dist/modules/      │
│                                                                     │
│   tsx N'EST PAS PRÉSENT dans cette phase. Aucune dépendance        │
│   runtime à un transpileur.                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. STRATÉGIE MODULES/SERVICES — LOADERS ENVIRONNEMENT-AWARE

`CommandLoader` et `EventLoader` se localisent eux-mêmes via `import.meta.url`, ce qui leur dit automatiquement dans quel environnement ils tournent — **sans variable d'environnement, sans condition `NODE_ENV` à maintenir manuellement** :

```
En DEV  (tsx exécute src/core/CommandLoader.ts) :
   import.meta.url = file:///app/src/core/CommandLoader.ts
   → extension détectée = .ts
   → modulesPath       = /app/src/modules
   → cherche *.ts dans modulesPath

En PROD (node exécute dist/core/CommandLoader.js) :
   import.meta.url = file:///app/dist/core/CommandLoader.js
   → extension détectée = .js
   → modulesPath       = /app/dist/modules
   → cherche *.js dans modulesPath
```

Le code est **identique** dans les deux environnements — c'est sa position sur le disque (`src/` vs `dist/`) qui détermine son comportement. Aucune logique conditionnelle fragile de type `if (process.env.NODE_ENV === 'production')`.

---

## 5. CONVENTION OBLIGATOIRE — IMPORTS RELATIFS AVEC EXTENSION `.js`

C'est **LA SEULE** nouvelle règle d'écriture de code introduite par cette architecture, et elle s'applique immédiatement et pour tout le code futur :

```typescript
// ❌ INTERDIT à partir de maintenant
import { UserRepository } from '../database/repositories/UserRepository';
import { logger } from '../../utils/logger';

// ✅ OBLIGATOIRE
import { UserRepository } from '../database/repositories/UserRepository.js';
import { logger } from '../../utils/logger.js';
```

**Pourquoi `.js` alors que le fichier source est `.ts` ?** C'est la convention standard ESM/NodeNext : l'extension dans l'import désigne le fichier **tel qu'il existera à l'exécution** (`.js` après compilation), pas le fichier source. TypeScript comprend cette convention nativement avec `"module": "NodeNext"` et résout `./Foo.js` vers `./Foo.ts` pendant la compilation, sans erreur.

**Cette règle ne s'applique QU'AUX imports relatifs** (commençant par `./` ou `../`). Les imports de packages npm (`from 'discord.js'`, `from 'mongoose'`) restent inchangés.

Un codemod (DOC 3 §4 / DOC 4 T3) applique cette règle une fois sur tout le code existant. Ensuite, c'est une habitude d'écriture comme une autre.

---

## 6. CE QUI NE CHANGE PAS — GARANTIES

```
✅ Les 36 commandes existantes : code inchangé (sauf extensions d'import)
✅ Les 7 modules (abyss, combat, commission, events, gacha, guild, profile)
✅ interactionCreate.ts et ready.ts : logique inchangée
✅ MongoDB / Mongoose : aucun changement de schema ou de connexion
✅ Redis : aucun changement
✅ GenshinDataService (119 persos, 234 armes, 61 artefacts, 124 talents)
✅ Le pattern de découverte dynamique des commandes (readdirSync + import())
✅ Les guards anti-zombie (process.exit(1) si 0 commandes chargées)
✅ discord.js v14 : aucun changement de version ou d'API
✅ Toutes les features gameplay, sans exception
```

---

## 7. EXTENSIBILITÉ FUTURE — AJOUTER UNE NOUVELLE COMMANDE

Le workflow pour Devin (ou tout développeur futur) reste **exactement le même qu'aujourd'hui** :

```
1. Créer src/modules/<module>/commands/nouvelle-commande.ts
2. Exporter { data, execute } comme toutes les commandes existantes
3. Utiliser des imports relatifs avec .js (nouvelle convention, §5)
4. npm run dev → la commande est immédiatement disponible en local (tsx watch)
5. git push → Railway build (tsc compile le nouveau fichier vers dist/
   automatiquement, aucune configuration supplémentaire) → CommandLoader
   le découvre au démarrage comme les 36 autres
```

**Aucune liste centrale de commandes à maintenir. Aucune étape de build manuelle par fichier. La découverte dynamique + compilation globale gèrent tout.**

---

## 8. RÔLE DE TSX APRÈS CETTE MIGRATION

| Avant (problématique) | Après |
|---|---|
| `tsx` dans `dependencies` | `tsx` dans `devDependencies` uniquement |
| `tsx` requis pour `npm start` en prod | `tsx` absent de l'image de production (réduit la taille) |
| `tsx` doit avoir un hook actif sur Railway | `tsx` ne tourne JAMAIS sur Railway |
| Comportement dépend de la version tsx/Node | `node dist/index.js` — comportement Node.js standard, garanti |
| Utilisé pour `npm run dev` (watch mode) | Utilisé UNIQUEMENT pour `npm run dev` (watch mode) — rôle inchangé en dev |

tsx redevient ce qu'il devrait toujours avoir été : **un outil de confort pour le développement local**, sans aucune responsabilité en production.

---

## 9. RÉSUMÉ DÉCISIONNEL

| Décision | Choix |
|---|---|
| Build TS → JS avant prod ? | ✅ Oui (tsc) |
| tsx en production ? | ❌ Non — dev only |
| Structure modules/services modifiée ? | ❌ Non — mirroring 1:1 |
| Pattern de chargement dynamique conservé ? | ✅ Oui, rendu env-aware |
| Nouvelle convention de code ? | Imports relatifs avec `.js` (NodeNext) |
| Node.js version cible | ≥ 20 (fixée via `.nvmrc` + `engines`) |
| Risque de régression gameplay | Nul — zéro changement de logique métier |
