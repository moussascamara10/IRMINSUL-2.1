import type { IUser } from '../database/models/index.js';

export interface ARXPTable {
  [ar: number]: number;
}

export class ProgressionService {
  private arXPTable: ARXPTable = {
    1: 0,
    2: 275,
    3: 600,
    4: 975,
    5: 1400,
    6: 1875,
    7: 2400,
    8: 2975,
    9: 3600,
    10: 4275,
    11: 5000,
    12: 5775,
    13: 6600,
    14: 7475,
    15: 8400,
    16: 9375,
    17: 10400,
    18: 11475,
    19: 12600,
    20: 13775,
    21: 15000,
    22: 16275,
    23: 17600,
    24: 18975,
    25: 20400,
    26: 21875,
    27: 23400,
    28: 24975,
    29: 26600,
    30: 28275,
    31: 30000,
    32: 31775,
    33: 33600,
    34: 35475,
    35: 37400,
    36: 39375,
    37: 41400,
    38: 43475,
    39: 45600,
    40: 47775,
    41: 50000,
    42: 52275,
    43: 54600,
    44: 56975,
    45: 59400,
    46: 61875,
    47: 64400,
    48: 66975,
    49: 69600,
    50: 72275,
    51: 75000,
    52: 77775,
    53: 80600,
    54: 83475,
    55: 86400,
    56: 89375,
    57: 92400,
    58: 95475,
    59: 98600,
    60: 101775
  };

  addARXP(user: IUser, xp: number): { newAR: number; newXP: number; leveledUp: boolean } {
    const currentAR = user.adventureRank;
    const currentXP = user.adventureRankXP;
    const nextARXP = this.getARXPForLevel(currentAR + 1);

    if (currentAR >= 60) {
      return { newAR: currentAR, newXP: currentXP + xp, leveledUp: false };
    }

    const newXP = currentXP + xp;
    let leveledUp = false;
    let newAR = currentAR;

    if (newXP >= nextARXP) {
      newAR = currentAR + 1;
      leveledUp = true;
    }

    return { newAR, newXP: newXP, leveledUp };
  }

  getARXPForLevel(ar: number): number {
    return this.arXPTable[ar] || 0;
  }

  getARLevelFromXP(xp: number): number {
    let ar = 1;
    for (let i = 1; i <= 60; i++) {
      if (xp >= this.arXPTable[i]) {
        ar = i;
      } else {
        break;
      }
    }
    return ar;
  }

  calculateResinRegen(lastUpdate: Date, currentResin: number): number {
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    const regenAmount = Math.floor(diffMinutes / 8); // 1 résine toutes les 8 minutes
    const maxResin = 200;
    
    return Math.min(currentResin + regenAmount, maxResin);
  }

  canUpgradeWorldLevel(ar: number, currentWL: number): boolean {
    const wlRequirements: { [ar: number]: number } = {
      20: 1,
      25: 2,
      30: 3,
      35: 4,
      40: 5,
      45: 6,
      50: 7,
      55: 8
    };

    return wlRequirements[ar] === currentWL + 1;
  }

  getCharacterXPForLevel(level: number): number {
    const xpTable: { [level: number]: number } = {
      1: 0,
      20: 2465,
      40: 8425,
      50: 12850,
      60: 17885,
      70: 23665,
      80: 30290,
      90: 37865
    };
    return xpTable[level] || 0;
  }

  getCharacterLevelFromXP(xp: number): number {
    const xpTable = [0, 2465, 8425, 12850, 17885, 23665, 30290, 37865];
    for (let i = 0; i < xpTable.length; i++) {
      if (xp >= xpTable[i]) {
        continue;
      }
      return i * 10 + 10;
    }
    return 90;
  }

  getWeaponXPForLevel(level: number): number {
    const xpTable: { [level: number]: number } = {
      1: 0,
      20: 1230,
      40: 4215,
      50: 6425,
      60: 8945,
      70: 11835,
      80: 15145,
      90: 18935
    };
    return xpTable[level] || 0;
  }

  getArtifactXPForLevel(level: number): number {
    return level * 100; // Simplifié
  }
}

export const progressionService = new ProgressionService();
