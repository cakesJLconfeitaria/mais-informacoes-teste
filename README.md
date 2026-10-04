# Cakes JL — catálogo de encomendas

Site estático em português brasileiro, preparado para GitHub Pages no domínio `www.cakesjlconfeitaria.com.br`.

## Páginas

- `index.html`: catálogo com três categorias; a fileira de ícones (Instagram, TikTok e Facebook) fica abaixo da cidade. Nas demais páginas, os ícones ficam no rodapé.
- `pedido/index.html`: página "Meu pedido" — carrinho e envio do pedido completo pelo WhatsApp.
- `tortas/index.html`: sabores, tamanhos, preços, Matilda, Bentô Cake, adicionais e condições de tortas, com fotos de Matilda, Bentô e dos adicionais.
- `brownies/index.html`: brownie com cobertura e marmitinha brownie recheada.
- `donuts/index.html`: donuts no copinho, seis unidades e recheio na tampa.
- `assets/`: estilos (`site.css`), tema claro/escuro e popup de foto (`site.js`), carrinho e checkout (`pedido.js`) e o ícone do site (favicon).
- Fotos dos produtos: mantidas nas respectivas pastas `tortas/`, `brownies/` e `donuts/`.

Todos os produtos são sob encomenda. Os produtos novos mostram o preço por unidade, copinho ou marmitinha, e todos podem ser adicionados ao pedido. O atendimento é pelo WhatsApp (48) 99944-2988.

## Manutenção

Não há instalação de pacotes, compilação, banco de dados ou backend. Os HTMLs são editáveis diretamente e compartilham `assets/site.css`, `assets/site.js` e `assets/pedido.js`. Conteúdo, preços, links e fotos funcionam sem JavaScript; o tema claro/escuro, o popup de foto e o pedido pelo site dependem dele. Sem JavaScript, cada produto mostra um botão simples de WhatsApp e cada miniatura é um link que abre a própria imagem.

Pedido pelo site: o cliente adiciona produtos ao pedido (brownies, donuts, tortas com tamanho/sabor/adicionais/decoração, Matilda e Bentô), e em `pedido/` informa nome, data e horário de retirada, forma de pagamento e observações; o botão abre o WhatsApp com a mensagem completa (itens, total, sinal de 50%, retirada e pagamento). O pedido fica só no navegador do cliente (localStorage); nada é enviado ao site. Os preços e as regras (prazos de 24 h e 48 h, sinal de 50%) estão no início de `assets/pedido.js` e precisam acompanhar os textos das páginas.

Cada produto é um card com miniaturas quadradas à esquerda do título (todas visíveis, sem carrossel na página). Tocar em uma miniatura abre a foto grande em um popup, que tem botão de fechar (fecha também com toque fora da foto e com Esc), setas, contador ("2 de 3"), deslize no celular e setas do teclado (também Home e End) para passar entre as fotos do mesmo grupo; não há troca automática e o movimento reduzido do aparelho é respeitado. Abaixo da foto o popup mostra o nome, o valor e uma breve descrição do que está na tela — nos adicionais, que ficam todos no mesmo popup, isso diz qual decoração é cada foto. O grupo é o elemento com `data-photos="Nome"` (e `data-price` com o valor do produto); cada foto é um `a.thumb` com `href` para a imagem e, quando a foto tem nome ou valor próprios (adicionais, opções do Bentô), `data-title`, `data-price` e `data-desc`; sem eles, o popup usa o nome e o valor do grupo e o `alt` da foto como descrição. Para adicionar uma foto, incluir outro `a.thumb` no grupo certo; os controles contam as fotos ao carregar a página. Na página de tortas, a foto da Matilda é miniatura ao lado do título e as fotos do Bentô e dos adicionais, pequenas ao lado do nome, também abrem o popup. Preservar as imagens fornecidas e os valores comerciais confirmados.

Os nomes seguem `produto-tipo.foto.extensão`: o número antes do ponto identifica o tipo e o seguinte identifica a foto. Assim, `brownie-2.*` pertence ao brownie com cobertura e `brownie-3.*` à marmitinha (o tipo 1, brownie recheado, saiu do cardápio). A mesma regra vale para os donuts no copinho e para as fotos de tortas (`matilda-1.1`, `bento-1.1`, `bento-2.1`, `adicional-1.1` a `adicional-12.1`). Manter os nomes e extensões exatos (inclusive maiúsculas/minúsculas) nos links das imagens. Novas fotos precisam ser incluídas no HTML do grupo correspondente.

Os links internos são relativos, com `index.html` explícito, e funcionam tanto no domínio próprio quanto em um endereço com subpasta, como o do repositório de teste. Os testes são feitos no site de teste do GitHub Pages, descrito abaixo.

Os dois PDFs do site antigo (`cardapio-encomendas.pdf` e `cardapio-festival-fatias.pdf`) não fazem parte do site novo: apagar do repositório se ainda estiverem lá. O festival de fatias, quando voltar, terá uma página própria, no modelo da página de tortas.

## Publicação

Esta pasta é exatamente o site. Publicar o CONTEÚDO dela na raiz do repositório, mantendo a estrutura das subpastas: `index.html`, `logo.png`, `CNAME`, `README.md` e as pastas `assets/`, `tortas/`, `brownies/`, `donuts/` e `pedido/` (34 arquivos). Não publicar a pasta que contém a versão original como parte do site. Os arquivos de controle local (AGENTS.md, PENDENCIAS.md e a planilha de precificação) ficam na pasta de cima e não fazem parte do site.

### Teste no GitHub (antes de publicar no domínio)

Repositório de teste: https://github.com/cakesJLconfeitaria/mais-informacoes-teste, publicado pelo GitHub Pages em https://cakesjlconfeitaria.github.io/mais-informacoes-teste/. Subir tudo desta pasta EXCETO o `CNAME` (33 arquivos): o `CNAME` aponta o domínio www.cakesjlconfeitaria.com.br para o repositório que o contém e, no repositório de teste, tentaria tomar o domínio do site real. Em Settings → Pages, usar "Deploy from a branch", branch `main`, pasta `/ (root)`. Nas rodadas seguintes, subir de novo só os arquivos alterados (o GitHub substitui os de mesmo nome).

### Site real

Repositório https://github.com/cakesJLconfeitaria/mais-informacoes (domínio www.cakesjlconfeitaria.com.br): subir tudo desta pasta, inclusive o `CNAME`, e apagar lá os dois PDFs do site antigo. Depois, conferir no domínio a navegação, o logo, as páginas internas, as fotos, os links do WhatsApp e o pedido.
