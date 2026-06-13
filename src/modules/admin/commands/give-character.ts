import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { User, CharacterOwned } from '../../../database/models/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-give-character')
    .setDescription('Donner un Personnage (Admin only)')
    .addUserOption(option =>
      option
        .setName('utilisateur')
        .setDescription('Utilisateur ciblé')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('personnage')
        .setDescription('ID du personnage')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('rarete')
        .setDescription('Rareté du personnage')
        .setRequired(true)
        .addChoices(
          { name: '3★', value: 3 },
          { name: '4★', value: 4 },
          { name: '5★', value: 5 }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('niveau')
        .setDescription('Niveau du personnage')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(90)
    )
    .addIntegerOption(option =>
      option
        .setName('constellation')
        .setDescription('Constellation du personnage')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(6)
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
    const characterId = interaction.options.getString('personnage')!;
    const rarity = interaction.options.getInteger('rarete')!;
    const level = interaction.options.getInteger('niveau') || 1;
    const constellation = interaction.options.getInteger('constellation') || 0;

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

      // Vérifier si le personnage existe déjà
      const existingChar = await CharacterOwned.findOne({
        userId: targetUser.id,
        characterId
      });

      if (existingChar) {
        await interaction.editReply({ content: 'Ce personnage est déjà possédé!' });
        return;
      }

      // Créer le personnage
      const newCharacter = await CharacterOwned.create({
        userId: targetUser.id,
        characterId,
        characterName: characterId, // Utiliser l'ID comme nom pour l'instant
        rarity,
        level,
        constellation,
        unlocked: true
      });

      // Mettre à jour les compteurs
      user.totalCharacters = (user.totalCharacters || 0) + 1;
      await user.save();

      const embed = new EmbedBuilder()
        .setTitle('🔧 Admin: Personnage Donné')
        .setColor(0xFF0000)
        .addFields(
          { name: 'Utilisateur', value: targetUser.tag, inline: true },
          { name: 'Personnage', value: characterId, inline: true },
          { name: 'Rareté', value: '⭐'.repeat(rarity), inline: true },
          { name: 'Niveau', value: level.toString(), inline: true },
          { name: 'Constellation', value: `C${constellation}`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur admin-give-character:', error);
      await interaction.editReply({ content: 'Une erreur est survenue.' });
    }
  }
};
