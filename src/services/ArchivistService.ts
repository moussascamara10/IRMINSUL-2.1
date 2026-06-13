import { WebhookClient, EmbedBuilder } from 'discord.js';
import { ELEMENT_COLORS, ELEMENT_EMOJIS } from '../builders/IrminsulEmbed.js';

const ARCHIVIST_AVATAR_URL = 'https://i.imgur.com/example.png'; // À remplacer par l'URL réelle

const ARCHIVIST_MESSAGES = {
  fiveStar: {
    Pyro: [
      "Les flammes de Teyvat brillent plus fort ce soir. **{character}** a répondu à l'appel de **{player}**. L'Irminsul a enregistré cette union de feu.",
      "L'essence du Pyro s'est cristallisée. **{player}** et **{character}** — leurs destins sont désormais entrelacés dans les registres éternels.",
      "Depuis les profondeurs ardentes de Natlan jusqu'ici... **{character}** a traversé les étoiles pour rejoindre **{player}**."
    ],
    Hydro: [
      "Les eaux de Fontaine murmurent. **{character}** coule maintenant dans les veines de l'équipe de **{player}**.",
      "L'Archiviste note une perturbation dans les courants élémentaires. **{player}** accueille **{character}** — l'Hydro prend une nouvelle forme."
    ],
    Cryo: [
      "Un frisson parcourt Teyvat. **{player}** a lié son destin avec **{character}**. Le froid éternel d'Inazuma n'aura plus de secrets.",
      "Les cristaux de glace de Dragonspine ont reconnu leur maître. **{character}** servira fidèlement **{player}**."
    ],
    Electro: [
      "L'électricité dans l'air n'était pas un hasard. **{player}** a reçu **{character}** — et Inazuma tremble de reconnaissance.",
      "L'Irminsul a vibré. **{character}** répond à l'appel de **{player}**. Le tonnerre suit."
    ],
    Anemo: [
      "Le vent a soufflé dans la bonne direction. **{character}** a choisi **{player}** comme compagnon de voyage.",
      "Les courants d'air au-dessus de Mondstadt ont changé. **{player}** et **{character}** écriront ensemble une nouvelle page."
    ],
    Geo: [
      "La roche a parlé. **{character}** s'est ancré auprès de **{player}**. Liyue reconnaît sa volonté.",
      "Un contrat a été scellé dans les profondeurs de la terre. **{player}** et **{character}** — indéfectibles."
    ],
    default: [
      "Les astres se sont alignés. **{character}** a rejoint le voyage de **{player}**. L'Irminsul a tout enregistré.",
      "Une étoile de plus dans les archives. **{player}** et **{character}** — leur rencontre était écrite depuis longtemps.",
      "L'Irminsul frémit. **{character}** répond à l'appel. **{player}** ne sera plus jamais seul sur les routes de Teyvat."
    ]
  },

  bossKill: [
    "L'écho de la bataille résonne encore. **{player}** a mis fin au règne de **{boss}** en {turns} tours. Son essence se dissipe... pour l'instant.",
    "**{boss}** s'est effondré. **{player}** porte les cicatrices d'un combat en {turns} tours. L'Irminsul a tout vu.",
    "Les archives s'actualisent. **{boss}** vaincu par **{player}**. {turns} tours. Efficace.",
    "La balance élémentaire se rééquilibre. **{player}** a triomphé de **{boss}**. Teyvat peut respirer."
  ],

  dailyReset: [
    "Une nouvelle journée s'éveille sur Teyvat. Le {weather} accompagne les aventuriers dans leurs quêtes du jour. Que vos commissions soient fructueuses.",
    "L'aube de **{date}** se lève. **{weather}** — les conditions sont favorables aux Voyageurs courageux.",
    "L'Irminsul a tourné une nouvelle page. **{date}** — que les étoiles guident vos pas."
  ],

  milestones: {
    pulls_100: ["Cent vœux ont été formulés sur ce serveur. L'Irminsul a entendu chacun d'eux."],
    pulls_1000: ["Mille destins entrelacés. {value} vœux résonnent dans les archives de l'Irminsul. Ce serveur écrit son histoire."],
    pulls_10000: ["Dix mille. L'Irminsul n'avait pas vu pareille dévotion depuis l'ère des Archons. {value} vœux — une légende en construction."],
    boss_kills_100: ["{value} boss vaincus sur ce serveur. Les créatures de Teyvat respectent désormais vos Voyageurs."],
    players_10: ["Dix Voyageurs ont rejoint les rangs. L'aventure prend de l'ampleur."],
    players_50: ["Cinquante Voyageurs marchent maintenant sous la bannière de ce serveur. Teyvat tremble légèrement."]
  },

  levelUp: {
    20: "AR20 — Les premières épreuves sont derrière vous. **{player}** découvre maintenant les vraies menaces de Teyvat.",
    30: "AR30 — **{player}** est un aventurier accompli. L'Abîme Spiralé vous attend.",
    40: "AR40 — Les rangs de l'élite. **{player}** a prouvé sa valeur face aux créatures les plus redoutables.",
    50: "AR50 — Un Vétéran. **{player}** connaît Teyvat comme sa poche. Les classements globaux s'ouvrent.",
    60: "AR60 — Duc du Vent. **{player}** a atteint le sommet de l'aventure. L'Irminsul grave ce nom dans ses archives pour l'éternité."
  }
};

