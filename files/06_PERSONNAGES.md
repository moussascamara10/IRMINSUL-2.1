# IRMINSUL V2 — 06. PERSONNAGES

> Version de conception : 2.0.0 | Statut : Phase Architecturale

---

## ANALYSE PRÉALABLE

### Risques liés aux personnages
- **Bloat d'inventaire** : +70 personnages dans Genshin → affichage difficile sur Discord → Solution : pagination intelligente, filtres multiples, tri par fréquence d'utilisation
- **Déséquilibre méta** : quelques personnages ultra-dominants → Solution : buffs de bénédiction de l'Abîme pour promouvoir la diversité
- **Constellations pay-to-win** : C6 trop puissant via gacha → Solution : C6 uniquement cosmétique pour les persos 5★ hors combat abîme
- **Inflation d'XP books** : trop faciles à farmer = progression triviale → voir équilibre économique

---

## 1. CATALOGUE DES PERSONNAGES IMPLÉMENTÉS

### 1.1 Personnages 5★ — Phase MVP (Version 1.0)

```
MONDSTADT:
──────────
Jean         | Anémo  | Épée      | Healer/Support
Diluc        | Pyro   | Claymore  | DPS
Venti        | Anémo  | Arc       | Support/CC
Klee         | Pyro   | Catalyseur| DPS
Albedo       | Géo    | Épée      | Sub-DPS/Support
Eula         | Cryo   | Claymore  | DPS Physique
Mona         | Hydro  | Catalyseur| Support/Sub-DPS
Keqing       | Électro| Épée      | DPS

LIYUE:
──────
Zhongli      | Géo    | Lance     | Support/Shielder
Ganyu        | Cryo   | Arc       | DPS
Xiao         | Anémo  | Lance     | DPS
Ningguang    | Géo    | Catalyseur| DPS/Support
Hu Tao       | Pyro   | Lance     | DPS
Ayaka        | Cryo   | Épée      | DPS
Kokomi       | Hydro  | Catalyseur| Healer
Kazuha       | Anémo  | Épée      | Support

INAZUMA:
────────
Raiden Shogun| Électro| Lance     | DPS/Support
Yoimiya      | Pyro   | Arc       | DPS
Itto         | Géo    | Claymore  | DPS
Shenhe       | Cryo   | Lance     | Support Cryo
Yae Miko     | Électro| Catalyseur| Sub-DPS
Gorou        | Géo    | Arc       | Support Géo
Kokomi       | Hydro  | Catalyseur| Healer/Sub-DPS

SUMERU:
───────
Tighnari     | Dendro | Arc       | DPS
Nahida       | Dendro | Catalyseur| Support
Alhaitham    | Dendro | Épée      | DPS
Wanderer     | Anémo  | Catalyseur| DPS
Dehya        | Pyro   | Claymore  | DPS/Tank
Nilou        | Hydro  | Épée      | Support Floraison
Cyno         | Électro| Lance     | DPS

FONTAINE:
─────────
Neuvillette  | Hydro  | Catalyseur| DPS
Wriothesley  | Cryo   | Gants     | DPS
Furina       | Hydro  | Épée      | Support
Navia        | Géo    | Claymore  | DPS
Lynette      | Anémo  | Épée      | Support
Lyney        | Pyro   | Arc       | DPS

NATLAN (partiels):
──────────────────
Mualani      | Hydro  | Catalyseur| DPS
Kinich       | Dendro | Claymore  | DPS
Xilonen      | Géo    | Épée      | Support
```

### 1.2 Personnages 4★ — Phase MVP

```
MONDSTADT:
  Amber (Pyro/Arc), Barbara (Hydro/Catalyseur), Kaeya (Cryo/Épée)
  Fischl (Électro/Arc), Bennett (Pyro/Épée), Noelle (Géo/Claymore)
  Razor (Électro/Claymore), Sucrose (Anémo/Catalyseur), Lisa (Électro/Catalyseur)

LIYUE:
  Xingqiu (Hydro/Épée), Beidou (Électro/Claymore), Xiangling (Pyro/Lance)
  Ningguang (Géo/Catalyseur), Chongyun (Cryo/Claymore), Yanfei (Pyro/Catalyseur)
  Yelan (Hydro/Arc), Shinobu (Électro/Épée), Sayu (Anémo/Claymore)
  Thoma (Pyro/Lance), Yun Jin (Géo/Lance), Xinyan (Pyro/Claymore)

INAZUMA:
  Heizou (Anémo/Gants), Collei (Dendro/Arc), Dori (Électro/Claymore)
  Layla (Cryo/Épée), Faruzan (Anémo/Arc), Kaveh (Dendro/Claymore)
  Kirara (Dendro/Épée), Chevreuse (Pyro/Lance), Charlotte (Cryo/Catalyseur)

FONTAINE/NATLAN:
  Freminet (Cryo/Claymore), Clorinde (Électro/Épée), Sigewinne (Hydro/Arc)
  Emilie (Dendro/Lance), Ororon (Électro/Arc), Chiori (Géo/Épée)
```

