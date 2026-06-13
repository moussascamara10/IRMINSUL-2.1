// Mock Redis (à remplacer par vrai Redis)
const redis = {
  async setex(key: string, ttl: number, value: string): Promise<void> {
    // TODO: Implémenter vrai Redis
  },
  async get(key: string): Promise<string | null> {
    // TODO: Implémenter vrai Redis
    return null;
  },
  async del(key: string): Promise<void> {
    // TODO: Implémenter vrai Redis
  }
};

interface ICooldownResult {
  onCooldown: boolean;
  remainingTime?: number;
}

export class RedisCooldown {
  /**
   * Vérifie si un utilisateur est en cooldown pour une action donnée
   * @param userId ID de l'utilisateur Discord
   * @param action Identifiant de l'action (ex: 'voeux_single', 'voeux_ten', 'boss_weekly')
   * @param cooldownSeconds Durée du cooldown en secondes
   * @returns { onCooldown, remainingTime }
   */
  static async checkCooldown(userId: string, action: string, cooldownSeconds: number): Promise<ICooldownResult> {
    const key = `cooldown:${action}:${userId}`;
    const remaining = await redis.get(key);

    if (remaining) {
      const remainingTime = parseInt(remaining, 10);
      return { onCooldown: true, remainingTime };
    }

    return { onCooldown: false };
  }

  /**
   * Définit un cooldown pour un utilisateur
   * @param userId ID de l'utilisateur Discord
   * @param action Identifiant de l'action
   * @param cooldownSeconds Durée du cooldown en secondes
   */
  static async setCooldown(userId: string, action: string, cooldownSeconds: number): Promise<void> {
    const key = `cooldown:${action}:${userId}`;
    await redis.setex(key, cooldownSeconds, String(cooldownSeconds));
  }

  /**
   * Supprime un cooldown (pour les admins ou tests)
   * @param userId ID de l'utilisateur Discord
   * @param action Identifiant de l'action
   */
  static async clearCooldown(userId: string, action: string): Promise<void> {
    const key = `cooldown:${action}:${userId}`;
    await redis.del(key);
  }

  /**
   * Vérifie et définit le cooldown en une seule opération atomique
   * @param userId ID de l'utilisateur Discord
   * @param action Identifiant de l'action
   * @param cooldownSeconds Durée du cooldown en secondes
   * @returns { onCooldown, remainingTime }
   */
  static async checkAndSetCooldown(userId: string, action: string, cooldownSeconds: number): Promise<ICooldownResult> {
    const result = await this.checkCooldown(userId, action, cooldownSeconds);

    if (!result.onCooldown) {
      await this.setCooldown(userId, action, cooldownSeconds);
    }

    return result;
  }
}

// Configuration des cooldowns par commande
export const COMMAND_COOLDOWNS: Record<string, number> = {
  'voeux_single': 3,
  'voeux_ten': 10,
  'boss_weekly': 60,
  'classement': 30,
  'marche_vendre': 30,
  'partager': 600, // 10 minutes
  'combat_attack': 1,
  'invasion_attack': 30
};
