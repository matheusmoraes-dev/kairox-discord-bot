const { createCanvas, loadImage } = require('canvas');
const path = require('path');

async function generateBankImage({
  username,
  avatarURL,
  saldoCarteira = 0,
  saldoBanco = 0,
}) {
  const canvas = createCanvas(800, 300);
  const ctx = canvas.getContext('2d');

  // Ícones do Kronos e Banco
  const kronosImg = await loadImage(path.join(__dirname, '..', 'assets', 'kronos.png'));
  const bancoImg = await loadImage(path.join(__dirname, '..', 'assets', 'banco.png'));

  // Fundo gradiente igual ao do profile
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#23272a');
  gradient.addColorStop(1, '#2c2f33');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Função para desenhar caixas arredondadas iguais ao profile
  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Caixa principal com sombra igual
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#1e2124';
  roundRect(ctx, 20, 20, 760, 260, 20);
  ctx.shadowBlur = 0;

  // Avatar circular com sombra e borda branca igual ao profile
  const avatarX = 40;
  const avatarY = 55;
  const avatarSize = 128;

  const avatar = await loadImage(avatarURL);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.clip();
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();

  // Nome do usuário (mesma fonte e estilo)
  const infoColX = 210;
  const nomeY = 80;

  ctx.font = 'bold 34px "Segoe UI", Tahoma, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(username, infoColX, nomeY);

  // Função para desenhar as caixas de informação (igual)
  function drawInfoBox(x, y, width, height, bgColor, iconImg, text, textColor) {
    ctx.fillStyle = bgColor;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    roundRect(ctx, x, y, width, height, 15);
    ctx.shadowBlur = 0;

    const iconSize = height - 14;
    ctx.drawImage(iconImg, x + 10, y + 7, iconSize, iconSize);

    ctx.fillStyle = textColor;
    ctx.font = 'bold 22px "Segoe UI", Tahoma, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 20 + iconSize, y + height / 2);
  }

  // Caixas com saldo da carteira e saldo do banco
  const leftColX = infoColX;
  const boxWidth = 540;
  const boxHeight = 60;
  const gapY = 80;

  drawInfoBox(
    leftColX,
    nomeY + 30,
    boxWidth,
    boxHeight,
    '#2c3e50',
    kronosImg,
    `Saldo na Carteira: ${saldoCarteira.toLocaleString('pt-BR')}`,
    '#00ff99'
  );

  drawInfoBox(
    leftColX,
    nomeY + 30 + gapY,
    boxWidth,
    boxHeight,
    '#34495e',
    bancoImg,
    `Saldo no Banco: ${saldoBanco.toLocaleString('pt-BR')}`,
    '#3399ff'
  );

  return canvas.toBuffer('image/png');
}

module.exports = { generateBankImage };