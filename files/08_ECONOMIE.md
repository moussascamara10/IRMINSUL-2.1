# IRMINSUL V2 — 08. ÉCONOMIE

> Version de conception : 2.0.0 | Statut : Phase Architecturale

---

## ANALYSE PRÉALABLE

### Risques économiques critiques
- **Hyperinflation du Mora** : si les sources sont trop généreuses, le Mora devient inutile → Solution : sinks (puits) de Mora massifs dans l'amélioration de personnages/artefacts
- **Deflation des Primogens** : si les pulls sont trop rares, frustration et churn → Solution : ~40-60 Primogens/jour garantis pour les joueurs actifs
- **Marché P2P déséquilibré** : monopoles, price-fixing, dumping → Solution : prix min/max fixés par algorithme, taxes progressives
- **Duplication de richesse via guildes** : farming du coffre commun → Solution : limites strictes de retrait, log public des transactions de coffre
- **Multi-comptes pour fermer les Primogens** : → Solution : 1 compte par IP (soft limit) + vérification Discord 6 mois d'âge minimum

### Principes économiques directeurs
```
1. MORA: Monnaie abondante mais toujours insuffisante (comme dans Genshin)
   → Sources nombreuses, sinks encore plus nombreux
   
2. PRIMOGENS: Monnaie rare et précieuse
   → ~50/jour pour un joueur très actif (soit ~1 pull tous les 3 jours)
   
3. RESSOURCES: Bottleneck principal de progression
   → La résine limite naturellement le farming → pas de progression instantanée

4. Jamais de P2W direct: pas d'achat de Primogens avec de l'argent réel
   → Battle Pass Premium seul contenu premium (cosmétique + accélération légère)
```

---

## 1. MONNAIES DU JEU

### 1.1 Tableau Général des Monnaies

```
MONNAIE              | SYMBOLE | OBTENTION          | UTILISATION
─────────────────────────────────────────────────────────────────────────────
Mora                 | 💰      | Partout            | Amélioration, craft, marché
Primogens            | 💎      | Activités          | Acheter des Fates/Destins
Destins Enchevêtrés  | 🔮      | Primogems (160)    | Bannières Événement, Standard
Destins Entrelacés   | ✨      | Primogems (160)    | Bannière Standard
Poussière Stellaire  | 🌟      | Pulls (3★ = 15)    | Shop Starglitter/Stardust
Lueur Stellaire      | ⭐      | Pulls (4★=2, 5★=10)| Shop items rares
Essence de Baguette  | 🪄      | Théière, Visites   | Craft meubles housing
Resine (resource)    | 🔷      | Regen temps réel   | Boss, Domaines
Résine Condensée     | 🔷🔷    | Craft (40 résine)  | Boss (×2 normal)
Coins de Guilde      | 🏅      | Contributions      | Shop de Guilde exclusif
Monnaie d'Événement  | 🎪      | Événements actifs  | Shop d'Événement temporaire
Imaginite            | 🎭      | Théâtre Imaginaire | Craft items endgame
Éclats de Légende    | 🌠      | Raids Légendaires  | Craft armes légendaires
```

### 1.2 Taux de Change et Conversions

```
CONVERSIONS DIRECTES:
  160 Primogens → 1 Destin (Enchevêtré ou Entrelacé, au choix)
  15 Poussière Stellaire → Obtenu automatiquement pour chaque 3★ tiré
  2  Lueur Stellaire → Obtenu automatiquement pour chaque 4★ tiré
  10 Lueur Stellaire → Obtenu automatiquement pour chaque 5★ tiré
  5  Lueur Stellaire → Si perso 5★ déjà C6 → drop converti
  2  Lueur Stellaire → Si perso 4★ déjà C6 → drop converti

SHOP STARGLITTER (Lueur Stellaire):
  1 Destin Enchevêtré = 5 Lueurs Stellaires (max 5/mois)
  Matériaux d'ascension rares = 2-4 Lueurs Stellaires

SHOP STARDUST (Poussière Stellaire):
  1 Destin Enchevêtré = 75 Poussières (max 2/mois)
  1 Destin Entrelacé = 75 Poussières (max 2/mois)
  Ressources diverses = 5-20 Poussières
```

---

## 2. MORA (MONNAIE PRINCIPALE)

### 2.1 Sources de Mora

