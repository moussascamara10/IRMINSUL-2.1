import type { IUser } from '../database/models/index.js';
import { UserEventProgress } from '../database/models/UserEventProgress.js';
import { economyService } from './EconomyService.js';

type UserEventProgressDoc = any;

export interface EventConfig {
  id: string;
  name: string;
  description: string;
  type: 'limited' | 'seasonal' | 'permanent' | 'special';
  startDate: Date;
  endDate: Date;
  requirements: {
    minAR: number;
    minWorldLevel: number;
    completedQuests?: string[];
  };
  rewards: {
    mora: number;
    primogens: number;
    fates: number;
    exclusiveItems: string[];
  };
  activities: EventActivity[];
  milestones: EventMilestone[];
}

export interface EventActivity {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'one_time' | 'repeatable';
  requirements: {
    action: string;
    target: number;
    timeframe?: number; // en heures
  };
  rewards: {
    eventCurrency: number;
    mora: number;
    primogens: number;
  };
}

export interface EventMilestone {
  points: number;
  rewards: {
    mora: number;
    primogens: number;
    fates: number;
    exclusiveItems: string[];
  };
}

export interface UserEventProgress {
  userId: string;
  eventId: string;
  eventCurrency: number;
  completedActivities: string[];
  claimedMilestones: number[];
  lastActivityDate: Date;
}

export class EventService {
  private static readonly EVENTS: EventConfig[] = [
    {
      id: 'lantern_rite',
      name: 'Fête des Lanternes',
      description: 'Célébrez le Nouvel An avec des lanternes et des feux d\'artifice',
      type: 'seasonal',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-15'),
      requirements: {
        minAR: 10,
        minWorldLevel: 0
      },
      rewards: {
        mora: 50000,
        primogens: 300,
        fates: 2,
        exclusiveItems: ['lantern_rite_wish', 'xiao_character']
      },
      activities: [
        {
          id: 'lantern_release',
          name: 'Lâcher de lanternes',
          description: 'Relâchez 10 lanternes',
          type: 'daily',
          requirements: {
            action: 'release_lantern',
            target: 10,
            timeframe: 24
          },
          rewards: {
            eventCurrency: 50,
            mora: 1000,
            primogens: 10
          }
        },
        {
          id: 'firework_show',
          name: 'Spectacle pyrotechnique',
          description: 'Assistez à 3 spectacles de feux d\'artifice',
          type: 'daily',
          requirements: {
            action: 'watch_fireworks',
            target: 3,
            timeframe: 24
          },
          rewards: {
            eventCurrency: 30,
            mora: 500,
            primogens: 5
          }
        },
        {
          id: 'monster_hunt',
          name: 'Chasse aux monstres',
          description: 'Vainquez 50 monstres',
          type: 'daily',
          requirements: {
            action: 'defeat_monsters',
            target: 50,
            timeframe: 24
          },
          rewards: {
            eventCurrency: 100,
            mora: 2000,
            primogens: 20
          }
        }
      ],
      milestones: [
        {
          points: 500,
          rewards: {
            mora: 5000,
            primogens: 50,
            fates: 1,
            exclusiveItems: ['lantern_rite_wish']
          }
        },
        {
          points: 1000,
          rewards: {
            mora: 10000,
            primogens: 100,
            fates: 1,
            exclusiveItems: ['crown_of_insight']
          }
        },
        {
          points: 2000,
          rewards: {
            mora: 20000,
            primogens: 200,
            fates: 2,
            exclusiveItems: ['xiao_character']
          }
        }
      ]
    },
    {
      id: 'windblume',
      name: 'Fête des Fleurs',
      description: 'Profitez de la musique et des fleurs à Mondstadt',
      type: 'seasonal',
      startDate: new Date('2026-03-15'),
      endDate: new Date('2026-04-05'),
      requirements: {
        minAR: 15,
        minWorldLevel: 1
      },
      rewards: {
        mora: 40000,
        primogens: 250,
        fates: 2,
        exclusiveItems: ['windblume_wish', 'venti_character']
      },
      activities: [
        {
          id: 'flower_collection',
          name: 'Collection de fleurs',
          description: 'Collectez 20 fleurs',
          type: 'daily',
          requirements: {
            action: 'collect_flowers',
            target: 20,
            timeframe: 24
          },
          rewards: {
            eventCurrency: 40,
            mora: 800,
            primogens: 8
          }
        },
        {
          id: 'music_challenge',
          name: 'Défi musical',
          description: 'Complétez 3 défis musicaux',
          type: 'daily',
          requirements: {
            action: 'complete_music_challenge',
            target: 3,
            timeframe: 24
          },
          rewards: {
            eventCurrency: 60,
            mora: 1200,
            primogens: 12
          }
        }
      ],
      milestones: [
        {
          points: 400,
          rewards: {
            mora: 4000,
            primogens: 40,
            fates: 1,
            exclusiveItems: ['windblume_wish']
          }
        },
        {
          points: 800,
          rewards: {
            mora: 8000,
            primogens: 80,
            fates: 1,
            exclusiveItems: ['crown_of_insight']
          }
        },
        {
          points: 1500,
          rewards: {
            mora: 15000,
            primogens: 150,
            fates: 2,
            exclusiveItems: ['venti_character']
          }
        }
      ]
    },
    {
      id: 'hypostatic',
      name: 'Défi Hypostatique',
      description: 'Affrontez des Hypostases pour des récompenses',
      type: 'limited',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      requirements: {
        minAR: 20,
        minWorldLevel: 2
      },
      rewards: {
        mora: 30000,
        primogens: 200,
        fates: 1,
        exclusiveItems: ['hypostatic_code']
      },
      activities: [
        {
          id: 'hypostatic_defeat',
          name: 'Défaite d\'Hypostase',
          description: 'Vainquez 5 Hypostases',
          type: 'weekly',
          requirements: {
            action: 'defeat_hypostasis',
            target: 5,
            timeframe: 168
          },
          rewards: {
            eventCurrency: 100,
            mora: 2000,
            primogens: 20
          }
        },
        {
          id: 'co_op_hypostasis',
          name: 'Hypostase Co-op',
          description: 'Vainquez 3 Hypostases en co-op',
          type: 'weekly',
          requirements: {
            action: 'defeat_hypostasis_coop',
            target: 3,
            timeframe: 168
          },
          rewards: {
            eventCurrency: 150,
            mora: 3000,
            primogens: 30
          }
        }
      ],
      milestones: [
        {
          points: 300,
          rewards: {
            mora: 3000,
            primogens: 30,
            fates: 1,
            exclusiveItems: ['hypostatic_code']
          }
        },
        {
          points: 600,
          rewards: {
            mora: 6000,
            primogens: 60,
            fates: 1,
            exclusiveItems: ['crown_of_insight']
          }
        },
        {
          points: 1000,
          rewards: {
            mora: 10000,
            primogens: 100,
            fates: 2,
            exclusiveItems: ['hypostatic_code_x5']
          }
        }
      ]
    }
  ];

