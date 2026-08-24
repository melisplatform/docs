# MelisPhpinfo

> Ferramenta de diagnóstico só de leitura que apresenta o `phpinfo()` nativo do PHP dentro do back office React do Melis. Pacote `melisplatform/melis-phpinfo`.

## Objetivo

O MelisPhpinfo é um módulo de Ferramentas de Programação (Dev Tools) de ecrã único que captura a saída de `phpinfo()` e a apresenta na administração do Melis, permitindo que um administrador inspecione a versão do PHP do servidor, as extensões carregadas, as diretivas do `php.ini`, as variáveis de ambiente e os caminhos sem acesso à shell. Não tem base de dados, serviço nem camada de modelos — apenas um controlador e três zonas de vista. Na v6 é distribuído como um **brick iframe** no back office React: a página React monta um iframe persistente que carrega a ferramenta legada existente dentro da estrutura React. Não existe camada de API React nem ficheiro de capacidades.

::: warning Nota de segurança
O `phpinfo()` expõe detalhes sensíveis — caminhos absolutos, módulos carregados, variáveis de ambiente (potencialmente credenciais/chaves de API) e opções de compilação. A ferramenta reside sob **Dev Tools** intencionalmente; mantenha-a restrita a administradores de confiança e oculte segredos antes de partilhar qualquer captura de ecrã.
:::

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisPhpinfo',
];
```

Requer que o `MelisCore` seja carregado primeiro. O brick React só aparece se o módulo estiver ativado — a descoberta de bricks (`GET /melis/react-api/react-modules`) lista os módulos ativos que distribuem um `brick.manifest.json`; desativar o módulo remove o nó de menu.

## Back office (React)

A ferramenta aparece na barra lateral esquerda em **MelisCore → Dev Tools → PHP Info**. Abre como um separador superior chamado **PHP Info** e mostra o relatório completo de `phpinfo()` estilizado para se integrar na administração do Melis; um breve indicador de carregamento aparece enquanto o iframe carrega pela primeira vez. O relatório pode ser extenso, por isso desloque-se dentro da área da ferramenta para chegar a uma determinada secção (Core, extensões, caminhos, ambiente). Existe uma única vista — sem alternância Novo/Antigo — e nada é editável.

## Anatomia do brick

A presença React é um **brick iframe**: `PhpinfoPage.tsx` não implementa qualquer interface React nativa. Cria um iframe persistente (`id="melis-brick-frame-phpinfo"`) cujo `src` é `/melis/react-tool-page?key=melis_phpinfo_tool`, adiciona-o ao `<body>` uma vez e, depois, apenas o posiciona/alterna sobre um `<div>` âncora nas mudanças de separador, de modo que nunca recarrega. O destino do iframe — servido pelo **MelisReactOverride** — apresenta a ferramenta legada clássica PHP Info.

| Item | Valor |
| --- | --- |
| ID do brick | `phpinfo` |
| `route` do manifesto | `/melis-core/phpinfo` |
| `label` | `PHP Info` |
| `forwardKey` | `MelisPhpinfo/List` |
| `melisKey` (destino do iframe) | `melis_phpinfo_tool` |
| `entry` | `brick.js` |
| API React | nenhuma (sem `config/react-api.php`) |
| Capacidades | nenhuma (sem `config/react.capabilities.php`) — acesso controlado pelo direito `melis_phpinfo_tool` |

Manifesto (`public/ui-react/brick.manifest.json`):

```json
{
  "id": "phpinfo",
  "route": "/melis-core/phpinfo",
  "label": "PHP Info",
  "forwardKey": "MelisPhpinfo/List",
  "melisKey": "melis_phpinfo_tool",
  "entry": "brick.js"
}
```

## Acesso

Não existem capacidades detalhadas: o acesso é tudo ou nada, controlado pelo direito de ferramenta `melis_phpinfo_tool`. O menu React só emite o nó se o utilizador tiver `canAccess('melis_phpinfo_tool')` (superadministradores com `usr_admin=1`, ou utilizadores a quem o direito foi concedido). A vista de conteúdo legada volta a verificar o mesmo direito do lado do servidor antes de executar `phpinfo()`, pelo que mesmo um pedido manualmente elaborado à zona de conteúdo produz uma resposta vazia para os restantes.

```php
// src/Controller/ListController.php — renderToolContentAction()
$view->accessAllowed = $this->isPhpinfoAccessAllowed(); // only then does the view run phpinfo()
// isPhpinfoAccessAllowed(): authenticated identity + MelisCoreRights::canAccess('melis_phpinfo_tool')
```

## Zonas de vista

A ferramenta legada (carregada no iframe) é composta por três zonas, inalteradas na v6:

| Identificador da zona | Função |
| --- | --- |
| `melis_phpinfo_tool` | Contentor — encaminha para `MelisPhpinfo/List/render-tool` |
| `melis_phpinfo_header` | Barra de título (`render-tool-header`) |
| `melis_phpinfo_content` | O relatório de `phpinfo()` (`render-tool-content`) |

## Detalhe de implementação

A saída de `phpinfo()` é produzida inteiramente na camada de vista. As ações do controlador devolvem um `ViewModel` vazio, sem dados passados do PHP para a vista; a vista do relatório captura e sanitiza a saída:

```php
ob_start();
phpinfo();
$phpInfoContent = ob_get_clean();
// Strip phpinfo()'s own <style> so the page inherits Melis admin CSS
$filtredPhpInfoContent = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $phpInfoContent);
echo $filtredPhpInfoContent;
```

A lógica de negócio permanece do lado do servidor: o brick React é apenas a ferramenta legada PHP Info incorporada na estrutura React.

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Ponto de entrada do brick | `ui-react/src/brick.tsx` (regista o id `phpinfo` → `PhpinfoPage`) |
| Página React (invólucro do iframe) | `ui-react/src/PhpinfoPage.tsx` |
| Bundle compilado / manifesto | `public/ui-react/brick.js` · `public/ui-react/brick.manifest.json` |
| Registo de menu / zona | `config/app.toolstree.php` |
| Configuração da ferramenta | `config/app.tools.php` · `config/app.interface.php` |
| Registo de rota + controlador | `config/module.config.php` |
| Controlador (3 ações simples, com acesso controlado) | `src/Controller/ListController.php` |
| Vista do relatório | `view/melis-phpinfo/list/render-tool-content.phtml` |

Ver também: [MelisCore](/pt/reference/modules/melis-core)
