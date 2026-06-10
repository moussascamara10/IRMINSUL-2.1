# IRMINSUL V2 — 01. ARCHITECTURE GLOBALE

> *"L'Irminsul enregistre tout ce qui existe dans ce monde — chaque action, chaque souvenir, chaque destin."*
> Version de conception : 2.0.0 | Statut : Phase Architecturale

---

## ANALYSE PRÉALABLE D'ARCHITECTE

### Avantages de l'approche refactorisée
- Architecture découplée en modules indépendants → maintenabilité maximale
- Pattern Repository pour toute interaction DB → testabilité et swap de provider facile
- Système de jobs asynchrones (BullMQ) → résine, expéditions, resets sans bloquer le thread principal
- Cache Redis multicouche → performances à grande échelle sans surcharger MongoDB
- Design orienté événements internes → les modules communiquent sans couplage direct

### Risques identifiés
- **Complexité de synchronisation** : résine régénérée en background + combat actif = race conditions potentielles → Solution : verrous Redis (Redlock) sur les ressources critiques
- **Scalabilité Discord** : les interactions ont un timeout de 3 secondes → Solution : defer immédiat + traitement asynchrone avec update de l'interaction
- **Explosion des données** : historique de gacha, logs de combat, transactions → Solution : TTL sur les collections archivables, archivage mensuel
- **Abus économiques** : farming de ressources, multi-comptes → Solution : rate limiting par IP + discordId, détection d'anomalies statistiques

### Abus potentiels anticipés
- Farm de commissions via scripts → Cooldowns stricts + captcha bouton invisible
- Exploitation des bugs de combat → Tout le calcul côté serveur uniquement, jamais côté client
- Multi-comptes → Un compte par discordId, liaison facultative à l'UID Genshin réel
- Manipulation du marché → Limites de prix min/max, taxes progressives sur les transactions

### Problèmes d'équilibrage
- Trop de résine → progression trop rapide → plafonner la régénération et les sources
- Gacha trop généreux → dévalorisation des 5★ → pity system équilibré, pas de free 5★ faciles
- Guildes dominantes → fossé entre vieux et nouveaux joueurs → bonus de rattrapage pour les nouveaux serveurs

---

## 1. VISION GLOBALE

IRMINSUL V2 est un RPG persistant complet sur Discord, fidèle à l'univers de Genshin Impact dans ses mécaniques, son atmosphère et son contenu. Ce n'est pas un bot gacha — c'est un jeu.

**Piliers fondamentaux :**
```
┌─────────────────────────────────────────────────────────────────┐
│                        IRMINSUL V2                              │
│                                                                 │
│   IMMERSION          PROGRESSION          COMMUNAUTÉ            │
│   ─────────          ───────────          ──────────            │
│   Lore fidèle        AR 1 → 60            Guildes               │
│   Embeds visuels     Personnages 1→90      Coop boss             │
│   Régions réelles    Talents              Raids                  │
│   Quêtes             Constellations       Marché P2P             │
│   Musique (liens)    Artefacts            Événements partagés    │
│                      Abîme spiralé        Classements            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. STACK TECHNIQUE

```yaml
Runtime:
  - Node.js: "^20.0.0"
  - TypeScript: "^5.3.0"
  - Discord.js: "^14.14.0"

Base de données:
  - MongoDB: "^7.0" (données persistantes)
  - Redis: "^7.2" (cache, sessions, jobs, verrous)

File d'attente:
  - BullMQ: "^4.x" (tâches asynchrones planifiées)

ORM / Validation:
  - Mongoose: "^8.x" (modèles et schémas)
  - Zod: "^3.x" (validation des entrées)

Utilitaires:
  - dayjs: gestion des dates/timezones
  - mathjs: formules RPG complexes
  - winston: logging structuré
  - pino: logging haute performance en production
  - dotenv: variables d'environnement
  - undici: requêtes HTTP internes

Infrastructure:
  - Docker + Docker Compose (développement local)
  - PM2 ou Railway/Fly.io (production)
  - MongoDB Atlas (cloud) ou auto-hébergé
  - Redis Cloud ou Upstash
