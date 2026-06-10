# IRMINSUL V2 — 02. SYSTÈMES DE JEU

> Version de conception : 2.0.0 | Statut : Phase Architecturale

---

## ANALYSE PRÉALABLE

### Risques des systèmes de jeu
- **Combat text-based** : risque de frustration si trop complexe → équilibrer profondeur et lisibilité
- **Résine** : blocage des joueurs actifs → sources alternatives de progression sans résine
- **Housing** : feature créophage → développer en V2, pas en MVP
- **Gacha** : réglementation dans certains pays → pity garanti visible, pas de vente directe de pulls contre argent réel

### Solutions architecturales
- Sessions de combat en Thread Discord privé → isolation + nettoyage auto
- Calculs de combat 100% serveur → pas de triche possible
- Résine condensée comme "valve de pression" pour les no-lifers
- Toutes les ressources en JSON versionné → facilite les updates sans code

---

## 1. SYSTÈME DE RÉSINE (ENDURANCE)

La résine est le système d'énergie d'IRMINSUL. Elle régule la progression quotidienne et empêche le farming abusif.

```
Résine Originale:
─────────────────
├── Maximum: 200 unités
├── Régénération: 1 unité / 8 minutes (~1200/jour potentiellement)
├── Régénération réelle accessible: 200 unités (16h40 pour full cap)
├── Source: temps réel (calculé à la demande, pas de tick)
└── Affichage: /profil → "🔮 Résine: 47/200 (+1 dans 3m 22s)"

Résine Condensée:
─────────────────
├── Craft: 40 résine originale → 1 résine condensée
├── Maximum en stock: 5 résine condensées
├── Utilisation: compte double sur les boss de résine
└── Objectif: permettre aux joueurs de "stocker" la résine inutilisée

Coûts en Résine:
─────────────────
├── Boss de résine (Regisvines, Anemohypostasis...): 20 résine
├── Domaines (reliques, armes): 20 résine
├── Boss hebdomadaires: 30 résine (50 résine si 1ère fois)
├── Boss mondiaux (Primo Geovishap...): 40 résine
└── Expéditions: 0 résine (mais temps d'attente)

Sources de résine supplémentaire:
───────────────────────────────────
├── Fragolite bleue (objet): +60 résine (max 5 utilisations/semaine)
├── Aide d'ami (Coop): 10% bonus résine sur les drops communs
└── Artefact "Theoculus": réduction du coût de 5 résine par boss
```

---

## 2. SYSTÈME DE GACHA (VŒUX)

### 2.1 Types de Bannières

```
BANNIÈRE DÉBUTANT (Voyage à Travers Teyvat):
─────────────────────────────────────────────
├── Disponible: 30 premiers jours du compte
├── 5★ garanti: non (pool standard uniquement)
├── 4★ garanti: tous les 10 pulls
├── Prix: 8 Destins Enchevêtrés au lieu de 10
└── Limite: 20 pulls max sur cette bannière

BANNIÈRE STANDARD (Errance en Etoile):
────────────────────────────────────────
├── Pool 5★: Diluc, Jean, Qiqi, Mona, Keqing, Tighnari, Dehya, Cyno
├── Pool 4★: Tous les 4★ non-limités
├── 5★ pity: 90 pulls (soft pity à 74 → probabilité croissante)
├── 4★ pity: 10 pulls (garanti)
├── Monnaie: Destins Entrelacés (Intertwined Fates)
└── Pas de guarantee 50/50

BANNIÈRE PERSONNAGE ÉVÉNEMENT:
───────────────────────────────
├── 5★ featured: 1 personnage spécifique (ex: Hu Tao)
├── 4★ featured: 3 personnages spécifiques en rotation
├── 5★ pity: 90 pulls (soft pity à 74)
├── 4★ pity: 10 pulls (garanti)
├── Guarantee 50/50: si tu rates le 5★ featured, le suivant est garanti
├── Guarantee 4★ featured: si tu rates 2x les 4★ featured, le suivant est garanti
└── Monnaie: Destins Enchevêtrés (Acquaint Fates)

BANNIÈRE ARME ÉVÉNEMENT:
─────────────────────────
├── 5★ featured: 2 armes spécifiques (à viser avec "Epitome Invocation")
├── 4★ featured: 5 armes spécifiques
├── 5★ pity: 80 pulls (soft pity à 63)
├── Système Epitome: pointer l'arme voulue (3 étoiles requises pour garantie)
└── Monnaie: Destins Enchevêtrés
```

