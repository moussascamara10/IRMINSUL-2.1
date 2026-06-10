# DOCUMENT 3 — REFONTE AVANCÉE DU SYSTÈME DE VŒUX & INNOVATIONS
## IRMINSUL V2 — Vision Game Design Senior

> Analyse réalisée le 2026-06-08 | Approche : amélioration progressive de l'existant

---

## PRÉAMBULE — PHILOSOPHIE DE CONCEPTION

L'objectif n'est pas de remplacer ce qui fonctionne. L'architecture existante (MongoDB, Discord.js v14, modules indépendants) est solide. Les innovations proposées ici s'**intègrent comme des modules additifs** sur l'existant.

**Règle d'or** : toute idée doit passer ce test en 3 questions :
1. Un joueur peut-il l'expliquer à un ami en 30 secondes ?
2. Peut-elle fonctionner même si personne d'autre n'y participe ?
3. Donne-t-elle envie de revenir demain ?

---

## PARTIE 1 — PITY SYSTEM AVANCÉ

### 1.1 Architecture Pity Complète

Le système actuel documente le pity standard Genshin (soft pity 74, hard pity 90). Voici une version enrichie :

#### Soft Pity Dynamique (Amélioration de l'existant)

```
Formule actuelle : probabilité fixe de +6% par pull après 74
Formule améliorée : courbe exponentielle douce

Pull 74 : 0.6% → 6.6%   (+6%)
Pull 75 : 6.6% → 13.5%  (+7%)
Pull 76 : 13.5% → 22.0% (+8.5%)
Pull 77 : 22.0% → 32.0% (+10%)
Pull 78 : 32.0% → 44.0% (+12%)
Pull 79 : 44.0% → 60.0% (+16%)
Pull 80 : 60.0% → 80.0% (+20%)
Pull 81 : 80.0% → 100%  (garanti)
```

Impact : réduit le hard pity à 81 (vs 90), crée plus de tension entre 75-81, garde l'anxiété du joueur. Compatible avec l'existant — simple modification de la formule dans `GachaEngine.ts`.

#### Pity Partagé Cross-Bannières (Nouveau)

```typescript
// Nouvelle logique dans pity schema
pity: {
  // Existant (par bannière)
  standard: { fiveStar: Number, fourStar: Number },
  character: { fiveStar: Number, fourStar: Number, guaranteed50: Boolean },
  weapon: { fiveStar: Number, fourStar: Number, epitomeLevel: Number },

  // NOUVEAU : Pity de compassion (cross-bannière)
  compassion: {
    totalPullsThisMonth: Number,    // Pulls totaux ce mois
    dryStreak: Number,              // Pulls consécutifs sans 5★ toutes bannières
    compassionBonus: Number,        // 0-15% bonus selon la sécheresse
    lastFiveStarDate: Date
  }
}
```

**Pity de Compassion** : Si un joueur n'a pas eu de 5★ depuis 120+ pulls (toutes bannières confondues), il reçoit un bonus progressif de probabilité sur TOUTES les bannières. Maximum +15%. Ce bonus est visible dans `/pity` avec un message encourageant comme *"Les Archons vous regardent avec pitié... +12% de chance ce tirage."*

#### Double Pity (Nouveau — optionnel)

Pour les bannières événement uniquement : si le joueur a raté le 50/50 deux fois de suite (guaranteed activé depuis 2 bannières), il reçoit un multiplicateur ×1.3 sur les probabilités 4★ featured jusqu'à son prochain 5★. Récompense la loyauté aux bannières.

### 1.2 Bannières Innovantes

#### Bannière Communautaire (1/mois)

```
Concept : Le personnage featured est VOTÉ par les joueurs du serveur.
─────────────────────────────────────────────────────────────────────
Mécanisme :
  - 3 jours de vote (boutons Discord dans un salon dédié)
  - Top 3 candidats présentés avec leurs stats et popularité
  - Le gagnant devient le featured du mois
  - Les votants pour le gagnant reçoivent -5 pulls de coût (= 720 primogems offerts)

Impact joueur : sentiment d'appartenance, engagement communautaire fort
Difficulté : Faible (nouveau champ `votedBy` dans banner schema + scheduler)
Priorité : Haute (fort retention, simple à implémenter)
```

#### Bannière Fantôme (Mystère)

