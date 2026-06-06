import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('domain')
    .setDescription('Liste les domaines disponibles')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Type de domaine')
        .setRequired(false)
        .addChoices(
          { name: 'Artefacts', value: 'artifacts' },
          { name: 'Matériaux de talents', value: 'talents' },
          { name: 'Armes', value: 'weapons' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const domainType = interaction.options.getString('type') || 'artifacts';
    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: '❌ Vous devez d\'abord commencer votre aventure avec `/commencer`!\n\n💡 Utilisez `/commencer` pour créer votre profil et recevoir vos ressources de départ.'
        });
        return;
      }

      // Vérifier si l'utilisateur a atteint AR 5 pour accéder aux domaines
      if (user.adventureRank < 5) {
        await interaction.editReply({
          content: `❌ Vous devez atteindre le Rang Aventurier 5 pour accéder aux domaines!\n\n💡 Votre AR actuel : ${user.adventureRank}\n💡 AR requis : 5\n\n💡 Utilisez \`/guide\` pour des conseils sur comment progresser.`
        });
        return;
      }

      // Calculer la résine actuelle
      const currentResin = Math.min(
        user.resin + Math.floor((Date.now() - user.lastResinUpdate.getTime()) / (8 * 60 * 1000)),
        200
      );

      let embed: EmbedBuilder;

      if (domainType === 'artifacts') {
        embed = new EmbedBuilder()
          .setTitle('🏛️ Domaines d\'Artefacts')
          .setColor(0x9B59B6)
          .setDescription('Domaines pour farm des artefacts')
          .addFields(
            { name: 'Valley of Remembrance', value: 'Set: Gladiator\'s Finale\nCoût: 20 Résine', inline: true },
            { name: 'Clear Pool and Mountain Cavern', value: 'Set: Viridescent Venerer\nCoût: 20 Résine', inline: true },
            { name: 'Domain of Guyun', value: 'Set: Archaic Petra\nCoût: 20 Résine', inline: true }
          )
          .addFields(
            { name: 'Peak of Vindagnyr', value: 'Set: Blizzard Strayer\nCoût: 20 Résine', inline: true },
            { name: 'Midsummer Courtyard', value: 'Set: Crimson Witch of Flames\nCoût: 20 Résine', inline: true },
            { name: 'Ridge Watch', value: 'Set: Bloodstained Chivalry\nCoût: 20 Résine', inline: true }
          );
      } else if (domainType === 'talents') {
        embed = new EmbedBuilder()
          .setTitle('📚 Domaines de Talents')
          .setColor(0x3498DB)
          .setDescription('Domaines pour farm des matériaux de talents')
          .addFields(
            { name: 'Forsaken Rift', value: 'Livre: Diligence\nCoût: 20 Résine', inline: true },
            { name: 'Cecilia Garden', value: 'Livre: Resistance\nCoût: 20 Résine', inline: true },
            { name: 'Hidden Palace of Zhou Formula', value: 'Livre: Ballad\nCoût: 20 Résine', inline: true }
          );
      } else {
        embed = new EmbedBuilder()
          .setTitle('⚔️ Domaines d\'Armes')
          .setColor(0xE74C3C)
          .setDescription('Domaines pour farm des matériaux d\'armes')
          .addFields(
            { name: 'Cecilia Garden', value: 'Armes: Mondstadt\nCoût: 20 Résine', inline: true },
            { name: 'Hidden Palace of Zhou Formula', value: 'Armes: Liyue\nCoût: 20 Résine', inline: true },
            { name: 'Court of Flowing Sanddunes', value: 'Armes: Inazuma\nCoût: 20 Résine', inline: true }
          );
      }

      embed.addFields(
        { name: '🔷 Résine actuelle', value: `${currentResin}/200`, inline: true },
        { name: '🌍 Niveau Monde', value: `WL ${user.worldLevel}`, inline: true }
      )
      .setFooter({ text: 'Utilisez /domain <nom> pour entrer dans un domaine' })
      .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de l\'affichage des domaines:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de l\'affichage des domaines.'
      });
    }
  }
};
