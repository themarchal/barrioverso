# barrioverso — publicador diario de Instagram

Publicador automático de la cuenta de Instagram de Barrio Verso: una imagen al día generada con la
herramienta oficial (modo Cult) de
[barrioverso-cine-gen](https://github.com/themarchal/barrioverso-cine-gen), renderizada con
Magnific GPT 2 y publicada a través de Zapier.

## Cómo funciona

1. Una tarea programada clona cada día la rama `main` de `barrioverso-cine-gen`, así que las mejoras
   de la herramienta llegan solas. La herramienta solo se lee; nunca se modifica desde aquí.
2. `pipeline/generar-prompt.js` la carga en jsdom (como `tests/harness.js` de la herramienta), pulsa
   el botón Cult, elige el universo del día y tira el dado de escena Cult, que aplica el look que
   recomienda la propia herramienta.
3. El universo rota por los seis de la herramienta y el modo del texto por los cinco, según la fecha
   (Europe/Madrid). No hay estado guardado: si un día falla, el ciclo sigue sin descuadrarse.
4. Antes de gastar créditos se comprueba el prompt. Si la herramienta llega rota (sin modo Cult, con
   errores JS, prompt vacío o sin ancla del universo), ese día no se publica. Las tiradas válidas que
   no sirven para este formato (avisos de coherencia, petición de nitidez, otro formato que no sea
   4:3) se vuelven a tirar. También se vuelve a tirar si la cámara y el stock coinciden con los del
   día anterior, para que el feed no repita look dos días seguidos.
5. La tarea genera la imagen en Magnific (GPT 2, 1k, low, 4:3), escribe el texto y publica.

Las instrucciones completas de la tarea están en [`pipeline/TAREA.md`](pipeline/TAREA.md).

## Probar el arnés a mano

```bash
git clone --depth 1 https://github.com/themarchal/barrioverso-cine-gen
cd pipeline && npm install
node generar-prompt.js ../../barrioverso-cine-gen                 # el de hoy
node generar-prompt.js ../../barrioverso-cine-gen --fecha 2026-11-01
```

El contenido anterior del repositorio (un publicador en Python que nunca llegó a funcionar y las
miniaturas de Promptypedia, que ahora se sirven desde barrioverso.com/images/) sigue en el historial.