```
Concept : Une bannière sans nom ni featured visible. Le joueur découvre
          le personnage seulement après avoir tiré.
──────────────────────────────────────────────────────────────────────
Mécanisme :
  - Pool de personnages rares/peu obtenus révélé progressivement
  - À 10 pulls : l'identité du featured est révélée à tous
  - 4★ featured inclut des exclusivités (skins, titres)
  - Durée : 48h uniquement

Embed avant pull :
  "╔══════════════════════════════╗
   ║   ??? BANNIÈRE MYSTÈRE ???   ║
   ║  ██████████████████████████  ║
   ║  Un destin s'écrit dans      ║
   ║  l'obscurité...              ║
   ╚══════════════════════════════╝"

Impact : FOMO sain, curiosité intense, discussions en serveur
Priorité : Haute — originalité maximale
```

#### Bannière Légendaire (Trimestrielle)

```
Concept : Bannière ultra-rare disponible 72h, avec des personnages
          jamais vus ailleurs (exclusivités Irminsul).
──────────────────────────────────────────────────────────────────────
Déblocage : Avoir complété 500 pulls totaux sur le serveur
Pool : 3 personnages légendaires exclusifs + stats boostées
Pity spécial : Hard pity à 50 (plus généreux)
Coût : Destins Légendaires (monnaie spéciale obtenue via raids uniquement)

Impact : Objectif long-terme, récompense les joueurs investis
Priorité : Moyenne (nécessite des personnages exclusifs à créer)
```

---

## PARTIE 2 — INNOVATIONS GAME DESIGN

### 2.1 Système Vivant — Le Monde Évolue Sans Toi

#### ★ L'Archiviste (Innovation majeure)

```
Concept : Un NPC textuel présent dans un salon Discord dédié (#archiviste-irminsul)
          qui commente les événements du serveur en temps réel.
────────────────────────────────────────────────────────────────────────────────────
Fonctionnement :
  Webhook qui poste automatiquement :
  - Quand un joueur obtient un 5★ → "L'Irminsul a enregistré l'arrivée de [perso]
    entre les mains de [Joueur]. La balance élémentaire se rééquilibre..."
  - Quand un boss mondial tombe → "Le [Boss] de [Région] a été vaincu. Son essence
    dissipée nourrit déjà de nouveaux archons..."
  - Quand le serveur atteint un milestone → "10 000 vœux ont été formulés sur ce
    serveur. L'Irminsul vibre de leur écho collectif."
  - Messages de minuit → "Une nouvelle journée à Teyvat commence. Les commissions
    de [Ville] attendent vos Voyageurs..."

Sentiment créé : Le monde vit. Les actions ont du poids. PVZK (Plaisir Victime
                 Zéro Katharsis) = voir les événements des autres nous touche.

Compatibilité : Webhook Discord + listeners sur les events internes (gacha pull 5★,
                boss kill, etc.) — aucune modification du core nécessaire.
Difficulté : Faible — webhook + event bus interne
Priorité : HAUTE — impact émotionnel maximal pour effort minimal
```

#### ★ Météo de Teyvat (Ambiance passive)

```
Concept : Chaque jour, une "météo" s'applique automatiquement sur les mécaniques
          de jeu, communiquée via embed dans un salon #teyvat-aujourd-hui.
────────────────────────────────────────────────────────────────────────────────
Météos possibles (rotation pseudo-aléatoire pondérée) :

"🌦️ Pluies de Liyue"
  → +15% Mora sur toutes les commissions aujourd'hui
  → Drops de craft Hydro x2

"⚡ Tempête d'Inazuma"
  → Commandes de type Electro +20% de dégâts
  → Les boss Electro donnent +1 ressource

"🌸 Floraison de Mondstadt"
  → Tous les joueurs actifs reçoivent 5 Primogens au login (via /profil)
  → Les expéditions se terminent 2h plus tôt

"🌑 Nuit de l'Abîme"
  → Tous les boss ont +20% de HP mais +50% de récompenses
  → Les vœux ont une "constellation surprise" cachée dans les 4★

"☀️ Benediction des Archons"
  → Pity soft réduit de 5 pulls pour aujourd'hui seulement
  → Message spécial dans les tirages

Implémentation : DailyResetJob.ts sélectionne la météo, poste dans le salon,
                modifie les multiplicateurs dans Redis (clé : weather:today, TTL: 24h)
Difficulté : Faible — 1 job, 1 table de multiplicateurs, 1 webhook
Priorité : HAUTE — donne une raison quotidienne de vérifier le serveur
```

