# IRMINSUL V2 — 07. BOSS

> Version de conception : 2.0.0 | Statut : Phase Architecturale

---

## ANALYSE PRÉALABLE

### Risques liés aux boss
- **Combats textuels trop longs** : un boss de 30 rounds = ennui → Solution : boss scaling selon les stats, un combat typique = 8-15 rounds
- **Déséquilibre DPS** : joueur trop fort = trivial, trop faible = frustrant → Solution : HP boss = f(World Level) adaptatif
- **Exploit des patterns** : joueurs qui memorisent les attaques et ne prennent jamais de dégâts → Solution : attaques pseudo-aléatoires pondérées + phases surprises
- **Thread Discord pollution** : création de threads à chaque combat → Solution : threads temporaires, auto-archivage après 2h d'inactivité
- **Spam de combats** : farmers abusifs → Solution : résine comme valve principale

### Solutions architecturales
- Système de combat en Thread Discord isolé par session
- Session combat stockée dans Redis (TTL 30 min) + MongoDB pour le log final
- Calcul de dégâts entièrement côté serveur avec validation d'intégrité
- Timeout automatique si inactivité > 5 minutes → abandon du combat
- HP boss pré-calculé selon WL + niveau des persos de l'équipe

---

## 1. CATALOGUE COMPLET DES BOSS DE RÉSINE

### 1.1 Boss Élémentaires (Hypostasis)

