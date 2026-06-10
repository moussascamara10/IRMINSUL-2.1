# DOC 09 — GUIDE DISCORD.JS V14 AVANCÉ
## IRMINSUL V2 — Patterns, Pièges et Implémentations

> Référence technique pour Devin | Discord.js v14.14.0 | Node.js 20+

---

## INTRODUCTION

Ce guide couvre tous les patterns Discord.js v14 spécifiques à IRMINSUL V2. Chaque section contient du code production-ready directement applicable. Les pièges les plus courants (timeout de 3s, collectors qui fuient, interactions expirées) sont documentés avec leurs solutions.

---

## 1. STRUCTURE D'UNE COMMANDE — TEMPLATE UNIVERSEL

### 1.1 Template de base (toutes les commandes)

```typescript
// src/modules/[module]/commands/[nom].ts
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { logger } from '../../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('nom-commande')
  .setDescription('Description visible dans Discord')
  .setDMPermission(false); // Désactiver les DMs (toujours pour IRMINSUL)

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  // RÈGLE N°1 : deferReply IMMÉDIATEMENT si la commande fait quoi que ce soit d'async
  await interaction.deferReply({ ephemeral: true });

  try {
    // Votre logique ici
    const embed = new EmbedBuilder()
      .setTitle('Titre')
      .setDescription('Description');

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logger.error({
      event: 'command_error',
      command: interaction.commandName,
      userId: interaction.user.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Toujours répondre, même en cas d'erreur
    const errorMsg = '❌ Une erreur est survenue. Réessaie dans quelques instants.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMsg, embeds: [], components: [] });
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true });
    }
  }
}
```

### 1.2 Commande publique vs éphémère

```typescript
// Décision rapide :
// ephemeral: true  → résultats personnels (pity, ressources, profil)
// ephemeral: false → actions publiques (boss kill, tirage 5★, succès)

// Tirage 5★ → public pour créer de l'engagement
await interaction.deferReply({ ephemeral: false });

// Mais afficher l'info de coût avant → éphémère
// Pattern "confirm before public" :
await interaction.deferReply({ ephemeral: true }); // d'abord éphémère
// ... confirmation ...
// Après confirmation, créer un message public séparé :
await interaction.channel?.send({ embeds: [publicEmbed] });
```

---

## 2. BOUTONS — PATTERNS COMPLETS

### 2.1 Bouton simple avec timeout

```typescript
// Créer le bouton
const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId('confirm_wish')
    .setLabel('✨ Confirmer')
    .setStyle(ButtonStyle.Primary),
  new ButtonBuilder()
    .setCustomId('cancel_wish')
    .setLabel('Annuler')
    .setStyle(ButtonStyle.Secondary)
);

const response = await interaction.editReply({
  embeds: [confirmEmbed],
  components: [row]
});

// Collector : attend un clic pendant 30s, uniquement du bon utilisateur
const collector = response.createMessageComponentCollector({
  filter: (i) => i.user.id === interaction.user.id,
  time: 30_000, // 30 secondes
  max: 1        // 1 seul clic
});

collector.on('collect', async (buttonInteraction) => {
  await buttonInteraction.deferUpdate(); // CRITIQUE : répondre immédiatement

  if (buttonInteraction.customId === 'confirm_wish') {
    // Procéder au tirage
    await processWish(interaction, buttonInteraction);
  } else {
    await interaction.editReply({ content: '❌ Annulé.', embeds: [], components: [] });
  }
});

collector.on('end', async (collected) => {
  if (collected.size === 0) {
    // Timeout : désactiver les boutons (NE PAS laisser des boutons actifs)
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_wish')
        .setLabel('✨ Confirmer')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true), // ← DÉSACTIVER
      new ButtonBuilder()
        .setCustomId('cancel_wish')
        .setLabel('Annulé (timeout)')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
    await interaction.editReply({
      content: '⏱️ Délai dépassé.',
      components: [disabledRow]
    }).catch(() => {}); // Le message peut avoir été supprimé
  }
});
```

