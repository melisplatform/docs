# MelisLogin2fa

> Núcleo/orquestrador de autenticação de dois fatores para os inícios de sessão do Melis — após o nome de utilizador e a palavra-passe, exige um código de utilização única e delega a entrega a módulos de canal conectáveis. Pacote `melisplatform/melis-login-2fa`.

## Objetivo

O MelisLogin2fa é o **orquestrador de 2FA** do Melis. Depois de um utilizador passar pela verificação do nome de utilizador/palavra-passe, interceta o início de sessão (através de `melis_core_auth_pre_success`), verifica se a 2FA está ativa para a plataforma e o site/módulo atuais, escolhe um canal de entrega e mantém a sessão não finalizada até que seja introduzido um código válido de 6 dígitos. **Não** envia o código propriamente dito — a entrega é delegada a módulos de canal conectáveis (email, SMS) através do contrato de eventos `canSend` / `sendUserCode`. O canal de email incluído (`melis-login-2fa-email`) é uma dependência obrigatória e está sempre disponível como recurso de reserva bloqueado.

## Ativá-lo

Adicione a `config/melis.module.load.php`:

```php
return [
    'MelisLogin2fa',
];
```

`melisplatform/melis-login-2fa-email` é uma dependência obrigatória e também deve ser carregado (instala-se em par com este módulo). PHP `^8.1|^8.3`.

## No back-office React

Este módulo inclui um **brick apenas de contribuição** — **não tem ferramenta no menu esquerdo nem rota própria**. Em vez disso, regista uma `OtherConfigSection` que a página nativa **Other config** do MelisCore renderiza a seguir aos seus próprios cartões. Encontra a 2FA em **System configuration → Other config**, sob a forma de um cartão **"Two-factor authentication (2FA)"** na parte inferior. O cartão aparece apenas quando o módulo está ativo (descoberto através de `GET /melis/react-api/react-modules`, sendo depois o bundle pré-carregado e avaliado no arranque).

![O cartão "Two-factor authentication (2FA)" dentro da ferramenta React Other config: o bloco "Melis, sites & other modules" com separadores de destino, um interruptor Activate 2FA e a lista de ordem de entrega, mais o bloco "Per environment" com um interruptor Activate 2FA por plataforma](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa.png)

O cartão tem dois blocos:

| Bloco | O que controla |
| --- | --- |
| **Melis, sites & other modules** | Uma coluna de separadores à esquerda com os destinos (**Melis Platform BO**, mais cada **site** quando o MelisCms está ativo). Para o destino selecionado: um interruptor **Activate 2FA** e uma lista **"Delivery order (drag to reorder)"**. O **Default BO Email** está fixado (etiqueta Default + ícone de correio, sempre ativo, não pode ser desativado). Outros métodos (por exemplo, **Primotexto**/SMS) têm um interruptor de ligar/desligar. Arraste as linhas para definir a cadeia de prioridade/reserva. |
| **Per environment** | Uma coluna de separadores com as plataformas (**local**, **prod**…), cada uma com o seu próprio interruptor **Activate 2FA** que escreve `plf_2fa_active`. |

Todos os interruptores, alternadores e reordenações **guardam de imediato**. A 2FA só é executada quando tanto um destino como o ambiente atual estão ativos. A secção React não declara quaisquer direitos avançados (capacidade) — chegar até ela já exige acesso à ferramenta Other config.

![A lista de métodos "Delivery order (drag to reorder)": Default BO Email (etiqueta Default + ícone de correio, bloqueado e sempre ativo) acima de Primotexto (interruptor de ligar/desligar); arraste a pega para definir a cadeia de prioridade/reserva](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa-order.png)

O **desafio de início de sessão em si não é um brick React**: quando a 2FA se aplica, o início de sessão é restringido numa página autónoma de introdução de código servida pelo `Login2faController` (a mesma página para `/melis` e `/melis-react`). O utilizador vê o destino mascarado (por exemplo, `jo****@…`), introduz o código de 6 dígitos e pode **reenviar** após um período de espera. Os códigos errados são limitados, demasiadas falhas bloqueiam a conta e os códigos expiram ao fim de 10 minutos.

## Serviços principais

