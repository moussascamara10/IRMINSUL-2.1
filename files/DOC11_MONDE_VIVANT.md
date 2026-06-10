# DOC 11 — SYSTÈME MONDE VIVANT
## IRMINSUL V2 — Événements Passifs, Atmosphère et Engagement

> Référence technique pour Devin | Implémentation complète de l'expérience "monde vivant"

---

## INTRODUCTION

Ce document décrit l'implémentation du "Monde Vivant" d'IRMINSUL V2 — l'ensemble des mécaniques qui font que le serveur semble actif même quand les joueurs ne font rien. Ces systèmes s'ajoutent sans modifier le code existant. Ils représentent la différence entre un bot de commandes et une expérience de jeu réelle.

**Les 5 systèmes couverts ici :**
1. **L'Archiviste** — NPC narratif qui commente les événements en temps réel
2. **Météo de Teyvat** — Modificateurs quotidiens qui changent les règles du jeu
3. **Marchands Itinérants** — Apparitions rares avec stock limité
4. **Invasions de l'Abîme** — Boss collectif avec HP partagé par le serveur
5. **Anomalies Élémentaires** — Cristaux aléatoires à réclamer en premier

---

## 1. CONFIGURATION DES SALONS (Setup Admin)

Avant tout, un admin doit configurer les salons dédiés via `/admin setup`.

```typescript
// Dans server_config (MongoDB)
interface IServerConfig {
  guildId: string;

  channels: {
    archivist: string;        // #archiviste-irminsul
    weather: string;          // #teyvat-aujourd-hui (peut être le même)
    announcements: string;    // #annonces-irminsul
    combat_results: string;   // #résultats-combat
    anomalies: string;        // #anomalies-elementaires
    invasions: string;        // #invasions-abysses
  };

  features: {
    archivist: boolean;       // Activer/désactiver l'archiviste
    weather: boolean;
    merchants: boolean;
    invasions: boolean;
    anomalies: boolean;
  };
}
```

---

## 2. L'ARCHIVISTE — NPC NARRATIF EN TEMPS RÉEL

### 2.1 Concept

L'Archiviste est un webhook Discord qui poste dans un salon dédié en réaction aux événements du serveur. Il parle à la première personne (l'Irminsul lui-même) et donne du poids narratif aux actions des joueurs.

### 2.2 Infrastructure

```typescript
// src/services/ArchivistService.ts
import { WebhookClient, EmbedBuilder } from 'discord.js';

export class ArchivistService {
  private webhook: WebhookClient | null = null;

  async initialize(webhookUrl: string): Promise<void> {
    this.webhook = new WebhookClient({ url: webhookUrl });
  }

  // ──────────────────────────────────────────────────────────────
  // ÉVÉNEMENTS DÉCLENCHEURS
  // ──────────────────────────────────────────────────────────────

  // Appelé depuis GachaEngine.ts quand un 5★ est obtenu
  async onFiveStarObtained(userId: string, username: string, characterName: string, element: string): Promise<void> {
    const templates = ARCHIVIST_MESSAGES.fiveStar[element as ElementType] || ARCHIVIST_MESSAGES.fiveStar.default;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const message = template
      .replace('{character}', characterName)
      .replace('{player}', username);

    await this.post({
      color: ELEMENT_COLORS[element as ElementType] || 0xFFD700,
      description: message,
      emoji: ELEMENT_EMOJIS[element as ElementType] || '✨',
      footer: 'L\'Irminsul a enregistré cette rencontre'
    });
  }

  // Appelé depuis CombatSessionManager.ts à la fin d'un combat
  async onBossDefeated(userId: string, username: string, bossName: string, turns: number): Promise<void> {
    const templates = ARCHIVIST_MESSAGES.bossKill;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const message = template
      .replace('{boss}', bossName)
      .replace('{player}', username)
      .replace('{turns}', String(turns));

    await this.post({
      color: 0xFF6B35,
      description: message,
      emoji: '⚔️',
      footer: `Combat terminé en ${turns} tours`
    });
  }

  // Appelé depuis DailyResetJob.ts
  async onDailyReset(todayDate: string, weatherEffect: IWeatherEffect): Promise<void> {
    const message = ARCHIVIST_MESSAGES.dailyReset
      .replace('{date}', todayDate)
      .replace('{weather}', weatherEffect.name);

    await this.post({
      color: 0x87CEEB,
      description: message,
      emoji: weatherEffect.emoji,
      title: `Nouvelle Journée à Teyvat — ${todayDate}`,
      footer: 'L\'Archiviste note les événements du jour'
    });
  }

  // Appelé depuis le server milestone tracker
  async onServerMilestone(milestone: string, value: number): Promise<void> {
    const messages = ARCHIVIST_MESSAGES.milestones[milestone];
    if (!messages) return;

    const message = messages[Math.floor(Math.random() * messages.length)]
      .replace('{value}', value.toLocaleString());

    await this.post({
      color: 0xFFD700,
      description: message,
      emoji: '🌟',
      title: '✦ Jalon Atteint',
      footer: 'L\'Irminsul vibre de cet accomplissement'
    });
  }

  // Appelé depuis UserRepository quand un joueur atteint un AR palier
  async onPlayerLevelUp(username: string, newAR: number): Promise<void> {
    if (![20, 30, 40, 50, 55, 60].includes(newAR)) return; // Seulement les paliers importants

    const message = ARCHIVIST_MESSAGES.levelUp[newAR]
      || `Les archives s'actualisent. **${username}** a atteint le Rang Aventurier **${newAR}**.`;

    await this.post({
      color: 0x4DA6FF,
      description: message,
      emoji: '📊',
      footer: `Rang Aventurier ${newAR}`
    });
  }

  // ──────────────────────────────────────────────────────────────
  // MÉTHODE D'ENVOI
  // ──────────────────────────────────────────────────────────────

  private async post(options: {
    description: string;
    color: number;
    emoji: string;
    title?: string;
    footer?: string;
  }): Promise<void> {
    if (!this.webhook) return;

    try {
      const embed = new EmbedBuilder()
        .setColor(options.color)
        .setDescription(`${options.emoji} ${options.description}`);

      if (options.title) embed.setTitle(options.title);
      if (options.footer) embed.setFooter({ text: options.footer });

      embed.setTimestamp();

      await this.webhook.send({
        username: 'L\'Archiviste',
        avatarURL: ARCHIVIST_AVATAR_URL,
        embeds: [embed]
      });
    } catch (error) {
      logger.error({ event: 'archivist_error', error });
      // Ne jamais laisser l'archiviste faire crasher autre chose
    }
  }
}
```

### 2.3 Templates de messages

```typescript
// src/data/archivist-messages.ts