```
ANEMO HYPOSTASIS — Mondstadt
─────────────────────────────
Type: Boss de résine | Résine: 20 | Région: Mondstadt
Élément: Anémo | WL Base HP: 84,677
Faiblesse: N/A (résistance Anémo 70%)
Récompenses: Vagabond's Kit, Vayuda Turquoise
  Drops spéciaux: Hurricane Seed

Phases:
  Phase 1 (100%-40%): Attaques normales en sphère (Cube de vent)
    - Attaque 1: Sphères de vent convergentes (ATK normale)
    - Attaque 2: Mains géantes d'Anémo (gros dégâts)
    - Attaque 3: Zone de vent tourbillonnant (continue 2 tours)
  Phase 2 (40%-0%): Mode désespéré
    - Génère des orbes de résurrection → MÉCANIQUE CLEF
    - Si tous les orbes survivent → Boss se régénère à 50% HP
    - Le joueur doit détruire les orbes avant le timer (3 tours)

HYDRO HYPOSTASIS — Liyue/Fontaine
───────────────────────────────────
Type: Boss de résine | Résine: 20 | Région: Liyue
Élément: Hydro | WL Base HP: 96,450
Faiblesse: Cryo (réaction Congélation immobilise partiellement)
Récompenses: Varunada Lazurite, Dew of Repudiation

Phases:
  Phase 1: Forme fluide — attaques multi-hits Hydro
    - Colonnes d'eau (attaque unique)
    - Tempête d'eau (4 hits aléatoires)
    - Vague de raz-de-marée (zone, -20% HP si touché)
  Phase 2 (<50% HP): Forme rigide
    - Crée des "sphères de purification" auto-heal si elles atteignent le boss
    - Détruire les sphères (avec attaques non-Hydro) → stop le heal
    - Dégâts augmentés de 40%

PYRO REGISVINE — Mondstadt
────────────────────────────
Type: Boss de résine | Résine: 20 | Région: Mondstadt
Élément: Pyro | WL Base HP: 102,338
Faiblesse: Cryo (Pointe de gel expose le cœur)
Récompenses: Agnidus Agate, Everflame Seed

Phases:
  Phase 1: Attaques normales
    - Charges enflammées (2 ATK directes)
    - Explosion au sol (zone Pyro 2 tours)
    - Bouclier de lave (immunité pendant 2 tours sauf Cryo)
  Phase 2 (cœur exposé): Cœur vulnérable exposé
    - Le cœur prend ×3 dégâts (window d'opportunité = 2 tours)
    - Si le cœur n'est pas détruit → Boss regagne bouclier + heal 15%

CRYO REGISVINE — Mondstadt
────────────────────────────
Type: Boss de résine | Résine: 20
Faiblesse: Pyro | WL Base HP: 98,200
Récompenses: Shivada Jade, Hoarfrost Core

Même structure que Pyro Regisvine mais élément Cryo.
Phase 2: Cœur de glace → Pyro pour exposer.

ELECTRO HYPOSTASIS — Mondstadt
────────────────────────────────
Type: Boss de résine | Résine: 20
Élément: Électro | WL Base HP: 90,120
Récompenses: Vajrada Amethyst, Lightning Prism

Phases:
  Phase 1: Cube électrique
    - Lame laser (1 ATK haute précision)
    - Prison électrique (immobilise 1 tour si touché)
    - Récupération bouclier (2 tours invulnérable)
  Phase 2 (40%): Génère primes prismes
    - Prismes auto-régénèrent le boss
    - Détruire avec ATK non-Électro → stop regen

GEO HYPOSTASIS — Liyue
────────────────────────
Type: Boss de résine | Résine: 20
Élément: Géo | WL Base HP: 88,900
Faiblesse: N/A (résistance Géo 70%)
Récompenses: Prithiva Topaz, Basalt Pillar

Phases:
  Phase 1: Tours de roc
    - Invoque 3 piliers → projectiles sur le joueur
    - Chaque pilier détruit = -30% HP tour de roc
    - Coup de masse géo (gros dégâts uniques)
  Phase 2 (<30%): Protection piliers
    - Invoque piliers indestructibles → doit être contourné
    - Attaques plus fréquentes, moins de turns disponibles

ANEMO PRIMO GEOVISHAP — Liyue
───────────────────────────────
Type: Boss de résine | Résine: 40 | Boss Elite
Région: Liyue | WL Base HP: 145,200
Absorbe: L'élément de l'équipe au combat
Récompenses: Gemmes multiples, Juvenile Jade

Mécaniques:
  - Absorbe un élément à la première attaque reçue
  - Devient immunisé à cet élément + attaques de cet élément
  - Crache une attaque de l'élément absorbé en Phase 2
  - Solution: équipe multi-éléments, pas mono-élément

OCEANID — Liyue
─────────────────
Type: Boss de résine | Résine: 40 | Boss Elite
WL Base HP: 132,000 (+ invocations)
Récompenses: Varunada Lazurite, Cleansing Heart

Mécaniques spéciales:
  - Ne peut pas être attaqué directement
  - Invoque des animaux d'eau (chacun entre 15,000-40,000 HP)
  - Vagues successives d'animaux (3 vagues)
  - Tous les animaux d'une vague éliminés → vague suivante
  - Oceanid apparaît physiquement en Phase finale (vague 3)
  - Sensibilité: Cryo (Congélation des projections) très efficace

THUNDER MANIFESTATION — Inazuma
──────────────────────────────────
Type: Boss de résine | Résine: 40
WL Base HP: 162,450
Récompenses: Vajrada Amethyst, Storm Beads

Mécaniques:
  - Vol constant → attaques aériennes difficiles à esquiver (embed)
  - Crée une prison électrique (3 tours de damage zone)
  - Phase 2: dédoublement spectral → attaque depuis 2 positions
  - Faiblesse: Cryo (Superconducteur réduit DEF)

JADEPLUME TERRORSHROOM — Sumeru
──────────────────────────────────
Type: Boss de résine | Résine: 20
WL Base HP: 108,750
Récompenses: Nagadus Emerald, Majestic Hooked Beak

Mécaniques:
  - Accumule du "Contage Fongique" sur le joueur (stack)
  - À 3 stacks: explosion Dendro massive
  - Phase activated (détruire les spores): boss ralenti, vulnérable
  - Après activated: recharge et recommence

HYDRO TULPA — Sumeru
─────────────────────
Type: Boss de résine | Résine: 40
WL Base HP: 178,200
Récompenses: Varunada Lazurite, Cloudseam Scale

Mécaniques:
  - Polymorphe: change de forme (Hydro/Electro/Pyro) selon les attaques reçues
  - Chaque forme = attaques différentes et résistances différentes
  - Forme instable: expose un cœur central (burst window)
```

### 1.2 Boss de Résine Spéciaux