### 2.2 Événements Passifs — Le Joueur N'a Pas À Commander

#### ★ Marchands Itinérants (Apparitions rares)

```
Concept : Un bot poste toutes les 4-6h (aléatoire) un embed dans le salon
          principal avec un marchand qui vend des items rares pendant 30 minutes.
──────────────────────────────────────────────────────────────────────────────
Embed exemple :
  "🛒 UN MARCHAND INCONNU VIENT D'APPARAÎTRE !
   ╔══════════════════════════════════════════╗
   ║  Paimon : « C'est Mondstadt Zhu ! »     ║
   ║                                          ║
   ║  🗡️ Prototype Archaic ×1    → 8,000 Mora ║
   ║  💎 Primogens ×40           → 15 Lueurs  ║
   ║  📦 Pack Talent ×3          → 20,000 Mora ║
   ║                                          ║
   ║  ⏱️ Disparaît dans 28m 44s              ║
   ╚══════════════════════════════════════════╝
   [Acheter Arme] [Acheter Primogens] [Acheter Pack]"

Mécanisme :
  - Timer aléatoire : toutes les 4-8h
  - Durée de vente : 20-40 minutes
  - Stock limité : 5 acheteurs max par item
  - Boutons dans l'embed public → réponse éphémère à l'acheteur

Effet FOMO sain : notifications Discord pour ne pas rater le marchand.
Difficulté : Moyenne — EventTickJob + embed avec collector limité
Priorité : HAUTE — crée des discussions organiques ("le marchand est là !")
```

#### ★ Anomalies Élémentaires (Exploration passive)

```
Concept : Toutes les X heures, un "cristal élémentaire" apparaît dans un salon
          textuel. Le premier joueur qui clique le réclame.
─────────────────────────────────────────────────────────────────────────────
Embed :
  "💎 Un cristal de Pyro a été détecté dans la vallée..."
  [🔥 Réclamer le Cristal] (bouton, 1 seul clic gagnant)

Récompenses variées :
  - Primogems 20-60
  - Ressources rares
  - XP Rang Aventurier
  - Titres exclusifs ("Chasseur de Cristaux")

Variantes :
  - Cristal Normal → 1 gagnant
  - Cristal Légendaire (rare) → 5 gagnants, récompenses x3
  - Cristal Empoisonné (très rare) → le cliqueur perd 1,000 Mora (blague visible)
    → Nuit le plus fun, crée des réactions et rires dans le chat

Difficulté : Faible — webhook + interaction bouton unique + collecteur 1 clic
Priorité : HAUTE
```

#### ★ Invasions de l'Abîme (Événement serveur passif)

```
Concept : Une fois par semaine, un message annonce que des "Herissons de l'Abîme"
          envahissent le serveur. Les joueurs ont 2h pour les repousser collectivement.
────────────────────────────────────────────────────────────────────────────────────
Mécanisme :
  - L'Abîme a X HP total (calculé selon le nombre de joueurs actifs)
  - Chaque joueur peut cliquer [⚔️ Attaquer] une fois toutes les 5 minutes
  - Chaque clic inflige des dégâts aléatoires selon les stats du joueur
  - Barre de progression publique mise à jour en temps réel (embed edité)
  - Si X HP atteint zéro en 2h → récompenses pour TOUS les participants
  - Si échec → récompenses réduites (et on relit le lore "l'Abîme a envahi Mondstadt...")

Embed dynamique (edité en live) :
  "🌑 INVASION DE L'ABÎME
   ┌────────────────────────────────────────┐
   │ HP de l'Abîme : ████████░░░░ 67%       │
   │ Participants  : 12                      │
   │ Temps restant : 01:23:44               │
   └────────────────────────────────────────┘
   Top contributeurs : Joueur1 > Joueur2 > Joueur3
   [⚔️ Attaquer] (disponible dans 2m 14s)"

Compatibilité : EventTickJob + embed live edit + cooldown Redis par user
Priorité : HAUTE — engagement communautaire exceptionnel
```

### 2.3 Mécaniques Sociales

