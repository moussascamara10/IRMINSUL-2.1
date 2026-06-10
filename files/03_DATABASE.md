# IRMINSUL V2 — 03. BASE DE DONNÉES (MongoDB)

> Version de conception : 2.0.0 | Statut : Phase Architecturale

---

## ANALYSE PRÉALABLE

### Stratégie de modélisation
- **Embedding vs Referencing** : on embed les données qui évoluent rarement ensemble (stats de base), on référence les données partagées entre entités (personnages → templates)
- **Document size** : MongoDB limite les documents à 16MB → les inventaires d'artefacts sont dans une collection séparée
- **Atomicité** : les transactions économiques utilisent MongoDB Sessions pour l'atomicité
- **Indexes** : chaque champ fréquemment interrogé a un index, les compound indexes pour les requêtes complexes

### Collections principales (35 collections)
```
users                  → Profils joueurs
characters_owned       → Personnages possédés par les joueurs
characters_base        → Catalogue des personnages (données statiques)
weapons_owned          → Armes possédées
weapons_base           → Catalogue des armes
artifacts_owned        → Artefacts possédés
artifact_sets_base     → Catalogue des sets d'artefacts
guilds                 → Guildes
guild_members          → Membres des guildes
guild_raids            → Raids de guilde actifs et historique
boss_sessions          → Sessions de combat actives
boss_base              → Catalogue des boss
quests_progress        → Progression des quêtes par joueur
quests_base            → Catalogue des quêtes
expeditions            → Expéditions en cours
commissions_daily      → Commissions quotidiennes générées
teapots                → Théières de sérénithé
teapot_furniture_owned → Meubles possédés
teapot_furniture_base  → Catalogue des meubles
banners                → Bannières actives et historique
gacha_history          → Historique des vœux
achievements_progress  → Succès débloqués par joueur
achievements_base      → Catalogue des succès
titles_owned           → Titres débloqués par joueur
battle_pass            → Progression BP par joueur
events_active          → Événements actuellement actifs
events_progress        → Progression des joueurs dans les événements
market_listings        → Annonces du marché P2P
transactions           → Log de toutes les transactions
notifications          → Notifications non-lues des joueurs
friend_requests        → Demandes d'amitié
abyss_progress         → Progression Abîme Spiralé
server_config          → Configuration par serveur Discord
regions_progress       → Exploration des régions par joueur
combat_logs            → Logs de combat (archivés après 30j)
```

---

## COLLECTION: users

