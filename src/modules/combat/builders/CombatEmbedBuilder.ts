import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import type { ICombatSession, ICombatReward } from '../types/combat.types.js';
import { ELEMENT_EMOJIS } from '../../../builders/IrminsulEmbed.js';
import type { IBossBase } from '../../../services/CombatEngine.js';

const STATUS_EMOJIS: Record<string, string> = {
  freeze: '❄️', burn: '🔥', wet: '💧', superconduct: '⚡', crystallize: '💎'
};

export class CombatEmbedBuilder {

  static buildMainEmbed(session: ICombatSession, boss: IBossBase): EmbedBuilder {
    const hpPercent = (session.bossCurrentHp / session.bossMaxHp) * 100;
    const hpBar = this.generateBar(hpPercent, 20, '█', '░');

    const color = hpPercent > 60 ? 0x00AA00 : hpPercent > 30 ? 0xFFAA00 : 0xFF0000;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`⚔️ ${boss.name} — Phase ${session.bossPhase}`)
      .setThumbnail(boss.spriteUrl || '');

    embed.addFields({
      name: `HP Boss ${hpBar} ${hpPercent.toFixed(1)}%`,
      value: `${session.bossCurrentHp.toLocaleString()} / ${session.bossMaxHp.toLocaleString()}`,
      inline: false
    });

    if (session.bossElementStatus) {
      embed.addFields({
        name: 'Statut Élémentaire',
        value: `${ELEMENT_EMOJIS[session.bossElementStatus as keyof typeof ELEMENT_EMOJIS] || '⚪'} ${session.bossElementStatus}`,
        inline: true
      });
    }

    if (session.bossDebuffs.length > 0) {
      const debuffStr = session.bossDebuffs
        .map(d => `${STATUS_EMOJIS[d.type]} ${d.type} (${d.turnsRemaining} tours)`)
        .join('\n');
      embed.addFields({ name: 'Debuffs', value: debuffStr, inline: true });
    }

    embed.addFields({ name: '\u200B', value: '──────────────────────', inline: false });

    session.team.forEach((char, index) => {
      const isActive = index === session.activeCharacterIndex;
      const hpPct = (char.currentHp / char.maxHp) * 100;
      const charHpBar = this.generateBar(hpPct, 8);
      const prefix = isActive ? '▶ ' : '  ';
      const statusIcon = char.currentHp <= 0 ? '💀' : isActive ? ELEMENT_EMOJIS[char.element as keyof typeof ELEMENT_EMOJIS] || '⚪' : '⚪';

      embed.addFields({
        name: `${prefix}${statusIcon} ${char.name}`,
        value: `${charHpBar} ${hpPct.toFixed(0)}%\n${char.currentHp.toLocaleString()}/${char.maxHp.toLocaleString()} HP`,
        inline: true
      });
    });

    const energyBar = this.generateBar(session.burstEnergy, 10, '⚡', '○');
    embed.addFields({
      name: '\u200B',
      value: `Burst: ${energyBar} ${session.burstEnergy}/100`,
      inline: false
    });

    if (session.lastTurnLog.length > 0) {
      const logText = session.lastTurnLog
        .map(entry => {
          if (entry.actor === 'player') {
            const critStr = entry.isCrit ? ' **CRITIQUE !**' : '';
            const reactionStr = entry.reaction ? ` → ${entry.reaction}` : '';
            return `📗 ${entry.action}${entry.damage ? ` → **${entry.damage.toLocaleString()} DMG**${critStr}${reactionStr}` : ''}`;
          } else {
            return `📕 👹 ${entry.action}${entry.damage ? ` → **-${entry.damage.toLocaleString()} HP**` : ''}`;
          }
        })
        .join('\n');

      embed.addFields({ name: `Tour ${session.turn - 1} — Résumé`, value: logText, inline: false });
    }

    embed.setFooter({ text: `Tour ${session.turn} • Cooldown Skill: ${session.skillCooldown} tours` });

    return embed;
  }

  static buildActionRow(session: ICombatSession): ActionRowBuilder<ButtonBuilder> {
    const activeChar = session.team[session.activeCharacterIndex];

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`combat_normal_${session.sessionId}`)
        .setLabel('⚔️ Attaque')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`combat_skill_${session.sessionId}`)
        .setLabel(session.skillCooldown > 0 ? `🌟 Skill (${session.skillCooldown})` : '🌟 Skill')
        .setStyle(ButtonStyle.Success)
        .setDisabled(session.skillCooldown > 0),

      new ButtonBuilder()
        .setCustomId(`combat_burst_${session.sessionId}`)
        .setLabel(session.burstEnergy < 100 ? `💥 Burst (${session.burstEnergy}%)` : '💥 BURST!')
        .setStyle(session.burstEnergy >= 100 ? ButtonStyle.Danger : ButtonStyle.Secondary)
        .setDisabled(session.burstEnergy < 100 || session.burstCooldown > 0),

      new ButtonBuilder()
        .setCustomId(`combat_swap_${session.sessionId}`)
        .setLabel('🔄 Swap')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`combat_flee_${session.sessionId}`)
        .setLabel('🏃 Fuir')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  static buildSwapMenu(session: ICombatSession): ActionRowBuilder<StringSelectMenuBuilder> {
    const options = session.team
      .map((char, index) => {
        const isActive = index === session.activeCharacterIndex;
        const isDead = char.currentHp <= 0;
        return new StringSelectMenuOptionBuilder()
          .setLabel(`${char.name} (${Math.floor(char.currentHp / char.maxHp * 100)}% HP)`)
          .setValue(`${index}`)
          .setEmoji(ELEMENT_EMOJIS[char.element as keyof typeof ELEMENT_EMOJIS] || '⚪')
          .setDescription(isActive ? '▶ Personnage actif' : isDead ? '💀 K.O.' : 'Disponible')
          .setDefault(isActive);
      });

    const select = new StringSelectMenuBuilder()
      .setCustomId(`combat_swap_select_${session.sessionId}`)
      .setPlaceholder('Choisir le prochain personnage...')
      .setOptions(options);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  }

  static buildVictoryEmbed(session: ICombatSession, rewards: ICombatReward, boss: IBossBase): EmbedBuilder {
    const duration = Math.floor((Date.now() - session.startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    const rewardsText = [
      `💰 +${rewards.mora.toLocaleString()} Mora`,
      `📊 +${rewards.adventureXP} XP Aventurier`,
      ...rewards.drops.map(d => `📦 ${d.quantity}× ${d.itemId}`)
    ].join('\n');

    return new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`✅ VICTOIRE — ${boss.name} vaincu !`)
      .setDescription(`Combat terminé en ${minutes}m ${seconds}s • ${session.turn} tours`)
      .addFields(
        { name: '🎁 Récompenses', value: rewardsText, inline: false }
      )
      .setFooter({ text: 'Le thread sera archivé dans 30 secondes.' });
  }

  private static generateBar(percent: number, length: number, fill = '█', empty = '░'): string {
    const filled = Math.max(0, Math.min(length, Math.round((percent / 100) * length)));
    return fill.repeat(filled) + empty.repeat(length - filled);
  }
}
