# DOC A — ANALYSE RACINE DES 10 ÉCHECS RAILWAY
## IRMINSUL V2 — Pourquoi chaque tentative a échoué et le vrai coupable

> Rédigé après lecture du RAPPORT_EXECUTION.md de Devin
> Ce document explique CE QUI S'EST VRAIMENT PASSÉ

---

## LE VERDICT EN UNE PHRASE

Devin a résolu le mauvais problème 10 fois de suite.

Le problème n'était **pas** "tsx n'est pas trouvé". Le problème était que **`import()` dynamique dans CommandLoader bypasse complètement tsx**, quelle que soit la façon dont tsx est lancé. Chaque "fix" portait sur l'entrée du programme (`src/index.ts`) alors que le bug vivait dans les **imports dynamiques à l'intérieur de CommandLoader**.

---

## COMPRENDRE POURQUOI TSX SEUL NE SUFFIT PAS

### Comment tsx fonctionne réellement

```
tsx src/index.ts
│
├── tsx traite src/index.ts                         ✅ TypeScript → OK
├── tsx traite les imports statiques directs         ✅ TypeScript → OK
│     (import { X } from './module')
│
└── Quand le programme appelle import(cheminDynamique) ← PROBLÈME
      │
      └── Ce n'est PLUS tsx qui gère l'import.
          C'est le loader ESM natif de Node.js.
          Node.js natif ne connaît pas .ts
          → ERR_UNKNOWN_FILE_EXTENSION
```

**La ligne coupable dans CommandLoader.ts :**
```typescript
// Cette ligne ne passe PAS par tsx sur Railway
const module = await import(pathToFileURL(filePath).href);
//                    ^^^^^ import() dynamique = loader Node.js natif
```

### Pourquoi ça marchait en local et pas sur Railway

```
LOCAL :
  tsx watch src/index.ts
        ↓
  tsx enregistre son loader ESM au niveau du processus Node.js entier
  (parce que --watch nécessite ce hook global)
  → TOUS les import() dynamiques passent par tsx ✅

RAILWAY :
  tsx src/index.ts (sans --watch)
        ↓
  tsx traite UNIQUEMENT le fichier d'entrée
  Les import() dynamiques ultérieurs → Node.js natif → ❌
```

C'est pour ça que les tests locaux avec `npm start` réussissaient toujours, et Railway échouait toujours. Même comportement, contexte d'exécution différent.

---

## AUTOPSIE DES 10 TENTATIVES

### Tentative 1-2 : Changer le script start (`tsx src/index.ts`)

```
Problème supposé : "tsx n'est pas lancé"
Vrai problème   : import() dynamique bypasse tsx
Résultat        : index.ts charge avec tsx ✅, CommandLoader échoue ❌
Pourquoi local OK: tsx watch = hook global, tsx simple = hook partiel
```

### Tentative 3 : pathToFileURL

```
Problème supposé : "le chemin de fichier est mal formaté"
Vrai problème   : le format du chemin n'est pas le problème, c'est le LOADER
Résultat        : ERR_UNKNOWN_FILE_EXTENSION avec ou sans pathToFileURL
```

### Tentative 4 : createRequire (CJS)

```
Problème supposé : "import() ESM ne marche pas, essayons require()"
Ce qui s'est passé: TS → SyntaxError car require() n'est pas un transpileur
Vrai problème   : require() peut lire du JS mais pas du TS natif non plus
Résultat        : SyntaxError: Unexpected token ':' (type annotations TS)
Note            : C'était une piste intéressante mais mal exécutée
```

### Tentative 5 : Charger depuis dist/ avec import() standard

```
Problème supposé : "charger dist/*.js au lieu de src/*.ts"
Ce qui s'est passé: dist/modules/ EST VIDE car tsconfig incomplet
Vrai problème   : tsconfig "include" ne couvre pas src/modules/
Résultat        : 0 fichiers dans dist/modules/
Note            : La bonne piste mais tsconfig non corrigé
```

### Tentative 6-7 : node --import tsx/esm

```
Problème supposé : "tsx n'est pas enregistré comme hook global"
Ce qui s'est passé: Bonne approche MAIS tsx était en devDependencies
Fix partiel     : Déplacer tsx en dependencies
Résultat        : Toujours ERR_UNKNOWN_FILE_EXTENSION
Vrai problème   : Node.js sur Railway < 20.6 (--import n'existait pas encore)
Note            : --import existe depuis Node.js 20.6.0 / 18.19.0 uniquement
```