```
LUPUS BOREAS (Andrius Mode 1) — Mondstadt
───────────────────────────────────────────
Type: Boss de résine hebdo-like | Résine: 40
WL Base HP: 174,000
Récompenses: Shivada Jade, Hurricane Seed, Stormterror

NOTE: Version boss de résine (accessible en semaine normale, AR25+)
Diffère du boss hebdomadaire Andrius (plus faible)

MAGUU KENKI — Inazuma
──────────────────────
Type: Boss de résine | Résine: 40
WL Base HP: 193,500
Récompenses: Vayuda Turquoise, Marionette Core

Mécaniques:
  - 2 clones fantômes en Phase 1 (Anémo + Cryo)
  - Appel aléatoire d'un clone pour attaque combo
  - Phase 2 (<50%): invoque les 2 clones simultanément
  - Doit gérer 3 cibles si on veut éviter le maximum de dégâts

RUIN SERPENT — Chasm (Liyue souterrain)
──────────────────────────────────────────
Type: Boss de résine | Résine: 40
WL Base HP: 215,000
Récompenses: Prithiva Topaz, Runic Fang

Mécaniques:
  - Se cache sous terre (invulnérable 1 tour)
  - Émerge pour attaque massive en zone
  - Énergie de boue: empêche l'utilisation des bursts si stack élevé
  - Résoudre: attaquer des pylônes pour réinitialiser l'énergie de boue
```

---

## 2. BOSS HEBDOMADAIRES

