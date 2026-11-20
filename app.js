/* Panel 'Preparar escalamiento' (interfaz + lógica en un solo archivo, se descarga siempre fresco). */
(function () {
  var st = document.createElement('style'); st.textContent = "\n  body { font-family: \"Segoe UI\", Arial, sans-serif; font-size: 13px; color: #1f1f1f; margin: 0; padding: 12px; }\n  h2 { font-size: 15px; font-weight: 600; margin: 0 0 8px; }\n  label { display: block; font-size: 12px; color: #555; margin: 10px 0 3px; }\n  input[type=text], input[type=datetime-local], select { width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #c8c8c8; border-radius: 4px; font-size: 13px; }\n  .dato { background: #f3f3f3; border-radius: 4px; padding: 6px 8px; margin: 2px 0; }\n  .dato b { color: #555; font-weight: 600; }\n  .dest { font-size: 12px; word-break: break-all; }\n  button { width: 100%; padding: 8px; margin-top: 10px; border-radius: 4px; border: 1px solid #0f4c5c; background: #fff; color: #0f4c5c; font-size: 13px; cursor: pointer; }\n  button.prim { background: #0f4c5c; color: #fff; }\n  .msg { margin-top: 10px; padding: 8px; border-radius: 4px; font-size: 12px; }\n  .err { background: #fdecea; color: #8a1c13; }\n  .avi { background: #fff4ce; color: #6b4d00; }\n  .ok { background: #e6f4ea; color: #1e5631; }\n  details { margin-top: 16px; border-top: 1px solid #ddd; padding-top: 8px; }\n  summary { cursor: pointer; font-weight: 600; }\n  small { color: #666; }\n  ul { margin: 4px 0; padding-left: 18px; }\n";
  document.head.appendChild(st);
  document.body.innerHTML = "\n  <h2>Preparar escalamiento <small style=\"font-weight:400;color:#888\">v8</small></h2>\n  <div id=\"estado\" class=\"msg avi\">Cargando\u2026 (si se queda aqu\u00ed, el complemento no pudo iniciar)</div>\n\n  <div id=\"alerta\" style=\"display:none\">\n    <div class=\"dato\"><b>Alerta:</b> <span id=\"aNombre\"></span></div>\n    <div class=\"dato\"><b>ID Lookup:</b> <span id=\"aId\"></span> \u00b7 <b>Cliente:</b> <span id=\"aCliente\"></span></div>\n    <div class=\"dato\" id=\"aMatriz\" style=\"display:none\"></div>\n\n    <label for=\"sub\">Subcliente</label>\n    <select id=\"sub\"></select>\n    <small id=\"subNota\"></small>\n\n    <label for=\"ocurrencia\">Fecha y hora de ocurrencia</label>\n    <input type=\"datetime-local\" id=\"ocurrencia\">\n    <small id=\"ocuNota\"></small>\n\n    <label for=\"caso\">Caso (d\u00e9jalo vac\u00edo si no creaste caso)</label>\n    <input type=\"text\" id=\"caso\" placeholder=\"ID del caso\">\n\n    <label><input type=\"checkbox\" id=\"ajAsunto\" checked> Ajustar asunto (quitar \"RV:\" y anteponer el caso)</label>\n    <label><input type=\"checkbox\" id=\"insTabla\" checked> Insertar la tabla de Splunk en \"A continuaci\u00f3n, el detalle de la alerta\"</label>\n    <small id=\"resNota\"></small>\n    <label><input type=\"checkbox\" id=\"quitarSplunk\" checked> Quitar la secci\u00f3n original de Splunk del final</label>\n    <label><input type=\"checkbox\" id=\"bordes\" checked> Arreglar bordes de las tablas de la plantilla</label>\n    <label><input type=\"checkbox\" id=\"limpiar\" checked> Limpiar correo (quitar \"De/Enviado/Para/Asunto\" y mover la firma al final)</label>\n\n\n    <label>Destinatarios seg\u00fan la matriz</label>\n    <small id=\"metodo\"></small>\n    <div id=\"opcionBox\" style=\"display:none\">\n      <label for=\"opcion\">Opci\u00f3n de destinatarios</label>\n      <select id=\"opcion\"></select>\n    </div>\n    <div class=\"dato dest\"><b>Para:</b> <span id=\"dPara\"></span></div>\n    <div class=\"dato dest\"><b>CC:</b> <span id=\"dCC\"></span></div>\n    <div id=\"indic\" class=\"msg avi\" style=\"display:none\"></div>\n\n    <button class=\"prim\" id=\"btnLlenar\">Llenar escalamiento</button>\n    <button id=\"btnRevisar\">Revisar destinatarios antes de enviar</button>\n  </div>\n\n  <div id=\"resultado\"></div>\n\n  <details id=\"yaSec\">\n    <summary>Responder: \"ya escalado\"</summary>\n    <small>\u00dasalo en una respuesta (Responder) a la alerta repetida. Inserta el texto est\u00e1ndar al inicio y pone los destinatarios internos.</small>\n    <label for=\"yaTipo\">Tipo</label>\n    <select id=\"yaTipo\">\n      <option value=\"previo\">Ya fue escalado anteriormente (misma informaci\u00f3n)</option>\n      <option value=\"agrupada\">Mismo evento de otra alerta que ya se escal\u00f3</option>\n    </select>\n    <label for=\"yaCaso\">Caso (opcional)</label>\n    <input type=\"text\" id=\"yaCaso\" placeholder=\"ID del caso\">\n    <label for=\"yaFecha\">Fecha y hora del correo o alerta anterior</label>\n    <input type=\"datetime-local\" id=\"yaFecha\">\n    <button id=\"btnYa\">Insertar respuesta \"ya escalado\"</button>\n  </details>\n\n  <details id=\"config\">\n    <summary>Configuraci\u00f3n</summary>\n    <label for=\"analista\">Tu nombre para \"Analista SOC\" (Apellidos, Nombres)</label>\n    <input type=\"text\" id=\"analista\" placeholder=\"Apellidos, Nombres\">\n    <button id=\"btnAnalista\">Guardar nombre</button>\n\n    <label for=\"archivos\">Cargar matrices (Matrices.xlsx: una hoja por cliente + hoja \"Interno\")</label>\n    <input type=\"file\" id=\"archivos\" accept=\".xlsx\" multiple>\n    <div id=\"matricesInfo\" class=\"dato\" style=\"margin-top:6px\"></div>\n    <button id=\"btnBorrar\">Borrar todas las matrices cargadas</button>\n    <small>Las matrices y tu nombre se guardan solo en la configuraci\u00f3n de este complemento en tu buz\u00f3n.</small>\n  </details>\n";
})();
/* Lógica pura del complemento: leer/llenar la plantilla, matrices y validaciones.
   No contiene datos de clientes: todo llega desde la configuración del usuario. */
