# Guide de Configuration IRMINSUL V2

## 1. Configuration des Commandes Admin

Les commandes admin sont déjà configurées avec votre ID utilisateur: `1153427632961110117`

Pour ajouter d'autres admins, modifiez le tableau `ADMIN_IDS` dans chaque fichier de commande admin:
```typescript
const ADMIN_IDS = ['1153427632961110117', 'AUTRE_ID_ICI'];
```

Fichiers à modifier:
- `src/modules/admin/commands/give-ar.ts`
- `src/modules/admin/commands/give-mora.ts`
- `src/modules/admin/commands/give-primogens.ts`
- `src/modules/admin/commands/give-resin.ts`
- `src/modules/admin/commands/give-fates.ts`
- `src/modules/admin/commands/reset-pity.ts`
- `src/modules/admin/commands/give-character.ts`

## 2. Configuration de la Météo

La météo nécessite une configuration dans MongoDB:

### Étape 1: Créer la collection server_config
```javascript
db.server_config.insertOne({
  guildId: "VOTRE_GUILD_ID",
  channels: {
    weather: "ID_DU_CANAL_METEO"
  },
  features: {
    weather: true
  }
})
```

### Étape 2: Activer le job DailyResetJob
Le job est déjà configuré dans `src/jobs/DailyResetJob.ts` mais nécessite:
- Un repository ServerConfigRepository réel (remplacer le mock)
- Une connexion Redis réelle (remplacer le mock)

## 3. Configuration Redis

Ajoutez ces variables dans votre `.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 4. Configuration MongoDB Atlas

Assurez-vous que votre `MONGODB_URI` dans `.env` est correct:
```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/irminsul?retryWrites=true&w=majority
```

## 5. Configuration Discord

Variables requises dans `.env`:
```env
DISCORD_TOKEN=VOTRE_TOKEN_BOT
CLIENT_ID=VOTRE_CLIENT_ID
GUILD_ID=VOTRE_GUILD_ID (optionnel pour déploiement guild-specific)
```

## 6. Déploiement des Commandes

### Déploiement Global (actuel)
Les commandes prennent jusqu'à 1 heure pour apparaître sur tous les serveurs.

### Déploiement Guild-Specific (test rapide)
Pour un test immédiat sur votre serveur:

1. Ajoutez `GUILD_ID` dans `.env`
2. Modifiez `scripts/deploy-commands.ts`:
```typescript
if (process.env.GUILD_ID) {
  const guildId = process.env.GUILD_ID;
  console.log(`📤 Déploiement de ${commands.length} commandes pour le serveur ${guildId}...`);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID!, guildId),
    { body: commands }
  );
} else {
  // Déploiement global
}
```

3. Relancez: `npx tsx scripts/deploy-commands.ts`

## 7. Commandes Admin Disponibles

Une fois configurées, ces commandes seront disponibles:
- `/admin-give-ar` - Donner du Rang Aventurier (1-60)
- `/admin-give-mora` - Donner du Mora
- `/admin-give-primogens` - Donner des Primogènes
- `/admin-give-resin` - Donner de la Résine (max 200)
- `/admin-give-fates` - Donner des Destins (Enchevêtrés/Entrelacés)
- `/admin-reset-pity` - Reset le Pity (Standard/Personnages/Armes)
- `/admin-give-character` - Donner un Personnage

## 8. Test Rapide

1. Redémarrez le bot: `npm start`
2. Dans Discord, tapez `/` pour voir les commandes
3. Testez une commande admin sur vous-même

## 9. Prochaines Étapes

Pour activer complètement la météo et autres fonctionnalités:
- Implémenter ServerConfigRepository réel
- Configurer Redis
- Créer les collections MongoDB nécessaires
- Configurer les canaux Discord pour les notifications
