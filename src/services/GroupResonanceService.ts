import { User, CharacterOwned } from '../database/models/index.js';
import { genshinDataService } from './GenshinDataService.js';
import { ELEMENT_COLORS, ELEMENT_EMOJIS } from '../builders/IrminsulEmbed.js';

interface IElementBuff {
  element: string;
  count: number;
  buff: {
    damageBonus: number;
    resistanceBonus: number;
    energyRechargeBonus: number;
  };
}

export class GroupResonanceService {
  /**
   * Analyse l'équipe active d'un utilisateur et calcule les buffs de résonance
   */
  static async calculateGroupResonance(userId: string): Promise<{
    resonanceActive: boolean;
    element?: string;
    buffs: IElementBuff[];
    totalDamageBonus: number;
    totalResistanceBonus: number;
    totalEnergyRechargeBonus: number;
  }> {
    const user = await User.findOne({ discordId: userId });
    if (!user || user.activeTeam.length === 0) {
      return {
        resonanceActive: false,
        buffs: [],
        totalDamageBonus: 0,
        totalResistanceBonus: 0,
        totalEnergyRechargeBonus: 0
      };
    }

    // Récupérer les personnages de l'équipe active
    const teamCharacters = await CharacterOwned.find({
      userId,
      characterId: { $in: user.activeTeam }
    });

    if (teamCharacters.length === 0) {
      return {
        resonanceActive: false,
        buffs: [],
        totalDamageBonus: 0,
        totalResistanceBonus: 0,
        totalEnergyRechargeBonus: 0
      };
    }

    // Compter les éléments dans l'équipe
    const elementCounts: { [element: string]: number } = {};
    for (const char of teamCharacters) {
      const charData = genshinDataService.getCharacter(char.characterName);
      if (charData) {
        const element = charData.element;
        elementCounts[element] = (elementCounts[element] || 0) + 1;
      }
    }

    // Calculer les buffs par élément
    const buffs: IElementBuff[] = [];
    let totalDamageBonus = 0;
    let totalResistanceBonus = 0;
    let totalEnergyRechargeBonus = 0;
    let resonanceActive = false;
    let resonanceElement: string | undefined;

    for (const [element, count] of Object.entries(elementCounts)) {
      const buff = this.calculateElementBuff(element, count);
      buffs.push(buff);
      
      totalDamageBonus += buff.buff.damageBonus;
      totalResistanceBonus += buff.buff.resistanceBonus;
      totalEnergyRechargeBonus += buff.buff.energyRechargeBonus;

      // Résonance active si 4 personnages du même élément
      if (count >= 4) {
        resonanceActive = true;
        resonanceElement = element;
      }
    }

    return {
      resonanceActive,
      element: resonanceElement,
      buffs,
      totalDamageBonus,
      totalResistanceBonus,
      totalEnergyRechargeBonus
    };
  }

  /**
   * Calcule les buffs pour un élément donné
   */
  private static calculateElementBuff(element: string, count: number): IElementBuff {
    const baseBuff = {
      damageBonus: 0,
      resistanceBonus: 0,
      energyRechargeBonus: 0
    };

    // Buffs par nombre de personnages du même élément
    switch (count) {
      case 2:
        baseBuff.damageBonus = 0.05; // +5% dégâts
        baseBuff.resistanceBonus = 0.05; // +5% résistance
        break;
      case 3:
        baseBuff.damageBonus = 0.10; // +10% dégâts
        baseBuff.resistanceBonus = 0.10; // +10% résistance
        baseBuff.energyRechargeBonus = 0.10; // +10% recharge d'énergie
        break;
      case 4:
        baseBuff.damageBonus = 0.20; // +20% dégâts
        baseBuff.resistanceBonus = 0.20; // +20% résistance
        baseBuff.energyRechargeBonus = 0.20; // +20% recharge d'énergie
        break;
    }

    // Bonus spécifiques par élément
    switch (element) {
      case 'Pyro':
        baseBuff.damageBonus += count >= 2 ? 0.05 : 0; // +5% dégâts Pyro supplémentaires
        break;
      case 'Hydro':
        baseBuff.resistanceBonus += count >= 2 ? 0.05 : 0; // +5% résistance Hydro supplémentaire
        break;
      case 'Cryo':
        baseBuff.damageBonus += count >= 2 ? 0.05 : 0; // +5% dégâts Cryo supplémentaires
        break;
      case 'Electro':
        baseBuff.energyRechargeBonus += count >= 2 ? 0.05 : 0; // +5% recharge d'énergie supplémentaire
        break;
      case 'Anemo':
        baseBuff.damageBonus += count >= 2 ? 0.05 : 0; // +5% dégâts Anemo supplémentaires
        break;
      case 'Geo':
        baseBuff.resistanceBonus += count >= 2 ? 0.05 : 0; // +5% résistance Geo supplémentaire
        break;
    }

    return {
      element,
      count,
      buff: baseBuff
    };
  }

