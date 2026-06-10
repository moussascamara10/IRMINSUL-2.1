# IRMINSUL V2 — 05. PROGRESSION

> Version de conception : 2.0.0 | Statut : Phase Architecturale

---

## ANALYSE PRÉALABLE

### Risques de progression
- **Progression trop rapide** : les joueurs atteignent le cap en 2 semaines et s'ennuient → Solution : courbe XP exponentielle, endgame profond dès AR45
- **Progression trop lente** : frustration des nouveaux joueurs → Solution : boost XP pour AR1-AR20, commissions très rentables au début
- **Fossé entre joueurs** : vieux joueurs vs nouveaux → Solution : world level individuel (pas de pvp direct), contenu adaptatif
- **Manque de sens de la progression** : "pourquoi monter AR ?" → Solution : chaque AR débloque quelque chose de concret et visible

### Solutions architecturales
- XP Aventurier calculée et stockée comme entier long dans MongoDB
- Checkpoints de world level explicites avec preview des changements
- Système de "catch-up" : les joueurs retardataires gagnent +25% XP aventurier jusqu'à AR30
- Logs de progression détaillés pour analytics (quelles sources d'XP sont les plus utilisées)

---

## 1. RANG D'AVENTURIER (AR)

### 1.1 Niveaux et Seuils XP

```
AR  1 →  5 : Introductif       XP requis:     100 /  200 /  300 /  400
AR  5 → 10 : Apprenti          XP requis:     625 /  875 / 1125 / 1400 / 1700
AR 10 → 15 : Voyageur          XP requis:   2150 / 2625 / 3100 / 3600 / 4125
AR 15 → 20 : Expert            XP requis:   4725 / 5350 / 6000 / 6675 / 7400
AR 20 → 25 : Aventurier        XP requis:   9000 /10425 /11925 /13500 /15150
AR 25 → 30 : Chevalier Étoilé  XP requis:  16875 /18675 /20550 /22500 /24525
AR 30 → 35 : Magistrat         XP requis:  26625 /28800 /31050 /33375 /35775
AR 35 → 40 : Baron             XP requis:  38250 /43125 /48300 /53775 /59550
AR 40 → 45 : Vicomte           XP requis:  65625 /72000 /78675 /85650 /92925
AR 45 → 50 : Comte             XP requis: 100500 /108375/116550/125025/133800
AR 50 → 55 : Marquis           XP requis: 142875/152250/161925/171900/182175
AR 55 → 60 : Duc               XP requis: 192750/203625/214800/226275/238050
AR 60       : RANG MAX (Duc du Vent)

Total XP AR1→AR60: ~3,200,000 XP Aventurier
```

### 1.2 Sources d'XP Aventurier

```
SOURCE                          XP PAR ACTION    LIMITE/JOUR
────────────────────────────────────────────────────────────
Commission quotidienne (×4)         500 chacune    2,000 max
Bonus 4/4 commissions               150 bonus      150/jour
Boss de résine (20 résine)          100 par boss   ~1,000 max (10 boss)
Boss hebdomadaire                  1,000 par boss  3,000/semaine
Domaine (20 résine)                  75 par run    illimité (résine)
Quête principale (Archon)          2,000 - 5,000   une fois
Quête de personnage                1,500 par quête  une fois
Quête des guildes d'aventuriers      500 par quête  une fois
Exploration (% par région)           500 par 5%     100% = 10,000 par région
Statues des Sept (niveaux)           400 par niveau  une fois
Succès (catégorie combat)            200 - 1,000    une fois par succès
Battle Pass (paliers)                200 par palier  50 paliers/saison
Événement (missions quotidiennes)    300 par mission limitée à l'événement
```

### 1.3 Débloquages par AR

```
AR  1: Compte créé → équipe de 1 perso, boss Anemo Hypostasis
AR  5: Équipe de 2 persos → domaines débloqués
AR 10: Équipe de 3 persos → Liyue déverrouillée, expéditions disponibles
AR 15: Équipe de 4 persos → boss hebdomadaires disponibles (Dvalin), théière
AR 16: World Level 1 débloqué (augmentation difficulté et drops)
AR 20: Abîme Spiralé étages 1-4 → guilde disponible, marché P2P
AR 22: World Level 2
AR 25: Abîme Spiralé étages 5-8 → Inazuma déverrouillée
AR 28: World Level 3
AR 30: Abîme Spiralé étages 9-12 → Raid de guilde disponible
AR 32: World Level 4
AR 35: Théâtre Imaginaire → Sumeru déverrouillée
AR 36: World Level 5
AR 40: Guerre de guildes disponible → Fontaine déverrouillée
AR 42: World Level 6
AR 45: Battle Pass Premium disponible → Natlan déverrouillée
AR 50: World Level 7 → Classement global activé → Rôle Discord "Vétéran"
AR 55: World Level 8 → Snezhnaya déverrouillée → Contenu endgame légendaire
AR 60: RANG MAX → Titre "Duc du Vent" → Récompenses uniques permanentes
       → Rôle Discord "Légende" → Accès au Salon des Légendes exclusif
```

---

## 2. WORLD LEVEL (NIVEAU MONDIAL)

Le World Level détermine la difficulté des ennemis et la qualité des récompenses. Contrairement à Genshin, il est individuel dans IRMINSUL.

```
WORLD LEVEL | DÉBLOQUÉ À | MODIFICATEUR HP ENNEMI | MODIFICATEUR DMG | BONUS DROPS
────────────────────────────────────────────────────────────────────────────────────
WL 0        | AR 1       | ×1.0                   | ×1.0             | ×1.0
WL 1        | AR 16      | ×1.3                   | ×1.1             | ×1.2
WL 2        | AR 22      | ×1.7                   | ×1.2             | ×1.4
WL 3        | AR 28      | ×2.2                   | ×1.3             | ×1.7
WL 4        | AR 32      | ×3.0                   | ×1.5             | ×2.0
WL 5        | AR 36      | ×4.0                   | ×1.7             | ×2.4
WL 6        | AR 42      | ×5.5                   | ×2.0             | ×2.9
WL 7        | AR 50      | ×7.5                   | ×2.3             | ×3.5
WL 8        | AR 55      | ×10.0                  | ×2.7             | ×4.2

Notes:
- Les artefacts 5★ ne droppent qu'à WL3+ (sinon max 4★)
- Les matériaux d'ascension de phase 6 nécessitent WL5+
- Les boss en WL8 droppent des matériaux exclusifs (endgame craft)
- Possibilité de jouer en WL inférieur si souhaité (moins de récompenses)
```

---

## 3. PROGRESSION DES PERSONNAGES

### 3.1 Niveaux et Ascension

```
NIVEAU → ASCENSION → NIVEAU suivant

Niveau 1-20    → Phase 0 → débloquer compétence passive 1 possible
  Ascension 1 (débloque Level 40 max)
Niveau 20-40   → Phase 1
  Ascension 2 (débloque Level 50 max)
Niveau 40-50   → Phase 2 → compétence passive 1 débloquée à A2
  Ascension 3 (débloque Level 60 max)
Niveau 50-60   → Phase 3
  Ascension 4 (débloque Level 70 max) → compétence passive 2 débloquée à A4
Niveau 60-70   → Phase 4
  Ascension 5 (débloque Level 80 max)
Niveau 70-80   → Phase 5
  Ascension 6 (débloque Level 90 max)
Niveau 80-90   → Phase 6 (niveau maximum)

Coût total ascension 5★ (exemple Hu Tao):
  Mora: ~1,000,000
  Slimes (commun): 18 petits + 30 moyens + 36 grands
  Fantômes de feu (boss): 46 lanternes éternelles
  Coquelicots (spécialité): 168 coquelicots
```

### 3.2 XP Personnages

```
Sources d'XP personnage:
  - Livres d'aventurier (XP books):
      Épopée du Héros   (5★): 20,000 XP
      Mémorandum du Héros (4★): 5,000 XP
      Tome du Voyageur   (3★): 1,000 XP
  - Combat: 100 XP par combat de boss (uniquement au personnage actif)
  - Donner en fodder une arme non-voulue: 0 XP perso (c'est pour les armes)

XP Total pour niveau 1→90 (5★): ~9,400,000 XP
Équivalent en Épopées: ~470 Épopées du Héros
```

### 3.3 Amélioration des Talents

```
Niveau des talents: 1 → 10 (niveau 10 requiert Couronne de Sagesse)

COÛT PAR NIVEAU (exemple):
Niveau 1→2:  12,500 Mora + Livre × 3 + Commun ×6
Niveau 2→3:  17,500 Mora + Livre × 2 (rare) + Commun × 3
Niveau 3→4:  25,000 Mora + Livre × 4 (rare) + Commun × 4
Niveau 4→5:  30,000 Mora + Livre × 6 (rare) + Commun × 6
Niveau 5→6:  37,500 Mora + Livre × 9 (rare) + Commun × 9
Niveau 6→7:  120,000 Mora + Livre × 4 (épique) + Commun × 4 + Boss Drop × 1
Niveau 7→8:  260,000 Mora + Livre × 6 (épique) + Commun × 6 + Boss Drop × 1
Niveau 8→9:  450,000 Mora + Livre × 12 (épique) + Commun × 12 + Boss Drop × 2
Niveau 9→10: 700,000 Mora + Livre × 16 (épique) + Commun × 16 + Boss Drop × 2 + Couronne × 1

Coût total 1 talent 1→10: ~1,652,500 Mora + livres complets + 6 boss drops + 1 Couronne
```

---

## 4. PROGRESSION DES ARMES

```
NIVEAU → ASCENSION (max 6 phases) → jusqu'au niveau 90

Armes 5★ niveau 1→90:
  XP requise: ~9,400,000 (mêmes tables que les personnages)
  Matériaux: selon le type d'arme et la région thématique
  Mora total: ~900,000

Raffinement (1→5):
  Dupliquer l'arme ou utiliser un équivalent → +1 raffinement
  Effet passif amélioré à chaque raffinement

Sources de matériaux d'arme:
  - Domaines d'arme (rotation Wed/Sat et Thu/Sun selon Genshin)
  - Artisanat (forgeron)
  - Boss (certains boss droppent des matériaux d'arme)
  - Boutique (rotation hebdomadaire)
```

---

## 5. PROGRESSION DES ARTEFACTS

### 5.1 Niveau et Amélioration

```
RARETÉ | NIVEAU MAX | SOUS-STATS MAX | XP TOTAL REQUIS
────────────────────────────────────────────────────────
★★★★★  |    20      |       4        |    ~270,000 XP
★★★★   |    16      |       4        |    ~170,000 XP
★★★    |    12      |       4        |     ~80,000 XP

Gain de sous-stat: tous les 4 niveaux (5★: +4, +8, +12, +16, +20)
→ 5 améliorations de sous-stats entre 0 et +20

Sources d'XP artefact:
  - Sacrifier un autre artefact (donne son XP équivalent)
  - Minerai d'amélioration (acheter en boutique ou forger)
    · Minerai d'Amélioration Magique (1★): 2,500 XP artefact
    · Minerai d'Amélioration Fin (2★): 5,000 XP artefact
```

### 5.2 Système de Score Artefact

```
Score d'un artefact 5★ (0-100):
  - Basé sur les sub-stats utiles selon un algorithme
  - Sub-stats valorisées: CRIT Rate, CRIT DMG, ATK%, EM, ER%
  - Chaque tier de roll vaut des points différents

Calcul approximatif:
  MAX_ROLL_VALUE (e.g. CRIT Rate 3.89%): 100 points
  Chaque sub-stat a une valeur en % du max roll
  Score = Σ(valeur_roll / MAX_ROLL) × poids_stat × 25

Display: 
  0-30:   💔 Médiocre (à fodder)
  30-50:  ⚠️ Passable (utiliser en transition)
  50-65:  ✅ Correct (fonctionnel)
  65-80:  ⭐ Bon (Conserver)
  80-90:  ⭐⭐ Excellent (Garder précieusement)
  90-100: ⭐⭐⭐ Parfait (GG)
```

---

## 6. PROGRESSION DE RÉPUTATION RÉGIONALE

```
PALIERS DE RÉPUTATION (par région):
────────────────────────────────────
Rép 1: Étranger       → Rien de spécial
Rép 2: Passant         → Bouton "Lore de la région" dans /region
Rép 3: Résident        → Plan de meuble spécial de la région (housing)
Rép 4: Connu           → Recette de cuisine exclusive
Rép 5: Respecté        → Réduction 10% coût résine pour boss de la région
Rép 6: Renommé         → Accès à une quête secondaire exclusive
Rép 7: Admiré          → Plan d'arme artisanale spéciale (si applicable)
Rép 8: Célèbre         → Bonus drops +15% pour boss de la région
Rép 9: Légende Locale  → Déblocage du titre [Nom de la région] (ex: "Enfant de Mondstadt")
Rép 10: Archivé        → Skin de namecard unique + Primogens × 100 + Statue niveau max

Sources de réputation:
  - Boss régionaux: +20 rép par boss (max 5/semaine)
  - Commissions de la région: +15 rép par commission
  - Quêtes régionales: +50-200 rép (une fois)
  - Exploration: +10 rép par 5% d'exploration
  - Expéditions dans la région: +5 rép par expédition terminée
```

---

## 7. PROGRESSION DE GUILDE

```
NIVEAU DE GUILDE → DÉBLOCAGES
──────────────────────────────
Guilde Niveau 1:  Fondation → 20 membres max, chat de guilde
Guilde Niveau 2:  Coffre de guilde (100 slots) → donation possible
Guilde Niveau 3:  Shop de guilde (rotation hebdomadaire)
Guilde Niveau 4:  Boss de guilde niveau 1 (boss de résine ×5 HP)
Guilde Niveau 5:  Buff de guilde passif niveau 1 (+5% XP aventurier pour tous)
Guilde Niveau 6:  30 membres max → Boss de guilde niveau 2
Guilde Niveau 7:  Guerre de guildes disponible
Guilde Niveau 8:  Buff de guilde passif niveau 2 (+5% drops pour boss)
Guilde Niveau 9:  Raid légendaire (mensuel) → 40 membres max
Guilde Niveau 10: Badge exclusif, titre de guilde, skin Discord embed unique

XP de guilde:
  - Contribution mora quotidienne: +100 XP
  - Participation raid: +200 XP par membre participant
  - Boss de guilde terminé: +500 XP
  - Guerre de guilde gagnée: +1,000 XP
  - Membres actifs quotidiens × 10 XP

Paliers d'XP de guilde:
  Niveau 1→2: 5,000 XP
  Niveau 2→3: 15,000 XP
  Niveau 3→4: 35,000 XP
  Niveau 4→5: 75,000 XP
  Niveau 5→6: 150,000 XP
  Niveau 6→7: 300,000 XP
  Niveau 7→8: 550,000 XP
  Niveau 8→9: 900,000 XP
  Niveau 9→10: 1,500,000 XP
```

---

## 8. ENDGAME — ABÎME SPIRALÉ (DÉTAIL COMPLET)

### 8.1 Structure des Étages

```
ÉTAGES 1-4: Initiation (tous AR20+)
  Ennemis: WL+2 du joueur
  Conditions ★: Terminer en moins de 5 minutes
  Récompenses: Mora + Minerais d'amélioration + Primogens (50 ★-total)

ÉTAGES 5-8: Intermédiaire (AR25+)
  Ennemis: WL+3 du joueur
  Conditions ★: Terminer en moins de 4 minutes, max 2 morts
  Bénédictions Ley Line actives (bonus élémentaires rotatifs)
  Récompenses: Mora + Livres XP + Primogens (150 ★-total)

ÉTAGES 9-11: Avancé (AR30+)
  Ennemis: WL+4 du joueur, mécaniques complexes
  Conditions ★: Terminer en moins de 3 minutes, aucune mort
  Invitations Ley Line (choisir 1 buff parmi 3)
  Récompenses: Primogens (300 ★-total) + Artefacts 5★

ÉTAGE 12: Endgame (AR40+)
  12-1/12-2: Boss doubles avec forte résistance élémentaire
  12-3: Boss mondiaux (changent chaque cycle)
  Conditions ★: Dps check strict + aucune mort
  Récompenses: Primogens (600 ★-max total) + Ressources rares exclusives

RÉCOMPENSES TOTALES ABÎME (★MAX):
  Primogens: 600 (= 3.75 vœux)
  Mora: 150,000
  Artéfact 5★: 1 garanti (étage 12)
```

### 8.2 Bénédictions Ley Line (cycle)

```
Les bénédictions changent avec le cycle (toutes les 2 semaines):
  Exemples:
  - "Fureur Pyro: ATK Pyro +40%, les attaques normales appliquent Pyro"
  - "Domaine du Cryo: Ennemis congelés ont -20% DEF"
  - "Déchaînement Électro: chaque Surcharge génère des Orbes d'Énergie"

Impact stratégique: force l'adaptation des teams, pas de composition fixe
```

### 8.3 Système de Score Interne (Classement)

```
Score = (étoiles × 10,000) + (temps_restant × 100) + (HP_total_équipes_restant / 10)

Classement serveur basé sur ce score
Top 3 → Badge hebdomadaire spécial affiché sur le profil
```

---

## 9. ENDGAME — THÉÂTRE IMAGINAIRE (DÉTAIL COMPLET)

```
Structure: 10 Actes (reset mensuel)

Acte 1-3: Exposition
  HP perso conservé entre les actes
  Renforts aléatoires: 1 perso de rareté 4★
  Buff actif: simple (+20% ATK pendant 30s au début)

Acte 4-6: Développement
  Renforts aléatoires: 1-2 persos (4★ ou 5★)
  Buffs actifs: complexes (réactions décuplées, burst gratuit, etc.)
  Mécaniques spéciales: zones d'ombre, murs de feu

Acte 7-9: Climax
  Renforts: 2 persos aléatoires (dont 1 garanti 5★)
  Buffs actifs: transformateurs (ex: chaque mort renforce l'équipe)
  Rencontres: 2-3 ennemis d'élite simultanément

Acte 10: Finale
  Boss final unique (thème de la saison)
  Renforts: 3 persos aléatoires (mais le joueur peut en refuser 1)
  Récompenses maximales si acte 10 complété

Récompenses totales Actes 1→10:
  - Primogens: 420
  - Mora: 120,000
  - Livres XP: 30 épopées
  - Ressource exclusive: "Imaginite" (craft d'objets spéciaux)
```

---

## 10. ENDGAME — CHRONIQUES DE GUILDE (Raids Légendaires)

```
Disponible: Guilde niveau 9+, AR45+

Format:
  - 8 joueurs maximum en "semi-coop"
  - Chacun attaque le boss avec son équipe
  - HP boss = HP_BASE × 8 × modificateur
  - Fenêtre: 48h pour que tous contribuent

Mécanique spéciale:
  - Chaque 25% HP retiré → Phase suivante (mécaniques plus dures)
  - Si un joueur échoue son combat → Les autres peuvent "relancer"
  - Joueur avec le plus de dégâts → "MVP" → Récompenses bonus

Récompenses Raid Légendaire:
  - Matériaux exclusifs: "Éclats de Légende" (craft d'armes légendaires)
  - Primogens: 80 par raid terminé
  - Artefacts 5★ de sets exclusifs (raid uniquement)
  - XP de guilde massive: +2,000 par raid réussi
```

---

## 11. PROGRESSION DU BATTLE PASS SAISONNIER

```
STRUCTURE D'UNE SAISON (42 jours):
─────────────────────────────────
50 paliers de récompenses

XP REQUIS PAR PALIER:
  Paliers 1-10:   150 XP chacun = 1,500 XP total
  Paliers 11-30:  300 XP chacun = 6,000 XP total
  Paliers 31-50:  400 XP chacun = 8,000 XP total
  Total: 15,500 XP pour compléter la saison

SOURCES D'XP BP:
  Mission quotidienne (3/jour): 200 XP chacune = 600 max/jour
  Mission hebdomadaire (5/semaine): 900 XP chacune = 4,500 max/semaine
  Total max: 600×42 + 4,500×6 = 25,200 + 27,000 = 52,200 XP
  → Possible de compléter sans tous les jours (marge confortable)

RÉCOMPENSES PALIERS (exemples):
  Palier  5  (gratuit): 10,000 Mora
  Palier  5  (premium): 2 Destins Enchevêtrés
  Palier 10  (gratuit): Livre XP × 5
  Palier 10  (premium): 1 Destin Entrelacé + Livre Boss
  Palier 20  (gratuit): 20,000 Mora + Minerais
  Palier 20  (premium): 4 Destins Enchevêtrés
  Palier 30  (gratuit): Matériaux d'ascension
  Palier 30  (premium): Talent book Set complet
  Palier 40  (gratuit): 30,000 Mora + 2 Livres XP épopées
  Palier 40  (premium): 5★ Arme au choix (limitée BP, type "Épée de Sable Séchersse")
  Palier 50  (gratuit): 50,000 Mora + Primogens × 10
  Palier 50  (premium): Primogens × 160 + Namecard saisonnière exclusive

PREMIUM BP: coûte 680 Primogens (achetables uniquement en boutique officielle Discord)
```

---

## 12. PROGRESSION AMITIÉ PERSONNAGE

```
Amitié 1 → 10 (par personnage individuellement)

XP AMITIÉ:
  Personnage actif en combat boss: +8 XP/combat
  Personnage actif en domaine: +6 XP/run
  Personnage en commission: +4 XP par commission
  Personnage placé dans théière: +2 XP/heure (max 20/jour)
  Expédition terminée (personnage envoyé): +10 XP

PALIERS:
  Amitié 2: Déblocage du lore "Compétences" du personnage
  Amitié 4: Voix de bataille exclusive (simulation audio embed)
  Amitié 6: Namecard unique du personnage
  Amitié 8: Dialogue profond dans la théière (lore exclusif)
  Amitié 10: Titre "Ami de [Nom du Personnage]" + Stars bonus dans le profil

XP TOTAL AMITIÉ 1→10: ~24,000 XP amitié par personnage
```

---

## 13. RÉCAPITULATIF DES PLAFONDS DE PROGRESSION

```
ÉLÉMENT                    | VALEUR MAX    | NOTES
──────────────────────────────────────────────────────────────────
Rang d'Aventurier          | 60            | Débloqué progressivement
World Level                | 8             | Individuel, AR-dépendant
Niveau Personnage          | 90            | 6 phases d'ascension
Constellations             | C6            | Nécessite 7 copies du perso (gacha)
Niveau Talent              | 10            | Niveau 10 requiert Couronne
Niveau Arme                | 90            | Même mécanique que perso
Raffinement Arme           | R5            | 4 copies supplémentaires requises
Niveau Artefact            | 20 (5★)       | Compétitif à partir de +16
Réputation Régionale       | 10            | Par région
Amitié Personnage          | 10            | Par personnage
Abîme Spiralé              | 12-3 (36★)   | Reset bi-weekly
Théâtre Imaginaire         | Acte 10       | Reset mensuel
Niveau Guilde              | 10            | Progressif collectif
Rang BP                    | 50            | Reset saisonnier (42j)
```
