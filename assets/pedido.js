/* Pedido pelo site — carrinho local e checkout único pelo WhatsApp.
   Sem backend: o pedido fica no navegador do cliente (localStorage) e vira
   uma mensagem de WhatsApp. Preços aqui devem bater com os das páginas e
   com Precificacao-produtos.xlsx. Criado em 03/10/2026. */
(function () {
  'use strict';

  var WHATSAPP = '5548999442988';
  var STORAGE = 'cakesjl-pedido-v1';
  var PRAZO_NOVOS_H = 24;   // brownies e donuts
  var PRAZO_TORTAS_H = 48;  // tortas, Matilda e Bentô

  var CATALOGO = {
    'brownie-cobertura': { nome: 'Brownie com cobertura', preco: 14, grupo: 'novos', opcao: 'Cobertura' },
    'marmitinha': { nome: 'Marmitinha brownie recheada', preco: 24.9, grupo: 'novos', opcao: 'Recheio' },
    'donuts': { nome: 'Donuts no copinho (6 unidades)', preco: 23, grupo: 'novos', opcao: 'Recheio da tampa' },
    'matilda': { nome: 'Bolo Matilda (M, aro 20, aprox. 3 kg)', preco: 170, grupo: 'tortas' },
    'bento': { nome: 'Bentô Cake', grupo: 'tortas' },
    'torta': { nome: 'Torta', grupo: 'tortas' }
  };
  var TORTA = {
    tamanhos: { P: 'P (aro 15, 12 fatias)', M: 'M (aro 20, 24 fatias)', G: 'G (aro 25, 40 fatias)' },
    linhas: {
      'Clássicos': { P: 159, M: 230, G: 320 },
      'Especiais': { P: 170, M: 270, G: 360 },
      'Premium': { P: 200, M: 300, G: 420 }
    }
  };
  var BENTO = {
    flork: { nome: 'Flork com escrita, somente escrita ou pequenos desenhos em preto', preco: 70 },
    lacos: { nome: 'Laços com escrita ou recheio para chá revelação', preco: 75 },
    geleia: 7
  };

  /* ---------- utilidades ---------- */
  function moeda(v) {
    return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function raiz() {
    var s = document.querySelector('script[src*="pedido.js"]');
    if (!s) return '';
    return s.getAttribute('src').replace(/assets\/pedido\.js.*$/, '');
  }
  function lerPedido() {
    try { var p = JSON.parse(localStorage.getItem(STORAGE) || '[]'); return Array.isArray(p) ? p : []; }
    catch (_) { return []; }
  }
  function gravarPedido(itens) {
    try { localStorage.setItem(STORAGE, JSON.stringify(itens)); } catch (_) {}
    atualizarContadores(itens);
  }
  function totalQtd(itens) { return itens.reduce(function (n, i) { return n + i.qtd; }, 0); }
  function temTortas(itens) { return itens.some(function (i) { return CATALOGO[i.tipo] && CATALOGO[i.tipo].grupo === 'tortas'; }); }
  function prazoHoras(itens) { return temTortas(itens) ? PRAZO_TORTAS_H : PRAZO_NOVOS_H; }
  function escapar(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function uid() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------- contador fixo e link do menu ---------- */
  function atualizarContadores(itens) {
    var n = totalQtd(itens || lerPedido());
    document.querySelectorAll('[data-pedido-contador]').forEach(function (el) { el.textContent = n; });
    var fab = document.querySelector('.cart-fab');
    if (fab) fab.hidden = n === 0 || document.body.classList.contains('pedido-page');
    document.querySelectorAll('.nav-pedido').forEach(function (a) { a.classList.toggle('has-items', n > 0); a.dataset.n = n; });
  }
  function montarFab() {
    if (document.querySelector('.cart-fab')) return;
    var a = document.createElement('a');
    a.className = 'cart-fab';
    a.href = raiz() + 'pedido/index.html';
    a.hidden = true;
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 5h2l2 11h11l2-8H6"/><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>Ver pedido <span class="cart-fab-n" data-pedido-contador>0</span>';
    document.body.appendChild(a);
  }
  var toastTimer = 0;
  function toast(msg) {
    var t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------- formulários de produto ---------- */
  function lerQtd(form) {
    var q = parseInt(form.querySelector('[name=qtd]').value, 10);
    return isNaN(q) || q < 1 ? 1 : Math.min(q, 99);
  }
  function montarItem(form) {
    var tipo = form.dataset.produto;
    var base = CATALOGO[tipo];
    var item = { uid: uid(), tipo: tipo, nome: base.nome, qtd: lerQtd(form), preco: base.preco, detalhes: [], extras: [], obs: '' };
    if (tipo === 'brownie-cobertura' || tipo === 'marmitinha' || tipo === 'donuts') {
      item.detalhes.push(base.opcao + ': ' + form.querySelector('[name=sabor]').value);
    } else if (tipo === 'bento') {
      var op = form.querySelector('[name=opcao]:checked').value;
      var sabor = form.querySelector('[name=sabor]').value;
      item.nome = 'Bentô Cake (aprox. 300 g)';
      item.preco = BENTO[op].preco + (sabor === 'Ninho com geleia de morango' ? BENTO.geleia : 0);
      item.detalhes.push(BENTO[op].nome);
      item.detalhes.push('Sabor: ' + sabor + (sabor === 'Ninho com geleia de morango' ? ' (+ ' + moeda(BENTO.geleia) + ')' : ''));
      var escrita = form.querySelector('[name=escrita]').value.trim();
      if (escrita) item.detalhes.push('Escrita/decoração: ' + escrita);
    } else if (tipo === 'torta') {
      var tam = form.querySelector('[name=tamanho]:checked').value;
      var sel = form.querySelector('[name=sabor]');
      var opt = sel.options[sel.selectedIndex];
      var linha = opt.dataset.linha || '';
      var saborT = opt.value;
      if (saborT === 'Outro') {
        var outro = form.querySelector('[name=outro]').value.trim();
        saborT = 'Outro sabor: ' + (outro || 'a combinar');
        item.preco = null;
      } else {
        item.preco = TORTA.linhas[linha][tam];
        if (saborT === 'Morangos') saborT = 'Morangos com ' + form.querySelector('[name=morangos]').value;
      }
      item.nome = 'Torta ' + TORTA.tamanhos[tam];
      item.detalhes.push(saborT + (linha ? ' (' + linha + ')' : ''));
      form.querySelectorAll('[name=adicional]:checked').forEach(function (c) {
        item.extras.push({ nome: c.value, aPartir: parseFloat(c.dataset.preco) });
      });
      var deco = form.querySelector('[name=decoracao]').value.trim();
      if (deco) item.obs = 'Decoração: ' + deco;
    }
    return item;
  }
  function ligarFormulario(form) {
    var qtd = form.querySelector('[name=qtd]');
    form.querySelectorAll('[data-menos]').forEach(function (b) { b.addEventListener('click', function () { qtd.value = Math.max(1, (parseInt(qtd.value, 10) || 1) - 1); }); });
    form.querySelectorAll('[data-mais]').forEach(function (b) { b.addEventListener('click', function () { qtd.value = Math.min(99, (parseInt(qtd.value, 10) || 1) + 1); }); });
    var sel = form.querySelector('[name=sabor]');
    if (form.dataset.produto === 'torta' && sel) {
      var atualizar = function () {
        var v = sel.value;
        form.querySelector('[data-campo=morangos]').hidden = v !== 'Morangos';
        form.querySelector('[data-campo=outro]').hidden = v !== 'Outro';
        var opt = sel.options[sel.selectedIndex];
        var tam = form.querySelector('[name=tamanho]:checked');
        var previa = form.querySelector('[data-previa]');
        if (previa) {
          if (v === 'Outro' || !opt.dataset.linha || !tam) previa.textContent = v === 'Outro' ? 'Valor a combinar' : '';
          else previa.textContent = moeda(TORTA.linhas[opt.dataset.linha][tam.value]) + ' · ' + opt.dataset.linha;
        }
      };
      sel.addEventListener('change', atualizar);
      form.querySelectorAll('[name=tamanho]').forEach(function (r) { r.addEventListener('change', atualizar); });
      atualizar();
    }
    if (form.dataset.produto === 'bento') {
      var previaB = form.querySelector('[data-previa]');
      var atualizarB = function () {
        var op = form.querySelector('[name=opcao]:checked');
        var sb = form.querySelector('[name=sabor]').value;
        if (previaB && op) previaB.textContent = moeda(BENTO[op.value].preco + (sb === 'Ninho com geleia de morango' ? BENTO.geleia : 0));
      };
      form.querySelectorAll('[name=opcao],[name=sabor]').forEach(function (el) { el.addEventListener('change', atualizarB); });
      atualizarB();
    }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var item = montarItem(form);
      var itens = lerPedido();
      itens.push(item);
      gravarPedido(itens);
      toast(item.qtd + '× ' + item.nome + ' no seu pedido');
      var fab = document.querySelector('.cart-fab');
      if (fab) { fab.classList.add('pulse'); setTimeout(function () { fab.classList.remove('pulse'); }, 700); }
    });
    form.classList.add('enhanced');
  }

  /* ---------- checkout ---------- */
  function linhaItem(i) {
    var s = i.qtd + '× ' + i.nome;
    if (i.detalhes.length) s += ' — ' + i.detalhes.join(' — ');
    s += ' — ' + (i.preco == null ? 'valor a combinar' : moeda(i.preco * i.qtd));
    return s;
  }
  function textoMensagem(itens, dados) {
    var linhas = ['Olá! Quero fazer um pedido pelo site da Cakes JL.', 'Nome: ' + dados.nome, '', 'Pedido:'];
    var total = 0, aCombinar = false;
    itens.forEach(function (i, k) {
      linhas.push((k + 1) + ') ' + linhaItem(i));
      if (i.extras.length) linhas.push('   Adicionais: ' + i.extras.map(function (e) { return e.nome + ' (a partir de ' + moeda(e.aPartir) + ')'; }).join('; '));
      if (i.obs) linhas.push('   ' + i.obs);
      if (i.preco == null) aCombinar = true; else total += i.preco * i.qtd;
      if (i.extras.length) aCombinar = true;
    });
    linhas.push('');
    linhas.push('Total dos itens: ' + moeda(total) + (aCombinar ? ' (adicionais e itens a combinar fora do total)' : ''));
    linhas.push('Sinal de 50%: ' + moeda(total / 2) + (aCombinar ? ' (sobre os itens com valor fechado)' : ''));
    linhas.push('');
    linhas.push('Retirada desejada: ' + dados.data + (dados.hora ? ', ' + dados.hora : '') + ' (a confirmar)');
    linhas.push('Pagamento: ' + dados.pagamento);
    if (dados.obs) linhas.push('Observações: ' + dados.obs);
    return linhas.join('\n');
  }
  function formatarData(iso) {
    var p = iso.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }
  function iniciarCheckout() {
    var lista = document.querySelector('[data-lista]');
    var vazio = document.querySelector('[data-vazio]');
    var resumo = document.querySelector('[data-resumo]');
    var form = document.querySelector('[data-checkout]');
    var obrigado = document.querySelector('[data-obrigado]');
    var reenviar = document.querySelector('[data-reenviar]');
    var prazoEl = document.querySelector('[data-prazo]');
    var avisoData = document.querySelector('[data-aviso-data]');
    var dataEl = form.querySelector('[name=data]');
    var nomeEl = form.querySelector('[name=nome]');
    var horaEl = form.querySelector('[name=hora]');
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    dataEl.min = hoje.toISOString().slice(0, 10);

    function mostrarErro(campo, msg) {
      var el = form.querySelector('[data-erro="' + campo + '"]');
      if (el) { el.textContent = msg || ''; el.hidden = !msg; }
      var input = form.querySelector('[name=' + campo + ']');
      if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    function render() {
      var itens = lerPedido();
      lista.innerHTML = '';
      var temItens = itens.length > 0;
      vazio.hidden = temItens; form.hidden = !temItens; resumo.hidden = !temItens; lista.hidden = !temItens;
      if (!temItens) { atualizarContadores(itens); return; }
      var total = 0, aCombinar = false;
      itens.forEach(function (i) {
        var li = document.createElement('li');
        li.className = 'cart-item';
        var sub = i.preco == null ? 'a combinar' : moeda(i.preco * i.qtd);
        if (i.preco == null || i.extras.length) aCombinar = true;
        if (i.preco != null) total += i.preco * i.qtd;
        li.innerHTML =
          '<div class="cart-item-main"><strong>' + escapar(i.nome) + '</strong>' +
          (i.detalhes.length ? '<span>' + escapar(i.detalhes.join(' · ')) + '</span>' : '') +
          (i.extras.length ? '<span>Adicionais: ' + escapar(i.extras.map(function (e) { return e.nome; }).join(', ')) + ' (a partir de, a combinar)</span>' : '') +
          (i.obs ? '<span>' + escapar(i.obs) + '</span>' : '') + '</div>' +
          '<div class="cart-item-side"><div class="qty"><button type="button" data-menos aria-label="Diminuir quantidade">−</button><input type="number" name="qtd" min="1" max="99" inputmode="numeric" value="' + i.qtd + '" aria-label="Quantidade"><button type="button" data-mais aria-label="Aumentar quantidade">+</button></div>' +
          '<strong class="cart-item-sub">' + sub + '</strong><button type="button" class="cart-remove" data-remover>Remover</button></div>';
        var input = li.querySelector('[name=qtd]');
        function setQtd(n) { n = Math.max(1, Math.min(99, n || 1)); i.qtd = n; gravarPedido(itens); render(); }
        li.querySelector('[data-menos]').addEventListener('click', function () { setQtd(i.qtd - 1); });
        li.querySelector('[data-mais]').addEventListener('click', function () { setQtd(i.qtd + 1); });
        input.addEventListener('change', function () { setQtd(parseInt(input.value, 10)); });
        li.querySelector('[data-remover]').addEventListener('click', function () {
          var idx = itens.indexOf(i); if (idx > -1) itens.splice(idx, 1); gravarPedido(itens); render();
        });
        lista.appendChild(li);
      });
      resumo.querySelector('[data-total]').textContent = moeda(total);
      resumo.querySelector('[data-sinal]').textContent = moeda(total / 2);
      resumo.querySelector('[data-combinar]').hidden = !aCombinar;
      var h = prazoHoras(itens);
      prazoEl.textContent = h === PRAZO_TORTAS_H
        ? 'Seu pedido tem torta, Matilda ou Bentô: a antecedência mínima é de 48 horas.'
        : 'Brownies e donuts: antecedência mínima de 24 horas.';
      conferirData();
      atualizarContadores(itens);
    }
    function conferirData() {
      var itens = lerPedido();
      if (!dataEl.value) { avisoData.hidden = true; return; }
      var escolhida = new Date(dataEl.value + 'T' + (horaEl.value || '23:59'));
      var minima = new Date(Date.now() + prazoHoras(itens) * 3600000);
      avisoData.hidden = escolhida >= minima;
    }
    dataEl.addEventListener('change', conferirData);
    horaEl.addEventListener('change', conferirData);
    nomeEl.addEventListener('input', function () { if (nomeEl.value.trim().length >= 2) mostrarErro('nome', ''); });
    dataEl.addEventListener('input', function () { if (dataEl.value) mostrarErro('data', ''); });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var itens = lerPedido();
      if (!itens.length) return;
      var nome = nomeEl.value.trim();
      var ok = true;
      if (nome.length < 2) { mostrarErro('nome', 'Informe seu nome para enviar o pedido.'); ok = false; } else mostrarErro('nome', '');
      if (!dataEl.value) { mostrarErro('data', 'Escolha a data de retirada desejada.'); ok = false; } else mostrarErro('data', '');
      if (!ok) { (nome.length < 2 ? nomeEl : dataEl).focus(); return; }
      var pag = form.querySelector('[name=pagamento]:checked');
      var dados = {
        nome: nome,
        data: formatarData(dataEl.value),
        hora: horaEl.value,
        pagamento: pag ? pag.value : '',
        obs: form.querySelector('[name=obs]').value.trim()
      };
      var texto = textoMensagem(itens, dados);
      var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto);
      var previa = document.querySelector('[data-previa-mensagem]');
      if (previa) previa.textContent = texto;
      if (reenviar) reenviar.href = url;
      window.open(url, '_blank', 'noopener');
      // agradecimento: esconde lista e formulário; o pedido continua guardado para reenvio
      lista.hidden = true; resumo.hidden = true; form.hidden = true;
      if (obrigado) {
        obrigado.hidden = false;
        var nomeSpan = obrigado.querySelector('[data-obrigado-nome]');
        if (nomeSpan) nomeSpan.textContent = nome;
        obrigado.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var foco = obrigado.querySelector('h2'); if (foco) foco.focus();
      }
    });
    if (obrigado) {
      var editar = obrigado.querySelector('[data-editar]');
      if (editar) editar.addEventListener('click', function () {
        obrigado.hidden = true; lista.hidden = false; resumo.hidden = false; form.hidden = false;
        lista.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      var novo = obrigado.querySelector('[data-novo]');
      if (novo) novo.addEventListener('click', function () {
        gravarPedido([]); obrigado.hidden = true; render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    var limpar = document.querySelector('[data-limpar]');
    if (limpar) limpar.addEventListener('click', function () {
      if (window.confirm('Esvaziar o pedido?')) { gravarPedido([]); render(); }
    });
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    montarFab();
    document.querySelectorAll('form[data-produto]').forEach(ligarFormulario);
    if (document.querySelector('[data-checkout]')) iniciarCheckout();
    atualizarContadores(lerPedido());
  });
})();