| Alias do serviço | Função |
| --- | --- |
| `MelisLogin2faService` | Gera o código de 6 dígitos (`generate2faCode()`), um hash de rastreio de 64 caracteres hexadecimais (`generateHash()`) e as marcas temporais de validade (`getValidityDate($minutes)`). |
| `MelisLogin2faConfigService` | Lê e escreve a configuração de 2FA por BO / por site. Métodos principais: `getModuleConfig()`, `getAllModuleConfigs()`, `getAllSiteConfigs()`, `getAvailable2faModules()` (dispara `melis_login_2fa.collect_available_modules`), `mergeAvailableModulesWithConfig()`, `filterOnlyInstalledModules()`, `saveItem()`. |
| `MelisLogin2faTranslationService` | Auxiliares de tradução sensíveis à localidade (`translateByLocale`, `boTranslate`, …) para que as mensagens de entrega de código correspondam ao idioma do utilizador. |
| `MelisLogin2faControllerPlugin` | Expõe `verifyUserCode($userId, $code)` — elimina os códigos expirados, aplica o limite de tentativas, bloqueia a conta após demasiadas falhas e limpa o registo em caso de sucesso. |
| `MelisLogin2faVerifierPlugin` (alias `melisLogin2faVerifier`) | Plugin de controlo — mantém a sessão não finalizada até que seja submetido um código válido. |

## API React

As rotas encontram-se em **`config/react-api.php`** (fundidas através de `Module::getConfig()` sob a rota `melis-react-api` do MelisReactApi). Controlador **`MelisLogin2faReactApiSettingsController`** (alias invocável `MelisLogin2faReactApiSettings`), todas sob `/melis/react-api/login2fa-settings`, contrato `{ success, data, error }`.

| Método e URL | Objetivo |
| --- | --- |
| `GET /melis/react-api/login2fa-settings` | Todas as definições → `{ moduleConfigs[], sites[], siteConfigs[], platforms[] }`. O `module_list` de cada linha passa por `mergeAvailableModulesWithConfig()`, para que uma linha nunca guardada continue a listar todos os métodos instalados. Linhas de site apenas se o MelisCms estiver ativo. |
| `POST /melis/react-api/login2fa-settings/save-config` | Guarda uma linha `melis_core_login_2fa_config`: `{ mcl2cf_id?, mcl2cf_module_name, mcl2cf_site_id, mcl2cf_activate_2fa, module_list[] }` → delega a `MelisLogin2faConfigService::saveItem()`. |
| `POST /melis/react-api/login2fa-settings/save-platform` | Guarda a flag de uma plataforma: `{ plf_id, plf_2fa_active }`. Escreve `MelisCoreTablePlatform`; `422` se `plf_id` estiver em falta. |

Esta react-api é um espelho JSON simples dos antigos separadores de Other config — as mesmas linhas, o mesmo `saveItem`, JSON em vez de phtml renderizado. As ações são restringidas **apenas por autenticação** (`denyUnlessAuthenticated()`, `401` caso contrário); o módulo **não inclui nenhum `config/react.capabilities.php`** e não declara direitos avançados, por isso não invente cadeias de capacidade para ele.

## Tabelas da base de dados

| Tabela | Contém |
| --- | --- |
| `melis_core_login_2fa_codes` | Códigos de utilização única: id do utilizador, email, tipo (`melis-backoffice` ou id do site), o código de 6 dígitos, hash da sessão, data de expiração e contador de tentativas falhadas com marcas temporais (`mcl2c_try`, `mcl2c_try1/2/3_date`). |
| `melis_core_login_2fa_config` | Linhas de configuração por BO / por site: `mcl2cf_module_name` ou `mcl2cf_site_id`, `mcl2cf_activate_2fa`, `mcl2cf_module_list` (lista ordenada de canais em JSON). |

A tabela `melis_core_platform` recebe uma coluna `plf_2fa_active` (adicionada pelo dbdeploy do módulo).

## Parâmetros de configuração

Declarados sob a chave de configuração `melis_login_2fa`:

| Chave | Predefinição | Descrição |
| --- | --- | --- |
| `max_tries` | `3` | Tentativas de código falhadas antes de a conta ser bloqueada (`usr_status = 0`). |
| `code_validity_minutes` | `10` | Minutos até um código expirar. |
| `request_code_cooldown_seconds` | `60` | Segundos mínimos entre pedidos de reenvio. |