### 2.2 Pagination avec boutons — Pattern IRMINSUL

```typescript
// src/builders/PaginationHelper.ts

export async function createPagination(
  interaction: ChatInputCommandInteraction,
  pages: EmbedBuilder[],
  options: {
    timeout?: number;  // ms, défaut 120000 (2 min)
    showPageCount?: boolean;
    extraButtons?: ButtonBuilder[];
  } = {}
): Promise<void> {
  const { timeout = 120_000, showPageCount = true, extraButtons = [] } = options;

  if (pages.length === 0) {
    await interaction.editReply({ content: 'Aucun résultat.' });
    return;
  }

  if (pages.length === 1) {
    await interaction.editReply({ embeds: [pages[0]] });
    return;
  }

  let currentPage = 0;

  const getRow = (page: number): ActionRowBuilder<ButtonBuilder> => {
    const buttons = [
      new ButtonBuilder()
        .setCustomId('page_first')
        .setLabel('⏮')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('page_prev')
        .setLabel('◀')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('page_info')
        .setLabel(showPageCount ? `${page + 1} / ${pages.length}` : '—')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true), // Bouton info non-cliquable
      new ButtonBuilder()
        .setCustomId('page_next')
        .setLabel('▶')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === pages.length - 1),
      new ButtonBuilder()
        .setCustomId('page_last')
        .setLabel('⏭')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === pages.length - 1)
    ];
    return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
  };

  const response = await interaction.editReply({
    embeds: [pages[0]],
    components: [getRow(0), ...(extraButtons.length ? [new ActionRowBuilder<ButtonBuilder>().addComponents(extraButtons)] : [])]
  });

  const collector = response.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: timeout
  });

  collector.on('collect', async (i) => {
    await i.deferUpdate();

    switch (i.customId) {
      case 'page_first': currentPage = 0; break;
      case 'page_prev':  currentPage = Math.max(0, currentPage - 1); break;
      case 'page_next':  currentPage = Math.min(pages.length - 1, currentPage + 1); break;
      case 'page_last':  currentPage = pages.length - 1; break;
      default: return; // Bouton extra géré ailleurs
    }

    await interaction.editReply({
      embeds: [pages[currentPage]],
      components: [getRow(currentPage)]
    });
  });

  collector.on('end', async () => {
    // Désactiver tous les boutons de navigation à la fin
    const disabledRow = getRow(currentPage);
    disabledRow.components.forEach(btn => (btn as ButtonBuilder).setDisabled(true));
    await interaction.editReply({ components: [disabledRow] }).catch(() => {});
  });
}
```

### 2.3 Bouton de stock limité (Marchands, Anomalies)

```typescript
// Pattern pour les boutons où seuls N joueurs peuvent cliquer

// Dans le message public du marchand :
const merchantRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder()
    .setCustomId(`merchant_buy_${merchantId}_${itemId}`)
    .setLabel(`Acheter (5 restants)`)
    .setStyle(ButtonStyle.Success)
);

// Dans interactionCreate.ts — handler global des boutons
if (interaction.isButton()) {
  const [action, type, entityId, itemId] = interaction.customId.split('_');

  if (action === 'merchant' && type === 'buy') {
    await interaction.deferReply({ ephemeral: true });

    // Vérification atomique Redis (évite les race conditions)
    const stockKey = `merchant:${entityId}:item:${itemId}:stock`;
    const remaining = await redis.decr(stockKey);

    if (remaining < 0) {
      // Remettre à 0 (dépassement)
      await redis.incr(stockKey);
      await interaction.editReply({ content: '❌ En rupture de stock !' });
      return;
    }

    // Procéder à l'achat
    await processMerchantPurchase(interaction.user.id, entityId, itemId);
    await interaction.editReply({ content: `✅ Achat réussi ! Stock restant : ${remaining}` });

    // Mettre à jour le message public si stock = 0
    if (remaining === 0) {
      const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`merchant_buy_${entityId}_${itemId}`)
          .setLabel('Épuisé')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true)
      );
      await interaction.message.edit({ components: [updatedRow] });
    }
  }
}
```

