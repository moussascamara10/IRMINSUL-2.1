import { UserDailyProgress, UserWeeklyProgress } from '../database/models/index.js';
import type { IUser, IUserDailyProgress, IUserWeeklyProgress } from '../database/models/index.js';
import { economyService } from './EconomyService.js';

export interface DailyTask {
  id: string;
  name: string;
  description: string;
  type: 'combat' | 'exploration' | 'gacha' | 'social' | 'crafting';
  requirement: {
    action: string;
    target: number;
  };
  rewards: {
    mora: number;
    primogens: number;
    xp: number;
  };
  category: 'basic' | 'advanced' | 'elite';
}

export interface WeeklyTask {
  id: string;
  name: string;
  description: string;
  type: 'raid' | 'boss' | 'domain' | 'event' | 'guild';
  requirement: {
    action: string;
    target: number;
  };
  rewards: {
    mora: number;
    primogens: number;
    fates: number;
    starglitter: number;
  };
  category: 'normal' | 'hard' | 'extreme';
}

export interface UserDailyProgress {
  userId: string;
  date: Date;
  completedTasks: string[];
  totalPrimogensEarned: number;
  totalMoraEarned: number;
  streak: number;
}

export interface UserWeeklyProgress {
  userId: string;
  weekNumber: number;
  year: number;
  completedTasks: string[];
  totalPrimogensEarned: number;
  totalMoraEarned: number;
  totalFatesEarned: number;
  raidCompletions: number;
  bossCompletions: number;
}

export class ActivityLoopService {
  private static readonly DAILY_TASKS: DailyTask[] = [
    {
      id: 'daily_login',
      name: 'Connexion quotidienne',
      description: 'Connectez-vous au jeu',
      type: 'social',
      requirement: {
        action: 'login',
        target: 1
      },
      rewards: {
        mora: 1000,
        primogens: 20,
        xp: 50
      },
      category: 'basic'
    },
    {
      id: 'daily_commission_1',
      name: 'Commission 1',
      description: 'Complétez 1 commission',
      type: 'exploration',
      requirement: {
        action: 'complete_commission',
        target: 1
      },
      rewards: {
        mora: 2000,
        primogens: 10,
        xp: 100
      },
      category: 'basic'
    },
    {
      id: 'daily_commission_3',
      name: 'Commissions quotidiennes',
      description: 'Complétez 3 commissions',
      type: 'exploration',
      requirement: {
        action: 'complete_commission',
        target: 3
      },
      rewards: {
        mora: 5000,
        primogens: 30,
        xp: 300
      },
      category: 'basic'
    },
    {
      id: 'daily_boss_1',
      name: 'Boss quotidien',
      description: 'Vainquez 1 boss',
      type: 'combat',
      requirement: {
        action: 'defeat_boss',
        target: 1
      },
      rewards: {
        mora: 3000,
        primogens: 20,
        xp: 200
      },
      category: 'advanced'
    },
    {
      id: 'daily_domain_1',
      name: 'Domaine quotidien',
      description: 'Complétez 1 domain',
      type: 'combat',
      requirement: {
        action: 'complete_domain',
        target: 1
      },
      rewards: {
        mora: 2500,
        primogens: 15,
        xp: 150
      },
      category: 'advanced'
    },
    {
      id: 'daily_gacha_1',
      name: 'Vœu quotidien',
      description: 'Faites 1 vœu',
      type: 'gacha',
      requirement: {
        action: 'gacha_pull',
        target: 1
      },
      rewards: {
        mora: 500,
        primogens: 5,
        xp: 50
      },
      category: 'basic'
    },
    {
      id: 'daily_gacha_10',
      name: 'Vœux multiples',
      description: 'Faites 10 vœux',
      type: 'gacha',
      requirement: {
        action: 'gacha_pull',
        target: 10
      },
      rewards: {
        mora: 2000,
        primogens: 20,
        xp: 200
      },
      category: 'advanced'
    },
    {
      id: 'daily_expedition_1',
      name: 'Expédition',
      description: 'Lancez 1 expédition',
      type: 'exploration',
      requirement: {
        action: 'start_expedition',
        target: 1
      },
      rewards: {
        mora: 1000,
        primogens: 10,
        xp: 100
      },
      category: 'basic'
    },
    {
      id: 'daily_craft_5',
      name: 'Artisanat',
      description: 'Craft 5 items',
      type: 'crafting',
      requirement: {
        action: 'craft_item',
        target: 5
      },
      rewards: {
        mora: 1500,
        primogens: 15,
        xp: 150
      },
      category: 'advanced'
    },
    {
      id: 'daily_social_chat',
      name: 'Social',
      description: 'Envoyez 10 messages',
      type: 'social',
      requirement: {
        action: 'send_message',
        target: 10
      },
      rewards: {
        mora: 500,
        primogens: 5,
        xp: 50
      },
      category: 'basic'
    },
    {
      id: 'daily_elite_boss',
      name: 'Boss Elite',
      description: 'Vainquez 1 boss weekly',
      type: 'combat',
      requirement: {
        action: 'defeat_weekly_boss',
        target: 1
      },
      rewards: {
        mora: 5000,
        primogens: 40,
        xp: 400
      },
      category: 'elite'
    },
    {
      id: 'daily_spiral_abyss',
      name: 'Spiral Abyss',
      description: 'Complétez 1 étage de Spiral Abyss',
      type: 'combat',
      requirement: {
        action: 'complete_abyss_floor',
        target: 1
      },
      rewards: {
        mora: 8000,
        primogens: 60,
        xp: 600
      },
      category: 'elite'
    }
  ];

