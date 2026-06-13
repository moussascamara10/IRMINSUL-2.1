import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { User } from '../../../database/models/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-give-mora')
    .setDescription('Donner du Mora (Admin only)')
    .addUserOption(option =>
      option
        .setName('utilisateur')
        .setDescription('Utilisateur ciblé')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('montant')
        .setDescription('Montant de Mora à donner')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // Vérification admin par ID utilisateur
    const ADMIN_IDS = ['1153427632961110117'];
    if (!ADMIN_IDS.includes(interaction.user.id)) {
      await interaction.reply({ content: '⛔ Vous n\'avez pas la permission d\'utiliser cette commande.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('utilisateur');
    const amount = interaction.options.getInteger('montant')!;

    if (!targetUser) {
      await interaction.editReply({ content: 'Utilisateur invalide!' });
      return;
    }

    try {
      let user = await User.findOne({ discordId: targetUser.id });

      if (!user) {
        await interaction.editReply({ content: 'Cet utilisateur n\'a pas commencé son aventure!' });
        return;
      }

      user.mora += amount;
      await user.save();

      const embed = new EmbedBuilder()
        .setTitle('🔧 Admin: Mora Donné')
        .setColor(0xFF0000)
        .addFields(
          { name: 'Utilisateur', value: targetUser.tag, inline: true },
          { name: 'Montant', value: amount.toLocaleString(), inline: true },
          { name: 'Nouveau Solde', value: user.mora.toLocaleString(), inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur admin-give-mora:', error);
      await interaction.editReply({ content: 'Une erreur est survenue.' });
    }
  }
};
