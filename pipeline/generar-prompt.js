#!/usr/bin/env node
/* Genera el prompt del día para la cuenta de Instagram de Barrio Verso con la herramienta oficial.

   Carga gencine.html + assets/cult-mode.js de una copia de themarchal/barrioverso-cine-gen (la rama
   main recién clonada) en jsdom, pulsa el botón Cult, elige el universo que toca hoy y tira el dado
   de escena Cult, que aplica el look recomendado por la herramienta. No modifica la herramienta.

   Uso:   node generar-prompt.js <carpeta-de-barrioverso-cine-gen> [--fecha AAAA-MM-DD] [--semilla N]
   Sale:  JSON por stdout con el prompt y los datos del día.  Código 0 = listo para generar imagen.
          Código distinto de 0 = no se publica (el motivo va por stderr y en el campo "error").

   Rotación sin estado: el número de día (zona Europe/Madrid) elige el universo (los seis, en ciclo)
   y el modo del texto de la publicación (los cinco, en ciclo). Si un día falla, el siguiente sigue
   el ciclo sin descuadrarse. */
'use strict';
const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('fs'), path = require('path');
const {execSync} = require('child_process');

const MODOS_TEXTO = [
  {id: 'literal', nombre: 'Literal'},
  {id: 'aforismo', nombre: 'Sabiduría / aforismo'},
  {id: 'pregunta', nombre: 'Pregunta incómoda'},
  {id: 'verdad_incomoda', nombre: 'Verdad que nadie quiere oír'},
  {id: 'verdad_alma', nombre: 'Verdad que el alma necesita oír'},
];
const MAX_TIRADAS = 25;
const DIAS_CADENA = 4;   // días hacia atrás que se recalculan para saber el look de ayer

/* Señales de que la herramienta está rota: con cualquiera de ellas no se publica. */
const ROTO = o => !o || /undefined|\[object|NaN|null\b/.test(o) || /, ,|,,|  ,/.test(o) || /\n\n\n/.test(o);
/* Cosas que una tirada válida puede traer pero que no sirven para este formato: se vuelve a tirar. */
const NITIDEZ = /\b(8k|4k|ultra[- ]?hd|hdr|high[- ]resolution|high[- ]definition|tack[- ]sharp|razor[- ]sharp|sharp focus|crisp focus|high quality|ultra[- ]detailed)\b/gi;
/* Solo cuenta si se pide: «NOT 8K», «no HDR», «never razor-sharp» son negaciones y están bien. */
const NEGACION = /\b(not|no|never|without|avoid|nor|non)\b[^.;:]{0,40}$/i;
function pideNitidez(prompt){
  for (const m of prompt.matchAll(NITIDEZ)) if (!NEGACION.test(prompt.slice(Math.max(0, m.index - 60), m.index))) return m[0];
  return '';
}
const OTRO_FORMATO = /\b(9:16|16:9|2\.39:1|2\.35:1|1\.85:1|3:2|2:3|1:1|4:5|5:4|21:9)\b|\bvertical crop\b/i;

function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function args(){
  const a = process.argv.slice(2), o = {dir: null, fecha: null, semilla: null};
  for (let i = 0; i < a.length; i++){
    if (a[i] === '--fecha') o.fecha = a[++i];
    else if (a[i] === '--semilla') o.semilla = Number(a[++i]);
    else if (!o.dir) o.dir = a[i];
  }
  if (!o.dir) throw new Error('Falta la carpeta de barrioverso-cine-gen');
  return o;
}

function fechaMadrid(){
  const p = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
  return p; // AAAA-MM-DD
}
function numeroDeDia(fecha){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!m) throw new Error('Fecha no válida: ' + fecha);
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000);
}

/* Igual que tests/harness.js de la herramienta: incrusta los <script src> locales, ignora hojas de
   estilo y fuentes, siembra Math.random y simula una licencia (la verja es solo de navegador). */