export const ARCHIVIST_MESSAGES = {
  fiveStar: {
    Pyro: [
      "Les flammes de Teyvat brillent plus fort ce soir. **{character}** a répondu à l'appel de **{player}**. L'Irminsul a enregistré cette union de feu.",
      "L'essence du Pyro s'est cristallisée. **{player}** et **{character}** — leurs destins sont désormais entrelacés dans les registres éternels.",
      "Depuis les profondeurs ardentes de Natlan jusqu'ici... **{character}** a traversé les étoiles pour rejoindre **{player}**."
    ],
    Hydro: [
      "Les eaux de Fontaine murmurent. **{character}** coule maintenant dans les veines de l'équipe de **{player}**.",
      "L'Archiviste note une perturbation dans les courants élémentaires. **{player}** accueille **{character}** — l'Hydro prend une nouvelle forme."
    ],
    Cryo: [
      "Un frisson parcourt Teyvat. **{player}** a lié son destin avec **{character}**. Le froid éternel d'Inazuma n'aura plus de secrets.",
      "Les cristaux de glace de Dragonspine ont reconnu leur maître. **{character}** servira fidèlement **{player}**."
    ],
    Electro: [
      "L'électricité dans l'air n'était pas un hasard. **{player}** a reçu **{character}** — et Inazuma tremble de reconnaissance.",
      "L'Irminsul a vibré. **{character}** répond à l'appel de **{player}**. Le tonnerre suit."
    ],
    Anemo: [
      "Le vent a soufflé dans la bonne direction. **{character}** a choisi **{player}** comme compagnon de voyage.",
      "Les courants d'air au-dessus de Mondstadt ont changé. **{player}** et **{character}** écriront ensemble une nouvelle page."
    ],
    Geo: [
      "La roche a parlé. **{character}** s'est ancré auprès de **{player}**. Liyue reconnaît sa volonté.",
      "Un contrat a été scellé dans les profondeurs de la terre. **{player}** et **{character}** — indéfectibles."
    ],
    default: [
      "Les astres se sont alignés. **{character}** a rejoint le voyage de **{player}**. L'Irminsul a tout enregistré.",
      "Une étoile de plus dans les archives. **{player}** et **{character}** — leur rencontre était écrite depuis longtemps.",
      "L'Irminsul frémit. **{character}** répond à l'appel. **{player}** ne sera plus jamais seul sur les routes de Teyvat."
    ]
  },

  bossKill: [
    "L'écho de la bataille résonne encore. **{player}** a mis fin au règne de **{boss}** en {turns} tours. Son essence se dissipe... pour l'instant.",
    "**{boss}** s'est effondré. **{player}** porte les cicatrices d'un combat en {turns} tours. L'Irminsul a tout vu.",
    "Les archives s'actualisent. **{boss}** vaincu par **{player}**. {turns} tours. Efficace.",
    "La balance élémentaire se rééquilibre. **{player}** a triomphé de **{boss}**. Teyvat peut respirer.",
  ],

  dailyReset: [
    "Une nouvelle journée s'éveille sur Teyvat. Le {weather} accompagne les aventuriers dans leurs quêtes du jour. Que vos commissions soient fructueuses.",
    "L'aube de **{date}** se lève. **{weather}** — les conditions sont favorables aux Voyageurs courageux.",
    "L'Irminsul a tourné une nouvelle page. **{date}** — que les étoiles guident vos pas."
  ],

  milestones: {
    pulls_100: ["Cent vœux ont été formulés sur ce serveur. L'Irminsul a entendu chacun d'eux."],
    pulls_1000: ["Mille destins entrelacés. {value} vœux résonnent dans les archives de l'Irminsul. Ce serveur écrit son histoire."],
    pulls_10000: ["Dix mille. L'Irminsul n'avait pas vu pareille dévotion depuis l'ère des Archons. {value} vœux — une légende en construction."],
    boss_kills_100: ["{value} boss vaincus sur ce serveur. Les créatures de Teyvat respectent désormais vos Voyageurs."],
    players_10: ["Dix Voyageurs ont rejoint les rangs. L'aventure prend de l'ampleur."],
    players_50: ["Cinquante Voyageurs marchent maintenant sous la bannière de ce serveur. Teyvat tremble légèrement."],
  },

  levelUp: {
    20: "AR20 — Les premières épreuves sont derrière vous. **{player}** découvre maintenant les vraies menaces de Teyvat.",
    30: "AR30 — **{player}** est un aventurier accompli. L'Abîme Spiralé vous attend.",
    40: "AR40 — Les rangs de l'élite. **{player}** a prouvé sa valeur face aux créatures les plus redoutables.",
    50: "AR50 — Un Vétéran. **{player}** connaît Teyvat comme sa poche. Les classements globaux s'ouvrent.",
    60: "AR60 — Duc du Vent. **{player}** a atteint le sommet de l'aventure. L'Irminsul grave ce nom dans ses archives pour l'éternité."
  }
};
```

---

## 3. MÉTÉO DE TEYVAT

### 3.1 Configuration des effets météo

```typescript
// src/data/weather-effects.ts