(function (root) {
  'use strict';

  var LABELS = {
    nombre: 'Nombre de la alerta',
    idlookup: 'ID Lookup de la alerta',
    cliente: 'Cliente',
    caso: 'Caso',
    ocurrencia: 'Fecha y hora de ocurrencia',
    escalamiento: 'Fecha y hora del escalamiento',
    analista: 'Analista SOC'
  };

  function norm(s) {
    return String(s == null ? '' : s).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  }
  function key(s) {
    return norm(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function labelKey(s) {
    return key(s).replace(/\s*:\s*$/, '');
  }

  /* Busca la celda de valor que está a la derecha de la celda con la etiqueta. */
  function findValueCell(doc, label) {
    var target = labelKey(label);
    var cells = doc.querySelectorAll('td, th');
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c.querySelector('td, th')) continue; // ignora celdas que contienen tablas
      if (labelKey(c.textContent) === target) {
        var n = c.nextElementSibling;
        while (n && !/^(TD|TH)$/.test(n.tagName)) n = n.nextElementSibling;
        if (n) return n;
      }
    }
    return null;
  }

  function setCellText(cell, text) {
    var el = cell;
    while (el.children.length === 1 && el.children[0].tagName !== 'BR') el = el.children[0];
    el.textContent = text;
  }

  function readAlert(doc) {
    var out = {};
    Object.keys(LABELS).forEach(function (k) {
      var cell = findValueCell(doc, LABELS[k]);
      out[k] = cell ? norm(cell.textContent) : null;
    });
    return out;
  }

  var MESES = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
    septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
    ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12,
    january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8, september: 9,
    october: 10, november: 11, december: 12,
    jan: 1, apr: 4, aug: 8, dec: 12
  };

  function ajustarHora(h, ampm) {
    if (!ampm) return h;
    var p = key(ampm).replace(/[\s.]/g, '');
    if (p === 'pm' && h < 12) return h + 12;
    if (p === 'am' && h === 12) return 0;
    return h;
  }

  /* Intenta sacar la fecha de envío de la alerta original del encabezado del reenvío. */
  function parseFechaReenvio(texto) {
    var t = norm(texto);
    var m = t.match(/(?:Enviado|Sent|Fecha|Date)\s*:\s*(.{0,80})/i);
    if (!m) return null;
    var s = m[1];
    var r;
    r = s.match(/(\d{1,2}) de ([A-Za-zÁÉÍÓÚáéíóú]+)\.? de (\d{4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?\s?m\.?)?/i);
    if (r && MESES[key(r[2])]) {
      return { y: +r[3], mo: MESES[key(r[2])], d: +r[1], h: ajustarHora(+r[4], r[6]), mi: +r[5] };
    }
    r = s.match(/([A-Za-z]+)\.? (\d{1,2}), (\d{4}),?\s+(?:at\s+)?(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?\s?m\.?)?/i);
    if (r && MESES[key(r[1])]) {
      return { y: +r[3], mo: MESES[key(r[1])], d: +r[2], h: ajustarHora(+r[4], r[6]), mi: +r[5] };
    }
    r = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?\s?m\.?)?/i);
    if (r) {
      return { y: +r[3], mo: +r[2], d: +r[1], h: ajustarHora(+r[4], r[6]), mi: +r[5] };
    }
    return null;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtPlantilla(f) { return pad(f.d) + '/' + pad(f.mo) + '/' + f.y + ' ' + pad(f.h) + ':' + pad(f.mi); }
  function fmtInput(f) { return f.y + '-' + pad(f.mo) + '-' + pad(f.d) + 'T' + pad(f.h) + ':' + pad(f.mi); }
  function fromInput(v) {
    var r = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v || '');
    return r ? { y: +r[1], mo: +r[2], d: +r[3], h: +r[4], mi: +r[5] } : null;
  }
  function fromDate(dt) {
    return { y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate(), h: dt.getHours(), mi: dt.getMinutes() };
  }

  function emails(s) {
    return String(s || '').split(/[;,\s]+/).map(function (x) {
      return x.replace(/^<|>$/g, '').trim().toLowerCase();
    }).filter(function (x) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x); });
  }

  function activo(r) { return key(r.Activo || 'si') !== 'no'; }

  function subclientes(rows) {
    var seen = {}, out = [];
    rows.filter(activo).forEach(function (r) {
      var s = norm(r.Subcliente);
      if (s && !seen[key(s)]) { seen[key(s)] = 1; out.push(s); }
    });
    return out;
  }

  function claveBU(s) { return key(s).replace(/\s*-\s*/g, '-'); }
  /* Busca las filas que aplican: 1) id_matriz + bunit exactos, 2) ID Lookup, 3) fila "*". */
  function lista(s) {
    return String(s || '').split(/;|,|\/|\s+o\s+/i).map(norm).filter(function (x) { return x && !/^n\/?a$/i.test(x); });
  }
  function buscarFilas(rows, sub, id, idMatriz, bunit, dataCenters, pistas) {
    var act = rows.filter(function (r) { return activo(r) && key(r.Subcliente) === key(sub); });
    if (idMatriz) {
      var m = act.filter(function (r) {
        return norm(r.IDMatriz) && key(r.IDMatriz) === key(idMatriz) && claveBU(r.BUnit) === claveBU(bunit);
      });
      if (m.length) return { filas: m, metodo: 'matriz' };
    }
    var dc = act.filter(function (r) { return norm(r.DataCenter); });
    if (dc.length) {
      var pk = (pistas || []).map(key);
      var p = dc.filter(function (r) {
        return lista(r.AliasCliente).some(function (a) {
          return /\*$/.test(a) ? false : pk.some(function (x) { return contienePalabra(x, a); });
        });
      });
      if (p.length) return { filas: p, metodo: 'pista' };
      var dk = (dataCenters || []).map(key);
      var d = dc.filter(function (r) {
        return lista(r.DataCenter).some(function (a) { return dk.indexOf(key(a)) >= 0; });
      });
      if (d.length) return { filas: d, metodo: 'datacenter' };
    }
    var base = act.filter(function (r) { return !norm(r.IDMatriz) && !norm(r.DataCenter); });
    var exact = base.filter(function (r) { return norm(id) && norm(r.IDLookup) === norm(id); });
    if (exact.length) return { filas: exact, metodo: 'id' };
    var star = base.filter(function (r) { return norm(r.IDLookup) === '*'; });
    if (star.length) return { filas: star, metodo: '*' };
    return { filas: [], metodo: null };
  }
  function pickRow(rows, sub, id) { return buscarFilas(rows, sub, id).filas[0] || null; }
  function tieneMatrizNueva(rows) { return rows.some(function (r) { return norm(r.IDMatriz); }); }
  /* Valores distintos de una columna de la tabla de Splunk (ej. id_matriz, bunit). */
  function valoresColumna(doc, nombre) {
    var tabla = tablaResultados(doc);
    if (!tabla) return [];
    var trs = filasDe(tabla);
    if (!trs.length) return [];
    var cab = Array.prototype.map.call(trs[0].querySelectorAll('th, td'), function (x) { return key(x.textContent); });
    var i = cab.indexOf(key(nombre));
    if (i < 0) return [];
    var vistos = {}, out = [];
    trs.slice(1).forEach(function (tr) {
      var celdas = tr.querySelectorAll('td, th');
      var v = celdas[i] ? textoCelda(celdas[i]) : '';
      if (v && !vistos[v]) { vistos[v] = 1; out.push(v); }
    });
    return out;
  }

  function contienePalabra(textoKey, palabra, min) {
    var p = key(palabra);
    if (p.length < (min || 4)) return false;
    var re = new RegExp('(^|[^a-z0-9])' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])');
    return re.test(textoKey);
  }

  /* Sugiere el subcliente: si el correo menciona uno distinto al cliente, ese; si no, el que se llama igual al cliente. */
  function sugerirSubcliente(subs, cliente, textoCorreo) {
    var tk = key(textoCorreo);
    var otros = subs.filter(function (s) { return key(s) !== key(cliente) && contienePalabra(tk, s); });
    if (otros.length === 1) return { valor: otros[0], detectado: true };
    var igual = subs.filter(function (s) { return key(s) === key(cliente); })[0];
    return { valor: igual || subs[0] || '', detectado: false };
  }

  /* Revisa que el correo no mencione otros clientes/subclientes. */
  function revisarMenciones(matrices, clienteKey, sub, textoCorreo) {
    var tk = key(textoCorreo), errores = [], avisos = [];
    Object.keys(matrices).forEach(function (ck) {
      var m = matrices[ck], vistos = {};
      var nombres = [m.cliente].concat(subclientes(m.rows)).filter(function (n) {
        if (vistos[key(n)]) return false;
        vistos[key(n)] = 1; return true;
      });
      nombres.forEach(function (n) {
        if (!contienePalabra(tk, n)) return;
        if (ck !== clienteKey) {
          errores.push('El correo menciona "' + n + '", que pertenece a otro cliente (' + m.cliente + ').');
        } else if (key(n) !== key(sub) && key(n) !== key(m.cliente)) {
          avisos.push('El correo menciona "' + n + '" pero elegiste el subcliente "' + sub + '". Revisa que sea correcto.');
        }
      });
    });
    return { errores: errores, avisos: avisos };
  }

  function revisarDestinatarios(fila, para, cc) {
    var permitidos = {};
    emails(fila.Para).concat(emails(fila.CC)).forEach(function (e) { permitidos[e] = 1; });
    var dominios = {};
    emails(fila.Para).forEach(function (e) { dominios[e.split('@')[1]] = 1; });
    var permiteUsuario = key(fila.UsuarioEnPara) === 'si';
    var extraTodos = para.concat(cc).map(function (e) { return e.toLowerCase(); }).filter(function (e) { return !permitidos[e]; });
    var usuario = permiteUsuario ? extraTodos.filter(function (e) { return para.map(function (x) { return x.toLowerCase(); }).indexOf(e) >= 0 && dominios[e.split('@')[1]]; }) : [];
    var extra = extraTodos.filter(function (e) { return usuario.indexOf(e) < 0; });
    var faltanPara = emails(fila.Para).filter(function (e) { return para.map(function (x) { return x.toLowerCase(); }).indexOf(e) < 0; });
    var faltanCC = sinDuplicados(emails(fila.Para), emails(fila.CC)).filter(function (e) { return cc.map(function (x) { return x.toLowerCase(); }).indexOf(e) < 0; });
    return { extra: extra, usuario: usuario, faltanPara: faltanPara, faltanCC: faltanCC };
  }

  function limpiarAsunto(s) {
    return norm(s).replace(/^((RV|RE|FW|FWD|TR|RES|ENC)\s*:\s*)+/i, '');
  }
  function armarAsunto(original, caso) {
    var limpio = limpiarAsunto(original);
    if (/\/\//.test(limpio)) limpio = norm(limpio.split('//').slice(1).join('//'));
    return caso ? norm(caso) + ' // ' + limpio : limpio;
  }

  /* Llena los campos en el documento. Devuelve la lista de campos que no encontró. */
  function llenar(doc, valores) {
    var faltan = [];
    Object.keys(valores).forEach(function (k) {
      if (valores[k] == null) return;
      var cell = findValueCell(doc, LABELS[k]);
      if (!cell) { faltan.push(LABELS[k]); return; }
      setCellText(cell, valores[k]);
    });
    return faltan;
  }

  /* Convierte las filas leídas de un Excel en la matriz que se guarda. */
  function filasMatriz(rows) {
    var campos = ['Subcliente', 'IDLookup', 'IDMatriz', 'BUnit', 'DataCenter', 'AliasCliente', 'Telefono', 'Opcion', 'NombreAlerta', 'Para', 'CC', 'Activo', 'Escalamiento', 'Observaciones', 'UsuarioEnPara'];
    return rows.map(function (r) {
      var o = {};
      Object.keys(r).forEach(function (k) {
        var c = campos.filter(function (x) { return key(x) === key(k).replace(/\s/g, ''); })[0];
        if (c) o[c] = norm(r[k]);
      });
      return o;
    }).filter(function (o) { return o.Subcliente && (o.IDLookup || o.IDMatriz || o.DataCenter); });
  }

  /* ---------- Tabla de resultados de Splunk ---------- */
  var EXCLUIR_DEF = ['id_matriz', 'bunit', 'alert_name', 'type_infra'];
  var TH = 'border:1px solid #0F4C5C;background-color:#0F4C5C;color:#FFFFFF;padding:4px 8px;text-align:center;font-family:Calibri,Arial,sans-serif;font-size:13px';
  var TD = 'border:1px solid #0F4C5C;padding:4px 8px;text-align:center;font-family:Calibri,Arial,sans-serif;font-size:13px';
  var MARCA = 'border-collapse:collapse;margin:10px 0';

  function escHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function tablaResultados(doc) {
    var ts = doc.querySelectorAll('table');
    for (var i = 0; i < ts.length; i++) {
      if (/(^|[\s_-])results(\s|$)/i.test(ts[i].getAttribute('class') || '')) return ts[i];
    }
    return null;
  }
  function textoCelda(td) {
    var pres = td.querySelectorAll('pre');
    if (pres.length) {
      return Array.prototype.map.call(pres, function (p) { return norm(p.textContent); })
        .filter(function (x) { return x; }).join(', ');
    }
    return norm(td.textContent);
  }
  function filasDe(tabla) {
    return Array.prototype.filter.call(tabla.querySelectorAll('tr'), function (tr) {
      var t = tr.parentNode;
      while (t && t.tagName !== 'TABLE') t = t.parentNode;
      return t === tabla;
    });
  }
  /* Lee la tabla de resultados: encabezados (sin columnas técnicas) y filas. */
  function extraerResultados(doc, excluir) {
    var tabla = tablaResultados(doc);
    if (!tabla) return null;
    var exc = (excluir || EXCLUIR_DEF).map(key);
    var trs = filasDe(tabla);
    if (!trs.length) return null;
    var cab = Array.prototype.map.call(trs[0].querySelectorAll('th, td'), function (c) { return norm(c.textContent); });
    var corte = cab.map(key).indexOf('id_matriz');
    var idx = [];
    cab.forEach(function (h, i) {
      if (corte >= 0 && i >= corte) return;
      if (exc.indexOf(key(h)) >= 0) return;
      idx.push(i);
    });
    var filas = trs.slice(1).map(function (tr) {
      var celdas = tr.querySelectorAll('td, th');
      return idx.map(function (i) { return celdas[i] ? textoCelda(celdas[i]) : ''; });
    }).filter(function (f) { return f.some(function (x) { return x; }); });
    return { columnas: idx.map(function (i) { return cab[i]; }), filas: filas, nodo: tabla };
  }
  function htmlTabla(res) {
    return '<table cellspacing="0" cellpadding="0" style="' + MARCA + '"><tr>' +
      res.columnas.map(function (c) { return '<th style="' + TH + '">' + escHtml(c) + '</th>'; }).join('') + '</tr>' +
      res.filas.map(function (f) {
        return '<tr>' + f.map(function (v) { return '<td style="' + TD + '">' + escHtml(v) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</table>';
  }
  var BLOQUES = /^(P|DIV|TD|LI|H\d)$/;
  function bloque(el) {
    while (el && !BLOQUES.test(el.tagName)) el = el.parentElement;
    return el;
  }
  /* Pone la tabla después de "A continuación, el detalle de la alerta:" (reemplaza la "\" o una tabla puesta antes). */
  function insertarTabla(doc, html) {
    var objetivo = key('A continuación, el detalle de la alerta:').replace(/:$/, '');
    var els = doc.body.querySelectorAll('*'), etiqueta = null;
    for (var i = 0; i < els.length; i++) {
      var t = key(els[i].textContent).replace(/:$/, '');
      if (t === objetivo) etiqueta = els[i]; // el último que coincide es el más interno
    }
    if (!etiqueta) return false;
    var b = bloque(etiqueta) || etiqueta;
    var nuevo = doc.createElement('div');
    nuevo.innerHTML = html;
    var tablaNueva = nuevo.firstChild;
    if (b.tagName === 'TD') {
      var tr = b.parentElement, sig = tr.nextElementSibling;
      if (sig && (/^\\?$/.test(norm(sig.textContent)) || sig.querySelector('table'))) {
        var td = sig.querySelector('td') || sig;
        td.innerHTML = ''; td.appendChild(tablaNueva);
      } else {
        b.appendChild(tablaNueva);
      }
      return true;
    }
    var n = b.nextElementSibling;
    var marcaPrevia = n && n.tagName === 'TABLE' && (n.getAttribute('style') || '').indexOf('border-collapse:collapse') >= 0;
    if (n && (/^\\?$/.test(norm(n.textContent)) && !n.querySelector('table, img') || marcaPrevia)) {
      n.parentNode.replaceChild(tablaNueva, n);
    } else {
      b.parentNode.insertBefore(tablaNueva, b.nextSibling);
    }
    return true;
  }
  /* Quita la sección original de Splunk: desde la tabla "summary" (o la de resultados) hasta el final. */
  function quitarSplunk(doc, resNodo) {
    var ts = doc.querySelectorAll('table'), inicio = null;
    for (var i = 0; i < ts.length; i++) {
      if (/(^|[\s_-])summary(\s|$)/i.test(ts[i].getAttribute('class') || '')) { inicio = ts[i]; break; }
    }
    inicio = inicio || resNodo;
    if (!inicio) return false;
    var nodo = inicio;
    while (nodo && nodo !== doc.body) {
      while (nodo.nextSibling) nodo.parentNode.removeChild(nodo.nextSibling);
      nodo = nodo.parentNode;
    }
    inicio.parentNode.removeChild(inicio);
    return true;
  }

  /* Alias: texto exacto, o prefijo si termina en * (ej. "ABC - XYZ*"). Ignora espacios alrededor de guiones. */
  function aliasCoincide(alias, valor) {
    var a = claveBU(alias), v = claveBU(valor);
    if (/\*$/.test(a)) return v.indexOf(a.replace(/\*$/, '')) === 0;
    return a === v;
  }
  function viaAlias(matrices, cliente) {
    return !matrices[key(cliente)] && !!matrizDe(matrices, cliente);
  }
  /* Busca la matriz del cliente; tolera sufijos del nombre de archivo (ej. "Cliente (1)", "Cliente-Y"). */
  function matrizDe(matrices, cliente) {
    var k = key(cliente);
    if (matrices[k]) return k;
    var cand = Object.keys(matrices).filter(function (m) {
      return m.indexOf(k) === 0 && /^[\s\-_(]/.test(m.slice(k.length));
    });
    if (cand.length === 1) return cand[0];
    /* Gana el alias más largo que coincida (ej. "ABC - XYZ-1*" le gana a "ABC - XYZ*"). */
    var mejor = null, largo = -1, empate = false;
    Object.keys(matrices).forEach(function (m) {
      matrices[m].rows.forEach(function (r) {
        lista(r.AliasCliente).forEach(function (a) {
          if (!aliasCoincide(a, cliente)) return;
          var l = claveBU(a).replace(/\*$/, '').length + (/\*$/.test(a) ? 0 : 1000);
          if (l > largo) { mejor = m; largo = l; empate = false; }
          else if (l === largo && m !== mejor) empate = true;
        });
      });
    });
    return empate ? null : mejor;
  }

  /* Limpieza: quita el encabezado del reenvío/respuesta (De:/Enviado:/Para:/Asunto:) y la línea separadora,
     y mueve lo que está arriba (firma) al final del correo. */
  function vacio(n) {
    if (n.nodeType === 8) return true;
    if (n.nodeType === 3) return !norm(n.textContent);
    if (n.nodeType !== 1) return false;
    if (n.tagName === 'HR') return true;
    return !norm(n.textContent) && !n.querySelector('img, table');
  }
  function limpiarCorreo(doc) {
    var body = doc.body, marca = key('Nombre de la alerta');
    var reDe = /(^|\s)(de|from)\s*:/, reAs = /(asunto|subject)\s*:/;
    var cands = Array.prototype.filter.call(body.querySelectorAll('*'), function (el) {
      var t = key(el.textContent);
      return reDe.test(t) && reAs.test(t) && t.indexOf(marca) < 0 && t.length < 3000;
    });
    if (!cands.length) return { encabezado: false, firma: false };
    var cab = cands[cands.length - 1];
    // sube hasta el contenedor más grande que aún no incluye la plantilla
    while (cab.parentElement && cab.parentElement !== body && key(cab.parentElement.textContent).indexOf(marca) < 0) cab = cab.parentElement;
    var padre = cab.parentNode;
    // quita separadores vacíos (hr, divs sin texto) justo antes del encabezado
    var prev = cab.previousSibling;
    while (prev && vacio(prev)) { var pp = prev.previousSibling; padre.removeChild(prev); prev = pp; }
    // lo que queda arriba del encabezado (firma u otro texto) se mueve al final
    var arriba = [];
    var n = padre.firstChild;
    while (n && n !== cab) { arriba.push(n); n = n.nextSibling; }
    padre.removeChild(cab);
    var hayFirma = arriba.some(function (x) { return norm(x.textContent) || (x.querySelector && x.querySelector('img')); });
    arriba.forEach(function (x) { padre.removeChild(x); });
    // quita líneas vacías al inicio
    while (padre.firstChild && vacio(padre.firstChild)) padre.removeChild(padre.firstChild);
    if (hayFirma) {
      var sep = doc.createElement('p'); sep.innerHTML = '&nbsp;'; padre.appendChild(sep);
      arriba.forEach(function (x) { padre.appendChild(x); });
    }
    return { encabezado: true, firma: hayFirma };
  }

  /* Bordes de la plantilla: convierte "border-color" sin borde definido en borde sólido (como el flujo original). */
  function arreglarBordes(doc) {
    var n = 0;
    Array.prototype.forEach.call(doc.querySelectorAll('table[cellspacing="1"]'), function (t) {
      t.setAttribute('cellspacing', '0'); t.style.borderCollapse = 'collapse'; n++;
    });
    Array.prototype.forEach.call(doc.querySelectorAll('[style]'), function (el) {
      var s = el.style;
      if (s.borderColor && !s.borderStyle && !s.borderWidth) {
        var color = s.borderColor.split(/\s+(?![^(]*\))/)[0];
        s.border = '1px solid ' + color; n++;
      }
    });
    return n;
  }

  function textoYaEscalado(tipo, caso, fecha, analista, cargo) {
    var cuerpo = tipo === 'agrupada'
      ? 'Se procede con la validación del evento y se identifica que corresponde al mismo evento reportado en la alerta recibida el ' +
        fecha + ', la cual ya fue escalada' + (caso ? ' bajo el caso ' + caso : '') + ', por lo cual no se genera un nuevo escalamiento.'
      : 'Se procede con la validación del evento y se identifica que ya fue escalado anteriormente' +
        (caso ? ' bajo el caso ' + caso : '') + ' (correo enviado el ' + fecha +
        '), con la misma información del evento (sin variaciones en las columnas reportadas), por lo cual no se genera un nuevo escalamiento.';
    var lineas = ['Cordial saludo.', '', cuerpo, ''];
    return '<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:12pt">' +
      lineas.map(function (l) { return l ? '<p style="margin:0">' + escHtml(l) + '</p>' : '<p style="margin:0">&nbsp;</p>'; }).join('') + '</div>';
  }

  /* Lee un libro de Excel: una hoja por cliente (nombre de hoja = cliente) y hoja "Interno".
     Compatibilidad: si solo hay una hoja "Matriz", el cliente es el nombre del archivo. */
  function leerLibro(nombresHojas, filasDeHoja, nombreArchivo) {
    var clientes = [], interno = null;
    var ignorar = ['instrucciones', 'leeme', 'readme'];
    var hojas = nombresHojas.filter(function (h) { return ignorar.indexOf(key(h)) < 0; });
    hojas.forEach(function (h) {
      var filas = filasDeHoja(h);
      if (key(h) === 'interno') {
        var r = filas[0] || {}, o = {};
        Object.keys(r).forEach(function (k) { if (key(k) === 'para') o.Para = norm(r[k]); if (key(k) === 'cc') o.CC = norm(r[k]); });
        if (o.Para || o.CC) interno = o;
        return;
      }
      var cliente = (key(h) === 'matriz' && hojas.length === 1)
        ? String(nombreArchivo || '').replace(/\.xlsx$/i, '').trim() : norm(h);
      clientes.push({ cliente: cliente, rows: filasMatriz(filas) });
    });
    return { clientes: clientes, interno: interno };
  }

  /* Guardado compacto: los textos de Para/CC repetidos se guardan una sola vez (límite de 32 KB del buzón). */
  function empaquetar(matrices) {
    var dict = [], pos = {}, c = {};
    var idx = function (s) { s = s || ''; if (!(s in pos)) { pos[s] = dict.length; dict.push(s); } return pos[s]; };
    Object.keys(matrices).forEach(function (k) {
      var m = matrices[k];
      c[k] = { n: m.cliente, r: m.rows.map(function (r) {
        return [r.Subcliente, r.IDLookup, idx(Esc_emails(r.Para)), idx(Esc_emails(r.CC)), key(r.Activo || 'si') === 'no' ? 0 : 1,
          idx(r.Escalamiento), idx(r.Observaciones), key(r.UsuarioEnPara) === 'si' ? 1 : 0,
          idx(r.IDMatriz), idx(r.BUnit), idx(r.Opcion), idx(r.DataCenter), idx(r.AliasCliente), idx(r.Telefono)];
      }) };
    });
    return { v: 2, d: dict, c: c };
  }
  function Esc_emails(s) { return emails(s).join(';'); }
  function desempaquetar(o) {
    if (!o) return {};
    if (o.v !== 2) return o; // formato antiguo
    var out = {};
    Object.keys(o.c).forEach(function (k) {
      out[k] = { cliente: o.c[k].n, rows: o.c[k].r.map(function (a) {
        return { Subcliente: a[0], IDLookup: a[1], Para: o.d[a[2]], CC: o.d[a[3]], Activo: a[4] ? 'Si' : 'No',
          Escalamiento: o.d[a[5]] || '', Observaciones: o.d[a[6]] || '', UsuarioEnPara: a[7] ? 'Si' : 'No',
          IDMatriz: o.d[a[8]] || '', BUnit: o.d[a[9]] || '', Opcion: o.d[a[10]] || '',
          DataCenter: o.d[a[11]] || '', AliasCliente: o.d[a[12]] || '', Telefono: o.d[a[13]] || '' };
      }) };
    });
    return out;
  }

  function esSoar(fila) { return /soar/i.test(fila.Escalamiento || '') && !emails(fila.Para).length; }
  function indicaciones(fila) {
    var out = [];
    if (!fila) return out;
    if (fila.Escalamiento) out.push('Escalamiento: ' + fila.Escalamiento);
    var tel = norm(fila.Telefono);
    if (tel && !/^n\/?a$/i.test(tel)) out.push('LLAMAR ANTES DE ESCALAR al ' + tel + '.');
    var obs = norm(fila.Observaciones);
    if (obs && !/^(n\/?a|ninguna?)$/i.test(obs)) out.push(obs);
    return out;
  }
  function sinDuplicados(para, cc) {
    var p = {}; para.forEach(function (e) { p[e] = 1; });
    var vistos = {};
    return cc.filter(function (e) { if (p[e] || vistos[e]) return false; vistos[e] = 1; return true; });
  }

  var api = {
    buscarFilas: buscarFilas, viaAlias: viaAlias, aliasCoincide: aliasCoincide, tieneMatrizNueva: tieneMatrizNueva, valoresColumna: valoresColumna,
    esSoar: esSoar, indicaciones: indicaciones, sinDuplicados: sinDuplicados,
    empaquetar: empaquetar, desempaquetar: desempaquetar,
    arreglarBordes: arreglarBordes, limpiarCorreo: limpiarCorreo,
    textoYaEscalado: textoYaEscalado, leerLibro: leerLibro,
    extraerResultados: extraerResultados, htmlTabla: htmlTabla, insertarTabla: insertarTabla,
    quitarSplunk: quitarSplunk, matrizDe: matrizDe,
    LABELS: LABELS, norm: norm, key: key, findValueCell: findValueCell, readAlert: readAlert,
    parseFechaReenvio: parseFechaReenvio, fmtPlantilla: fmtPlantilla, fmtInput: fmtInput,
    fromInput: fromInput, fromDate: fromDate, emails: emails, subclientes: subclientes,
    pickRow: pickRow, sugerirSubcliente: sugerirSubcliente, revisarMenciones: revisarMenciones,
    revisarDestinatarios: revisarDestinatarios, armarAsunto: armarAsunto, llenar: llenar,
    filasMatriz: filasMatriz
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Esc = api;
})(this);

/* Conexión con Outlook (Office.js). La lógica está en core.js (objeto Esc). */
(function () {
  'use strict';
  window.onerror = function (msg, src, line) {
    var e = document.getElementById('estado');
    if (e) { e.className = 'msg err'; e.textContent = 'Error del complemento: ' + msg + ' (línea ' + line + '). Envía esta captura.'; }
  };
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
      alerta.idMatriz = ims[0] || ''; alerta.bunit = bus[0] || (Esc.viaAlias(matrices, alerta.cliente) ? alerta.cliente : '');
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
        estado('No hay matriz cargada para el cliente "' + alerta.cliente + '". Carga Matrices.xlsx en Configuración: debe haber una hoja con ese nombre o una fila con ese valor (o su inicio, terminado en *) en la columna AliasCliente.', 'err');
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
      if ($('limpiar').checked) {
        var lim = Esc.limpiarCorreo(doc);
        if (!lim.encabezado) avisos.push('No encontré el encabezado del reenvío (De/Enviado/Asunto) para quitarlo; puede que ya se haya limpiado.');
      }
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
    try { iniciar(); } catch (e) { estado('Error al iniciar el complemento: ' + (e && e.message || e) + '. Envía esta captura.', 'err'); }
  });
  function iniciar() {
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
  }
})();
