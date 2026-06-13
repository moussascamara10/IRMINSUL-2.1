import { EmbedBuilder, TextChannel } from 'discord.js';
import { archivistService } from '../services/ArchivistService.js';
import { ELEMENT_EMOJIS } from '../builders/IrminsulEmbed.js';
import weatherEffects from '../data/weather-effects.json' with { type: 'json' };

interface IWeatherEffect {
  id: string;
  name: string;
  emoji: string;
  description: string;
  effects: {
    moraMultiplier?: number;
    primoOnLogin?: number;
    resinCostReduction?: number;
    expeditionSpeedup?: number;
    elementBonus?: { element: string; multiplier: number };
    softPityReduction?: number;
    commissionBonus?: number;
    dropRateBonus?: number;
  };
  rarity: string;
  weight: number;
}

interface IServerConfig {
  guildId: string;
  channels: {
    weather: string;
  };
}

// Mock Redis (à remplacer par vrai Redis)
const redis = {
  async setex(key: string, ttl: number, value: string): Promise<void> {
    // TODO: Implémenter vrai Redis
  },
  async get(key: string): Promise<string | null> {
    // TODO: Implémenter vrai Redis
    return null;
  }
};

// Mock repositories (à remplacer par vrais repositories)
const ServerConfigRepository = {
  async findAllWithWeatherEnabled(): Promise<IServerConfig[]> {
    // TODO: Implémenter vrai repository
    return [];
  }
};

// Mock client (à remplacer par vrai client Discord)
const client = {
  channels: {
    async fetch(id: string): Promise<TextChannel | null> {
      // TODO: Implémenter vrai client
      return null;
    }
  }
};

export class DailyResetJob {

  static async execute(): Promise<void> {
    console.log('⏰ Reset quotidien IRMINSUL...');

    // 1. Sélection de la météo du jour
    const weather = this.selectWeather();
    await redis.setex('weather:today', 86400, JSON.stringify(weather));

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

    console.log(`✅ Reset quotidien terminé — Météo: ${weather.name}`);
  }

  private static selectWeather(): IWeatherEffect {
    const totalWeight = weatherEffects.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;

    for (const effect of weatherEffects) {
      random -= effect.weight;
      if (random <= 0) return effect;
    }
    return weatherEffects[0];
  }

  private static async postWeatherEmbed(server: IServerConfig, weather: IWeatherEffect): Promise<void> {
    const channel = await client.channels.fetch(server.channels.weather) as TextChannel;
    if (!channel) return;

    const rarityColors: Record<string, number> = { common: 0x87CEEB, rare: 0xAB47BC, legendary: 0xFFD700 };
    const effects = weather.effects;

    const effectLines: string[] = [];
    if (effects.moraMultiplier) effectLines.push(`💰 Mora ×${effects.moraMultiplier} sur toutes les activités`);
    if (effects.primoOnLogin) effectLines.push(`💎 +${effects.primoOnLogin} Primogens offerts au /profil`);
    if (effects.resinCostReduction) effectLines.push(`🔷 -${effects.resinCostReduction * 100}% sur le coût de résine`);
    if (effects.expeditionSpeedup) effectLines.push(`🧭 Expéditions ${effects.expeditionSpeedup * 100}% plus rapides`);
    if (effects.elementBonus) effectLines.push(`${ELEMENT_EMOJIS[effects.elementBonus.element as keyof typeof ELEMENT_EMOJIS]} +${(effects.elementBonus.multiplier - 1) * 100}% dégâts ${effects.elementBonus.element}`);
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

  private static async resetDailyCommissions(): Promise<void> {
    // TODO: Implémenter reset des commissions
    console.log('📋 Reset des commissions...');
  }

  private static async resetDailyShop(): Promise<void> {
    // TODO: Implémenter reset du shop
    console.log('🛒 Reset du shop quotidien...');
  }
}

export async function getTodayWeather(): Promise<IWeatherEffect | null> {
  const data = await redis.get('weather:today');
  return data ? JSON.parse(data) : null;
}

export async function applyMoraReward(userId: string, baseMora: number): Promise<number> {
  const weather = await getTodayWeather();
  const multiplier = weather?.effects.moraMultiplier || 1.0;
  const finalMora = Math.floor(baseMora * multiplier);
  // TODO: Ajouter Mora à l'utilisateur
  return finalMora;
}
