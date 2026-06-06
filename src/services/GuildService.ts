import { Guild } from '../database/models/index.js';
import type { IUser } from '../database/models/index.js';
import { economyService } from './EconomyService.js';

export interface GuildConfig {
  id: string;
  name: string;
  description: string;
  maxMembers: number;
  minAR: number;
  minWorldLevel: number;
  creationCost: number; // mora
  perks: GuildPerk[];
}

export interface GuildPerk {
  id: string;
  name: string;
  description: string;
  level: number;
  effect: string;
  cost: number; // guild contribution
}

export interface GuildMember {
  userId: string;
  role: 'leader' | 'officer' | 'member';
  contribution: number;
  joinedAt: Date;
  lastActive: Date;
}

export interface GuildActivity {
  type: 'raid' | 'event' | 'donation' | 'challenge';
  participants: string[];
  timestamp: Date;
  result: string;
  rewards: {
    mora: number;
    contribution: number;
  };
}

export interface GuildRanking {
  guildId: string;
  guildName: string;
  totalContribution: number;
  memberCount: number;
  averageAR: number;
  raidWins: number;
  eventParticipations: number;
}

export class GuildService {
  private static readonly GUILD_CONFIGS: GuildConfig[] = [
    {
      id: 'knights_of_favonius',
      name: 'Chevaliers de Favonius',
      description: 'Ordre des chevaliers protégeant Mondstadt',
      maxMembers: 50,
      minAR: 10,
      minWorldLevel: 1,
      creationCost: 100000,
      perks: [
        {
          id: 'anemo_resonance',
          name: 'Résonance Anémo',
          description: '+10% dégâts Anémo pour les membres',
          level: 1,
          effect: 'anemo_damage_bonus_10',
          cost: 1000
        },
        {
          id: 'mondstadt_blessing',
          name: 'Bénédiction de Mondstadt',
          description: '+5% Mora gagné',
          level: 2,
          effect: 'mora_bonus_5',
          cost: 2500
        },
        {
          id: 'knight_vigilance',
          name: 'Vigilance des Chevaliers',
          description: '+10% résine regen',
          level: 3,
          effect: 'resin_regen_bonus_10',
          cost: 5000
        }
      ]
    },
    {
      id: 'liyue_qixing',
      name: 'Qixing de Liyue',
      description: 'Conseil des sept étoiles de Liyue',
      maxMembers: 100,
      minAR: 20,
      minWorldLevel: 2,
      creationCost: 250000,
      perks: [
        {
          id: 'geo_resonance',
          name: 'Résonance Géo',
          description: '+10% dégâts Géo pour les membres',
          level: 1,
          effect: 'geo_damage_bonus_10',
          cost: 2000
        },
        {
          id: 'liyue_prosperity',
          name: 'Prospérité de Liyue',
          description: '+10% Mora gagné',
          level: 2,
          effect: 'mora_bonus_10',
          cost: 5000
        },
        {
          id: 'contract_mastery',
          name: 'Maîtrise des Contrats',
          description: '+15% récompenses quêtes',
          level: 3,
          effect: 'quest_reward_bonus_15',
          cost: 10000
        }
      ]
    },
    {
      id: 'inazuma_shogunate',
      name: 'Shogunat d\'Inazuma',
      description: 'Gouvernement militaire d\'Inazuma',
      maxMembers: 75,
      minAR: 30,
      minWorldLevel: 4,
      creationCost: 500000,
      perks: [
        {
          id: 'electro_resonance',
          name: 'Résonance Électro',
          description: '+10% dégâts Électro pour les membres',
          level: 1,
          effect: 'electro_damage_bonus_10',
          cost: 3000
        },
        {
          id: 'eternal_storm',
          name: 'Tempête Éternelle',
          description: '+15% récompenses combat',
          level: 2,
          effect: 'combat_reward_bonus_15',
          cost: 7500
        },
        {
          id: 'vision_hunt_decree',
          name: 'Décret de Chasse aux Visions',
          description: '+20% primogems gacha',
          level: 3,
          effect: 'gacha_bonus_20',
          cost: 15000
        }
      ]
    },
    {
      id: 'sumeru_akademiya',
      name: 'Akademiya de Sumeru',
      description: 'Institution de recherche de Sumeru',
      maxMembers: 80,
      minAR: 35,
      minWorldLevel: 5,
      creationCost: 400000,
      perks: [
        {
          id: 'dendro_resonance',
          name: 'Résonance Dendro',
          description: '+10% dégâts Dendro pour les membres',
          level: 1,
          effect: 'dendro_damage_bonus_10',
          cost: 2500
        },
        {
          id: 'wisdom_of_akasha',
          name: 'Sagesse d\'Akasha',
          description: '+10% XP personnages',
          level: 2,
          effect: 'character_xp_bonus_10',
          cost: 6000
        },
        {
          id: 'elemental_mastery',
          name: 'Maîtrise Élémentaire',
          description: '+25% réactions élémentaires',
          level: 3,
          effect: 'reaction_bonus_25',
          cost: 12000
        }
      ]
    }
  ];