export interface IWeatherEffect {
  id: string;
  name: string;
  emoji: string;
  description: string;
  effects: IWeatherEffects;
  rarity: 'common' | 'rare' | 'legendary';
  weight: number; // Probabilité relative
}

interface IWeatherEffects {
  moraMultiplier?: number;          // ex: 1.15 = +15% Mora
  primoOnLogin?: number;            // Primogens offerts au /profil
  resinCostReduction?: number;      // ex: 0.1 = -10% coût résine
  expeditionSpeedup?: number;       // ex: 0.1 = -10% durée
  elementBonus?: { element: ElementType; multiplier: number; };
  softPityReduction?: number;       // ex: 5 = soft pity à 69 au lieu de 74
  commissionBonus?: number;         // Ex: 1.5 = +50% XP commissions
  dropRateBonus?: number;           // Ex: 0.15 = +15% drop rate boss
}

export const WEATHER_EFFECTS: IWeatherEffect[] = [
  {
    id: 'liyue_rain',
    name: 'Pluies de Liyue',
    emoji: '🌦️',
    description: 'Les pluies de Liyue enrichissent la terre et les coffres des marchands.',
    effects: { moraMultiplier: 1.15, expeditionSpeedup: 0.1 },
    rarity: 'common',
    weight: 20
  },
  {
    id: 'inazuma_storm',
    name: 'Tempête d\'Inazuma',
    emoji: '⚡',
    description: 'La foudre d\'Inazuma charge l\'air. Les créatures Électro sont déchaînées.',
    effects: { elementBonus: { element: 'Electro', multiplier: 1.2 }, dropRateBonus: 0.1 },
    rarity: 'common',
    weight: 18
  },
  {
    id: 'mondstadt_bloom',
    name: 'Floraison de Mondstadt',
    emoji: '🌸',
    description: 'Les fleurs de Cécilia s\'épanouissent. Les Archons sourient aux Voyageurs.',
    effects: { primoOnLogin: 5, commissionBonus: 1.25 },
    rarity: 'common',
    weight: 18
  },
  {
    id: 'sumeru_mist',
    name: 'Brumes de Sumeru',
    emoji: '🌿',
    description: 'Les brumes sacrées de Sumeru voilent le monde. Les plantes parlent...',
    effects: { elementBonus: { element: 'Dendro', multiplier: 1.15 }, resinCostReduction: 0.05 },
    rarity: 'common',
    weight: 16
  },
  {
    id: 'abyss_night',
    name: 'Nuit de l\'Abîme',
    emoji: '🌑',
    description: 'Une obscurité profonde enveloppe Teyvat. Les boss sont plus puissants, mais plus généreux.',
    effects: { dropRateBonus: 0.5, moraMultiplier: 0.8 }, // Moins de Mora, plus de drops
    rarity: 'rare',
    weight: 8
  },
  {
    id: 'archon_blessing',
    name: 'Bénédiction des Archons',
    emoji: '✨',
    description: 'Les Sept Archons regardent ce serveur avec bienveillance aujourd\'hui.',
    effects: { softPityReduction: 5, primoOnLogin: 15, moraMultiplier: 1.3 },
    rarity: 'rare',
    weight: 6
  },
  {
    id: 'fontaine_tide',
    name: 'Grande Marée de Fontaine',
    emoji: '🌊',
    description: 'Les eaux de Fontaine montent. Les trésors cachés remontent à la surface.',
    effects: { moraMultiplier: 1.25, dropRateBonus: 0.2, elementBonus: { element: 'Hydro', multiplier: 1.1 } },
    rarity: 'common',
    weight: 15
  },
  {
    id: 'dragonspine_blizzard',
    name: 'Blizzard du Dragonspine',
    emoji: '❄️',
    description: 'La montagne gronde. Les expéditions dans les régions froides rapportent davantage.',
    effects: { elementBonus: { element: 'Cryo', multiplier: 1.2 }, expeditionSpeedup: 0.15 },
    rarity: 'common',
    weight: 16
  },
  {
    id: 'golden_hour',
    name: 'Heure Dorée',
    emoji: '☀️',
    description: 'ÉVÉNEMENT RARE — Le soleil de Teyvat brille d\'une lumière extraordinaire. Tout est amplifié.',
    effects: { moraMultiplier: 1.5, primoOnLogin: 30, dropRateBonus: 0.3, commissionBonus: 2.0 },
    rarity: 'legendary',
    weight: 1 // Très rare
  }
];
```

### 3.2 Job de sélection quotidienne

```typescript
// src/jobs/DailyResetJob.ts — ajouter dans le job existant