### 2.2 Probabilités Détaillées

```
Probabilités de base:
─────────────────────
├── 5★: 0.6% (base)
├── 4★: 5.1% (base)
└── 3★: 94.3% (base)

Soft Pity (bannière standard/perso):
──────────────────────────────────────
├── Pull 74: probabilité 5★ commence à augmenter
├── Augmentation: +6% par pull supplémentaire après 74
├── Pull 90: 5★ garanti (100%)

Soft Pity (bannière arme):
───────────────────────────
├── Pull 63: probabilité 5★ commence à augmenter
├── Pull 80: 5★ garanti (100%)

Calcul Dégâts (pseudo-code):
──────────────────────────────
function rollGacha(banner, userPity) {
  const roll = secureRandom(0, 10000) / 10000;
  
  if (userPity.fiveStar >= 74) {
    adjustedRate = BASE_5STAR_RATE + (pity - 73) * 0.06;
  }
  
  if (roll < adjustedRate || userPity.fiveStar >= 90) {
    return draw5Star(banner);
  } else if (roll < adjustedRate + 4STAR_RATE || userPity.fourStar >= 10) {
    return draw4Star(banner);
  } else {
    return draw3Star(banner);
  }
}
```

### 2.3 Historique et Transparence

- Historique complet des vœux accessible via `/voeux historique`
- Affichage du pity actuel sur chaque bannière
- Statistiques personnelles (taux de 5★ réel, pulls totaux)
- Export de l'historique possible (fichier CSV)

---

## 3. SYSTÈME DE COMBAT

### 3.1 Combat Adapté Discord

Le combat dans IRMINSUL est **tour par tour** avec des éléments de stratégie temps-réel simulée grâce aux boutons Discord.

```
Structure d'un combat:
──────────────────────
1. Lancement: /boss <nom> → création d'un Thread privé
2. Sélection de l'équipe: boutons pour choisir 4 personnages
3. Tour de combat: le joueur choisit une action via boutons
4. Résolution: le serveur calcule, l'ennemi contre-attaque
5. Fin: victoire/défaite → récompenses distribuées → Thread archivé

Interface de combat (exemple embed):
──────────────────────────────────────
╔═══════════════════════════════════════╗
║  ⚔️ DVALIN — Seigneur du Vent        ║
║                                       ║
║  HP Boss: ████████░░░░ 62% (186,000) ║
║  Phase: 2 | Tour: 7                  ║
╠═══════════════════════════════════════╣
║  ÉQUIPE ACTIVE:                       ║
║  [⭐ Hu Tao] | Xingqiu | Yelan | ZL  ║
║  HP: 85%    Burst: ████ 80%          ║
╠═══════════════════════════════════════╣
║  RÉACTION: 🔥💧 VAPORISATION active   ║
╚═══════════════════════════════════════╝

[⚔️ ATK Normale] [🌟 Compétence] [💥 Burst] [🔄 Changer] [🏃 Fuir]
```

### 3.2 Calcul des Dégâts

```
Formule de base:
────────────────
DMG = ATK_Total × Multiplicateur_Talent × (1 + Bonus_Élémentaire%)
      × (1 - Résistance_Ennemi%) × Multiplicateur_Réaction
      × Multiplicateur_Critique

ATK_Total = ATK_Base_Personnage + ATK_Arme + ATK_Bonus_Artefacts

Multiplicateur_Critique:
  - Si CRIT: DMG × (1 + CRIT_DMG/100)
  - Sinon: DMG × 1.0
  - Probabilité: CRIT_RATE%

Résistance ennemie:
  - Rés positive: DMG × (1 - Rés/100)
  - Rés nulle: DMG × 1.0
  - Rés négative: DMG × (1 - Rés/200) [formule spéciale]

Niveaux et scaling:
  - Défense ennemie réduit les dégâts: DMG × (CharLevel + 100) / (CharLevel + 100 + EnemyDef)
```

### 3.3 Réactions Élémentaires