async function cargar(dir, semilla){
  const errores = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Could not load (img|link)|Not implemented|404/.test(String(e.message))) errores.push('jsdomError: ' + (e.detail && e.detail.stack || e.stack || e.message)); });
  vc.on('error', (...a) => errores.push('console.error: ' + a.join(' ')));
  let html = fs.readFileSync(path.join(dir, 'gencine.html'), 'utf8');
  html = html.replace(/<link[^>]*>/g, '').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
    const f = path.join(dir, src);
    if (!/^(https?:)?\/\//.test(src) && fs.existsSync(f)) return '<script>' + fs.readFileSync(f, 'utf8').replace(/<\/script/g, '<\\/script') + '\n//# sourceURL=' + src + '</script>';
    return '<script>console.warn("no cargado: ' + src + '")</script>';
  });
  const dom = new JSDOM(html, {
    url: 'https://barrioverso.com/gencine.html', runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true,
    beforeParse(w){
      w.localStorage.setItem('bv_license', JSON.stringify({key: 'PIPELINE'}));
      w.localStorage.setItem('gec_idioma_v1', 'es');
      w.Math.random = mulberry32(semilla);
      w.addEventListener('error', e => errores.push('window.onerror: ' + (e.error && e.error.stack || e.message)));
    },
  });
  await new Promise(r => { if (dom.window.document.readyState === 'complete') r(); else dom.window.addEventListener('load', r); });
  await new Promise(r => setTimeout(r, 20));
  return {w: dom.window, errores};
}

function valor(w, id){ const e = w.document.getElementById(id); if (!e) return ''; if (e.type === 'checkbox') return e.checked; return e.value; }
function etiqueta(w, id){ const e = w.document.getElementById(id); return e && e.selectedOptions && e.selectedOptions[0] ? e.selectedOptions[0].textContent.trim().replace(/^R · /, '') : ''; }

async function tirada(dir, universo, semilla){
  const {w, errores} = await cargar(dir, semilla);
  const $ = id => w.document.getElementById(id);
  const fuera = msg => ({roto: true, motivo: msg, errores});
  if (!w.CULT || !w.CULT_ENGANCHES) return fuera('La herramienta no tiene el modo Cult enganchado (falta window.CULT o CULT_ENGANCHES)');
  if (!$('cultModoCultBtn')) return fuera('No aparece el botón Cult');
  $('cultModoCultBtn').click();
  if (!w.CULT.activo()) return fuera('El botón Cult no activa el modo Cult');
  const U = w.CULT.datos.UNIVERSOS[universo];
  if (!U) return fuera('El universo "' + universo + '" no existe en la herramienta');
  $('cultUniverso').value = universo;
  $('cultUniverso').dispatchEvent(new w.Event('change', {bubbles: true}));
  if (!$('cultRandomBtn')) return fuera('No aparece el dado de escena Cult');
  /* «Universo al azar» tiene que estar desmarcada: el universo lo decide la rotación diaria. */
  const azarUniverso = $('cultUniversoAzarCheck');
  if (azarUniverso && azarUniverso.checked){ azarUniverso.checked = false; azarUniverso.dispatchEvent(new w.Event('change', {bubbles: true})); }
  $('cultRandomBtn').click();
  if ($('cultUniverso').value !== universo) return fuera('El dado ha cambiado el universo del día (' + universo + ' → ' + $('cultUniverso').value + ')');
  const prompt = $('output').value;
  if (errores.length) return fuera('Errores JS en la herramienta');
  if (ROTO(prompt)) return fuera('El prompt sale roto o vacío');
  /* El ancla empieza igual en foto y en fotograma de vídeo (solo cambia la palabra "photograph"). */
  if (!prompt.includes(U.anchorIntro.split(' photograph')[0])) return fuera('El prompt no lleva el ancla del universo');
  if (!/Scene: /.test(prompt) && !$('escenaCompleta').value) return fuera('El prompt no lleva escena');
  const avisos = w.eval('typeof verificarCoherenciaFisica === "function" ? verificarCoherenciaFisica() : []');
  const ficha = {
    preset: etiqueta(w, 'presetDireccion'), camara: etiqueta(w, 'cam'), stock: etiqueta(w, 'stock'),
    grade: etiqueta(w, 'grade'), degradacion: etiqueta(w, 'degrade'), direccionArte: etiqueta(w, 'paleta'),
    tipoEscena: etiqueta(w, 'cultTipo'), marcador: etiqueta(w, 'cultMarcador'), arquetipo: etiqueta(w, 'cultArquetipo'),
    escenario: etiqueta(w, 'cultEscenario'),
  };
  /* Identificadores, no etiquetas: la etiqueta cambia con el prefijo «R · » de la opción recomendada. */
  const look = valor(w, 'cam') + ' | ' + valor(w, 'stock');
  const resultado = {roto: false, prompt, ficha, look, avisos: avisos.length,
    nitidez: pideNitidez(prompt), otroFormato: (prompt.match(OTRO_FORMATO) || [''])[0], nombreUniverso: etiqueta(w, 'cultUniverso')};
  w.close();
  return resultado;
}

