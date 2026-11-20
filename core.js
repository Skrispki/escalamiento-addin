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

  function pickRow(rows, sub, id) {
    var act = rows.filter(function (r) { return activo(r) && key(r.Subcliente) === key(sub); });
    var exact = act.filter(function (r) { return norm(r.IDLookup) === norm(id); })[0];
    return exact || act.filter(function (r) { return norm(r.IDLookup) === '*'; })[0] || null;
  }

  function contienePalabra(textoKey, palabra) {
    var p = key(palabra);
    if (p.length < 4) return false;
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
    var extra = para.concat(cc).map(function (e) { return e.toLowerCase(); }).filter(function (e) { return !permitidos[e]; });
    var faltanPara = emails(fila.Para).filter(function (e) { return para.map(function (x) { return x.toLowerCase(); }).indexOf(e) < 0; });
    var faltanCC = emails(fila.CC).filter(function (e) { return cc.map(function (x) { return x.toLowerCase(); }).indexOf(e) < 0; });
    return { extra: extra, faltanPara: faltanPara, faltanCC: faltanCC };
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
    var campos = ['Subcliente', 'IDLookup', 'NombreAlerta', 'Para', 'CC', 'Activo'];
    return rows.map(function (r) {
      var o = {};
      Object.keys(r).forEach(function (k) {
        var c = campos.filter(function (x) { return key(x) === key(k).replace(/\s/g, ''); })[0];
        if (c) o[c] = norm(r[k]);
      });
      return o;
    }).filter(function (o) { return o.Subcliente && o.IDLookup && (o.Para || o.CC); });
  }

  /* ---------- Tabla de resultados de Splunk ---------- */
  var EXCLUIR_DEF = ['id_matriz', 'alert_name', 'type_infra'];
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

  /* Busca la matriz del cliente; tolera sufijos del nombre de archivo (ej. "Cliente (1)", "Cliente-Y"). */
  function matrizDe(matrices, cliente) {
    var k = key(cliente);
    if (matrices[k]) return k;
    var cand = Object.keys(matrices).filter(function (m) {
      return m.indexOf(k) === 0 && /^[\s\-_(]/.test(m.slice(k.length));
    });
    return cand.length === 1 ? cand[0] : null;
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

  var api = {
    arreglarBordes: arreglarBordes,
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