  /**
   * Récupère toutes les configurations de guildes
   */
  static getGuildConfigs(): GuildConfig[] {
    return this.GUILD_CONFIGS;
  }

  /**
   * Récupère une configuration de guilde spécifique
   */
  static getGuildConfig(guildId: string): GuildConfig | undefined {
    return this.GUILD_CONFIGS.find(config => config.id === guildId);
  }

  /**
   * Vérifie si l'utilisateur peut créer une guilde
   */
  static canCreateGuild(user: IUser, guildId: string): boolean {
    const config = this.getGuildConfig(guildId);
    if (!config) return false;

    return user.adventureRank >= config.minAR && 
           user.worldLevel >= config.minWorldLevel &&
           user.mora >= config.creationCost &&
           !user.guildId;
  }

  /**
   * Crée une nouvelle guilde
   */
  static async createGuild(user: IUser, guildId: string, guildName: string): Promise<{
    success: boolean;
    guild?: any;
    error?: string;
  }> {
    const config = this.getGuildConfig(guildId);
    if (!config) {
      return { success: false, error: 'Configuration de guilde introuvable' };
    }

    if (!this.canCreateGuild(user, guildId)) {
      return { success: false, error: 'Conditions non remplies pour créer cette guilde' };
    }

    // Déduire le coût
    const moraResult = economyService.removeResource(user, 'mora', config.creationCost, 'Création guilde');
    if (!moraResult.success) {
      return { success: false, error: 'Mora insuffisant' };
    }

    // Créer la guilde dans MongoDB
    const guild = await Guild.create({
      guildId: guildId,
      name: guildName,
      description: config.description,
      ownerId: user.discordId,
      members: 1,
      level: 1,
      xp: 0,
      guildCoins: 0,
      treasury: {
        mora: 0,
        primogens: 0
      },
      settings: {
        public: true,
        requireApplication: false,
        minAR: config.minAR
      },
      roles: {
        master: [user.discordId],
        officer: [],
        member: []
      },
      createdAt: new Date(),
      lastActiveAt: new Date()
    });

    // Mettre à jour l'utilisateur
    user.guildId = guild._id.toString();
    user.guildRole = 'master';
    user.guildContribution = 0;

    await user.save();

    return { success: true, guild };
  }

  /**
   * Rejoint une guilde existante
   */
  static async joinGuild(user: IUser, guildId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const guild = await Guild.findById(guildId);
    if (!guild) {
      return { success: false, error: 'Guilde introuvable' };
    }

    if (user.guildId) {
      return { success: false, error: 'Vous êtes déjà dans une guilde' };
    }

    // Récupérer la configuration pour vérifier le max de membres
    const config = this.getGuildConfig(guild.guildId);
    const maxMembers = config?.maxMembers || 50;

    if (guild.members >= maxMembers) {
      return { success: false, error: 'Guilde pleine' };
    }

    // Vérifier si l'utilisateur est déjà dans les rôles
    if (guild.roles.member.includes(user.discordId) || 
        guild.roles.officer.includes(user.discordId) ||
        guild.roles.master.includes(user.discordId)) {
      return { success: false, error: 'Vous êtes déjà membre de cette guilde' };
    }

    // Ajouter le membre dans les rôles
    guild.roles.member.push(user.discordId);
    guild.members += 1;
    guild.lastActiveAt = new Date();
    await guild.save();

    // Mettre à jour l'utilisateur
    user.guildId = guildId;
    user.guildRole = 'member';
    user.guildContribution = 0;

    await user.save();

    return { success: true };
  }

