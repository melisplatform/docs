# Instalação

O Melis Platform Community Edition é **gratuito e de código aberto** (OSL-3.0). Existem três
formas de instalação disponíveis — escolha a que melhor se adequa ao seu fluxo de trabalho.

O Melis v6 mantém a mesma framework, módulos e base de dados do v5. O que mudou foi o
**back-office**: uma nova interface React encontra-se agora em **`/melis-react`**, a par das
ferramentas clássicas. A instalação é idêntica — as secções abaixo aplicam-se sem alterações, e a
secção [Conheça o back-office React](#conheca-o-back-office-react) explica o que verá assim que
iniciar sessão.

## Onde encontrar o Melis Platform

Todos os repositórios oficiais estão na organização **[melisplatform](https://github.com/melisplatform)**
no GitHub:

| Repositório | O que é |
|---|---|
| [melis-docker-react](https://github.com/melisplatform/melis-docker-react) | Stacks Docker prontas a executar com o **back-office React ativado por predefinição** — o caminho mais rápido para uma plataforma v6 funcional |
| [melis-platform-skeleton](https://github.com/melisplatform/melis-platform-skeleton) | Esqueleto de projeto para instalações via Composer e a partir do código-fonte |

O esqueleto também está disponível no **Packagist** como
[`melisplatform/melis-platform-skeleton`](https://packagist.org/packages/melisplatform/melis-platform-skeleton),
e as imagens Docker são publicadas no **Docker Hub** — são obtidas automaticamente quando
inicia a stack Compose.

::: tip Stack Docker clássica (v5)
A stack pré-React [`melis-docker`](https://github.com/melisplatform/melis-docker) continua a existir;
está abordada no [guia de instalação legacy (v5)](/legacy/guide/getting-started).
:::

## Escolha o seu caminho de instalação

| Caminho | Comando | Ideal para |
|---|---|---|
| **Docker** | `git clone https://github.com/melisplatform/melis-docker-react.git` | Demonstrações, desenvolvimento local, sem configuração local de PHP — **back-office React por predefinição** |
| **Composer** | `composer create-project melisplatform/melis-platform-skeleton` | Novos projetos na sua própria stack Apache/PHP |
| **Código-fonte do GitHub** | `git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git` | Contribuidores, equipas que pretendem o histórico Git completo |

---

## Requisitos

Para Docker, tudo está incluído — avance para a [Opção A](#opcao-a-docker-recomendado) abaixo.
Para instalações via Composer ou a partir do código-fonte:

- **PHP 8.3 (recomendado)** ou 8.4 (experimental) com as extensões: `intl`, `mysqli`,
  `pdo_mysql`, `gd` (freetype/jpeg/webp), `zip`, `curl`, `mbstring`, `exif`, `xml` (e `opcache`
  recomendado). O PHP 8.5 ainda não é utilizável (as dependências Laminas limitam-se ao 8.4).
- **MySQL 8** (a stack utiliza o MySQL 8.4).
- **Composer 2** e **Git** (para os caminhos Composer e código-fonte).
- **Apache ou Nginx** com `mod_rewrite` / `try_files` a apontar para `public/`.

## Opção A — Docker (recomendado)

O Melis disponibiliza um **repositório Docker dedicado à edição React**,
[`melis-docker-react`](https://github.com/melisplatform/melis-docker-react), onde **todas as stacks
ativam o back-office React por predefinição** (`WITH_REACT=1`) — obtém `/melis` (clássico) **e**
`/melis-react` de imediato. Clone-o uma vez e depois escolha uma stack (cada pasta é autossuficiente,
com o seu próprio `docker-compose.yml`, `.env.example`, `conf/` e `README.md`):

```bash
git clone https://github.com/melisplatform/melis-docker-react.git
cd melis-docker-react
```

| Stack (pasta)  | O que obtém | Ideal para |
|---|---|---|
| **`prebuilt/`**  | Obtém uma imagem pronta a executar + MySQL — sem compilação local | Avaliação mais rápida |
| **`install/`**   | Compila um esqueleto novo em `./melis` no seu host (editável) + um servidor de desenvolvimento Vite | Trabalhar sobre o código / interface React |
| **`fpm/`**       | nginx + PHP-FPM, com o esqueleto integrado na imagem | Topologia ao estilo de produção |
| **`app/latest/`**| Monta um projeto Melis **existente** (reescreve o seu `composer.json` — faça commit primeiro) | Projetos que já possui |
| **`dev/`**       | Apenas imagens base por versão de PHP (Apache/FPM, PHP 8.1–8.5) | Compilar as suas próprias imagens |

Todos os caminhos terminam da mesma forma: o **instalador web nativo do Melis** em
<http://localhost:8080> (`/melis/setup`) configura o esquema da base de dados, o utilizador
administrador e o site de demonstração opcional. A instalação **não** é automatizada por script —
o instalador web é a fonte autoritativa.

### Mais rápido — imagem pré-compilada

```bash
cd prebuilt
cp .env.example .env
docker compose up -d
# Abra http://localhost:8080 e siga o instalador web
```

Quando o instalador solicitar a base de dados, utilize os valores predefinidos do `.env`:

| Campo | Valor |
|---|---|
| Host | `melis-db` &nbsp;*(sem `:port`)* |
| Base de dados / Utilizador / Palavra-passe | `melis` / `melis` / `melis` |

### Compilação chave na mão (código editável no seu host)

O primeiro arranque executa `composer create-project` do esqueleto para `./melis` (alguns minutos);
o código permanece no seu host, editável. Esta stack também inicia um **servidor de desenvolvimento
Vite** para recarregamento a quente da interface React:

```bash
cd install
cp .env.example .env
mkdir -p melis            # pre-create the bind mount (WSL / Rancher Desktop)
docker compose up -d --build
```

A stack expõe:

| Serviço | URL |
| --- | --- |
| Front office | <http://localhost:8080> |
| **Back-office React** | <http://localhost:8080/melis-react> |
| Ferramentas clássicas | <http://localhost:8080/melis> |
| Interface React com recarregamento a quente (Vite) | <http://localhost:5173> |

::: tip Predefinições e dicas
Host da base de dados `melis-db` (sem porta), base de dados / utilizador / palavra-passe `melis` / `melis` / `melis`. Altere
o `HOST_PORT` no `.env` se a porta 8080 estiver ocupada. **Não é necessário token do GitHub** — todos os pacotes (os módulos
React e os forks `laminas-*`) são resolvidos a partir do Packagist. Atalhos `make`: `make up STACK=install`,
`make logs`, `make shell`, `make down`, `make up VITE=1`, `make adminer`.
:::

::: warning Altere as credenciais antes de passar para produção
As credenciais predefinidas `melis` / `melis` e a palavra-passe da base de dados destinam-se apenas ao desenvolvimento local.
Altere-as antes de expor qualquer instância publicamente.
:::

### Como o back-office React é ativado

O Composer obtém as versões estáveis **6.x** de três módulos: [`melis-core`](/pt/reference/modules/melis-core)
(inclui uma compilação de produção da aplicação React, servida em `/MelisCore/ui-react/` — sem Node.js
em tempo de execução), [`melis-react-api`](/pt/reference/modules/melis-react-api) (a API JSON em
`/melis/react-api/*`) e [`melis-react-override`](/pt/reference/modules/melis-react-override) (a rota
SPA `/melis-react` + a ponte iframe que apresenta as ferramentas ainda não migradas dentro da shell
React). Prefere o Melis legacy simples? Defina `WITH_REACT=0` no `.env` antes do primeiro `up`.

Para executar várias stacks em simultâneo sem ter de gerir portas, um `nginx-proxy` partilhado e
opcional em `local-proxy/` encaminha os nomes de host `*.local` — consulte o README do repositório.

## Opção B — Composer (novo projeto na sua stack)

```bash
# 1. Create the project from the skeleton
composer create-project melisplatform/melis-platform-skeleton my-project
cd my-project
composer install

# 2. Create the database (utf8mb4)
mysql -u root -p -e "CREATE DATABASE myproject CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. Import the base data, then run migrations
mysql -u root -p myproject < install/first_install.sql
flyway -configFiles=flyway/conf/flyway.conf migrate
```

Aponte um virtual host do Apache para o diretório **`public/`** do projeto e declare as duas
variáveis de ambiente do Melis:

```apache
<VirtualHost *:80>
    DocumentRoot "/path/to/my-project/public"
    <Directory "/path/to/my-project/public">
        Options -Indexes +FollowSymLinks +ExecCGI
        DirectoryIndex index.php
        AllowOverride All
        Require all granted
    </Directory>

    ServerName www.mysite.local
    SetEnv MELIS_PLATFORM "development"
    SetEnv MELIS_MODULE   "MelisDemoCms"
</VirtualHost>
```

Adicione `127.0.0.1 www.mysite.local` ao seu ficheiro hosts, recarregue o Apache e depois abra
`http://www.mysite.local/melis-react`.

## Opção C — Código-fonte do GitHub (contribuidores)

Cada módulo reside no seu próprio repositório, incluído como submódulo Git:

```bash
git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git
# Already cloned? Pull all submodules:
git submodule update --init --recursive

cd melis-platform-skeleton
composer install
```

Depois siga a mesma configuração de virtual host e base de dados da Opção B acima.

## As duas variáveis de ambiente do Melis

Cada instalação Melis é conduzida por duas variáveis (definidas no `docker-compose.yml` para Docker,
ou através de `SetEnv` para Apache):

- **`MELIS_PLATFORM`** — identifica o ambiente. Seleciona o ficheiro de configuração
  `config/autoload/platforms/<MELIS_PLATFORM>.php`, que contém a **ligação à base de dados** (portanto
  `MELIS_PLATFORM=local` carrega `config/autoload/platforms/local.php`).
- **`MELIS_MODULE`** — identifica qual o **módulo de site** que é servido como front office para este
  domínio.

## Conheça o back-office React

Abra **`/melis-react`** e inicie sessão — a aplicação React apresenta o seu próprio ecrã de início de
sessão e trata da autenticação por si mesma. Uma vez dentro, chega ao painel de controlo: bolhas de
notificação, contadores de KPI (utilizadores / sites / páginas / idiomas), atividade de inícios de
sessão recentes e o seu esquema de mosaicos guardado.

Alguns aspetos que vale a pena conhecer no primeiro contacto:

- **Menu à esquerda.** Toda a árvore de navegação está aqui, já **filtrada pelas suas permissões** — uma
  ferramenta aparece apenas se o seu módulo estiver ativado e se tiver autorização para a utilizar. Clique
  numa entrada para abrir a ferramenta correspondente no painel principal.
- **Ferramentas React nativas ("bricks").** Muitas ferramentas foram reescritas como páginas React nativas
  para uma experiência mais rápida e fluida. Cada uma destas dispõe de um seletor **New (React) / Old (iframe)**
  para que possa mudar para a versão clássica da mesma ferramenta sempre que precisar.
- **As ferramentas clássicas continuam a funcionar.** Qualquer ferramenta que ainda não tenha sido reescrita
  abre de forma integrada dentro da shell — as mesmas DataTables, formulários, separadores, modais e botões de
  gravação de antes. Tem o mesmo aspeto e comportamento do back-office clássico `/melis`, apenas enquadrada
  dentro da interface React.
- **Dois URLs, uma plataforma.** `/melis-react` é a nova experiência; o back-office clássico permanece
  disponível em **`/melis`** caso prefira. Ambos operam sobre os mesmos dados, permissões e módulos.

::: tip O Assistente de IA está sempre a um clique de distância
Um botão flutuante de **Assistente de IA** encontra-se no canto de todos os ecrãs do back-office. Abra-o para
conversar com o assistente integrado do Melis sem sair da ferramenta em que se encontra.

![O botão flutuante do Assistente de IA no back-office React](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)
:::

Consulte [Arquitetura e conceitos](./concepts) para o modelo mental por detrás da shell, dos bricks e da
ponte para as ferramentas clássicas, e a [referência de módulos](/pt/reference/modules/melis-core) para saber
o que cada ferramenta faz.

## Passos seguintes

- [Arquitetura e conceitos](./concepts) — o modelo mental por detrás do Melis.
- [Construir um website (CMS)](./build-a-site) — páginas, templates e árvores de sites.
- [Crie a sua primeira ferramenta](./create-a-tool) — adicione a sua própria ferramenta de back-office.
- [Trabalhar com IA](./ai) — o assistente, os agentes e o MCP dentro do Melis.