```
SOURCE                          | QUANTITÉ      | FRÉQUENCE
───────────────────────────────────────────────────────────────────
Commission quotidienne (×4)     | 7,000-12,000  | Quotidien
Bonus 4/4 commissions           | 5,000         | Quotidien
Boss de résine (×10 max/jour)   | 1,500-3,000   | Par combat
Boss hebdomadaire (×3)          | 2,500         | Hebdomadaire
Domaine d'artefacts             | 1,500-2,000   | Par run
Expéditions terminées           | 500-2,500     | 4-20h cycle
Theière de Sérénithé            | 500-10,000/h  | Production passive
Marché P2P (vente)              | Variable      | Par transaction
Vendeur NPC (vendre ressources) | Variable      | Sur demande
Récompenses de quêtes           | 5,000-50,000  | Une fois
Succès (récompenses)            | 1,000-100,000 | Une fois
Battle Pass (paliers)           | 10,000-50,000 | Saisonnier
Classement Abîme Spiralé        | 50,000-200,000| Bi-hebdomadaire
Événements                      | Variable      | Événementiel
Vente Starglitter shop           | N/A           | Indirect

ESTIMATION MORA QUOTIDIENNE (joueur actif):
  Commissions:     45,000 Mora
  Boss ×10:        20,000 Mora
  Expéditions:      8,000 Mora
  Théière (Rang 5): 5,000 Mora × (en ligne = collecte 12h) → 60,000/collecte
  Total estimé:    ~80,000 à 130,000 Mora/jour
```

### 2.2 Sinks de Mora (Dépenses)

```
DÉPENSE                         | COÛT                  | FRÉQUENCE
─────────────────────────────────────────────────────────────────────────
Niveau personnage (1→90)        | ~1,000,000 total      | Par personnage
Ascension personnage (6 phases) | ~420,000 total        | Par personnage
Amélioration talent (1→10 ×3)  | ~4,957,500 total      | Par personnage × 3 talents
Niveau arme (1→90)              | ~900,000 total        | Par arme
Ascension arme (6 phases)       | ~225,000 total        | Par arme
Amélioration artefact (0→20)    | ~475,000 total        | Par artefact
Transmutation matériaux         | 500 par transmu.      | À la demande
Craft meubles housing           | Variable (1K-50K)     | Par meuble
Création guilde                 | 100,000               | Une fois
Marché P2P (achat)              | Variable              | Par achat
Forgeron (craft armes)          | 500-50,000            | Par craft

EXEMPLE DE COÛT POUR OPTIMISER UN PERSONNAGE COMPLET (Hu Tao AR60 ready):
  Niveau 90:                1,052,400 Mora
  Ascension ×6:               420,600 Mora
  Talent NA 9→10:             700,000 Mora
  Talent Skill 9→10:          700,000 Mora
  Talent Burst 9→10:          700,000 Mora
  Arme (Homa) Niveau 90:      900,000 Mora
  Arme ascension ×6:          225,000 Mora
  5 Artefacts +20:          2,375,000 Mora (5 × 475,000)
  ──────────────────────────────────────────────────────
  TOTAL UN PERSO OPTIMISÉ:  ~7,072,000 Mora

OBJECTIF: Le joueur doit toujours sentir qu'il n'a "jamais assez" de Mora.
           ~7M Mora par perso × 4 persos actifs = 28M Mora minimum pour une équipe.
           Le joueur gagne ~2.4M Mora/mois (actif) → environ 12 mois pour une équipe.
           Mais il reçoit aussi des personnages new → sink perpétuel.
```

### 2.3 Plafond de Mora

```
Plafond technique: 999,999,999 Mora (999M)
Plafond pratique: ~50-80M pour un joueur endgame heureux
Alerte admin: > 500M Mora → flag pour review (possible exploit)

Moral test: Un joueur AR60 endgame devrait avoir ~20-100M Mora en stock.
Si stack > 200M → le joueur est trop riche → revoir les sinks.
```

---

## 3. PRIMOGENS

### 3.1 Sources de Primogens