export class DailyResetJob {

  static async execute(): Promise<void> {
    logger.info('⏰ Reset quotidien IRMINSUL...');

    // 1. Sélection de la météo du jour
    const weather = this.selectWeather();
    await redis.setex('weather:today', 86400, JSON.stringify(weather)); // TTL: 24h

    // 2. Poster dans le salon météo de chaque serveur
    const servers = await ServerConfigRepository.findAllWithWeatherEnabled();
    for (const server of servers) {
      await this.postWeatherEmbed(server, weather);
    }

    // 3. L'Archiviste annonce la nouvelle journée
    await archivistService.onDailyReset(
      new Date().toLocaleDateString('fr-FR'),
      weather
    );

    // 4. Reset des commissions (existant)
    await this.resetDailyCommissions();

    // 5. Reset du shop quotidien (existant)
    await this.resetDailyShop();

    logger.info(`✅ Reset quotidien terminé — Météo: ${weather.name}`);
  }

  private static selectWeather(): IWeatherEffect {
    // Sélection pondérée (les effets rares sont moins fréquents)
    const totalWeight = WEATHER_EFFECTS.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;

    for (const effect of WEATHER_EFFECTS) {
      random -= effect.weight;
      if (random <= 0) return effect;
    }
    return WEATHER_EFFECTS[0];
  }

