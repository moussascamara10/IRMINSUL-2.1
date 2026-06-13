import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { User, CharacterOwned } from '../../../database/models/index.js';
import { CombatEngine, IBossBase } from '../../../services/CombatEngine.js';
import { ICombatCharacter } from '../../combat/types/combat.types.js';
import { genshinDataService } from '../../../services/GenshinDataService.js';
import { economyService } from '../../../services/EconomyService.js';
import { RedisCooldown, COMMAND_COOLDOWNS } from '../../../utils/RedisCooldown.js';

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

    // Vérifier le cooldown
    const cooldownCheck = await RedisCooldown.checkCooldown(discordId, 'boss_weekly', COMMAND_COOLDOWNS.boss_weekly);
    
    if (cooldownCheck.onCooldown) {
      const remainingSeconds = cooldownCheck.remainingTime || 0;
      await interaction.editReply({
        content: `⏱️ Attendez ${remainingSeconds}s avant de combattre un boss.`
      });
      return;
    }

    // Définir le cooldown
    await RedisCooldown.setCooldown(discordId, 'boss_weekly', COMMAND_COOLDOWNS.boss_weekly);

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
      if (!economyService.canAffordResin(user, 'boss')) {
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
      const combatTeam: ICombatCharacter[] = [];
      let totalLevel = 0;

      for (const char of teamCharacters.slice(0, 4)) {
        const charData = genshinDataService.getCharacter(char.characterName);
        if (charData) {
          const baseHp = charData.stats?.baseHP || 1000;
          const combatChar: ICombatCharacter = {
            characterId: char.characterId,
            name: char.characterName,
            element: charData.element,
            level: char.level,
            currentHp: Math.floor(baseHp * (1 + char.level * 0.1)),
            maxHp: Math.floor(baseHp * (1 + char.level * 0.1)),
            atk: Math.floor((charData.stats?.baseATK || 100) * (1 + char.level * 0.1)),
            def: Math.floor((charData.stats?.baseDEF || 50) * (1 + char.level * 0.1)),
            critRate: 5 + char.constellation,
            critDmg: 50 + char.constellation * 5,
            elementalMastery: 0,
            energyRecharge: 1.0,
            elementalBonus: {},
            physicalBonus: 0
          };
          combatTeam.push(combatChar);
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
      const bossBase: IBossBase = {
        id: bossId,
        name: bossId.replace('_', ' ').toUpperCase(),
        element: getBossElement(bossId),
        baseHp: 100000,
        baseDamage: 2000,
        level: Math.floor(avgLevel),
        resistances: getBossResistances(bossId),
        resinCost: 40
      };

      const bossHP = Math.floor(bossBase.baseHp * (1 + user.worldLevel * 0.15));
      const bossATK = Math.floor(bossBase.baseDamage * (1 + user.worldLevel * 0.1));
      const bossDEF = Math.floor(500 * (1 + user.worldLevel * 0.1));

      // Déduire la résine via EconomyService
      economyService.deductResinCost(user, 'boss');

      // Créer l'embed de combat
      const embed = new EmbedBuilder()
        .setTitle(`⚔️ Combat: ${bossBase.name}`)
        .setColor(0xFF0000)
        .setDescription(`Niveau Monde: ${user.worldLevel} | Niveau équipe: ${Math.floor(avgLevel)}`)
        .addFields(
          { name: '❤️ Boss HP', value: `${formatNumber(bossHP)}/${formatNumber(bossHP)}`, inline: true },
          { name: '⚔️ Boss ATK', value: formatNumber(bossATK), inline: true },
          { name: '🛡️ Boss DEF', value: formatNumber(bossDEF), inline: true }
        )
        .addFields(
          { name: '👥 Équipe', value: combatTeam.map(c => `${c.name} (Nv.${c.level})`).join('\n'), inline: false }
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