```
TABLEAU DES RÉACTIONS:
────────────────────────────────────────────────────────────────
Pyro + Hydro    → VAPORISATION      × 1.5 (Hydro) / × 2 (Pyro)
Pyro + Cryo     → FUSION            × 1.5 (Cryo) / × 2 (Pyro)
Pyro + Électro  → SURCHARGE         DMG explosion + Dispersion
Pyro + Dendro   → COMBUSTION        DoT Pyro continu
Hydro + Électro → ÉLECTROCHARGE     DMG Électro périodique
Hydro + Cryo    → CONGÉLATION       Ennemi immobilisé 2 tours
Hydro + Dendro  → FLORAISON         Noyaux de fleurs explosifs
Cryo + Électro  → SUPERCONDUCTEUR   -40% DEF physique ennemi
Électro + Dendro→ GERMINATION       → + Hydro = Hyperfloraison
Anémo + Any     → ANÉMOGÉNÈSE      Propagation élémentaire (×0.6 DMG)
Géo + Any       → CRISTALLISATION  Shield basé sur l'élément absorbé
────────────────────────────────────────────────────────────────

Implémentation:
  - Chaque personnage applique son élément à chaque attaque
  - L'état élémentaire de l'ennemi est stocké dans la session combat
  - La réaction se déclenche automatiquement à la détection du combo
  - Certains boss ont une résistance naturelle aux réactions
```

### 3.4 Système de Cooldowns en Combat

```
Type d'Action        | Cooldown  | Description
─────────────────────────────────────────────────────
ATK Normale          | 0s        | Disponible chaque tour
Compétence Élémentaire | 6-20s   | Selon le personnage
Burst Élémentaire    | 15-80s    | Nécessite Énergie pleine
Changement Personnage| 0s        | Libre mais 1/tour

Énergie (Burst):
  - Barre d'énergie: 0 à 100 (selon le personnage: 40-80-100)
  - Gain: ATK normale +1 énergie, reçu coup +2, compétence +8
  - Plein → bouton [💥 Burst] disponible
```

### 3.5 Compétences Passives & Constellations en Combat

```
Chaque personnage a:
├── Passif ascension 1 (débloqué à A1): bonus automatique
├── Passif ascension 4 (débloqué à A4): bonus automatique
└── Passif utilitaire (exploration Discord, non applicable au combat)

Constellations:
├── C1: Modification mineure (ex: +1 charge de compétence)
├── C2: Modification significative (ex: +20% DEF ignorée)
├── C4: Souvent ignoré par les méta-players
└── C6: Transformation majeure du kit (ex: Hu Tao C6 = invulnérabilité)
```

---

## 4. SYSTÈME D'EXPÉDITIONS

```
Mécanisme:
──────────
├── Envoyer 1-4 personnages en mission (ne sont pas disponibles en combat)
├── Durée: 4h, 8h, 12h, 20h
├── Récompenses: ressources régionales (bois, minerais, nourriture)
├── Bonus: personnage natif de la région = +25% ressources
└── Pas de résine requise

Types de ressources selon durée:
──────────────────────────────────
├── 4h: Ressources de base (herbes, minerais communs)
├── 8h: Ressources rares (cristaux, champignons spéciaux)
├── 12h: Ressources d'élite (matériaux d'ascension régionaux)
└── 20h: Ressources premium (matériaux de talents rares)

Interface Discord:
──────────────────
/expedition start → Sélection du personnage + durée
/expedition check → Voir expéditions en cours
/expedition collect → Récupérer les récompenses (notification DM à la fin)
```

---

## 5. COMMISSIONS QUOTIDIENNES

```
Mécanisme:
──────────
├── 4 commissions par jour (reset à 4h UTC)
├── Récompenses par commission: Mora + XP Aventurier + ressources
├── Bonus toutes commissions: 60 Primogens
├── Types variés: combat, exploration, craft, dialogue NPC
├── NPC de Mondstadt qui valide les commissions (/remmettre)
└── Pas de résine requise

Types de commissions:
──────────────────────
├── COMBAT: "Éliminer X ennemis de type Y" → /commission combat <type>
├── CHASSE: "Vaincre le boss aléatoire de la zone" → session combat spéciale
├── COLLECTE: "Trouver X ressources de type Y" → mini-jeu RNG
├── CRAFT: "Fabriquer X potions/nourriture" → consommer ressources
└── AIDE NPC: "Aider NPC" → embed narratif + choix multiples

Récompenses:
─────────────
├── Mora: 7,000 - 12,000 par commission
├── AR XP: 500 par commission
├── Ressources: variables selon le type
└── Bonus final: 60 Primogens + 150 AR XP
```

