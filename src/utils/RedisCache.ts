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

export class RedisCache {
  /**
   * Récupère un utilisateur depuis le cache Redis
   * @param userId ID de l'utilisateur Discord
   * @returns L'utilisateur en cache ou null
   */
  static async getCachedUser(userId: string): Promise<any | null> {
    const key = `user:${userId}`;
    const data = await redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Met en cache un utilisateur avec un TTL par défaut
   * @param userId ID de l'utilisateur Discord
   * @param userData Données de l'utilisateur
   * @param ttlSeconds Durée de vie en secondes (défaut: 300 = 5 min)
   */
  static async setCachedUser(userId: string, userData: any, ttlSeconds: number = 300): Promise<void> {
    const key = `user:${userId}`;
    await redis.setex(key, ttlSeconds, JSON.stringify(userData));
  }

  /**
   * Récupère une bannière active depuis le cache
   * @param bannerId ID de la bannière
   * @returns La bannière en cache ou null
   */
  static async getCachedBanner(bannerId: string): Promise<any | null> {
    const key = `banner:${bannerId}`;
    const data = await redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Met en cache une bannière active
   * @param bannerId ID de la bannière
   * @param bannerData Données de la bannière
   * @param ttlSeconds Durée de vie en secondes (défaut: 3600 = 1h)
   */
  static async setCachedBanner(bannerId: string, bannerData: any, ttlSeconds: number = 3600): Promise<void> {
    const key = `banner:${bannerId}`;
    await redis.setex(key, ttlSeconds, JSON.stringify(bannerData));
  }

  /**
   * Récupère un classement depuis le cache
   * @param rankingType Type de classement (ex: 'mora', 'pulls', 'ar')
   * @returns Le classement en cache ou null
   */
  static async getCachedRanking(rankingType: string): Promise<any[] | null> {
    const key = `ranking:${rankingType}`;
    const data = await redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Met en cache un classement
   * @param rankingType Type de classement
   * @param rankingData Données du classement
   * @param ttlSeconds Durée de vie en secondes (défaut: 900 = 15 min)
   */
  static async setCachedRanking(rankingType: string, rankingData: any[], ttlSeconds: number = 900): Promise<void> {
    const key = `ranking:${rankingType}`;
    await redis.setex(key, ttlSeconds, JSON.stringify(rankingData));
  }

  /**
   * Invalide le cache d'un utilisateur
   * @param userId ID de l'utilisateur Discord
   */
  static async invalidateUser(userId: string): Promise<void> {
    const key = `user:${userId}`;
    await redis.del(key);
  }

  /**
   * Invalide le cache d'une bannière
   * @param bannerId ID de la bannière
   */
  static async invalidateBanner(bannerId: string): Promise<void> {
    const key = `banner:${bannerId}`;
    await redis.del(key);
  }

  /**
   * Invalide le cache d'un classement
   * @param rankingType Type de classement
   */
  static async invalidateRanking(rankingType: string): Promise<void> {
    const key = `ranking:${rankingType}`;
    await redis.del(key);
  }

  /**
   * Fonction générique pour récupérer depuis le cache avec fallback
   * @param key Clé de cache
   * @param fetcher Fonction pour récupérer les données si pas en cache
   * @param ttlSeconds TTL pour le cache
   * @returns Les données
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = await redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // Si le cache est corrompu, on continue pour récupérer les données fraîches
      }
    }

    const data = await fetcher();
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
    return data;
  }
}
