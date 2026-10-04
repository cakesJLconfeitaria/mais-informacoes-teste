/* Pedido pelo site — carrinho local e checkout único pelo WhatsApp.
   Sem backend: o pedido fica no navegador do cliente (localStorage) e vira
   uma mensagem de WhatsApp. Preços aqui devem bater com os das páginas e
   com Precificacao-produtos.xlsx. Criado em 03/10/2026; em 03/10/2026 o sabor
   dos produtos novos passou a ser escolhido por botões (chocolate 50% cacau,
   Ninho ou casadinho), sem acréscimo. Em 04/10/2026 o horário de retirada
   passou a ser obrigatório no checkout e o link "Meu pedido" saiu do menu de
   categorias para o canto superior direito de todas as páginas (.cart-link).
   Ainda em 04/10/2026 a página de tortas passou a ter um formulário por linha
   (data-linha="Clássicos" | "Especiais" | "Premium"; vazio = outro sabor, a
   combinar), tamanho e sabor por botões, e os adicionais escolhidos num popup
   compartilhado ([data-addons-picker]); o Bentô escolhe opção e sabor por
   botões. A mensagem do WhatsApp não mudou de formato. Em 04/10/2026 (P19,
   revisão de linguagem) mudaram só os textos gerados aqui: aviso ao adicionar,
   resumo dos adicionais ("Nenhum adicional escolhido" / "Ver opções"), avisos
   de antecedência, mensagens de preenchimento, a primeira linha da mensagem
   do WhatsApp e os prefixos "Observações da torta:" e "Frase ou desenho:".
   Ainda em 04/10/2026 (P20 a P24): os adicionais passaram a ter preço fechado
   (entram no preço do item, no total, no sinal e na mensagem; só "Outro sabor"
   continua a combinar); cada card ganhou a faixa "Preço final" (valor ×
   quantidade, com o detalhe embaixo); a página do pedido ganhou o cartão rosa
   da lista ([data-carrinho]) e o quadro do Pix com botão Copiar ([data-pix]),
   mostrado ao marcar Pix e na tela final; a mensagem leva a chave Pix. O
   formato dos itens guardados mudou (extras com preco), por isso STORAGE
   passou de v1 para v2. */