```javascript
{
  _id: ObjectId,
  
  // === IDENTITÉ DISCORD ===
  discordId: String,           // Unique, index primaire
  username: String,
  displayName: String,
  avatar: String,              // URL ou hash Discord
  
  // === ÉTAT DU COMPTE ===
  createdAt: Date,
  lastActive: Date,
  isActive: Boolean,           // false = compte banni/suspendu
  banReason: String,           // Si banni
  
  // === PROGRESSION AVENTURIER ===
  adventureRank: Number,       // 1-60
  worldLevel: Number,          // 0-8 (débloqué par AR)
  adventureXP: Number,         // XP vers le prochain AR
  adventureXPTotal: Number,    // XP cumulée totale
  
  // === RESSOURCES ===
  mora: Number,                // Monnaie principale (max: 999,999,999)
  primogems: Number,           // Monnaie gacha principale
  acquaintFates: Number,       // Destins d'entrelacement (bannière standard)
  interwovFates: Number,       // Destins enchevêtrés (bannières événement)
  starglitter: Number,         // Monnaie shop standard
  stardust: Number,            // Monnaie shop secondaire
  geniusInvokationCrystals: Number, // Pour le jeu de cartes
  
  // === RÉSINE ===
  resin: {
    current: Number,           // Calculé dynamiquement (pas stocké directement)
    lastUpdated: Date,         // Timestamp du dernier calcul
    fragolitesUsed: Number,    // Fragolites bleues utilisées cette semaine
    condensed: Number,         // Résine condensée en stock (max 5)
  },
  
  // === PITY (SYSTÈME DE VOεUX) ===
  pity: {
    standard: {
      fiveStar: Number,        // Pulls depuis dernier 5★
      fourStar: Number,        // Pulls depuis dernier 4★
    },
    character: {
      fiveStar: Number,
      fourStar: Number,
      fourStarFeaturedFail: Number, // Fois où on a raté le 4★ featured (max 2)
      guarantee: Boolean,      // Prochain 5★ est garanti featured
    },
    weapon: {
      fiveStar: Number,
      fourStar: Number,
      guarantee: Boolean,
      epitomeStars: Number,    // 0-3 pour le système d'Epitome
      epitomeTarget: String,   // weaponId ciblé
    },
    beginner: {
      pullsUsed: Number,       // Max 20
      isCompleted: Boolean,
    },
    pullsTotal: Number,        // Total historique de tous les pulls
  },
  
  // === ÉQUIPES ===
  teams: {
    active: Number,            // Index de l'équipe active (0-3)
    team1: [ObjectId],         // 4 character_owned IDs
    team2: [ObjectId],
    team3: [ObjectId],
    team4: [ObjectId],
    abyss1: [ObjectId],        // Équipe 1 Abîme Spiralé
    abyss2: [ObjectId],        // Équipe 2 Abîme Spiralé
  },
  
  // === COMMISSIONS QUOTIDIENNES ===
  dailyCommissions: {
    completed: Number,         // 0-4
    lastReset: Date,
    totalCompleted: Number,    // Historique cumulé
    bonusClaimed: Boolean,     // Bonus 4/4 réclamé aujourd'hui
  },
  
  // === BATTLE PASS ===
  battlePass: {
    currentSeason: Number,     // ID de la saison actuelle
    xp: Number,                // XP dans la saison actuelle
    tier: Number,              // Palier actuel (0-50)
    isPremium: Boolean,        // Version premium achetée
    dailyProgress: {
      date: Date,
      missions: [{
        id: String,
        progress: Number,
        completed: Boolean,
      }],
    },
    weeklyProgress: {
      weekStart: Date,
      missions: [{
        id: String,
        progress: Number,
        completed: Boolean,
      }],
    },
  },
  
  // === GUILDE ===
  guildId: ObjectId,           // null si sans guilde
  guildJoinedAt: Date,
  guildContribution: {
    weekly: Number,            // Reset chaque semaine
    total: Number,             // Total historique
  },
  
  // === SOCIAL ===
  friendIds: [String],         // Discord IDs (max 50 amis)
  pendingFriendRequests: [String],
  signature: String,           // Signature de profil (max 50 chars)
  
  // === TITRE ET APPARENCE ===
  equippedTitle: String,       // titleId équipé
  namecard: String,            // namecardId équipé
  
  // === STATISTIQUES ===
  stats: {
    totalBossKills: Number,
    totalDomainRuns: Number,
    totalPullsLifetime: Number,
    totalMoraSpent: Number,
    totalMoraEarned: Number,
    totalDamageDealt: Number,
    highestDamageSingleHit: Number,
    abyssMaxFloor: Number,
    abyssMaxStars: Number,
  },
  
  // === CONFIGURATION ===
  settings: {
    language: String,          // "fr", "en", "zh", etc.
    notifications: {
      resinFull: Boolean,
      expeditionComplete: Boolean,
      dailyReset: Boolean,
      guildEvents: Boolean,
      friendActivity: Boolean,
    },
    publicProfile: Boolean,
    showInLeaderboard: Boolean,
  },
}

// INDEX
db.users.createIndex({ discordId: 1 }, { unique: true })
db.users.createIndex({ adventureRank: -1 })
db.users.createIndex({ guildId: 1 })
db.users.createIndex({ lastActive: -1 })
db.users.createIndex({ "stats.abyssMaxStars": -1 })
```

---

## COLLECTION: characters_base (Données Statiques)