  private static readonly WEEKLY_TASKS: WeeklyTask[] = [
    {
      id: 'weekly_raid_3',
      name: 'Raids de guilde',
      description: 'Participez à 3 raids',
      type: 'raid',
      requirement: {
        action: 'participate_raid',
        target: 3
      },
      rewards: {
        mora: 15000,
        primogens: 150,
        fates: 1,
        starglitter: 10
      },
      category: 'normal'
    },
    {
      id: 'weekly_boss_5',
      name: 'Boss hebdomadaires',
      description: 'Vainquez 5 bosses weekly',
      type: 'boss',
      requirement: {
        action: 'defeat_weekly_boss',
        target: 5
      },
      rewards: {
        mora: 20000,
        primogens: 200,
        fates: 2,
        starglitter: 15
      },
      category: 'normal'
    },
    {
      id: 'weekly_domain_10',
      name: 'Domains',
      description: 'Complétez 10 domains',
      type: 'domain',
      requirement: {
        action: 'complete_domain',
        target: 10
      },
      rewards: {
        mora: 12000,
        primogens: 120,
        fates: 1,
        starglitter: 8
      },
      category: 'normal'
    },
    {
      id: 'weekly_event_3',
      name: 'Événements',
      description: 'Participez à 3 événements',
      type: 'event',
      requirement: {
        action: 'participate_event',
        target: 3
      },
      rewards: {
        mora: 10000,
        primogens: 100,
        fates: 1,
        starglitter: 5
      },
      category: 'normal'
    },
    {
      id: 'weekly_guild_contribution',
      name: 'Contribution guilde',
      description: 'Faites 10000 de contribution',
      type: 'guild',
      requirement: {
        action: 'guild_contribution',
        target: 10000
      },
      rewards: {
        mora: 8000,
        primogens: 80,
        fates: 1,
        starglitter: 5
      },
      category: 'normal'
    },
    {
      id: 'weekly_raid_10',
      name: 'Raids intensifs',
      description: 'Participez à 10 raids',
      type: 'raid',
      requirement: {
        action: 'participate_raid',
        target: 10
      },
      rewards: {
        mora: 30000,
        primogens: 300,
        fates: 3,
        starglitter: 25
      },
      category: 'hard'
    },
    {
      id: 'weekly_boss_15',
      name: 'Chasse aux bosses',
      description: 'Vainquez 15 bosses weekly',
      type: 'boss',
      requirement: {
        action: 'defeat_weekly_boss',
        target: 15
      },
      rewards: {
        mora: 40000,
        primogens: 400,
        fates: 4,
        starglitter: 30
      },
      category: 'hard'
    },
    {
      id: 'weekly_spiral_abyss_36',
      name: 'Spiral Abyss complet',
      description: 'Obtenez 36 étoiles en Spiral Abyss',
      type: 'raid',
      requirement: {
        action: 'get_abyss_stars',
        target: 36
      },
      rewards: {
        mora: 50000,
        primogens: 600,
        fates: 5,
        starglitter: 50
      },
      category: 'extreme'
    }
  ];

