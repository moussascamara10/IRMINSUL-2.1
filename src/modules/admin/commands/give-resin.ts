import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { User } from '../../../database/models/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-give-resin')
    .setDescription('Donner de la Résine (Admin only)')
    .addUserOption(option =>
      option
        .setName('utilisateur')
        .setDescription('Utilisateur ciblé')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('montant')
        .setDescription('Montant de Résine à donner')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(200)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // Vérification admin par ID utilisateur
    const ADMIN_IDS = ['1153427632961110117', '751421185715077181'];
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

      user.resin = Math.min(user.resin + amount, 200);
      user.lastResinUpdate = new Date();
      await user.save();

      const embed = new EmbedBuilder()
        .setTitle('🔧 Admin: Résine Donnée')
        .setColor(0xFF0000)
        .addFields(
          { name: 'Utilisateur', value: targetUser.tag, inline: true },
          { name: 'Montant', value: amount.toString(), inline: true },
          { name: 'Nouvelle Résine', value: `${user.resin}/200`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur admin-give-resin:', error);
      await interaction.editReply({ content: 'Une erreur est survenue.' });
    }
  }
};