```
SOURCE                                  | QUANTITÉ  | FRÉQUENCE
────────────────────────────────────────────────────────────────────────
Commissions quotidiennes (bonus 4/4)    | 60        | Quotidien
Abîme Spiralé (★ max 36)              | 600       | Bi-hebdomadaire
Théâtre Imaginaire (actes 1-10)        | 420       | Mensuel
Battle Pass (paliers gratuits)         | ~160-300  | Saisonnier (42j)
Battle Pass (paliers premium)          | ~960      | Saisonnier (premium)
Quêtes d'Archon (par région)          | 100-200   | Une fois par quête
Quêtes de personnages                  | 40-80     | Une fois
Succès (récompenses)                   | 5-50      | Une fois
Exploration (100% par région)          | 200       | Une fois par région
Réputation régionale (niveau 10)       | 100       | Une fois
Événements (quêtes événements)         | 20-80     | Par événement actif
Codes promo (mainteneur du bot)        | 30-60     | Occasionnel
Statues des Sept (niveau max)          | 50        | Une fois par statue
Succès cachés                          | 5-20      | Une fois

ESTIMATION PRIMOGENS QUOTIDIENS (joueur actif stable):
  Commissions:           60/jour
  Abîme (étalé):        ~43/jour (600 / 14j)
  Théâtre (étalé):      ~14/jour (420 / 30j)
  BP gratuit (étalé):    ~6/jour (300 / 42j)
  Événements (étalé):   ~10/jour (estimation)
  ───────────────────────────────────────────
  TOTAL STABLE:          ~133 Primogens/jour
  ≈ 1 pull tous les 1.2 jours (160 = 1 pull)
  ≈ ~110 pulls/mois pour un joueur ultra-actif

OBJECTIF ÉQUILIBRE: 70-120 Primogens/jour pour un joueur actif
  (fidèle à Genshin Impact réel: ~60-70/jour)
```

### 3.2 Achat de Primogens (Modèle Économique)

```
IRMINSUL V2 N'EST PAS P2W — Pas de vente directe de Primogens contre argent réel.

Seule option premium: Battle Pass Premium
  Coût: 680 Primogens (obtenus en jeu) — OU — via Patreon du bot (contribution volontaire)
  Récompenses BP Premium: ~960 Primogens + 8 Destins supplémentaires
  ROI: rentable dès le palier 20

Modèle de financement:
  - Patreon/Ko-fi: contributions volontaires → accès BP Premium
  - Aucun avantage gameplay direct pour les donateurs (hors BP)
  - Serveurs premium: serveurs qui soutiennent le bot → cosmétiques serveur exclusifs
  - Jamais de vente de Primogens, jamais de vente de personnages
```

---

## 4. RESSOURCES (MATÉRIAUX)

### 4.1 Catégories de Ressources

```
CATÉGORIE 1 — MATÉRIAUX COMMUNS (Drops d'ennemis faibles):
  Gelée de Slime (3 variantes): Petit/Moyen/Grand
  Plumes de Hilichurl (3 variantes)
  Cendres de Samachurl (3 variantes)
  Circuits de Ruin Guard (3 variantes)
  Fragments de Métal Fondu (3 variantes)
  Source: Combat PvE général, boss de résine (sous-drops)
  Méthode d'obtention Discord: /commission combat, drop automatique en boss

CATÉGORIE 2 — RESSOURCES DE TALENTS (Livres + drops de boss hebdo):
  Livres de Liberté → Mondstadt (Dimanche/Mercredi)
  Livres de Résistance → Mondstadt (Lundi/Jeudi)
  Livres de Poésie → Mondstadt (Mardi/Vendredi)
  Livres de Diligence → Liyue (Mardi/Vendredi)
  Livres de Prière → Liyue (Dimanche/Mercredi)
  Livres de Sagesse → Liyue (Lundi/Jeudi)
  [+ 12 autres livres pour Inazuma, Sumeru, Fontaine, Natlan]
  
  Disponibilité Discord: Rotation hebdomadaire dans le catalogue des domaines
  Un seul domaine de livres disponible par jour (comme Genshin)
  Samedi: TOUS les livres disponibles

CATÉGORIE 3 — GEMMES D'ASCENSION (Par élément):
  7 éléments × 4 niveaux = 28 types de gemmes
  Source: Boss de résine correspondant à l'élément
  Exemple: Éclat Agnidus (Pyro 1★) → Hypostasis Pyro

CATÉGORIE 4 — SPÉCIALITÉS RÉGIONALES (XP artefact/ascension):
  Coquelicots de Jade → Liyue (personnages Liyue)
  Sakura Buds → Inazuma
  Sumeru Rose → Sumeru
  [etc. par région]
  Source: Expéditions dans la région + exploration

CATÉGORIE 5 — MATÉRIAUX DE BOSS HEBDOMADAIRES:
  Plume de Dvalin, Bague de Boreas, Cœur Infernal de Signora, etc.
  Source: Boss hebdomadaires uniquement
  Ces matériaux sont les SEULS bottlenecks irremplaçables pour les talents high-level

CATÉGORIE 6 — RESSOURCES ENDGAME EXCLUSIVES:
  Couronne de Sagesse → Talent niveau 10 (très rare, max 3 par saison)
  Éclats de Légende → Craft armes légendaires (Raids Légendaires seulement)
  Imaginite → Théâtre Imaginaire → Craft items spéciaux
```

