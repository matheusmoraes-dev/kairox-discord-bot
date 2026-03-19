const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Substitua pelo seu client ID e guild ID:
const CLIENT_ID = '1379158000995926087';
const GUILD_ID = '1325646271968579665';

// Carrega os comandos da pasta /comandos
const commands = [];
const comandosPath = path.join(__dirname, 'comandos');
const arquivos = fs.readdirSync(comandosPath).filter(arquivo => arquivo.endsWith('.js'));

for (const arquivo of arquivos) {
  const comando = require(`./comandos/${arquivo}`);
  if ('data' in comando && 'execute' in comando) {
    commands.push(comando.data.toJSON());
  } else {
    console.warn(`[AVISO] O comando ${arquivo} está faltando as propriedades "data" ou "execute".`);
  }
}

// Conecta ao REST da API do Discord
const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`🔁 Iniciando deploy de ${commands.length} comandos (guild)...`);

    // Registra comandos apenas para a guild de teste
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log(':white_check_mark: Comandos registrados com sucesso na guild!');
  } catch (error) {
    console.error(':x: Erro ao registrar comandos:', error);
  }
})();