  /**
   * Récupère tous les événements actifs
   */
  static getActiveEvents(): EventConfig[] {
    const now = new Date();
    return this.EVENTS.filter(event => 
      event.startDate <= now && event.endDate >= now
    );
  }

  /**
   * Récupère tous les événements disponibles (inclut futurs)
   */
  static getAllEvents(): EventConfig[] {
    return this.EVENTS;
  }

  /**
   * Récupère un événement spécifique
   */
  static getEvent(eventId: string): EventConfig | undefined {
    return this.EVENTS.find(event => event.id === eventId);
  }

  /**
   * Vérifie si un événement est actif
   */
  static isEventActive(eventId: string): boolean {
    const event = this.getEvent(eventId);
    if (!event) return false;

    const now = new Date();
    return event.startDate <= now && event.endDate >= now;
  }

  /**
   * Vérifie si l'utilisateur peut accéder à un événement
   */
  static canAccessEvent(user: IUser, eventId: string): boolean {
    const event = this.getEvent(eventId);
    if (!event) return false;

    return user.adventureRank >= event.requirements.minAR && 
           user.worldLevel >= event.requirements.minWorldLevel;
  }

  /**
   * Récupère la progression d'un utilisateur pour un événement
   */
  static async getUserProgress(userId: string, eventId: string): Promise<UserEventProgressDoc> {
    let progress = await UserEventProgress.findOne({ userId, eventId });

    if (!progress) {
      progress = await UserEventProgress.create({
        userId,
        eventId,
        eventCurrency: 0,
        completedActivities: [],
        claimedMilestones: [],
        lastActivityDate: new Date()
      });
    }

    return progress as UserEventProgressDoc;
  }

  /**
   * Complète une activité d'événement
   */
  static async completeActivity(userId: string, eventId: string, activityId: string): Promise<{
    success: boolean;
    currencyEarned: number;
    moraEarned: number;
    primogensEarned: number;
  }> {
    const event = this.getEvent(eventId);
    if (!event || !this.isEventActive(eventId)) {
      return { success: false, currencyEarned: 0, moraEarned: 0, primogensEarned: 0 };
    }

    const activity = event.activities.find(a => a.id === activityId);
    if (!activity) {
      return { success: false, currencyEarned: 0, moraEarned: 0, primogensEarned: 0 };
    }

    const progress = await this.getUserProgress(userId, eventId);

    // Vérifier si l'activité a déjà été complétée (pour one_time)
    if (activity.type === 'one_time' && progress.completedActivities.includes(activityId)) {
      return { success: false, currencyEarned: 0, moraEarned: 0, primogensEarned: 0 };
    }

    // Ajouter la récompense
    progress.eventCurrency += activity.rewards.eventCurrency;
    progress.completedActivities.push(activityId);
    progress.lastActivityDate = new Date();
    await progress.save();

    return {
      success: true,
      currencyEarned: activity.rewards.eventCurrency,
      moraEarned: activity.rewards.mora,
      primogensEarned: activity.rewards.primogens
    };
  }