### Tentative 8 : Retour à tsx src/index.ts (avec tsx en dependencies)

```
Problème supposé : "tsx n'était pas installé en prod"
Ce qui s'est passé: tsx installé ✅, mais dynamic import toujours via Node.js natif
Résultat        : Même erreur — le vrai problème non résolu
```

### Tentative 9 : npx tsx src/index.ts

```
Problème supposé : "tsx n'est pas dans le PATH"
Ce qui s'est passé: npx le trouve ✅, mais même problème de dynamic import
Résultat        : Idem
Note            : npx ne change rien au comportement des imports dans le programme
```

### Tentative 10 : railway.toml avec NPM_FLAGS=--production=false

```
Problème supposé : "Railway n'installe pas toutes les dépendances"
Ce qui s'est passé: Bonne idée mais ne règle pas le problème de fond
Résultat        : Toujours ERR_UNKNOWN_FILE_EXTENSION
État actuel     : En attente de vérification
```

---

## LE VRAI PROBLÈME — RÉSUMÉ TECHNIQUE COMPLET

```
ARCHITECTURE DU BUG :

index.ts
  ↓ tsx traite ce fichier ✅
Bootstrap.ts → CommandLoader.ts → EventLoader.ts
  ↓ static imports, tsx les gère ✅
CommandLoader.loadCommands()
  ↓ for (const file of commandFiles) {
  ↓   const mod = await import(filePath); ← ICI LE BUG
  ↓ }
      │
      └── import() appelle le module loader ESM de Node.js
          Node.js vérifie l'extension du fichier
          Extension = ".ts" → Node.js ne sait pas → ERR_UNKNOWN_FILE_EXTENSION

POUR CORRIGER, il faut UNE des solutions :
  1. Faire en sorte que import() trouve des fichiers .js (pas .ts)
     → Compiler TypeScript → JavaScript avant de démarrer
  2. Enregistrer tsx comme hook GLOBAL avant tout import dynamique
     → register() API de tsx dans index.ts
  3. Changer la version Node.js sur Railway pour 20.6+ ET utiliser --import tsx/esm
     → Solution la plus propre si Node.js ≥ 20.6
```

---

## CE QUI A ÉTÉ BIEN FAIT (À GARDER)

- ✅ `tsx` déplacé en `dependencies` — correct, à garder
- ✅ Guards dans CommandLoader (exit(1) si 0 commandes) — excellent
- ✅ Guards dans EventLoader — excellent
- ✅ Handlers d'erreurs globaux dans index.ts — à garder
- ✅ SIGTERM gracieux — à garder
- ✅ `pathToFileURL` pour cross-platform — correct

---

## PROCHAINES ÉTAPES (voir DOC B et DOC C)

Deux solutions sont proposées en parallèle :

**Solution Immédiate (DOC B)** — tsx register() API
→ 2 lignes de code à ajouter dans index.ts
→ Fonctionne sans recompiler

**Solution Définitive (DOC C)** — Build TypeScript propre
→ Correct industriellement
→ Résout le problème à la racine
→ Préparation pour la production

---

## LEÇON APPRISE

> "Quand un fix fonctionne en local mais pas en production, la différence est rarement dans ce qu'on change — elle est dans comment l'environnement d'exécution se comporte différemment."

Le debug le plus efficace ici aurait été d'ajouter, dès le début, ce log dans CommandLoader :

```typescript
console.log('NODE_PATH tsx:', require.resolve?.('tsx') ?? 'non trouvable');
console.log('import() caller:', new Error().stack?.split('\n')[2]);
console.log('filePath avant import:', filePath);
try {
  const mod = await import(filePath);
} catch(e: any) {
  console.error('DETAIL ERREUR:', e.code, e.url, e.message);
  // e.url montre quel loader a été appelé → aurait révélé le dynamic import
}
```

`e.url` dans l'erreur `ERR_UNKNOWN_FILE_EXTENSION` montre exactement quel fichier a été demandé et par quel loader — ce qui aurait isolé le problème en 1 tentative.