```

---

## 3. ARCHITECTURE MODULAIRE

```
irminsul-v2/
│
├── src/
│   ├── core/                          # Noyau fondamental
│   │   ├── IrminsulClient.ts          # Extension du Client Discord.js
│   │   ├── CommandLoader.ts           # Chargement dynamique des slash commands
│   │   ├── EventLoader.ts             # Chargement dynamique des événements Discord
│   │   ├── ModuleRegistry.ts          # Registre des modules du jeu
│   │   ├── ErrorHandler.ts            # Gestionnaire d'erreurs global
│   │   └── Bootstrap.ts               # Point d'entrée et initialisation
│   │
│   ├── modules/                       # Modules de jeu indépendants
│   │   ├── profile/                   # 👤 Profil & Compte
│   │   ├── gacha/                     # ✨ Système de Vœux
│   │   ├── combat/                    # ⚔️ Moteur de Combat
│   │   ├── characters/                # 🎭 Personnages & Équipe
│   │   ├── weapons/                   # 🗡️ Armes
│   │   ├── artifacts/                 # 💎 Artefacts
│   │   ├── progression/               # 📈 Rang Aventurier & XP
│   │   ├── quests/                    # 📜 Quêtes & Histoire
│   │   ├── exploration/               # 🗺️ Exploration Régionale
│   │   ├── expedition/                # 🧭 Expéditions
│   │   ├── commission/                # 📋 Commissions Quotidiennes
│   │   ├── housing/                   # 🏠 Théière de Sérénithé
│   │   ├── guild/                     # 🏰 Guildes & Raids
│   │   ├── economy/                   # 💰 Économie & Marché
│   │   ├── events/                    # 🎪 Événements Dynamiques
│   │   ├── abyss/                     # 🌀 Abîme Spiralé
│   │   ├── theater/                   # 🎭 Théâtre Imaginaire
│   │   ├── battlepass/                # 🏆 Passe de Combat
│   │   ├── reputation/                # 🌟 Réputation Régionale
│   │   ├── achievements/              # 🥇 Succès & Titres
│   │   ├── collection/                # 📚 Bestiaire & Collections
│   │   ├── social/                    # 👥 Amis & Interaction Sociale
│   │   └── admin/                     # ⚙️ Administration & Modération
│   │
│   ├── database/
│   │   ├── models/                    # Schémas Mongoose
│   │   ├── repositories/              # Pattern Repository (abstraction DB)
│   │   └── seeds/                     # Données initiales (personnages, armes, etc.)
│   │
│   ├── jobs/                          # Tâches planifiées BullMQ
│   │   ├── ResinRegenJob.ts           # Régénération résine (toutes les 8 min)
│   │   ├── ExpeditionJob.ts           # Fin d'expéditions
│   │   ├── DailyResetJob.ts           # Reset commissions, boutique
│   │   ├── WeeklyResetJob.ts          # Reset abîme, boss hebdo
│   │   ├── EventTickJob.ts            # Avancement des événements actifs
│   │   ├── TeapotProductionJob.ts     # Production passive théière
│   │   └── GuildContributionJob.ts    # Calcul contributions guildes
│   │
│   ├── services/                      # Services métier partagés
│   │   ├── CombatEngine.ts            # Moteur de calcul de combat
│   │   ├── GachaEngine.ts             # Moteur de gacha (probabilités)
│   │   ├── ProgressionService.ts      # Calcul XP, rang, level-up
│   │   ├── EconomyService.ts          # Transactions atomiques
│   │   ├── NotificationService.ts     # Push DM / channel
│   │   ├── ReactionService.ts         # Calcul réactions élémentaires
│   │   └── LeaderboardService.ts      # Classements en temps réel
│   │
│   ├── cache/
│   │   ├── RedisCache.ts              # Wrapper Redis
│   │   ├── UserCache.ts               # Cache profils joueurs (TTL 5 min)
│   │   ├── CharacterCache.ts          # Cache données statiques personnages
│   │   └── BannerCache.ts             # Cache bannières actives
│   │
│   ├── builders/                      # Constructeurs d'UI Discord
│   │   ├── EmbedBuilder.ts            # Embeds thématisés Genshin
│   │   ├── ComponentBuilder.ts        # Boutons, menus déroulants
│   │   ├── ModalBuilder.ts            # Modals de saisie
│   │   └── PaginationHelper.ts        # Pagination des listes longues
│   │
│   ├── utils/
│   │   ├── formulas.ts                # Formules RPG (DMG, scaling, breakpoints)
│   │   ├── constants.ts               # Constantes globales du jeu
│   │   ├── validators.ts              # Validateurs d'entrée Zod
│   │   ├── cooldown.ts                # Système de cooldowns
│   │   └── rng.ts                     # Générateur de nombres aléatoires sécurisé
│   │
│   └── data/                          # Données statiques JSON/TS
│       ├── characters/                # Tous les personnages Genshin
│       ├── weapons/                   # Toutes les armes
│       ├── artifacts/                 # Tous les sets d'artefacts
│       ├── bosses/                    # Tous les boss
│       ├── materials/                 # Toutes les ressources
│       ├── regions/                   # Données des régions
│       └── talents/                   # Données des talents
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── scripts/
│   ├── deploy-commands.ts             # Déploiement slash commands
│   ├── seed-database.ts               # Population initiale DB
│   └── migrate.ts                     # Migrations de données
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── tsconfig.json
```

---

## 4. ARCHITECTURE EN COUCHES

```
┌────────────────────────────────────────────────────┐
│              COUCHE PRÉSENTATION                   │
│         (Discord UI — Embeds, Buttons, Modals)     │
├────────────────────────────────────────────────────┤
│              COUCHE APPLICATION                    │
│     (Slash Commands — Validation — Routing)        │
├────────────────────────────────────────────────────┤
│              COUCHE MÉTIER                         │
│   (Services — Moteurs — Calculs — Règles du jeu)  │
├────────────────────────────────────────────────────┤
│              COUCHE ACCÈS DONNÉES                  │
│         (Repositories — Cache Redis)               │
├────────────────────────────────────────────────────┤
│              COUCHE PERSISTENCE                    │
│              (MongoDB — Redis)                     │
└────────────────────────────────────────────────────┘
```

---

## 5. FLUX UTILISATEUR PRINCIPAL

```
Nouveau Joueur:
────────────────
/commencer
  → Tutoriel interactif (5 étapes)
  → Choix du personnage de départ (Amber, Kaeya, Lisa) ← exact comme Genshin
  → Création du profil (AR1)
  → 10 vœux gratuits (bannière débutant)
  → Première commission quotidienne guidée
  → Récompense de bienvenue (Primogens + Mora)
  → Présentation des modules principaux

