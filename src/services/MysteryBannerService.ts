import { Banner, User, GachaHistory } from '../database/models/index.js';
import { EmbedBuilder } from 'discord.js';
import { archivistService } from './ArchivistService.js';

export class MysteryBannerService {
  private static readonly REVEAL_PULLS = 10;

  /**
   * Vérifie si une bannière mystère doit être révélée après un pull
   */
  static async checkMysteryBannerReveal(userId: string, bannerId: string): Promise<{ shouldReveal: boolean; banner?: any }> {
    const banner = await Banner.findOne({ id: bannerId, type: 'mystery', isActive: true });
    if (!banner || banner.mysteryRevealed) {
      return { shouldReveal: false };
    }

    // Compter les pulls de l'utilisateur sur cette bannière
    const pullCount = await GachaHistory.countDocuments({
      userId,
      bannerId
    });

    if (pullCount >= this.REVEAL_PULLS) {
      return { shouldReveal: true, banner };
    }

    return { shouldReveal: false };
  }

  /**
   * Révèle le contenu d'une bannière mystère
   */
  static async revealMysteryBanner(bannerId: string): Promise<{ success: boolean; message: string; content?: any }> {
    const banner = await Banner.findOne({ id: bannerId, type: 'mystery' });
    if (!banner) {
      return { success: false, message: 'Bannière mystère non trouvée' };
    }

    if (banner.mysteryRevealed) {
      return { success: false, message: 'Cette bannière mystère a déjà été révélée' };
    }

    // Générer le contenu mystère aléatoire
    const mysteryContent = this.generateMysteryContent();
    
    // Mettre à jour la bannière
    await Banner.findOneAndUpdate(
      { id: bannerId },
      {
        $set: {
          mysteryRevealed: true,
          mysteryContent,
          updatedAt: new Date()
        }
      }
    );

    // Notifier l'Archiviste
    await archivistService.onServerMilestone('mystery_reveal', this.REVEAL_PULLS);

    return {
      success: true,
      message: `🎭 **Bannière Mystère Révélée!**\n\n` +
        `Après ${this.REVEAL_PULLS} vœux, le voile se lève...\n\n` +
        `**Type:** ${mysteryContent.type === 'character' ? 'Personnages' : 'Armes'}\n` +
        `**Contenu:** ${mysteryContent.items.join(', ')}`,
      content: mysteryContent
    };
  }

  /**
   * Génère le contenu d'une bannière mystère
   */
  private static generateMysteryContent(): { type: 'character' | 'weapon'; items: string[] } {
    const isCharacter = Math.random() < 0.7; // 70% de chance d'être une bannière de personnages
    
    if (isCharacter) {
      const characters = [
        'Zhongli', 'Raiden Shogun', 'Nahida', 'Furina', 'Arlecchino',
        'Kazuha', 'Ayaka', 'Hu Tao', 'Xiao', 'Ganyu'
      ];
      const shuffled = characters.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 3);
      
      return {
        type: 'character',
        items: selected
      };
    } else {
      const weapons = [
        'Skyward Harp', 'Skyward Blade', 'Skyward Pride', 'Skyward Spine', 'Skyward Atlas',
        'Aquila Favonia', 'Primordial Jade Cutter', 'Staff of Homa', 'Engulfing Lightning', 'Lost Prayer to the Sacred Winds'
      ];
      const shuffled = weapons.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 3);
      
      return {
        type: 'weapon',
        items: selected
      };
    }
  }

  /**
   * Crée un embed pour une bannière mystère
   */
  static createMysteryBannerEmbed(banner: any, pullsRemaining: number): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0x9B59B6) // Violet pour le mystère
      .setTitle('🎭 Bannière Mystère')
      .setDescription(banner.description)
      .addFields(
        { name: '📜 Type', value: 'Mystère', inline: true },
        { name: '🎯 Pulls pour révélation', value: `${pullsRemaining}/${this.REVEAL_PULLS}`, inline: true },
        { name: '⏰ Date de fin', value: banner.endDate.toLocaleDateString('fr-FR'), inline: true }
      )
      .setFooter({ text: 'Le contenu sera révélé après 10 pulls' })
      .setTimestamp();

    if (banner.imageUrl) {
      embed.setImage(banner.imageUrl);
    }

    return embed;
  }

  /**
   * Crée un embed pour une bannière mystère révélée
   */
  static createRevealedBannerEmbed(banner: any): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0xFFD700) // Or pour la révélation
      .setTitle('🎭 Bannière Mystère Révélée!')
      .setDescription(banner.description)
      .addFields(
        { name: '📜 Type', value: banner.mysteryContent?.type === 'character' ? 'Personnages' : 'Armes', inline: true },
        { name: '✨ Contenu', value: banner.mysteryContent?.items.join(', ') || 'Aucun', inline: false }
      )
      .setFooter({ text: 'Le mystère est résolu!' })
      .setTimestamp();

    if (banner.imageUrl) {
      embed.setImage(banner.imageUrl);
    }

    return embed;
  }

  /**
   * Crée une bannière mystère
   */
  static async createMysteryBanner(data: {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    startDate: Date;
    endDate: Date;
  }): Promise<{ success: boolean; banner?: any; error?: string }> {
    try {
      const banner = await Banner.create({
        id: data.id,
        name: data.name,
        type: 'mystery',
        description: data.description,
        imageUrl: data.imageUrl,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: true,
        mysteryRevealed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return { success: true, banner };
    } catch (error) {
      return { success: false, error: 'Erreur lors de la création de la bannière mystère' };
    }
  }
}

export const mysteryBannerService = MysteryBannerService;