```
RÈGLE GÉNÉRALE:
  - Maximum 3 boss hebdomadaires différents par semaine (reset lundi)
  - Résine: 30 (50 pour la toute première fois)
  - Récompenses: matériaux de talent boss exclusifs + Guides boss
  - Drops garantis: 1 matériau de talent boss + ressources

DVALIN (Stormterror) — Mondstadt
──────────────────────────────────
AR requis: AR15 | Résine: 30 | WL Base HP: 245,000

Lore: Dragon du vent corrupted, autrefois partenaire de Venti

Phases (3 phases):
  Phase 1 (100-66%): Vol planant
    - Attaque Souffle Draconique: cône de vent (évitable)
    - Atterrissage + morsure (cible le personnage actif)
    - Tornades persistantes: zones de dégâts pendant 2 tours

  Phase 2 (66-33%): Rage cristallisée
    - Flancs cristallins → résistances augmentées
    - MÉCANIQUE: Détruire les cristaux anémo avec attaques normales
    - Souffle Cristallisé: dégâts énormes si cristaux intacts
    - Plongée aérienne: impossible d'esquiver, préparer un shield

  Phase 3 (<33%): Frénésie
    - Toutes les attaques précédentes + faster
    - Nova explosif final: si encore debout après → dégâts explosifs
    - HP regen si cristaux non-détruits à cette phase

Matériau de talent: Dvalin's Plume / Dvalin's Claw / Dvalin's Sigh

──────────────────────────────────────────────────────────────────

ANDRIUS (Dominator of Wolves) — Mondstadt
───────────────────────────────────────────
AR requis: AR20 | Résine: 30 | WL Base HP: 228,000

Lore: Roi des Loups, fils de Boreas, cherche un adversaire digne

MÉCANIQUES UNIQUES:
  - Immunisé à Cryo et Anémo (éléments du boss)
  - Pas de réactions élémentaires au sens habituel
  - Basé sur attaques physiques (donc CRIT RATE et ATK sont clés)

Phases:
  Phase 1 (Forme Louve 100-50%): Combat physique
    - Charge brutale (3 hits en ligne)
    - Hurlement glaçant: -20% DEF de l'équipe pendant 2 tours
    - Saut + atterrissage (zone au sol)
    - Morsure rapide × 3 (fast hits)

  Phase 2 (Forme Spectrale <50%): Combat spirituel
    - Devient transparent (hits "physiques" deviennent Anémo)
    - Vitesse accrue (+30% fréquence d'attaque)
    - Loup spectral parallèle: attaque depuis une direction opposée
    - Ultima Clamore: charge totale couvrant toute la zone

Matériau de talent: Spirit Locket of Boreas / Tail of Boreas / Ring of Boreas

──────────────────────────────────────────────────────────────────

LA SIGNORA (8ème des Fatui) — Mondstadt
─────────────────────────────────────────
AR requis: AR30 | Résine: 30 | WL Base HP: 296,500

Lore: Harbinger Fatui, contrôle à la fois Cryo et Pyro

MÉCANIQUES UNIQUES:
  Phase 1 (Forme Cryo): Immunité Cryo
  Phase 2 (Forme Pyro): Immunité Pyro
  → Force l'utilisation d'éléments DIFFÉRENTS dans la même équipe

Phases:
  Phase 1 — La Dame Gelée (100-55%):
    - Projectiles de glace: pluie de glaçons
    - Blizzard Zone: zone de froid pendant 3 tours (-HP par tour)
    - Mains de givre géantes: ATK massive
    - MÉCANIQUE: Glacer l'arène réduit la fenêtre de mobilité (embed)

  Transition (55%): Fonte → Transformation en Flamme
    - Animation de transition (embed thématique)
    - Blast d'énergie pure (dégâts fixes, non bloquables)

  Phase 2 — La Brûlante (55-0%):
    - Murs de flammes circulaires
    - Papillons de feu (cherchent le personnage actif)
    - Mains de lave: même pattern mais Pyro
    - Nova Infernale (Phase finale): zone MASSIVE si pas tuée vite

Matériau de talent: Hellfire Butterfly / Ashen Heart / Shadow of the Warrior

──────────────────────────────────────────────────────────────────

TARTAGLIA (Childe) — Liyue
────────────────────────────
AR requis: AR35 | Résine: 30 | WL Base HP: 312,000

Lore: 11ème des Fatui, combat pour l'amour du combat

MÉCANIQUES UNIQUES:
  - 3 phases complètes avec 2 transformations
  - Enrage si combats trop longs (>15 tours = dégâts × 3)
  - Aucune immunité élémentaire fixe (vulnérable à tout)

Phases:
  Phase 1 — Archer Hydro (100-65%):
    - Flèches Hydro rapides
    - Déluge de flèches: zone multi-hit
    - Anneau de maelstrom: zone circulaire de dégâts

  Phase 2 — Corps à Corps Électro-Hydro (65-35%):
    - Téléportation derrière le personnage actif
    - Dagues Ductile Torrent: combo rapide 5 hits
    - Déflagration de Maelstrom: zone explosive massive
    - Interphase Électrique: chaque hit peut appliquer Électro

  Phase 3 — Forme Marémotrice (<35%):
    - Invoque des requins spectraux
    - Attaque finale Frenzy: combo complet des phases 1 et 2
    - Si survive > 5 tours en Phase 3 → self-destruct + dégâts massifs

Matériau de talent: Shard of a Foul Legacy / Shadow of the Warrior / Crown of Insight

──────────────────────────────────────────────────────────────────

AZHDAHA — Liyue (souterrain)
─────────────────────────────
AR requis: AR38 | Résine: 30 | WL Base HP: 348,900

Lore: Antique dragon de terre, autrefois ami de Zhongli

MÉCANIQUES UNIQUES:
  - Absorbe 2 éléments aléatoires chaque semaine (rotation)
  - Immunité à ces 2 éléments et attaques de ces éléments
  - Force adaptation équipe chaque semaine

Phases:
  Phase 1 (Dragon de Terre): Attaques géo et physiques
  Phase 2 (Dragon Élémentaire): Selon les éléments absorbés
  Phase 3 (<30%): Frénésie — toutes résistances +50%, ATK ×2

Matériau de talent: Bloodjade Branch / Gilded Scale / Tail of Boreas

──────────────────────────────────────────────────────────────────

RAIDEN SHOGUN — Inazuma
─────────────────────────
AR requis: AR40 | Résine: 30 | WL Base HP: 376,200

Lore: L'Archon de l'Électro, la Shogun d'Inazuma

MÉCANIQUES UNIQUES:
  - Bouclier d'énergie qui se régénère chaque tour
  - Réduit l'énergie du joueur (anti-burst)
  - Résistance à toutes les réactions élémentaires (réduite de 50%)

Phases:
  Phase 1 (Shogun Consciente):
    - Slash d'épée de gloire (dégâts physiques + Électro)
    - Défenseurs du Désir (invoque 2 spectres défenseurs)
    - Balayage du Destin: zone circulaire massive

  Phase 2 (<60%): Mode Ère de l'Éternité
    - Bouclier d'éternité: 50,000 HP à détruire d'abord
    - Raiden attaque avec des patterns accélérés pendant que le shield tient
    - Si shield brisé: 3 tours de vulnérabilité
    - Coupe du Destin: attaque finale qui réduit HP à 1 si non bloquée

Matériau de talent: Mudra of the Malefic General / Tears of the Calamitous God

──────────────────────────────────────────────────────────────────

GUARDIAN OF APEP'S OASIS — Sumeru
────────────────────────────────────
AR requis: AR45 | Résine: 30 | WL Base HP: 412,000

Lore: Gardien de l'Oasis d'Apep, serpent primordial Dendro

MÉCANIQUES UNIQUES:
  - Spores Dendro: stacks qui explosent à 5 charges
  - Cœurs Dendro: soignent le boss si non-détruits
  - Phases de plongée: invulnérable sous terre, doit attaquer les cœurs

Matériau de talent: Dakas of Every Wish / Tears of the Calamitous God

──────────────────────────────────────────────────────────────────

FONTAINE WEEKLY BOSS (Arlecchino)
────────────────────────────────────
AR requis: AR50 | Résine: 30 | WL Base HP: 450,000

Lore: 4ème des Fatui, Père des Enfants du Destin

MÉCANIQUES UNIQUES:
  - Contrats de sang: dégâts liés au % HP maximal du joueur
  - Plus les persos ont de HP, plus les attaques font mal
  - Encourage les builds basse HP mais haute DEF/Shield

Matériau de talent: Fading Candle / Silken Feather / Worldspan Fern
```