  private static async postWeatherEmbed(server: IServerConfig, weather: IWeatherEffect): Promise<void> {
    const channel = await client.channels.fetch(server.channels.weather) as TextChannel;
    if (!channel) return;

    const rarityColors = { common: 0x87CEEB, rare: 0xAB47BC, legendary: 0xFFD700 };
    const effects = weather.effects;

    const effectLines: string[] = [];
    if (effects.moraMultiplier) effectLines.push(`💰 Mora ×${effects.moraMultiplier} sur toutes les activités`);
    if (effects.primoOnLogin) effectLines.push(`💎 +${effects.primoOnLogin} Primogens offerts au /profil`);
    if (effects.resinCostReduction) effectLines.push(`🔷 -${effects.resinCostReduction * 100}% sur le coût de résine`);
    if (effects.expeditionSpeedup) effectLines.push(`🧭 Expéditions ${effects.expeditionSpeedup * 100}% plus rapides`);
    if (effects.elementBonus) effectLines.push(`${ELEMENT_EMOJIS[effects.elementBonus.element]} +${(effects.elementBonus.multiplier - 1) * 100}% dégâts ${effects.elementBonus.element}`);
    if (effects.softPityReduction) effectLines.push(`✨ Soft pity réduit de ${effects.softPityReduction} pulls aujourd'hui`);
    if (effects.commissionBonus) effectLines.push(`📋 Commissions rapportent ×${effects.commissionBonus} XP`);
    if (effects.dropRateBonus) effectLines.push(`📦 +${effects.dropRateBonus * 100}% de chances de drops`);

    const embed = new EmbedBuilder()
      .setColor(rarityColors[weather.rarity])
      .setTitle(`${weather.emoji} ${weather.name}`)
      .setDescription(weather.description)
      .addFields({ name: '✦ Effets du jour', value: effectLines.join('\n') || 'Aucun effet spécial' })
      .setFooter({ text: weather.rarity === 'legendary' ? '⭐ MÉTÉO LÉGENDAIRE' : `Météo de Teyvat` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }
}

// Lecture de la météo active depuis n'importe où dans le code
export async function getTodayWeather(): Promise<IWeatherEffect | null> {
  const data = await redis.get('weather:today');
  return data ? JSON.parse(data) : null;
}

// Appliquer le modificateur de mora dans EconomyService.ts
export async function applyMoraReward(userId: string, baseMora: number): Promise<number> {
  const weather = await getTodayWeather();
  const multiplier = weather?.effects.moraMultiplier || 1.0;
  const finalMora = Math.floor(baseMora * multiplier);
  await UserRepository.addMora(userId, finalMora);
  return finalMora;
}
```

---

## 4. MARCHANDS ITINÉRANTS

### 4.1 Job de spawn

```typescript
// src/jobs/WanderingMerchantJob.ts

export class WanderingMerchantJob {
  private static SPAWN_INTERVAL_MIN = 4 * 60 * 60 * 1000; // 4h min
  private static SPAWN_INTERVAL_MAX = 8 * 60 * 60 * 1000; // 8h max
  private static SALE_DURATION_MIN  = 20 * 60 * 1000;     // 20min
  private static SALE_DURATION_MAX  = 40 * 60 * 1000;     // 40min
  private static STOCK_PER_ITEM = 5;

  static async initialize(): Promise<void> {
    this.scheduleNextMerchant();
  }

  private static scheduleNextMerchant(): void {
    const delay = Math.floor(
      Math.random() * (this.SPAWN_INTERVAL_MAX - this.SPAWN_INTERVAL_MIN)
    ) + this.SPAWN_INTERVAL_MIN;

    setTimeout(() => {
      this.spawnMerchant().catch(logger.error);
    }, delay);
  }

  static async spawnMerchant(): Promise<void> {
    const merchantId = `merchant:${Date.now()}`;
    const saleDuration = Math.floor(
      Math.random() * (this.SALE_DURATION_MAX - this.SALE_DURATION_MIN)
    ) + this.SALE_DURATION_MIN;

    // Sélectionner 3-5 items aléatoires
    const items = this.selectMerchantItems();

    // Créer la session marchande
    const merchant: IMerchantSession = {
      id: merchantId,
      items: items.map(item => ({ ...item, remaining: this.STOCK_PER_ITEM })),
      endsAt: Date.now() + saleDuration,
      merchantType: this.selectMerchantType()
    };

    // Sauvegarder dans Redis
    await redis.setex(`active:${merchantId}`, Math.floor(saleDuration / 1000) + 60, JSON.stringify(merchant));

    // Poster dans tous les serveurs configurés
    const servers = await ServerConfigRepository.findAllWithMerchantsEnabled();
    for (const server of servers) {
      await this.postMerchantEmbed(server, merchant, saleDuration);
    }

    // Planifier la disparition du marchand
    setTimeout(() => {
      this.despawnMerchant(merchantId);
    }, saleDuration);

    // Planifier le prochain marchand
    this.scheduleNextMerchant();
  }

  private static async postMerchantEmbed(
    server: IServerConfig,
    merchant: IMerchantSession,
    saleDuration: number
  ): Promise<void> {
    const channel = await client.channels.fetch(server.channels.anomalies) as TextChannel;
    if (!channel) return;

    const minutesLeft = Math.floor(saleDuration / 60000);
    const merchantInfo = MERCHANT_TYPES[merchant.merchantType];

    // Préparer les items (3 boutons max dans une row → 2 rows)
    const buttons = merchant.items.slice(0, 5).map(item =>
      new ButtonBuilder()
        .setCustomId(`merchant_buy_${merchant.id}_${item.itemId}`)
        .setLabel(`${item.emoji} ${item.name} (${this.STOCK_PER_ITEM} restants)`)
        .setStyle(ButtonStyle.Success)
    );

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let i = 0; i < buttons.length; i += 3) {
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 3)));
    }

    const itemsField = merchant.items.map(item =>
      `${item.emoji} **${item.name}** — ${item.price.toLocaleString()} ${item.currency} ×5 dispo`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xFFA726)
      .setTitle(`🛒 ${merchantInfo.name} est apparu !`)
      .setDescription(merchantInfo.flavor)
      .addFields({ name: '📦 Marchandises', value: itemsField })
      .setFooter({ text: `⏱️ Disparaît dans ${minutesLeft} minutes • Stock limité à 5 par item` })
      .setTimestamp();

    await channel.send({
      content: `@everyone 🛒 **Un marchand est apparu !** Vite avant qu'il parte !`,
      embeds: [embed],
      components: rows
    });
  }

  private static selectMerchantItems(): IMerchantItem[] {
    const allItems = MERCHANT_ITEM_POOL;
    const shuffled = allItems.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3 + Math.floor(Math.random() * 3)); // 3 à 5 items
  }

  private static selectMerchantType(): string {
    const types = Object.keys(MERCHANT_TYPES);
    return types[Math.floor(Math.random() * types.length)];
  }

  static async handlePurchase(
    userId: string,
    merchantId: string,
    itemId: string
  ): Promise<{ success: boolean; message: string }> {

    const merchantData = await redis.get(`active:${merchantId}`);
    if (!merchantData) return { success: false, message: '❌ Ce marchand est déjà parti !' };

    const merchant: IMerchantSession = JSON.parse(merchantData);
    const item = merchant.items.find(i => i.itemId === itemId);
    if (!item) return { success: false, message: '❌ Item introuvable.' };

    // Vérification et déduction atomique du stock (Redis)
    const stockKey = `merchant:stock:${merchantId}:${itemId}`;
    await redis.set(stockKey, String(item.remaining), 'NX', 'EX', 3600); // Init si absent

    const remaining = await redis.decr(stockKey);
    if (remaining < 0) {
      await redis.incr(stockKey); // Remettre à 0
      return { success: false, message: '❌ Rupture de stock !' };
    }

    // Vérifier les ressources du joueur
    const user = await UserRepository.findByDiscordId(userId);
    if (!user) return { success: false, message: '❌ Compte introuvable.' };

    const hasEnough = item.currency === 'Mora' ? user.mora >= item.price : user.primogems >= item.price;
    if (!hasEnough) {
      await redis.incr(stockKey); // Rembourser le stock
      return { success: false, message: `❌ Pas assez de ${item.currency} !` };
    }

    // Transaction
    if (item.currency === 'Mora') {
      await UserRepository.deductMora(userId, item.price);
    } else {
      await UserRepository.deductPrimogems(userId, item.price);
    }

    await InventoryRepository.addItem(userId, itemId, 1);

    return { success: true, message: `✅ Acheté : ${item.emoji} **${item.name}** !` };
  }
}

