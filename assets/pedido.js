/* Carrinho local e checkout pelo WhatsApp, sem backend.
   Preços e produtos acompanham as decisões de Jonas, o HTML e, para os
   produtos novos, a planilha de precificação. O pedido fica no localStorage.
   As adaptações em lerPedido preservam pedidos salvos com dados anteriores.
   Histórico das decisões e manutenção: PENDENCIAS.md e README.md. */
(function () {
  'use strict';

  var WHATSAPP = '5548999442988';
  var STORAGE = 'cakesjl-pedido-v2'; // v2 em 04/10/2026: extras com preço fechado
  var PRAZO_NOVOS_H = 24;   // brownies e donuts
  var PRAZO_TORTAS_H = 48;  // tortas, Matilda e Bentô
  var PIX = { chave: 'cakesjlconfeitaria@gmail.com' }; // titular e banco ficam no HTML do quadro

  var CATALOGO = {
    'brownie-cobertura': { nome: 'Brownie com cobertura', preco: 14, grupo: 'novos', opcao: 'Cobertura' },
    'marmitinha': { nome: 'Marmitinha brownie recheada', precos: { com: 24.9, sem: 21.9 }, grupo: 'novos', opcao: 'Recheio' },
    'donuts': { nome: 'Donuts no copinho (6 unidades)', preco: 23, grupo: 'novos', opcao: 'Recheio da tampa' },
    'matilda': { nome: 'Bolo Matilda', grupo: 'tortas' },
    'bento': { nome: 'Bentô Cake', grupo: 'tortas' },
    'torta': { nome: 'Torta', grupo: 'tortas' }
  };
  var TORTA = {
    tamanhos: { P: 'P (aro 15, 15 fatias)', M: 'M (aro 20, 24 fatias)', G: 'G (aro 25, 40 fatias)' },
    linhas: {
      'Clássicos': { P: 159, M: 230, G: 320 },
      'Especiais': { P: 170, M: 270, G: 360 },
      'Premium': { P: 200, M: 300, G: 420 }
    }
  };
  var MATILDA = {
    P: { nome: 'Bolo Matilda (P, aro 15, aprox. 2 kg)', preco: 90, detalhe: 'Tamanho P · aro 15' },
    M: { nome: 'Bolo Matilda (M, aro 20, aprox. 3 kg)', preco: 170, detalhe: 'Tamanho M · aro 20' }
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
    try {
      var p = JSON.parse(localStorage.getItem(STORAGE) || '[]');
      if (!Array.isArray(p)) return [];
      p.forEach(function (item) {
        // Peso corrigido em 13/10/2026, inclusive em pedidos locais anteriores.
        if (item && item.tipo === 'bento' &&
          (item.nome === 'Bentô Cake (aprox. 300 g)' || item.nome === 'Bentô Cake (aprox. 700 g)')) {
          item.nome = 'Bentô Cake (aprox. 500 g)';
        }
        // Rendimento do tamanho P corrigido em 12/10/2026, inclusive em pedidos locais anteriores.
        if (item && item.tipo === 'torta' && item.nome === 'Torta P (aro 15, 12 fatias)') {
          item.nome = 'Torta ' + TORTA.tamanhos.P;
        }
        // Acetato gratuito desde 08/10/2026, inclusive em pedidos locais anteriores.
        if (item && item.tipo === 'torta' && Array.isArray(item.extras)) {
          item.extras.forEach(function (extra) {
            if (extra.nome !== 'Acetato com laço') return;
            if (typeof item.preco === 'number') item.preco -= extra.preco || 0;
            extra.preco = 0;
          });
        }
        if (!item || ['brownie-cobertura', 'marmitinha', 'donuts'].indexOf(item.tipo) === -1 || !Array.isArray(item.detalhes)) return;
        item.detalhes = item.detalhes.map(function (detalhe) {
          return typeof detalhe === 'string'
            ? detalhe.replace('Casadinho (chocolate + Ninho)', 'Dois amores (chocolate + ninho)')
            : detalhe;
        });
        // Antes da escolha de 09/10/2026, toda marmitinha levava morango.
        if (item.tipo === 'marmitinha' && !item.detalhes.some(function (detalhe) {
          return detalhe === 'Com morango' || detalhe === 'Sem morango';
        })) item.detalhes.push('Com morango');
        // Preços por versão, inclusive ao reabrir pedidos locais anteriores.
        if (item.tipo === 'marmitinha') {
          item.preco = CATALOGO.marmitinha.precos[item.detalhes.indexOf('Sem morango') !== -1 ? 'sem' : 'com'];
        }
      });
      return p;
    } catch (_) {
      return [];
    }
  }
  function gravarPedido(itens) {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(itens));
    } catch (_) {}
    atualizarContadores(itens);
  }
  function somaExtras(extras) {
    return (extras || []).reduce(function (t, e) {
      return t + (e.preco || 0);
    }, 0);
  }
  function totalQtd(itens) {
    return itens.reduce(function (n, i) {
      return n + i.qtd;
    }, 0);
  }
  function temTortas(itens) {
    return itens.some(function (i) {
      return CATALOGO[i.tipo] && CATALOGO[i.tipo].grupo === 'tortas';
    });
  }
  function prazoHoras(itens) {
    return temTortas(itens) ? PRAZO_TORTAS_H : PRAZO_NOVOS_H;
  }
  function escapar(t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function uid() {
    return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function iniciarTortaBuilder() {
    var builder = document.querySelector('[data-torta-builder]');
    if (!builder) return;
    var botoes = Array.prototype.slice.call(builder.querySelectorAll('[data-torta-target]'));
    var cards = Array.prototype.slice.call(builder.querySelectorAll('.flavor-card'));
    var hint = builder.querySelector('[data-torta-hint]');
    if (botoes.length !== cards.length || botoes.some(function (botao) {
      return !cards.some(function (card) { return card.id === botao.dataset.tortaTarget; });
    })) return;
    builder.classList.add('enhanced');
    botoes.forEach(function (botao) {
      botao.addEventListener('click', function () {
        var alvo = botao.dataset.tortaTarget;
        botoes.forEach(function (opcao) {
          opcao.setAttribute('aria-pressed', String(opcao === botao));
        });
        cards.forEach(function (card) {
          if (card.id === alvo) card.dataset.active = 'true';
          else delete card.dataset.active;
        });
        if (hint) hint.textContent = 'Você escolheu ' + botao.querySelector('strong').textContent + '. Monte sua torta abaixo.';
      });
    });
  }

  /* ---------- contador fixo e botão "Meu pedido" do canto ---------- */
  function atualizarContadores(itens) {
    var n = totalQtd(itens || lerPedido());
    document.querySelectorAll('[data-pedido-contador]').forEach(function (el) {
      el.textContent = n;
    });
    var fab = document.querySelector('.cart-fab');
    if (fab) fab.hidden = n === 0 || document.body.classList.contains('pedido-page');
    // .cart-link: pílula do canto superior direito (todas as páginas); o número só aparece com itens
    document.querySelectorAll('.cart-link, .nav-pedido').forEach(function (a) {
      a.classList.toggle('has-items', n > 0);
      a.dataset.n = n;
      if (a.classList.contains('cart-link'))
        a.setAttribute('aria-label', 'Meu pedido' + (n > 0 ? ', ' + n + (n === 1 ? ' item' : ' itens') : ', vazio'));
    });
  }
  function montarFab() {
    if (document.body.classList.contains('home')) return;
    if (document.querySelector('.cart-fab')) return;
    var a = document.createElement('a');
    a.className = 'cart-fab';
    a.href = raiz() + 'pedido/index.html';
    a.hidden = true;
    a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 5h2l2 11h11l2-8H6"/><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>Ver pedido <span class="cart-fab-n" data-pedido-contador>0</span>';
    document.body.appendChild(a);
  }
  function acompanharFabNoRodape() {
    var fab = document.querySelector('.cart-fab');
    var linkRodape = document.querySelector('.product-page:not(.pedido-page) .footer-actions .cart-link');
    if (!fab || !linkRodape) return;
    function alternar(proximoDoRodape) {
      fab.classList.toggle('near-footer', proximoDoRodape);
    }
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entradas) {
        alternar(entradas[0].isIntersecting);
      }, { rootMargin: '0px 0px 64px 0px' });
      observer.observe(linkRodape);
    } else {
      function verificar() {
        var area = linkRodape.getBoundingClientRect();
        alternar(area.top <= window.innerHeight + 64 && area.bottom >= 0);
      }
      window.addEventListener('scroll', verificar, { passive: true });
      window.addEventListener('resize', verificar);
      verificar();
    }
  }
  var toastTimer = 0;
  function toast(msg) {
    var t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('show');
    }, 2600);
  }

  /* ---------- formulários de produto ---------- */
  function lerQtd(form) {
    var q = parseInt(form.querySelector('[name=qtd]').value, 10);
    return isNaN(q) || q < 1 ? 1 : Math.min(q, 99);
  }
  /* Escolhas que dependem do sabor (06/10/2026): um campo [data-campo] com
     data-para="<sabor>" e data-formato="Morangos com {v}" (ou "Dois amores,
     massa {v}") aparece quando aquele sabor está marcado. */
  function campoDoSabor(form, valor) {
    var achado = null;
    form.querySelectorAll('[data-campo][data-para]').forEach(function (c) {
      if (c.dataset.para === valor) achado = c;
    });
    return achado;
  }
  function nomeComEscolha(form, valor) {
    var sub = campoDoSabor(form, valor);
    var marcada = sub && sub.querySelector('input:checked');
    return marcada ? sub.dataset.formato.replace('{v}', marcada.value) : valor;
  }
  function montarItem(form) {
    var tipo = form.dataset.produto;
    var base = CATALOGO[tipo];
    var item = {
      uid: uid(),
      tipo: tipo,
      nome: base.nome,
      qtd: lerQtd(form),
      preco: base.preco,
      detalhes: [],
      extras: [],
      obs: ''
    };
    if (tipo === 'brownie-cobertura' || tipo === 'marmitinha' || tipo === 'donuts') {
      // sabor escolhido por botões (radio); Dois amores = chocolate + ninho, mesmo preço
      var saborEscolhido = form.querySelector('[name=sabor]:checked');
      item.detalhes.push(base.opcao + ': ' + (saborEscolhido ? saborEscolhido.value : ''));
      if (tipo === 'marmitinha') {
        var morango = form.querySelector('[name=morango]:checked');
        item.detalhes.push(morango.value === 'com' ? 'Com morango' : 'Sem morango');
        item.preco = CATALOGO.marmitinha.precos[morango.value];
      }
    } else if (tipo === 'matilda') {
      var tamanhoMatilda = form.querySelector('[name=tamanho]:checked').value;
      item.nome = MATILDA[tamanhoMatilda].nome;
      item.preco = MATILDA[tamanhoMatilda].preco;
    } else if (tipo === 'bento') {
      var op = form.querySelector('[name=opcao]:checked').value;
      var saborB = form.querySelector('[name=sabor]:checked');
      var sabor = saborB ? saborB.value : '';
      item.nome = 'Bentô Cake (aprox. 500 g)';
      item.preco = BENTO[op].preco + (sabor === 'Ninho com geleia de morango' ? BENTO.geleia : 0);
      item.detalhes.push(BENTO[op].nome);
      item.detalhes.push('Sabor: ' + sabor +
        (sabor === 'Ninho com geleia de morango' ? ' (+ ' + moeda(BENTO.geleia) + ')' : ''));
      var coberturaB = form.querySelector('[name=cobertura]:checked');
      if (coberturaB) item.detalhes.push('Cobertura: ' + coberturaB.value);
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
        saborT = nomeComEscolha(form, saborT);
      }
      item.nome = 'Torta ' + TORTA.tamanhos[tam];
      item.detalhes.push(saborT + (linha ? ' (' + linha + ')' : ''));
      var coberturaT = form.querySelector('[name=cobertura]:checked');
      if (coberturaT) item.detalhes.push('Cobertura: ' + coberturaT.value);
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
    var dica = 'Veja as ' + caixas.length + ' opções com foto';

    document.body.appendChild(picker);
    picker.classList.add('enhanced');
    picker.hidden = true;
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-modal', 'true');

    function lightboxAberto() {
      return document.body.classList.contains('lightbox-open');
    }
    function focaveis() {
      return Array.prototype.filter.call(picker.querySelectorAll('button, a[href], input'), function (el) {
        return !el.disabled && el.offsetParent !== null;
      });
    }
    function escolhidos() {
      return caixas.filter(function (c) {
        return c.checked;
      }).map(function (c) {
        return { nome: c.value, preco: parseFloat(c.dataset.preco) };
      });
    }
    function atualizarConcluir() {
      var n = caixas.filter(function (c) {
        return c.checked;
      }).length;
      concluir.textContent = n ? 'Concluir (' + n + (n === 1 ? ' escolhido)' : ' escolhidos)') : 'Concluir';
    }
    function resumo(form) {
      var lista = form._adicionais || [];
      var el = form.querySelector('[data-addons-summary]');
      var acao = form.querySelector('[data-addons-action]');
      var botao = form.querySelector('[data-addons-open]');
      if (!el) return;
      if (lista.length) {
        el.innerHTML = '<strong>' + lista.length +
          (lista.length === 1 ? ' escolhido' : ' escolhidos') +
          (somaExtras(lista) === 0 ? ' · Grátis' : ' · + ' + moeda(somaExtras(lista)).replace(' ', '\u00a0')) + '</strong><small>' +
          escapar(lista.map(function (a) {
            return a.nome;
          }).join(', ')) + '</small>';
        if (acao) acao.textContent = 'Alterar';
      } else {
        el.innerHTML = '<strong>Nenhum adicional escolhido</strong><small>' + escapar(dica) + '</small>';
        if (acao) acao.textContent = 'Ver opções';
      }
      if (botao) botao.classList.toggle('has-addons', lista.length > 0);
      if (form._atualizarPrevia) form._atualizarPrevia();
    }
    function abrir(form, botao) {
      formAtivo = form;
      origem = botao;
      var marcados = (form._adicionais || []).map(function (a) {
        return a.nome;
      });
      caixas.forEach(function (c) {
        c.checked = marcados.indexOf(c.value) > -1;
      });
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
        if (!guardar) caixas.forEach(function (c) {
          c.checked = false;
        });
        formAtivo._adicionais = escolhidos();
        resumo(formAtivo);
      }
      picker.hidden = true;
      document.body.classList.remove('picker-open');
      if (painel && 'inert' in painel) painel.inert = false;
      if (origem) origem.focus();
      formAtivo = null;
      origem = null;
    }
    caixas.forEach(function (c) {
      c.addEventListener('change', atualizarConcluir);
    });
    concluir.addEventListener('click', function () { encerrar(true); });
    nenhum.addEventListener('click', function () { encerrar(false); });
    fechar.addEventListener('click', function () { encerrar(true); });
    picker.addEventListener('click', function (event) {
      if (event.target === picker) encerrar(true);
    });
    document.addEventListener('keydown', function (event) {
      // o popup de foto (site.js) trata o Esc antes e marca o evento; nesse caso só ele fecha
      if (picker.hidden || lightboxAberto() || event.defaultPrevented) return;
      if (event.key === 'Escape') { event.preventDefault(); encerrar(true); return; }
      if (event.key !== 'Tab') return;
      var lista = focaveis();
      if (!lista.length) return;
      var primeiro = lista[0], ultimo = lista[lista.length - 1];
      if (event.shiftKey && (document.activeElement === primeiro || !picker.contains(document.activeElement))) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && (document.activeElement === ultimo || !picker.contains(document.activeElement))) {
        event.preventDefault();
        primeiro.focus();
      }
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
  /* ---------- popup de sabores e recheios ----------
     Os botões de sabor (radio name=sabor, e name=morangos nos Especiais)
     continuam no formulário e guardam a escolha; com JavaScript eles ficam
     escondidos e o card mostra o sabor escolhido num botão que abre este popup
     com a lista (nome e, quando houver, a descrição em <small> no HTML).
     Tocar num sabor já escolhe; "Concluir", X, toque fora e Esc fecham. */
  var abrirSabores = null;
  var ICONE_SETA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
  function partesDoSabor(input) {
    // Nome vem do <span>; descrição, ingredientes ou preço extra vêm do <small>.
    var span = input.parentNode.querySelector('span');
    var nome = '', desc = '';
    if (span) {
      Array.prototype.forEach.call(span.childNodes, function (n) {
        if (n.nodeType === 3) nome += n.textContent;
        else if (n.tagName === 'SMALL') desc = n.textContent;
        else nome += n.textContent;
      });
    }
    return { nome: nome.trim() || input.value, desc: desc.trim() };
  }
  function nomeEscolhido(form) {
    var r = form.querySelector('.flavor-field [name=sabor]:checked');
    if (!r) return '';
    var sub = campoDoSabor(form, r.value);
    if (sub && !sub.querySelector('input:checked')) return partesDoSabor(r).nome + ' · escolha uma opção';
    return sub ? nomeComEscolha(form, r.value) : partesDoSabor(r).nome;
  }
  function iniciarSabores() {
    if (!document.querySelector('.flavor-field')) return;
    var picker = document.createElement('section');
    picker.className = 'addons-picker enhanced flavor-picker';
    picker.hidden = true;
    picker.setAttribute('data-flavor-picker', '');
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-modal', 'true');
    picker.setAttribute('aria-labelledby', 'sabores-titulo');
    picker.innerHTML =
      '<div class="addons-box"><header class="addons-head"><div><h2 id="sabores-titulo"></h2><p data-sabores-sub></p></div>' +
      '<button type="button" class="addons-close" data-sabores-fechar aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>' +
      '<div class="flavor-options" role="radiogroup" aria-labelledby="sabores-titulo" data-sabores-lista></div>' +
      '<footer class="addons-foot"><button type="button" class="button" data-sabores-ok>Concluir</button></footer></div>';
    document.body.appendChild(picker);
    var caixa = picker.querySelector('.addons-box');
    var titulo = picker.querySelector('#sabores-titulo');
    var sub = picker.querySelector('[data-sabores-sub]');
    var lista = picker.querySelector('[data-sabores-lista]');
    var ok = picker.querySelector('[data-sabores-ok]');
    var fechar = picker.querySelector('[data-sabores-fechar]');
    var painel = document.querySelector('.panel');
    var formAtivo = null, origem = null;

    function atualizarOk() {
      ok.textContent = 'Concluir';
    }
    function marcarNoForm(nome, valor) {
      var r = formAtivo.querySelector('[name="' + nome + '"][value="' + valor.replace(/"/g, '\\"') + '"]');
      if (!r) return;
      r.checked = true;
      r.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function montarLista(form) {
      lista.innerHTML = '';
      var radios = form.querySelectorAll('.flavor-field [name=sabor]');
      Array.prototype.forEach.call(radios, function (r, i) {
        var partes = partesDoSabor(r);
        var item = document.createElement('div');
        item.className = 'flavor-option';
        item.innerHTML = '<label class="flavor-pick"><input type="radio" name="sabor-popup"><span class="flavor-pick-text"><strong></strong>' +
          (partes.desc ? '<small></small>' : '') + '</span><span class="pick-dot" aria-hidden="true"></span></label>';
        var input = item.querySelector('input');
        input.value = r.value;
        input.checked = r.checked;
        item.querySelector('strong').textContent = partes.nome;
        if (partes.desc) item.querySelector('small').textContent = partes.desc;
        input.addEventListener('change', function () {
          marcarNoForm('sabor', r.value);
          atualizarSub();
          atualizarOk();
        });
        var sub = campoDoSabor(form, r.value);
        if (sub) {
          var nomeCampo = sub.dataset.campo;
          var rotulo = sub.querySelector('.field-label');
          var bloco = document.createElement('div');
          bloco.className = 'flavor-sub';
          bloco.setAttribute('data-sabores-sub', r.value);
          bloco.innerHTML =
            '<span class="field-label" id="sabores-sub-' + i + '"></span><div class="choice-grid" role="radiogroup" aria-labelledby="sabores-sub-' + i + '"></div>' +
            '<small class="field-error" data-sub-erro hidden>Escolha uma opção.</small>';
          bloco.querySelector('.field-label').textContent = rotulo ? rotulo.textContent : '';
          var grade = bloco.querySelector('.choice-grid');
          var aviso = bloco.querySelector('[data-sub-erro]');
          sub.querySelectorAll('input[name="' + nomeCampo + '"]').forEach(function (c) {
            var l = document.createElement('label');
            l.innerHTML = '<input type="radio"><span></span>';
            var ci = l.querySelector('input');
            ci.name = nomeCampo + '-popup';
            ci.value = c.value;
            ci.checked = c.checked;
            var texto = c.parentNode.querySelector('span');
            l.querySelector('span').textContent = texto ? texto.textContent : c.value;
            ci.addEventListener('change', function () {
              marcarNoForm(nomeCampo, c.value);
              aviso.hidden = true;
              atualizarOk();
            });
            grade.appendChild(l);
          });
          item.appendChild(bloco);
        }
        lista.appendChild(item);
      });
      atualizarSub();
    }
    function atualizarSub() {
      var m = formAtivo.querySelector('.flavor-field [name=sabor]:checked');
      lista.querySelectorAll('[data-sabores-sub]').forEach(function (bloco) {
        bloco.hidden = !(m && m.value === bloco.getAttribute('data-sabores-sub'));
      });
    }
    function focaveis() {
      return Array.prototype.filter.call(picker.querySelectorAll('button, input'), function (el) {
        return !el.disabled && el.offsetParent !== null && (el.type !== 'radio' || el.checked);
      });
    }
    function abrir(form, botao, focarSub) {
      formAtivo = form;
      origem = botao;
      var campo = form.querySelector('.flavor-field');
      var nome = form.dataset.linha ? 'Sabores ' + form.dataset.linha : 'Sabores do Bentô Cake';
      titulo.textContent = campo.dataset.saborTitulo || nome;
      sub.textContent = campo.dataset.saborSubtitulo || (form.dataset.produto === 'bento'
        ? 'Escolha o sabor do seu Bentô Cake.'
        : 'Escolha o sabor da sua torta.');
      montarLista(form);
      atualizarOk();
      picker.hidden = false;
      caixa.scrollTop = 0;
      document.body.classList.add('picker-open');
      if (painel && 'inert' in painel) painel.inert = true;
      var marcado = lista.querySelector('[name=sabor-popup]:checked');
      var alvo = marcado || fechar;
      if (focarSub) {
        var bloco = lista.querySelector('.flavor-sub:not([hidden])');
        if (bloco) {
          bloco.querySelector('[data-sub-erro]').hidden = false;
          alvo = bloco.querySelector('input') || alvo;
        }
      }
      alvo.focus({ preventScroll: true });
    }
    function encerrar() {
      if (picker.hidden) return;
      picker.hidden = true;
      document.body.classList.remove('picker-open');
      if (painel && 'inert' in painel) painel.inert = false;
      if (formAtivo && formAtivo._resumoSabor) formAtivo._resumoSabor();
      if (origem) origem.focus();
      formAtivo = null;
      origem = null;
    }
    ok.addEventListener('click', encerrar);
    fechar.addEventListener('click', encerrar);
    picker.addEventListener('click', function (event) {
      if (event.target === picker) encerrar();
    });
    document.addEventListener('keydown', function (event) {
      if (picker.hidden || event.defaultPrevented) return;
      if (event.key === 'Escape') { event.preventDefault(); encerrar(); return; }
      if (event.key !== 'Tab') return;
      var itens = focaveis();
      if (!itens.length) return;
      var primeiro = itens[0], ultimo = itens[itens.length - 1];
      if (event.shiftKey && (document.activeElement === primeiro || !picker.contains(document.activeElement))) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && (document.activeElement === ultimo || !picker.contains(document.activeElement))) {
        event.preventDefault();
        primeiro.focus();
      }
    });
    abrirSabores = abrir;
  }
  function ligarSabor(form) {
    var campo = form.querySelector('.flavor-field');
    if (!campo || !abrirSabores) return;
    var total = campo.querySelectorAll('[name=sabor]').length;
    var botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'flavor-trigger';
    botao.setAttribute('aria-haspopup', 'dialog');
    botao.innerHTML =
      '<span class="flavor-summary"><strong></strong><small></small></span><span class="flavor-action">' + total + ' sabores</span>' + ICONE_SETA;
    var forte = botao.querySelector('strong');
    var detalhe = botao.querySelector('small');
    form._resumoSabor = function () {
      var r = campo.querySelector('[name=sabor]:checked');
      var partes = r ? partesDoSabor(r) : { nome: '', desc: '' };
      var nome = nomeEscolhido(form) || 'Escolha uma opção';
      forte.textContent = nome;
      detalhe.textContent = partes.desc;
      detalhe.hidden = !partes.desc;
      botao.classList.toggle('has-desc', !detalhe.hidden);
      botao.setAttribute('aria-label', (campo.dataset.saborRotulo || 'Sabor') + ': ' + nome + '. Ver os ' + total + ' sabores');
    };
    form._resumoSabor();
    botao.addEventListener('click', function () { abrirSabores(form, botao); });
    var rotulo = campo.querySelector('.field-label');
    if (rotulo && rotulo.nextSibling) campo.insertBefore(botao, rotulo.nextSibling); else campo.appendChild(botao);
    campo.classList.add('enhanced');
  }

  function ligarValidacaoSabor(form) {
    var radios = form.querySelectorAll('[name=sabor]');
    if (!radios.length) return;
    var campo = radios[0].closest('.field');
    var botao = campo.querySelector('.flavor-trigger');
    var dica = campo.querySelector('[data-sabor-dica]');
    var erro = document.createElement('small');
    erro.className = 'field-error';
    erro.id = 'erro-sabor-' + Array.prototype.indexOf.call(document.querySelectorAll('form[data-produto]'), form);
    erro.textContent = 'Escolha uma opção antes de adicionar ao pedido.';
    erro.hidden = true;
    campo.appendChild(erro);
    (botao || radios[0]).setAttribute('aria-describedby', erro.id);

    function atualizar() {
      var escolhido = form.querySelector('[name=sabor]:checked');
      var sub = escolhido && campoDoSabor(form, escolhido.value);
      if (dica) dica.hidden = !!escolhido;
      if (escolhido && (!sub || sub.querySelector('input:checked'))) {
        erro.hidden = true;
        (botao || radios[0]).removeAttribute('aria-invalid');
      }
    }
    form.addEventListener('change', atualizar);
    atualizar();
    form._saborOk = function () {
      var escolhido = form.querySelector('[name=sabor]:checked');
      var sub = escolhido && campoDoSabor(form, escolhido.value);
      if (escolhido && (!sub || sub.querySelector('input:checked'))) return true;
      erro.textContent = escolhido
        ? 'Escolha uma opção para completar este sabor.'
        : 'Escolha uma opção antes de adicionar ao pedido.';
      erro.hidden = false;
      (botao || radios[0]).setAttribute('aria-invalid', 'true');
      campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (botao) abrirSabores(form, botao, !!escolhido);
      else radios[0].focus({ preventScroll: true });
      return false;
    };
  }

  var abrirCoberturas = null;
  function iniciarCoberturas() {
    if (!document.querySelector('[data-cobertura-campo]')) return;
    var picker = document.createElement('section');
    picker.className = 'addons-picker enhanced flavor-picker cobertura-picker';
    picker.hidden = true;
    picker.setAttribute('data-cobertura-picker', '');
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-modal', 'true');
    picker.setAttribute('aria-labelledby', 'coberturas-titulo');
    picker.innerHTML =
      '<div class="addons-box"><header class="addons-head"><div><h2 id="coberturas-titulo"></h2><p data-coberturas-sub></p></div>' +
      '<button type="button" class="addons-close" data-coberturas-fechar aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>' +
      '<div class="flavor-options" role="radiogroup" aria-labelledby="coberturas-titulo" data-coberturas-lista></div>' +
      '<footer class="addons-foot"><button type="button" class="button" data-coberturas-ok>Concluir</button></footer></div>';
    document.body.appendChild(picker);
    var caixa = picker.querySelector('.addons-box');
    var titulo = picker.querySelector('#coberturas-titulo');
    var sub = picker.querySelector('[data-coberturas-sub]');
    var lista = picker.querySelector('[data-coberturas-lista]');
    var fechar = picker.querySelector('[data-coberturas-fechar]');
    var painel = document.querySelector('.panel');
    var formAtivo = null, origem = null;

    function montarLista(form) {
      lista.innerHTML = '';
      form.querySelectorAll('[data-cobertura-opcoes] [name=cobertura]').forEach(function (radio) {
        var rotulo = ROTULO_COBERTURA[radio.value] || [radio.value, ''];
        var item = document.createElement('div');
        item.className = 'flavor-option';
        item.innerHTML = '<label class="flavor-pick"><input type="radio" name="cobertura-popup"><span class="flavor-pick-text"><strong></strong>' +
          (rotulo[1] ? '<small></small>' : '') + '</span><span class="pick-dot" aria-hidden="true"></span></label>';
        var input = item.querySelector('input');
        input.value = radio.value;
        input.checked = radio.checked;
        item.querySelector('strong').textContent = rotulo[0];
        if (rotulo[1]) item.querySelector('small').textContent = rotulo[1];
        input.addEventListener('change', function () {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        });
        lista.appendChild(item);
      });
    }
    function focaveis() {
      return Array.prototype.filter.call(picker.querySelectorAll('button, input'), function (el) {
        return !el.disabled && el.offsetParent !== null && (el.type !== 'radio' || el.checked);
      });
    }
    function abrir(form, botao) {
      formAtivo = form;
      origem = botao;
      titulo.textContent = form.dataset.produto === 'bento' ? 'Cobertura do Bentô Cake' : 'Cobertura da torta';
      sub.textContent = 'Escolha a camada que vai em cima e nos lados.';
      montarLista(form);
      picker.hidden = false;
      caixa.scrollTop = 0;
      document.body.classList.add('picker-open');
      if (painel && 'inert' in painel) painel.inert = true;
      var marcado = lista.querySelector('[name=cobertura-popup]:checked');
      (marcado || fechar).focus({ preventScroll: true });
    }
    function encerrar() {
      if (picker.hidden) return;
      picker.hidden = true;
      document.body.classList.remove('picker-open');
      if (painel && 'inert' in painel) painel.inert = false;
      if (formAtivo && formAtivo._resumoCobertura) formAtivo._resumoCobertura();
      if (origem) origem.focus();
      formAtivo = null;
      origem = null;
    }
    picker.querySelector('[data-coberturas-ok]').addEventListener('click', encerrar);
    fechar.addEventListener('click', encerrar);
    picker.addEventListener('click', function (event) {
      if (event.target === picker) encerrar();
    });
    document.addEventListener('keydown', function (event) {
      if (picker.hidden || event.defaultPrevented) return;
      if (event.key === 'Escape') { event.preventDefault(); encerrar(); return; }
      if (event.key !== 'Tab') return;
      var itens = focaveis();
      if (!itens.length) return;
      var primeiro = itens[0], ultimo = itens[itens.length - 1];
      if (event.shiftKey && (document.activeElement === primeiro || !picker.contains(document.activeElement))) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && (document.activeElement === ultimo || !picker.contains(document.activeElement))) {
        event.preventDefault();
        primeiro.focus();
      }
    });
    abrirCoberturas = abrir;
  }

  /* Cobertura das tortas e do Bentô (06/10/2026, decisão de Jonas com a Larissa):
     Chantilly sempre; além dele, o recheio mais barato que o sabor tiver
     (Ninho ou chocolate 50% cacau, em data-cobertura). Nenhuma cobertura
     começa marcada, inclusive quando só há Chantilly; o cliente precisa
     escolher antes de adicionar. No card "Outro sabor", Chantilly ou
     "Recheio (a combinar)". Trocar o sabor limpa a escolha anterior. */
  var ROTULO_COBERTURA = {
    'Chantilly': ['Chantilly', ''],
    'Chocolate 50% cacau': ['Chocolate', '50% cacau'],
    'Ninho': ['Ninho', ''],
    'Recheio (a combinar)': ['Recheio', 'combinamos qual']
  };
  function opcoesDeCobertura(form, campo) {
    if (campo.dataset.coberturaOutro) return ['Chantilly', 'Recheio (a combinar)'];
    var r = form.querySelector('.flavor-field [name=sabor]:checked');
    var lista = r ? (r.dataset.cobertura || '') : '';
    if (lista === 'creme') {
      var sub = campoDoSabor(form, r.value);
      var c = sub && sub.querySelector('input:checked');
      lista = c ? (c.dataset.cobertura || '') : '';
    }
    return ['Chantilly'].concat(lista ? lista.split('|') : []);
  }
  function ligarCobertura(form) {
    var campo = form.querySelector('[data-cobertura-campo]');
    if (!campo) return;
    var grade = campo.querySelector('[data-cobertura-opcoes]');
    var dica = campo.querySelector('[data-cobertura-dica]');
    var erro = campo.querySelector('[data-cobertura-erro]');
    var base = dica ? dica.textContent : '';
    var botao = null;
    grade.setAttribute('role', 'radiogroup');
    grade.setAttribute('aria-label', 'Cobertura');
    function desenhar() {
      var opcoes = opcoesDeCobertura(form, campo);
      // Só mantém uma escolha feita pelo cliente para o sabor atual.
      var atual = campo._escolhida || '';
      grade.innerHTML = '';
      grade.className = 'choice-grid' + (opcoes.length === 1 ? ' one' : opcoes.length === 2 ? ' two' : '');
      opcoes.forEach(function (v) {
        var l = document.createElement('label');
        l.innerHTML = '<input type="radio" name="cobertura"><span></span>';
        var input = l.querySelector('input');
        input.value = v;
        input.checked = v === atual;
        var rotulo = ROTULO_COBERTURA[v] || [v, ''];
        var span = l.querySelector('span');
        span.textContent = rotulo[0];
        if (rotulo[1]) { var sm = document.createElement('small'); sm.textContent = rotulo[1]; span.appendChild(sm); }
        input.addEventListener('change', function () {
          campo._escolhida = v;
          if (erro) erro.hidden = true;
          if (botao) botao.removeAttribute('aria-invalid');
          if (form._resumoCobertura) form._resumoCobertura();
        });
        grade.appendChild(l);
      });
      if (dica) dica.textContent = base;
      if (form._resumoCobertura) form._resumoCobertura();
    }
    form.addEventListener('change', function (event) {
      var t = event.target;
      if (t.name === 'sabor' || (t.closest && t.closest('[data-campo]'))) {
        campo._escolhida = '';
        desenhar();
      }
    });
    form._coberturaOk = function () {
      if (form.querySelector('[name=cobertura]:checked')) return true;
      if (erro) erro.hidden = false;
      if (botao) botao.setAttribute('aria-invalid', 'true');
      campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (botao) abrirCoberturas(form, botao);
      else {
        var primeiro = grade.querySelector('input');
        if (primeiro) primeiro.focus({ preventScroll: true });
      }
      return false;
    };
    desenhar();
    if (!abrirCoberturas) return;
    botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'flavor-trigger';
    botao.setAttribute('aria-haspopup', 'dialog');
    botao.innerHTML =
      '<span class="flavor-summary"><strong></strong><small></small></span><span class="flavor-action"></span>' + ICONE_SETA;
    var forte = botao.querySelector('strong');
    var detalhe = botao.querySelector('small');
    var acao = botao.querySelector('.flavor-action');
    form._resumoCobertura = function () {
      var marcada = grade.querySelector('[name=cobertura]:checked');
      var rotulo = marcada ? (ROTULO_COBERTURA[marcada.value] || [marcada.value, '']) : ['Escolha uma opção', ''];
      var total = grade.querySelectorAll('[name=cobertura]').length;
      forte.textContent = rotulo[0];
      detalhe.textContent = rotulo[1];
      detalhe.hidden = !rotulo[1];
      botao.classList.toggle('has-desc', !detalhe.hidden);
      acao.textContent = total + (total === 1 ? ' opção' : ' opções');
      botao.setAttribute('aria-label', 'Cobertura: ' + rotulo[0] + '. Ver ' +
        (total === 1 ? 'a opção' : 'as ' + total + ' opções'));
    };
    form._resumoCobertura();
    botao.addEventListener('click', function () { abrirCoberturas(form, botao); });
    if (erro) {
      erro.id = 'erro-cobertura-' + Array.prototype.indexOf.call(document.querySelectorAll('form[data-produto]'), form);
      botao.setAttribute('aria-describedby', erro.id);
    }
    campo.insertBefore(botao, grade);
    campo.classList.add('enhanced');
  }

  /* Faixa "Preço final" (04/10/2026): valor unitário × quantidade e uma linha de
     detalhe ("2× tamanho M · 2 adicionais"). unit == null mostra "Valor a combinar". */
  function mostrarPrevia(form, unit, detalhe, pendencia) {
    var el = form.querySelector('[data-previa]');
    if (!el) return;
    var valor = el.querySelector('[data-previa-valor]');
    var det = el.querySelector('[data-previa-detalhe]');
    var q = lerQtd(form);
    var prefixo = q > 1 ? q + '× ' : '';
    if (unit == null) {
      el.classList.add('is-open');
      if (valor) valor.textContent = pendencia || 'Valor a combinar';
    } else {
      el.classList.remove('is-open');
      if (valor) valor.textContent = moeda(unit * q);
    }
    if (det) det.textContent = prefixo + (detalhe || '');
  }
  function textoAdicionais(lista) {
    if (!lista || !lista.length) return '';
    return ' · ' + lista.length + (lista.length === 1 ? ' adicional' : ' adicionais') + (somaExtras(lista) === 0 ? ' (grátis)' : ' (+ ' + moeda(somaExtras(lista)) + ')');
  }
  function ligarEscolhaObrigatoria(form, nome, mensagem) {
    var radios = form.querySelectorAll('[name=' + nome + ']');
    if (!radios.length) return null;
    var campo = radios[0].closest('.field');
    var grade = campo.querySelector('.size-grid, .bento-options, .choice-grid');
    var erro = document.createElement('small');
    erro.className = 'field-error js-only';
    erro.id = 'erro-' + nome + '-' + Array.prototype.indexOf.call(document.querySelectorAll('form[data-produto]'), form);
    erro.textContent = mensagem;
    erro.hidden = true;
    campo.appendChild(erro);
    grade.setAttribute('role', 'radiogroup');
    grade.setAttribute('aria-label', nome === 'tamanho' ? 'Tamanho' : nome === 'morango' ? 'Morango' : 'Opção do Bentô Cake');
    grade.setAttribute('aria-required', 'true');
    radios.forEach(function (r) {
      r.setAttribute('aria-describedby', erro.id);
      r.addEventListener('change', function () {
        erro.hidden = true;
        radios.forEach(function (opcao) { opcao.removeAttribute('aria-invalid'); });
      });
    });
    return function () {
      if (form.querySelector('[name=' + nome + ']:checked')) return true;
      erro.hidden = false;
      radios.forEach(function (r) { r.setAttribute('aria-invalid', 'true'); });
      campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      radios[0].focus({ preventScroll: true });
      return false;
    };
  }
  function ligarFormulario(form) {
    var qtd = form.querySelector('[name=qtd]');
    var tipo = form.dataset.produto;
    var tamanhoOk = ligarEscolhaObrigatoria(form, 'tamanho', 'Escolha o tamanho antes de adicionar ao pedido.');
    var opcaoOk = ligarEscolhaObrigatoria(form, 'opcao', 'Escolha uma opção de Bentô Cake antes de adicionar ao pedido.');
    var morangoOk = tipo === 'marmitinha'
      ? ligarEscolhaObrigatoria(form, 'morango', 'Escolha com ou sem morango antes de adicionar ao pedido.')
      : null;
    var aoMudarQtd = function () {
      if (form._atualizarPrevia) form._atualizarPrevia();
    };
    form.querySelectorAll('[data-menos]').forEach(function (b) {
      b.addEventListener('click', function () {
        qtd.value = Math.max(1, (parseInt(qtd.value, 10) || 1) - 1);
        aoMudarQtd();
      });
    });
    form.querySelectorAll('[data-mais]').forEach(function (b) {
      b.addEventListener('click', function () {
        qtd.value = Math.min(99, (parseInt(qtd.value, 10) || 1) + 1);
        aoMudarQtd();
      });
    });
    qtd.addEventListener('input', aoMudarQtd);
    qtd.addEventListener('change', aoMudarQtd);
    if (tipo === 'brownie-cobertura' || tipo === 'marmitinha' || tipo === 'donuts') {
      form._atualizarPrevia = function () {
        var s = form.querySelector('[name=sabor]:checked');
        var morango = tipo === 'marmitinha' && form.querySelector('[name=morango]:checked');
        var preco = CATALOGO[tipo].preco;
        if (tipo === 'marmitinha') {
          if (!morango) {
            mostrarPrevia(form, null, 'Escolha com ou sem morango', 'Selecione uma opção');
            return;
          }
          preco = CATALOGO.marmitinha.precos[morango.value];
        }
        var detalhe = s ? CATALOGO[tipo].opcao + ': ' + s.value : '';
        if (morango) detalhe += (detalhe ? ' · ' : '') + (morango.value === 'com' ? 'Com morango' : 'Sem morango');
        mostrarPrevia(form, preco, detalhe);
      };
      form.querySelectorAll('[name=sabor],[name=morango]').forEach(function (r) {
        r.addEventListener('change', form._atualizarPrevia);
      });
      form._atualizarPrevia();
    }
    if (tipo === 'matilda') {
      form._atualizarPrevia = function () {
        var tamanho = form.querySelector('[name=tamanho]:checked');
        if (!tamanho) mostrarPrevia(form, null, 'Escolha o tamanho', 'Selecione o tamanho');
        else mostrarPrevia(form, MATILDA[tamanho.value].preco, MATILDA[tamanho.value].detalhe);
      };
      form.querySelectorAll('[name=tamanho]').forEach(function (r) {
        r.addEventListener('change', form._atualizarPrevia);
      });
      form._atualizarPrevia();
    }
    ligarSabor(form);
    if (tipo === 'torta' || tipo === 'bento') {
      ligarCobertura(form);
    }
    ligarValidacaoSabor(form);
    if (tipo === 'torta') {
      // tamanho e sabor por botões; a faixa mostra tamanho × quantidade mais os adicionais (ou "a combinar" no card de outro sabor)
      var linhaT = form.dataset.linha || '';
      form._atualizarPrevia = function () {
        var sabor = form.querySelector('[name=sabor]:checked');
        var tam = form.querySelector('[name=tamanho]:checked');
        form.querySelectorAll('[data-campo][data-para]').forEach(function (c) {
          c.hidden = !(sabor && sabor.value === c.dataset.para);
        });
        var extras = form._adicionais || [];
        var detalhe = (tam ? 'tamanho ' + tam.value : 'Escolha o tamanho') + textoAdicionais(extras);
        if (!tam) mostrarPrevia(form, null, detalhe, 'Selecione o tamanho');
        else if (!linhaT || !TORTA.linhas[linhaT]) mostrarPrevia(form, null, detalhe);
        else mostrarPrevia(form, TORTA.linhas[linhaT][tam.value] + somaExtras(extras), detalhe);
      };
      form.querySelectorAll('[name=tamanho],[name=sabor]').forEach(function (r) {
        r.addEventListener('change', form._atualizarPrevia);
      });
      form._atualizarPrevia();
      var botaoAdicionais = form.querySelector('[data-addons-open]');
      if (botaoAdicionais) botaoAdicionais.addEventListener('click', function () {
        if (abrirAdicionais) abrirAdicionais(form, botaoAdicionais);
      });
    }
    if (tipo === 'bento') {
      form._atualizarPrevia = function () {
        var op = form.querySelector('[name=opcao]:checked');
        var sb = form.querySelector('[name=sabor]:checked');
        if (!op) {
          mostrarPrevia(form, null, '', 'Selecione uma opção');
          return;
        }
        var geleia = sb && sb.value === 'Ninho com geleia de morango';
        mostrarPrevia(
          form,
          BENTO[op.value].preco + (geleia ? BENTO.geleia : 0),
          (op.value === 'flork' ? 'Flork' : 'Laços') + (sb ? ' · ' + sb.value : '')
        );
      };
      form.querySelectorAll('[name=opcao],[name=sabor]').forEach(function (el) {
        el.addEventListener('change', form._atualizarPrevia);
      });
      form._atualizarPrevia();
    }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (opcaoOk && !opcaoOk()) return;
      if (form._saborOk && !form._saborOk()) return;
      if (morangoOk && !morangoOk()) return;
      if (tamanhoOk && !tamanhoOk()) return;
      if (form._coberturaOk && !form._coberturaOk()) return; // cobertura obrigatória nas tortas e no Bentô (06/10/2026)
      var item = montarItem(form);
      var itens = lerPedido();
      itens.push(item);
      gravarPedido(itens);
      toast('Adicionado ao seu pedido: ' + item.qtd + '× ' + item.nome);
      var fab = document.querySelector('.cart-fab');
      if (fab) {
        fab.classList.add('pulse');
        setTimeout(function () {
          fab.classList.remove('pulse');
        }, 700);
      }
      // a pílula "Meu pedido" do canto pulsa ao receber um item (04/10/2026)
      document.querySelectorAll('.cart-link').forEach(function (a) {
        a.classList.remove('bump');
        void a.offsetWidth;
        a.classList.add('bump');
        setTimeout(function () {
          a.classList.remove('bump');
        }, 600);
      });
    });
    form.classList.add('enhanced');
  }

  /* ---------- checkout ---------- */
  function resumoPedido(itens) {
    var resumo = { definidos: [], combinar: [], total: 0 };
    itens.forEach(function (item) {
      if (item.preco == null) resumo.combinar.push(item);
      else {
        resumo.definidos.push(item);
        resumo.total += item.preco * item.qtd;
      }
    });
    return resumo;
  }
  function gruposPedido(resumo) {
    return resumo.combinar.length ? [
      { titulo: 'Produtos com preço definido', itens: resumo.definidos },
      { titulo: 'Produtos com valor a combinar', itens: resumo.combinar }
    ] : [{ titulo: '', itens: resumo.definidos }];
  }
  function textoMensagem(itens, dados) {
    var linhas = [
      'Olá! Montei meu pedido no site da Cakes JL e gostaria de confirmar os detalhes.',
      '',
      'Nome: ' + dados.nome,
      '',
      'Pedido:'
    ];
    var resumo = resumoPedido(itens);
    var aCombinar = resumo.combinar.length > 0;
    var entrega = dados.recebimento === 'entrega';
    var pendente = aCombinar || entrega;
    var numero = 0;
    gruposPedido(resumo).forEach(function (grupo) {
      if (!grupo.itens.length) return;
      if (grupo.titulo) linhas.push('', '*' + grupo.titulo + '*');
      grupo.itens.forEach(function (i) {
        linhas.push('');
        // WhatsApp usa um asterisco de cada lado para o negrito.
        linhas.push((++numero) + ') *' + i.qtd + '× ' + i.nome + '*');
        i.detalhes.forEach(function (detalhe, indice) {
          if (i.tipo === 'torta' && indice === 0 && detalhe.indexOf('Outro sabor:') !== 0) {
            linhas.push('Sabor: ' + detalhe);
          } else if (i.tipo === 'bento' && indice === 0) {
            linhas.push('Modelo: ' + detalhe);
          } else {
            linhas.push(detalhe);
          }
        });
        if (i.extras.length) {
          linhas.push('Adicionais por torta' + (i.preco == null ? ':' : ' (já incluídos no valor):'));
          i.extras.forEach(function (extra) {
            linhas.push('- ' + extra.nome + ' (' + (extra.preco === 0 ? 'Grátis' : moeda(extra.preco)) + ')');
          });
        }
        if (i.obs) linhas.push(i.obs);
        if (i.preco == null) {
          linhas.push('Subtotal: a combinar');
        } else {
          linhas.push(i.qtd > 1
            ? 'Subtotal: ' + i.qtd + ' × ' + moeda(i.preco) + ' = ' + moeda(i.preco * i.qtd)
            : 'Valor: ' + moeda(i.preco));
        }
      });
    });
    linhas.push('');
    if (resumo.definidos.length) linhas.push('*' +
      (aCombinar ? 'Subtotal dos produtos com preço definido: ' : 'Total dos produtos: ') + moeda(resumo.total) + '*');
    if (aCombinar) linhas.push('Os produtos com valor a combinar serão acertados e finalizados pelo WhatsApp.');
    if (entrega) {
      linhas.push('Taxa de entrega: valor a combinar');
    }
    if (pendente) {
      linhas.push('*' + (entrega ? 'Total com entrega' : 'Total do pedido') + ': a confirmar pelo WhatsApp*');
      linhas.push('Sinal de 50%: a calcular sobre o valor final do pedido' +
        (entrega ? ', incluindo a taxa de entrega' : ''));
    } else {
      linhas.push('Sinal de 50%: ' + moeda(resumo.total / 2));
    }
    linhas.push('Restante: pago na ' + (entrega ? 'entrega' : 'retirada'));
    linhas.push('');
    linhas.push('Recebimento: ' + (dados.recebimento === 'entrega' ? 'Entrega' : 'Retirada'));
    linhas.push((dados.recebimento === 'entrega' ? 'Entrega desejada: ' : 'Retirada desejada: ') +
      dados.data + (dados.hora ? ', ' + dados.hora : '') + ' (a confirmar)');
    linhas.push('Pagamento do sinal: ' + dados.pagamento);
    if (dados.pagamento === 'Pix' && !pendente) linhas.push('Chave Pix: ' + PIX.chave);
    if (dados.obs) {
      linhas.push('');
      linhas.push('Observações: ' + dados.obs);
    }
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
    // Retirada e entrega usam o horário de Gravatal, mesmo em aparelhos de outro fuso.
    var formatoRetirada = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
    function limiteRetirada(horas) {
      // O campo aceita minutos: arredondar para cima preserva as horas completas.
      var minima = new Date(Math.ceil((Date.now() + horas * 3600000) / 60000) * 60000);
      var partes = {};
      formatoRetirada.formatToParts(minima).forEach(function (parte) { partes[parte.type] = parte.value; });
      return { data: partes.year + '-' + partes.month + '-' + partes.day, hora: partes.hour + ':' + partes.minute };
    }

    function mostrarErro(campo, msg) {
      var el = form.querySelector('[data-erro="' + campo + '"]');
      if (el) {
        el.textContent = msg || '';
        el.hidden = !msg;
      }
      form.querySelectorAll('[name=' + campo + ']').forEach(function (input) {
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      });
    }
    function recebimentoEscolhido() {
      var escolhido = form.querySelector('[name=recebimento]:checked');
      return escolhido ? escolhido.value : '';
    }
    function atualizarValores() {
      var valores = resumoPedido(lerPedido());
      var aCombinar = valores.combinar.length > 0;
      var recebimento = recebimentoEscolhido();
      var entrega = recebimento === 'entrega';
      var pendente = aCombinar || entrega;
      resumo.querySelector('[data-subtotal-produtos]').hidden = !valores.definidos.length;
      resumo.querySelector('[data-total-produtos-rotulo]').textContent = aCombinar ? 'Produtos com preço definido' : 'Total dos produtos';
      resumo.querySelector('[data-total]').textContent = moeda(valores.total);
      resumo.querySelector('[data-resumo-combinar]').hidden = !aCombinar;
      var qtdCombinar = totalQtd(valores.combinar);
      resumo.querySelector('[data-quantidade-combinar]').textContent = qtdCombinar + (qtdCombinar === 1 ? ' unidade' : ' unidades');
      resumo.querySelector('[data-sinal]').textContent = !recebimento ? 'A definir' : pendente ? 'A combinar' : moeda(valores.total / 2);
      resumo.querySelector('[data-resumo-entrega]').hidden = !entrega;
      resumo.querySelector('[data-total-final]').hidden = !pendente;
      resumo.querySelector('[data-total-final-rotulo]').textContent = entrega ? 'Total com entrega' : 'Total do pedido';
      resumo.querySelector('[data-combinar]').hidden = !aCombinar;
      resumo.querySelector('[data-recebimento-aviso]').textContent = entrega
        ? aCombinar ? 'A taxa de entrega também será combinada pelo WhatsApp.'
          : 'Combinamos a taxa pelo WhatsApp e confirmamos o total e o sinal de 50%, incluindo a entrega.'
        : recebimento ? 'O restante é pago na retirada.' : 'Escolha retirada ou entrega para ver como confirmar o pedido.';
      document.querySelectorAll('[data-pix-sinal]').forEach(function (el) {
        el.textContent = recebimento === 'retirada' && !pendente ? moeda(valores.total / 2) : 'A definir';
      });
      resumo.querySelector('[data-combinar]').textContent = 'Os produtos com valor a combinar serão acertados e finalizados pelo WhatsApp. O sinal de 50% será calculado sobre o valor final do pedido' +
        (entrega ? ', incluindo a taxa de entrega.' : '.');
      atualizarPagamento();
    }
    function atualizarRecebimento() {
      var recebimento = recebimentoEscolhido();
      var entrega = recebimento === 'entrega';
      form.querySelector('[data-rotulo-data]').textContent = entrega ? 'Data de entrega' : recebimento ? 'Data de retirada' : 'Data desejada';
      form.querySelector('[data-rotulo-hora]').textContent = entrega ? 'Horário de entrega' : recebimento ? 'Horário de retirada' : 'Horário desejado';
      form.querySelector('[data-recebimento-dica]').textContent = entrega
        ? 'Combinamos o endereço e a taxa pelo WhatsApp antes de confirmar o pedido.'
        : recebimento ? 'Retirada no bairro Bela Vista 1, em Gravatal, em data e horário combinados.' : 'Escolha uma opção para continuar.';
      if (recebimento) mostrarErro('recebimento', '');
      atualizarValores();
    }
    form.querySelectorAll('[name=recebimento]').forEach(function (radio) {
      radio.addEventListener('change', atualizarRecebimento);
    });
    function render() {
      var itens = lerPedido();
      lista.innerHTML = '';
      var temItens = itens.length > 0;
      if (caixa) caixa.hidden = false;
      vazio.hidden = temItens;
      form.hidden = !temItens;
      resumo.hidden = !temItens;
      lista.hidden = !temItens;
      if (!temItens) {
        atualizarContadores(itens);
        return;
      }
      gruposPedido(resumoPedido(itens)).forEach(function (grupo) {
        if (!grupo.itens.length) return;
        if (grupo.titulo) {
          var cabecalho = document.createElement('li');
          cabecalho.className = 'cart-group-heading';
          cabecalho.setAttribute('role', 'presentation');
          var titulo = document.createElement('h2');
          titulo.textContent = grupo.titulo;
          cabecalho.appendChild(titulo);
          lista.appendChild(cabecalho);
        }
        grupo.itens.forEach(function (i) {
          var li = document.createElement('li');
          li.className = 'cart-item';
          var sub = i.preco == null ? 'a combinar' : moeda(i.preco * i.qtd);
          li.innerHTML =
            '<div class="cart-item-main"><strong>' + escapar(i.nome) + '</strong>' +
            (i.detalhes.length ? '<span>' + escapar(i.detalhes.join(' · ')) + '</span>' : '') +
            (i.extras.length ? '<span>Adicionais: ' + escapar(i.extras.map(function (e) {
              return e.nome + ' (' + (e.preco === 0 ? 'Grátis' : moeda(e.preco)) + ')';
            }).join(', ')) + '</span>' : '') +
            (i.obs ? '<span>' + escapar(i.obs) + '</span>' : '') + '</div>' +
            '<div class="cart-item-side"><div class="qty"><button type="button" data-menos aria-label="Diminuir quantidade">−</button><input type="number" name="qtd" min="1" max="99" inputmode="numeric" value="' + i.qtd + '" aria-label="Quantidade"><button type="button" data-mais aria-label="Aumentar quantidade">+</button></div>' +
            '<strong class="cart-item-sub">' + sub + '</strong><button type="button" class="cart-remove" data-remover>Remover</button></div>';
          var input = li.querySelector('[name=qtd]');
          function setQtd(n) {
            n = Math.max(1, Math.min(99, n || 1));
            i.qtd = n;
            gravarPedido(itens);
            render();
          }
          li.querySelector('[data-menos]').addEventListener('click', function () { setQtd(i.qtd - 1); });
          li.querySelector('[data-mais]').addEventListener('click', function () { setQtd(i.qtd + 1); });
          input.addEventListener('change', function () { setQtd(parseInt(input.value, 10)); });
          li.querySelector('[data-remover]').addEventListener('click', function () {
            var idx = itens.indexOf(i);
            if (idx > -1) itens.splice(idx, 1);
            gravarPedido(itens);
            render();
          });
          lista.appendChild(li);
        });
      });
      atualizarValores();
      var h = prazoHoras(itens);
      prazoEl.textContent = 'Para este pedido, pedimos pelo menos ' + h + ' horas de antecedência.';
      conferirData();
      atualizarContadores(itens);
    }
    function conferirData() {
      var horas = prazoHoras(lerPedido());
      var limite = limiteRetirada(horas);
      dataEl.min = limite.data;
      horaEl.min = dataEl.value === limite.data ? limite.hora : '';
      var diaAntes = !!dataEl.value && dataEl.value < limite.data;
      var horaAntes = dataEl.value === limite.data && !!horaEl.value && horaEl.value < limite.hora;
      var invalida = diaAntes || horaAntes;
      avisoData.hidden = !invalida;
      if (invalida) {
        avisoData.querySelector('[data-aviso-titulo]').textContent = 'Antecedência mínima de ' + horas + ' horas';
        avisoData.querySelector('[data-aviso-texto]').textContent =
          'Para este pedido, escolha uma data e um horário a partir de ' +
          formatarData(limite.data) + ' às ' + limite.hora + ' (horário de Gravatal).';
      }
      if (dataEl.value) dataEl.setAttribute('aria-invalid', diaAntes ? 'true' : 'false');
      if (horaEl.value) horaEl.setAttribute('aria-invalid', horaAntes ? 'true' : 'false');
      return !invalida;
    }
    [dataEl, horaEl].forEach(function (campo) {
      campo.addEventListener('input', function () {
        if (campo.value) mostrarErro(campo.name, '');
        conferirData();
      });
      campo.addEventListener('change', conferirData);
      campo.addEventListener('focus', conferirData);
      campo.addEventListener(window.PointerEvent ? 'pointerup' : 'click', function (ev) {
        conferirData();
        if (typeof campo.showPicker !== 'function') return;
        try {
          campo.showPicker();
          ev.preventDefault();
        } catch (_) { /* Mantém o controle nativo e a digitação quando indisponível. */ }
      }, true); // Captura também o clique nos segmentos internos de data/hora.
    });
    // Pix (04/10/2026): ao marcar Pix aparece o quadro com a chave e o botão Copiar; com cartão, só a nota do link
    var pixCheckout = form.querySelector('[data-pix]');
    var cartaoNota = form.querySelector('[data-cartao-nota]');
    function atualizarPagamento() {
      var pag = form.querySelector('[name=pagamento]:checked');
      var ehPix = !!pag && pag.value === 'Pix';
      var entrega = recebimentoEscolhido() === 'entrega';
      var aCombinar = resumoPedido(lerPedido()).combinar.length > 0;
      var pendente = aCombinar || entrega;
      if (pixCheckout) pixCheckout.hidden = !ehPix || recebimentoEscolhido() !== 'retirada' || pendente;
      if (cartaoNota) cartaoNota.hidden = !pag || ehPix;
      if (cartaoNota) cartaoNota.textContent = pendente
        ? 'Enviamos o link de pagamento pelo WhatsApp após confirmar o valor final e o sinal.'
        : 'Enviamos o link de pagamento pelo WhatsApp.';
      var aviso = form.querySelector('[data-pagamento-pendente]');
      aviso.hidden = !pendente;
      aviso.textContent = 'Confirmamos pelo WhatsApp ' +
        (aCombinar && entrega ? 'os preços pendentes e a taxa de entrega' : aCombinar ? 'os preços pendentes' : 'a taxa de entrega') +
        ', o valor final do pedido e o sinal de 50% antes do pagamento.';
      if (pag) mostrarErro('pagamento', '');
    }
    form.querySelectorAll('[name=pagamento]').forEach(function (r) {
      r.addEventListener('change', atualizarPagamento);
    });
    atualizarPagamento();
    nomeEl.addEventListener('input', function () { if (nomeEl.value.trim().length >= 2) mostrarErro('nome', ''); });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var itens = lerPedido();
      if (!itens.length) return;
      var nome = nomeEl.value.trim();
      // Nome, recebimento, agendamento e pagamento são obrigatórios; focar o primeiro erro.
      var primeiroErro = null;
      function exigir(campo, el, valido, msg) {
        mostrarErro(campo, valido ? '' : msg);
        if (!valido && !primeiroErro) primeiroErro = el;
      }
      exigir('nome', nomeEl, nome.length >= 2, 'Informe seu nome para continuar.');
      var recebimento = recebimentoEscolhido();
      exigir('recebimento', form.querySelector('[name=recebimento]'), !!recebimento, 'Escolha retirada ou entrega para continuar.');
      exigir('data', dataEl, !!dataEl.value, recebimento === 'entrega'
        ? 'Escolha o dia em que gostaria de receber.' : 'Escolha o dia em que gostaria de retirar.');
      exigir('hora', horaEl, !!horaEl.value, recebimento === 'entrega'
        ? 'Informe o horário em que gostaria de receber.' : 'Informe o horário em que gostaria de retirar.');
      var pag = form.querySelector('[name=pagamento]:checked');
      exigir('pagamento', form.querySelector('[name=pagamento]'), !!pag, 'Escolha como pagar o sinal para continuar.');
      if (!conferirData() && !primeiroErro) {
        primeiroErro = dataEl.getAttribute('aria-invalid') === 'true' ? dataEl : horaEl;
      }
      if (primeiroErro) {
        primeiroErro.focus();
        return;
      }
      var dados = {
        nome: nome,
        recebimento: recebimento,
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
      lista.hidden = true;
      resumo.hidden = true;
      form.hidden = true;
      if (caixa) caixa.hidden = true;
      if (obrigado) {
        obrigado.hidden = false;
        var aCombinar = resumoPedido(itens).combinar.length > 0;
        var entrega = recebimento === 'entrega';
        var pixObrigado = obrigado.querySelector('[data-pix]');
        if (pixObrigado) pixObrigado.hidden = dados.pagamento !== 'Pix' || entrega || aCombinar;
        var orientacao = 'Confira e envie a mensagem no WhatsApp. ';
        if (aCombinar || entrega) orientacao += 'Por lá, acertamos ' +
          (aCombinar && entrega ? 'os produtos com valor a combinar e a taxa de entrega' : aCombinar ? 'os produtos com valor a combinar' : 'a taxa de entrega') +
          ' e calculamos o sinal de 50% sobre o valor final do pedido. ';
        obrigado.querySelector('[data-obrigado-texto]').textContent = orientacao +
          'Seu pedido é confirmado após combinarmos os detalhes e recebermos o sinal.';
        var nomeSpan = obrigado.querySelector('[data-obrigado-nome]');
        if (nomeSpan) nomeSpan.textContent = nome.split(/\s+/)[0];
        obrigado.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var foco = obrigado.querySelector('h2');
        if (foco) foco.focus();
      }
    });
    // Reabrir a mensagem também exige prazo válido se o cliente ficou na tela final.
    if (reenviar) reenviar.addEventListener('click', function (ev) {
      if (conferirData()) return;
      ev.preventDefault();
      if (obrigado) obrigado.hidden = true;
      render();
      (dataEl.getAttribute('aria-invalid') === 'true' ? dataEl : horaEl).focus();
    });
    if (obrigado) {
      var editar = obrigado.querySelector('[data-editar]');
      if (editar) editar.addEventListener('click', function () {
        obrigado.hidden = true;
        lista.hidden = false;
        resumo.hidden = false;
        form.hidden = false;
        if (caixa) caixa.hidden = false;
        conferirData();
        lista.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      var novo = obrigado.querySelector('[data-novo]');
      if (novo) novo.addEventListener('click', function () {
        gravarPedido([]);
        form.reset();
        atualizarRecebimento();
        obrigado.hidden = true;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    var limpar = document.querySelector('[data-limpar]');
    if (limpar) limpar.addEventListener('click', function () {
      if (window.confirm('Esvaziar o pedido?')) {
        gravarPedido([]);
        render();
      }
    });
    atualizarRecebimento();
    render();
  }

  /* Botão "Copiar" da chave Pix (04/10/2026): copia, mostra "Copiado!" por um instante e avisa no toast. */
  function copiarFallback(texto) {
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (_) {}
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
          timer = setTimeout(function () {
            if (rotulo) rotulo.textContent = original;
            b.classList.remove('copied');
          }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText)
          navigator.clipboard.writeText(texto).then(feito, function () {
            copiarFallback(texto);
            feito();
          });
        else {
          copiarFallback(texto);
          feito();
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    montarFab();
    acompanharFabNoRodape();
    ligarCopiar();
    iniciarTortaBuilder();
    iniciarAdicionais();
    iniciarSabores();
    iniciarCoberturas();
    document.querySelectorAll('form[data-produto]').forEach(ligarFormulario);
    if (document.querySelector('[data-checkout]')) iniciarCheckout();
    atualizarContadores(lerPedido());
  });
})();
