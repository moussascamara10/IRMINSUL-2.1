import { readdirSync } from 'fs';
import { join } from 'path';
import { IrminsulClient, Command } from './IrminsulClient.js';

export async function loadCommands(client: IrminsulClient): Promise<void> {
  const commandsPath = join(process.cwd(), 'src', 'modules');
  const moduleFolders = readdirSync(commandsPath);

  console.log(`📂 Modules trouvés: ${moduleFolders.length}`);

  for (const folder of moduleFolders) {
    const commandsPath = join(process.cwd(), 'src', 'modules', folder, 'commands');
    
    try {
      const commandFiles = readdirSync(commandsPath).filter((file) => 
        file.endsWith('.ts') || file.endsWith('.js')
      );

      console.log(`📂 Dossier ${folder}/commands: ${commandFiles.length} fichiers`);

      for (const file of commandFiles) {
        const filePath = join(commandsPath, file);
        console.log(`📄 Importation: ${filePath}`);
        
        try {
          // Convertir le chemin Windows en URL file:// pour ESM
          const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
          const { default: command } = await import(fileUrl);

          if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Commande chargée: ${command.data.name}`);
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
}