// Données des marchands
const MERCHANT_TYPES: Record<string, { name: string; flavor: string }> = {
  mondstadt_zhu:  { name: 'Paimon Version Marchande', flavor: '"Euh... Paimon est SÛREMENT pas un marchand ambulant. Pas du tout !"' },
  liyue_street:   { name: 'Marchand de Liyue',        flavor: '"Les marchandises de l\'Adepte Rex Lapis sont les meilleures de Teyvat, je vous l\'assure !"' },
  inazuma_ronin:  { name: 'Forgeron Itinérant',        flavor: '"Je vends ce que j\'ai forgé. Pas d\'arnaques. Que des lames."' },
  sumeru_scholar:  { name: 'Érudit de Sumeru',          flavor: '"La connaissance a un prix. Heureusement, ces artefacts aussi."' },
};

const MERCHANT_ITEM_POOL: IMerchantItem[] = [
  { itemId: 'prototype_archaic', name: 'Prototype Archaïque', emoji: '🗡️', price: 10000, currency: 'Mora' },
  { itemId: 'primogems_40', name: 'Primogens ×40', emoji: '💎', price: 8, currency: 'Lueurs Stellaires' },
  { itemId: 'talent_book_freedom', name: 'Guides de la Liberté ×3', emoji: '📚', price: 22500, currency: 'Mora' },
  { itemId: 'mystic_ore', name: 'Minerai Mystique ×5', emoji: '⛏️', price: 50000, currency: 'Mora' },
  { itemId: 'fragolite', name: 'Fragolite Bleue ×1', emoji: '🔷', price: 12, currency: 'Lueurs Stellaires' },
  { itemId: 'artifact_random_5star', name: 'Artefact Aléatoire ★★★★★', emoji: '💍', price: 4, currency: 'Lueurs Stellaires' },
  { itemId: 'mora_pouch_100k', name: 'Sac de Mora ×100,000', emoji: '💰', price: 6, currency: 'Lueurs Stellaires' },
];
```

---

## 5. INVASIONS DE L'ABÎME

### 5.1 Système de boss collectif

```typescript
// src/modules/events/handlers/AbyssInvasionEvent.ts

export class AbyssInvasionEvent {

  // Se déclenche une fois par semaine (WeeklyResetJob)
  static async startInvasion(servers: IServerConfig[]): Promise<void> {
    const invasionId = `invasion:${Date.now()}`;
    const invasionDuration = 2 * 60 * 60 * 1000; // 2h

    // HP total basé sur le nombre de joueurs actifs
    const activePlayerCount = await UserRepository.countActiveLast7Days();
    const totalHp = Math.max(10000, activePlayerCount * 1500);

    const invasion: IAbyssInvasion = {
      id: invasionId,
      totalHp,
      currentHp: totalHp,
      endsAt: Date.now() + invasionDuration,
      participants: {},
      phase: 1,
      bossName: this.selectRandomBoss(),
      messageIds: {} // messageId par serveur
    };

    await redis.setex(invasionId, Math.floor(invasionDuration / 1000) + 300, JSON.stringify(invasion));
    await redis.set('invasion:active', invasionId); // Clé courante

    for (const server of servers) {
      await this.postInvasionEmbed(server, invasion, invasionId);
    }

    // Auto-résolution à la fin du temps
    setTimeout(() => {
      this.resolveInvasion(invasionId, 'timeout').catch(logger.error);
    }, invasionDuration);

    // Mise à jour périodique de l'embed (toutes les 30s)
    const updateInterval = setInterval(async () => {
      const current = await this.getInvasion(invasionId);
      if (!current || current.currentHp <= 0) {
        clearInterval(updateInterval);
        return;
      }
      await this.updateInvasionEmbeds(current, servers);
    }, 30_000);
  }

  static async handleAttack(userId: string, username: string): Promise<IAttackResult> {
    const invasionId = await redis.get('invasion:active');
    if (!invasionId) return { success: false, message: '❌ Aucune invasion en cours.' };

    const invasion = await this.getInvasion(invasionId);
    if (!invasion) return { success: false, message: '❌ Invasion introuvable.' };
    if (invasion.currentHp <= 0) return { success: false, message: '✅ L\'invasion est déjà vaincue !' };

    // Cooldown : une attaque toutes les 5 minutes par joueur
    const cooldownKey = `invasion:cooldown:${invasionId}:${userId}`;
    const onCooldown = await redis.exists(cooldownKey);
    if (onCooldown) {
      const ttl = await redis.ttl(cooldownKey);
      return { success: false, message: `⏱️ Attaque disponible dans ${Math.floor(ttl / 60)}m ${ttl % 60}s` };
    }

    // Calculer les dégâts basés sur les stats du joueur
    const user = await UserRepository.findByDiscordId(userId);
    if (!user) return { success: false, message: '❌ Compte introuvable.' };

    const teamPower = await CharacterRepository.calculateTeamPower(userId);
    const baseDmg = Math.floor(teamPower * (0.5 + Math.random()) * 100);
    const isCrit = Math.random() < 0.2;
    const damage = isCrit ? Math.floor(baseDmg * 1.8) : baseDmg;

    // Appliquer les dégâts (atomique)
    const newHp = await this.applyDamageAtomic(invasionId, damage);

    // Enregistrer la contribution
    if (!invasion.participants[userId]) invasion.participants[userId] = 0;
    invasion.participants[userId] += damage;

    // Cooldown 5 minutes
    await redis.setex(cooldownKey, 300, '1');

    // Sauvegarder
    invasion.currentHp = Math.max(0, newHp);
    await redis.setex(invasionId, 7200, JSON.stringify(invasion));

    // Vérifier victoire
    if (newHp <= 0) {
      await this.resolveInvasion(invasionId, 'victory');
    }

    return {
      success: true,
      damage,
      isCrit,
      message: `⚔️ ${isCrit ? '**CRITIQUE !** ' : ''}Tu as infligé **${damage.toLocaleString()} dégâts** !`,
      remainingHp: Math.max(0, newHp)
    };
  }

