import type { ICharacterOwned, IWeaponOwned, IGachaHistory, IUser } from '../database/models/index.js';
import { genshinDataService, CharacterData, WeaponData } from './GenshinDataService.js';
import { progressionService } from './ProgressionService.js';
import { economyService } from './EconomyService.js';

export interface GachaResult {
  type: 'character' | 'weapon';
  rarity: number;
  item: CharacterData | WeaponData;
  pity: number;
  guaranteed: boolean;
}

export class GachaEngine {
  private pityStandard: number = 90;
  private pityCharacter: number = 90;
  private pityWeapon: number = 80;
  private softPityStart: number = 74;
  
  private rates = {
    standard: {
      fiveStar: 0.006,
      fourStar: 0.051,
      threeStar: 0.943
    },
    character: {
      fiveStar: 0.006,
      fourStar: 0.051,
      threeStar: 0.943
    },
    weapon: {
      fiveStar: 0.007,
      fourStar: 0.06,
      threeStar: 0.933
    }
  };

  /**
   * Calcule le taux de 5★ avec soft pity dynamique (courbe exponentielle)
   * @param pity Pity actuel
   * @param maxPity Pity maximum
   * @param baseRate Taux de base de 5★
   * @returns T ajusté avec soft pity
   */
  private calculateSoftPityRate(pity: number, maxPity: number, baseRate: number): number {
    if (pity < this.softPityStart) {
      return baseRate;
    }

    // Soft pity: courbe exponentielle de 74 à maxPity
    // À 74: taux = baseRate
    // À maxPity-1: taux ≈ 0.5-0.7 (très élevé)
    // À maxPity: taux = 1.0 (garanti)
    
    if (pity >= maxPity) {
      return 1.0;
    }

    const softPityProgress = (pity - this.softPityStart) / (maxPity - this.softPityStart);
    // Courbe exponentielle: baseRate * (1 + progress^2 * 50)
    const softPityMultiplier = 1 + Math.pow(softPityProgress, 2) * 50;
    const adjustedRate = Math.min(baseRate * softPityMultiplier, 0.7);
    
    return adjustedRate;
  }

  async pullStandard(user: IUser): Promise<GachaResult> {
    const pity = user.gachaPity.standard;
    const guaranteed = user.gachaGuaranteed.standard;
    
    // Ajuster les taux selon l'AR (baisse légère des taux 5★ à haut AR)
    const arModifier = this.getARModifier(user.adventureRank);
    const baseFiveStarRate = this.rates.standard.fiveStar * arModifier;
    // Appliquer le soft pity dynamique
    const adjustedFiveStarRate = this.calculateSoftPityRate(pity, this.pityStandard, baseFiveStarRate);
    
    const roll = Math.random();
    let rarity: number;

    if (pity >= this.pityStandard - 1 || roll < adjustedFiveStarRate) {
      rarity = 5;
    } else if (pity >= 74 || roll < adjustedFiveStarRate + this.rates.standard.fourStar) {
      rarity = 4;
    } else {
      rarity = 3;
    }

    const item = await this.getRandomItem(rarity, 'standard');
    const newPity = rarity === 5 ? 0 : pity + 1;

    return {
      type: rarity === 5 ? 'character' : Math.random() < 0.5 ? 'character' : 'weapon',
      rarity,
      item,
      pity: newPity,
      guaranteed: false
    };
  }

  async pullCharacter(user: IUser, featuredCharacters: string[]): Promise<GachaResult> {
    const pity = user.gachaPity.character;
    const guaranteed = user.gachaGuaranteed.character;
    
    // Ajuster les taux selon l'AR
    const arModifier = this.getARModifier(user.adventureRank);
    const baseFiveStarRate = this.rates.character.fiveStar * arModifier;
    // Appliquer le soft pity dynamique
    const adjustedFiveStarRate = this.calculateSoftPityRate(pity, this.pityCharacter, baseFiveStarRate);
    
    const roll = Math.random();
    let rarity: number;

    if (pity >= this.pityCharacter - 1 || roll < adjustedFiveStarRate) {
      rarity = 5;
    } else if (pity >= 74 || roll < adjustedFiveStarRate + this.rates.character.fourStar) {
      rarity = 4;
    } else {
      rarity = 3;
    }

    let item: CharacterData | WeaponData;
    
    if (rarity === 5) {
      if (guaranteed) {
        item = await this.getRandomFeaturedCharacter(featuredCharacters);
      } else if (Math.random() < 0.5) {
        item = await this.getRandomFeaturedCharacter(featuredCharacters);
      } else {
        item = await this.getRandomCharacter(5);
      }
    } else if (rarity === 4) {
      item = await this.getRandomCharacter(4);
    } else {
      item = await this.getRandomWeapon(3);
    }

    const newPity = rarity === 5 ? 0 : pity + 1;
    const newGuaranteed = rarity === 5 && !guaranteed && !(item as CharacterData).name.includes(featuredCharacters[0]);

    return {
      type: rarity === 5 ? 'character' : 'weapon',
      rarity,
      item,
      pity: newPity,
      guaranteed: newGuaranteed
    };
  }