---

## 3. BOSS MONDIAUX

```
Les Boss Mondiaux sont des boss "world" visibles sur la carte de Teyvat.
Ils ne coûtent pas de résine mais ont des cooldowns hebdomadaires.

STORMTERROR DVALIN — Mondstadt (volant)
─────────────────────────────────────────
Type: World Boss | Coût: 0 résine | Cooldown: Hebdomadaire
AR requis: AR25 | WL Base HP: 380,000 (beaucoup plus fort)
Récompenses: Shards de Vayuda Turquoise premium + matériaux rares

ALTO DU TONNERRE (Electro Primo Geovishap évolué) — Multiple
───────────────────────────────────────────────────────────────
Type: World Boss | Coût: 0 résine | Cooldown: 4 fois/semaine
HP: 220,000 | Récompenses: Gemmes premium + ressources rares

LUPUS BOREAS — Mondstadt (plaine)
───────────────────────────────────
Type: World Boss | Coût: 0 résine | Cooldown: 3 fois/semaine
HP: 310,000 | Récompenses: Storm Beads premium

PERPETUAL MECHANICAL ARRAY — Inazuma
──────────────────────────────────────
Type: World Boss | Coût: 0 résine | Cooldown: Hebdomadaire
HP: 426,000 | Récompenses: Artifice Shards (matériaux Cryo)

Mécaniques:
  - Orbe central + 4 satellites
  - Détruire les satellites → orbe central vulnérable
  - Si satellites non-détruits → orbe se régénère à 40% HP
  - Phase finale: tous les satellites deviennent des projectiles

GOLDEN WOLFLORD — Inazuma (île)
────────────────────────────────
Type: World Boss | Coût: 0 résine | Cooldown: Hebdomadaire
HP: 395,000 | Récompenses: Vajrada (Électro) premium + Riftborn Regalia

Mécaniques spéciales:
  - Bouclier Corrosif: -2% HP total par tour si bouclier actif
  - Seul Géo peut détruire le bouclier efficacement
  - FORCE au moins 1 perso Géo dans l'équipe

CORAL DEFENDERS — Inazuma (paire)
───────────────────────────────────
Type: World Boss | Coût: 0 résine | Cooldown: Quotidien (5 max/semaine)
HP total: 280,000 (2 × 140,000) | Récompenses: Matériaux mixtes

Mécaniques:
  - Chauve-souris Cryo + Ours Électro → duo
  - Superconducteur entre eux → buff mutuel si proches
  - Séparer les deux pour éviter les synergies entre eux

Algorithm OF SEMI-INTRANSIENT MATRIX — Sumeru
────────────────────────────────────────────────
Type: World Boss | Coût: 0 résine | Cooldown: Hebdomadaire
HP: 468,000 | Récompenses: Nagadus Emerald premium

Mécaniques:
  - Robot Dendro géant
  - Lance des drones → attaquent si non détruits
  - Mode calibration: invulnérable, détruire les noyaux pour stopper

OVERRIPE VISHAP — Multiple régions
────────────────────────────────────
Type: World Boss | Coût: 0 résine | Cooldown: Quotidien (illimité)
HP: 145,000 | Récompenses: Ressources basiques

Note: Le plus accessible, idéal pour les joueurs AR15-25
```