### 4.2 Équilibre des Ressources

```
PROBLÈME CLASSIQUE: Bottleneck des livres de talents
  Solution: Disponibles 6 jours sur 7 (pas de rotation stricte comme Genshin)
  Mais: Coûts élevés maintiennent le sink en Mora + matériaux boss

PROBLÈME CLASSIQUE: Surplus de ressources communes, manque de rares
  Solution:
    - Transmutation: 3 ressources communes → 1 rare (avec coût Mora)
    - Boutique hebdomadaire: rotation d'achat avec Starglitter
    - Expéditions: cibler le type voulu

PROBLÈME CLASSIQUE: Un seul personnage bloque la progression (dépendance)
  Solution:
    - Multi-équipe encouragée → progression parallèle
    - Ressources d'un élément utilisables pour tout perso de cet élément
    - Pas de ressource strictement "one per character" (hors boss hebdo drops)

STOCK DE RESSOURCES — Limites:
  Pas de limite imposée sur les ressources communes et rares
  Limite théière housing: 5,000 pièces de bois/minerai max
  Résine condensée: 5 max
  Livres XP: Pas de limite (se stack naturellement)
```

---

## 5. SYSTÈME DE BOUTIQUE (SHOPS)

### 5.1 Boutique Lueur Stellaire (Starglitter)

```
Renouvellement: Mensuel

ITEMS PERMANENTS:
  5 Destins Enchevêtrés: 5 Lueurs chacun (max 5/mois)
  Matériau d'ascension rare: 2-3 Lueurs (stock variable)

ITEMS ROTATIFS (changent chaque mois):
  Personnage 4★ Featured: 34 Lueurs (1 copy max)
  Arme 4★ Featured: 24 Lueurs (1 copy max)

STRATÉGIE: Le shop Starglitter permet de cibler un 4★ spécifique sans gacha.
  Un joueur qui ne tire qu'en ×10 accumule assez de Lueurs pour 1 perso 4★/mois.
```

### 5.2 Boutique Poussière Stellaire (Stardust)

```
Renouvellement: Mensuel

ITEMS PERMANENTS:
  2 Destins Enchevêtrés: 75 Poussières chacun (max 2/mois)
  2 Destins Entrelacés: 75 Poussières chacun (max 2/mois)
  Résine (60): 60 Poussières (max 3/mois)
  Potions d'XP perso (lot): 40 Poussières (max 5/mois)
  Mora (10,000): 40 Poussières (max 4/mois)

STRATÉGIE: Permet d'accumuler ~4 Destins par mois garanti avec 600 Poussières.
  Un joueur moyen tire ~300 pulls/mois = 45 3★ × 15 poussières = 675 Poussières.
  → Environ 4 Destins bonus mensuels garantis via shop.
```

### 5.3 Boutique de Guilde

```
Renouvellement: Hebdomadaire

Items disponibles selon le niveau de guilde:
  Niveau 3+:
    Mora (50,000): 200 Coins de Guilde
    Minerais d'amélioration (lot ×10): 150 Coins
    Livre XP Aventurier (Mémorandum): 80 Coins (max 5)
  
  Niveau 5+:
    Livre XP Épopée: 400 Coins (max 3)
    Matériaux de talents (communs): 300 Coins (max 3)
  
  Niveau 7+:
    Destin Enchevêtré: 1,500 Coins (max 1/mois)
    Namecard de Guilde: 3,000 Coins (une fois)
  
  Niveau 10:
    Artefact 5★ sélectionnable: 8,000 Coins (max 1/mois)
    Skin d'embed exclusif Guilde: 10,000 Coins (une fois)

NOTE: Les Coins de Guilde sont personnels (non-transférables entre membres).
```

