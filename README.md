# Preparar escalamiento (complemento de Outlook)

Panel para correos de reenvío: lee la plantilla de la alerta, llena fecha de ocurrencia,
fecha de escalamiento, analista y caso, y pone Para/CC según una matriz cargada por el usuario.

- No contiene datos de clientes ni de la organización.
- Las matrices (Excel) y el nombre del analista se cargan desde el panel y se guardan en la
  configuración del complemento en el buzón del usuario (roaming settings).
- Todo el procesamiento ocurre dentro de Outlook; no se envía información a ningún servidor.

Incluye SheetJS (xlsx 0.18.5, licencia Apache 2.0) en este repositorio (xlsx.full.min.js).
