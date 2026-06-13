import { readdirSync, statSync } from 'fs';
import { join, dirname, extname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { IrminsulClient } from './IrminsulClient.js';

export async function loadCommands(client: IrminsulClient): Promise<void> {
  // AUTO-DÉTECTION : src/ en dev (.ts), dist/ en prod (.js)
  const currentFile = fileURLToPath(import.meta.url);
  const coreDir    = dirname(currentFile);
  const rootDir    = dirname(coreDir);              // src/ ou dist/
  const fileExt    = extname(currentFile);          // .ts ou .js
  const modulesPath = join(rootDir, 'modules');

  console.log(`📂 Chargement depuis: ${modulesPath} (ext: ${fileExt})`);

  let loadedCount = 0;
  let errorCount  = 0;
  let totalFiles  = 0;

  // Lister les dossiers de modules
  let moduleDirs: string[];
  try {
    moduleDirs = readdirSync(modulesPath).filter(f => {
      try { return statSync(join(modulesPath, f)).isDirectory(); }
      catch { return false; }
    });
  } catch {
    console.error(`🚨 Dossier modules introuvable: ${modulesPath}`);
    process.exit(1);
  }

  console.log(`📂 Modules trouvés: ${moduleDirs.length}`);

  for (const moduleDir of moduleDirs) {
    const commandsPath = join(modulesPath, moduleDir, 'commands');
    let commandFiles: string[];

    try {
      commandFiles = readdirSync(commandsPath).filter(f =>
        f.endsWith(fileExt) && !f.includes('.d.')
      );
    } catch {
      continue; // Module sans dossier commands — pas une erreur
    }

    console.log(`📂 Dossier ${moduleDir}/commands: ${commandFiles.length} fichiers`);

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      totalFiles++;

      try {
        const fileUrl = pathToFileURL(filePath).href;
        const mod     = await import(fileUrl);
        const command = mod.default ?? mod;

        if (!command?.data?.name || typeof command.execute !== 'function') {
          console.warn(`⚠️ Structure invalide (data.name ou execute manquant): ${file}`);
          errorCount++;
          continue;
        }

        client.commands.set(command.data.name, command);
        console.log(`✅ Importé: ${command.data.name}`);
        loadedCount++;

      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const errCode = (error as NodeJS.ErrnoException).code ?? 'UNKNOWN';
        console.error(`❌ Erreur lors de l'importation de ${file}: [${errCode}] ${errMsg}`);
        errorCount++;
      }
    }
  }

  // GUARD ANTI-ZOMBIE — ne jamais mentir sur l'état réel
  if (loadedCount === 0) {
    console.error(`🚨 CRITIQUE: 0 commandes chargées sur ${totalFiles} tentées (${errorCount} erreurs)`);
    console.error(`🚨 modulesPath=${modulesPath} | ext=${fileExt}`);
    console.error(`🚨 Le bot ne peut pas fonctionner sans commandes. Arrêt forcé.`);
    process.exit(1);
  }

  console.log(`✅ Commandes chargées: ${loadedCount}/${totalFiles} (${errorCount} erreurs)`);
}