### 5.4 Boutique d'Événement

```
Propre à chaque événement (dure pendant l'événement)
Contient:
  - Matériaux d'ascension (toujours utiles)
  - Ressources de talents
  - Artefacts (souvent 4★ sélectionnables)
  - Items exclusifs à l'événement (meubles housing, titres, namecards)
  - Dans les gros événements: 1 perso 4★ gratuit sélectionnable

IMPORTANT: La monnaie d'événement expire à la fin de l'événement.
  → Incitation forte à participer avant la fin.
```

---

## 6. MARCHÉ P2P (JOUEUR À JOUEUR)

### 6.1 Règles du Marché

```
CE QUI PEUT ÊTRE VENDU:
  ✅ Ressources communes et rares (toutes catégories 1-4)
  ✅ Armes 4★ non-équipées
  ✅ Artefacts 4★ non-équipés
  ✅ Essence de Baguette (housing)
  ✅ Potions et nourriture (si système cuisine implémenté)

CE QUI NE PEUT PAS ÊTRE VENDU:
  ❌ Primogens (jamais)
  ❌ Destins (jamais)
  ❌ Personnages (jamais)
  ❌ Armes 5★ (jamais)
  ❌ Artefacts 5★ (protection de l'équilibre)
  ❌ Matériaux de boss hebdomadaires (protection de l'équilibre)
  ❌ Couronnes de Sagesse (ultra-rares, protégées)
  ❌ Éclats de Légende (endgame exclusif)
```

### 6.2 Taxes et Prix

```
PRIX MIN/MAX (par catégorie de ressource):
  Ressources communes:   Min: 10 Mora    Max: 500 Mora /unité
  Ressources rares:      Min: 100 Mora   Max: 5,000 Mora /unité
  Armes 4★:             Min: 50,000     Max: 500,000 Mora
  Artefacts 4★:         Min: 5,000      Max: 100,000 Mora

TAXES PROGRESSIVES (prélevées sur le vendeur à la vente):
  Prix de vente 0-10,000 Mora:     Taxe 5%
  Prix de vente 10K-100K Mora:     Taxe 8%
  Prix de vente 100K-1M Mora:      Taxe 12%
  Prix de vente > 1M Mora:         Taxe 15%

EXEMPLES:
  Vente Cristal d'Amas (rare) × 10 à 3,000/u = 30,000 Mora
  → Taxe 8% = 2,400 Mora → Vendeur reçoit 27,600 Mora
  
  Vente Arme 4★ à 200,000 Mora
  → Taxe 12% = 24,000 Mora → Vendeur reçoit 176,000 Mora

LIMITE ANNONCES:
  Max 5 annonces actives par joueur
  Durée max par annonce: 24h (expiration automatique)
  Si expirée: ressources retournent au vendeur

HISTORIQUE PUBLIC:
  Toutes les transactions sont visibles dans /marche historique
  Dernières 100 transactions par item
  → Transparence + régulation naturelle des prix
```

### 6.3 Algorithme de Prix Recommandés

```typescript
function getRecommendedPrice(resourceId: string, quantity: number): PriceRange {
  // Récupérer les 50 dernières transactions pour cet item
  const recentTransactions = await db.market.find({ itemId: resourceId })
    .sort({ soldAt: -1 }).limit(50);
  
  if (recentTransactions.length === 0) {
    return { min: PRICE_FLOOR[resourceId], max: PRICE_CAP[resourceId] };
  }
  
  const prices = recentTransactions.map(t => t.pricePerUnit);
  const median = calculateMedian(prices);
  const stdDev = calculateStdDev(prices);
  
  return {
    recommended: Math.round(median),
    min: Math.max(PRICE_FLOOR[resourceId], Math.round(median - stdDev)),
    max: Math.min(PRICE_CAP[resourceId], Math.round(median + stdDev * 2)),
    trend: calculateTrend(recentTransactions), // "rising", "falling", "stable"
  };
}
```

---

## 7. SYSTÈME DE RÉCOMPENSES QUOTIDIENNES ET HEBDOMADAIRES

### 7.1 Connexion Quotidienne (Login Bonus)