  async pullWeapon(user: IUser, featuredWeapons: string[]): Promise<GachaResult> {
    const pity = user.gachaPity.weapon;
    const guaranteed = user.gachaGuaranteed.weapon;
    
    // Ajuster les taux selon l'AR
    const arModifier = this.getARModifier(user.adventureRank);
    const baseFiveStarRate = this.rates.weapon.fiveStar * arModifier;
    // Appliquer le soft pity dynamique
    const adjustedFiveStarRate = this.calculateSoftPityRate(pity, this.pityWeapon, baseFiveStarRate);
    
    const roll = Math.random();
    let rarity: number;

    if (pity >= this.pityWeapon - 1 || roll < adjustedFiveStarRate) {
      rarity = 5;
    } else if (pity >= 62 || roll < adjustedFiveStarRate + this.rates.weapon.fourStar) {
      rarity = 4;
    } else {
      rarity = 3;
    }

    let item: CharacterData | WeaponData;
    
    if (rarity === 5) {
      if (guaranteed) {
        item = await this.getRandomFeaturedWeapon(featuredWeapons);
      } else if (Math.random() < 0.75) {
        item = await this.getRandomFeaturedWeapon(featuredWeapons);
      } else {
        item = await this.getRandomWeapon(5);
      }
    } else if (rarity === 4) {
      item = await this.getRandomWeapon(4);
    } else {
      item = await this.getRandomWeapon(3);
    }

    const newPity = rarity === 5 ? 0 : pity + 1;
    const newGuaranteed = rarity === 5 && !guaranteed && !(item as WeaponData).name.includes(featuredWeapons[0]);

    return {
      type: 'weapon',
      rarity,
      item,
      pity: newPity,
      guaranteed: newGuaranteed
    };
  }

  /**
   * Vérifie si l'utilisateur peut faire des pulls
   */
  canAffordPulls(user: IUser, pulls: number, currency: 'primogens' | 'fatesIntertwined' | 'fatesAcquaint'): boolean {
    return economyService.canAffordGacha(user, pulls, currency);
  }

  /**
   * Déduit le coût des pulls
   */
  deductPullCost(user: IUser, pulls: number, currency: 'primogens' | 'fatesIntertwined' | 'fatesAcquaint'): boolean {
    const result = economyService.deductGachaCost(user, pulls, currency);
    return result.success;
  }

  private getARModifier(ar: number): number {
    // Baisse légère des taux 5★ à haut AR pour équilibrer l'économie
    if (ar >= 55) return 0.9;
    if (ar >= 45) return 0.95;
    return 1.0;
  }

  private async getRandomCharacter(rarity: number): Promise<CharacterData> {
    const characters = genshinDataService.getCharactersByRarity(rarity);
    if (characters.length === 0) {
      throw new Error(`Aucun personnage de rareté ${rarity} trouvé`);
    }
    const randomIndex = Math.floor(Math.random() * characters.length);
    return characters[randomIndex];
  }

  private async getRandomWeapon(rarity: number): Promise<WeaponData> {
    const weapons = genshinDataService.getAllWeapons().filter(w => w.rarity === rarity);
    if (weapons.length === 0) {
      throw new Error(`Aucune arme de rareté ${rarity} trouvée`);
    }
    const randomIndex = Math.floor(Math.random() * weapons.length);
    return weapons[randomIndex];
  }

  private async getRandomFeaturedCharacter(featuredCharacters: string[]): Promise<CharacterData> {
    const featured = featuredCharacters
      .map(name => genshinDataService.getCharacter(name))
      .filter(c => c !== undefined) as CharacterData[];
    
    if (featured.length === 0) {
      return await this.getRandomCharacter(5);
    }
    
    const randomIndex = Math.floor(Math.random() * featured.length);
    return featured[randomIndex];
  }

  private async getRandomFeaturedWeapon(featuredWeapons: string[]): Promise<WeaponData> {
    const featured = featuredWeapons
      .map(name => genshinDataService.getWeapon(name))
      .filter(w => w !== undefined) as WeaponData[];
    
    if (featured.length === 0) {
      return await this.getRandomWeapon(5);
    }
    
    const randomIndex = Math.floor(Math.random() * featured.length);
    return featured[randomIndex];
  }

  private async getRandomItem(rarity: number, bannerType: string): Promise<CharacterData | WeaponData> {
    if (bannerType === 'standard' && rarity === 5) {
      // Standard banner 5-star is always a character
      return await this.getRandomCharacter(5);
    }
    
    if (Math.random() < 0.5) {
      return await this.getRandomCharacter(rarity);
    } else {
      return await this.getRandomWeapon(rarity);
    }
  }
}

export const gachaEngine = new GachaEngine();
