import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User, Guild } from '../../../database/models/index.js';
import { guildService } from '../../../services/GuildService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('guild-join')
    .setDescription('Rejoindre une guilde existante')
    .addStringOption(option =>
      option
        .setName('guild')
        .setDescription('L\'ID de la guilde')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const guildId = interaction.options.getString('guild')!;
    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: '❌ Vous devez d\'abord commencer votre aventure avec `/commencer`!\n\n💡 Utilisez `/commencer` pour créer votre profil et recevoir vos ressources de départ.'
        });
        return;
      }

      // Vérifier si l'utilisateur a atteint AR 10 pour rejoindre une guilde
      if (user.adventureRank < 10) {
        await interaction.editReply({
          content: `❌ Vous devez atteindre le Rang Aventurier 10 pour rejoindre une guilde!\n\n💡 Votre AR actuel : ${user.adventureRank}\n💡 AR requis : 10\n\n💡 Utilisez \`/guide\` pour des conseils sur comment progresser.`
        });
        return;
      }

      if (user.guildId) {
        await interaction.editReply({
          content: 'Vous êtes déjà dans une guilde! Utilisez `/guild-leave` pour quitter votre guilde actuelle.'
        });
        return;
      }

      const guild = await Guild.findById(guildId);

      if (!guild) {
        await interaction.editReply({
          content: 'Guilde introuvable.'
        });
        return;
      }

      const result = await guildService.joinGuild(user, guildId);

      if (!result.success) {
        await interaction.editReply({
          content: result.error || 'Erreur lors de la rejoindre la guilde.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🎉 Guilde Rejointe!')
        .setDescription(`Vous avez rejoint la guilde **${guild.name}**`)
        .setColor(0x00FF00)
        .addFields(
          { name: 'Nom', value: guild.name, inline: true },
          { name: 'Membres', value: guild.members.toString(), inline: true },
          { name: 'Niveau', value: guild.level.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la rejoindre la guilde:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la rejoindre la guilde.'
      });
    }
  }
};