```javascript
{
  _id: ObjectId,
  id: String,                  // "hu_tao", "zhongli", etc. (slug unique)
  
  // === IDENTITÉ ===
  name: String,                // "Hu Tao"
  nameEn: String,              // "Hu Tao" (anglais pour l'API Genshin)
  title: String,               // "Directrice des Pompes Funèbres"
  rarity: Number,              // 4 ou 5
  element: String,             // "pyro", "hydro", "cryo", "electro", "anemo", "geo", "dendro"
  weaponType: String,          // "sword", "claymore", "polearm", "bow", "catalyst"
  region: String,              // "mondstadt", "liyue", etc.
  affiliation: String,         // "Wangsheng Funeral Parlor"
  
  // === APPARENCE ===
  imageUrl: String,            // URL image du personnage (hébergée)
  iconUrl: String,             // Icône portrait
  splashArtUrl: String,        // Art complet (pour les bannières)
  elementIconUrl: String,
  
  // === STATS DE BASE (niveau 1/20) ===
  baseStats: {
    hp: Number,
    atk: Number,
    def: Number,
    ascensionStat: String,     // "critical_rate", "hp_percent", etc.
    ascensionStatValue: Number, // Valeur finale à A6
  },
  
  // === SCALING DES STATS ===
  // Multiplicateurs pour chaque niveau et ascension (tableaux)
  hpScaling: [Number],         // 90 valeurs (niveaux 1-90)
  atkScaling: [Number],
  defScaling: [Number],
  
  // === ASCENSION (Matériaux) ===
  ascensionMaterials: [
    {
      phase: Number,           // 1-6
      levelRequired: Number,
      mora: Number,
      materials: [{
        materialId: String,
        quantity: Number,
      }],
    }
  ],
  
  // === COMPÉTENCES ===
  skills: {
    normalAttack: {
      name: String,
      description: String,
      hitMultipliers: [Number], // Multiplicateurs par coup (1-5 selon arme)
      chargedMultiplier: Number,
      plungeMultiplier: Number,
      scalingType: String,     // "atk", "hp", "def", "em"
    },
    elementalSkill: {
      name: String,
      description: String,
      cooldown: Number,        // Secondes
      charges: Number,         // Nombre de charges (1 ou 2)
      multiplier: Number,
      duration: Number,        // Si buff/invocation
      scalingType: String,
    },
    elementalBurst: {
      name: String,
      description: String,
      energyCost: Number,      // 40, 60, 70, 80
      cooldown: Number,
      multiplier: Number,
      duration: Number,
      aoeRadius: Number,       // Juste indicatif
      scalingType: String,
    },
    passive1: {
      name: String,
      description: String,
      unlockAscension: Number, // 1 ou 4
    },
    passive2: {
      name: String,
      description: String,
      unlockAscension: Number,
    },
    utilityPassive: {
      name: String,
      description: String,
    },
  },
  
  // === TALENTS (Matériaux) ===
  talentMaterials: {
    book: String,              // "ballad", "gold", etc.
    boss: String,              // "signora_drop", "dvalin_drop", etc.
    crown: Boolean,            // Nécessite Couronne de Sagesse au niveau 10
  },
  
  // === CONSTELLATIONS ===
  constellations: [
    {
      level: Number,           // 1-6
      name: String,
      description: String,
      effect: String,          // JSON stringifié de l'effet
      imageUrl: String,
    }
  ],
  
  // === MÉTADONNÉES ===
  isAvailable: Boolean,        // false = non encore implémenté
  addedVersion: String,        // "1.0", "2.1", etc.
  voiceActor: {
    fr: String,
    en: String,
    ja: String,
    zh: String,
  },
  loreDescription: String,     // Description lore longue
  birthday: String,            // "MM-DD"
}

// INDEX
db.characters_base.createIndex({ id: 1 }, { unique: true })
db.characters_base.createIndex({ rarity: 1, element: 1 })
db.characters_base.createIndex({ region: 1 })
```

---

## COLLECTION: characters_owned (Instances Joueur)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,            // Ref → users
  characterId: String,         // Ref → characters_base.id
  
  // === NIVEAU ===
  level: Number,               // 1-90
  xp: Number,                  // XP vers le prochain niveau
  ascensionPhase: Number,      // 0-6
  
  // === CONSTELLATIONS ===
  constellation: Number,       // 0-6
  
  // === TALENTS ===
  talents: {
    normalAttack: Number,      // 1-10
    elementalSkill: Number,    // 1-10
    elementalBurst: Number,    // 1-10
  },
  
  // === ÉQUIPEMENT ===
  weaponId: ObjectId,          // Ref → weapons_owned (null si non équipée)
  artifacts: {
    flower: ObjectId,          // Ref → artifacts_owned (null si vide)
    plume: ObjectId,
    sands: ObjectId,
    goblet: ObjectId,
    circlet: ObjectId,
  },
  
  // === AMITIÉ ===
  friendship: Number,          // 1-10
  friendshipXP: Number,        // XP vers le prochain niveau d'amitié
  
  // === MÉTADONNÉES ===
  obtainedAt: Date,
  obtainedFrom: String,        // "gacha", "event", "quest", "starter"
  favorited: Boolean,          // Épinglé dans l'inventaire
  locked: Boolean,             // Protégé contre le fodder accidentel
  
  // === STATS CALCULÉES (Cache, recalculé après équipement change) ===
  cachedStats: {
    hp: Number,
    atk: Number,
    def: Number,
    critRate: Number,
    critDmg: Number,
    elementalMastery: Number,
    energyRecharge: Number,
    elementalBonus: Number,    // Bonus de l'élément du perso
    calculatedAt: Date,
  },
}