#### ★ Résonance de Groupe (Coopération passive)

```
Concept : Quand 2 joueurs utilisent les mêmes éléments dans leurs équipes actives
          le même jour, ils reçoivent un bonus passif.
───────────────────────────────────────────────────────────────────────────────
Exemples :
  "3 joueurs ont Hu Tao dans leur équipe active aujourd'hui.
   Buff Pyro actif sur le serveur : +8% dégâts Pyro pour tous."

  "5 joueurs ont Xingqiu équipé. Buff Hydro : -5% coût résine sur Domaines."

Affichage : Embed quotidien dans #teyvat-aujourd-hui + /profil l'affiche.
Compatibilité : Lecture des teams actives → calcul des éléments dominants → Redis
Difficulté : Faible
Priorité : Haute — encourage la coordination sans la forcer
```

#### ★ Découvertes Collectives (Lore et secrets)

```
Concept : Des "secrets" sont cachés dans les commandes existantes. En les découvrant
          collectivement, le serveur débloque du lore exclusif.
─────────────────────────────────────────────────────────────────────────────────────
Exemples :
  - Si 10 joueurs font /profil d'un joueur spécifique le même jour → lore débloqué
  - Si quelqu'un fait /voeux à exactement minuit → message secret
  - Si le serveur cumule 100 boss tués dans une région → texte de lore révélé dans
    #archiviste-irminsul

Implémentation : Counter Redis + trigger sur seuil → webhook lore
Difficulté : Faible
Priorité : Moyenne — renforce le sentiment de mystère
```

#### ★ Défis Joueur contre Joueur (PvP indirect)

```
Concept : Un joueur peut "défier" un autre via /defier @Joueur. Les deux joueurs
          envoient leurs équipes en expédition dans la même région. Celui qui ramène
          le plus de ressources en 4h gagne un titre et les ressources de l'autre.
──────────────────────────────────────────────────────────────────────────────────
Règles :
  - Mise : 2,000 Mora chacun (récupérée par le gagnant)
  - Résultat basé sur stats équipe + RNG équilibré
  - Les 2 joueurs peuvent voir la progression en temps réel

Compatibilité : Extension du système d'expédition existant
Difficulté : Moyenne
Priorité : Haute — PvP indirect sans frustration
```

### 2.4 Mécaniques de Fidélisation

#### ★ Mémoire de l'Irminsul (Récompenses de Streak)

```
Concept : Différent des daily streaks classiques. L'Irminsul "mémorise" les
          interactions du joueur et lui offre des récompenses basées sur
          des patterns comportementaux.
───────────────────────────────────────────────────────────────────────────
Exemples de récompenses de pattern :
  "Tu as combattu Dvalin 10 fois. L'Irminsul reconnaît ton courage. +Titre: 'Ennemi du Vent'"
  "Tu as fait des vœux 7 jours de suite. +3 Primogens bonus sur le prochain pull."
  "Tu n'as pas visité depuis 3 jours. L'Irminsul t'a gardé des ressources. (DM automatique + 50 primogems)"

Particularité de la 3ème mécanique : au lieu de PUNIR l'absence, on la récompense
légèrement → évite la frustration des joueurs occasionnels.

Compatibilité : Observer les timestamps de `lastActive` déjà dans le schema user
Difficulté : Faible (lecture de données existantes + triggers)
Priorité : HAUTE — rétention des joueurs occasionnels
```

#### ★ Constellations de Serveur (Collection communautaire)

```
Concept : Comme les constellations de personnages, le SERVEUR lui-même a des
          "constellations" qui se débloquent quand des seuils collectifs sont atteints.
────────────────────────────────────────────────────────────────────────────────────────
Exemples :
  C0 → Serveur créé
  C1 → 10 joueurs inscrits   → débloque la boutique de guilde
  C2 → 100 boss tués         → débloque les raids de guilde
  C3 → 1,000 vœux formulés   → débloque les bannières événement
  C4 → 50 joueurs AR30+      → débloque l'Abîme Spiralé
  C5 → 500 commissions       → débloque le marché P2P
  C6 → 10,000 pulls totaux   → débloque une bannière légendaire exclusive

Affichage : /serveur-stats → embed avec les constellations débloquées
Message : "Le serveur a atteint C3 ! Les bannières événement sont maintenant disponibles."

Compatibilité : Table `server_config` existe déjà dans le schema
Priorité : HAUTE — donne un objectif collectif clair aux admins de serveur
```