---

## 2. STRUCTURE D'UN PERSONNAGE (Fiche Technique)

### 2.1 Fiche Complète d'un Personnage 5★ — Exemple : Hu Tao

```
╔══════════════════════════════════════════════════════════════╗
║  🔥 HU TAO ★★★★★  Directrice des Pompes Funèbres            ║
║  Élément: Pyro | Arme: Lance | Région: Liyue                ║
╠══════════════════════════════════════════════════════════════╣
║  NIVEAU: 90/90 | ASCENSION: 6/6 | CONSTELLATION: C0         ║
╠═══════════════════════════════╦══════════════════════════════╣
║  STATISTIQUES FINALES         ║  CONSTELLATIONS              ║
║  ─────────────────────        ║  ─────────────               ║
║  HP:        39,073            ║  C1 ○ Fleur Papillon ...     ║
║  ATK:        674              ║  C2 ○ Tournoiement ...       ║
║  DEF:        876              ║  C3 ● Gui du Saule [LV 3]   ║
║  CRIT Rate:  72.4%            ║  C4 ○ Vents de Papier ...    ║
║  CRIT DMG:  214.2%            ║  C5 ○ Guide ...              ║
║  EM:          88              ║  C6 ○ Souvenir Éternel ...   ║
║  ER:         103%             ║                              ║
║  Pyro DMG:   61.6%            ║  TALENTS                     ║
╠═══════════════════════════════╣  ─────────                   ║
║  ÉQUIPEMENT                   ║  Attaque: ★★★★★★★★★★ 10    ║
║  ────────────                 ║  Compéte: ★★★★★★★★★★ 10    ║
║  Bâton de Homa (5★) R1        ║  Burst:   ★★★★★★★★★★  9    ║
║  🌸 Sang du Passé +20         ║                              ║
║  🪶 Fleur Pyro Crit +20       ║  AMITIÉ: ██████████ 10/10   ║
║  ⏳ Sables HP% +20             ╚══════════════════════════════╣
║  🏆 Gobelet Pyro% +20         ║  Obtenu le: 01/01/2025       ║
║  👑 Diadème CRIT +20          ║  Source: Gacha (Bannière 3.0)║
╚═══════════════════════════════╩══════════════════════════════╝
```

### 2.2 Données de Combat Calculées

```javascript
// Calcul des stats finales (service ProgressionService)
function calculateFinalStats(character, weapon, artifacts) {
  const base = {
    hp: character.baseHp * hpScaling[character.level],
    atk: character.baseAtk * atkScaling[character.level] + weapon.baseAtk,
    def: character.baseDef * defScaling[character.level],
  };

  const bonuses = {
    hp_percent: 0,
    atk_percent: 0,
    def_percent: 0,
    crit_rate: 5,      // Base 5%
    crit_dmg: 50,      // Base 50%
    elemental_mastery: 0,
    energy_recharge: 100, // Base 100%
    elemental_bonus: character.ascensionStat === 'elemental_bonus' 
      ? character.ascensionStatValue : 0,
    healing_bonus: 0,
  };

  // Appliquer weapon sub-stat
  bonuses[weapon.subStatType] += weapon.subStatValue;

  // Appliquer ascension stat du perso
  if (character.ascensionStat !== 'elemental_bonus') {
    bonuses[character.ascensionStat] += character.ascensionStatValue;
  }

  // Appliquer tous les artefacts
  for (const artifact of artifacts) {
    bonuses[artifact.mainStat] += artifact.mainStatValue;
    for (const sub of artifact.subStats) {
      bonuses[sub.stat] += sub.value;
    }
  }

  // Appliquer set bonuses
  const setBonus = calculateSetBonus(artifacts);
  mergeBonus(bonuses, setBonus);

  return {
    hp: base.hp * (1 + bonuses.hp_percent / 100),
    atk: base.atk * (1 + bonuses.atk_percent / 100),
    def: base.def * (1 + bonuses.def_percent / 100),
    critRate: Math.min(bonuses.crit_rate, 100),
    critDmg: bonuses.crit_dmg,
    elementalMastery: bonuses.elemental_mastery,
    energyRecharge: bonuses.energy_recharge,
    elementalBonus: bonuses[`${character.element}_bonus`] || bonuses.elemental_bonus,
    healingBonus: bonuses.healing_bonus,
  };
}
```

