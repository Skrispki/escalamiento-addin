/* Conexión con Outlook (Office.js). La lógica está en core.js (objeto Esc). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var item, matrices = {}, analista = '', alerta = null, clienteKey = null, interno = null, fechaMatrices = '';

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
  var prepend = function (h) { return p(function (cb) { item.body.prependAsync(h, { coercionType: Office.CoercionType.Html }, cb); }); };
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

  function busqueda() {
    var m = clienteKey && matrices[clienteKey];
    if (!m || !alerta) return { filas: [], metodo: null };
    return Esc.buscarFilas(m.rows, $('sub').value, alerta.idlookup, alerta.idMatriz, alerta.bunit, alerta.dataCenters, alerta.pistas);
  }
  function filaActual() {
    var b = busqueda();
    if (b.filas.length <= 1) return b.filas[0] || null;
    var i = parseInt($('opcion').value, 10);
    return isNaN(i) ? null : b.filas[i];
  }
  function pintarOpciones() {
    var b = busqueda(), sel = $('opcion'), prev = sel.value;
    var metodos = { matriz: 'Matriz nueva (id_matriz + bunit)', id: 'Por ID Lookup', '*': 'Fila general (*)',
      pista: 'Regla especial por bunit o cliente', datacenter: 'Por data_center' };
    var m = clienteKey && matrices[clienteKey];
    var txt = b.metodo ? 'Destinatarios por: ' + metodos[b.metodo] : 'No hay fila en la matriz para esta alerta.';
    if (m && Esc.tieneMatrizNueva(m.rows) && b.metodo !== 'matriz') {
      txt += alerta.idMatriz ? ' (no se ubicó id_matriz ' + alerta.idMatriz + ' con ese bunit)' : ' (la alerta no trae id_matriz)';
    }
    $('metodo').textContent = txt;
    if (b.filas.length > 1) {
      sel.innerHTML = '<option value="">Elige una opción…</option>' + b.filas.map(function (f, i) {
        return '<option value="' + i + '">' + esc(f.Opcion || Esc.emails(f.Para).join(', ') || ('Opción ' + (i + 1))) + '</option>';
      }).join('');
      if (prev && b.filas[prev]) sel.value = prev;
      $('opcionBox').style.display = 'block';
    } else {
      sel.innerHTML = ''; $('opcionBox').style.display = 'none';
    }
  }

  function pintarDestinatarios() {
    pintarOpciones();
    var f = filaActual();
    $('dPara').textContent = f ? Esc.emails(f.Para).join('; ') : '—';
    $('dCC').textContent = f ? Esc.sinDuplicados(Esc.emails(f.Para), Esc.emails(f.CC)).join('; ') : '—';
    var ind = Esc.indicaciones(f);
    $('indic').style.display = ind.length ? 'block' : 'none';
    $('indic').innerHTML = ind.length ? '<b>Indicaciones de la matriz:</b><ul>' + ind.map(function (x) { return '<li>' + esc(x).replace(/\n/g, '<br>') + '</li>'; }).join('') + '</ul>' : '';
    if (f && Esc.esSoar(f)) $('dPara').textContent = '(se escala por SOAR, no por correo)';
  }

  function pintarMatrices() {
    var ks = Object.keys(matrices);
    $('matricesInfo').innerHTML = ks.length
      ? 'Cargadas: ' + ks.map(function (k) { return '<b>' + esc(matrices[k].cliente) + '</b> (' + matrices[k].rows.length + ' filas)'; }).join(', ')
      : 'No hay matrices cargadas.';
    if (ks.length && fechaMatrices) $('matricesInfo').innerHTML += '<br>Cargadas el ' + esc(fechaMatrices);
    $('matricesInfo').innerHTML += '<br>Respuestas internas: ' + (interno ? esc(Esc.emails(interno.Para).join('; ')) + (interno.CC ? ' · CC: ' + esc(Esc.emails(interno.CC).join('; ')) : '') : 'sin configurar (hoja "Interno")');
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
      var ims = Esc.valoresColumna(doc, 'id_matriz'), bus = Esc.valoresColumna(doc, 'bunit'), dcs = Esc.valoresColumna(doc, 'data_center');
      alerta.idMatriz = ims[0] || ''; alerta.bunit = bus[0] || '';
      alerta.dataCenters = dcs; alerta.pistas = bus.concat([alerta.cliente]);
      var partes = [];
      if (ims.length) partes.push('id_matriz: ' + ims.join(', '));
      if (bus.length) partes.push('bunit: ' + bus.join(', '));
      if (dcs.length) partes.push('data_center: ' + dcs.join(', '));
      $('aMatriz').style.display = partes.length ? 'block' : 'none';
      $('aMatriz').textContent = partes.join(' · ') + (ims.length > 1 || bus.length > 1 || dcs.length > 1 ? '  ⚠ la tabla trae varios valores' : '');
      clienteKey = Esc.matrizDe(matrices, alerta.cliente) || Esc.key(alerta.cliente);
      var m = matrices[clienteKey];
      var sel = $('sub'); sel.innerHTML = '';
      if (!m) {
        $('subNota').textContent = '';
        estado('No hay matriz cargada para el cliente "' + alerta.cliente + '". Carga Matrices.xlsx en Configuración (debe tener una hoja llamada "' + alerta.cliente + '").', 'err');
      } else {
        var subs = Esc.subclientes(m.rows);
        subs.forEach(function (s) { var o = document.createElement('option'); o.value = o.textContent = s; sel.appendChild(o); });
        var sug = Esc.sugerirSubcliente(subs, alerta.cliente, doc.body.textContent);
        sel.value = sug.valor;
        $('subNota').textContent = sug.detectado ? 'Detectado porque el correo menciona "' + sug.valor + '". Confírmalo.' : 'Confirma el subcliente.';
        estado('Alerta detectada. Revisa los datos y dale "Llenar escalamiento".', 'ok');
      }
      var res = Esc.extraerResultados(doc);
      $('resNota').textContent = res && res.filas.length
        ? 'Tabla de Splunk: ' + res.filas.length + ' fila(s) · columnas: ' + res.columnas.join(', ')
        : 'No encontré la tabla de resultados de Splunk en este correo.';
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
    else if (!fila && busqueda().filas.length > 1) errores.push('Elige la opción de destinatarios (por ejemplo Windows o Linux).');
    else if (!fila) errores.push('La matriz no tiene una fila activa para esta alerta (subcliente "' + $('sub').value + '", ID ' + (alerta.idlookup || '—') + (alerta.idMatriz ? ', id_matriz ' + alerta.idMatriz : '') + (alerta.dataCenters && alerta.dataCenters.length ? ', data_center ' + alerta.dataCenters.join('/') : '') + '). Revisa la matriz o pon los destinatarios a mano.');
    var oc = Esc.fromInput($('ocurrencia').value);
    if (!oc) errores.push('Falta la fecha y hora de ocurrencia.');
    var sinDest = false;
    if (fila && Esc.esSoar(fila)) errores.push('Según la matriz, esta alerta se escala por SOAR, no por correo.');
    else if (fila && !Esc.emails(fila.Para).length) {
      sinDest = true;
      avisos.push('La matriz no tiene correos en "Para" para esta alerta: se llena la plantilla, pero el Para y el CC los pones tú.');
    }
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
      var res = Esc.extraerResultados(doc);
      if ($('insTabla').checked) {
        if (res && res.filas.length) {
          if (!Esc.insertarTabla(doc, Esc.htmlTabla(res))) avisos.push('No encontré "A continuación, el detalle de la alerta:"; la tabla no se insertó.');
        } else avisos.push('No encontré la tabla de resultados de Splunk (si ya la habías insertado, está bien).');
      }
      if ($('quitarSplunk').checked) Esc.quitarSplunk(doc, res && res.nodo);
      if ($('bordes').checked) Esc.arreglarBordes(doc);
      var nuevo = '<!DOCTYPE html>' + doc.documentElement.outerHTML;
      return setBody(nuevo)
        .then(function () { if (!sinDest) return setRec('to', Esc.emails(fila.Para)); })
        .then(function () { if (!sinDest) return setRec('cc', Esc.sinDuplicados(Esc.emails(fila.Para), Esc.emails(fila.CC))); })
        .then(function () {
          if (!$('ajAsunto').checked) return;
          return getSubj().then(function (s) { return setSubj(Esc.armarAsunto(s, caso)); });
        })
        .then(function () {
          avisos = avisos.concat(Esc.indicaciones(fila).filter(function (x) { return !/^Escalamiento:/.test(x); }));
          resultado(null, avisos, 'Listo: plantilla' + (sinDest ? '' : ', Para, CC') + ($('ajAsunto').checked ? ' y asunto' : '') + ' llenados. Revisa el correo y dale Enviar.');
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
      if (r.usuario.length) avisos.push('Correo(s) de usuario agregados en Para (permitido por la matriz): ' + r.usuario.join(', '));
      if (errores.length) resultado(errores, avisos, null, 'No envíes todavía:');
      else resultado(null, avisos, avisos.length ? null : 'Destinatarios correctos según la matriz.');
    }).catch(function (e) { resultado(['No pude leer los destinatarios: ' + (e && e.message || e)]); });
  }

  function leerExcel(file) {
    return file.arrayBuffer().then(function (buf) {
      var wb = XLSX.read(buf, { type: 'array' });
      return Esc.leerLibro(wb.SheetNames, function (h) { return XLSX.utils.sheet_to_json(wb.Sheets[h], { defval: '' }); }, file.name);
    });
  }

  function cargarArchivos(ev) {
    var files = Array.prototype.slice.call(ev.target.files || []);
    if (!files.length) return;
    Promise.all(files.map(leerExcel)).then(function (libros) {
      var errores = [], copia = JSON.parse(JSON.stringify(matrices)), nuevoInterno = interno, cargados = [];
      libros.forEach(function (l) {
        if (l.interno) nuevoInterno = l.interno;
        l.clientes.forEach(function (m) {
          if (!m.rows.length) errores.push('La hoja "' + m.cliente + '" no tiene filas válidas.');
          else { copia[Esc.key(m.cliente)] = m; cargados.push(m.cliente); }
        });
      });
      if (JSON.stringify(Esc.empaquetar(copia)).length + JSON.stringify(nuevoInterno || {}).length > 30000) {
        errores.push('Las matrices superan el espacio disponible del complemento (32 KB). Quita filas o columnas innecesarias.');
        return resultado(errores);
      }
      matrices = copia; interno = nuevoInterno;
      var d = Esc.fromDate(new Date()); fechaMatrices = Esc.fmtPlantilla(d);
      var rs = Office.context.roamingSettings;
      rs.set('matrices', Esc.empaquetar(matrices)); rs.set('interno', interno); rs.set('fechaMatrices', fechaMatrices);
      return guardar().then(function () {
        pintarMatrices();
        return cargarAlerta().then(function () {
          resultado(errores, null, cargados.length ? 'Matrices cargadas: ' + cargados.join(', ') : 'Configuración interna cargada.');
        });
      });
    }).catch(function (e) { resultado(['No pude leer el Excel: ' + (e && e.message || e)]); })
      .then(function () { ev.target.value = ''; });
  }

  function yaEscalado() {
    var errores = [];
    var fecha = Esc.fromInput($('yaFecha').value);
    if (!fecha) errores.push('Escribe la fecha del correo o alerta anterior.');
    if (errores.length) return resultado(errores, null, null, 'Falta información:');
    var html = Esc.textoYaEscalado($('yaTipo').value, Esc.norm($('yaCaso').value), Esc.fmtPlantilla(fecha));
    var avisos = [];
    prepend(html).then(function () {
      if (!interno) { avisos.push('No hay destinatarios internos configurados (hoja "Interno"): revisa Para y CC a mano.'); return; }
      return setRec('to', Esc.emails(interno.Para)).then(function () { return setRec('cc', Esc.emails(interno.CC)); });
    }).then(function () {
      resultado(null, avisos, 'Texto de "ya escalado" insertado' + (interno ? ' y destinatarios internos puestos' : '') + '. Revisa y envía.');
    }).catch(function (e) { resultado(['Error al insertar la respuesta: ' + (e && e.message || e)]); });
  }

  Office.onReady(function () {
    item = Office.context.mailbox.item;
    matrices = Esc.desempaquetar(Office.context.roamingSettings.get('matrices'));
    analista = Office.context.roamingSettings.get('analista') || '';
    interno = Office.context.roamingSettings.get('interno') || null;
    fechaMatrices = Office.context.roamingSettings.get('fechaMatrices') || '';
    pintarMatrices();
    if (!analista || !Object.keys(matrices).length) $('config').open = true;
    $('sub').addEventListener('change', pintarDestinatarios);
    $('opcion').addEventListener('change', pintarDestinatarios);
    $('btnLlenar').addEventListener('click', llenar);
    $('btnRevisar').addEventListener('click', revisar);
    $('btnYa').addEventListener('click', yaEscalado);
    $('archivos').addEventListener('change', cargarArchivos);
    $('btnAnalista').addEventListener('click', function () {
      analista = Esc.norm($('analista').value);
      Office.context.roamingSettings.set('analista', analista);
      guardar().then(function () { resultado(null, null, 'Nombre guardado: ' + analista); });
    });
    $('btnBorrar').addEventListener('click', function () {
      matrices = {}; interno = null; fechaMatrices = '';
      Office.context.roamingSettings.set('matrices', matrices);
      Office.context.roamingSettings.set('interno', null);
      Office.context.roamingSettings.set('fechaMatrices', '');
      guardar().then(function () { pintarMatrices(); cargarAlerta(); });
    });
    cargarAlerta();
  });
})();
