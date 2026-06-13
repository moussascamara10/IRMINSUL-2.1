import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { User } from '../database/models/index.js';
import { economyService } from '../services/EconomyService.js';
import { ELEMENT_COLORS, ELEMENT_EMOJIS } from '../builders/IrminsulEmbed.js';

interface ICrystal {
  id: string;
  element: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  poisoned: boolean;
  moraReward: number;
  primogenReward: number;
}

const CRYSTAL_TYPES: ICrystal[] = [
  { id: 'anemo_common', element: 'Anemo', rarity: 'common', poisoned: false, moraReward: 100, primogenReward: 0 },
  { id: 'anemo_rare', element: 'Anemo', rarity: 'rare', poisoned: false, moraReward: 500, primogenReward: 1 },
  { id: 'anemo_epic', element: 'Anemo', rarity: 'epic', poisoned: false, moraReward: 2000, primogenReward: 5 },
  { id: 'anemo_legendary', element: 'Anemo', rarity: 'legendary', poisoned: false, moraReward: 10000, primogenReward: 20 },
  { id: 'hydro_common', element: 'Hydro', rarity: 'common', poisoned: false, moraReward: 100, primogenReward: 0 },
  { id: 'hydro_rare', element: 'Hydro', rarity: 'rare', poisoned: false, moraReward: 500, primogenReward: 1 },
  { id: 'hydro_epic', element: 'Hydro', rarity: 'epic', poisoned: false, moraReward: 2000, primogenReward: 5 },
  { id: 'hydro_legendary', element: 'Hydro', rarity: 'legendary', poisoned: false, moraReward: 10000, primogenReward: 20 },
  { id: 'pyro_common', element: 'Pyro', rarity: 'common', poisoned: false, moraReward: 100, primogenReward: 0 },
  { id: 'pyro_rare', element: 'Pyro', rarity: 'rare', poisoned: false, moraReward: 500, primogenReward: 1 },
  { id: 'pyro_epic', element: 'Pyro', rarity: 'epic', poisoned: false, moraReward: 2000, primogenReward: 5 },
  { id: 'pyro_legendary', element: 'Pyro', rarity: 'legendary', poisoned: false, moraReward: 10000, primogenReward: 20 },
  { id: 'cryo_common', element: 'Cryo', rarity: 'common', poisoned: false, moraReward: 100, primogenReward: 0 },
  { id: 'cryo_rare', element: 'Cryo', rarity: 'rare', poisoned: false, moraReward: 500, primogenReward: 1 },
  { id: 'cryo_epic', element: 'Cryo', rarity: 'epic', poisoned: false, moraReward: 2000, primogenReward: 5 },
  { id: 'cryo_legendary', element: 'Cryo', rarity: 'legendary', poisoned: false, moraReward: 10000, primogenReward: 20 },
  { id: 'electro_common', element: 'Electro', rarity: 'common', poisoned: false, moraReward: 100, primogenReward: 0 },
  { id: 'electro_rare', element: 'Electro', rarity: 'rare', poisoned: false, moraReward: 500, primogenReward: 1 },
  { id: 'electro_epic', element: 'Electro', rarity: 'epic', poisoned: false, moraReward: 2000, primogenReward: 5 },
  { id: 'electro_legendary', element: 'Electro', rarity: 'legendary', poisoned: false, moraReward: 10000, primogenReward: 20 },
  { id: 'geo_common', element: 'Geo', rarity: 'common', poisoned: false, moraReward: 100, primogenReward: 0 },
  { id: 'geo_rare', element: 'Geo', rarity: 'rare', poisoned: false, moraReward: 500, primogenReward: 1 },
  { id: 'geo_epic', element: 'Geo', rarity: 'epic', poisoned: false, moraReward: 2000, primogenReward: 5 },
  { id: 'geo_legendary', element: 'Geo', rarity: 'legendary', poisoned: false, moraReward: 10000, primogenReward: 20 },
  { id: 'poisoned_trap', element: 'Unknown', rarity: 'common', poisoned: true, moraReward: -1000, primogenReward: 0 }
];

const RARITY_CHANCES = {
  common: 0.6,
  rare: 0.3,
  epic: 0.08,
  legendary: 0.02
};

const POISONED_CHANCE = 0.05; // 5% de chance de cristal empoisonné