// INDEX
db.characters_owned.createIndex({ userId: 1 })
db.characters_owned.createIndex({ userId: 1, characterId: 1 }, { unique: true })
db.characters_owned.createIndex({ characterId: 1 })
```

---

## COLLECTION: weapons_base

```javascript
{
  _id: ObjectId,
  id: String,                  // "staff_of_homa", "aquila_favonia", etc.
  name: String,
  type: String,                // "sword", "claymore", "polearm", "bow", "catalyst"
  rarity: Number,              // 1-5
  imageUrl: String,
  
  // === STATS ===
  baseAtk: Number,             // ATK de base niveau 1
  subStatType: String,         // "crit_rate", "crit_dmg", "energy_recharge", "atk_percent", etc.
  subStatValue: Number,        // Valeur de base au niveau 1
  
  // === RAFFINEMENT ===
  passiveName: String,
  passiveDescription: String,  // Avec ${rank} pour le niveau de raffinement
  passiveEffects: [            // 5 niveaux de raffinement
    { rank: 1, effect: Object },
    { rank: 2, effect: Object },
    { rank: 3, effect: Object },
    { rank: 4, effect: Object },
    { rank: 5, effect: Object },
  ],
  
  // === SCALING ===
  atkScaling: [Number],        // Valeurs ATK niveaux 1-90
  subStatScaling: [Number],    // Valeurs sub-stat niveaux 1-90
  
  // === MATÉRIAUX D'AMÉLIORATION ===
  ascensionMaterials: [...],
  
  loreDescription: String,
  isAvailable: Boolean,
}

// INDEX
db.weapons_base.createIndex({ id: 1 }, { unique: true })
db.weapons_base.createIndex({ type: 1, rarity: -1 })
```

---

## COLLECTION: weapons_owned

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  weaponId: String,            // Ref → weapons_base.id
  
  level: Number,               // 1-90
  xp: Number,
  ascensionPhase: Number,      // 0-6
  refinement: Number,          // 1-5
  
  equippedTo: ObjectId,        // characters_owned._id (null si non équipée)
  locked: Boolean,
  obtainedAt: Date,
  obtainedFrom: String,
}

// INDEX
db.weapons_owned.createIndex({ userId: 1 })
db.weapons_owned.createIndex({ userId: 1, weaponId: 1 })
```

---

## COLLECTION: artifacts_owned

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  
  setId: String,               // "crimson_witch_of_flames", "emblem_of_severed_fate", etc.
  slot: String,                // "flower", "plume", "sands", "goblet", "circlet"
  rarity: Number,              // 1-5
  
  level: Number,               // 0-20 (5★ max)
  xpInvested: Number,          // XP totale investie
  
  // === STAT PRINCIPALE ===
  mainStat: String,            // "hp", "atk", "def", "hp_percent", "atk_percent", "def_percent",
                               //  "elemental_mastery", "energy_recharge", "crit_rate", 
                               //  "crit_dmg", "elemental_dmg_bonus", "healing_bonus"
  mainStatValue: Number,       // Calculé selon niveau et rareté
  
  // === SOUS-STATISTIQUES ===
  subStats: [
    {
      stat: String,
      value: Number,
      rolls: Number,           // Nombre de rolls dans ce substat (1-6)
    }
  ],                           // Max 4 sub-stats
  
  // === MÉTADONNÉES ===
  equippedTo: ObjectId,        // characters_owned._id
  locked: Boolean,
  obtainedAt: Date,
  obtainedFrom: String,        // "domain_namehere", "strongbox", "event"
  
  // Score de qualité (calculé pour le tri)
  qualityScore: Number,        // 0-100 (basé sur les bonnes sub-stats)
}

// INDEX
db.artifacts_owned.createIndex({ userId: 1 })
db.artifacts_owned.createIndex({ userId: 1, setId: 1, slot: 1 })
db.artifacts_owned.createIndex({ userId: 1, qualityScore: -1 })
db.artifacts_owned.createIndex({ equippedTo: 1 })
```

---

## COLLECTION: artifact_sets_base

```javascript
{
  _id: ObjectId,
  id: String,                  // "crimson_witch_of_flames"
  name: String,                // "Sorcière des Flammes Cramoisies"
  rarity: [Number],            // [4, 5] = disponible en 4★ et 5★
  domain: String,              // "midsummer_courtyard"
  imageUrl: String,
  
  bonuses: {
    two_piece: {
      description: String,
      effect: Object,          // Effet machine-lisible
    },
    four_piece: {
      description: String,
      effect: Object,
    },
  },
}