(async () => {
  const o = args();
  const dir = path.resolve(o.dir);
  const fecha = o.fecha || fechaMadrid();
  const dia = numeroDeDia(fecha);
  let commit = '';
  try { commit = execSync('git -C ' + JSON.stringify(dir) + ' rev-parse --short HEAD', {stdio: ['ignore', 'pipe', 'ignore']}).toString().trim(); } catch(e){}
  const salida = {fecha, commitHerramienta: commit};
  try {
    /* Lista de universos tal como la trae la herramienta: si se añade uno, entra solo en la rotación. */
    const base = await cargar(dir, 1);
    if (!base.w.CULT) throw new Error('La herramienta no carga el modo Cult (assets/cult-mode.js)');
    const universos = Object.keys(base.w.CULT.datos.UNIVERSOS);
    base.w.close();
    const universoDe = d => universos[((d % universos.length) + universos.length) % universos.length];
    const universo = universoDe(dia);
    const modo = MODOS_TEXTO[((dia % 5) + 5) % 5];
    Object.assign(salida, {universo, modoTexto: modo});

    /* Elige la tirada de un día. `evitar` es el look (cámara + stock) del día anterior: si coincide,
       se vuelve a tirar, para que el feed no repita look dos días seguidos. */
    async function elegirDia(d, evitar, semillaBase){
      let descartes = 0, repetidas = 0;
      for (let i = 0; i < MAX_TIRADAS; i++){
        const semilla = semillaBase != null ? semillaBase + i : d * 1000 + i;
        const t = await tirada(dir, universoDe(d), semilla);
        if (t.roto) return {error: t.motivo, errores: (t.errores || []).slice(0, 5)};
        if (t.avisos || t.nitidez || t.otroFormato){ descartes++; continue; }
        if (evitar && lookDe(t) === evitar){ repetidas++; continue; }
        return Object.assign(t, {semilla, descartes, repetidas});
      }
      return {error: `Ninguna de ${MAX_TIRADAS} tiradas sirvió (avisos de coherencia, nitidez, otro formato o look repetido)`};
    }
    const lookDe = t => t.look;

    /* Sin estado guardado: el look de ayer se recalcula. Se reconstruye la cadena desde unos días
       atrás aplicando la misma regla, así que coincide con lo que publicó el día anterior mientras
       la herramienta no haya cambiado entre medias. */
    let evitar = null;
    if (o.semilla == null){
      for (let d = dia - DIAS_CADENA; d < dia; d++){
        const r = await elegirDia(d, evitar);
        evitar = r.error ? null : lookDe(r);
      }
    }
    const elegida = await elegirDia(dia, evitar, o.semilla);
    if (elegida.error){ salida.error = elegida.error; if (elegida.errores) salida.errores = elegida.errores; throw new Error(salida.error); }
    Object.assign(salida, {nombreUniverso: elegida.nombreUniverso, semilla: elegida.semilla,
      tiradasDescartadas: elegida.descartes, tiradasPorLookRepetido: elegida.repetidas, lookAyer: evitar,
      ficha: elegida.ficha, prompt: elegida.prompt,
      magnific: {modelo: 'GPT 2', resolution: '1k', quality: 'low', aspectRatio: '4:3'}});
    process.stdout.write(JSON.stringify(salida, null, 2) + '\n');
  } catch (e){
    salida.error = salida.error || e.message;
    process.stdout.write(JSON.stringify(salida, null, 2) + '\n');
    process.stderr.write('NO SE PUBLICA: ' + salida.error + '\n');
    process.exit(1);
  }
})();
