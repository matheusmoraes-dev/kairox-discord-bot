const { EmbedBuilder } = require('discord.js');
const { getOrCreate, update, logTransaction } = require('../../database/database');

// ⏳ Tempo de espera entre trabalhos: 15 minutos
const COOLDOWN_MS = 15 * 60 * 1000;

// Lista de empregos e salários (adicione mais se quiser)
const empregos = [
  { nome: '🧹 Faxineiro', salario: 1500 },
  { nome: '💻 Programador', salario: 2000 },
  { nome: '🚚 Caminhoneiro', salario: 3500 },
  { nome: '🧑‍🏫 Professor', salario: 2500 },
  { nome: '🛵 Entregador', salario: 1800 },
  { nome: '👨‍⚕️ Médico', salario: 8000 },
  { nome: '👩‍💻 Atendente de Loja', salario: 2500 },
  { nome: '👷‍♂️ Pedreiro', salario: 2500 },
  { nome: '🚌 Motorista de Ônibus', salario: 2500 },
  { nome: '🧑‍🌾 Agricultor', salario: 7000 }
];

module.exports = {
  name: 'work',
  description: 'Trabalhe em um emprego aleatório e ganhe seu salário!',

  async execute(message) {
    const userId = message.author.id;
    const username = message.author.username;

    // 🔎 Busca ou cria o usuário no banco
    const user = await getOrCreate(userId, username);

    const now = Date.now();

    // ⏳ Verifica cooldown
    if (user.lastWork && now - user.lastWork < COOLDOWN_MS) {
      const timeLeftMs = COOLDOWN_MS - (now - user.lastWork);
      const minutes = Math.floor(timeLeftMs / 60000);
      const seconds = Math.floor((timeLeftMs % 60000) / 1000);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⏳ Aguarde um momento!')
            .setDescription(`Você já trabalhou recentemente. Tente novamente em **${minutes}m ${seconds}s**.`)
            .setColor('#ffae00')
        ]
      });
    }

    // 🎲 Sorteia um emprego aleatório
    const empregoSorteado = empregos[Math.floor(Math.random() * empregos.length)];

    // 💰 Aplica salário
    user.money = (user.money || 0) + empregoSorteado.salario;
    user.lastWork = now;

    // 💾 Atualiza usuário no banco
    await update(user);

    // 📝 Registra transação no histórico
    await logTransaction(userId, 'work', empregoSorteado.salario, `Trabalhou como ${empregoSorteado.nome}`);

    // 📦 Embed de resposta
    const embed = new EmbedBuilder()
      .setTitle('💼 Trabalho Realizado!')
      .setDescription(
        `Você trabalhou como **${empregoSorteado.nome}** e recebeu **${empregoSorteado.salario.toLocaleString()} Kronos**!`
      )
      .setColor('#5353ec')
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};