---

## 6. SYSTÈME D'EXPLORATION MONDIALE

### 6.1 Régions Disponibles

```
MONDSTADT  — Région du vent (Débloquée dès le départ)
LIYUE      — Région de la roche (AR15)
INAZUMA    — Région de la foudre (AR30)
SUMERU     — Région de la sagesse (AR40)
FONTAINE   — Région de la justice (AR45)
NATLAN     — Région de la guerre (AR50)
SNEZHNAYA  — Région du cryo (AR55) [endgame]
```

### 6.2 Mécanique d'Exploration

```
Progression par région:
────────────────────────
├── Exploration: 0% → 100%
├── Débloquée par: actions dans la région (boss, quêtes, expéditions)
├── Paliers de récompenses: 20% / 40% / 60% / 80% / 100%
└── 100% = récompense unique (skin exclusif, titre, primogems)

Waypoints:
──────────
├── Débloquer un waypoint → fast-travel Discord (réduction cooldown actions région)
├── Statues des Sept → augmentent HP/Stamina de l'équipe
└── Activités liées à la région → avancement de réputation

Réputation Régionale (1-10):
─────────────────────────────
├── Gagnée par: quêtes, boss, commissions de la région
├── Paliers: nouvelles commandes, recettes, plans de meubles débloqués
├── Niveau 10: titre régional exclusif + récompenses rares
└── Affichée dans: /profil → section réputation
```

---

## 7. THÉIÈRE DE SÉRÉNITHÉ (HOUSING)

### 7.1 Concept

Chaque joueur possède son propre royaume dans la théière. C'est un système de progression passif et social.

```
Système de base:
────────────────
├── Confort: 0 → 50,000 (Niveau de confort total)
├── Rang du Royaume: 1 → 8 (selon le confort)
├── Production passive: Mora + Essence de Baguette (ressource spéciale housing)
└── Capacité de visiteurs: 3 (amis peuvent visiter)

Rangs du Royaume:
──────────────────
Rang 1: Sérénithé Nue (starter)          Production: 500 Mora/heure
Rang 2: Demeure Douillette               Production: 1,200 Mora/heure
Rang 3: Jardin Luxuriant                 Production: 2,000 Mora/heure
Rang 4: Manoir Élaboré                   Production: 3,200 Mora/heure
Rang 5: Palais Magnifique                Production: 4,800 Mora/heure
Rang 6: Domaine Exquis                   Production: 6,000 Mora/heure
Rang 7: Jardin Fantastique               Production: 8,000 Mora/heure
Rang 8: Monde Merveilleux                Production: 10,000 Mora/heure
```

### 7.2 Meubles et Artisanat

```
Catégories de meubles:
───────────────────────
├── Petits meubles (tables, chaises): 50-200 Essence
├── Grands meubles (bâtiments): 500-2,000 Essence
├── Plantes décoratives: 30-100 Essence
├── Chemins et sols: 20-80 Essence/unité
└── Meubles spéciaux (événements): valeur variable

Craft de meubles:
──────────────────
/theiere craft <meuble> → Consomme ressources + Essence de Baguette
├── Bois (expéditions)
├── Pierres (mining / combat)
├── Tissus (ressources spéciales)
└── Essence de Baguette (production passive)

Personnages résidents:
──────────────────────
├── Placer un personnage de l'inventaire dans la théière
├── Bonus de production si meuble correspondant à leur lore
├── Dialogue spécial avec le personnage placé (/theiere parler <perso>)
└── Max résidents: 4 personnages
```

### 7.3 Visites Sociales

```
/theiere visiter <@ami>:
───────────────────────
├── Voir la théière d'un ami
├── Récupérer un cadeau quotidien (50 Essence de Baguette)
├── Laisser un commentaire dans le livre d'or
└── Voter pour la théière (classement hebdomadaire)

Classement des Théières:
─────────────────────────
├── Classement hebdomadaire de la "Plus Belle Théière"
├── Votes par les visiteurs amis
└── Récompenses au top 3: ressources exclusives + badge
```

---

## 8. GUILDES