  /**
   * Récupère toutes les tâches quotidiennes
   */
  static getDailyTasks(): DailyTask[] {
    return this.DAILY_TASKS;
  }

  /**
   * Récupère les tâches quotidiennes par catégorie
   */
  static getDailyTasksByCategory(category: DailyTask['category']): DailyTask[] {
    return this.DAILY_TASKS.filter(task => task.category === category);
  }

  /**
   * Récupère toutes les tâches hebdomadaires
   */
  static getWeeklyTasks(): WeeklyTask[] {
    return this.WEEKLY_TASKS;
  }

  /**
   * Récupère les tâches hebdomadaires par catégorie
   */
  static getWeeklyTasksByCategory(category: WeeklyTask['category']): WeeklyTask[] {
    return this.WEEKLY_TASKS.filter(task => task.category === category);
  }

  /**
   * Récupère la progression quotidienne d'un utilisateur
   */
  static async getDailyProgress(userId: string): Promise<IUserDailyProgress> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let progress = await UserDailyProgress.findOne({ userId, date: today });

    if (!progress) {
      progress = await UserDailyProgress.create({
        userId,
        date: today,
        completedTasks: [],
        totalPrimogensEarned: 0,
        totalMoraEarned: 0,
        streak: this.calculateStreak(userId)
      });
    }