  private static async applyDamageAtomic(invasionId: string, damage: number): Promise<number> {
    // Utiliser Lua script pour l'atomicité (évite les race conditions)
    const luaScript = `
      local current = tonumber(redis.call('GET', KEYS[1]) or '0')
      local newHp = math.max(0, current - tonumber(ARGV[1]))
      redis.call('SET', KEYS[1], tostring(newHp))
      return newHp
    `;
    const hpKey = `invasion:hp:${invasionId}`;

    // Init si première attaque
    const existing = await redis.get(hpKey);
    if (!existing) {
      const invasion = await this.getInvasion(invasionId);
      await redis.setex(hpKey, 7200, String(invasion?.currentHp || 0));
    }

    return await redis.eval(luaScript, 1, hpKey, String(damage)) as number;
  }

  static async postInvasionEmbed(server: IServerConfig, invasion: IAbyssInvasion, invasionId: string): Promise<void> {
    const channel = await client.channels.fetch(server.channels.invasions) as TextChannel;
    if (!channel) return;

    const embed = this.buildInvasionEmbed(invasion);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`invasion_attack_${invasionId}`)
        .setLabel('⚔️ Attaquer !')
        .setStyle(ButtonStyle.Danger)
    );

    const message = await channel.send({
      content: `🌑 @everyone **UNE INVASION DE L'ABÎME COMMENCE !** Vous avez **2 heures** pour repousser **${invasion.bossName}** !`,
      embeds: [embed],
      components: [row]
    });

    invasion.messageIds[server.guildId] = message.id;
  }

  static buildInvasionEmbed(invasion: IAbyssInvasion): EmbedBuilder {
    const hpPercent = (invasion.currentHp / invasion.totalHp) * 100;
    const bar = '█'.repeat(Math.round(hpPercent / 5)) + '░'.repeat(20 - Math.round(hpPercent / 5));

    const participants = Object.keys(invasion.participants).length;
    const topContrib = Object.entries(invasion.participants)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([userId, dmg], i) => `${['🥇','🥈','🥉'][i]} <@${userId}> — ${dmg.toLocaleString()} DMG`)
      .join('\n') || 'Aucun participant encore';

    const timeLeft = Math.max(0, invasion.endsAt - Date.now());
    const minutesLeft = Math.floor(timeLeft / 60000);
    const color = hpPercent > 50 ? 0x8B0000 : hpPercent > 20 ? 0xFF6600 : 0xFF0000;

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(`🌑 INVASION DE L'ABÎME — ${invasion.bossName}`)
      .setDescription('L\'obscurité envahit Teyvat. Chaque Voyageur doit contribuer à repousser la menace !')
      .addFields(
        { name: `HP ${bar} ${hpPercent.toFixed(1)}%`, value: `${invasion.currentHp.toLocaleString()} / ${invasion.totalHp.toLocaleString()}`, inline: false },
        { name: '👥 Participants', value: String(participants), inline: true },
        { name: '⏱️ Temps Restant', value: `${minutesLeft} minutes`, inline: true },
        { name: '🏆 Top Contributeurs', value: topContrib, inline: false }
      )
      .setFooter({ text: 'Cooldown : 1 attaque toutes les 5 minutes' });
  }

  private static async resolveInvasion(invasionId: string, outcome: 'victory' | 'timeout'): Promise<void> {
    const invasion = await this.getInvasion(invasionId);
    if (!invasion) return;

    await redis.del('invasion:active');
    await redis.del(invasionId);

    const servers = await ServerConfigRepository.findAllWithInvasionsEnabled();

    if (outcome === 'victory') {
      // Récompenser tous les participants
      for (const [userId, damage] of Object.entries(invasion.participants)) {
        const contribution = damage / invasion.totalHp;
        const rewardTier = contribution > 0.1 ? 'high' : contribution > 0.03 ? 'mid' : 'low';
        await EconomyService.giveInvasionReward(userId, rewardTier);
      }
    }

    // Poster le résultat dans tous les serveurs
    for (const server of servers) {
      const channel = await client.channels.fetch(server.channels.invasions) as TextChannel;
      if (!channel) continue;

      const embed = new EmbedBuilder()
        .setColor(outcome === 'victory' ? 0x00FF00 : 0xFF0000)
        .setTitle(outcome === 'victory' ? `✅ INVASION REPOUSSÉE !` : `❌ DÉFAITE — L'Abîme a gagné`)
        .setDescription(outcome === 'victory'
          ? `**${invasion.bossName}** a été vaincu par la communauté ! ${Object.keys(invasion.participants).length} Voyageurs ont participé.`
          : `Le temps a manqué. **${invasion.bossName}** se retire... pour l'instant.`
        );

      await channel.send({ embeds: [embed] });

      // Mettre à jour le message avec les boutons désactivés
      const messageId = invasion.messageIds[server.guildId];
      if (messageId) {
        const msg = await channel.messages.fetch(messageId).catch(() => null);
        await msg?.edit({ components: [] });
      }
    }
  }

  private static selectRandomBoss(): string {
    const bosses = ['Signora la Méchante', 'Le Childe du Port', 'L\'Azhdaha Dormant', 'Dvalin Enragé', 'La Shogun Corrompue'];
    return bosses[Math.floor(Math.random() * bosses.length)];
  }

  private static async getInvasion(invasionId: string): Promise<IAbyssInvasion | null> {
    const data = await redis.get(invasionId);
    return data ? JSON.parse(data) : null;
  }
}
```

---

## 6. ANOMALIES ÉLÉMENTAIRES (CRISTAUX À CLIQUER)

```typescript
// src/jobs/ElementalAnomalyJob.ts

