import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { User } from '../../../database/models/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-give-fates')
    .setDescription('Donner des Destins (Admin only)')
    .addUserOption(option =>
      option
        .setName('utilisateur')
        .setDescription('Utilisateur ciblé')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Type de Destin')
        .setRequired(true)
        .addChoices(
          { name: 'Destins Enchevêtrés', value: 'intertwined' },
          { name: 'Destins Entrelacés', value: 'acquaint' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('montant')
        .setDescription('Montant à donner')
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
    const type = interaction.options.getString('type')!;
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

      if (type === 'intertwined') {
        user.fatesIntertwined += amount;
      } else {
        user.fatesAcquaint += amount;
      }

      await user.save();

      const embed = new EmbedBuilder()
        .setTitle('🔧 Admin: Destins Donnés')
        .setColor(0xFF0000)
        .addFields(
          { name: 'Utilisateur', value: targetUser.tag, inline: true },
          { name: 'Type', value: type === 'intertwined' ? 'Destins Enchevêtrés' : 'Destins Entrelacés', inline: true },
          { name: 'Montant', value: amount.toString(), inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur admin-give-fates:', error);
      await interaction.editReply({ content: 'Une erreur est survenue.' });
    }
  }
};
