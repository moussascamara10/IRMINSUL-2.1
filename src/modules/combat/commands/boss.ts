import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { User, CharacterOwned } from '../../../database/models/index.js';
import { combatEngine, BossStats, CombatCharacter } from '../../../services/CombatEngine.js';
import { genshinDataService } from '../../../services/GenshinDataService.js';
import { economyService } from '../../../services/EconomyService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('boss')
    .setDescription('Combat un boss de résine')
    .addStringOption(option =>
      option
        .setName('boss')
        .setDescription('Choisis le boss')
        .setRequired(true)
        .addChoices(
          { name: 'Anemo Hypostasis', value: 'anemo_hypostasis' },
          { name: 'Hydro Hypostasis', value: 'hydro_hypostasis' },
          { name: 'Pyro Regisvine', value: 'pyro_regisvine' },
          { name: 'Cryo Regisvine', value: 'cryo_regisvine' },
          { name: 'Electro Hypostasis', value: 'electro_hypostasis' },
          { name: 'Geo Hypostasis', value: 'geo_hypostasis' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const bossId = interaction.options.getString('boss')!;
    const discordId = interaction.user.id;

    try {
      const user = await User.findOne({ discordId });

      if (!user) {
        await interaction.editReply({
          content: '❌ Vous devez d\'abord commencer votre aventure avec `/commencer`!\n\n💡 Utilisez `/commencer` pour créer votre profil et recevoir vos ressources de départ.'
        });
        return;
      }

      // Vérifier si l'utilisateur a atteint AR 8 pour accéder aux boss
      if (user.adventureRank < 8) {
        await interaction.editReply({
          content: `❌ Vous devez atteindre le Rang Aventurier 8 pour accéder aux boss!\n\n💡 Votre AR actuel : ${user.adventureRank}\n💡 AR requis : 8\n\n💡 Utilisez \`/guide\` pour des conseils sur comment progresser.`
        });
        return;
      }

      // Vérifier la résine via EconomyService
      if (!combatEngine.canAffordBoss(user)) {
        const currentResin = economyService.getCurrentResin(user);
        await interaction.editReply({
          content: `Vous n'avez pas assez de résine! Il vous en faut 20 mais vous n'en avez que ${currentResin}.`
        });
        return;
      }

      // Récupérer les personnages de l'utilisateur
      const characters = await CharacterOwned.find({ userId: discordId });

      if (characters.length === 0) {
        await interaction.editReply({
          content: 'Vous n\'avez aucun personnage! Utilisez `/voeux` pour en obtenir.'
        });
        return;
      }

      // Sélectionner l'équipe active ou les 4 personnages les plus haut niveau
      let teamCharacters = user.activeTeam.length > 0
        ? characters.filter(c => user.activeTeam.includes(c.characterId))
        : characters.sort((a, b) => b.level - a.level).slice(0, 4);

      if (teamCharacters.length < 4) {
        // Compléter avec d'autres personnages
        const otherChars = characters.filter(c => !teamCharacters.includes(c));
        teamCharacters = [...teamCharacters, ...otherChars.slice(0, 4 - teamCharacters.length)];
      }

      // Calculer les stats de combat
      const combatTeam: CombatCharacter[] = [];
      let totalLevel = 0;

      for (const char of teamCharacters.slice(0, 4)) {
        const charData = genshinDataService.getCharacter(char.characterName);
        if (charData) {
          const stats = combatEngine.calculateCharacterStats(char, charData, user);
          combatTeam.push({
            character: char,
            characterData: charData,
            stats,
            currentHP: stats.hp,
            energy: 0
          });
          totalLevel += char.level;
        }
      }

      if (combatTeam.length === 0) {
        await interaction.editReply({
          content: 'Erreur lors de la préparation de l\'équipe.'
        });
        return;
      }

      const avgLevel = totalLevel / combatTeam.length;

      // Calculer les stats du boss avec progression utilisateur
      const bossHP = combatEngine.calculateBossHP(bossId, user, avgLevel);
      const bossATK = combatEngine.calculateBossAttack(bossId, user);
      const bossDEF = combatEngine.calculateBossDefense(bossId, user);

      const boss: BossStats = {
        name: bossId.replace('_', ' ').toUpperCase(),
        hp: bossHP,
        maxHP: bossHP,
        atk: bossATK,
        def: bossDEF,
        element: getBossElement(bossId),
        resistances: getBossResistances(bossId)
      };

      // Déduire la résine via EconomyService
      combatEngine.deductBossCost(user);

      // Créer l'embed de combat
      const embed = new EmbedBuilder()
        .setTitle(`⚔️ Combat: ${boss.name}`)
        .setColor(0xFF0000)
        .setDescription(`Niveau Monde: ${user.worldLevel} | Niveau équipe: ${Math.floor(avgLevel)}`)
        .addFields(
          { name: '❤️ Boss HP', value: `${formatNumber(boss.hp)}/${formatNumber(boss.maxHP)}`, inline: true },
          { name: '⚔️ Boss ATK', value: formatNumber(boss.atk), inline: true },
          { name: '🛡️ Boss DEF', value: formatNumber(boss.def), inline: true }
        )
        .addFields(
          { name: '👥 Équipe', value: combatTeam.map(c => `${c.characterData.name} (Nv.${c.character.level})`).join('\n'), inline: false }
        )
        .setTimestamp();

      // Créer les boutons d'action
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('combat_attack')
            .setLabel('⚔️ Attaquer')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('combat_skill')
            .setLabel('🌟 Compétence')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('combat_burst')
            .setLabel('💥 Burst')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('combat_flee')
            .setLabel('🏃 Fuir')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.editReply({ embeds: [embed], components: [row] });

      // TODO: Implémenter la boucle de combat
      // Pour l'instant, c'est une version simplifiée

    } catch (error) {
      console.error('Erreur lors du combat:', error);
      await interaction.editReply({
        content: 'Une erreur est survenue lors du combat.'
      });
    }
  }
};

function getBossElement(bossId: string): string {
  const elements: { [key: string]: string } = {
    'anemo_hypostasis': 'anemo',
    'hydro_hypostasis': 'hydro',
    'pyro_regisvine': 'pyro',
    'cryo_regisvine': 'cryo',
    'electro_hypostasis': 'electro',
    'geo_hypostasis': 'geo'
  };
  return elements[bossId] || 'physique';
}

function getBossResistances(bossId: string): { [element: string]: number } {
  const resistances: { [key: string]: { [element: string]: number } } = {
    'anemo_hypostasis': { anemo: 70, hydro: 10, pyro: 10, cryo: 10, electro: 10, geo: 10 },
    'hydro_hypostasis': { hydro: 70, anemo: 10, pyro: 10, cryo: 10, electro: 10, geo: 10 },
    'pyro_regisvine': { pyro: 70, anemo: 10, hydro: 10, cryo: 10, electro: 10, geo: 10 },
    'cryo_regisvine': { cryo: 70, anemo: 10, hydro: 10, pyro: 10, electro: 10, geo: 10 },
    'electro_hypostasis': { electro: 70, anemo: 10, hydro: 10, pyro: 10, cryo: 10, geo: 10 },
    'geo_hypostasis': { geo: 70, anemo: 10, hydro: 10, pyro: 10, cryo: 10, electro: 10 }
  };
  return resistances[bossId] || {};
}

function formatNumber(num: number): string {
  return num.toLocaleString('fr-FR');
}