---

## 3. SYSTÈME D'INVENTAIRE

### 3.1 Organisation de l'Inventaire

```
AFFICHAGE (/inventaire):
─────────────────────────
Grille de personnages — 12 par page

Filtres disponibles (boutons):
  [🔥 Pyro] [💧 Hydro] [❄️ Cryo] [⚡ Électro]
  [💨 Anémo] [🪨 Géo]  [🌿 Dendro] [⭐ 5★] [✨ 4★]
  [📌 Favoris] [🆕 Récents]

Tri disponibles (menu déroulant):
  - Par rareté (5★ → 4★ → 3★)
  - Par niveau (plus haut → plus bas)
  - Par constellation (C6 → C0)
  - Par élément
  - Par acquisition (récent → ancien)
  - Par utilisation (dernière date de combat)

Carte de personnage dans la grille:
  ┌───────────┐
  │ [Image]   │
  │ Hu Tao    │
  │ Lv.90 ★×5│
  │ C0 | ❤️  │
  └───────────┘
```

### 3.2 Actions sur un Personnage

```
Boutons disponibles sur la fiche d'un personnage:

[⬆️ Améliorer]     → Ouvre menu amélioration (XP/Ascension/Talents)
[🔒 Verrouiller]   → Empêche destruction accidentelle
[⭐ Favori]        → Épingle en haut de l'inventaire
[👥 Équipe]        → Voir dans quelle équipe il est placé
[📊 Stats Détail]  → Afficher toutes les stats calculées
[💎 Artefacts]     → Voir/modifier les artefacts équipés
[🗡️ Arme]         → Voir/modifier l'arme équipée
[❤️ Amitié]        → Voir progression amitié + lore
[🌟 Constellations] → Gérer les constellations
```

---

## 4. SYSTÈME D'ÉQUIPES

### 4.1 Équipes Disponibles

```
Le joueur dispose de 6 emplacements d'équipe:

ÉQUIPE 1-4: Équipes standards (disponibles pour tous les combats)
ÉQUIPE ABÎME A: Première moitié de l'Abîme Spiralé
ÉQUIPE ABÎME B: Deuxième moitié de l'Abîme Spiralé

Chaque équipe: 4 emplacements de personnages

Équipe active (/equipe voir):
╔═════════════════════════════════════╗
║  🗡️ ÉQUIPE 1 (Active)              ║
╠══════════════╦══════════════════════╣
║ [Hu Tao]     ║ [Xingqiu]            ║
║ 🔥 Lv.90    ║ 💧 Lv.80             ║
║ Lance 5★     ║ Épée 4★              ║
╠══════════════╬══════════════════════╣
║ [Yelan]      ║ [Zhongli]            ║
║ 💧 Lv.80    ║ 🪨 Lv.90             ║
║ Arc 5★       ║ Lance 5★             ║
╚══════════════╩══════════════════════╝
[🔄 Modifier] [⚡ Synergies] [📊 Stats équipe]
```

### 4.2 Calcul des Synergies d'Équipe

```
Le système analyse automatiquement les synergies:

SYNERGIES RÉPERTORIÉES:
  Vaporisation (Pyro + Hydro dans l'équipe): +15% DMG Pyro et Hydro
  Permafreeze (Cryo + Hydro + Anémo): +20% DMG Cryo, ennemis congelés +20%
  Hypercarry (1 DPS + 3 support): +10% DMG DPS si 3 supports dédiés
  Mono-élément (4 persos même élément): +20% résistance, -15% DMG
  Double Géo: +15% DMG total si shield actif
  Electro-Charged (Hydro + Électro): DoT +25%
  Dendro Core (Dendro + Hydro + Électro): Floraison +30%
  Anémo Support (Anémo + éléments variés): Virility/groupement +20%

Affichage dans le profil de l'équipe:
  ✅ Vaporisation Optimale (Pyro + Hydro × 2)
  ✅ Support Anémo (Kazuha)
  ⚠️ Pas de Healer (risque en AR50+)
```

### 4.3 Règles de Composition