### 2.5 Utilisation Avancée de Discord

#### ★ Combat en Thread Enrichi (Amélioration de l'existant)

```
Concept : Les threads de combat actuels sont fonctionnels. Les améliorer avec :

1. Cinématique de début via edits successifs d'embed (animation simulée)
   Embed 1 → "Le Dvalin s'éveille..."
   500ms → Embed 2 → "Ses écailles brillent d'un bleu électrique..."
   500ms → Embed 3 → "⚔️ COMBAT COMMENCE"

2. Messages narratifs entre les tours :
   "Hu Tao exécute son Papillon Mortel avec une précision terrifiante..."
   vs
   "Dvalin rugit. Son souffle glacial gèle l'air autour de toi."

3. Effets de statut visuels :
   "🔥 BRÛLURE" → emoji sur le nom du personnage brûlé
   "💧 MOUILLÉ"  → affiché dans l'embed d'équipe

Compatibilité : Modification de CombatEngine.ts uniquement
Difficulté : Faible (string templates + setTimeout)
Priorité : Haute — améliore massivement le ressenti du combat
```

#### ★ Votes Réactifs (Mécanique novel)

```
Concept : Pour certaines décisions de serveur, utiliser des réactions Discord
          comme votes en temps réel.
──────────────────────────────────────────────────────────────────────────────
Exemples :
  - "Quel boss hebdomadaire sera boosté cette semaine ?"
    → 4 options avec emojis, le plus voté est activé pendant 7 jours

  - Quête de guilde collective : choix de direction
    → 3 choix de lore, le vote détermine quel chemin la quête prend

Compatibilité : Webhook + reaction collector Discord.js
Difficulté : Faible
Priorité : Moyenne
```

#### ★ Cartes de Visite Animées (Cosmétique viral)

```
Concept : /profil génère un "embed vivant" plutôt qu'un embed statique.
──────────────────────────────────────────────────────────────────────────
Version améliorée du profil :
  - L'embed est edité 2-3 fois en séquence pour simuler une animation
  - Le background change selon la région principale du joueur
  - Les stats s'affichent avec un "compteur qui monte" (simulé via edits)
  - Un badge animé 🌟 apparaît sur les 5★ récents

Implémentation : Séquence d'edits rapides de l'interaction (2-3 edits à 300ms)
Difficulté : Faible
Impact : Fort (les joueurs adorent partager leur profil)
Priorité : Moyenne
```

---

## PARTIE 3 — 20+ IDÉES ORIGINALES NOTÉES

