import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';
import { guildService } from '../../../services/GuildService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('guild-create')
    .setDescription('Créer une nouvelle guilde')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Le type de guilde')
        .setRequired(true)
        .addChoices(
          { name: 'Chevaliers de Favonius', value: 'knights_of_favonius' },
          { name: 'Qixing de Liyue', value: 'liyue_qixing' },
          { name: 'Shogunat d\'Inazuma', value: 'inazuma_shogunate' },
          { name: 'Akademiya de Sumeru', value: 'sumeru_akademiya' }
        )
    )
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Le nom de votre guilde')
        .setRequired(true)
        .setMaxLength(50)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const guildType = interaction.options.getString('type')!;
    const guildName = interaction.options.getString('name')!;
    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: '❌ Vous devez d\'abord commencer votre aventure avec `/commencer`!\n\n💡 Utilisez `/commencer` pour créer votre profil et recevoir vos ressources de départ.'
        });
        return;
      }

      // Vérifier si l'utilisateur a atteint AR 10 pour créer une guilde
      if (user.adventureRank < 10) {
        await interaction.editReply({
          content: `❌ Vous devez atteindre le Rang Aventurier 10 pour créer une guilde!\n\n💡 Votre AR actuel : ${user.adventureRank}\n💡 AR requis : 10\n\n💡 Utilisez \`/guide\` pour des conseils sur comment progresser.`
        });
        return;
      }

      if (user.guildId) {
        await interaction.editReply({
          content: 'Vous êtes déjà dans une guilde! Utilisez `/guild-leave` pour quitter votre guilde actuelle.'
        });
        return;
      }

      const config = guildService.getGuildConfig(guildType);
      if (!config) {
        await interaction.editReply({
          content: 'Type de guilde introuvable.'
        });
        return;
      }

      const result = await guildService.createGuild(user, guildType, guildName);

      if (!result.success) {
        await interaction.editReply({
          content: result.error || 'Erreur lors de la création de la guilde.'
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🏰 Guilde Créée!')
        .setDescription(`Félicitations! Vous avez créé la guilde **${guildName}**`)
        .setColor(0xFFD700)
        .addFields(
          { name: 'Type', value: config.name, inline: true },
          { name: 'Description', value: config.description, inline: false },
          { name: 'Membres max', value: config.maxMembers.toString(), inline: true },
          { name: 'AR requis', value: config.minAR.toString(), inline: true },
          { name: 'WL requis', value: config.minWorldLevel.toString(), inline: true },
          { name: 'Coût de création', value: `${config.creationCost.toLocaleString()} Mora`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de la création de la guilde:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de la création de la guilde.'
      });
    }
  }
};
