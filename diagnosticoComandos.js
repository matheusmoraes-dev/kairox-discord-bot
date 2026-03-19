require('dotenv').config();
const { REST, Routes } = require('discord.js');

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('\n🔍 Listando comandos registrados...\n');

    // 🌐 Globais
    const globalCommands = await rest.get(Routes.applicationCommands(clientId));
    console.log('🌐 COMANDOS GLOBAIS:');
    if (globalCommands.length === 0) {
      console.log('  ⚠️ Nenhum comando global encontrado.');
    } else {
      globalCommands.forEach(cmd => console.log(`  • ${cmd.name}`));
    }

    // 🛡️ Guild
    const guildCommands = await rest.get(Routes.applicationGuildCommands(clientId, guildId));
    console.log('\n🛡️ COMANDOS DO SERVIDOR (Guild):');
    if (guildCommands.length === 0) {
      console.log('  ⚠️ Nenhum comando de guild encontrado.');
    } else {
      guildCommands.forEach(cmd => console.log(`  • ${cmd.name}`));
    }

    console.log('\n✅ Diagnóstico concluído.');
  } catch (error) {
    console.error('❌ Erro ao listar comandos:', error);
  }
})();