## O contrato de eventos dos canais

O núcleo nunca chama um canal diretamente — dispara eventos aos quais os canais respondem. Para adicionar um método de entrega, implemente listeners para:

| Evento | Direção | Objetivo |
| --- | --- | --- |
| `melis_login_2fa.collect_available_modules` | núcleo → canais | Os canais acrescentam `['module'=>'…', 'label'=>'…']` para aparecerem na lista de métodos do administrador. |
| `canSend` | núcleo → canais | Cada canal devolve `['<module-name>' => bool]` indicando se consegue chegar ao utilizador. |
| `sendUserCode` | núcleo → canais | O primeiro canal em `orderedModules` que consegue enviar cria/reutiliza o código e entrega-o, depois define `sent=true` e chama `stopPropagation`. |

## Exemplo

```php
// Building a custom delivery channel — attach these two listeners in your module:

'canSend' => fn($e) => ['my-channel' => $canIReach($e->getParam('user'))],

'sendUserCode' => function ($e) {
    if (!empty($e->getParam('sent'))) return;                              // already sent
    if (($e->getParam('orderedModules')[0] ?? null) !== 'my-channel') return; // not my turn

    // Create/reuse the code via the core's service + table:
    // MelisLogin2faService::generate2faCode() + MelisLogin2faCodesTable

    // Deliver via your transport, then signal completion:
    $e->setParam('sent', true);
    $e->stopPropagation(true);
    return ['sent' => true, 'hash' => $hash, 'message' => 'sent to ' . $maskedTarget];
},

// Also respond to collect_available_modules so the admin can enable/order your channel.
```

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Bootstrap do módulo | `vendor/melisplatform/melis-login-2fa/src/Module.php` (`getConfig()` funde `react-api.php`) |
| Configuração do módulo (serviços, rotas, parâmetros) | `vendor/melisplatform/melis-login-2fa/config/module.config.php` |
| Rotas da react-api | `vendor/melisplatform/melis-login-2fa/config/react-api.php` |
| Lista de rotas de contorno do controlo | `vendor/melisplatform/melis-login-2fa/config/excluded.routes.php` |
| Listener principal de início de sessão (`melis_core_auth_pre_success`) | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faMainListener.php` |
| Listener de guardar configuração | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faListener.php` |
| Listener de reenvio | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faRequestCodeListener.php` |
| Controlador da react-api | `vendor/melisplatform/melis-login-2fa/src/Controller/ReactApi/MelisLogin2faReactApiSettingsController.php` |
| Controlador (rotas de verificação) | `vendor/melisplatform/melis-login-2fa/src/Controller/Login2faController.php` |
| Plugin de verificação | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faControllerPlugin.php` |
| Plugin de controlo (verificador) | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faVerifierPlugin.php` |
| Serviço do núcleo | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faService.php` |
| Serviço de configuração | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faConfigService.php` |
| Tabela de códigos | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faCodesTable.php` |
| Tabela de configuração | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faConfigTable.php` |
| Fonte do brick React | `vendor/melisplatform/melis-login-2fa/ui-react/src/` (`brick.tsx`, `Login2faOtherConfigSection.tsx`) |
| Brick compilado + manifesto | `vendor/melisplatform/melis-login-2fa/public/ui-react/brick.js` · `brick.manifest.json` |
| DB deploy | `vendor/melisplatform/melis-login-2fa/install/dbdeploy/` |

## Metadados

| Item | Valor |
| --- | --- |
| Pacote | `melisplatform/melis-login-2fa` |
| Tipo | `melisplatform-module` · categoria `core` · `dbdeploy: true` |
| Namespace | `MelisLogin2fa\` (PSR-4 → `src/`) · nome do módulo `MelisLogin2fa` |
| Brick React | Apenas de contribuição (id `melis-login-2fa`, `route`/`forwardKey`/`melisKey` = `null`); regista uma `OtherConfigSection` |
| Requer | `melisplatform/melis-login-2fa-email` `^5.3` · PHP `^8.1\|^8.3` |

Consulte também: [MelisLogin2faEmail](/pt/reference/modules/melis-login-2fa-email) · [MelisCore](/pt/reference/modules/melis-core)