---

## 3. AUTOCOMPLETE — IMPLÉMENTATION COMPLÈTE

### 3.1 Autocomplete pour les personnages

```typescript
// Dans la commande — déclaration
export const data = new SlashCommandBuilder()
  .setName('personnage')
  .setDescription('Voir un personnage')
  .addStringOption(option =>
    option
      .setName('nom')
      .setDescription('Nom du personnage')
      .setRequired(true)
      .setAutocomplete(true) // ← Activer l'autocomplete
  );

// Dans execute — gérer l'autocomplete
export async function execute(interaction: ChatInputCommandInteraction | AutocompleteInteraction): Promise<void> {
  // IMPORTANT : vérifier si c'est une interaction autocomplete
  if (interaction.isAutocomplete()) {
    const focused = interaction.options.getFocused().toLowerCase();
    const userId = interaction.user.id;

    try {
      // Chercher dans les personnages possédés + tous les personnages de la DB
      const ownedChars = await CharacterRepository.findByUserId(userId);
      const allChars = await GenshinDataService.getAllCharacters();

      const choices = allChars
        .filter(char => char.name.toLowerCase().includes(focused))
        .slice(0, 25) // Max 25 suggestions Discord
        .map(char => ({
          name: `${char.element_emoji} ${char.name} ${ownedChars.some(o => o.characterId === char.id) ? '✓' : ''}`,
          value: char.id // Toujours passer un ID stable, pas le nom
        }));

      await interaction.respond(choices);
    } catch (error) {
      // En cas d'erreur autocomplete → répondre avec tableau vide
      await interaction.respond([]);
    }
    return; // STOP ici pour l'autocomplete
  }

  // Suite normale de la commande...
  await interaction.deferReply({ ephemeral: true });
  // ...
}
```

### 3.2 Autocomplete avec cache Redis

```typescript
// Les données statiques (personnages, armes) ne changent pas → mettre en cache

async function getCharacterChoices(focused: string, userId: string): Promise<ApplicationCommandOptionChoiceData[]> {
  const cacheKey = `autocomplete:characters:all`;

  // Cache des données statiques (24h)
  let allChars: ICharacterBase[];
  const cached = await redis.get(cacheKey);
  if (cached) {
    allChars = JSON.parse(cached);
  } else {
    allChars = await GenshinDataService.getAllCharacters();
    await redis.setex(cacheKey, 86400, JSON.stringify(allChars));
  }

  return allChars
    .filter(char => char.name.toLowerCase().startsWith(focused.toLowerCase()))
    .slice(0, 25)
    .map(char => ({ name: char.name, value: char.id }));
}
```

---

## 4. MODALS — IMPLÉMENTATION COMPLÈTE

### 4.1 Modal de saisie utilisateur

```typescript
import { ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

// Dans le handler du bouton qui ouvre le modal
if (interaction.customId === 'open_signature_modal') {
  const modal = new ModalBuilder()
    .setCustomId('edit_signature_modal')
    .setTitle('Modifier votre signature');

  const signatureInput = new TextInputBuilder()
    .setCustomId('signature_text')
    .setLabel('Votre signature (max 50 caractères)')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setRequired(false)
    .setPlaceholder('Ex: Voyageur des étoiles...');

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(signatureInput);
  modal.addComponents(row);

  // showModal N'A PAS besoin de deferReply avant !
  // C'est la SEULE exception au règle deferReply
  await interaction.showModal(modal);
  return;
}

// Dans interactionCreate.ts — handler des soumissions de modal
if (interaction.isModalSubmit()) {
  if (interaction.customId === 'edit_signature_modal') {
    await interaction.deferReply({ ephemeral: true });

    const signature = interaction.fields.getTextInputValue('signature_text');
    await UserRepository.updateSignature(interaction.user.id, signature);

    await interaction.editReply({ content: '✅ Signature mise à jour !' });
  }
}
```

### 4.2 Modal multi-champs (création de guilde)