Boucle Quotidienne:
────────────────────
1. /commission          → 4 commissions (récompenses + AR XP)
2. /boss <nom>          → Boss de résine (3-4 boss/jour selon résine)
3. /expedition check    → Récupérer ressources des expéditions
4. /expedition start    → Lancer nouvelles expéditions
5. /voeux               → Dépenser Primogens si disponibles
6. /theiere collect     → Récolte production passives

Boucle Hebdomadaire:
─────────────────────
1. /boss hebdomadaire   → Boss hebdo (réinitialisation lundi)
2. /abyss               → Abîme Spiralé (12 étages, 36★ max)
3. /guilde contribution → Contribuer à la guilde
4. /battlepass          → Missions hebdomadaires BP

Progression Long Terme:
────────────────────────
AR1 → AR60 → Endgame (Abîme Spiralé, Théâtre Imaginaire, Raids de Guilde)
Personnages N1 → N90 → Constellations C1→C6 → Talents N1→N10
Artefacts → farming → optimisation → score parfait
Exploration → 100% toutes régions → récompenses uniques
Succès → débloquer titres exclusifs
```

---

## 6. INTERACTIONS ENTRE SYSTÈMES

```
                          ┌─────────────┐
                          │    JOUEUR   │
                          └──────┬──────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
    ┌────▼────┐            ┌─────▼─────┐          ┌─────▼─────┐
    │  GACHA  │            │  COMBAT   │          │EXPLORATION│
    │ ✨Vœux  │            │⚔️ Boss    │          │🗺️ Régions │
    │ Bannières│            │ Domaines  │          │ Réputation│
    └────┬────┘            └─────┬─────┘          └─────┬─────┘
         │                       │                       │
    PERSONNAGES            RESSOURCES               RÉCOMPENSES
    ARMES                  MORA                     AR XP
    ARTEFACTS              MATÉRIAUX                TITRES
         │                       │                       │
         └───────────────────────▼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       ÉCONOMIE          │
                    │  💰 Mora / Primogens    │
                    │  📦 Ressources          │
                    │  🏪 Marché P2P          │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
         ┌────▼────┐       ┌─────▼─────┐      ┌────▼────┐
         │ GUILDE  │       │  HOUSING  │      │ EVENTS  │
         │🏰 Raids  │       │🏠 Théière  │      │🎪 Saisons│
         │ Guerre  │       │ Meubles   │      │ BP      │
         └─────────┘       └───────────┘      └─────────┘