  /**
   * Réclame un milestone d'événement
   */
  static async claimMilestone(userId: string, eventId: string, milestonePoints: number): Promise<{
    success: boolean;
    rewards: {
      mora: number;
      primogens: number;
      fates: number;
      exclusiveItems: string[];
    };
  }> {
    const event = this.getEvent(eventId);
    if (!event) {
      return { success: false, rewards: { mora: 0, primogens: 0, fates: 0, exclusiveItems: [] } };
    }

    const progress = await this.getUserProgress(userId, eventId);

    // Vérifier si le milestone a déjà été réclamé
    if (progress.claimedMilestones.includes(milestonePoints)) {
      return { success: false, rewards: { mora: 0, primogens: 0, fates: 0, exclusiveItems: [] } };
    }

    // Vérifier si l'utilisateur a assez de points
    if (progress.eventCurrency < milestonePoints) {
      return { success: false, rewards: { mora: 0, primogens: 0, fates: 0, exclusiveItems: [] } };
    }

    const milestone = event.milestones.find(m => m.points === milestonePoints);
    if (!milestone) {
      return { success: false, rewards: { mora: 0, primogens: 0, fates: 0, exclusiveItems: [] } };
    }

    // Marquer comme réclamé
    progress.claimedMilestones.push(milestonePoints);
    await progress.save();

    return {
      success: true,
      rewards: milestone.rewards
    };
  }

  /**
   * Réinitialise les activités quotidiennes
   */
  static async resetDailyActivities(userId: string, eventId: string): Promise<void> {
    const event = this.getEvent(eventId);
    if (!event) return;

    const progress = await this.getUserProgress(userId, eventId);
    const dailyActivities = event.activities.filter(a => a.type === 'daily');

    progress.completedActivities = progress.completedActivities.filter(
      (id: string) => !dailyActivities.find(a => a.id === id)
    );
    await progress.save();
  }

  /**
   * Réinitialise les activités hebdomadaires
   */
  static async resetWeeklyActivities(userId: string, eventId: string): Promise<void> {
    const event = this.getEvent(eventId);
    if (!event) return;

    const progress = await this.getUserProgress(userId, eventId);
    const weeklyActivities = event.activities.filter(a => a.type === 'weekly');

    progress.completedActivities = progress.completedActivities.filter(
      (id: string) => !weeklyActivities.find(a => a.id === id)
    );
    await progress.save();
  }

  /**
   * Récupère les événements à venir
   */
  static getUpcomingEvents(): EventConfig[] {
    const now = new Date();
    return this.EVENTS.filter(event => event.startDate > now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  /**
   * Récupère les événements terminés
   */
  static getPastEvents(): EventConfig[] {
    const now = new Date();
    return this.EVENTS.filter(event => event.endDate < now)
      .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
  }

  /**
   * Calcule le temps restant pour un événement
   */
  static getEventTimeRemaining(eventId: string): {
    days: number;
    hours: number;
    minutes: number;
    totalSeconds: number;
  } | null {
    const event = this.getEvent(eventId);
    if (!event) return null;

    const now = new Date();
    const remaining = event.endDate.getTime() - now.getTime();
    
    if (remaining <= 0) {
      return { days: 0, hours: 0, minutes: 0, totalSeconds: 0 };
    }

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    return {
      days,
      hours,
      minutes,
      totalSeconds: Math.floor(remaining / 1000)
    };
  }

  /**
   * Récupère le prochain milestone disponible
   */
  static async getNextMilestone(userId: string, eventId: string): Promise<EventMilestone | null> {
    const event = this.getEvent(eventId);
    if (!event) return null;

    const progress = await this.getUserProgress(userId, eventId);

    for (const milestone of event.milestones) {
      if (!progress.claimedMilestones.includes(milestone.points)) {
        return milestone;
      }
    }

    return null;
  }

  /**
   * Récupère le pourcentage de progression vers le prochain milestone
   */
  static async getMilestoneProgress(userId: string, eventId: string): Promise<{
    current: number;
    target: number;
    percentage: number;
  }> {
    const nextMilestone = await this.getNextMilestone(userId, eventId);
    const progress = await this.getUserProgress(userId, eventId);

    if (!nextMilestone) {
      return {
        current: progress.eventCurrency,
        target: progress.eventCurrency,
        percentage: 100
      };
    }

    const percentage = Math.min(100, (progress.eventCurrency / nextMilestone.points) * 100);

    return {
      current: progress.eventCurrency,
      target: nextMilestone.points,
      percentage: Math.floor(percentage)
    };
  }
}

export const eventService = EventService;
