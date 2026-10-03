# Cakes JL — catálogo de encomendas

Site estático em português brasileiro, preparado para GitHub Pages no domínio `www.cakesjlconfeitaria.com.br`.

## Páginas

- `index.html`: catálogo com três categorias.
- `pedido/index.html`: página "Meu pedido" — carrinho e envio do pedido completo pelo WhatsApp.
- `tortas/index.html`: sabores, tamanhos, preços, Matilda, Bentô Cake, adicionais e condições de tortas, com fotos de Matilda, Bentô e dos adicionais.
- `brownies/index.html`: brownie com cobertura e marmitinha brownie recheada.
- `donuts/index.html`: donuts no copinho, seis unidades e recheio na tampa.
- `assets/`: estilos (`site.css`), tema e carrosséis (`site.js`), carrinho e checkout (`pedido.js`) e o ícone do site (favicon).
- Fotos dos produtos: mantidas nas respectivas pastas `tortas/`, `brownies/` e `donuts/`.

Todos os produtos são sob encomenda. Os produtos novos mostram o preço por unidade, copinho ou marmitinha, e todos podem ser adicionados ao pedido. O atendimento é pelo WhatsApp (48) 99944-2988.

## Manutenção

Não há instalação de pacotes, compilação, banco de dados ou backend. Os HTMLs são editáveis diretamente e compartilham `assets/site.css`, `assets/site.js` e `assets/pedido.js`. Conteúdo, preços, links e fotos funcionam sem JavaScript; o tema claro/escuro, os carrosséis e o pedido pelo site dependem dele. Sem JavaScript, cada produto mostra um botão simples de WhatsApp e as fotos continuam disponíveis por rolagem horizontal.

Pedido pelo site: o cliente adiciona produtos ao pedido (brownies, donuts, tortas com tamanho/sabor/adicionais/decoração, Matilda e Bentô), e em `pedido/` informa nome, data e horário de retirada, forma de pagamento e observações; o botão abre o WhatsApp com a mensagem completa (itens, total, sinal de 50%, retirada e pagamento). O pedido fica só no navegador do cliente (localStorage); nada é enviado ao site. Os preços e as regras (prazos de 24 h e 48 h, sinal de 50%) estão no início de `assets/pedido.js` e precisam acompanhar os textos das páginas.

Fotos do mesmo tipo de produto ficam no mesmo carrossel. Há setas, contador e navegação pelo teclado (setas, Home e End), além de deslize no celular. Não há troca automática. Para adicionar fotos, incluir um novo `figure.gallery-slide` no grupo correto e atualizar os rótulos de posição; a quantidade dos controles é obtida das imagens ao carregar a página. Preservar as imagens fornecidas e os valores comerciais confirmados.

Os nomes seguem `produto-tipo.foto.extensão`: o número antes do ponto identifica o tipo e o seguinte identifica a foto. Assim, `brownie-2.*` pertence ao brownie com cobertura e `brownie-3.*` à marmitinha (o tipo 1, brownie recheado, saiu do cardápio). A mesma regra vale para os donuts no copinho e para as fotos de tortas (`matilda-1.1`, `bento-1.1`, `bento-2.1`, `adicional-1.1` a `adicional-12.1`). Manter os nomes e extensões exatos (inclusive maiúsculas/minúsculas) nos links das imagens. Novas fotos precisam ser incluídas no HTML do grupo correspondente.

Os links internos são relativos, com `index.html` explícito, e funcionam tanto no domínio próprio quanto em um endereço com subpasta, como o do repositório de teste. Os testes são feitos no site de teste do GitHub Pages, descrito abaixo.

Os dois PDFs do site antigo (`cardapio-encomendas.pdf` e `cardapio-festival-fatias.pdf`) não fazem parte do site novo: apagar do repositório se ainda estiverem lá. O festival de fatias, quando voltar, terá uma página própria, no modelo da página de tortas.

## Publicação

Esta pasta é exatamente o site. Publicar o CONTEÚDO dela na raiz do repositório, mantendo a estrutura das subpastas: `index.html`, `logo.png`, `CNAME`, `README.md` e as pastas `assets/`, `tortas/`, `brownies/`, `donuts/` e `pedido/` (34 arquivos). Não publicar a pasta que contém a versão original como parte do site. Os arquivos de controle local (AGENTS.md, PENDENCIAS.md e a planilha de precificação) ficam na pasta de cima e não fazem parte do site.

### Teste no GitHub (antes de publicar no domínio)

Repositório de teste: https://github.com/cakesJLconfeitaria/mais-informacoes-teste, publicado pelo GitHub Pages em https://cakesjlconfeitaria.github.io/mais-informacoes-teste/. Subir tudo desta pasta EXCETO o `CNAME` (33 arquivos): o `CNAME` aponta o domínio www.cakesjlconfeitaria.com.br para o repositório que o contém e, no repositório de teste, tentaria tomar o domínio do site real. Em Settings → Pages, usar "Deploy from a branch", branch `main`, pasta `/ (root)`. Nas rodadas seguintes, subir de novo só os arquivos alterados (o GitHub substitui os de mesmo nome).

### Site real

Repositório https://github.com/cakesJLconfeitaria/mais-informacoes (domínio www.cakesjlconfeitaria.com.br): subir tudo desta pasta, inclusive o `CNAME`, e apagar lá os dois PDFs do site antigo. Depois, conferir no domínio a navegação, o logo, as páginas internas, as fotos, os links do WhatsApp e o pedido.