```typescript
const guildModal = new ModalBuilder()
  .setCustomId('create_guild_modal')
  .setTitle('Créer une Guilde');

const nameInput = new TextInputBuilder()
  .setCustomId('guild_name')
  .setLabel('Nom de la guilde (3-30 caractères)')
  .setStyle(TextInputStyle.Short)
  .setMinLength(3)
  .setMaxLength(30)
  .setRequired(true);

const tagInput = new TextInputBuilder()
  .setCustomId('guild_tag')
  .setLabel('Tag [3-5 caractères, ex: ABC]')
  .setStyle(TextInputStyle.Short)
  .setMinLength(3)
  .setMaxLength(5)
  .setRequired(true);

const descInput = new TextInputBuilder()
  .setCustomId('guild_description')
  .setLabel('Description (optionnel, max 200 chars)')
  .setStyle(TextInputStyle.Paragraph)
  .setMaxLength(200)
  .setRequired(false);

guildModal.addComponents(
  new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
  new ActionRowBuilder<TextInputBuilder>().addComponents(tagInput),
  new ActionRowBuilder<TextInputBuilder>().addComponents(descInput)
);

await interaction.showModal(guildModal);
```

---

## 5. SELECT MENUS — PATTERNS ÉQUIPE

### 5.1 Sélection d'équipe (StringSelectMenu)

```typescript
import { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';

async function buildTeamSelector(userId: string): Promise<ActionRowBuilder<StringSelectMenuBuilder>> {
  const characters = await CharacterRepository.findByUserId(userId);

  const options = characters
    .slice(0, 25) // Max 25 options
    .map(char => {
      const baseChar = GenshinDataService.getCharacter(char.characterId);
      return new StringSelectMenuOptionBuilder()
        .setLabel(`${baseChar.name} (Nv.${char.level})`)
        .setValue(char.characterId)
        .setDescription(`${baseChar.element} • ${baseChar.weapon_type} • ★${baseChar.rarity}`)
        .setEmoji(ELEMENT_EMOJIS[baseChar.element])
        .setDefault(false);
    });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_team_slot_1')
    .setPlaceholder('Choisir le personnage principal...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(options);

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
}

// Handler dans interactionCreate.ts
if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_team_')) {
  await interaction.deferUpdate();

  const slotNumber = parseInt(interaction.customId.split('_')[3]);
  const selectedCharId = interaction.values[0];

  // Sauvegarder le choix dans Redis (session temporaire)
  const sessionKey = `team_setup:${interaction.user.id}`;
  const session = JSON.parse(await redis.get(sessionKey) || '{}');
  session[`slot${slotNumber}`] = selectedCharId;
  await redis.setex(sessionKey, 300, JSON.stringify(session)); // 5 min

  // Mettre à jour l'embed pour refléter le choix
  await updateTeamSetupEmbed(interaction, session);
}
```

---

## 6. THREADS DE COMBAT — CYCLE DE VIE COMPLET

### 6.1 Créer et gérer un thread de combat

