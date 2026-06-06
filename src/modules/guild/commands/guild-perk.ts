import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User, Guild } from '../../../database/models/index.js';
import { guildService } from '../../../services/GuildService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('guild-perk')
    .setDescription('Débloquer un perk de guilde')
    .addStringOption(option =>
      option
        .setName('perk')
        .setDescription('Le perk à débloquer')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const perkId = interaction.options.getString('perk')!;
    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: 'Vous devez d\'abord commencer votre aventure avec `/commencer`!'
        });
        return;
      }

      if (!user.guildId) {
        await interaction.editReply({
          content: 'Vous n\'êtes pas dans une guilde.'
        });
        return;
      }

      const guild = await Guild.findById(user.guildId);

      if (!guild) {
        await interaction.editReply({
          content: 'Guilde introuvable.'
        });
        return;
      }

      // Vérifier que l'utilisateur est le master
      if (!guild.roles.master.includes(discordId)) {
        await interaction.editReply({
          content: 'Seul le master de la guilde peut débloquer des perks.'
        });
        return;
      }

      const result = await guildService.unlockPerk(guild._id.toString(), perkId);

      if (!result.success) {
        await interaction.editReply({
          content: result.error || 'Erreur lors du déblocage du perk.'
        });
        return;
      }

      const config = guildService.getGuildConfig(guild.guildId);
      const perk = config?.perks.find(p => p.id === perkId);

      const embed = new EmbedBuilder()
        .setTitle('🎁 Perk Débloqué!')
        .setDescription(`Votre guilde a débloqué le perk **${perk?.name}**`)
        .setColor(0xFFD700)
        .addFields(
          { name: 'Nom', value: perk?.name || 'Inconnu', inline: true },
          { name: 'Description', value: perk?.description || 'Inconnue', inline: true },
          { name: 'Effet', value: perk?.effect || 'Inconnu', inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors du déblocage du perk:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors du déblocage du perk.'
      });
    }
  }
};
