import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { connectDatabase } from '../database/connection.js';
import { genshinDataService } from '../services/GenshinDataService.js';
import { loadCommands } from './CommandLoader.js';
import { readdirSync } from 'fs';
import { join } from 'path';

dotenv.config();

export interface Command {
  data: any;
  execute: (interaction: any) => Promise<void>;
}

export interface Event {
  name: string;
  execute: (...args: any[]) => Promise<void> | void;
}

export class IrminsulClient extends Client {
  public commands: Collection<string, Command> = new Collection();
  public cooldowns: Collection<string, Collection<string, number>> = new Collection();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initialisation d\'IRMINSUL V2...');

      // Connexion à la base de données
      await connectDatabase();
      console.log('✅ Base de données connectée');

      // Initialisation du service Genshin Data
      await genshinDataService.initialize();
      console.log('✅ Service Genshin Data initialisé');

      // Chargement des commandes
      await this.loadCommands();
      console.log('✅ Commandes chargées');

      // Chargement des événements
      await this.loadEvents();
      console.log('✅ Événements chargés');

      // Connexion à Discord
      console.log('🔐 Tentative de connexion à Discord...');
      console.log('DEBUG: DISCORD_TOKEN =', process.env.DISCORD_TOKEN ? 'DEFINED' : 'UNDEFINED');
      await this.login(process.env.DISCORD_TOKEN);
      console.log('✅ Connexion Discord réussie');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      process.exit(1);
    }
  }

  public async loadCommands(): Promise<void> {
    await loadCommands(this);
  }

  public async loadEvents(): Promise<void> {
    const eventsPath = join(process.cwd(), 'src', 'core', 'events');
    console.log(`📂 Chemin des événements: ${eventsPath}`);
    
    try {
      const eventFiles = readdirSync(eventsPath).filter((file) => 
        file.endsWith('.ts') || file.endsWith('.js')
      );

      console.log(`📂 Fichiers d'événements trouvés: ${eventFiles.length}`);

      for (const file of eventFiles) {
        const filePath = join(eventsPath, file);
        console.log(`📄 Importation de l'événement: ${filePath}`);
        
        try {
          // Convertir le chemin Windows en URL file:// pour ESM
          const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
          console.log(`🔗 URL: ${fileUrl}`);
          const { default: event } = await import(fileUrl);
          console.log(`📦 Événement importé: ${event.name}`);

          if (event.once) {
            this.once(event.name, (...args) => event.execute(...args));
          } else {
            this.on(event.name, (...args) => event.execute(...args));
          }

          console.log(`✅ Événement chargé: ${event.name}`);
        } catch (error) {
          console.error(`❌ Erreur lors de l'importation de ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des événements:', error);
    }
  }

  async deployCommands(): Promise<void> {
    const commands = this.commands.map((command) => command.data.toJSON());

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

    try {
      console.log(`📤 Déploiement de ${commands.length} commandes d'application...`);

      const guildId = process.env.GUILD_ID;
      const clientId = process.env.CLIENT_ID;

      if (guildId) {
        // Déploiement sur un serveur spécifique (pour le développement)
        await rest.put(
          Routes.applicationGuildCommands(clientId!, guildId),
          { body: commands }
        );
        console.log(`✅ Commandes déployées sur le serveur ${guildId}`);
      } else {
        // Déploiement global
        await rest.put(
          Routes.applicationCommands(clientId!),
          { body: commands }
        );
        console.log('✅ Commandes déployées globalement');
      }
    } catch (error) {
      console.error('❌ Erreur lors du déploiement des commandes:', error);
      throw error;
    }
  }
}