```typescript
// src/modules/combat/handlers/CombatThread.ts

export class CombatThread {
  private thread: ThreadChannel | null = null;
  private sessionId: string;

  constructor(
    private readonly interaction: ChatInputCommandInteraction,
    private readonly boss: IBossBase,
    private readonly userId: string
  ) {
    this.sessionId = `combat:${userId}:${Date.now()}`;
  }

  async start(): Promise<void> {
    // 1. Créer le thread privé
    const channel = this.interaction.channel as TextChannel;
    this.thread = await channel.threads.create({
      name: `⚔️ ${this.boss.name} — ${this.interaction.user.displayName}`,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
      type: ChannelType.PrivateThread,
      reason: 'Session de combat IRMINSUL'
    });

    // 2. Ajouter le joueur au thread
    await this.thread.members.add(this.interaction.user.id);

    // 3. Enregistrer la session dans Redis
    await redis.setex(this.sessionId, 1800, JSON.stringify({
      bossId: this.boss.id,
      userId: this.userId,
      threadId: this.thread.id,
      startTime: Date.now(),
      phase: 1,
      bossCurrentHp: this.boss.baseHp,
      teamHp: {} // sera rempli
    }));

    // 4. Répondre à l'interaction principale avec un lien
    await this.interaction.editReply({
      content: `⚔️ Combat lancé ! → ${this.thread.url}`,
      embeds: [],
      components: []
    });

    // 5. Poster le premier embed de combat dans le thread
    await this.postCombatEmbed();

    // 6. Configurer l'auto-archivage si inactivité
    this.setupInactivityTimeout();
  }

  private async postCombatEmbed(): Promise<void> {
    if (!this.thread) return;

    const session = await this.getSession();
    const hpPercent = (session.bossCurrentHp / this.boss.baseHp) * 100;
    const hpBar = this.generateHpBar(hpPercent);

    const embed = new EmbedBuilder()
      .setColor(ELEMENT_COLORS[this.boss.element])
      .setTitle(`⚔️ ${this.boss.name}`)
      .setThumbnail(this.boss.imageUrl)
      .addFields(
        { name: `HP : ${hpBar} ${hpPercent.toFixed(1)}%`, value: `${session.bossCurrentHp.toLocaleString()} / ${this.boss.baseHp.toLocaleString()}`, inline: false },
        { name: 'Phase', value: String(session.phase), inline: true },
        { name: 'Tour', value: String(session.turn || 1), inline: true }
      );

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`combat_atk_${this.sessionId}`).setLabel('⚔️ Attaque Normale').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`combat_skill_${this.sessionId}`).setLabel('🌟 Compétence').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`combat_burst_${this.sessionId}`).setLabel('💥 Burst').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`combat_swap_${this.sessionId}`).setLabel('🔄 Changer').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`combat_flee_${this.sessionId}`).setLabel('🏃 Fuir').setStyle(ButtonStyle.Secondary)
    );

    await this.thread.send({ embeds: [embed], components: [actionRow] });
  }

  async end(result: 'victory' | 'defeat' | 'fled'): Promise<void> {
    if (!this.thread) return;

    // 1. Supprimer la session Redis
    await redis.del(this.sessionId);

    // 2. Poster l'embed de fin
    const endEmbed = new EmbedBuilder()
      .setTitle(result === 'victory' ? '✅ Victoire !' : result === 'defeat' ? '💀 Défaite' : '🏃 Fuite')
      .setColor(result === 'victory' ? 0x00ff00 : result === 'defeat' ? 0xff0000 : 0xffa500);

    if (result === 'victory') {
      // Distribuer les récompenses
      const rewards = await this.distributeRewards();
      endEmbed.addFields({ name: 'Récompenses', value: formatRewards(rewards) });
    }

    await this.thread.send({ embeds: [endEmbed], components: [] });

    // 3. Archiver le thread après 30s
    setTimeout(async () => {
      await this.thread?.setArchived(true).catch(() => {});
    }, 30_000);

    // 4. Logger en MongoDB
    await CombatLogRepository.create({
      userId: this.userId,
      bossId: this.boss.id,
      result,
      duration: Date.now() - (await this.getSessionStart()),
      sessionId: this.sessionId
    });
  }

  private setupInactivityTimeout(): void {
    // Si le joueur ne fait rien pendant 5 minutes → fin de combat
    const timeoutId = setTimeout(async () => {
      await this.thread?.send({
        content: '⏱️ Inactivité détectée. Le combat est terminé automatiquement.'
      });
      await this.end('fled');
    }, 5 * 60 * 1000);

    // Annuler le timeout à chaque action (géré dans le handler de boutons)
    redis.set(`combat_timeout:${this.sessionId}`, timeoutId.toString());
  }

  private generateHpBar(percent: number, length = 20): string {
    const filled = Math.round((percent / 100) * length);
    return '█'.repeat(filled) + '░'.repeat(length - filled);
  }
}
```

---

## 7. EMBEDS — DESIGN SYSTÈME IRMINSUL