// INDEX
db.artifact_sets_base.createIndex({ id: 1 }, { unique: true })
```

---

## COLLECTION: guilds

```javascript
{
  _id: ObjectId,
  
  name: String,                // Nom de la guilde (unique par serveur)
  guildTag: String,            // [TAG] max 4 caractères
  description: String,         // Max 200 chars
  icon: String,                // Emoji ou URL image
  
  serverId: String,            // Discord server ID
  ownerId: String,             // Discord user ID du maître
  
  level: Number,               // 1-10
  xp: Number,
  xpNextLevel: Number,
  
  memberCount: Number,         // Compteur dénormalisé
  maxMembers: Number,          // 20 + (level-1)*5, max 50
  
  cofferMora: Number,          // Mora dans le coffre commun
  cofferResources: [{          // Ressources dans le coffre
    resourceId: String,
    quantity: Number,
  }],
  
  settings: {
    isPublic: Boolean,         // Recrutement ouvert
    joinRequirement: String,   // "open", "application", "invite_only"
    minimumAR: Number,
    language: String,
    region: String,
  },
  
  stats: {
    totalRaidsCompleted: Number,
    totalBossesKilled: Number,
    totalWarWins: Number,
    totalWarLosses: Number,
    weeklyContribution: Number,
  },
  
  createdAt: Date,
  lastActive: Date,
  
  // Buffs passifs actifs (selon niveau de guilde)
  activeBuffs: [{
    buffId: String,
    value: Number,
    expiresAt: Date,
  }],
}

// INDEX
db.guilds.createIndex({ serverId: 1, name: 1 }, { unique: true })
db.guilds.createIndex({ level: -1, xp: -1 })
db.guilds.createIndex({ serverId: 1 })
```

---

## COLLECTION: guild_members

```javascript
{
  _id: ObjectId,
  guildId: ObjectId,
  userId: ObjectId,
  discordId: String,
  
  role: String,                // "master", "officer", "veteran", "member", "aspirant"
  joinedAt: Date,
  lastContribution: Date,
  
  contribution: {
    weekly: Number,            // Reset chaque lundi
    total: Number,
  },
  
  guildCoins: Number,          // Monnaie de guilde accumulée (à dépenser en shop)
  
  raidParticipation: {
    currentRaid: {
      raidId: ObjectId,
      damageDealt: Number,
      participated: Boolean,
    },
    history: [{
      raidId: ObjectId,
      date: Date,
      damageDealt: Number,
    }],
  },
}

// INDEX
db.guild_members.createIndex({ guildId: 1 })
db.guild_members.createIndex({ userId: 1 }, { unique: true })
db.guild_members.createIndex({ guildId: 1, role: 1 })
db.guild_members.createIndex({ guildId: 1, "contribution.weekly": -1 })
```

---

## COLLECTION: boss_sessions (Combat Actif)

```javascript
{
  _id: ObjectId,
  sessionType: String,         // "solo", "coop"
  
  userId: ObjectId,            // Solo: ID du joueur
  coopUsers: [ObjectId],       // Coop: IDs des joueurs
  
  bossId: String,              // Ref → boss_base.id
  
  // === ÉTAT DU BOSS ===
  boss: {
    currentHp: Number,
    maxHp: Number,
    phase: Number,             // Phase actuelle (1-3 selon le boss)
    shields: [{
      element: String,
      value: Number,
    }],
    activeBuffs: [String],
    activeDebuffs: [String],
    elementalStatus: String,   // Élément actuel appliqué sur le boss
    turnCount: Number,
  },
  
  // === ÉTAT DES JOUEURS ===
  players: [{
    userId: ObjectId,
    activeCharacterIndex: Number, // Index dans team (0-3)
    team: [{
      characterId: String,
      level: Number,
      currentHp: Number,
      maxHp: Number,
      energy: Number,           // 0-100
      skillCooldown: Number,    // Tours restants
      elementalStatus: String,  // Élément appliqué sur ce personnage
      cachedStats: Object,      // Stats calculées au démarrage
    }],
    isAlive: Boolean,
  }],
  
  // === MÉTADONNÉES ===
  status: String,              // "active", "victory", "defeat", "fled"
  startedAt: Date,
  endedAt: Date,
  threadId: String,            // ID du Thread Discord
  messageId: String,           // ID du message principal du combat
  
  // === RÉCOMPENSES CALCULÉES ===
  rewards: {
    claimed: Boolean,
    resinUsed: Number,
    mora: Number,
    xp: Number,
    drops: [{
      materialId: String,
      quantity: Number,
    }],
    artifactDrops: [ObjectId],
  },
  
  // === LOG DES ACTIONS ===
  actionLog: [{
    turn: Number,
    actor: String,             // "player" ou "boss"
    action: String,
    damage: Number,
    reaction: String,
    critical: Boolean,
    timestamp: Date,
  }],
}