```
Règles imposées:
  - Un personnage ne peut être dans 2 équipes simultanément
    (sauf équipes Abîme A/B → personnages différents obligatoires)
  - Un personnage en expédition ne peut pas être en équipe active
  - Un personnage à 0 HP ne peut pas combattre (soins entre combats)
  - Le Voyageur (personnage de départ) peut toujours être retiré/ajouté

Recommandation automatique (/equipe recommander):
  Le bot analyse l'inventaire et recommande une composition optimale
  basée sur les tiers lists publiques et les synergies
```

---

## 5. CONSTELLATIONS

### 5.1 Mécanisme d'Obtention

```
Pour débloquer une constellation:
  - Obtenir le même personnage en double via gacha
  - La copie en double est automatiquement convertie en +1 constellation
  - Pour les 5★: chaque doublon = +1 constellation (C1 → C2 → ... → C6)
  - Pour les 4★: si déjà C6, les doublons → 5 Starglitter chacun

Coût approximatif pour C6 d'un 5★:
  7 copies du même 5★ → 7 × (90 pulls en moyenne) = ~630 pulls
  En Primogens: 630 × 160 = 100,800 Primogens
  → Système de pity atténue légèrement ce coût

Coût pour C6 d'un 4★:
  7 copies → ~70 pulls (taux 4★ bien plus élevé)
  Si featured sur bannière: ~35 pulls
```

### 5.2 Effets des Constellations par Niveau

```
PHILOSOPHIE DES CONSTELLATIONS:
C1 : Petit bonus (QoL, +1 charge compétence, etc.)
C2 : Bon bonus (effet notable, +15-20% DMG ou utilité)
C4 : Variable (souvent C4 est "meh" comparé aux autres)
C6 : Transformation du kit (souvent cassé, surtout pour les supports)

EXEMPLES CONCRETS IMPLÉMENTÉS:

HU TAO C1 → Parade Papillon: Charge compétence ×2 (F2P-friendly)
HU TAO C2 → Sépulture Royale: Chaque ennemi absorbé +3.33% DMG Pyro max
HU TAO C4 → Bouquet de Fleurs Folles: ATK normale au sol crée fleurs explosives
HU TAO C6 → Souvenir Éternel: Si HP<25%, immunité mort une fois par combat
              Hu Tao ne peut pas mourir si elle a encore 1 HP → invincible une fois

ZHONGLI C1 → Jade Impérial: Jade Shield couvre toute l'équipe
ZHONGLI C2 → Flux du Rocher: Burst zone inflige dégâts continus × 2
ZHONGLI C4 → Contemplation: Stèles de Jade × 2
ZHONGLI C6 → Chrysos: Bourgeon Vide absorbe tous les éléments + blindage Max

VENTI C1 → Ode du Vent Libéré: Burst aspire ennemis flottants aussi
VENTI C2 → Hymne Céleste: Réduit résistance élémentaire -12% des ennemis
VENTI C4 → Vent Salvateur: Burst charge Énergie alliés +15
VENTI C6 → Ode du Seigneur des Vents: Absorption d'élément → tous les alliés +120 EM

BENNETT C1 → Grand Exploration: Burst ne nécessite plus HP < 70% pour ATK bonus
BENNETT C6 → Fire Engulfing Vision: Burst infuse Pyro au perso actif dans la zone
```

### 5.3 Interface des Constellations

```
Embed constellation (/constellation <perso>):

🌟 CONSTELLATIONS — Hu Tao
──────────────────────────────────────────────────────
⬡ C1  ● DÉBLOQUÉE  "Parade Papillon"
       → Renforce Danse du Feu Ensorcelant de 1 charge

⬡ C2  ● DÉBLOQUÉE  "Sépulture Royale"
       → Chaque ennemi absorbé en Mode Papillon: +3.33% Pyro DMG

⬡ C3  ○ VERROUILLÉE "Guide de Mondépart"
       → +3 niveaux à Danse du Feu Ensorcelant (max 15)

⬡ C4  ○ VERROUILLÉE "Bouquet de Fleurs Folles"
       → [Description C4]

⬡ C5  ○ VERROUILLÉE "Spectacle Éblouissant"
       → +3 niveaux au Souffle du Papillon Déchu (max 15)

⬡ C6  ○ VERROUILLÉE "Souvenir Éternel ★"
       → Immunité mort conditionnelle

Progression: C2 / C6
Copies en stock: 0 (besoin de 1 copie pour C3)

[🎰 Aller à la Bannière] [📦 Voir Stock Copies]
```