### 7.1 EmbedBuilder thématisé

```typescript
// src/builders/IrminsulEmbed.ts

// Couleurs élémentaires
export const ELEMENT_COLORS = {
  Pyro:    0xFF6B35,
  Hydro:   0x4DA6FF,
  Cryo:    0xB3E5FC,
  Electro: 0xAB47BC,
  Anemo:   0x66BB6A,
  Geo:     0xFFA726,
  Dendro:  0x8BC34A,
  Physique:0x90A4AE,
} as const;

export const ELEMENT_EMOJIS = {
  Pyro:    '🔥',
  Hydro:   '💧',
  Cryo:    '❄️',
  Electro: '⚡',
  Anemo:   '🌪️',
  Geo:     '⛰️',
  Dendro:  '🌿',
  Physique:'⚪',
} as const;

// Rareté
export const RARITY_COLORS = {
  5: 0xFFD700, // Or
  4: 0x9C27B0, // Violet
  3: 0x2196F3, // Bleu
} as const;

export const RARITY_STARS = {
  5: '★★★★★',
  4: '★★★★',
  3: '★★★',
} as const;

// Factory d'embeds réutilisables
export class IrminsulEmbedFactory {

  static profile(user: IUser, characters: ICharacterOwned[]): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0xF5C842) // Or Irminsul
      .setAuthor({ name: `✦ IRMINSUL — Profil Voyageur`, iconURL: IRMINSUL_ICON_URL })
      .setTitle(`${user.displayName}`)
      .setThumbnail(`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`)
      .addFields(
        { name: '🗺️ Rang Aventurier', value: `AR ${user.adventureRank} (WL${user.worldLevel})`, inline: true },
        { name: '🔮 Résine', value: `${calculateCurrentResin(user)}/200`, inline: true },
        { name: '💰 Mora', value: user.mora.toLocaleString(), inline: true }
      );

    if (user.title) {
      embed.setDescription(`*« ${user.title} »*`);
    }
    if (user.signature) {
      embed.setFooter({ text: user.signature });
    }

    return embed;
  }

  static wishResult(results: IGachaResult[]): EmbedBuilder {
    const fiveStars = results.filter(r => r.rarity === 5);
    const fourStars = results.filter(r => r.rarity === 4);

    let description = '';
    results.forEach(result => {
      const stars = RARITY_STARS[result.rarity as 3|4|5];
      const emoji = result.type === 'character'
        ? ELEMENT_EMOJIS[result.element as keyof typeof ELEMENT_EMOJIS]
        : '🗡️';
      const color = result.rarity === 5 ? '✨' : result.rarity === 4 ? '💜' : '🔵';
      description += `${color} ${emoji} **${result.name}** ${stars}\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle(fiveStars.length > 0 ? `✨ TIRAGE 5★ !` : '🌟 Résultats du Tirage')
      .setDescription(description)
      .setColor(fiveStars.length > 0 ? RARITY_COLORS[5] : RARITY_COLORS[4]);

    if (fiveStars.length > 0) {
      embed.setImage(fiveStars[0].imageUrl); // Image du 5★
    }

    return embed;
  }

  static bossIntro(boss: IBossBase, worldLevel: number): EmbedBuilder {
    const hpAdjusted = Math.floor(boss.baseHp * WORLD_LEVEL_HP_MULTIPLIERS[worldLevel]);

    return new EmbedBuilder()
      .setColor(ELEMENT_COLORS[boss.element as keyof typeof ELEMENT_COLORS] || 0x555555)
      .setTitle(`⚔️ ${boss.name}`)
      .setDescription(boss.lore)
      .setImage(boss.bannerImageUrl)
      .addFields(
        { name: 'HP', value: hpAdjusted.toLocaleString(), inline: true },
        { name: 'Élément', value: `${ELEMENT_EMOJIS[boss.element as keyof typeof ELEMENT_EMOJIS]} ${boss.element}`, inline: true },
        { name: 'Résine', value: `${boss.resinCost} 🔷`, inline: true },
        { name: 'Région', value: boss.region, inline: true }
      );
  }
}
```

---

## 8. INTERACTIONCREATE — ROUTEUR PRINCIPAL

### 8.1 Architecture du routeur

```typescript
// src/core/events/interactionCreate.ts
// C'est LE fichier le plus critique du projet.
// Tout passe par ici.

