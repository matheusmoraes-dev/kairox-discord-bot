const { db, dbRun, dbGet, dbAll } = require('../database/database');

const MS_30_MIN = 30 * 60 * 1000;
let notificacoesUsuarios = new Set();

async function iniciarCronjobRifa(client) {
  await verificarERodartRifa(client);
  setInterval(() => verificarERodartRifa(client), MS_30_MIN);
}

async function verificarERodartRifa(client) {
  try {
    const agora = Math.floor(Date.now() / 1000);
    const rifaAtual = await dbGet("SELECT * FROM rifas WHERE tipo = ? ORDER BY id DESC LIMIT 1", ['relampago']);

    if (!rifaAtual || rifaAtual.timestamp <= agora) {
      if (rifaAtual) {
        await sortearRifa(client, rifaAtual);
        await dbRun("DELETE FROM rifa_participantes WHERE rifa_id = ?", [rifaAtual.id]);
      }

      const novoTimestamp = agora + 1800;
      await dbRun("INSERT INTO rifas (tipo, premio, tickets_total, timestamp) VALUES (?, ?, ?, ?)", ['relampago', 0, 0, novoTimestamp]);
      console.log(`[Rifa] Nova Rifa Relâmpago criada. Resultado em ${new Date(novoTimestamp * 1000).toLocaleTimeString()}`);
      notificacoesUsuarios.clear();
    }
  } catch (err) {
    console.error('[Rifa] Erro no cronjob:', err);
  }
}

async function sortearRifa(client, rifa) {
  try {
    const participantes = await dbAll("SELECT user_id, quantidade FROM rifa_participantes WHERE rifa_id = ?", [rifa.id]);
    if (participantes.length === 0) {
      console.log('[Rifa] Nenhum participante para sortear.');
      await dbRun("UPDATE rifas SET ganhador_id = NULL WHERE id = ?", [rifa.id]);
      return;
    }

    let pool = [];
    participantes.forEach(p => {
      for (let i = 0; i < p.quantidade; i++) {
        pool.push(p.user_id);
      }
    });

    const ganhadorId = pool[Math.floor(Math.random() * pool.length)];
    await dbRun("UPDATE rifas SET ganhador_id = ? WHERE id = ?", [ganhadorId, rifa.id]);

    try {
      const user = await client.users.fetch(ganhadorId);
      if (user) await user.send(`🎉 Parabéns! Você ganhou a **Rifa Relâmpago** e levou **${rifa.premio.toLocaleString()} Kronos**!`);
    } catch {
      console.warn('[Rifa] Não foi possível enviar DM ao ganhador.');
    }

    for (const userId of notificacoesUsuarios) {
      if (userId === ganhadorId) continue;
      try {
        const user = await client.users.fetch(userId);
        if (user) await user.send(`⚠️ A Rifa Relâmpago acabou! O ganhador foi <@${ganhadorId}>.`);
      } catch {
        console.warn(`[Rifa] Falha ao notificar ${userId}`);
      }
    }

    console.log(`[Rifa] Sorteio concluído. Ganhador: ${ganhadorId}`);
  } catch (err) {
    console.error('[Rifa] Erro ao sortear rifa:', err);
  }
}

function adicionarNotificacao(userId) {
  notificacoesUsuarios.add(userId);
}

module.exports = {
  iniciarCronjobRifa,
  adicionarNotificacao
};