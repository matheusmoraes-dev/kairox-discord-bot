const { createCanvas, loadImage } = require('canvas');
const path = require('path');

function formatarData(timestamp) {
  if (!timestamp) return 'Nunca';
  const data = new Date(Number(timestamp));
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

async function generateProfileImage({
  username,
  avatarURL,
  kronos,
  rankKronos,
  lastDaily,
  isBooster = false,
  isPremium = false,
  isDoador = false,
}) {
  const canvas = createCanvas(800, 300);
  const ctx = canvas.getContext('2d');

  const kronosImg = await loadImage(path.join(__dirname, '..', 'assets', 'Kronos.png'));
  const medalhaImg = await loadImage(path.join(__dirname, '..', 'assets', 'medalha.png'));
  const trofeuImg = await loadImage(path.join(__dirname, '..', 'assets', 'trofeu.png'));
  const dataImg = await loadImage(path.join(__dirname, '..', 'assets', 'data.png'));

  const badgeImg = isBooster
    ? await loadImage(path.join(__dirname, '..', 'assets', 'booster.png'))
    : isPremium
    ? await loadImage(path.join(__dirname, '..', 'assets', 'premium.png'))
    : isDoador
    ? await loadImage(path.join(__dirname, '..', 'assets', 'doador.png'))
    : null;

  // Fundo
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#23272a');
  gradient.addColorStop(1, '#2c2f33');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#1e2124';
  roundRect(ctx, 20, 20, 760, 260, 20);
  ctx.shadowBlur = 0;

  // Avatar
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

  // Nome com gradiente se for booster/premium/doador
  const infoColX = 210;
  const nomeY = 80;

  let gradientNome = ctx.createLinearGradient(0, 0, 500, 0);
  if (isBooster) {
    gradientNome.addColorStop(0, '#ff5dd6');
    gradientNome.addColorStop(1, '#ff9cbf');
  } else if (isPremium) {
    gradientNome.addColorStop(0, '#4cadd0');
    gradientNome.addColorStop(1, '#b2f9ff');
  } else if (isDoador) {
    gradientNome.addColorStop(0, '#369876');
    gradientNome.addColorStop(1, '#71ff9e');
  } else {
    gradientNome = '#ffffff';
  }

  ctx.font = 'bold 34px "Segoe UI", Tahoma, sans-serif';
  ctx.fillStyle = gradientNome;
  ctx.fillText(username, infoColX, nomeY - 10);

  // Ícone do tipo ao lado do nome
  if (badgeImg) {
    const textWidth = ctx.measureText(username).width;
    ctx.drawImage(badgeImg, infoColX + textWidth + 10, nomeY - 42, 36, 36);
  }

  // Função para caixas de info
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

  // Infos organizadas
  const leftColX = infoColX;
  const rightColX = 510;
  const boxWidth = 260;
  const boxHeight = 48;
  const gapY = 60;

  drawInfoBox(leftColX, 80, boxWidth, boxHeight, '#2c3e50', kronosImg, `Kronos: ${kronos.toLocaleString('pt-BR')}`, '#00ff99');
  drawInfoBox(rightColX, 80, boxWidth, 40, '#3b3f45', trofeuImg, `Rank Kronos: #${rankKronos}`, '#ffcc00');

  // Último daily com imagem
  const lastDailyText = `Último Daily: ${formatarData(lastDaily)}`;
  const lastDailyX = 760;
  const lastDailyY = 260;
  const iconSize = 28;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.drawImage(dataImg, lastDailyX - iconSize, lastDailyY - iconSize / 2, iconSize, iconSize);
  ctx.restore();

  ctx.fillStyle = '#bbbbbb';
  ctx.font = '20px "Segoe UI", Tahoma, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText(lastDailyText, lastDailyX - iconSize - 10, lastDailyY);
  ctx.textAlign = 'start';

  return canvas.toBuffer('image/png');
}

module.exports = { generateProfileImage };