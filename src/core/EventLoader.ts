import { readdirSync } from 'fs';
import { join } from 'path';
import { IrminsulClient } from './IrminsulClient.js';

export async function loadEvents(client: IrminsulClient): Promise<void> {
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
          client.once(event.name, (...args) => event.execute(...args));
          console.log(`✅ Événement (once) chargé: ${event.name}`);
        } else {
          client.on(event.name, (...args) => event.execute(...args));
          console.log(`✅ Événement chargé: ${event.name}`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors de l'importation de ${file}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des événements:', error);
  }
}
