import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import { ELEMENT_EMOJIS } from '../builders/IrminsulEmbed.js';

interface IAbyssInvasion {
  invasionId: string;
  guildId: string;
  channelId: string;
  messageId: string;
  bossId: string;
  bossName: string;
  bossElement: string;
  bossMaxHp: number;
  bossCurrentHp: number;
  startTime: number;
  endTime: number;
  participantCount: number;
  totalDamage: number;
}

interface IParticipantDamage {
  userId: string;
  username: string;
  damage: number;
  timestamp: number;
}

// Mock Redis (à remplacer par vrai Redis)
const redis = {
  async setex(key: string, ttl: number, value: string): Promise<void> {
    // TODO: Implémenter vrai Redis
  },
  async get(key: string): Promise<string | null> {
    // TODO: Implémenter vrai Redis
    return null;
  },
  async incr(key: string): Promise<number> {
    // TODO: Implémenter vrai Redis
    return 0;
  },
  async expire(key: string, ttl: number): Promise<void> {
    // TODO: Implémenter vrai Redis
  },
  async del(key: string): Promise<void> {
    // TODO: Implémenter vrai Redis
  }
};

// Mock repositories (à remplacer par vrais repositories)
const ServerConfigRepository = {
  async findAllWithInvasionEnabled(): Promise<any[]> {
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

const ABYSS_BOSSES = [
  { id: 'childe', name: 'Tartaglia', element: 'Hydro', baseHp: 5000000 },
  { id: 'la_signora', name: 'La Signora', element: 'Cryo', baseHp: 6000000 },
  { id: 'scaramouche', name: 'Scaramouche', element: 'Electro', baseHp: 5500000 },
  { id: 'dottore', name: 'Il Dottore', element: 'Pyro', baseHp: 6500000 },
  { id: 'pierro', name: 'Il Capitano', element: 'Cryo', baseHp: 7000000 }
];

export class AbyssInvasionEvent {

  static async startInvasion(): Promise<void> {
    console.log('🌑 Tentative de démarrage d\'Invasion de l\'Abîme...');

    // 20% de chance d'invasion
    if (Math.random() > 0.2) {
      console.log('⏭️ Pas d\'invasion cette fois');
      return;
    }

    const servers = await ServerConfigRepository.findAllWithInvasionEnabled();
    if (servers.length === 0) return;

    // Sélectionner un serveur aléatoire
    const server = servers[Math.floor(Math.random() * servers.length)];

    // Sélectionner un boss aléatoire
    const boss = ABYSS_BOSSES[Math.floor(Math.random() * ABYSS_BOSSES.length)];

    const invasionId = `invasion:${server.guildId}:${Date.now()}`;
    const duration = 2 * 60 * 60 * 1000; // 2 heures

    const invasion: IAbyssInvasion = {
      invasionId,
      guildId: server.guildId,
      channelId: server.channels.invasion,
      messageId: '',
      bossId: boss.id,
      bossName: boss.name,
      bossElement: boss.element,
      bossMaxHp: boss.baseHp,
      bossCurrentHp: boss.baseHp,
      startTime: Date.now(),
      endTime: Date.now() + duration,
      participantCount: 0,
      totalDamage: 0
    };

    // Poster l'embed
    const channel = await client.channels.fetch(server.channels.invasion) as TextChannel;
    if (!channel) return;

    const message = await channel.send({
      embeds: [this.buildInvasionEmbed(invasion)],
      components: [this.buildInvasionActionRow(invasion)]
    });

    invasion.messageId = message.id;

    await redis.setex(invasionId, duration / 1000, JSON.stringify(invasion));

    console.log(`✅ Invasion démarrée sur ${server.guildId} — Boss: ${boss.name}`);
  }

  static async attackBoss(invasionId: string, userId: string, username: string, damage: number): Promise<{ success: boolean; message: string }> {
    const data = await redis.get(invasionId);
    if (!data) return { success: false, message: 'L\'invasion est terminée !' };

    const invasion: IAbyssInvasion = JSON.parse(data);

    if (Date.now() > invasion.endTime) {
      return { success: false, message: 'L\'invasion est terminée !' };
    }

    // Cooldown de 30 secondes par utilisateur
    const cooldownKey = `invasion_cd:${invasionId}:${userId}`;
    const cooldown = await redis.get(cooldownKey);
    if (cooldown) {
      return { success: false, message: 'Attendez 30 secondes avant d\'attaquer à nouveau !' };
    }

    // Appliquer les dégâts
    invasion.bossCurrentHp = Math.max(0, invasion.bossCurrentHp - damage);
    invasion.totalDamage += damage;
    invasion.participantCount = await redis.incr(`invasion_participants:${invasionId}`);
    await redis.expire(`invasion_participants:${invasionId}`, 7200);

    // Enregistrer la participation
    const participantKey = `invasion_damage:${invasionId}:${userId}`;
    const participantData: IParticipantDamage = {
      userId,
      username,
      damage,
      timestamp: Date.now()
    };
    await redis.setex(participantKey, 7200, JSON.stringify(participantData));

    // Cooldown
    await redis.setex(cooldownKey, 30, '1');

    // Mettre à jour Redis
    await redis.setex(invasionId, Math.floor((invasion.endTime - Date.now()) / 1000), JSON.stringify(invasion));

    // Mettre à jour l'embed
    await this.updateInvasionEmbed(invasion);

    // Vérifier si le boss est vaincu
    if (invasion.bossCurrentHp <= 0) {
      await this.endInvasion(invasion, 'victory');
      return { success: true, message: `BOSS VAINCU ! Vous avez infligé ${damage.toLocaleString()} dégâts !` };
    }

    return { success: true, message: `Attaque réussie ! ${damage.toLocaleString()} dégâts infligés.` };
  }

  private static buildInvasionEmbed(invasion: IAbyssInvasion): EmbedBuilder {
    const hpPercent = (invasion.bossCurrentHp / invasion.bossMaxHp) * 100;
    const hpBar = this.generateBar(hpPercent, 20);
    const timeLeft = Math.max(0, invasion.endTime - Date.now());
    const minutesLeft = Math.floor(timeLeft / (60 * 1000));

    const color = hpPercent > 60 ? 0x00AA00 : hpPercent > 30 ? 0xFFAA00 : 0xFF0000;

    return new EmbedBuilder()
      .setColor(color)
      .setTitle(`🌑 Invasion de l'Abîme — ${invasion.bossName}`)
      .setDescription('Un boss de l\'Abîme a envahi ce serveur ! Unissez vos forces pour le vaincre !')
      .addFields(
        {
          name: `HP Boss ${ELEMENT_EMOJIS[invasion.bossElement as keyof typeof ELEMENT_EMOJIS] || '⚪'}`,
          value: `${hpBar} ${hpPercent.toFixed(1)}%\n${invasion.bossCurrentHp.toLocaleString()} / ${invasion.bossMaxHp.toLocaleString()}`,
          inline: false
        },
        { name: '⚔️ Participants', value: `${invasion.participantCount} Voyageurs`, inline: true },
        { name: '💥 Dégâts totaux', value: invasion.totalDamage.toLocaleString(), inline: true },
        { name: '⏱️ Temps restant', value: `${minutesLeft} minutes`, inline: true }
      )
      .setFooter({ text: 'Attaquez pour contribuer à la victoire collective !' })
      .setTimestamp();
  }

  private static buildInvasionActionRow(invasion: IAbyssInvasion): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`invasion_attack_${invasion.invasionId}`)
        .setLabel('⚔️ Attaquer')
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId(`invasion_leaderboard_${invasion.invasionId}`)
        .setLabel('🏆 Classement')
        .setStyle(ButtonStyle.Primary)
    );
  }

  private static async updateInvasionEmbed(invasion: IAbyssInvasion): Promise<void> {
    const channel = await client.channels.fetch(invasion.channelId) as TextChannel;
    if (!channel) return;

    const message = await channel.messages.fetch(invasion.messageId);
    if (!message) return;

    await message.edit({
      embeds: [this.buildInvasionEmbed(invasion)],
      components: [this.buildInvasionActionRow(invasion)]
    });
  }

  private static async endInvasion(invasion: IAbyssInvasion, result: 'victory' | 'timeout'): Promise<void> {
    await redis.del(invasion.invasionId);

    const channel = await client.channels.fetch(invasion.channelId) as TextChannel;
    if (!channel) return;

    const message = await channel.messages.fetch(invasion.messageId);
    if (!message) return;

    const resultEmbed = new EmbedBuilder()
      .setColor(result === 'victory' ? 0xFFD700 : 0x555555)
      .setTitle(result === 'victory' ? '✅ VICTOIRE COLLECTIVE !' : '⏱️ TEMPS ÉCOULÉ')
      .setDescription(result === 'victory'
        ? `Le serveur a vaincu **${invasion.bossName}** !\n\n${invasion.participantCount} participants ont infligé ${invasion.totalDamage.toLocaleString()} dégâts.`
        : `Le temps est écoulé. **${invasion.bossName}** s'est échappé avec ${invasion.bossCurrentHp.toLocaleString()} HP restants.`)
      .setFooter({ text: 'L\'Abîme se retirera... pour revenir.' })
      .setTimestamp();

    await message.edit({
      embeds: [resultEmbed],
      components: []
    });

    // Distribuer les récompenses en cas de victoire
    if (result === 'victory') {
      await this.distributeRewards(invasion);
    }
  }

  private static async distributeRewards(invasion: IAbyssInvasion): Promise<void> {
    // TODO: Implémenter distribution des récompenses aux participants
    console.log(`🎁 Distribution des récompenses pour l'invasion ${invasion.invasionId}`);
  }

  private static generateBar(percent: number, length: number): string {
    const filled = Math.max(0, Math.min(length, Math.round((percent / 100) * length)));
    return '█'.repeat(filled) + '░'.repeat(length - filled);
  }
}

export async function getActiveInvasion(guildId: string): Promise<IAbyssInvasion | null> {
  // TODO: Implémenter récupération d'invasion active
  return null;
}
