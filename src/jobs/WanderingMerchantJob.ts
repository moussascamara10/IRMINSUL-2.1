import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';

interface IMerchantItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  icon: string;
  description?: string;
}

interface IMerchantEvent {
  eventId: string;
  guildId: string;
  channelId: string;
  messageId: string;
  items: IMerchantItem[];
  startTime: number;
  endTime: number;
}

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

// Mock repositories (à remplacer par vrais repositories)
const ServerConfigRepository = {
  async findAllWithMerchantEnabled(): Promise<any[]> {
    // TODO: Implémenter vrai repository
    return [];
  }
};

// Mock client (à remplacer par vrai client Discord)
const client = {
  channels: {
    async fetch(id: string): Promise<TextChannel | null> {
      // TODO: Implémenter vrai client
      return null;
    }
  }
};

const MERCHANT_ITEMS_POOL: IMerchantItem[] = [
  { id: 'mora_1000', name: '1000 Mora', price: 0, stock: 5, icon: '💰', description: 'Un peu de monnaie locale' },
  { id: 'mora_5000', name: '5000 Mora', price: 0, stock: 3, icon: '💰', description: 'Une bourse généreuse' },
  { id: 'xp_book_3', name: 'Livre d\'Expérience (3★)', price: 500, stock: 5, icon: '📘', description: '+2000 XP Personnage' },
  { id: 'xp_book_4', name: 'Livre d\'Expérience (4★)', price: 2000, stock: 2, icon: '📗', description: '+5000 XP Personnage' },
  { id: 'resin_10', name: '10 Résine', price: 1000, stock: 3, icon: '🔷', description: 'Récupère 10 points de résine' },
  { id: 'primogem_5', name: '5 Primogens', price: 5000, stock: 1, icon: '💎', description: 'Monnaie rare pour les vœux' },
  { id: 'weapon_3', name: 'Arme 3★ Aléatoire', price: 3000, stock: 2, icon: '⚔️', description: 'Une arme de qualité moyenne' },
  { id: 'artifact_4', name: 'Artefact 4★', price: 8000, stock: 1, icon: '🏺', description: 'Un artefact de qualité' }
];

export class WanderingMerchantJob {

  static async spawnMerchant(): Promise<void> {
    console.log('🎒 Tentative de spawn du Marchand Itinérant...');

    // 30% de chance de spawn
    if (Math.random() > 0.3) {
      console.log('⏭️ Pas de spawn cette fois');
      return;
    }

    const servers = await ServerConfigRepository.findAllWithMerchantEnabled();
    if (servers.length === 0) return;

    // Sélectionner un serveur aléatoire
    const server = servers[Math.floor(Math.random() * servers.length)];

    // Sélectionner 3-5 items aléatoires
    const itemCount = 3 + Math.floor(Math.random() * 3);
    const shuffled = [...MERCHANT_ITEMS_POOL].sort(() => Math.random() - 0.5);
    const selectedItems = shuffled.slice(0, itemCount).map(item => ({
      ...item,
      stock: item.stock
    }));

    const eventId = `merchant:${server.guildId}:${Date.now()}`;
    const duration = 4 * 60 * 60 * 1000; // 4 heures

    const event: IMerchantEvent = {
      eventId,
      guildId: server.guildId,
      channelId: server.channels.merchant,
      messageId: '',
      items: selectedItems,
      startTime: Date.now(),
      endTime: Date.now() + duration
    };

    // Poster l'embed
    const channel = await client.channels.fetch(server.channels.merchant) as TextChannel;
    if (!channel) return;

    const message = await channel.send({
      embeds: [this.buildMerchantEmbed(event)],
      components: [this.buildMerchantActionRow(event)]
    });

    event.messageId = message.id;

    await redis.setex(eventId, duration / 1000, JSON.stringify(event));

    console.log(`✅ Marchand spawné sur ${server.guildId} — ${itemCount} items`);
  }

  static async purchaseItem(eventId: string, userId: string, itemIndex: number): Promise<{ success: boolean; message: string }> {
    const data = await redis.get(eventId);
    if (!data) return { success: false, message: 'Le marchand est parti !' };

    const event: IMerchantEvent = JSON.parse(data);
    const item = event.items[itemIndex];

    if (!item) return { success: false, message: 'Item introuvable' };
    if (item.stock <= 0) return { success: false, message: 'Cet item est épuisé !' };

    // Vérifier si l'utilisateur a assez de Mora
    const userMora = await this.getUserMora(userId);
    if (userMora < item.price) {
      return { success: false, message: `Pas assez de Mora ! (Besoin: ${item.price})` };
    }

    // Déduire le Mora
    await this.deductMora(userId, item.price);

    // Réduire le stock
    item.stock--;
    await redis.setex(eventId, Math.floor((event.endTime - Date.now()) / 1000), JSON.stringify(event));

    // Mettre à jour l'embed
    await this.updateMerchantEmbed(event);

    // Donner l'item à l'utilisateur
    await this.grantItem(userId, item.id);

    return { success: true, message: `Achat réussi : ${item.name} !` };
  }

  private static buildMerchantEmbed(event: IMerchantEvent): EmbedBuilder {
    const timeLeft = Math.max(0, event.endTime - Date.now());
    const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

    const itemsText = event.items
      .map((item, index) => {
        const stockStatus = item.stock > 0 ? `📦 ${item.stock} restant${item.stock > 1 ? 's' : ''}` : '❌ Épuisé';
        return `${index + 1}. ${item.icon} **${item.name}** — ${item.price} Mora\n   ${item.description || ''}\n   ${stockStatus}`;
      })
      .join('\n\n');

    return new EmbedBuilder()
      .setColor(0xFFA726)
      .setTitle('🎒 Marchand Itinérant')
      .setDescription('Un marchand mystérieux traverse Teyvat. Ses offres sont limitées !')
      .addFields(
        { name: '📦 Offres du jour', value: itemsText, inline: false },
        { name: '⏱️ Temps restant', value: `${hoursLeft}h ${minutesLeft}min`, inline: true }
      )
      .setFooter({ text: 'Cliquez sur les boutons pour acheter' })
      .setTimestamp();
  }

  private static buildMerchantActionRow(event: IMerchantEvent): ActionRowBuilder<ButtonBuilder> {
    const buttons = event.items
      .map((item, index) => {
        const disabled = item.stock <= 0;
        return new ButtonBuilder()
          .setCustomId(`merchant_buy_${event.eventId}_${index}`)
          .setLabel(`${item.icon} ${item.price} Mora`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(disabled);
      });

    return new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
  }

  private static async updateMerchantEmbed(event: IMerchantEvent): Promise<void> {
    const channel = await client.channels.fetch(event.channelId) as TextChannel;
    if (!channel) return;

    const message = await channel.messages.fetch(event.messageId);
    if (!message) return;

    await message.edit({
      embeds: [this.buildMerchantEmbed(event)],
      components: [this.buildMerchantActionRow(event)]
    });
  }

  private static async getUserMora(userId: string): Promise<number> {
    // TODO: Implémenter récupération Mora depuis la base de données
    return 0;
  }

  private static async deductMora(userId: string, amount: number): Promise<void> {
    // TODO: Implémenter déduction Mora
  }

  private static async grantItem(userId: string, itemId: string): Promise<void> {
    // TODO: Implémenter attribution d'item
  }
}

export async function getActiveMerchantEvent(guildId: string): Promise<IMerchantEvent | null> {
  // TODO: Implémenter récupération d'événement actif
  return null;
}
