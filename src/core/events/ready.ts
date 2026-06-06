import { Events } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: any) {
    console.log(`✅ ${client.user.tag} est connecté et prêt!`);
    console.log(`📊 Servis: ${client.guilds.cache.size} serveurs`);
    console.log(`👥 Utilisateurs: ${client.users.cache.size} utilisateurs`);
  },
};
