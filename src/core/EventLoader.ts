import { readdirSync } from 'fs';
import { join, dirname, extname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { IrminsulClient } from './IrminsulClient.js';

export async function loadEvents(client: IrminsulClient): Promise<void> {
  // AUTO-DÉTECTION : même mécanique que CommandLoader
  const currentFile = fileURLToPath(import.meta.url);
  const coreDir    = dirname(currentFile);
  const fileExt    = extname(currentFile);           // .ts ou .js
  const eventsPath = join(coreDir, 'events');        // core/events/ = toujours relatif à core/

  console.log(`📂 Chargement événements depuis: ${eventsPath} (ext: ${fileExt})`);

  let eventFiles: string[];
  try {
    eventFiles = readdirSync(eventsPath).filter(f =>
      f.endsWith(fileExt) && !f.includes('.d.')
    );
  } catch {
    console.error(`� Dossier events introuvable: ${eventsPath}`);
    process.exit(1);
  }

  let loadedCount = 0;
  let errorCount  = 0;

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    try {
      const fileUrl = pathToFileURL(filePath).href;
      const mod     = await import(fileUrl);
      const event   = mod.default ?? mod;

      if (!event?.name || typeof event.execute !== 'function') {
        console.warn(`⚠️ Événement invalide (name ou execute manquant): ${file}`);
        errorCount++;
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args: unknown[]) => event.execute(...args));
      } else {
        client.on(event.name, (...args: unknown[]) => event.execute(...args));
      }

      console.log(`✅ Événement enregistré: ${event.name}`);
      loadedCount++;

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Erreur lors de l'importation de ${file}: ${errMsg}`);
      errorCount++;
    }
  }

  if (loadedCount === 0) {
    console.error(`🚨 CRITIQUE: 0 événements chargés (${errorCount} erreurs)`);
    console.error(`🚨 Sans interactionCreate, aucune commande Discord ne peut répondre.`);
    process.exit(1);
  }

  console.log(`✅ Événements chargés: ${loadedCount}/${eventFiles.length} (${errorCount} erreurs)`);
}