---

## 4. RAIDS DE GUILDE

### 4.1 Boss de Guilde (Niveau 4+ requis)

```
BOSS NORMAL DE GUILDE — Rotations hebdomadaires
────────────────────────────────────────────────
Exemple: Ruin Guard Titanesque
HP: 20,000 × (membres actifs de la guilde)
Fenêtre: 24h (tous les membres contribuent)
Récompenses individuelles: proportionnelles aux dégâts infligés

BOSS ELITE DE GUILDE (Niveau 6+) — Mensuel
────────────────────────────────────────────
Exemple: Proto-Ruin Hunter
HP: 50,000 × (membres actifs)
Fenêtre: 48h
Récompenses: matériaux d'artefacts premium + Coins Guilde × 3

BOSS LÉGENDAIRE (Niveau 9+) — Trimestriel
───────────────────────────────────────────
Boss uniques avec mécaniques inédites
Exemple: Regisdragon Umbral
HP: 120,000 × (membres actifs)
8 joueurs max en semi-coop
Fenêtre: 48h
Récompenses: Éclats de Légende (craft armes légendaires) + Primogens × 80
```

### 4.2 Mécanique du Raid en Détail

```
FLOW DU RAID:

Étape 1 — Création:
  Maître ou Officier: /raid lancer
  → Notification DM à tous les membres
  → Canal de guilde: embed avec countdown 24h/48h

Étape 2 — Participation:
  Chaque membre: /raid attaquer
  → Sélection de l'équipe
  → Combat normal (Thread privé)
  → Dégâts infligés = contribution au score collectif

Étape 3 — Score collectif:
  HP Boss actuel visible par tous: embed mis à jour toutes les 30 min
  Ranking des contributions visible: /raid classement

Étape 4 — Résolution:
  VICTOIRE: HP Boss = 0 avant timeout
    → Récompenses distribuées proportionnellement
    → +200 XP guilde par membre ayant participé
    → +500 XP guilde bonus si < 80% du temps utilisé
  
  DÉFAITE: Timeout sans kill
    → Récompenses partielles (50% du potentiel)
    → Log de l'échec + analyse (dégâts totaux vs HP restants)

Étape 5 — Distribution des Récompenses:
  Contribution 1-10%:   Récompenses tier C (basiques)
  Contribution 11-25%:  Récompenses tier B + bonus
  Contribution 26-50%:  Récompenses tier A + bonus
  Contribution 51-100%: Récompenses tier S + MVP badge temporaire

DÉTAIL DU CALCUL:
  Dégâts infligés / HP total boss × 100 = % contribution
  Base récompense × multiplicateur tier = récompense finale
```

---

## 5. MOTEUR DE COMBAT (TECHNICAL DEEP DIVE)

### 5.1 Structure d'une Session de Combat

