import { EmbedBuilder } from 'discord.js';

// Couleurs élémentaires
export const ELEMENT_COLORS = {
  Pyro:    0xFF6B35,
  Hydro:   0x4DA6FF,
  Cryo:    0xB3E5FC,
  Electro: 0xAB47BC,
  Anemo:   0x66BB6A,
  Geo:     0xFFA726,
  Dendro:  0x8BC34A,
  Physique:0x90A4AE,
} as const;

export const ELEMENT_EMOJIS = {
  Pyro:    '🔥',
  Hydro:   '💧',
  Cryo:    '❄️',
  Electro: '⚡',
  Anemo:   '🌪️',
  Geo:     '⛰️',
  Dendro:  '🌿',
  Physique:'⚪',
} as const;

// Rareté
export const RARITY_COLORS = {
  5: 0xFFD700, // Or
  4: 0x9C27B0, // Violet
  3: 0x2196F3, // Bleu
} as const;

export const RARITY_STARS = {
  5: '★★★★★',
  4: '★★★★',
  3: '★★★',
} as const;

// Factory d'embeds réutilisables
export class IrminsulEmbedFactory {

  static profile(user: any, characters: any[]): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0xF5C842) // Or Irminsul
      .setAuthor({ name: '✦ IRMINSUL — Profil Voyageur' })
      .setTitle(`${user.displayName || user.username}`)
      .setThumbnail(`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`)
      .addFields(
        { name: '🗺️ Rang Aventurier', value: `AR ${user.adventureRank || 1} (WL${user.worldLevel || 0})`, inline: true },
        { name: '🔮 Résine', value: `${user.resin || 0}/200`, inline: true },
        { name: '💰 Mora', value: (user.mora || 0).toLocaleString(), inline: true }
      );

    if (user.title) {
      embed.setDescription(`*« ${user.title} »*`);
    }
    if (user.signature) {
      embed.setFooter({ text: user.signature });
    }

    return embed;
  }

  static wishResult(results: any[]): EmbedBuilder {
    const fiveStars = results.filter((r: any) => r.rarity === 5);
    const fourStars = results.filter((r: any) => r.rarity === 4);

    let description = '';
    results.forEach((result: any) => {
      const stars = RARITY_STARS[result.rarity as 3|4|5];
      const emoji = result.type === 'character'
        ? ELEMENT_EMOJIS[result.element as keyof typeof ELEMENT_EMOJIS]
        : '🗡️';
      const color = result.rarity === 5 ? '✨' : result.rarity === 4 ? '💜' : '🔵';
      description += `${color} ${emoji} **${result.name}** ${stars}\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle(fiveStars.length > 0 ? `✨ TIRAGE 5★ !` : '🌟 Résultats du Tirage')
      .setDescription(description)
      .setColor(fiveStars.length > 0 ? RARITY_COLORS[5] : RARITY_COLORS[4]);

    if (fiveStars.length > 0) {
      embed.setImage(fiveStars[0].imageUrl); // Image du 5★
    }

    return embed;
  }

  static bossIntro(boss: any, worldLevel: number): EmbedBuilder {
    const WORLD_LEVEL_HP_MULTIPLIERS: Record<number, number> = {
      0: 1.0, 1: 1.3, 2: 1.7, 3: 2.2, 4: 3.0, 5: 4.0, 6: 5.5, 7: 7.5, 8: 10.0
    };
    const hpAdjusted = Math.floor((boss.baseHp || 10000) * (WORLD_LEVEL_HP_MULTIPLIERS[worldLevel] || 1.0));

    return new EmbedBuilder()
      .setColor(ELEMENT_COLORS[boss.element as keyof typeof ELEMENT_COLORS] || 0x555555)
      .setTitle(`⚔️ ${boss.name}`)
      .setDescription(boss.lore || '')
      .setImage(boss.bannerImageUrl || '')
      .addFields(
        { name: 'HP', value: hpAdjusted.toLocaleString(), inline: true },
        { name: 'Élément', value: `${ELEMENT_EMOJIS[boss.element as keyof typeof ELEMENT_EMOJIS] || '⚪'} ${boss.element || 'Physique'}`, inline: true },
        { name: 'Résine', value: `${boss.resinCost || 40} 🔷`, inline: true },
        { name: 'Région', value: boss.region || 'Inconnue', inline: true }
      );
  }
}