// INDEX
db.boss_sessions.createIndex({ userId: 1, status: 1 })
db.boss_sessions.createIndex({ status: 1, startedAt: 1 })
db.boss_sessions.createIndex({ threadId: 1 })
// TTL: archivage après 7 jours
db.boss_sessions.createIndex({ endedAt: 1 }, { expireAfterSeconds: 604800 })
```

---

## COLLECTION: boss_base

```javascript
{
  _id: ObjectId,
  id: String,                  // "dvalin", "andrius", "weekly_signora", etc.
  name: String,
  type: String,                // "resin_boss", "weekly_boss", "world_boss", "guild_raid"
  element: String,
  region: String,
  
  imageUrl: String,
  
  // === STATS (AJUSTÉES SELON WORLD LEVEL) ===
  stats: [{
    worldLevel: Number,        // 0-8
    hp: Number,
    atk: Number,
    def: Number,
    elementalRes: Object,      // { pyro: 10, hydro: 10, ... }
  }],
  
  // === PHASES ===
  phases: [{
    phase: Number,
    hpThreshold: Number,       // % HP à partir duquel la phase démarre
    description: String,
    newMechanics: [String],
    buffsGained: [String],
  }],
  
  // === PATTERNS D'ATTAQUE ===
  attacks: [{
    name: String,
    damage: Number,            // Multiplicateur de son ATK
    element: String,
    type: String,              // "physical", "aoe", "targeted", "pattern"
    weight: Number,            // Probabilité relative de choisir cette attaque
    phaseOnly: Number,         // null = toutes phases, sinon phase spécifique
  }],
  
  // === RÉCOMPENSES ===
  rewardTable: [{
    worldLevel: Number,
    items: [{
      materialId: String,
      minQuantity: Number,
      maxQuantity: Number,
      dropRate: Number,        // 0-1
    }],
    artis: {
      count: Number,           // Nombre d'artefacts droppés
      rarityDistribution: Object, // { 3: 50, 4: 40, 5: 10 } = %
      sets: [String],          // Sets possibles
    },
    mora: Number,
    adventureXP: Number,
    characterXP: Number,
  }],
  
  // Coût résine
  resinCost: Number,           // 0 si world boss sans résine
  
  // Lore et description
  loreDescription: String,
  weaknesses: [String],        // Éléments avec bonus
  
  // Statut
  isAvailable: Boolean,
  addedVersion: String,
}

// INDEX
db.boss_base.createIndex({ id: 1 }, { unique: true })
db.boss_base.createIndex({ type: 1, region: 1 })
```

---

## COLLECTION: gacha_history

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  
  banner: String,              // "character_hutao_2.1", "standard", "weapon_2.1"
  bannerType: String,          // "character", "weapon", "standard", "beginner"
  
  pulls: [{
    pullNumber: Number,        // Numéro du pull dans cette session
    itemId: String,            // characterId ou weaponId
    itemType: String,          // "character" ou "weapon"
    rarity: Number,            // 3, 4, ou 5
    pityAtPull: Number,        // Pity au moment du pull
    isFeatured: Boolean,       // Featured ou off-banner
    isNew: Boolean,            // Nouveau ou constellation/raffinement
    timestamp: Date,
  }],
  
  session: {
    count: Number,             // Nombre de pulls dans cette session
    cost: {
      fates: Number,
      primogems: Number,
    },
  },
  
  timestamp: Date,
}

// INDEX
db.gacha_history.createIndex({ userId: 1, timestamp: -1 })
db.gacha_history.createIndex({ userId: 1, bannerType: 1 })
// TTL: garder 6 mois
db.gacha_history.createIndex({ timestamp: 1 }, { expireAfterSeconds: 15552000 })
```

---

## COLLECTION: teapots