### 8.1 Création et Structure

```
Création:
─────────
/guilde créer <nom> [description] → Coût: 100,000 Mora
Prérequis: AR25 minimum

Structure hiérarchique:
────────────────────────
├── Maître de Guilde (×1)  → Tous les droits
├── Officier (×5 max)      → Invitation, gestion coffre, lancement raids
├── Vétéran                → Invitation
├── Membre                 → Participation aux activités
└── Aspirant (×7 jours)   → Pas d'accès au coffre

Capacité:
──────────
├── Départ: 20 membres max
├── Amélioration: +5 membres par niveau de guilde
├── Max: 50 membres (guilde niveau 6)
```

### 8.2 Progression de Guilde

```
Niveaux de Guilde (1-10):
──────────────────────────
├── XP de guilde: contributions membres + raids + activités
├── Paliers: nouvelles fonctionnalités débloquées
│   ├── Niveau 2: Coffre de guilde (stockage partagé)
│   ├── Niveau 3: Shop de guilde exclusif
│   ├── Niveau 4: Boss de guilde (×2/semaine)
│   ├── Niveau 5: Buff de guilde passif
│   ├── Niveau 7: Guerre de guilde
│   └── Niveau 10: Badge et titre exclusif

Contributions quotidiennes:
────────────────────────────
├── Dona Mora: 10,000 Mora → +100 XP guilde + 50 Coins Guilde
├── Dona Ressources: selon rareté → XP variable + Coins Guilde
└── Participation raid: +200 XP guilde
```

### 8.3 Raids de Guilde

```
Mécanisme:
──────────
├── Boss de guilde: HP × (nombre de membres)
├── Fenêtre de raid: 24h pour tous les membres de contribuer
├── Chaque membre attaque avec son équipe
├── Dégâts cumulés de tous les membres
└── Récompenses proportionnelles à la contribution

Types de Raids:
────────────────
├── Raid Normal (hebdomadaire): boss normal, récompenses standards
├── Raid Élite (mensuel): boss boss, récompenses premium
└── Raid Légendaire (événement): boss unique, récompenses exclusives
```

### 8.4 Guerre de Guildes (Niveau 7+)

```
Format:
────────
├── Défi lancé par Maître de Guilde
├── L'autre guilde doit accepter sous 24h
├── Phase de préparation: 48h (renforcer équipes)
├── Phase de combat: 48h (score basé sur boss communs)
└── Récompense: Ressources + classement + titre temporaire

Mécanisme de score:
────────────────────
├── Chaque guilde attaque les mêmes boss (non-coopératif)
├── Score = somme des dégâts des membres
├── Bonus: diversité d'éléments, combos de réactions
└── Pénalité: abandons de combat, membres inactifs
```

---

## 9. SYSTÈME D'ÉVÉNEMENTS DYNAMIQUES

### 9.1 Types d'Événements

```
ÉVÉNEMENTS COURTS (3-7 jours):
────────────────────────────────
├── Festival des Lanternes (Liyue — Nouvel An)
├── Jeu de Chasse (combat spécial)
├── Pêche (mini-jeu texte)
├── Course de Windchasers (classement vitesse)
└── Théâtre des Constellations (quiz Genshin)

ÉVÉNEMENTS LONGS (14-21 jours):
─────────────────────────────────
├── Visions et Vœux (evento gacha spécial)
├── Tournoi des Héros (PvP indirect classement)
├── Exploration Mystérieuse (quêtes narratives)
└── Grand Concours de Craft

ÉVÉNEMENTS SAISONNIERS (42 jours):
────────────────────────────────────
├── Genshin Anniversary (cadeaux spéciaux)
├── Fêtes des éléments (semaine par élément)
└── Version update (nouveau personnage, nouvelle région)
```

### 9.2 Mécanique d'Événement

```
Chaque événement a:
────────────────────
├── Mission principale: quête narrative liée à l'événement
├── Missions quotidiennes: actions spécifiques à l'événement
├── Missions hebdomadaires: objectifs plus conséquents
├── Monnaie d'événement: spécifique à l'événement
├── Shop d'événement: objets exclusifs achetables avec la monnaie
└── Récompenses finales: déblocables à des % de completion

Points d'événement:
────────────────────
├── Participer → Gagner des points
├── Paliers de points → Récompenses croissantes (primogens, skins, meubles)
└── Classement mondial en temps réel
```

