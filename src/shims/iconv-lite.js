// ============================================================================
// Stub do iconv-lite para o Cloudflare Workers.
//
// O Express carrega body-parser → raw-body → iconv-lite, e o iconv-lite quebra
// no workerd ("require_streams is not a function") porque depende de streams do
// Node que o bundler não resolve.
//
// A API só fala UTF-8 (e o corpo é lido por um parser próprio no server.js),
// então basta um stub que saiba UTF-8 e diga "não sei" para o resto.
// O `alias` no wrangler.toml troca o pacote real por este arquivo.
// ============================================================================

const SUPORTADAS = new Set(['utf8', 'utf-8', 'ascii', 'us-ascii', 'latin1', 'binary', 'iso-8859-1', 'utf16le', 'ucs2', 'ucs-2', 'utf-16le'])

function normalizar (enc) {
  return String(enc || 'utf8').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function encodingExists (enc) {
  const n = normalizar(enc)
  return SUPORTADAS.has(n) || SUPORTADAS.has(n.replace(/^utf/, 'utf-'))
}

function decode (buf, enc) {
  if (typeof buf === 'string') return buf
  const n = normalizar(enc)
  const rotulo = n === 'latin1' || n === 'binary' || n === 'iso88591' ? 'iso-8859-1'
    : n === 'utf16le' || n === 'ucs2' || n === 'ucs-2' ? 'utf-16le'
    : 'utf-8'
  return new TextDecoder(rotulo).decode(buf)
}

function encode (str, _enc) {
  return new TextEncoder().encode(String(str))
}

// raw-body/body-parser podem pedir estes; devolvemos algo que só acumula UTF-8.
function getDecoder (enc) {
  const partes = []
  return {
    write (chunk) { partes.push(decode(chunk, enc)); return partes[partes.length - 1] },
    end () { return '' }
  }
}
function getEncoder () {
  return { write (str) { return encode(str) }, end () { return new Uint8Array(0) } }
}

module.exports = {
  encodingExists, decode, encode, getDecoder, getEncoder,
  encodings: {}, defaultCharUnicode: '�', defaultCharSingleByte: '?',
  // usado por alguns caminhos do raw-body
  getCodec: () => ({ encoder: getEncoder, decoder: getDecoder })
}