```typescript
interface CombatSession {
  sessionId: string;
  type: 'boss_resin' | 'weekly_boss' | 'world_boss' | 'guild_raid' | 'domain';
  
  boss: {
    id: string;
    currentHp: number;
    maxHp: number;
    phase: number;
    elementalStatus: ElementType | null;
    activeBuffs: string[];
    shields: Shield[];
    turnCount: number;
    lastAttackIndex: number; // Pour éviter la répétition
  };
  
  player: {
    team: CombatCharacter[];    // 4 personnages
    activeIndex: number;        // 0-3
    totalDamageDealt: number;
  };
  
  log: CombatAction[];
  status: 'active' | 'victory' | 'defeat' | 'fled';
}

interface CombatCharacter {
  characterId: string;
  level: number;
  currentHp: number;
  maxHp: number;
  energy: number;
  energyCost: number;
  skillCooldown: number;       // Tours restants
  elementalStatus: ElementType | null;
  stats: FinalStats;           // Pré-calculés au début du combat
  constellation: number;
}
```

### 5.2 Déroulement d'un Tour

```typescript
async function processTurn(session: CombatSession, action: PlayerAction): Promise<TurnResult> {
  
  // 1. Valider l'action du joueur
  validateAction(session, action);
  
  // 2. Calculer les dégâts du joueur
  const playerDmg = calculatePlayerDamage(session, action);
  
  // 3. Appliquer les dégâts sur le boss
  session.boss.currentHp -= playerDmg.effective;
  
  // 4. Détecter et résoudre les réactions élémentaires
  const reaction = detectReaction(session.boss.elementalStatus, action.element);
  if (reaction) applyReaction(session, reaction);
  
  // 5. Vérifier les transitions de phase du boss
  await checkBossPhaseTransition(session);
  
  // 6. Vérifier la victoire
  if (session.boss.currentHp <= 0) {
    return resolveVictory(session);
  }
  
  // 7. Boss contre-attaque
  const bossAction = selectBossAttack(session.boss);
  const bossDmg = calculateBossDamage(session, bossAction);
  applyDamageToTeam(session, bossDmg);
  
  // 8. Mettre à jour les cooldowns
  updateCooldowns(session);
  
  // 9. Vérifier la défaite
  if (isTeamDefeated(session)) {
    return resolveDefeat(session);
  }
  
  // 10. Logger le tour
  logTurn(session, playerDmg, bossDmg, reaction);
  
  // 11. Mettre à jour en DB (Redis pour la session, log tour)
  await updateSessionInRedis(session);
  
  return { playerDmg, bossDmg, reaction, status: 'continue' };
}
```

### 5.3 Formule de Dégâts Complète

```typescript
function calculatePlayerDamage(session: CombatSession, action: PlayerAction): DamageResult {
  const char = session.player.team[session.player.activeIndex];
  const boss = session.boss;
  
  // Multiplicateur de base selon l'action
  const baseMultiplier = getActionMultiplier(char, action);
  
  // Dégâts de base
  const scalingValue = getScalingValue(char, action); // ATK / HP / DEF / EM
  let rawDmg = scalingValue * baseMultiplier;
  
  // Bonus élémentaire
  const elemBonus = char.stats.elementalBonus / 100;
  rawDmg *= (1 + elemBonus);
  
  // Résistance ennemie
  const res = boss.elementalResistances[action.element] || 0;
  const resMultiplier = res >= 0 
    ? (1 - res / 100) 
    : (1 - res / 200); // Résistance négative
  rawDmg *= resMultiplier;
  
  // Défense ennemie
  const defReduction = (char.level + 100) / (char.level + 100 + boss.defense);
  rawDmg *= defReduction;
  
  // Critique
  const isCrit = Math.random() < char.stats.critRate / 100;
  if (isCrit) rawDmg *= (1 + char.stats.critDmg / 100);
  
  // Réaction élémentaire (appliquée séparément dans detectReaction)
  
  // Buff de guilde actif (+X% DMG)
  const guildBuff = session.guildBuffs?.dmgBonus || 0;
  rawDmg *= (1 + guildBuff / 100);
  
  return {
    raw: Math.floor(rawDmg),
    effective: Math.floor(rawDmg),
    isCrit,
    element: action.element,
    actionType: action.type,
  };
}
```

### 5.4 Sélection des Attaques Boss (IA)