```
Jour 1:  10,000 Mora
Jour 2:  5 Poussières Stellaires
Jour 3:  1 Destin Entrelacé
Jour 4:  5 Minerais d'amélioration
Jour 5:  20,000 Mora
Jour 6:  10 Lueurs Stellaires
Jour 7:  1 Destin Enchevêtré + 20,000 Mora

Après 7 jours: Recommence avec une récompense de bonus:
  Semaine 2: +30,000 Mora bonus
  Semaine 3: +1 Destin Enchevêtré bonus
  Semaine 4: +2 Destins Enchevêtrés bonus (mensuel complet = 8 Destins garantis)
  Mois complet (30j): Récompense spéciale (Éclat de gemme 5★ au choix)
```

### 7.2 Récompenses Hebdomadaires Automatiques

```
Reset lundi à 4h UTC:
  
  Récompenses automatiques si actif la semaine précédente (≥3 jours):
    - 50,000 Mora
    - 3 Livres XP Aventurier (Mémorandum)
    - 1 Livre de Talent (commun, au choix de l'élément voulu)
  
  Récompenses si objectifs hebdo accomplis:
    - 3 boss hebdo complétés: +2 Destins Enchevêtrés
    - Abîme Spiralé ≥ 6 étoiles: +1 Destin Enchevêtré + Primogens selon étoiles
    - 5 contributions de guilde: +200 Coins de Guilde + 30,000 Mora
```

---

## 8. ÉQUILIBRE ÉCONOMIQUE — MODÉLISATION

### 8.1 Flux d'Économie Quotidien Modélisé

```
JOUEUR TYPE: AR45, équipe optimale Hu Tao, actif 2h/jour

ENTRÉES:
  Commissions (4):           ~40,000 Mora + 60 Primogens
  Boss résine (10 runs):     ~20,000 Mora + Matériaux
  Expéditions (2 cycles):    ~16,000 Mora + Ressources
  Théière (Rang 6, 10h):    ~60,000 Mora (production)
  Login quotidien:           ~10,000 Mora + ressources
  TOTAL ENTRANT:             ~146,000 Mora / 60 Primogens par jour

SORTIES QUOTIDIENNES:
  Amélioration en cours (en dépensant résine):
    Artefacts +20 (×1/semaine): ~475,000/7 ≈ 68,000/jour
    Ressources craft théière:   ~20,000/jour
  Marché (achats):             Variable, ~30,000/jour moyen
  TOTAL SORTANT:               ~118,000 Mora/jour

BILAN: +28,000 Mora/jour net
  → En 1 mois: +840,000 Mora de gain net
  → En 1 an: ~10M Mora de gain net si pas de nouveau personnage
  
MAIS: Chaque nouveau personnage = ~7M Mora de sink → Équilibre maintenu
  Avec ~1 nouveau perso/mois: Mora net = ~3M Mora/mois
  Joueur toujours légèrement positif mais jamais riche sans effort
```

### 8.2 Modèle de Richesse par Rang

```
RANG AVENTURIER | MORA TYPIQUE | PRIMOGENS STOCK | ÉTAT
────────────────────────────────────────────────────────
AR 1-15         | 0-500K       | 0-200            | Tout dépenser dès que possible
AR 16-25        | 500K-2M      | 200-500          | Stock se constitue
AR 26-35        | 2M-8M        | 500-1,600        | ~10 pulls en stock
AR 36-45        | 8M-20M       | 1,600-3,200      | ~20 pulls, begin optimizing
AR 46-55        | 20M-50M      | 3,200-6,400      | ~40 pulls
AR 56-60        | 50M-150M     | 6,400-16,000     | ~100 pulls potentiels
AR 60 (endgame) | 50M-200M     | Dépend           | Farming en cours

NOTE: Ces valeurs varient énormément selon le style de jeu.
  Un joueur frugal AR50 peut avoir 300 pulls stockés.
  Un gacha-addict AR50 peut avoir 0 Primogem et 200M Mora inutilisé.
```

---

## 9. PRÉVENTION DES ABUS ÉCONOMIQUES

### 9.1 Système de Détection d'Anomalies

