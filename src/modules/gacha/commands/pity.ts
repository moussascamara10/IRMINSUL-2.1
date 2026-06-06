import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { User } from '../../../database/models/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pity')
    .setDescription('Affiche votre pity pour toutes les bannières'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: 'Vous devez d\'abord commencer votre aventure avec `/commencer`!'
        });
        return;
      }

      // Récupérer le pity pour toutes les bannières (champs structurés)
      const standardPity = user.gachaPity?.standard || 0;
      const standardGuaranteed = user.gachaGuaranteed?.standard || false;
      
      const characterPity = user.gachaPity?.character || 0;
      const characterGuaranteed = user.gachaGuaranteed?.character || false;
      
      const weaponPity = user.gachaPity?.weapon || 0;
      const weaponGuaranteed = user.gachaGuaranteed?.weapon || false;

      const embed = new EmbedBuilder()
        .setTitle('🎲 Vos Pity')
        .setColor(0x0099FF)
        .setDescription('Pity actuel pour chaque bannière')
        .addFields(
          { 
            name: '🎨 Bannière Standard', 
            value: `${standardPity}/90 ${standardGuaranteed ? '✅' : ''}`, 
            inline: true 
          },
          { 
            name: '👤 Bannière Personnages', 
            value: `${characterPity}/90 ${characterGuaranteed ? '✅' : ''}`, 
            inline: true 
          },
          { 
            name: '⚔️ Bannière Armes', 
            value: `${weaponPity}/80 ${weaponGuaranteed ? '✅' : ''}`, 
            inline: true 
          }
        )
        .addFields(
          { name: '💎 Primogens', value: user.primogens.toLocaleString(), inline: true },
          { name: '🔮 Destins Enchevêtrés', value: user.fatesIntertwined.toString(), inline: true },
          { name: '✨ Destins Entrelacés', value: user.fatesAcquaint.toString(), inline: true }
        )
        .setFooter({ text: 'Pity 5★: 90 pour Standard/Personnages, 80 pour Armes' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur lors de l\'affichage du pity:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors de l\'affichage du pity.'
      });
    }
  }
};
