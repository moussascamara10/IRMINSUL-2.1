import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { User, GachaHistory, CharacterOwned, WeaponOwned } from '../../../database/models/index.js';
import { gachaEngine, GachaResult } from '../../../services/GachaEngine.js';
import { economyService } from '../../../services/EconomyService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('voeux')
    .setDescription('Effectue des vœux (gacha)')
    .addStringOption(option =>
      option
        .setName('banniere')
        .setDescription('Choisis la bannière')
        .setRequired(true)
        .addChoices(
          { name: 'Bannière Standard', value: 'standard' },
          { name: 'Bannière Personnages', value: 'character' },
          { name: 'Bannière Armes', value: 'weapon' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('nombre')
        .setDescription('Nombre de vœux (1 ou 10)')
        .setRequired(false)
        .addChoices(
          { name: '1 vœu', value: 1 },
          { name: '10 vœux', value: 10 }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const bannerType = interaction.options.getString('banniere') as 'standard' | 'character' | 'weapon';
    const pullCount = interaction.options.getInteger('nombre') || 1;
    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: '❌ Vous devez d\'abord commencer votre aventure avec `/commencer`!\n\n💡 Utilisez `/commencer` pour créer votre profil et recevoir vos ressources de départ.'
        });
        return;
      }

      // Vérifier les ressources via EconomyService
      const currency = 'primogens' as const;
      if (!gachaEngine.canAffordPulls(user, pullCount, currency)) {
        const cost = pullCount * 160;
        await interaction.editReply({
          content: `Vous n'avez pas assez de Primogens! Il vous en faut ${cost} mais vous n'en avez que ${user.primogens}.`
        });
        return;
      }

      // Effectuer les pulls avec le user object (intégration progression)
      const results: GachaResult[] = [];
      
      for (let i = 0; i < pullCount; i++) {
        let result: GachaResult;
        
        if (bannerType === 'standard') {
          result = await gachaEngine.pullStandard(user);
          user.gachaPity.standard = result.pity;
        } else if (bannerType === 'character') {
          const featuredCharacters = ['hu tao', 'zhongli']; // Exemple
          result = await gachaEngine.pullCharacter(user, featuredCharacters);
          user.gachaPity.character = result.pity;
          user.gachaGuaranteed.character = result.guaranteed;
        } else {
          const featuredWeapons = ['staff of homa', 'skyward blade']; // Exemple
          result = await gachaEngine.pullWeapon(user, featuredWeapons);
          user.gachaPity.weapon = result.pity;
          user.gachaGuaranteed.weapon = result.guaranteed;
        }

        results.push(result);
      }

      // Déduire les Primogens via EconomyService
      gachaEngine.deductPullCost(user, pullCount, currency);
      user.totalPulls += pullCount;

      // Sauvegarder les résultats dans l'historique
      for (const result of results) {
        await GachaHistory.create({
          userId: discordId,
          bannerType,
          bannerName: bannerType === 'standard' ? 'Bannière Standard' : bannerType === 'character' ? 'Bannière Personnages' : 'Bannière Armes',
          itemType: result.type,
          itemId: (result.item as any).id,
          itemName: (result.item as any).name,
          rarity: result.rarity,
          costType: 'primogens',
          costAmount: 160,
          pityBefore: bannerType === 'standard' ? user.gachaPity.standard - results.length : bannerType === 'character' ? user.gachaPity.character - results.length : user.gachaPity.weapon - results.length,
          pityAfter: result.pity,
          guaranteed: result.guaranteed
        });

        // TODO: Ajouter le personnage/arme à l'inventaire
        if (result.type === 'character') {
          user.totalCharacters++;
        } else {
          user.totalWeapons++;
        }
      }

      await user.save();

      // Créer l'embed de résultat
      const finalPity = bannerType === 'standard' ? user.gachaPity.standard : bannerType === 'character' ? user.gachaPity.character : user.gachaPity.weapon;
      const finalGuaranteed = bannerType === 'standard' ? user.gachaGuaranteed.standard : bannerType === 'character' ? user.gachaGuaranteed.character : user.gachaGuaranteed.weapon;
      
      const embed = new EmbedBuilder()
        .setTitle(`🎲 Vœux ${pullCount === 10 ? '×10' : '×1'} - ${bannerType === 'standard' ? 'Standard' : bannerType === 'character' ? 'Personnages' : 'Armes'}`)
        .setColor(0xFFD700)
        .setDescription(`Pity: ${finalPity}/90 ${finalGuaranteed ? '✅ Garanti' : ''}`)
        .setTimestamp();

      const resultsText = results.map((r, i) => {
        const emoji = r.rarity === 5 ? '⭐⭐⭐⭐⭐' : r.rarity === 4 ? '⭐⭐⭐⭐' : '⭐⭐⭐';
        const item = r.item as any;
        return `${i + 1}. ${emoji} **${item.name}** (${r.type === 'character' ? 'Personnage' : 'Arme'})`;
      }).join('\n');

      embed.addFields({ name: 'Résultats', value: resultsText });

      // Créer les boutons pour continuer
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`gacha_${bannerType}_1`)
            .setLabel('1 vœu')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`gacha_${bannerType}_10`)
            .setLabel('10 vœux')
            .setStyle(ButtonStyle.Primary)
        );

      await interaction.editReply({ embeds: [embed], components: [row] });

      // Gérer les interactions de boutons
      const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000 // 1 minute
      });

      collector?.on('collect', async (i) => {
        if (i.user.id !== discordId) {
          await i.reply({ content: 'Ce n\'est pas vos boutons!', ephemeral: true });
          return;
        }

        const [_, banner, count] = i.customId.split('_');
        // TODO: Relancer le gacha avec les paramètres
        await i.update({ content: 'Fonctionnalité en cours de développement...' });
      });

    } catch (error) {
      console.error('Erreur lors des vœux:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors des vœux.'
      });
    }
  }
};
