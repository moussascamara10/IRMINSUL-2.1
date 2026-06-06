import genshindb from 'genshin-db';

// Configuration de genshin-db pour utiliser le français
// genshin-db utilise des codes de langue spécifiques
genshindb.setOptions({
  queryLanguages: ['French'],
  resultLanguage: 'French'
} as any);

export interface CharacterData {
  id: string;
  name: string;
  fullName: string;
  rarity: number;
  element: string;
  weaponType: string;
  region: string;
  description: string;
  stats: {
    baseHP: number;
    baseATK: number;
    baseDEF: number;
    hpCurve: string;
    atkCurve: string;
    defCurve: string;
  };
  skills: {
    normal: any;
    elemental: any;
    burst: any;
  };
  constellations: any[];
}

export interface WeaponData {
  id: string;
  name: string;
  fullName: string;
  rarity: number;
  type: string;
  baseStats: {
    baseATK: number;
    subStat: string;
    subStatValue: number;
  };
  passiveName: string;
  passiveDesc: string;
}

export interface ArtifactData {
  id: string;
  name: string;
  fullName: string;
  rarity: number;
  set: string;
  slot: string;
  mainStat: string;
  subStats: string[];
}

export interface TalentData {
  id: string;
  name: string;
  type: string;
  description: string;
}

class GenshinDataService {
  private charactersCache: Map<string, CharacterData> = new Map();
  private weaponsCache: Map<string, WeaponData> = new Map();
  private artifactsCache: Map<string, ArtifactData> = new Map();
  private talentsCache: Map<string, TalentData> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Charger tous les personnages
      const characterNames = genshindb.characters('names', { matchCategories: true }) as string[];
      for (const name of characterNames) {
        const charData = genshindb.characters(name);
        if (charData) {
          this.charactersCache.set(name.toLowerCase(), this.formatCharacter(charData));
        }
      }

      // Charger toutes les armes
      const weaponNames = genshindb.weapons('names', { matchCategories: true }) as string[];
      for (const name of weaponNames) {
        const weaponData = genshindb.weapons(name);
        if (weaponData) {
          this.weaponsCache.set(name.toLowerCase(), this.formatWeapon(weaponData));
        }
      }

      // Charger tous les artefacts
      const artifactNames = genshindb.artifacts('names', { matchCategories: true }) as string[];
      for (const name of artifactNames) {
        const artifactData = genshindb.artifacts(name);
        if (artifactData) {
          this.artifactsCache.set(name.toLowerCase(), this.formatArtifact(artifactData));
        }
      }

      // Charger tous les talents
      const talentNames = genshindb.talents('names', { matchCategories: true }) as string[];
      for (const name of talentNames) {
        const talentData = genshindb.talents(name);
        if (talentData) {
          this.talentsCache.set(name.toLowerCase(), this.formatTalent(talentData));
        }
      }

      this.initialized = true;
      console.log(`✅ GenshinDataService initialisé: ${this.charactersCache.size} personnages, ${this.weaponsCache.size} armes, ${this.artifactsCache.size} artefacts, ${this.talentsCache.size} talents`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de GenshinDataService:', error);
      throw error;
    }
  }

  private formatCharacter(data: any): CharacterData {
    return {
      id: data.id || data.name.toLowerCase().replace(/\s+/g, '-'),
      name: data.name,
      fullName: data.fullName || data.name,
      rarity: data.rarity,
      element: data.element,
      weaponType: data.weaponType,
      region: data.region,
      description: data.description || '',
      stats: {
        baseHP: data.stats?.baseHP || 0,
        baseATK: data.stats?.baseATK || 0,
        baseDEF: data.stats?.baseDEF || 0,
        hpCurve: data.stats?.hpCurve || '',
        atkCurve: data.stats?.atkCurve || '',
        defCurve: data.stats?.defCurve || ''
      },
      skills: {
        normal: data.skillTalents?.[0] || {},
        elemental: data.skillTalents?.[1] || {},
        burst: data.skillTalents?.[2] || {}
      },
      constellations: data.constellations || []
    };
  }

  private formatWeapon(data: any): WeaponData {
    return {
      id: data.id || data.name.toLowerCase().replace(/\s+/g, '-'),
      name: data.name,
      fullName: data.fullName || data.name,
      rarity: data.rarity,
      type: data.weaponType,
      baseStats: {
        baseATK: data.baseStats?.baseATK || 0,
        subStat: data.baseStats?.subStat || '',
        subStatValue: data.baseStats?.subStatValue || 0
      },
      passiveName: data.passiveName || '',
      passiveDesc: data.passiveDesc || ''
    };
  }

  private formatArtifact(data: any): ArtifactData {
    return {
      id: data.id || data.name.toLowerCase().replace(/\s+/g, '-'),
      name: data.name,
      fullName: data.fullName || data.name,
      rarity: data.rarity,
      set: data.set,
      slot: data.slot,
      mainStat: data.mainStat || '',
      subStats: data.subStats || []
    };
  }

  private formatTalent(data: any): TalentData {
    return {
      id: data.id || data.name.toLowerCase().replace(/\s+/g, '-'),
      name: data.name,
      type: data.combat || data.passive ? 'combat' : 'passive',
      description: data.description || ''
    };
  }

  // Méthodes publiques pour accéder aux données
  getCharacter(name: string): CharacterData | undefined {
    return this.charactersCache.get(name.toLowerCase());
  }

  getAllCharacters(): CharacterData[] {
    return Array.from(this.charactersCache.values());
  }

  getCharactersByRarity(rarity: number): CharacterData[] {
    return this.getAllCharacters().filter(c => c.rarity === rarity);
  }

  getCharactersByElement(element: string): CharacterData[] {
    return this.getAllCharacters().filter(c => c.element.toLowerCase() === element.toLowerCase());
  }

  getWeapon(name: string): WeaponData | undefined {
    return this.weaponsCache.get(name.toLowerCase());
  }

  getAllWeapons(): WeaponData[] {
    return Array.from(this.weaponsCache.values());
  }

  getWeaponsByType(type: string): WeaponData[] {
    return this.getAllWeapons().filter(w => w.type.toLowerCase() === type.toLowerCase());
  }

  getArtifact(name: string): ArtifactData | undefined {
    return this.artifactsCache.get(name.toLowerCase());
  }

  getAllArtifacts(): ArtifactData[] {
    return Array.from(this.artifactsCache.values());
  }

  getArtifactsBySet(setName: string): ArtifactData[] {
    return this.getAllArtifacts().filter(a => a.set.toLowerCase() === setName.toLowerCase());
  }

  getTalent(name: string): TalentData | undefined {
    return this.talentsCache.get(name.toLowerCase());
  }

  getAllTalents(): TalentData[] {
    return Array.from(this.talentsCache.values());
  }

  // Recherche avec autocomplétion
  searchCharacter(query: string): CharacterData | undefined {
    const lowerQuery = query.toLowerCase();
    for (const [key, value] of this.charactersCache) {
      if (key.includes(lowerQuery) || value.name.toLowerCase().includes(lowerQuery)) {
        return value;
      }
    }
    return undefined;
  }

  searchWeapon(query: string): WeaponData | undefined {
    const lowerQuery = query.toLowerCase();
    for (const [key, value] of this.weaponsCache) {
      if (key.includes(lowerQuery) || value.name.toLowerCase().includes(lowerQuery)) {
        return value;
      }
    }
    return undefined;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const genshinDataService = new GenshinDataService();