  /**
   * Quitte une guilde
   */
  static async leaveGuild(user: IUser): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!user.guildId) {
      return { success: false, error: 'Vous n\'êtes pas dans une guilde' };
    }

    const guild = await Guild.findById(user.guildId);
    if (!guild) {
      return { success: false, error: 'Guilde introuvable' };
    }

    // Vérifier si c'est le master
    if (guild.roles.master.includes(user.discordId)) {
      return { success: false, error: 'Le master ne peut pas quitter la guilde' };
    }

    // Retirer le membre des rôles
    guild.roles.member = guild.roles.member.filter(id => id !== user.discordId);
    guild.roles.officer = guild.roles.officer.filter(id => id !== user.discordId);
    guild.members -= 1;
    guild.lastActiveAt = new Date();
    await guild.save();

    // Mettre à jour l'utilisateur
    user.guildId = undefined;
    user.guildRole = undefined;
    user.guildContribution = 0;

    await user.save();

    return { success: true };
  }

  /**
   * Fait une donation à la guilde
   */
  static async donateToGuild(user: IUser, amount: number): Promise<{
    success: boolean;
    error?: string;
    contribution?: number;
  }> {
    if (!user.guildId) {
      return { success: false, error: 'Vous n\'êtes pas dans une guilde' };
    }

    if (user.mora < amount) {
      return { success: false, error: 'Mora insuffisant' };
    }

    const guild = await Guild.findById(user.guildId);
    if (!guild) {
      return { success: false, error: 'Guilde introuvable' };
    }

    // Déduire la mora
    economyService.removeResource(user, 'mora', amount, 'Donation guilde');

    // Ajouter la contribution à la guilde
    guild.guildCoins += amount;
    guild.treasury.mora += amount;
    guild.lastActiveAt = new Date();
    await guild.save();

    // Ajouter la contribution utilisateur
    user.guildContribution += amount;
    await user.save();

    return { success: true, contribution: amount };
  }

  /**
   * Débloque un perk de guilde
   */
  static async unlockPerk(guildId: string, perkId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const guild = await Guild.findById(guildId);
    if (!guild) {
      return { success: false, error: 'Guilde introuvable' };
    }

    const config = this.getGuildConfig(guild.guildId);
    if (!config) {
      return { success: false, error: 'Configuration introuvable' };
    }

    const perk = config.perks.find(p => p.id === perkId);
    if (!perk) {
      return { success: false, error: 'Perk introuvable' };
    }

    // Vérifier si la guilde a assez de guildCoins
    if (guild.guildCoins < perk.cost) {
      return { success: false, error: 'GuildCoins insuffisants' };
    }

    // Vérifier si le perk est déjà débloqué (basé sur le niveau de guilde)
    if (guild.level < perk.level) {
      // Débloquer le perk en augmentant le niveau
      guild.level = perk.level;
      guild.guildCoins -= perk.cost;
      guild.lastActiveAt = new Date();
      await guild.save();

      return { success: true };
    }

    return { success: false, error: 'Perk déjà débloqué' };
  }

  /**
   * Organise un raid de guilde
   */
  static async organizeGuildRaid(guildId: string, raidId: string, participants: string[]): Promise<{
    success: boolean;
    error?: string;
  }> {
    const guild = await Guild.findById(guildId);
    if (!guild) {
      return { success: false, error: 'Guilde introuvable' };
    }

    // Vérifier que tous les participants sont membres de la guilde
    const allMembers = [...guild.roles.master, ...guild.roles.officer, ...guild.roles.member];
    const validParticipants = participants.filter(p => allMembers.includes(p));

    if (validParticipants.length < 2) {
      return { success: false, error: 'Pas assez de participants (minimum 2)' };
    }

    // Mettre à jour la guilde (activité enregistrée via lastActiveAt)
    guild.lastActiveAt = new Date();
    await guild.save();

    // Note: Les détails des raids seraient stockés dans une collection séparée si nécessaire
    // Pour l'instant, on considère le raid comme organisé

    return { success: true };
  }

  /**
   * Récupère les membres d'une guilde
   */
  static async getGuildMembers(guildId: string): Promise<GuildMember[]> {
    const guild = await Guild.findById(guildId);
    if (!guild) return [];

    const members: GuildMember[] = [];

    // Ajouter les masters
    for (const userId of guild.roles.master) {
      members.push({
        userId,
        role: 'leader',
        contribution: 0, // Contribution individuelle non stockée dans le model Guild
        joinedAt: guild.createdAt,
        lastActive: guild.lastActiveAt
      });
    }

    // Ajouter les officers
    for (const userId of guild.roles.officer) {
      members.push({
        userId,
        role: 'officer',
        contribution: 0,
        joinedAt: guild.createdAt,
        lastActive: guild.lastActiveAt
      });
    }

    // Ajouter les members
    for (const userId of guild.roles.member) {
      members.push({
        userId,
        role: 'member',
        contribution: 0,
        joinedAt: guild.createdAt,
        lastActive: guild.lastActiveAt
      });
    }

    return members;
  }

  /**
   * Récupère les activités d'une guilde
   */
  static getGuildActivities(guildId: string): GuildActivity[] {
    // Note: Les activités ne sont pas stockées dans le model Guild actuel
    // Cette fonction retourne un tableau vide pour l'instant
    // TODO: Créer une collection dédiée pour les activités de guilde
    return [];
  }

  /**
   * Récupère le classement des guildes
   */
  static getGuildRanking(limit: number = 10): GuildRanking[] {
    // TODO: Implémenter avec MongoDB
    return [];
  }

  /**
   * Calcule le niveau d'une guilde basé sur l'XP
   */
  static calculateGuildLevel(xp: number): number {
    const levels = [
      { xp: 0, level: 1 },
      { xp: 10000, level: 2 },
      { xp: 50000, level: 3 },
      { xp: 200000, level: 4 },
      { xp: 500000, level: 5 },
      { xp: 1000000, level: 6 },
      { xp: 2500000, level: 7 },
      { xp: 5000000, level: 8 },
      { xp: 10000000, level: 9 },
      { xp: 20000000, level: 10 }
    ];

    for (let i = levels.length - 1; i >= 0; i--) {
      if (xp >= levels[i].xp) {
        return levels[i].level;
      }
    }

    return 1;
  }

  /**
   * Récupère les perks disponibles pour une guilde
   */
  static getAvailablePerks(guildId: string): GuildPerk[] {
    const config = this.getGuildConfig(guildId);
    if (!config) return [];

    return config.perks;
  }

  /**
   * Promote un membre
   */
  static async promoteMember(guildId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const guild = await Guild.findById(guildId);
    if (!guild) {
      return { success: false, error: 'Guilde introuvable' };
    }

    // Vérifier si l'utilisateur est membre
    if (!guild.roles.member.includes(userId)) {
      return { success: false, error: 'Membre introuvable' };
    }

    // Vérifier si déjà officier
    if (guild.roles.officer.includes(userId)) {
      return { success: false, error: 'Membre déjà officier' };
    }

    // Promouvoir: retirer de member, ajouter à officer
    guild.roles.member = guild.roles.member.filter(id => id !== userId);
    guild.roles.officer.push(userId);
    guild.lastActiveAt = new Date();
    await guild.save();

    return { success: true };
  }

  /**
   * Rétrograde un membre
   */
  static async demoteMember(guildId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const guild = await Guild.findById(guildId);
    if (!guild) {
      return { success: false, error: 'Guilde introuvable' };
    }

    // Vérifier si c'est le master
    if (guild.roles.master.includes(userId)) {
      return { success: false, error: 'Impossible de rétrograder le master' };
    }

    // Vérifier si déjà membre
    if (guild.roles.member.includes(userId)) {
      return { success: false, error: 'Membre déjà membre' };
    }

    // Rétrograder: retirer de officer, ajouter à member
    if (guild.roles.officer.includes(userId)) {
      guild.roles.officer = guild.roles.officer.filter(id => id !== userId);
      guild.roles.member.push(userId);
      guild.lastActiveAt = new Date();
      await guild.save();
      return { success: true };
    }

    return { success: false, error: 'Membre introuvable' };
  }

  /**
   * Expulse un membre
   */
  static async kickMember(guildId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const guild = await Guild.findById(guildId);
    if (!guild) {
      return { success: false, error: 'Guilde introuvable' };
    }

    // Vérifier si c'est le master
    if (guild.roles.master.includes(userId)) {
      return { success: false, error: 'Impossible d\'expulser le master' };
    }

    // Retirer de tous les rôles
    const wasMember = guild.roles.member.includes(userId) || guild.roles.officer.includes(userId);
    guild.roles.member = guild.roles.member.filter(id => id !== userId);
    guild.roles.officer = guild.roles.officer.filter(id => id !== userId);
    guild.members -= 1;
    guild.lastActiveAt = new Date();
    await guild.save();

    if (!wasMember) {
      return { success: false, error: 'Membre introuvable' };
    }

    return { success: true };
  }
}

export const guildService = GuildService;