```javascript
{
  _id: ObjectId,
  userId: ObjectId,            // Unique par joueur
  
  name: String,                // Nom du royaume
  realm: String,               // "cool_isle", "emerald_peak", "silken_courtyard", etc.
  
  level: Number,               // 1-8 (rang du royaume)
  comfort: Number,             // Score de confort actuel
  trustRank: Number,           // Rang de confiance (progression globale housing)
  
  // === PRODUCTION PASSIVE ===
  production: {
    mora: Number,              // Mora/heure selon le niveau
    wanderers_kit: Number,     // Baguette de vagabond par 12h
    lastCollected: Date,
    storageLimit: Number,      // Plafond de stockage (mora: max 168h de production)
  },
  
  // === MEUBLES PLACÉS ===
  placedFurniture: [{
    furnitureId: String,       // Ref → teapot_furniture_base.id
    instanceId: ObjectId,      // Ref → teapot_furniture_owned._id
    position: { x: Number, y: Number, z: Number }, // Grille 3D simplifiée
    rotation: Number,          // 0, 90, 180, 270
    zone: String,              // "exterior", "interior_main", "interior_side"
  }],
  
  // === PERSONNAGES RÉSIDENTS ===
  residents: [{
    characterId: String,
    assignedAt: Date,
    bonus: String,             // Description du bonus
  }],
  
  // === SOCIAL ===
  guestbook: [{
    visitorId: String,
    message: String,
    timestamp: Date,
  }],
  votes: Number,               // Votes des visiteurs cette semaine
  
  // === BADGES ===
  displayBadge: String,        // Badge affiché (gagnés par succès housing)
  
  lastUpdated: Date,
}

// INDEX
db.teapots.createIndex({ userId: 1 }, { unique: true })
db.teapots.createIndex({ votes: -1 })
```

---

## COLLECTION: expeditions

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  
  characterId: String,         // Personnage en expédition
  region: String,              // Région de l'expédition
  duration: Number,            // Durée en heures (4, 8, 12, 20)
  
  startedAt: Date,
  completesAt: Date,
  
  status: String,              // "active", "completed", "collected"
  
  // Récompenses pré-calculées à la création
  rewards: [{
    materialId: String,
    quantity: Number,
  }],
  
  bonusApplied: Boolean,       // Bonus personnage natif de la région
}

// INDEX
db.expeditions.createIndex({ userId: 1, status: 1 })
db.expeditions.createIndex({ completesAt: 1, status: 1 })
```

---

## COLLECTION: market_listings

```javascript
{
  _id: ObjectId,
  sellerId: ObjectId,
  sellerDiscordId: String,
  
  // === L'ANNONCE ===
  itemType: String,            // "material", "weapon_base" (armes non-équipées max 4★)
  itemId: String,              // materialId ou weaponId
  quantity: Number,
  pricePerUnit: Number,        // En Mora
  totalPrice: Number,          // pricePerUnit × quantity
  
  // === ÉTAT ===
  status: String,              // "active", "sold", "cancelled", "expired"
  
  // === ACHETEUR ===
  buyerId: ObjectId,
  buyerDiscordId: String,
  soldAt: Date,
  
  // === MÉTADONNÉES ===
  postedAt: Date,
  expiresAt: Date,             // 24h maximum
  
  // Taxes
  taxAmount: Number,           // Mora prélevé à la vente
  taxRate: Number,             // % de taxe appliqué
}

// INDEX
db.market_listings.createIndex({ status: 1, itemId: 1 })
db.market_listings.createIndex({ sellerId: 1 })
db.market_listings.createIndex({ expiresAt: 1, status: 1 })
db.market_listings.createIndex({ itemType: 1, pricePerUnit: 1 })
```

---

## COLLECTION: achievements_progress

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  
  achievements: [{
    achievementId: String,
    progress: Number,          // Progression actuelle
    target: Number,            // Objectif
    completed: Boolean,
    completedAt: Date,
    rewardClaimed: Boolean,
  }],
  
  totalCompleted: Number,      // Dénormalisé
  achievementPoints: Number,   // Points cumulés (= prestige social)
  
  lastUpdated: Date,
}

// INDEX
db.achievements_progress.createIndex({ userId: 1 }, { unique: true })
db.achievements_progress.createIndex({ achievementPoints: -1 })
```

---

## COLLECTION: notifications

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  discordId: String,
  
  type: String,                // "resin_full", "expedition_done", "guild_raid", "friend_request"
  title: String,
  message: String,
  data: Object,                // Données supplémentaires selon le type
  
  read: Boolean,
  sent: Boolean,               // DM envoyé ou non
  
  createdAt: Date,
}

// INDEX
db.notifications.createIndex({ userId: 1, read: 1 })
db.notifications.createIndex({ discordId: 1, sent: 1 })
// TTL: supprimer les notifs lues après 7 jours
db.notifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 })
```

---

## COLLECTION: abyss_progress

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  
  // Cycle actuel
  currentCycle: {
    cycleId: String,           // "2025_01_A" (première moitié) ou "2025_01_B"
    totalStars: Number,        // 0-36
    floors: [{
      floor: Number,           // 1-12
      chambers: [{
        chamber: Number,       // 1-3
        stars: Number,         // 0-3
        team1Used: [String],   // characterIds
        team2Used: [String],
        clearedAt: Date,
        bestTime: Number,      // Secondes
      }],
    }],
    rewardsClaimed: [Number],  // Paliers d'étoiles réclamés
  },
  
  // Historique des cycles passés
  history: [{
    cycleId: String,
    totalStars: Number,
    maxFloor: Number,
    completedAt: Date,
  }],
  
  // Records personnels
  personalBest: {
    maxStars: Number,
    maxFloor: Number,
    fastestFloor12Clear: Number,
  },
}

// INDEX
db.abyss_progress.createIndex({ userId: 1 }, { unique: true })
db.abyss_progress.createIndex({ "currentCycle.totalStars": -1 })
```

