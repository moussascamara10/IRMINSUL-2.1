import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const commands: any[] = [];
const commandsPath = join(process.cwd(), 'dist', 'modules');
const moduleFolders = readdirSync(commandsPath);

console.log('📂 Modules trouvés:', moduleFolders);

for (const folder of moduleFolders) {
  const folderCommandsPath = join(process.cwd(), 'dist', 'modules', folder, 'commands');
  
  try {
    const commandFiles = readdirSync(folderCommandsPath).filter((file) => 
      file.endsWith('.js')
    );

    console.log(`📂 Dossier ${folder}/commands: ${commandFiles.length} fichiers`);

    for (const file of commandFiles) {
      const filePath = join(folderCommandsPath, file);
      console.log(`📄 Importation: ${filePath}`);
      
      try {
        // Import compatible avec Windows et Linux
        const { default: command } = await import(filePath);

        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
          console.log(`✅ Commande ajoutée: ${command.data.name}`);
        } else {
          console.warn(`⚠️ La commande dans ${file} manque les propriétés "data" ou "execute"`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors de l'importation de ${file}:`, error);
      }
    }
  } catch (error) {
    // Le dossier commands n'existe peut-être pas pour ce module
    console.log(`⚠️ Dossier ${folder}/commands inexistant ou erreur`);
    continue;
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

(async () => {
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
    process.exit(1);
  }
})();
