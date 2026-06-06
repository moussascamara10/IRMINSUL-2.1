import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('banniere')
    .setDescription('Affiche les informations de la bannière actuelle')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Type de bannière')
        .setRequired(false)
        .addChoices(
          { name: 'Standard', value: 'standard' },
          { name: 'Personnages', value: 'character' },
          { name: 'Armes', value: 'weapon' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const bannerType = interaction.options.getString('type') || 'character';
    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: 'Vous devez d\'abord commencer votre aventure avec `/commencer`!'
        });
        return;
      }

      // Récupérer le pity
      const pityKey = `pity_${bannerType}`;
      const guaranteedKey = `guaranteed_${bannerType}`;
      const pity = (user as any)[pityKey] || 0;
      const guaranteed = (user as any)[guaranteedKey] || false;

      let embed: EmbedBuilder;

      if (bannerType === 'standard') {
        embed = new EmbedBuilder()
          .setTitle('🎨 Bannière Standard')
          .setColor(0x9B59B6)
          .setDescription('Bannière permanente avec tous les personnages et armes.')
          .addFields(
            { name: '🎲 Pity 5★', value: `${pity}/90`, inline: true },
            { name: '✅ Garanti', value: guaranteed ? 'Oui' : 'Non', inline: true },
            { name: '💰 Coût', value: '160 Primogens', inline: true }
          )
          .addFields(
            { name: '📊 Taux', value: '5★: 0.6%\n4★: 5.1%\n3★: 94.3%', inline: true }
          );
      } else if (bannerType === 'character') {
        embed = new EmbedBuilder()
          .setTitle('👤 Bannière Personnages')
          .setColor(0xFF69B4)
          .setDescription('Bannière temporaire avec personnages en vedette.')
          .addFields(
            { name: '⭐ Personnages 5★', value: 'Hu Tao, Zhongli', inline: true },
            { name: '🎲 Pity 5★', value: `${pity}/90`, inline: true },
            { name: '✅ Garanti', value: guaranteed ? 'Oui' : 'Non', inline: true }
          )
          .addFields(
            { name: '💰 Coût', value: '160 Primogens', inline: true },
            { name: '📊 Taux', value: '5★: 0.6%\n4★: 5.1%\n3★: 94.3%', inline: true }
          )
          .setFooter({ text: 'Rate-up 50% pour les personnages 5★' });
      } else {
        embed = new EmbedBuilder()
          .setTitle('⚔️ Bannière Armes')
          .setColor(0xE74C3C)
          .setDescription('Bannière temporaire avec armes en vedette.')
          .addFields(
            { name: '⭐ Armes 5★', value: 'Staff of Homa, Skyward Blade', inline: true },
            { name: '🎲 Pity 5★', value: `${pity}/80`, inline: true },
            { name: '✅ Garanti', value: guaranteed ? 'Oui' : 'Non', inline: true }
          )
          .addFields(
            { name: '💰 Coût', value: '160 Primogens', inline: true },
            { name: '📊 Taux', value: '5★: 0.7%\n4★: 6.0%\n3★: 93.3%', inline: true }
          )
          .setFooter({ text: 'Rate-up 75% pour les armes 5★' });
      }

      embed.setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de l\'affichage de la bannière:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de l\'affichage de la bannière.'
      });
    }
  }
};