---

## COLLECTION: regions_progress

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  
  regions: {
    mondstadt: {
      exploration: Number,       // 0-100%
      reputation: Number,        // 0-10
      reputationXP: Number,
      waypointsFound: Number,
      waypointsTotal: Number,
      statuesLevel: Number,      // Niveau de la statue des sept (0-10)
      isUnlocked: Boolean,
      unlockRewardsClaimed: [Number], // % paliers réclamés
    },
    liyue: { ...mêmes champs },
    inazuma: { ...mêmes champs },
    sumeru: { ...mêmes champs },
    fontaine: { ...mêmes champs },
    natlan: { ...mêmes champs },
    snezhnaya: { ...mêmes champs },
  },
  
  lastUpdated: Date,
}

// INDEX
db.regions_progress.createIndex({ userId: 1 }, { unique: true })
```

---

## COLLECTION: transactions

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  
  type: String,                // "earn", "spend", "transfer_in", "transfer_out"
  currency: String,            // "mora", "primogems", "acquaint_fates", "interwoven_fates"
  amount: Number,
  balanceAfter: Number,
  
  source: String,              // "boss", "commission", "gacha", "market_sell", "battle_pass", etc.
  description: String,
  referenceId: ObjectId,       // ID de l'action qui a généré la transaction
  
  timestamp: Date,
}

// INDEX
db.transactions.createIndex({ userId: 1, timestamp: -1 })
db.transactions.createIndex({ userId: 1, currency: 1, timestamp: -1 })
// TTL: garder 90 jours
db.transactions.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 })
```

---

## COLLECTION: server_config

```javascript
{
  _id: ObjectId,
  serverId: String,            // Discord Guild ID
  
  // Canaux Discord
  channels: {
    announcements: String,     // ID du salon d'annonces du bot
    events: String,            // ID du salon d'événements
    leaderboard: String,       // ID du salon classements
    guildActivities: String,   // ID du salon guilde
    battleLog: String,         // ID du salon logs de combat
  },
  
  // Rôles Discord
  roles: {
    adventurer: String,        // Rôle donné à tous les joueurs
    veteran: String,           // AR50+
    endgame: String,           // AR60
    guildMaster: String,       // Maîtres de guildes
    admin: String,             // Admins du bot sur ce serveur
  },
  
  // Paramètres de jeu
  settings: {
    language: String,          // Langue par défaut du serveur
    allowNSFW: Boolean,
    maxGuildsPerServer: Number, // Max 10 par défaut
    customPrefix: String,      // Legacy (Discord.js v14 → slash commands)
  },
  
  // Administrateurs locaux
  adminUserIds: [String],
  
  configuredAt: Date,
  configuredBy: String,        // Discord user ID
  lastUpdated: Date,
}

// INDEX
db.server_config.createIndex({ serverId: 1 }, { unique: true })
```

---

## COLLECTION: banners

```javascript
{
  _id: ObjectId,
  id: String,                  // "character_hutao_3.0", "weapon_3.0", "standard"
  type: String,                // "character", "weapon", "standard", "beginner"
  
  name: String,
  subtitle: String,
  imageUrl: String,
  
  // Personnage/arme vedette
  featured5Star: [String],     // characterId ou weaponId
  featured4Stars: [String],    // 3 pour personnages, 5 pour armes
  
  // Disponibilité
  startDate: Date,
  endDate: Date,
  isActive: Boolean,
  
  // Paramètres gacha
  pityConfig: {
    softPityStart: Number,
    hardPity: Number,
    rate5Star: Number,
    rate4Star: Number,
  },
  
  // Stats globales (pour la transparence)
  stats: {
    totalPulls: Number,
    total5Stars: Number,
    total4Stars: Number,
  },
  
  version: String,             // "3.0" (version Genshin de référence)
}

// INDEX
db.banners.createIndex({ type: 1, isActive: 1 })
db.banners.createIndex({ startDate: 1, endDate: 1 })
```