```typescript
function selectBossAttack(boss: BossState): BossAttack {
  const template = BOSS_BASE[boss.id];
  
  // Obtenir les attaques disponibles pour la phase actuelle
  const availableAttacks = template.attacks.filter(
    a => a.phaseOnly === null || a.phaseOnly === boss.phase
  );
  
  // Éviter la même attaque deux fois de suite
  const filteredAttacks = availableAttacks.filter(
    a => a.name !== boss.lastAttackName
  );
  
  // Sélection pondérée selon les poids
  const totalWeight = filteredAttacks.reduce((sum, a) => sum + a.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const attack of filteredAttacks) {
    random -= attack.weight;
    if (random <= 0) {
      boss.lastAttackName = attack.name;
      return attack;
    }
  }
  
  return filteredAttacks[0]; // Fallback
}
```

---

## 6. RÉCOMPENSES DÉTAILLÉES PAR TYPE DE BOSS

```
TABLEAU RÉCAPITULATIF:

TYPE BOSS           | RÉSINE | MORA  | XP AR  | XP PERSO | ARTEFACTS  | MATÉRIAUX
────────────────────────────────────────────────────────────────────────────────────────
Boss de Résine      |  20    | 1,500 |  100   |  1,500   | 1-3 (3-4★) | Gemmes + Spécial
Boss de Résine Elite|  40    | 3,000 |  175   |  2,500   | 2-4 (4-5★) | Gemmes+ + Spécial
Boss Hebdomadaire   |  30    | 2,500 |  250   |  3,000   | 3-5 (4-5★) | Talent Boss + Gemmes
Boss Mondial        |   0    |   750 |   50   |    750   | 0-1 (3-4★) | Ressources
Raid Guilde Normal  |   0    | 2,000 |   80   |  1,000   | 1-2 (4★)   | Spéciaux guilde
Raid Guilde Elite   |   0    | 5,000 |  120   |  2,000   | 2-3 (4-5★) | Éclats premium
Raid Légendaire     |   0    |10,000 |  200   |  3,500   | 3-4 (5★)   | Éclats de Légende

Note: Artefacts droppés aléatoirement parmi les sets spécifiques au boss
Note: WL influence directement la qualité des drops (rareté des artefacts)
```

---

## 7. INTERFACE COMBAT COMPLÈTE (EMBED DISCORD)

```
EXEMPLE D'UN COMBAT CONTRE DVALIN — PHASE 2

╔══════════════════════════════════════════════════════════╗
║  🐉 DVALIN — Seigneur des Tempêtes           PHASE 2/3  ║
║                                                          ║
║  ❤️ Boss HP: ████████████░░░░░░░ 63% (154,350 / 245,000)║
║  🛡️ Cristaux: ██░░░░░ 2/3 détruits          Tour: 11   ║
╠══════════════════════════════════════════════════════════╣
║  ÉQUIPE — Hu Tao (Active)                               ║
║  ────────────────────────────────────────────────────── ║
║  🔥 Hu Tao  Lv.90  HP:████████░░ 78%  [💥 BURST PRÊT]  ║
║  💧 Xingqiu Lv.80  HP:██████████ 100% [⏳ 2 tours CD]  ║
║  💧 Yelan   Lv.80  HP:████████░░ 85%  [⚡ SKILL PRÊT]   ║
║  🪨 Zhongli Lv.90  HP:██████████ 100% [🛡️ SHIELD ACT.] ║
╠══════════════════════════════════════════════════════════╣
║  ⚗️ RÉACTION ACTIVE: 🔥 Pyro appliqué sur le boss      ║
║  ⚠️ Phase 2: Détruire les cristaux → fenêtre de DMG    ║
╠══════════════════════════════════════════════════════════╣
║  📋 DERNIER TOUR:                                        ║
║  • Hu Tao → ATK Normale: 34,521 DMG 💥 CRITIQUE         ║
║  • Dvalin → Souffle: 12,800 DMG (bloqué par Zhongli 🛡) ║
╚══════════════════════════════════════════════════════════╝

[⚔️ ATK Normale] [🌟 Compétence Élémentaire] [💥 Burst Élémentaire]
[🔄 Changer Perso ▼] [🏃 Fuir le Combat]
```
