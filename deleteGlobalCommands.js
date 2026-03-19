const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
require('dotenv').config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function deleteGlobalCommands() {
  try {
    const commands = await rest.get(Routes.applicationCommands(CLIENT_ID));

    console.log(`Encontrados ${commands.length} comandos globais.`);

    for (const command of commands) {
      await rest.delete(Routes.applicationCommand(CLIENT_ID, command.id));
      console.log(`❌ Deletado: ${command.name}`);
    }

    console.log('✅ Todos os comandos globais foram deletados com sucesso.');
  } catch (error) {
    console.error('Erro ao deletar comandos globais:', error);
  }
}

deleteGlobalCommands();