export class ElementalAnomalies {
  /**
   * Génère un cristal aléatoire
   */
  static generateCrystal(): ICrystal {
    const roll = Math.random();
    let rarity: 'common' | 'rare' | 'epic' | 'legendary';

    if (roll < RARITY_CHANCES.legendary) {
      rarity = 'legendary';
    } else if (roll < RARITY_CHANCES.legendary + RARITY_CHANCES.epic) {
      rarity = 'epic';
    } else if (roll < RARITY_CHANCES.legendary + RARITY_CHANCES.epic + RARITY_CHANCES.rare) {
      rarity = 'rare';
    } else {
      rarity = 'common';
    }

    // Vérifier si le cristal est empoisonné (humorous trap)
    const isPoisoned = Math.random() < POISONED_CHANCE;
    if (isPoisoned) {
      return CRYSTAL_TYPES.find(c => c.id === 'poisoned_trap')!;
    }

    // Filtrer les cristaux par rareté et exclure le piège empoisonné
    const filteredCrystals = CRYSTAL_TYPES.filter(
      c => c.rarity === rarity && !c.poisoned
    );
    const randomIndex = Math.floor(Math.random() * filteredCrystals.length);
    return filteredCrystals[randomIndex];
  }

  /**
   * Crée un embed pour afficher un cristal
   */
  static createCrystalEmbed(crystal: ICrystal): EmbedBuilder {
    const color = crystal.poisoned 
      ? 0x9B59B6 // Violet pour le piège
      : ELEMENT_COLORS[crystal.element as keyof typeof ELEMENT_COLORS] || 0xFFD700;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${ELEMENT_EMOJIS[crystal.element as keyof typeof ELEMENT_EMOJIS] || '💎'} Anomalie Élémentaire`)
      .setDescription(
        crystal.poisoned
          ? '⚠️ **Cristal Empoisonné!**\n\nCe cristal semble suspect... C\'est un piège!'
          : `**Cristal ${crystal.element} - ${crystal.rarity.toUpperCase()}**\n\n` +
            `💰 Récompense: ${crystal.moraReward} Mora` +
            (crystal.primogenReward > 0 ? `\n✨ Bonus: ${crystal.primogenReward} Primogènes` : '')
      )
      .setFooter({ text: crystal.poisoned ? 'Cliquez pour ramasser... si vous osez!' : 'Cliquez pour ramasser le cristal' })
      .setTimestamp();

    return embed;
  }

  /**
   * Traite le clic sur un cristal
   */
  static async handleCrystalClick(userId: string, crystal: ICrystal): Promise<{ success: boolean; message: string; moraChange: number; primogenChange: number }> {
    const user = await User.findOne({ discordId: userId });
    if (!user) {
      return { success: false, message: 'Utilisateur non trouvé', moraChange: 0, primogenChange: 0 };
    }

    if (crystal.poisoned) {
      // Piège empoisonné - pénalité humoristique
      await User.findOneAndUpdate(
        { discordId: userId },
        { $inc: { mora: crystal.moraReward } }
      );

      return {
        success: true,
        message: '💀 **OUCH!** Ce cristal était empoisonné!\n\nVous avez perdu 1000 Mora. La prochaine fois, faites attention aux cristaux qui brillent d\'une lumière suspecte...',
        moraChange: crystal.moraReward,
        primogenChange: 0
      };
    }

    // Récompense normale
    await User.findOneAndUpdate(
      { discordId: userId },
      {
        $inc: {
          mora: crystal.moraReward,
          primogens: crystal.primogenReward
        }
      }
    );

    return {
      success: true,
      message: `✨ **Cristal ${crystal.element} ramassé!**\n\n` +
        `💰 +${crystal.moraReward} Mora` +
        (crystal.primogenReward > 0 ? `\n✨ +${crystal.primogenReward} Primogènes` : ''),
      moraChange: crystal.moraReward,
      primogenChange: crystal.primogenReward
    };
  }

  /**
   * Crée les boutons d'action pour un cristal
   */
  static createCrystalButtons(crystalId: string): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`crystal_click_${crystalId}`)
          .setLabel('💎 Ramasser')
          .setStyle(ButtonStyle.Primary)
      );
  }

  /**
   * Spawne une anomalie élémentaire dans un canal
   */
  static async spawnAnomaly(channel: any): Promise<void> {
    const crystal = this.generateCrystal();
    const embed = this.createCrystalEmbed(crystal);
    const buttons = this.createCrystalButtons(crystal.id);

    const message = await channel.send({
      embeds: [embed],
      components: [buttons]
    });

    // Créer un collector pour le bouton
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000 // 1 minute pour cliquer
    });

    collector.on('collect', async (interaction: any) => {
      const userId = interaction.user.id;
      const result = await this.handleCrystalClick(userId, crystal);

      await interaction.update({
        content: result.message,
        embeds: [],
        components: []
      });

      collector.stop();
    });

    collector.on('end', async (collected: any) => {
      if (collected.size === 0) {
        await message.edit({
          content: '⏱️ Le cristal s\'est dissipé...',
          embeds: [],
          components: []
        });
      }
    });
  }
}

export const elementalAnomalies = ElementalAnomalies;