  /**
   * Crée un embed affichant la résonance de groupe
   */
  static createResonanceEmbed(userId: string, resonanceData: any): any {
    const { EmbedBuilder } = require('discord.js');
    
    const embed = new EmbedBuilder()
      .setTitle('🔮 Résonance de Groupe')
      .setColor(resonanceData.resonanceActive ? 0xFFD700 : 0x808080)
      .setDescription(
        resonanceData.resonanceActive
          ? `✨ **Résonance ${resonanceData.element} Active!**\n\nVotre équipe bénéficie d'une synergie élémentaire puissante.`
          : '⚠️ Aucune résonance active\n\nAssemblez 4 personnages du même élément pour activer une résonance.'
      )
      .addFields(
        { name: '💥 Bonus Dégâts', value: `+${(resonanceData.totalDamageBonus * 100).toFixed(0)}%`, inline: true },
        { name: '🛡️ Bonus Résistance', value: `+${(resonanceData.totalResistanceBonus * 100).toFixed(0)}%`, inline: true },
        { name: '⚡ Bonus Recharge Énergie', value: `+${(resonanceData.totalEnergyRechargeBonus * 100).toFixed(0)}%`, inline: true }
      )
      .setTimestamp();

    // Ajouter les détails par élément
    if (resonanceData.buffs.length > 0) {
      const elementDetails = resonanceData.buffs
        .map((b: IElementBuff) => {
          const emoji = ELEMENT_EMOJIS[b.element as keyof typeof ELEMENT_EMOJIS] || '💎';
          return `${emoji} ${b.element} (${b.count}): +${(b.buff.damageBonus * 100).toFixed(0)}% dégâts`;
        })
        .join('\n');
      
      embed.addFields({
        name: '📊 Détails par Élément',
        value: elementDetails,
        inline: false
      });
    }

    return embed;
  }

  /**
   * Analyse les équipes actives de tous les utilisateurs du serveur
   */
  static async analyzeServerResonance(guildId: string): Promise<{
    totalUsers: number;
    resonanceActive: number;
    mostPopularElement: string;
    elementDistribution: { [element: string]: number };
  }> {
    const users = await User.find({ guildId });
    const elementDistribution: { [element: string]: number } = {};
    let resonanceActive = 0;

    for (const user of users) {
      const resonance = await this.calculateGroupResonance(user.discordId);
      if (resonance.resonanceActive) {
        resonanceActive++;
        if (resonance.element) {
          elementDistribution[resonance.element] = (elementDistribution[resonance.element] || 0) + 1;
        }
      }
    }

    // Trouver l'élément le plus populaire
    let mostPopularElement = 'Aucun';
    let maxCount = 0;
    for (const [element, count] of Object.entries(elementDistribution)) {
      if (count > maxCount) {
        maxCount = count;
        mostPopularElement = element;
      }
    }

    return {
      totalUsers: users.length,
      resonanceActive,
      mostPopularElement,
      elementDistribution
    };
  }
}

export const groupResonanceService = GroupResonanceService;