import { Events, Interaction } from 'discord.js';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: Interaction): Promise<void> {
  // === SLASH COMMANDS ===
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn({ event: 'unknown_command', command: interaction.commandName });
      await interaction.reply({ content: '❌ Commande inconnue.', ephemeral: true });
      return;
    }
    await command.execute(interaction);
    return;
  }

  // === AUTOCOMPLETE ===
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (command?.execute) {
      await command.execute(interaction); // La commande gère l'autocomplete elle-même
    } else {
      await interaction.respond([]);
    }
    return;
  }

  // === BOUTONS ===
  if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
    return;
  }

  // === SELECT MENUS ===
  if (interaction.isStringSelectMenu()) {
    await handleSelectMenuInteraction(interaction);
    return;
  }

  // === MODALS ===
  if (interaction.isModalSubmit()) {
    await handleModalSubmit(interaction);
    return;
  }
}

// Router de boutons par prefix du customId
async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
  const [prefix, ...parts] = interaction.customId.split('_');

  const handlers: Record<string, (interaction: ButtonInteraction, parts: string[]) => Promise<void>> = {
    'combat':    CombatButtonHandler.handle,
    'gacha':     GachaButtonHandler.handle,
    'page':      PaginationButtonHandler.handle,
    'confirm':   ConfirmButtonHandler.handle,
    'merchant':  MerchantButtonHandler.handle,
    'invasion':  InvasionButtonHandler.handle,
    'anomaly':   AnomalyButtonHandler.handle,
    'team':      TeamButtonHandler.handle,
  };

  const handler = handlers[prefix];
  if (!handler) {
    await interaction.reply({ content: '❌ Action inconnue.', ephemeral: true });
    return;
  }

  try {
    await handler(interaction, parts);
  } catch (error) {
    logger.error({ event: 'button_handler_error', customId: interaction.customId, error });
    const errorMsg = '❌ Erreur lors du traitement. Réessaie.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMsg });
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true });
    }
  }
}
```

---

## 9. PIÈGES COMMUNS ET SOLUTIONS

### 9.1 Les 10 erreurs les plus fréquentes

```typescript
// ❌ ERREUR 1 : Répondre deux fois à la même interaction
await interaction.reply(...)  // puis plus tard...
await interaction.reply(...)  // → InteractionAlreadyReplied

// ✅ SOLUTION : Vérifier avant de répondre
if (!interaction.replied && !interaction.deferred) {
  await interaction.reply(...)
} else if (interaction.deferred) {
  await interaction.editReply(...)
}

// ❌ ERREUR 2 : Oublier deferUpdate() dans un button collector
collector.on('collect', async (buttonInteraction) => {
  // ... longue opération sans deferUpdate
  await interaction.editReply(...)  // → Timeout de 3s dépassé
});

// ✅ SOLUTION : toujours en premier
collector.on('collect', async (buttonInteraction) => {
  await buttonInteraction.deferUpdate(); // ← IMMÉDIATEMENT
  // ... suite ...
});

// ❌ ERREUR 3 : Collector qui ne se termine jamais (memory leak)
message.createMessageComponentCollector({ time: undefined }); // Jamais timeout !

// ✅ SOLUTION : toujours mettre un time
message.createMessageComponentCollector({ time: 60_000 }); // 1 min max

// ❌ ERREUR 4 : Modifier un message éphémère depuis un autre utilisateur
// Les messages éphémères n'existent que pour l'utilisateur qui les a vus
// → Impossible de les éditer depuis un autre contexte

// ✅ SOLUTION : Passer interaction.followUp() pour le même user, ou un message public

// ❌ ERREUR 5 : Attendre la résolution de showModal()
await interaction.showModal(modal); // Ne PAS await le résultat
// → showModal() est fire-and-forget, pas un Promise résoluble