---

## 6. AMÉLIORATION DES PERSONNAGES

### 6.1 Menu d'Amélioration Complet

```
/ameliorer personnage Hu Tao → Menu principal:

┌─────────────────────────────────────────────────┐
│  ⬆️ AMÉLIORER — Hu Tao (Lv.75 → 80)            │
├─────────────────────────────────────────────────┤
│  [XP]  Donner des Livres d'XP                   │
│        Livres Épopée: 15/16 requis ✅            │
│        Livres Mémo: 0/4 requis ❌               │
│        Mora: 102,000 / 200,000 ❌               │
│        → Manque: 4 Livres Mémo, 98,000 Mora    │
├─────────────────────────────────────────────────┤
│  [↑ ASCENSION] Phase 5 (Lv.80 → 80+)           │
│        Coquelicot de Jade: 20/30 requis ❌       │
│        Lanterne Éternelle: 8/8 requis ✅         │
│        Gelée de Slime: 10/12 requis ❌           │
│        Mora: 80,000 / 100,000 ❌               │
├─────────────────────────────────────────────────┤
│  [⚡ TALENT] ATK Normale (Nv.7 → 8)             │
│        Diligence (épique): 4/6 requis ❌         │
│        Gelée Cristal: 8/9 requis ❌             │
│        Plume de la Signora: 0/1 requis ❌       │
│        Mora: 260,000 / 260,000 ✅               │
├─────────────────────────────────────────────────┤
│  [🔍 Voir sources matériaux]                    │
│  → Boss: Anemo Hypostasis (Coquelicot de Jade)  │
│  → Domaine: Midsummer Courtyard (Diligence)     │
└─────────────────────────────────────────────────┘

Boutons: [Améliorer XP] [Ascension] [Talent NA] [Talent Skill] [Talent Burst]
```

### 6.2 Matériaux d'Ascension par Élément

```
PYRO (Hu Tao, Diluc, Xiangling, etc.):
  Gemmes: Agnidus Agate (Éclat → Fragment → Morceau → Topaze)
  Source: Pyro Regisvine, Hypostasis Pyro, Elder Luhua (boss de résine pyro)

HYDRO (Xingqiu, Yelan, Nilou, etc.):
  Gemmes: Varunada Lazurite
  Source: Oceanid, Hydro Hypostasis, Rhodeia of Loch

CRYO (Ayaka, Ganyu, Eula, etc.):
  Gemmes: Shivada Jade
  Source: Cryo Regisvine, Hypostasis Cryo, Perpetual Mechanical Array

ÉLECTRO (Raiden, Yae, Fischl, etc.):
  Gemmes: Vajrada Amethyst
  Source: Electro Hypostasis, Thunder Manifestation, Primo Geovishap (partiel)

ANÉMO (Venti, Kazuha, Jean, etc.):
  Gemmes: Vayuda Turquoise
  Source: Anemo Hypostasis, Maguu Kenki

GÉO (Zhongli, Albedo, Noelle, etc.):
  Gemmes: Prithiva Topaz
  Source: Geo Hypostasis, Primo Geovishap

DENDRO (Nahida, Tighnari, Alhaitham, etc.):
  Gemmes: Nagadus Emerald
  Source: Jadeplume Terrorshroom, Hydro Tulpa
```

### 6.3 Système de Craft de Matériaux

```
Le forgeron peut transformer les matériaux:

Transmutation Géo:
  3 matériaux d'élément A → 1 matériau d'élément A (niveau supérieur)
  Ou: 3 matériaux d'élément A → 1 matériau de n'importe quel élément (même niveau)

Utilisations:
  /craft transmuter <matériau> <quantité>
  
  Ex: 3 Éclats Agnidus → 1 Fragment Agnidus (upgrade)
      3 Fragments Vagabond → 1 Fragment Agnidus (cross-élément)

Coût Mora par transmutation: 500 Mora
```

---

## 7. PERSONNAGES DE DÉPART ET TUTORIEL

### 7.1 Le Voyageur (Personnage Starter)

```
LUMINE ou AETHER (selon le choix du joueur):
  Rareté: 5★ mais offert gratuitement
  Élément: Change selon la région (commence en Anémo)

Éléments disponibles progressivement:
  Mondstadt: Anémo Voyageur (AR1, gratuit)
  Liyue: Géo Voyageur (débloqué AR15)
  Inazuma: Électro Voyageur (débloqué AR30)
  Sumeru: Dendro Voyageur (débloqué AR40)
  Fontaine: Hydro Voyageur (débloqué AR45)

Le Voyageur ne peut pas être dupliqué, ne gagne pas de constellations via gacha.
Ses constellations sont débloquées via l'exploration (succès, quêtes, réputation).
```

