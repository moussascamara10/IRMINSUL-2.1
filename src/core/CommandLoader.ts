import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { IrminsulClient, Command } from './IrminsulClient.js';

export async function loadCommands(client: IrminsulClient): Promise<void> {
  const commandsPath = join(process.cwd(), 'dist', 'modules');
  const moduleFolders = readdirSync(commandsPath);

  let loadedCount = 0;
  let errorCount = 0;
  let totalFiles = 0;

  console.log(`📂 Modules trouvés: ${moduleFolders.length}`);

  for (const folder of moduleFolders) {
    const commandsPath = join(process.cwd(), 'dist', 'modules', folder, 'commands');

    try {
      const commandFiles = readdirSync(commandsPath).filter((file) =>
        file.endsWith('.js')
      );

      console.log(`📂 Dossier ${folder}/commands: ${commandFiles.length} fichiers`);
      totalFiles += commandFiles.length;

      for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        console.log(`📄 Importation: ${filePath}`);
        
        try {
          // Utiliser import() dynamique pour charger les fichiers JavaScript compilés
          const fileUrl = pathToFileURL(filePath).href;
          const { default: command } = await import(fileUrl);

          if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Commande chargée: ${command.data.name}`);
            loadedCount++;
          } else {
            console.warn(`⚠️ La commande dans ${file} manque les propriétés "data" ou "execute"`);
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ Erreur lors de l'importation de ${file}:`, error);
          errorCount++;
        }
      }
    } catch (error) {
      // Le dossier commands n'existe peut-être pas pour ce module
      console.log(`⚠️ Dossier ${folder}/commands inexistant ou erreur`);
      continue;
    }
  }

  // Guard: crash si aucune commande n'est chargée
  if (loadedCount === 0) {
    console.error(`🚨 CRITIQUE: 0 commandes chargées sur ${totalFiles} tentées (${errorCount} erreurs)`);
    console.error(`🚨 Le bot ne peut pas fonctionner sans commandes. Arrêt forcé.`);
    process.exit(1);
  }

  console.log(`✅ ${loadedCount} commandes chargées (${errorCount} erreurs ignorées)`);
}
