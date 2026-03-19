module.exports = function parseValor(input) {
  if (!input) return 0;

  const str = input.toString().replace(/[\s,]/g, '').toLowerCase();

  const match = str.match(/^([\d.]+)([kmbt]{1,2})?$/);
  if (!match) return parseInt(str) || 0;

  const valor = parseFloat(match[1]);
  const sufixo = match[2];

  switch (sufixo) {
    case 'k': return Math.floor(valor * 1_000);
    case 'm': case 'mi': return Math.floor(valor * 1_000_000);
    case 'b': case 'bi': return Math.floor(valor * 1_000_000_000);
    case 't': case 'tri': return Math.floor(valor * 1_000_000_000_000);
    default: return Math.floor(valor);
  }
};