### 7.2 Personnages Offerts (Gratuits)

```
AMBER:   Obtenu au début du tutoriel (AR1)
KAEYA:   Obtenu après la première commission (AR1)
LISA:    Obtenu après le premier domaine (AR1)
BARBARA: Obtenu à AR20 via quête
XIANGLING: Obtenu en complétant l'Abîme Spiralé Étage 3 Chambre 3
BEIDOU:  Obtenu via un événement (régulièrement proposé)
COLLEI:  Obtenu lors de l'introduction à Sumeru
LYNETTE: Obtenu lors de l'introduction à Fontaine
```

---

## 8. SYSTÈME D'AMITIÉ ET LORE

### 8.1 Interface d'Amitié

```
/personnage hu_tao → Section Amitié:

❤️ AMITIÉ — Hu Tao
──────────────────────────────────────────────────
Niveau actuel: 7/10
Progression: ███████░░░ (14,200 / 18,000 XP)

JOURNAL D'AMITIÉ:
  📖 Niveau 1: "Qui est Hu Tao ? Le Directeur de Wangsheng..."
  📖 Niveau 2: "Hu Tao et la Mort..." [DÉBLOQUÉ]
  📖 Niveau 3: "La Vie selon Hu Tao..." [DÉBLOQUÉ]
  📖 Niveau 4: "Les Poèmes de Hu Tao..." [DÉBLOQUÉ]
  📖 Niveau 5: "La Vérité sur Wangsheng..." [DÉBLOQUÉ]
  📖 Niveau 6: "Ce qu'elle pense vraiment..." [DÉBLOQUÉ]
  📖 Niveau 7: "Ses Craintes Secrètes..." [DÉBLOQUÉ]
  🔒 Niveau 8: ??? [Bloqué — 3,800 XP restants]
  🔒 Niveau 9: ???
  🔒 Niveau 10: "Mémoire Immuable" [RÉCOMPENSE: Namecard Hu Tao]

Bonus actuel (Niveau 7): Voix de Bataille disponible 🔊

Sources d'XP Amitié aujourd'hui:
  Combat Boss (active): +8 XP ×3 = +24 XP
  Commissions (active): +4 XP ×4 = +16 XP
  Théière (résidente):  +2 XP ×8h = +16 XP
  Total aujourd'hui:    +56 XP
```

### 8.2 Voix de Bataille (Simulation Audio)

```
À partir de l'Amitié niveau 4, le joueur peut accéder aux "voix de bataille":

/personnage voix <hu_tao> → Embed avec boutons:
  [🔊 Cri de Guerre]        → Description textuelle de la voix + citation
  [🔊 Activation Burst]     → Citation légendaire du burst
  [🔊 Victoire]             → Citation post-combat
  [🔊 Défaite]              → Citation si KO
  [🔊 Niveau Up]            → Réaction au level up

Exemple embed:
  "✨ ACTIVATION BURST — HU TAO"
  *Le son de cloches funèbres résonne...*
  → "Ouvre la voie au prochain monde !"
  
  (Embed avec image du burst + couleur thématique Pyro)
```

---

## 9. RÉCAPITULATIF DES DONNÉES DE PERSONNAGES IMPLEMENTÉS

```
MÉTA-DONNÉES DU CATALOGUE (VERSION MVP):
  ├── Total personnages 5★ implémentés: 45
  ├── Total personnages 4★ implémentés: 35
  ├── Total personnages: 80
  ├── Éléments couverts: 7/7
  ├── Régions couvertes: 5/7 (Mondstadt, Liyue, Inazuma, Sumeru, Fontaine)
  └── Types d'armes couverts: 5/5

DONNÉES JSON PAR PERSONNAGE:
  ├── Stats de base (6 valeurs)
  ├── Scaling niveau 1-90 (90 valeurs par stat)
  ├── 6 données de compétences
  ├── 6 constellations avec effets
  ├── 2 passifs + 1 utilitaire
  ├── 6 phases d'ascension (matériaux)
  ├── 3 talents avec matériaux
  └── Métadonnées lore

TAILLE ESTIMÉE DU CATALOGUE: ~2MB JSON compressé
CACHE: Chargé en mémoire au démarrage (données statiques)
UPDATE: Via script seed lors d'un patch du bot
```
