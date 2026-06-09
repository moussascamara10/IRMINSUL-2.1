import { readdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { IrminsulClient } from './IrminsulClient.js';

const require = createRequire(import.meta.url);

export async function loadEvents(client: IrminsulClient): Promise<void> {
  const eventsPath = join(process.cwd(), 'src', 'core', 'events');
  console.log(`📂 Chemin des événements: ${eventsPath}`);

  let loadedCount = 0;
  let errorCount = 0;
  let totalFiles = 0;

  try {
    const eventFiles = readdirSync(eventsPath).filter((file) =>
      file.endsWith('.ts') || file.endsWith('.js')
    );

    console.log(`📂 Fichiers d'événements trouvés: ${eventFiles.length}`);
    totalFiles = eventFiles.length;

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      console.log(`📄 Importation de l'événement: ${filePath}`);

      try {
        // Utiliser require() avec tsx pour charger les fichiers TypeScript
        console.log(`🔗 Chemin: ${filePath}`);
        const eventModule = require(filePath);
        const event = eventModule.default || eventModule;
        console.log(`📦 Événement importé: ${event.name}`);

        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
          console.log(`✅ Événement (once) chargé: ${event.name}`);
          loadedCount++;
        } else {
          client.on(event.name, (...args) => event.execute(...args));
          console.log(`✅ Événement chargé: ${event.name}`);
          loadedCount++;
        }
      } catch (error) {
        console.error(`❌ Erreur lors de l'importation de ${file}:`, error);
        errorCount++;
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des événements:', error);
  }

  // Guard: crash si aucun événement n'est chargé
  if (loadedCount === 0) {
    console.error(`🚨 CRITIQUE: 0 événements chargés sur ${totalFiles} tentés (${errorCount} erreurs)`);
    console.error(`🚨 Le bot ne peut pas fonctionner sans event handlers. Arrêt forcé.`);
    process.exit(1);
  }

  console.log(`✅ ${loadedCount} événements chargés (${errorCount} erreurs ignorées)`);
}
