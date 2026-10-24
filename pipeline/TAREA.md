# Instrucciones de la tarea diaria (publicador de Barrio Verso)

Estas son las instrucciones que sigue la tarea programada cada día. Si cambian, se cambian aquí y en
la tarea a la vez.

## Reglas fijas

- **Herramienta:** `themarchal/barrioverso-cine-gen`, rama `main`, recién clonada en cada ejecución.
  Solo se lee: nunca se escribe en ese repositorio.
- **Imagen:** Magnific, modelo GPT 2 (`gpt-2`), `resolution: 1k`, `quality: low`,
  `aspectRatio: 4:3`, una sola imagen. El prompt se envía tal cual sale del arnés.
- **Publicación:** Zapier → Instagram for Business → *Publish Photo(s)*, con la conexión «#2» y la
  cuenta «Barrio Verso» (`instagramPageId` 17841416137054760). Los renders caducan: se publica en
  cuanto la imagen está lista.
- **Hashtags:** exactamente 4. Tres fijos, siempre en este orden: `#BarrioVerso #Filmmaking
  #AICinema`. El cuarto cambia según el universo del día (por ejemplo `#CineQuinqui`,
  `#CastaDorada`, `#OldMoney`, `#Americana`, `#CostumbrismoEspañol`, `#StreetCouture`).
- **Texto:** en español, voz Tarantino/Bukowski, frases cortas, sin exclamaciones, pocos emojis
  (0–2), en el modo que indica el arnés (`modoTexto`):
  1. Literal — lo que hay en el encuadre, contado seco.
  2. Sabiduría / aforismo.
  3. Pregunta incómoda.
  4. Verdad que nadie quiere oír.
  5. Verdad que el alma necesita oír.
  Nunca modo metafórico. El texto se escribe mirando la imagen generada, no solo el prompt.

## Pasos

1. Clonar `themarchal/barrioverso-cine-gen` (main) y `themarchal/barrioverso` (main).
2. En `barrioverso/pipeline`: `npm install` y `node generar-prompt.js <carpeta de barrioverso-cine-gen>`.
   Si sale con código distinto de 0, **no se publica**: se avisa con el motivo (campo `error`).
3. Generar la imagen en Magnific con el `prompt` y las constantes de arriba y esperar a que termine.
4. Descargar y mirar la imagen. Si está rota (vacía, marca de agua o texto sobreimpreso, figura
   deforme evidente), se genera una vez más con el mismo prompt; si vuelve a salir rota, se avisa
   y no se publica. Que se reconozcan marcas o logos dentro de la escena no es motivo de descarte.
5. Escribir el texto según `modoTexto` y el universo del día, mirando la imagen. Comprobar: sin
   «!», 0–2 emojis, exactamente 4 hashtags y los tres fijos presentes.
6. Publicar en Instagram con la URL del render y el texto.
7. Avisar con: universo, ficha técnica (cámara, stock, grade, dirección de arte), texto publicado,
   enlace a la publicación y commit de la herramienta usado.