export class ArchivistService {
  private webhook: WebhookClient | null = null;

  async initialize(webhookUrl: string): Promise<void> {
    this.webhook = new WebhookClient({ url: webhookUrl });
  }

  async onFiveStarObtained(userId: string, username: string, characterName: string, element: string): Promise<void> {
    const templates = ARCHIVIST_MESSAGES.fiveStar[element as keyof typeof ARCHIVIST_MESSAGES.fiveStar] || ARCHIVIST_MESSAGES.fiveStar.default;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const message = template
      .replace('{character}', characterName)
      .replace('{player}', username);

    await this.post({
      color: ELEMENT_COLORS[element as keyof typeof ELEMENT_COLORS] || 0xFFD700,
      description: message,
      emoji: ELEMENT_EMOJIS[element as keyof typeof ELEMENT_EMOJIS] || '✨',
      footer: 'L\'Irminsul a enregistré cette rencontre'
    });
  }

  async onBossDefeated(userId: string, username: string, bossName: string, turns: number): Promise<void> {
    const templates = ARCHIVIST_MESSAGES.bossKill;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const message = template
      .replace('{boss}', bossName)
      .replace('{player}', username)
      .replace('{turns}', String(turns));

    await this.post({
      color: 0xFF6B35,
      description: message,
      emoji: '⚔️',
      footer: `Combat terminé en ${turns} tours`
    });
  }

  async onDailyReset(todayDate: string, weatherEffect: any): Promise<void> {
    const message = ARCHIVIST_MESSAGES.dailyReset
      [Math.floor(Math.random() * ARCHIVIST_MESSAGES.dailyReset.length)]
      .replace('{date}', todayDate)
      .replace('{weather}', weatherEffect.name);

    await this.post({
      color: 0x87CEEB,
      description: message,
      emoji: weatherEffect.emoji,
      title: `Nouvelle Journée à Teyvat — ${todayDate}`,
      footer: 'L\'Archiviste note les événements du jour'
    });
  }

  async onServerMilestone(milestone: string, value: number): Promise<void> {
    const messages = ARCHIVIST_MESSAGES.milestones[milestone as keyof typeof ARCHIVIST_MESSAGES.milestones];
    if (!messages) return;

    const message = messages[Math.floor(Math.random() * messages.length)]
      .replace('{value}', value.toLocaleString());

    await this.post({
      color: 0xFFD700,
      description: message,
      emoji: '🌟',
      title: '✦ Jalon Atteint',
      footer: 'L\'Irminsul vibre de cet accomplissement'
    });
  }

  async onPlayerLevelUp(username: string, newAR: number): Promise<void> {
    if (![20, 30, 40, 50, 55, 60].includes(newAR)) return;

    const message = ARCHIVIST_MESSAGES.levelUp[newAR as keyof typeof ARCHIVIST_MESSAGES.levelUp]
      || `Les archives s'actualisent. **${username}** a atteint le Rang Aventurier **${newAR}**.`;

    await this.post({
      color: 0x4DA6FF,
      description: message,
      emoji: '📊',
      footer: `Rang Aventurier ${newAR}`
    });
  }

  private async post(options: {
    description: string;
    color: number;
    emoji: string;
    title?: string;
    footer?: string;
  }): Promise<void> {
    if (!this.webhook) return;

    try {
      const embed = new EmbedBuilder()
        .setColor(options.color)
        .setDescription(`${options.emoji} ${options.description}`);

      if (options.title) embed.setTitle(options.title);
      if (options.footer) embed.setFooter({ text: options.footer });

      embed.setTimestamp();

      await this.webhook.send({
        username: 'L\'Archiviste',
        avatarURL: ARCHIVIST_AVATAR_URL,
        embeds: [embed]
      });
    } catch (error) {
      console.error('Archivist error:', error);
    }
  }
}

export const archivistService = new ArchivistService();
