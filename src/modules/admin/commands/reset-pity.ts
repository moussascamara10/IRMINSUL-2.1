import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { User } from '../../../database/models/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-reset-pity')
    .setDescription('Reset le Pity (Admin only)')
    .addUserOption(option =>
      option
        .setName('utilisateur')
        .setDescription('Utilisateur ciblé')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('banniere')
        .setDescription('Bannière à reset')
        .setRequired(true)
        .addChoices(
          { name: 'Standard', value: 'standard' },
          { name: 'Personnages', value: 'character' },
          { name: 'Armes', value: 'weapon' }
        )
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
    const banner = interaction.options.getString('banniere')!;

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

      if (banner === 'standard') {
        user.gachaPity.standard = 0;
      } else if (banner === 'character') {
        user.gachaPity.character = 0;
        user.gachaGuaranteed.character = false;
      } else if (banner === 'weapon') {
        user.gachaPity.weapon = 0;
        user.gachaGuaranteed.weapon = false;
      }

      await user.save();

      const embed = new EmbedBuilder()
        .setTitle('🔧 Admin: Pity Reset')
        .setColor(0xFF0000)
        .addFields(
          { name: 'Utilisateur', value: targetUser.tag, inline: true },
          { name: 'Bannière', value: banner, inline: true },
          { name: 'Statut', value: 'Pity reset à 0', inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur admin-reset-pity:', error);
      await interaction.editReply({ content: 'Une erreur est survenue.' });
    }
  }
};