| # | Idée | Originalité | Faisabilité | Impact User | Complexité | Score |
|---|------|-------------|-------------|-------------|------------|-------|
| 1 | **L'Archiviste** (NPC qui commente en live) | 9/10 | 9/10 | 9/10 | 2/10 | **🔥 TOP** |
| 2 | **Météo de Teyvat** (modificateurs quotidiens) | 7/10 | 10/10 | 8/10 | 2/10 | **🔥 TOP** |
| 3 | **Marchands Itinérants** (FOMO sain) | 8/10 | 9/10 | 9/10 | 3/10 | **🔥 TOP** |
| 4 | **Invasions de l'Abîme** (boss HP collectif) | 8/10 | 7/10 | 10/10 | 5/10 | **🔥 TOP** |
| 5 | **Bannière Mystère** (featured caché) | 9/10 | 8/10 | 8/10 | 3/10 | **⭐ FORT** |
| 6 | **Mémoire de l'Irminsul** (récompense absence) | 9/10 | 8/10 | 7/10 | 3/10 | **⭐ FORT** |
| 7 | **Constellations de Serveur** (milestones coll.) | 8/10 | 9/10 | 8/10 | 3/10 | **⭐ FORT** |
| 8 | **Défis PvP indirects** (expéditions compétitives) | 7/10 | 8/10 | 8/10 | 4/10 | **⭐ FORT** |
| 9 | **Résonance de Groupe** (buff selon équipes) | 7/10 | 8/10 | 7/10 | 2/10 | **⭐ FORT** |
| 10 | **Anomalies Élémentaires** (cristaux à cliquer) | 6/10 | 10/10 | 7/10 | 1/10 | **⭐ FORT** |
| 11 | **Bannière Communautaire** (vote mensuel) | 8/10 | 8/10 | 9/10 | 3/10 | **⭐ FORT** |
| 12 | **Cartes de Visite Animées** (profil vivant) | 6/10 | 9/10 | 7/10 | 2/10 | **✅ BON** |
| 13 | **Découvertes Collectives** (secrets de lore) | 8/10 | 7/10 | 6/10 | 3/10 | **✅ BON** |
| 14 | **Votes Réactifs** (boss boosté par vote) | 6/10 | 9/10 | 7/10 | 2/10 | **✅ BON** |
| 15 | **Cinématique Combat** (edits narratifs) | 7/10 | 9/10 | 8/10 | 2/10 | **✅ BON** |
| 16 | **Bannière Légendaire** (trimestrielle) | 7/10 | 6/10 | 8/10 | 5/10 | **✅ BON** |
| 17 | **Pity de Compassion** (cross-bannières) | 7/10 | 9/10 | 7/10 | 2/10 | **✅ BON** |
| 18 | **Double Pity** (50/50 enchaînés) | 6/10 | 9/10 | 6/10 | 2/10 | **✅ BON** |
| 19 | **Soft Pity Dynamique** (courbe exponentielle) | 5/10 | 10/10 | 7/10 | 1/10 | **✅ BON** |
| 20 | **Cristal Empoisonné** (piège humoristique) | 9/10 | 10/10 | 8/10 | 1/10 | **✅ BON** |
| 21 | **Quêtes de Serveur** (objectifs communautaires) | 7/10 | 7/10 | 8/10 | 5/10 | **🔵 MOYEN** |
| 22 | **Factions Serveur** (équipes en compétition) | 8/10 | 5/10 | 8/10 | 8/10 | **🔵 MOYEN** |
| 23 | **Saisons Narratives** (lore évolutif) | 9/10 | 4/10 | 9/10 | 9/10 | **🔵 MOYEN** |

---

## PARTIE 4 — PLAN D'IMPLÉMENTATION PROGRESSIF

### Sprint 1 — Impact maximal, effort minimal (1-2 semaines)

Ces fonctionnalités s'ajoutent sans modifier le code existant :

1. **Soft Pity Dynamique** → modifier 5 lignes dans `GachaEngine.ts`
2. **Météo de Teyvat** → nouveau job dans `EventTickJob.ts` + Redis key
3. **Anomalies Élémentaires** → webhook + bouton collector dans un nouveau job
4. **L'Archiviste** → webhook listener sur events internes existants
5. **Pity de Compassion** → nouveau champ dans user schema + logique GachaEngine

### Sprint 2 — Engagement social (2-4 semaines)

6. **Marchands Itinérants** → job planifié + embed avec collector limité
7. **Bannière Mystère** → nouveau type de bannière dans le schema
8. **Résonance de Groupe** → lecture teams actives + Redis clé globale
9. **Cartes de Visite Animées** → amélioration du handler /profil

### Sprint 3 — Communauté (4-6 semaines)

10. **Invasions de l'Abîme** → nouveau module event + embed live
11. **Bannière Communautaire** → vote system + scheduler mensuel
12. **Constellations de Serveur** → milestones dans server_config
13. **Défis PvP** → extension du module expédition

### Sprint 4 — Endgame et lore (6-10 semaines)

14. **Bannière Légendaire** → nouveaux personnages exclusifs + trimestriel
15. **Mémoire de l'Irminsul** → pattern detector sur les actions utilisateur
16. **Découvertes Collectives** → counter Redis + triggers de seuil
17. **Saisons Narratives** → structure lore évolutif

---

## RÉSUMÉ EXÉCUTIF GAME DESIGN

> Ces trois innovations combinées créeraient une expérience unique sur Discord :

1. **L'Archiviste + Météo + Marchands** = Un monde qui semble vivant même quand on ne joue pas
2. **Invasions + Bannière Communautaire + Résonance** = Une communauté qui se sent soudée par des actions collectives
3. **Mémoire de l'Irminsul + Constellations de Serveur + Soft Pity Dynamique** = Un système qui récompense la loyauté sans punir le casual

Le résultat : *"Je n'ai jamais vu ça sur un bot Discord"* — l'objectif est atteint.