(function () {
  'use strict';

  var WHATSAPP = '5548999442988';
  var STORAGE = 'cakesjl-pedido-v2'; // v2 em 04/10/2026: extras com preço fechado
  var PRAZO_NOVOS_H = 24;   // brownies e donuts
  var PRAZO_TORTAS_H = 48;  // tortas, Matilda e Bentô
  var PIX = { chave: 'cakesjlconfeitaria@gmail.com' }; // titular e banco ficam no HTML do quadro

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
  function somaExtras(extras) { return (extras || []).reduce(function (t, e) { return t + (e.preco || 0); }, 0); }
  function totalQtd(itens) { return itens.reduce(function (n, i) { return n + i.qtd; }, 0); }
  function temTortas(itens) { return itens.some(function (i) { return CATALOGO[i.tipo] && CATALOGO[i.tipo].grupo === 'tortas'; }); }
  function prazoHoras(itens) { return temTortas(itens) ? PRAZO_TORTAS_H : PRAZO_NOVOS_H; }
  function escapar(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function uid() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------- contador fixo e botão "Meu pedido" do canto ---------- */
  function atualizarContadores(itens) {
    var n = totalQtd(itens || lerPedido());
    document.querySelectorAll('[data-pedido-contador]').forEach(function (el) { el.textContent = n; });
    var fab = document.querySelector('.cart-fab');
    if (fab) fab.hidden = n === 0 || document.body.classList.contains('pedido-page');
    // .cart-link: pílula do canto superior direito (todas as páginas); o número só aparece com itens
    document.querySelectorAll('.cart-link, .nav-pedido').forEach(function (a) {
      a.classList.toggle('has-items', n > 0);
      a.dataset.n = n;
      if (a.classList.contains('cart-link')) a.setAttribute('aria-label', 'Meu pedido' + (n > 0 ? ', ' + n + (n === 1 ? ' item' : ' itens') : ', vazio'));
    });
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
      // sabor escolhido por botões (radio); casadinho = chocolate + Ninho, mesmo preço
      var saborEscolhido = form.querySelector('[name=sabor]:checked');
      item.detalhes.push(base.opcao + ': ' + (saborEscolhido ? saborEscolhido.value : ''));
    } else if (tipo === 'bento') {
      var op = form.querySelector('[name=opcao]:checked').value;
      var saborB = form.querySelector('[name=sabor]:checked');
      var sabor = saborB ? saborB.value : '';
      item.nome = 'Bentô Cake (aprox. 300 g)';
      item.preco = BENTO[op].preco + (sabor === 'Ninho com geleia de morango' ? BENTO.geleia : 0);
      item.detalhes.push(BENTO[op].nome);
      item.detalhes.push('Sabor: ' + sabor + (sabor === 'Ninho com geleia de morango' ? ' (+ ' + moeda(BENTO.geleia) + ')' : ''));
      var escrita = form.querySelector('[name=escrita]').value.trim();
      if (escrita) item.detalhes.push('Frase ou desenho: ' + escrita);
    } else if (tipo === 'torta') {
      // um formulário por linha: data-linha diz a linha (Clássicos, Especiais, Premium); vazio é "outro sabor", a combinar
      var tam = form.querySelector('[name=tamanho]:checked').value;
      var linha = form.dataset.linha || '';
      var saborT;
      if (!linha || !TORTA.linhas[linha]) {
        var outro = form.querySelector('[name=outro]').value.trim();
        saborT = 'Outro sabor: ' + (outro || 'a combinar');
        item.preco = null;
      } else {
        var saborEscolhidoT = form.querySelector('[name=sabor]:checked');
        saborT = saborEscolhidoT ? saborEscolhidoT.value : '';
        item.preco = TORTA.linhas[linha][tam];
        if (saborT === 'Morangos') {
          var creme = form.querySelector('[name=morangos]:checked');
          saborT = 'Morangos com ' + (creme ? creme.value : '');
        }
      }
      item.nome = 'Torta ' + TORTA.tamanhos[tam];
      item.detalhes.push(saborT + (linha ? ' (' + linha + ')' : ''));
      // adicionais com preço fechado (04/10/2026): somam no preço de cada torta
      (form._adicionais || []).forEach(function (a) {
        item.extras.push({ nome: a.nome, preco: a.preco });
      });
      if (item.preco != null) item.preco += somaExtras(item.extras);
      var deco = form.querySelector('[name=decoracao]').value.trim();
      if (deco) item.obs = 'Observações da torta: ' + deco;
    }
    return item;
  }

  /* ---------- popup de adicionais e decoração (tortas, 04/10/2026) ----------
     A seção [data-addons-picker] existe no HTML (sem JavaScript é uma lista
     comum, com fotos e valores). Com JavaScript ela sai do painel, vira um
     popup compartilhado pelos formulários de torta e guarda a escolha em
     form._adicionais; o card mostra o resumo. Fechar por X, toque fora ou Esc
     mantém o que estava marcado; "Não quero adicionais" desmarca tudo. */
  var abrirAdicionais = null;
  function iniciarAdicionais() {
    var picker = document.querySelector('[data-addons-picker]');
    if (!picker) return;
    var caixa = picker.querySelector('.addons-box');
    var caixas = Array.prototype.slice.call(picker.querySelectorAll('[name=adicional]'));
    var concluir = picker.querySelector('[data-addons-done]');
    var nenhum = picker.querySelector('[data-addons-none]');
    var fechar = picker.querySelector('[data-addons-close]');
    var painel = document.querySelector('.panel');
    var formAtivo = null, origem = null;
    var menor = caixas.reduce(function (m, c) { var p = parseFloat(c.dataset.preco); return isNaN(p) ? m : Math.min(m, p); }, Infinity);
    var maior = caixas.reduce(function (m, c) { var p = parseFloat(c.dataset.preco); return isNaN(p) ? m : Math.max(m, p); }, -Infinity);
    var dica = 'Veja as ' + caixas.length + ' opções com foto' + (isFinite(menor) && isFinite(maior) ? ', de ' + moeda(menor).replace(' ', '\u00a0') + ' a ' + moeda(maior).replace(' ', '\u00a0') : '');

    document.body.appendChild(picker);
    picker.classList.add('enhanced');
    picker.hidden = true;
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-modal', 'true');

    function lightboxAberto() { return document.body.classList.contains('lightbox-open'); }
    function focaveis() {
      return Array.prototype.filter.call(picker.querySelectorAll('button, a[href], input'), function (el) {
        return !el.disabled && el.offsetParent !== null;
      });
    }
    function escolhidos() {
      return caixas.filter(function (c) { return c.checked; }).map(function (c) { return { nome: c.value, preco: parseFloat(c.dataset.preco) }; });
    }
    function atualizarConcluir() {
      var n = caixas.filter(function (c) { return c.checked; }).length;
      concluir.textContent = n ? 'Concluir (' + n + (n === 1 ? ' escolhido)' : ' escolhidos)') : 'Concluir';
    }
    function resumo(form) {
      var lista = form._adicionais || [];
      var el = form.querySelector('[data-addons-summary]');
      var acao = form.querySelector('[data-addons-action]');
      var botao = form.querySelector('[data-addons-open]');
      if (!el) return;
      if (lista.length) {
        el.innerHTML = '<strong>' + lista.length + (lista.length === 1 ? ' escolhido' : ' escolhidos') + ' · + ' + moeda(somaExtras(lista)).replace(' ', '\u00a0') + '</strong><small>' +
          escapar(lista.map(function (a) { return a.nome; }).join(', ')) + '</small>';
        if (acao) acao.textContent = 'Alterar';
      } else {
        el.innerHTML = '<strong>Nenhum adicional escolhido</strong><small>' + escapar(dica) + '</small>';
        if (acao) acao.textContent = 'Ver opções';
      }
      if (botao) botao.classList.toggle('has-addons', lista.length > 0);
      if (form._atualizarPrevia) form._atualizarPrevia();
    }
    function abrir(form, botao) {
      formAtivo = form; origem = botao;
      var marcados = (form._adicionais || []).map(function (a) { return a.nome; });
      caixas.forEach(function (c) { c.checked = marcados.indexOf(c.value) > -1; });
      atualizarConcluir();
      picker.hidden = false;
      caixa.scrollTop = 0;
      document.body.classList.add('picker-open');
      if (painel && 'inert' in painel) painel.inert = true;
      fechar.focus();
    }
    function encerrar(guardar) {
      if (picker.hidden) return;
      if (formAtivo) {
        if (!guardar) caixas.forEach(function (c) { c.checked = false; });
        formAtivo._adicionais = escolhidos();
        resumo(formAtivo);
      }
      picker.hidden = true;
      document.body.classList.remove('picker-open');
      if (painel && 'inert' in painel) painel.inert = false;
      if (origem) origem.focus();
      formAtivo = null; origem = null;
    }
    caixas.forEach(function (c) { c.addEventListener('change', atualizarConcluir); });
    concluir.addEventListener('click', function () { encerrar(true); });
    nenhum.addEventListener('click', function () { encerrar(false); });
    fechar.addEventListener('click', function () { encerrar(true); });
    picker.addEventListener('click', function (event) { if (event.target === picker) encerrar(true); });
    document.addEventListener('keydown', function (event) {
      // o popup de foto (site.js) trata o Esc antes e marca o evento; nesse caso só ele fecha
      if (picker.hidden || lightboxAberto() || event.defaultPrevented) return;
      if (event.key === 'Escape') { event.preventDefault(); encerrar(true); return; }
      if (event.key !== 'Tab') return;
      var lista = focaveis();
      if (!lista.length) return;
      var primeiro = lista[0], ultimo = lista[lista.length - 1];
      if (event.shiftKey && (document.activeElement === primeiro || !picker.contains(document.activeElement))) { event.preventDefault(); ultimo.focus(); }
      else if (!event.shiftKey && (document.activeElement === ultimo || !picker.contains(document.activeElement))) { event.preventDefault(); primeiro.focus(); }
    });
    // o popup de foto, ao fechar, libera o painel; com o popup de adicionais ainda aberto, o painel volta a ficar inerte
    document.addEventListener('focusin', function (event) {
      if (picker.hidden || lightboxAberto()) return;
      if (painel && 'inert' in painel && !painel.inert) painel.inert = true;
      if (!picker.contains(event.target)) fechar.focus();
    });
    abrirAdicionais = abrir;
    document.querySelectorAll('form[data-produto=torta]').forEach(function (form) {
      form._adicionais = [];
      resumo(form);
    });
  }
  /* Faixa "Preço final" (04/10/2026): valor unitário × quantidade e uma linha de
     detalhe ("2× tamanho M · 2 adicionais"). unit == null mostra "Valor a combinar". */
  function mostrarPrevia(form, unit, detalhe) {
    var el = form.querySelector('[data-previa]');
    if (!el) return;
    var valor = el.querySelector('[data-previa-valor]');
    var det = el.querySelector('[data-previa-detalhe]');
    var q = lerQtd(form);
    var prefixo = q > 1 ? q + '× ' : '';
    if (unit == null) {
      el.classList.add('is-open');
      if (valor) valor.textContent = 'Valor a combinar';
    } else {
      el.classList.remove('is-open');
      if (valor) valor.textContent = moeda(unit * q);
    }
    if (det) det.textContent = prefixo + (detalhe || '');
  }
  function textoAdicionais(lista) {
    if (!lista || !lista.length) return '';
    return ' · ' + lista.length + (lista.length === 1 ? ' adicional' : ' adicionais') + ' (+ ' + moeda(somaExtras(lista)) + ')';
  }
  function ligarFormulario(form) {
    var qtd = form.querySelector('[name=qtd]');
    var tipo = form.dataset.produto;
    var aoMudarQtd = function () { if (form._atualizarPrevia) form._atualizarPrevia(); };
    form.querySelectorAll('[data-menos]').forEach(function (b) { b.addEventListener('click', function () { qtd.value = Math.max(1, (parseInt(qtd.value, 10) || 1) - 1); aoMudarQtd(); }); });
    form.querySelectorAll('[data-mais]').forEach(function (b) { b.addEventListener('click', function () { qtd.value = Math.min(99, (parseInt(qtd.value, 10) || 1) + 1); aoMudarQtd(); }); });
    qtd.addEventListener('input', aoMudarQtd);
    qtd.addEventListener('change', aoMudarQtd);
    if (tipo === 'brownie-cobertura' || tipo === 'marmitinha' || tipo === 'donuts') {
      form._atualizarPrevia = function () {
        var s = form.querySelector('[name=sabor]:checked');
        mostrarPrevia(form, CATALOGO[tipo].preco, s ? CATALOGO[tipo].opcao + ': ' + s.value : '');
      };
      form.querySelectorAll('[name=sabor]').forEach(function (r) { r.addEventListener('change', form._atualizarPrevia); });
      form._atualizarPrevia();
    }
    if (tipo === 'matilda') {
      form._atualizarPrevia = function () { mostrarPrevia(form, CATALOGO.matilda.preco, 'Tamanho M · aro 20'); };
      form._atualizarPrevia();
    }
    if (tipo === 'torta') {
      // tamanho e sabor por botões; a faixa mostra tamanho × quantidade mais os adicionais (ou "a combinar" no card de outro sabor)
      var linhaT = form.dataset.linha || '';
      var campoMorangos = form.querySelector('[data-campo=morangos]');
      form._atualizarPrevia = function () {
        var sabor = form.querySelector('[name=sabor]:checked');
        var tam = form.querySelector('[name=tamanho]:checked');
        if (campoMorangos) campoMorangos.hidden = !(sabor && sabor.value === 'Morangos');
        var extras = form._adicionais || [];
        var detalhe = (tam ? 'tamanho ' + tam.value : '') + textoAdicionais(extras);
        if (!linhaT || !TORTA.linhas[linhaT] || !tam) mostrarPrevia(form, null, detalhe);
        else mostrarPrevia(form, TORTA.linhas[linhaT][tam.value] + somaExtras(extras), detalhe);
      };
      form.querySelectorAll('[name=tamanho],[name=sabor]').forEach(function (r) { r.addEventListener('change', form._atualizarPrevia); });
      form._atualizarPrevia();
      var botaoAdicionais = form.querySelector('[data-addons-open]');
      if (botaoAdicionais) botaoAdicionais.addEventListener('click', function () { if (abrirAdicionais) abrirAdicionais(form, botaoAdicionais); });
    }
    if (tipo === 'bento') {
      form._atualizarPrevia = function () {
        var op = form.querySelector('[name=opcao]:checked');
        var sb = form.querySelector('[name=sabor]:checked');
        if (!op) return;
        var geleia = sb && sb.value === 'Ninho com geleia de morango';
        mostrarPrevia(form, BENTO[op.value].preco + (geleia ? BENTO.geleia : 0), (op.value === 'flork' ? 'Flork' : 'Laços') + (sb ? ' · ' + sb.value : ''));
      };
      form.querySelectorAll('[name=opcao],[name=sabor]').forEach(function (el) { el.addEventListener('change', form._atualizarPrevia); });
      form._atualizarPrevia();
    }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var item = montarItem(form);
      var itens = lerPedido();
      itens.push(item);
      gravarPedido(itens);
      toast('Adicionado ao seu pedido: ' + item.qtd + '× ' + item.nome);
      var fab = document.querySelector('.cart-fab');
      if (fab) { fab.classList.add('pulse'); setTimeout(function () { fab.classList.remove('pulse'); }, 700); }
      // a pílula "Meu pedido" do canto pulsa ao receber um item (04/10/2026)
      document.querySelectorAll('.cart-link').forEach(function (a) {
        a.classList.remove('bump'); void a.offsetWidth; a.classList.add('bump');
        setTimeout(function () { a.classList.remove('bump'); }, 600);
      });
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
    var linhas = ['Olá! Montei meu pedido no site da Cakes JL e gostaria de confirmar os detalhes.', 'Nome: ' + dados.nome, '', 'Pedido:'];
    var total = 0, aCombinar = false;
    itens.forEach(function (i, k) {
      linhas.push((k + 1) + ') ' + linhaItem(i));
      if (i.extras.length) linhas.push('   Adicionais: ' + i.extras.map(function (e) { return e.nome + ' (' + moeda(e.preco) + ')'; }).join('; '));
      if (i.obs) linhas.push('   ' + i.obs);
      if (i.preco == null) aCombinar = true; else total += i.preco * i.qtd;
    });
    linhas.push('');
    linhas.push('Total dos itens: ' + moeda(total) + (aCombinar ? ' (itens a combinar fora do total)' : ''));
    linhas.push('Sinal de 50%: ' + moeda(total / 2) + (aCombinar ? ' (sobre os itens com valor fechado)' : ''));
    linhas.push('');
    linhas.push('Retirada desejada: ' + dados.data + (dados.hora ? ', ' + dados.hora : '') + ' (a confirmar)');
    linhas.push('Pagamento: ' + dados.pagamento + (dados.pagamento === 'Pix' ? ' (chave: ' + PIX.chave + ')' : ''));
    if (dados.obs) linhas.push('Observações: ' + dados.obs);
    return linhas.join('\n');
  }
  function formatarData(iso) {
    var p = iso.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso;
  }
  function iniciarCheckout() {
    var lista = document.querySelector('[data-lista]');
    var caixa = document.querySelector('[data-carrinho]');
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
      if (caixa) caixa.hidden = false;
      vazio.hidden = temItens; form.hidden = !temItens; resumo.hidden = !temItens; lista.hidden = !temItens;
      if (!temItens) { atualizarContadores(itens); return; }
      var total = 0, aCombinar = false;
      itens.forEach(function (i) {
        var li = document.createElement('li');
        li.className = 'cart-item';
        var sub = i.preco == null ? 'a combinar' : moeda(i.preco * i.qtd);
        if (i.preco == null) aCombinar = true;
        if (i.preco != null) total += i.preco * i.qtd;
        li.innerHTML =
          '<div class="cart-item-main"><strong>' + escapar(i.nome) + '</strong>' +
          (i.detalhes.length ? '<span>' + escapar(i.detalhes.join(' · ')) + '</span>' : '') +
          (i.extras.length ? '<span>Adicionais: ' + escapar(i.extras.map(function (e) { return e.nome + ' (' + moeda(e.preco) + ')'; }).join(', ')) + '</span>' : '') +
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
      document.querySelectorAll('[data-pix-sinal]').forEach(function (el) { el.textContent = moeda(total / 2); });
      resumo.querySelector('[data-combinar]').hidden = !aCombinar;
      var h = prazoHoras(itens);
      prazoEl.textContent = h === PRAZO_TORTAS_H
        ? 'Seu pedido inclui torta, Matilda ou Bentô Cake. Pedimos pelo menos 48 horas de antecedência.'
        : 'Para brownies e donuts, pedimos pelo menos 24 horas de antecedência.';
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
    // Pix (04/10/2026): ao marcar Pix aparece o quadro com a chave e o botão Copiar; com cartão, só a nota do link
    var pixCheckout = form.querySelector('[data-pix]');
    var cartaoNota = form.querySelector('[data-cartao-nota]');
    function atualizarPagamento() {
      var pag = form.querySelector('[name=pagamento]:checked');
      var ehPix = !!pag && pag.value === 'Pix';
      if (pixCheckout) pixCheckout.hidden = !ehPix;
      if (cartaoNota) cartaoNota.hidden = ehPix;
    }
    form.querySelectorAll('[name=pagamento]').forEach(function (r) { r.addEventListener('change', atualizarPagamento); });
    atualizarPagamento();
    nomeEl.addEventListener('input', function () { if (nomeEl.value.trim().length >= 2) mostrarErro('nome', ''); });
    dataEl.addEventListener('input', function () { if (dataEl.value) mostrarErro('data', ''); });
    horaEl.addEventListener('input', function () { if (horaEl.value) mostrarErro('hora', ''); });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var itens = lerPedido();
      if (!itens.length) return;
      var nome = nomeEl.value.trim();
      // nome, data e horário de retirada são obrigatórios (horário desde 04/10/2026); o primeiro campo com erro recebe o foco
      var primeiroErro = null;
      function exigir(campo, el, valido, msg) {
        mostrarErro(campo, valido ? '' : msg);
        if (!valido && !primeiroErro) primeiroErro = el;
      }
      exigir('nome', nomeEl, nome.length >= 2, 'Informe seu nome para continuar.');
      exigir('data', dataEl, !!dataEl.value, 'Escolha o dia em que gostaria de retirar.');
      exigir('hora', horaEl, !!horaEl.value, 'Informe o horário em que gostaria de retirar.');
      if (primeiroErro) { primeiroErro.focus(); return; }
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
      if (caixa) caixa.hidden = true;
      if (obrigado) {
        obrigado.hidden = false;
        var pixObrigado = obrigado.querySelector('[data-pix]');
        if (pixObrigado) pixObrigado.hidden = dados.pagamento !== 'Pix';
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
        if (caixa) caixa.hidden = false;
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

  /* Botão "Copiar" da chave Pix (04/10/2026): copia, mostra "Copiado!" por um instante e avisa no toast. */
  function copiarFallback(texto) {
    var ta = document.createElement('textarea');
    ta.value = texto; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
  }
  function ligarCopiar() {
    document.querySelectorAll('[data-copiar]').forEach(function (b) {
      var rotulo = b.querySelector('[data-copiar-texto]');
      var original = rotulo ? rotulo.textContent : '';
      var timer = 0;
      b.addEventListener('click', function () {
        var texto = b.dataset.copiar;
        var feito = function () {
          if (rotulo) rotulo.textContent = 'Copiado!';
          b.classList.add('copied');
          toast('Chave Pix copiada.');
          clearTimeout(timer);
          timer = setTimeout(function () { if (rotulo) rotulo.textContent = original; b.classList.remove('copied'); }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(feito, function () { copiarFallback(texto); feito(); });
        else { copiarFallback(texto); feito(); }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    montarFab();
    ligarCopiar();
    iniciarAdicionais();
    document.querySelectorAll('form[data-produto]').forEach(ligarFormulario);
    if (document.querySelector('[data-checkout]')) iniciarCheckout();
    atualizarContadores(lerPedido());
  });
})();
