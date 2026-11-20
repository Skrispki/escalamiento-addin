/* Conexión con Outlook (Office.js). La lógica está en core.js (objeto Esc). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var item, matrices = {}, analista = '', alerta = null, clienteKey = null;

  function p(fn) {
    return new Promise(function (ok, ko) {
      fn(function (r) { r.status === Office.AsyncResultStatus.Succeeded ? ok(r.value) : ko(r.error); });
    });
  }
  var getBody = function () { return p(function (cb) { item.body.getAsync(Office.CoercionType.Html, cb); }); };
  var setBody = function (h) { return p(function (cb) { item.body.setAsync(h, { coercionType: Office.CoercionType.Html }, cb); }); };
  var getRec = function (f) { return p(function (cb) { item[f].getAsync(cb); }).then(function (v) { return v.map(function (r) { return r.emailAddress; }); }); };
  var setRec = function (f, list) { return p(function (cb) { item[f].setAsync(list, cb); }); };
  var getSubj = function () { return p(function (cb) { item.subject.getAsync(cb); }); };
  var setSubj = function (s) { return p(function (cb) { item.subject.setAsync(s, cb); }); };
  var guardar = function () { return p(function (cb) { Office.context.roamingSettings.saveAsync(cb); }); };

  function estado(texto, tipo) { var e = $('estado'); e.className = 'msg ' + tipo; e.textContent = texto; }
  function resultado(errores, avisos, ok, titulo) {
    var h = '';
    var lista = function (arr) { return '<ul>' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
    if (errores && errores.length) h += '<div class="msg err"><b>' + (titulo || 'No se llenó nada:') + '</b>' + lista(errores) + '</div>';
    if (avisos && avisos.length) h += '<div class="msg avi"><b>Revisa:</b>' + lista(avisos) + '</div>';
    if (ok) h += '<div class="msg ok">' + esc(ok) + '</div>';
    $('resultado').innerHTML = h;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function parse(html) { return new DOMParser().parseFromString(html, 'text/html'); }

  function filaActual() {
    var m = clienteKey && matrices[clienteKey];
    if (!m || !alerta) return null;
    return Esc.pickRow(m.rows, $('sub').value, alerta.idlookup);
  }

  function pintarDestinatarios() {
    var f = filaActual();
    $('dPara').textContent = f ? Esc.emails(f.Para).join('; ') : '—';
    $('dCC').textContent = f ? Esc.emails(f.CC).join('; ') : '—';
  }

  function pintarMatrices() {
    var ks = Object.keys(matrices);
    $('matricesInfo').innerHTML = ks.length
      ? 'Cargadas: ' + ks.map(function (k) { return '<b>' + esc(matrices[k].cliente) + '</b> (' + matrices[k].rows.length + ' filas)'; }).join(', ')
      : 'No hay matrices cargadas.';
    $('analista').value = analista;
  }

  function cargarAlerta() {
    $('resultado').innerHTML = '';
    return getBody().then(function (html) {
      var doc = parse(html);
      alerta = Esc.readAlert(doc);
      if (!alerta.cliente) {
        $('alerta').style.display = 'none';
        estado('No encontré el campo "Cliente:" en este correo. Abre la alerta, dale Reenviar y vuelve a abrir este panel.', 'err');
        return;
      }
      $('alerta').style.display = 'block';
      $('aNombre').textContent = alerta.nombre || '(sin nombre)';
      $('aId').textContent = alerta.idlookup || '(sin ID)';
      $('aCliente').textContent = alerta.cliente;
      clienteKey = Esc.key(alerta.cliente);
      var m = matrices[clienteKey];
      var sel = $('sub'); sel.innerHTML = '';
      if (!m) {
        $('subNota').textContent = '';
        estado('No hay matriz cargada para el cliente "' + alerta.cliente + '". Cárgala en Configuración (archivo ' + alerta.cliente + '.xlsx).', 'err');
      } else {
        var subs = Esc.subclientes(m.rows);
        subs.forEach(function (s) { var o = document.createElement('option'); o.value = o.textContent = s; sel.appendChild(o); });
        var sug = Esc.sugerirSubcliente(subs, alerta.cliente, doc.body.textContent);
        sel.value = sug.valor;
        $('subNota').textContent = sug.detectado ? 'Detectado porque el correo menciona "' + sug.valor + '". Confírmalo.' : 'Confirma el subcliente.';
        estado('Alerta detectada. Revisa los datos y dale "Llenar escalamiento".', 'ok');
      }
      var f = Esc.parseFechaReenvio(doc.body.textContent);
      $('ocurrencia').value = f ? Esc.fmtInput(f) : '';
      $('ocuNota').textContent = f ? 'Tomada de la fecha de la alerta original. Verifícala.' : 'No la pude detectar: escríbela.';
      pintarDestinatarios();
    }).catch(function (e) { estado('No pude leer el correo: ' + (e && e.message || e), 'err'); });
  }

  function llenar() {
    var errores = [], avisos = [];
    var fila = filaActual();
    if (!analista) errores.push('Configura tu nombre en "Configuración".');
    if (!matrices[clienteKey]) errores.push('No hay matriz cargada para el cliente "' + (alerta && alerta.cliente) + '".');
    else if (!fila) errores.push('La matriz no tiene una fila activa para el subcliente "' + $('sub').value + '" (ni para el ID ' + alerta.idlookup + ' ni con *).');
    var oc = Esc.fromInput($('ocurrencia').value);
    if (!oc) errores.push('Falta la fecha y hora de ocurrencia.');
    if (fila && !Esc.emails(fila.Para).length) errores.push('La fila de la matriz no tiene correos en "Para".');
    if (errores.length) return resultado(errores);

    var caso = Esc.norm($('caso').value);
    getBody().then(function (html) {
      var doc = parse(html);
      var men = Esc.revisarMenciones(matrices, clienteKey, $('sub').value, doc.body.textContent);
      errores = errores.concat(men.errores); avisos = avisos.concat(men.avisos);
      if (errores.length) return resultado(errores, avisos);
      var faltan = Esc.llenar(doc, {
        ocurrencia: Esc.fmtPlantilla(oc),
        escalamiento: Esc.fmtPlantilla(Esc.fromDate(new Date())),
        analista: analista,
        caso: caso || null
      });
      if (faltan.length) return resultado(['No encontré estos campos en el correo: ' + faltan.join(', ') + '.'], avisos);
      var nuevo = '<!DOCTYPE html>' + doc.documentElement.outerHTML;
      return setBody(nuevo)
        .then(function () { return setRec('to', Esc.emails(fila.Para)); })
        .then(function () { return setRec('cc', Esc.emails(fila.CC)); })
        .then(function () {
          if (!$('ajAsunto').checked) return;
          return getSubj().then(function (s) { return setSubj(Esc.armarAsunto(s, caso)); });
        })
        .then(function () {
          resultado(null, avisos, 'Listo: plantilla, Para, CC' + ($('ajAsunto').checked ? ' y asunto' : '') + ' llenados. Revisa el correo y dale Enviar.');
        });
    }).catch(function (e) { resultado(['Error al llenar: ' + (e && e.message || e)]); });
  }

  function revisar() {
    var fila = filaActual();
    if (!fila) return resultado(['No hay fila de la matriz para comparar.']);
    Promise.all([getRec('to'), getRec('cc')]).then(function (v) {
      var r = Esc.revisarDestinatarios(fila, v[0], v[1]);
      var errores = r.extra.length ? ['Estos destinatarios NO están en la matriz de ' + $('sub').value + ': ' + r.extra.join(', ')] : [];
      var avisos = [];
      if (r.faltanPara.length) avisos.push('Faltan en Para: ' + r.faltanPara.join(', '));
      if (r.faltanCC.length) avisos.push('Faltan en CC: ' + r.faltanCC.join(', '));
      if (errores.length) resultado(errores, avisos, null, 'No envíes todavía:');
      else resultado(null, avisos, avisos.length ? null : 'Destinatarios correctos según la matriz.');
    }).catch(function (e) { resultado(['No pude leer los destinatarios: ' + (e && e.message || e)]); });
  }

  function leerExcel(file) {
    return file.arrayBuffer().then(function (buf) {
      var wb = XLSX.read(buf, { type: 'array' });
      var hoja = wb.Sheets.Matriz || wb.Sheets[wb.SheetNames[0]];
      var filas = Esc.filasMatriz(XLSX.utils.sheet_to_json(hoja, { defval: '' }));
      return { cliente: file.name.replace(/\.xlsx$/i, '').trim(), rows: filas };
    });
  }

  function cargarArchivos(ev) {
    var files = Array.prototype.slice.call(ev.target.files || []);
    if (!files.length) return;
    Promise.all(files.map(leerExcel)).then(function (res) {
      var errores = [], copia = JSON.parse(JSON.stringify(matrices));
      res.forEach(function (m) {
        if (!m.rows.length) errores.push(m.cliente + '.xlsx no tiene filas válidas (revisa la hoja "Matriz").');
        else copia[Esc.key(m.cliente)] = m;
      });
      if (JSON.stringify(copia).length > 30000) {
        errores.push('Las matrices superan el espacio disponible del complemento (32 KB). Quita filas o columnas innecesarias.');
        return resultado(errores);
      }
      matrices = copia;
      Office.context.roamingSettings.set('matrices', matrices);
      return guardar().then(function () {
        pintarMatrices();
        resultado(errores, null, 'Matrices cargadas: ' + res.filter(function (m) { return m.rows.length; }).map(function (m) { return m.cliente; }).join(', '));
        return cargarAlerta();
      });
    }).catch(function (e) { resultado(['No pude leer el Excel: ' + (e && e.message || e)]); })
      .then(function () { ev.target.value = ''; });
  }

  Office.onReady(function () {
    item = Office.context.mailbox.item;
    matrices = Office.context.roamingSettings.get('matrices') || {};
    analista = Office.context.roamingSettings.get('analista') || '';
    pintarMatrices();
    if (!analista || !Object.keys(matrices).length) $('config').open = true;
    $('sub').addEventListener('change', pintarDestinatarios);
    $('btnLlenar').addEventListener('click', llenar);
    $('btnRevisar').addEventListener('click', revisar);
    $('archivos').addEventListener('change', cargarArchivos);
    $('btnAnalista').addEventListener('click', function () {
      analista = Esc.norm($('analista').value);
      Office.context.roamingSettings.set('analista', analista);
      guardar().then(function () { resultado(null, null, 'Nombre guardado: ' + analista); });
    });
    $('btnBorrar').addEventListener('click', function () {
      matrices = {};
      Office.context.roamingSettings.set('matrices', matrices);
      guardar().then(function () { pintarMatrices(); cargarAlerta(); });
    });
    cargarAlerta();
  });
})();