```typescript
// Déclencheurs automatiques d'alerte admin
const ANOMALY_THRESHOLDS = {
  mora: {
    gained_per_hour: 5_000_000,    // > 5M Mora/heure → suspect
    total_cap_alert: 500_000_000,   // > 500M total → flag
  },
  primogens: {
    gained_per_hour: 1_000,         // > 1,000 Primogens/heure → suspect
    pulls_per_minute: 40,           // > 40 pulls/minute → anti-bot
  },
  market: {
    listings_per_hour: 20,          // > 20 annonces/heure → market bot
    purchases_per_minute: 5,        // > 5 achats/minute → bot
    price_deviation: 5,             // Prix > 5× médiane → price fixing
  },
};

async function checkEconomicAnomaly(userId: string, action: EconomicAction) {
  const hourlyStats = await getHourlyStats(userId);
  
  if (hourlyStats.moraGained > ANOMALY_THRESHOLDS.mora.gained_per_hour) {
    await flagUser(userId, 'MORA_ANOMALY', hourlyStats);
    await notifyAdmin(`⚠️ ${userId} a gagné ${hourlyStats.moraGained} Mora en 1h`);
  }
  
  // Limiter silencieusement sans banning immédiat (shadow limit)
  if (hourlyStats.marketListings > ANOMALY_THRESHOLDS.market.listings_per_hour) {
    throw new RateLimitError('Trop d\'annonces créées récemment');
  }
}
```

### 9.2 Protections Anti-Exploits Spécifiques

```
PROTECTION 1 — Transaction Atomique:
  Toutes les transactions Mora/ressources utilisent MongoDB Sessions
  Si une étape échoue → rollback complet → pas de duplication

PROTECTION 2 — Vérification Solde Avant Déduction:
  Pour CHAQUE dépense: vérifier le solde actuel en DB avant de déduire
  Jamais de "optimistic update" sans confirmation DB

PROTECTION 3 — Résine Calculée à la Demande:
  La résine n'est jamais stockée comme valeur fixe en DB
  Elle est calculée: résine_actuelle = min(200, résine_base + (maintenant - last_update) / 8min)
  → Impossible de manipuler la résine sans accès direct à la DB

PROTECTION 4 — Cooldowns Côté Serveur:
  Tous les cooldowns sont dans Redis côté serveur
  Le client (Discord) ne peut pas les modifier
  
PROTECTION 5 — Checksums de Session Combat:
  Chaque action de combat génère un hash de l'état
  Si le hash reçu ne correspond pas → session invalide → défaite forcée

PROTECTION 6 — Rate Limiting Granulaire:
  /voeux:   40 pulls/minute maximum
  /marche:  20 transactions/heure
  /boss:    10 combats/heure
  /commission: 4/jour (hard cap en DB, pas seulement cooldown)
```

---

## 10. TABLEAU DE BORD ÉCONOMIQUE ADMIN

```
Une interface admin (commande /admin économie) permettant de voir:

  💰 Mora total en circulation: X,XXX,XXX,XXX Mora
  💎 Primogens totaux distribués: XXX,XXX
  🔮 Destins totaux distribués: XX,XXX
  ✨ Total pulls effectués: XX,XXX
  📊 Taux de 5★ global: X.XX%
  🏪 Volume marché 24h: XX,XXX,XXX Mora
  ⚠️ Comptes flaggés: X
  
  TOP 10 plus riches (Mora):
  [Tableau]
  
  Sources de Mora (7 derniers jours) [Graphe]:
  Boss: 45% | Commissions: 30% | Théière: 15% | Autres: 10%
  
  Sinks de Mora (7 derniers jours) [Graphe]:
  Amélioration: 60% | Craft: 20% | Guilde: 10% | Marché: 10%
```

---

## 11. ÉVÉNEMENTS ÉCONOMIQUES SPÉCIAUX

```
"DOUBLE MORA" — Événement (1 semaine tous les 2 mois):
  Toutes les sources de Mora donnent ×2
  Sinks inchangés → les joueurs profitent pour améliorer
  Annoncé 48h à l'avance → excitation de la communauté

"RÉDUCTION DE RÉSINE" — Événement (3 jours):
  Tous les boss coûtent 10 résine au lieu de 20-40
  Permet de farm beaucoup plus → augmentation rétention

"BLESSING OF THE WELKIN MOON" (Battle Pass Premium Cadeau):
  Événement rare → offrir 1 BP Premium à tous les joueurs actifs
  Coût bot: 0 (aucune valeur réelle) | Gain rétention: très fort

"CONDENSED RESIN BONUS" — Weekend:
  La résine condensée peut tenir 10 unités au lieu de 5
  Encourage le farming du weekend

Ces événements économiques ponctuels maintiennent l'engagement
sans rompre l'équilibre à long terme.
```