```

**Dépendances critiques :**

| Système A → Système B | Donnée partagée |
|----------------------|-----------------|
| Combat → Économie | Récompenses Mora + matériaux |
| Combat → Progression | AR XP, XP personnage |
| Gacha → Personnages | Ajout de personnages à l'inventaire |
| Exploration → Réputation | Points de réputation régionale |
| Commission → Économie | Mora + Primogens quotidiens |
| Guilde → Combat | Buffs de guilde actifs en combat |
| Housing → Économie | Production passive de Mora |
| Battle Pass → Économie | Primogens paliers premium |

---

## 7. INFRASTRUCTURE ET DÉPLOIEMENT

```yaml
# docker-compose.yml (développement)
version: '3.9'
services:
  bot:
    build: .
    environment:
      - NODE_ENV=development
    depends_on:
      - mongo
      - redis
    volumes:
      - ./src:/app/src

  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  mongo-express:           # Interface admin MongoDB (dev only)
    image: mongo-express
    ports:
      - "8081:8081"
    depends_on:
      - mongo
```

**Variables d'environnement (.env.example) :**
```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=              # Dev guild uniquement

MONGODB_URI=mongodb://localhost:27017/irminsul_v2
REDIS_URL=redis://localhost:6379

# Configuration du jeu
RESIN_MAX=200
RESIN_REGEN_MINUTES=8
DAILY_RESET_HOUR=4             # Heure UTC de reset quotidien
WEEKLY_RESET_DAY=1             # Lundi

# Économie
GACHA_COST_PRIMO=160           # Primogens par vœu
GACHA_COST_FATES=1             # Destins entrelacés par vœu

# Administration
ADMIN_USER_IDS=                # IDs Discord des admins (séparés par virgules)
LOG_LEVEL=info
```

---

## 8. SYSTÈME DE CACHE REDIS

```
Clés Redis utilisées:
─────────────────────
user:{discordId}:profile          TTL: 5 min  → Cache profil joueur
user:{discordId}:resin            TTL: dynamique → Résine calculée
user:{discordId}:cooldown:{cmd}   TTL: durée cooldown
combat:{sessionId}                TTL: 30 min → Session combat active
banner:current                    TTL: 1h → Bannières actives
leaderboard:ar                    TTL: 15 min → Classement AR
leaderboard:abyss                 TTL: 15 min → Classement abîme
guild:{guildId}:buffs             TTL: 1h → Buffs de guilde
character:base:{id}               TTL: 24h → Données statiques personnage
lock:user:{discordId}:economy     TTL: 5s → Verrou transaction
```

---

## 9. GESTION DES ERREURS ET LOGGING

```typescript
// Niveaux de log
ERROR   → Erreurs critiques (DB down, Discord API fail)
WARN    → Comportements suspects (abus détecté, anomalie économique)
INFO    → Actions joueur normales (gacha, combat terminé)
DEBUG   → Détails de calcul (formules de dégâts, probabilités)

// Format log structuré
{
  timestamp: "2025-01-15T10:30:00Z",
  level: "info",
  module: "gacha",
  discordId: "123456789",
  action: "wish",
  result: { rarity: 5, character: "Hu Tao" },
  pity: { before: 74, after: 0 }
}
```

---

## 10. SÉCURITÉ ET ANTI-ABUS

```
Rate Limiting (par discordId):
──────────────────────────────
/voeux           → max 40 pulls/minute (anti-spam boutons)
/boss            → max 10 combats/minute
/commission      → max 4/jour (hard cap)
/marche          → max 20 transactions/heure

Vérifications d'intégrité:
───────────────────────────
✓ Toutes les ressources vérifiées avant déduction
✓ Transactions MongoDB atomiques ($session)
✓ Verrous Redis (Redlock) sur ressources critiques
✓ Checksum des sessions de combat (anti-tamper)
✓ Validation Zod stricte sur toutes les entrées
✓ Paramètres de commande jamais trusted directement

Détection d'anomalies:
───────────────────────
⚠ Mora > 500M → Flag pour review
⚠ Pulls > 100 en 10 minutes → Throttle + log
⚠ Multiples sessions combat simultanées → Block
⚠ Résine négative → Erreur + alert admin
```