    return progress;
  }

  /**
   * Récupère la progression hebdomadaire d'un utilisateur
   */
  static async getWeeklyProgress(userId: string): Promise<IUserWeeklyProgress> {
    const now = new Date();
    const weekNumber = this.getWeekNumber(now);
    const year = now.getFullYear();

    let progress = await UserWeeklyProgress.findOne({ userId, weekNumber, year });

    if (!progress) {
      progress = await UserWeeklyProgress.create({
        userId,
        weekNumber,
        year,
        completedTasks: [],
        totalPrimogensEarned: 0,
        totalMoraEarned: 0,
        totalFatesEarned: 0,
        raidCompletions: 0,
        bossCompletions: 0
      });
    }

    return progress;
  }

  /**
   * Complète une tâche quotidienne
   */
  static async completeDailyTask(userId: string, taskId: string): Promise<{
    success: boolean;
    rewards?: DailyTask['rewards'];
    error?: string;
  }> {
    const task = this.DAILY_TASKS.find(t => t.id === taskId);
    if (!task) {
      return { success: false, error: 'Tâche introuvable' };
    }

    const progress = await this.getDailyProgress(userId);

    if (progress.completedTasks.includes(taskId)) {
      return { success: false, error: 'Tâche déjà complétée' };
    }

    // Marquer comme complétée
    progress.completedTasks.push(taskId);
    progress.totalPrimogensEarned += task.rewards.primogens;
    progress.totalMoraEarned += task.rewards.mora;
    await progress.save();

    return { success: true, rewards: task.rewards };
  }

  /**
   * Complète une tâche hebdomadaire
   */
  static async completeWeeklyTask(userId: string, taskId: string): Promise<{
    success: boolean;
    rewards?: WeeklyTask['rewards'];
    error?: string;
  }> {
    const task = this.WEEKLY_TASKS.find(t => t.id === taskId);
    if (!task) {
      return { success: false, error: 'Tâche introuvable' };
    }

    const progress = await this.getWeeklyProgress(userId);

    if (progress.completedTasks.includes(taskId)) {
      return { success: false, error: 'Tâche déjà complétée' };
    }

    // Marquer comme complétée
    progress.completedTasks.push(taskId);
    progress.totalPrimogensEarned += task.rewards.primogens;
    progress.totalMoraEarned += task.rewards.mora;
    progress.totalFatesEarned += task.rewards.fates;

    // Mettre à jour les compteurs spécifiques
    if (task.type === 'raid') {
      progress.raidCompletions += task.requirement.target;
    }
    if (task.type === 'boss') {
      progress.bossCompletions += task.requirement.target;
    }

    await progress.save();

    return { success: true, rewards: task.rewards };
  }

  /**
   * Accorde les récompenses quotidiennes
   */
  static async grantDailyRewards(user: IUser): Promise<{
    mora: number;
    primogens: number;
    xp: number;
    tasksCompleted: number;
  }> {
    const progress = await this.getDailyProgress(user.discordId);

    let totalMora = 0;
    let totalPrimogens = 0;
    let totalXP = 0;

    progress.completedTasks.forEach(taskId => {
      const task = this.DAILY_TASKS.find(t => t.id === taskId);
      if (task) {
        totalMora += task.rewards.mora;
        totalPrimogens += task.rewards.primogens;
        totalXP += task.rewards.xp;
      }
    });

    economyService.addResource(user, 'mora', totalMora, 'Récompenses quotidiennes');
    economyService.addResource(user, 'primogens', totalPrimogens, 'Récompenses quotidiennes');

    return {
      mora: totalMora,
      primogens: totalPrimogens,
      xp: totalXP,
      tasksCompleted: progress.completedTasks.length
    };
  }

  /**
   * Accorde les récompenses hebdomadaires
   */
  static async grantWeeklyRewards(user: IUser): Promise<{
    mora: number;
    primogens: number;
    fates: number;
    starglitter: number;
    tasksCompleted: number;
  }> {
    const progress = await this.getWeeklyProgress(user.discordId);

    let totalMora = 0;
    let totalPrimogens = 0;
    let totalFates = 0;
    let totalStarglitter = 0;

    progress.completedTasks.forEach(taskId => {
      const task = this.WEEKLY_TASKS.find(t => t.id === taskId);
      if (task) {
        totalMora += task.rewards.mora;
        totalPrimogens += task.rewards.primogens;
        totalFates += task.rewards.fates;
        totalStarglitter += task.rewards.starglitter;
      }
    });

    economyService.addResource(user, 'mora', totalMora, 'Récompenses hebdomadaires');
    economyService.addResource(user, 'primogens', totalPrimogens, 'Récompenses hebdomadaires');
    economyService.addResource(user, 'fatesIntertwined', totalFates, 'Récompenses hebdomadaires');
    economyService.addResource(user, 'starglitter', totalStarglitter, 'Récompenses hebdomadaires');

    return {
      mora: totalMora,
      primogens: totalPrimogens,
      fates: totalFates,
      starglitter: totalStarglitter,
      tasksCompleted: progress.completedTasks.length
    };
  }

  /**
   * Réinitialise les tâches quotidiennes
   */
  static async resetDailyTasks(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await UserDailyProgress.deleteOne({ userId, date: today });
  }

  /**
   * Réinitialise les tâches hebdomadaires
   */
  static async resetWeeklyTasks(userId: string): Promise<void> {
    const now = new Date();
    const weekNumber = this.getWeekNumber(now);
    const year = now.getFullYear();

    await UserWeeklyProgress.deleteOne({ userId, weekNumber, year });
  }

  /**
   * Calcule le streak de connexion
   */
  private static calculateStreak(userId: string): number {
    // TODO: Implémenter avec MongoDB pour persister les streaks
    return 0;
  }

  /**
   * Récupère le numéro de semaine
   */
  private static getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Récupère les tâches quotidiennes disponibles
   */
  static async getAvailableDailyTasks(userId: string): Promise<DailyTask[]> {
    const progress = await this.getDailyProgress(userId);
    return this.DAILY_TASKS.filter(task => !progress.completedTasks.includes(task.id));
  }

  /**
   * Récupère les tâches hebdomadaires disponibles
   */
  static async getAvailableWeeklyTasks(userId: string): Promise<WeeklyTask[]> {
    const progress = await this.getWeeklyProgress(userId);
    return this.WEEKLY_TASKS.filter(task => !progress.completedTasks.includes(task.id));
  }

  /**
   * Récupère le pourcentage de complétion quotidienne
   */
  static async getDailyCompletionPercentage(userId: string): Promise<number> {
    const progress = await this.getDailyProgress(userId);
    const totalTasks = this.DAILY_TASKS.length;
    const completedTasks = progress.completedTasks.length;
    return Math.floor((completedTasks / totalTasks) * 100);
  }

  /**
   * Récupère le pourcentage de complétion hebdomadaire
   */
  static async getWeeklyCompletionPercentage(userId: string): Promise<number> {
    const progress = await this.getWeeklyProgress(userId);
    const totalTasks = this.WEEKLY_TASKS.length;
    const completedTasks = progress.completedTasks.length;
    return Math.floor((completedTasks / totalTasks) * 100);
  }

  /**
   * Vérifie si toutes les tâches quotidiennes sont complétées
   */
  static async isDailyComplete(userId: string): Promise<boolean> {
    const progress = await this.getDailyProgress(userId);
    return progress.completedTasks.length === this.DAILY_TASKS.length;
  }

  /**
   * Vérifie si toutes les tâches hebdomadaires sont complétées
   */
  static async isWeeklyComplete(userId: string): Promise<boolean> {
    const progress = await this.getWeeklyProgress(userId);
    return progress.completedTasks.length === this.WEEKLY_TASKS.length;
  }

  /**
   * Récupère le temps restant avant la réinitialisation quotidienne
   */
  static getTimeUntilDailyReset(): {
    hours: number;
    minutes: number;
    seconds: number;
  } {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  }

  /**
   * Récupère le temps restant avant la réinitialisation hebdomadaire
   */
  static getTimeUntilWeeklyReset(): {
    days: number;
    hours: number;
    minutes: number;
  } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);

    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);

    const diff = nextMonday.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  }

  /**
   * Récupère les récompenses totales quotidiennes possibles
   */
  static getTotalDailyRewards(): {
    mora: number;
    primogens: number;
    xp: number;
  } {
    return {
      mora: this.DAILY_TASKS.reduce((sum, task) => sum + task.rewards.mora, 0),
      primogens: this.DAILY_TASKS.reduce((sum, task) => sum + task.rewards.primogens, 0),
      xp: this.DAILY_TASKS.reduce((sum, task) => sum + task.rewards.xp, 0)
    };
  }

  /**
   * Récupère les récompenses totales hebdomadaires possibles
   */
  static getTotalWeeklyRewards(): {
    mora: number;
    primogens: number;
    fates: number;
    starglitter: number;
  } {
    return {
      mora: this.WEEKLY_TASKS.reduce((sum, task) => sum + task.rewards.mora, 0),
      primogens: this.WEEKLY_TASKS.reduce((sum, task) => sum + task.rewards.primogens, 0),
      fates: this.WEEKLY_TASKS.reduce((sum, task) => sum + task.rewards.fates, 0),
      starglitter: this.WEEKLY_TASKS.reduce((sum, task) => sum + task.rewards.starglitter, 0)
    };
  }
}

export const activityLoopService = ActivityLoopService;