---

## 10. ABÎME SPIRALÉ

```
Structure:
──────────
├── 12 étages, 3 chambres par étage
├── 2 équipes de 4 personnages (une par moitié de chambre)
├── 36 étoiles max (3 étoiles par chambre)
├── Reset: biweekly (1er et 16 du mois)
└── Difficulté croissante

Mécaniques spéciales:
─────────────────────
├── Bénédictions Ley Line: buff élémentaire spécifique à chaque cycle
├── Invitations Ley Line: buff supplémentaire (au choix parmi 3)
├── Conditions de 3★: temps limité + pas de mort
├── Ennemis avec forte résistance élémentaire variable
└── Boss finaux: 11-3 (boss de monde) et 12-3 (boss double)

Récompenses:
─────────────
├── 1★ par chambre: Primogems (50 total × étoiles = max 600)
├── Mora proportionnel aux étoiles obtenues
├── Reset à chaque cycle: nouvelles étoiles à gagner
└── Classement serveur Discord: top abysseurs
```

---

## 11. THÉÂTRE IMAGINAIRE

```
Concept:
─────────
Alternative à l'Abîme Spiralé — Plus accessible, plus narratif

Structure:
──────────
├── 10 actes de difficulté croissante
├── Système de "personnages de renfort" aléatoires
├── Buff actifs aléatoires qui changent le gameplay
├── Pas de limite de temps (mais limite de HP)
└── Reset mensuel

Mécanique unique:
──────────────────
├── Sélectionner une composition de base (4 persos)
├── Chaque acte → ajouter 1-2 personnages de renfort (aléatoires)
├── Buff actif s'applique à tous: peut retourner la situation
├── Adaptabilité requise: pas de team figée
└── Narration légère entre chaque acte
```

---

## 12. BATTLE PASS SAISONNIER

```
Structure (42 jours):
──────────────────────
├── 50 paliers de récompenses
├── Version Gratuite: récompenses de base (mora, minerais, potions)
├── Version Premium (Primogems): récompenses doublées + exclusifs

Missions BP quotidiennes (3 missions):
───────────────────────────────────────
├── "Dépenser 100 résine"
├── "Vaincre 3 boss de résine"
├── "Compléter 4 commissions"
├── "Accomplir 2 expéditions"
└── Chacune donne 200 XP BP

Missions BP hebdomadaires (5 missions):
─────────────────────────────────────────
├── "Compléter 3 domaines différents"
├── "Vaincre le boss hebdomadaire"
├── "Contribuer à la guilde 5 fois"
├── "Gagner 200,000 mora en 1 semaine"
└── Chacune donne 900 XP BP
```

---

## 13. FEATURES ORIGINALES (PROPOSITIONS ARCHITECTE)

### 13.1 Système de Liens (Amitié Personnage)
```
├── Chaque personnage utilisé gagne des points d'amitié
├── Amitié: 1-10 (max)
├── Paliers: récompenses narratives, dialogue spécial, namecard
└── Amitié 10: carte de profil exclusive
```

### 13.2 Bestiaire / Codex
```
├── Chaque ennemi vaincu → ajouté au bestiaire
├── Description lore-friendly de l'ennemi
├── Statistiques personnelles (kills, dégâts max infligés)
└── 100% complétion → récompense unique
```

### 13.3 Système de Titres
```
├── +200 titres à débloquer (succès, réputation, performance)
├── Équiper un titre → s'affiche dans /profil et les classements
├── Titres rares très visibles (couleur, emoji exclusif)
└── Titres limités (événements) → prestige social
```

### 13.4 Quêtes d'Histoire Principales
```
├── Quêtes des Archon (histoire principale par région)
├── Quêtes légendaires des personnages (story quests)
├── Quêtes des factions (Guilde des Aventuriers, Fatui...)
└── Système de choix narratifs (impact mineur sur le lore Discord)
```

### 13.5 Marché aux Joueurs (P2P Contrôlé)
```
├── Vendre ressources aux autres joueurs (pas d'armes/persos)
├── Taxes progressives: 5% → 15% selon la valeur
├── Prix min/max imposés par le système
├── Historique public des transactions
└── Pas de Primogens échangeables entre joueurs
```