export class ElementalAnomalyJob {
  // Spawn toutes les 2-5h
  static async spawnAnomaly(): Promise<void> {
    const anomalyId = `anomaly:${Date.now()}`;
    const duration = 30 * 60 * 1000; // 30 minutes pour réclamer

    const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)] as ElementType;
    const isLegendary = Math.random() < 0.05; // 5% de chance légendaire

    const anomaly: IElementalAnomaly = {
      id: anomalyId,
      element,
      isLegendary,
      maxClaimers: isLegendary ? 5 : 1,
      claimed: [],
      endsAt: Date.now() + duration,
      rewards: this.generateRewards(element, isLegendary)
    };

    await redis.setex(anomalyId, Math.floor(duration / 1000) + 60, JSON.stringify(anomaly));
    await redis.set('anomaly:active', anomalyId);

    const servers = await ServerConfigRepository.findAllWithAnomaliesEnabled();
    for (const server of servers) {
      await this.postAnomalyEmbed(server, anomaly, anomalyId);
    }

    setTimeout(() => {
      this.expireAnomaly(anomalyId);
      this.scheduleNextAnomaly();
    }, duration);
  }

  static async handleClaim(userId: string, anomalyId: string): Promise<IClaimResult> {
    const data = await redis.get(anomalyId);
    if (!data) return { success: false, message: '❌ Cette anomalie a disparu.' };

    const anomaly: IElementalAnomaly = JSON.parse(data);

    if (anomaly.claimed.includes(userId)) return { success: false, message: '❌ Tu as déjà réclamé ce cristal.' };
    if (anomaly.claimed.length >= anomaly.maxClaimers) return { success: false, message: '❌ Déjà réclamé par d\'autres Voyageurs !' };

    anomaly.claimed.push(userId);
    await redis.setex(anomalyId, Math.floor((anomaly.endsAt - Date.now()) / 1000), JSON.stringify(anomaly));

    await EconomyService.applyRewards(userId, anomaly.rewards);

    const rewardText = anomaly.rewards.drops.map(d => `${d.quantity}× ${ITEM_NAMES[d.itemId]}`).join(', ');
    return {
      success: true,
      message: `${ELEMENT_EMOJIS[anomaly.element]} Cristal ${anomaly.isLegendary ? '⭐ LÉGENDAIRE ' : ''}réclamé ! Récompenses : ${rewardText}`
    };
  }

  private static generateRewards(element: ElementType, isLegendary: boolean): ICombatReward {
    const base = { mora: isLegendary ? 20000 : 5000, adventureXP: isLegendary ? 200 : 50, characterXP: 0, drops: [] };
    if (isLegendary) {
      base.drops.push({ itemId: 'primogems_30', quantity: 30 });
    } else {
      base.drops.push({ itemId: 'primogems_10', quantity: 10 });
    }
    return base;
  }

  private static scheduleNextAnomaly(): void {
    const delay = 2 * 60 * 60 * 1000 + Math.random() * 3 * 60 * 60 * 1000; // 2-5h
    setTimeout(() => this.spawnAnomaly().catch(logger.error), delay);
  }
}
```

---

## 7. INTÉGRATION — INITIALISATION GLOBALE

```typescript
// src/core/Bootstrap.ts — dans la fonction start()

async function startLivingWorld(): Promise<void> {
  // 1. Archiviste
  const archivistWebhook = process.env.ARCHIVIST_WEBHOOK_URL;
  if (archivistWebhook) {
    await archivistService.initialize(archivistWebhook);
    logger.info('✅ Archiviste initialisé');
  }

  // 2. Météo — vérifier si déjà sélectionnée aujourd'hui
  const existingWeather = await redis.get('weather:today');
  if (!existingWeather) {
    await DailyResetJob.selectAndPostWeather();
  }

  // 3. Marchands itinérants
  await WanderingMerchantJob.initialize();
  logger.info('✅ Marchands itinérants activés');

  // 4. Anomalies élémentaires
  await ElementalAnomalyJob.initialize();
  logger.info('✅ Anomalies élémentaires activées');

  // 5. Invasions (géré par WeeklyResetJob)
  logger.info('✅ Monde Vivant initialisé');
}
```