// ✅ SOLUTION : Simplement await et continuer
await interaction.showModal(modal);
// La soumission sera capturée dans interactionCreate avec isModalSubmit()

// ❌ ERREUR 6 : Utiliser interaction.message dans une ChatInputCommandInteraction
// interaction.message n'existe que sur ButtonInteraction / SelectMenuInteraction

// ❌ ERREUR 7 : Modifier un embed dans un Thread depuis l'interaction parent
// Le message initial est dans le channel, pas dans le thread
// → Garder une référence au message du Thread séparément

// ❌ ERREUR 8 : Oublier de gérer le cas "0 résultats" dans l'autocomplete
await interaction.respond([]); // ← Valide, affiche "Aucune suggestion"

// ❌ ERREUR 9 : Dépasser 10 embeds par message
// Discord limite à 10 embeds par message
// → Paginer ou combiner les informations

// ❌ ERREUR 10 : Champs d'embed vides (string vide ou undefined)
embed.addFields({ name: 'Test', value: '' }); // → Erreur API Discord
// ✅ : Toujours fournir une valeur non-vide
embed.addFields({ name: 'Test', value: user.title || 'Aucun titre' });
```

### 9.2 Gestion des interactions expirées

```typescript
// Après 15 minutes, une interaction est définitivement expirée
// Les interactions ephemeral disparaissent également si le bot redémarre

// Solution : toujours wrapper les editReply dans un try/catch
async function safeEditReply(
  interaction: ChatInputCommandInteraction,
  options: MessageEditOptions
): Promise<void> {
  try {
    await interaction.editReply(options);
  } catch (error) {
    if ((error as DiscordAPIError).code === 10008) {
      // Unknown Message → interaction expirée, ne rien faire
      return;
    }
    throw error; // Re-throw les autres erreurs
  }
}
```

---

## 10. DÉPLOIEMENT DES SLASH COMMANDS

### 10.1 Script de déploiement complet

```typescript
// scripts/deploy-commands.ts
import { REST, Routes } from 'discord.js';

async function deployCommands(): Promise<void> {
  const commands = [];

  // Charger toutes les commandes
  const moduleDirs = readdirSync('./src/modules');
  for (const moduleDir of moduleDirs) {
    const commandsPath = `./src/modules/${moduleDir}/commands`;
    if (!existsSync(commandsPath)) continue;

    const commandFiles = readdirSync(commandsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    for (const file of commandFiles) {
      const command = require(`${commandsPath}/${file}`);
      if (command.data) {
        commands.push(command.data.toJSON());
        console.log(`✅ Chargé: ${command.data.name}`);
      }
    }
  }

  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
  const clientId = process.env.DISCORD_CLIENT_ID!;
  const guildId = process.env.DISCORD_GUILD_ID;

  console.log(`📦 Déploiement de ${commands.length} commandes...`);

  if (guildId && process.env.NODE_ENV !== 'production') {
    // Déploiement serveur (instantané — dev)
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`✅ Déployées sur le serveur ${guildId} (instantané)`);
  } else {
    // Déploiement global (1h de délai — prod)
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(`✅ Déployées globalement (délai ~1h)`);
  }
}

deployCommands().catch(console.error);
```

### 10.2 Différences important entre Guild et Global deployment

```
GUILD DEPLOYMENT:
  - Instantané (quelques secondes)
  - Uniquement visible dans le serveur spécifié
  - Idéal pour le développement et les tests
  - Limite : 100 commandes par serveur

GLOBAL DEPLOYMENT:
  - Délai de propagation : jusqu'à 1h
  - Visible dans TOUS les serveurs où le bot est installé
  - Utiliser uniquement en production
  - Limite : 100 commandes globales

RECOMMANDATION IRMINSUL:
  - Dev : guild deployment sur le serveur de test
  - Staging : guild deployment sur serveur de staging
  - Production : global deployment (déclencher 1h avant la mise en ligne annoncée)
```
