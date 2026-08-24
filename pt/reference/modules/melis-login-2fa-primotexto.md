# MelisLogin2faPrimotexto

> Canal de entrega de SMS para o sistema 2FA da Melis através da gateway Primotexto. Pacote `melisplatform/melis-login-2fa-primotexto`.

## Objetivo

O MelisLogin2faPrimotexto é um canal 2FA opcional que envia o código de autenticação único por mensagem de texto através da API de SMS da **Primotexto**. Integra-se no contrato de eventos do núcleo `MelisLogin2fa` (`canSend` / `sendUserCode`). Quando ordenado em primeiro lugar entre os canais ativos e o utilizador tem um número de telefone válido, entrega o código por SMS; se não for encontrado um telefone válido mas existir também um canal de email ativo, recorre ao email e notifica o utilizador em conformidade.

## Ativação

Adicione em `config/melis.module.load.php`:

```php
return [
    'MelisLogin2faPrimotexto',
];
```

Requer `melisplatform/melis-login-2fa` (`^5.3`) e PHP `^8.1|^8.3`. O módulo do núcleo `MelisLogin2fa` deve ser carregado primeiro.

Uma vez carregado, ative o **SMS (Primotexto)** na **configuração 2FA** partilhada (Configuração do sistema → 2FA) e ordene-o em primeiro lugar para o tornar o canal principal. Forneça as credenciais da API Primotexto na chave de configuração `melis_login_2fa_primotexto` (ver [Configuração](#configuration)).

## No back-office React

Este módulo é um **plugin de método 2FA do lado do servidor**, não uma ferramenta de back-office. No back-office React (`/melis-react`) não tem **nenhuma página, nenhuma rota e nenhuma entrada de menu**. Toda a sua presença em React é um **brick de descoberta apenas com id**: um `public/ui-react/brick.manifest.json` mínimo (com `route`, `forwardKey` e `melisKey` todos a `null`) e um `brick.tsx` que regista apenas o seu id.

```tsx
// ui-react/src/brick.tsx — the entire React contribution (id only, no UI).
window.__melisRegisterBrick?.({ id: 'melis-login-2fa-primotexto' })
```

O registo desse id é o que faz o módulo aparecer em `GET /melis/react-api/react-modules`, a lista de descoberta dos módulos ativos que fornecem um brick. O `useModuleActive('MelisLogin2faPrimotexto')` do MelisCore baseia-se nessa lista para **revelar o campo `usr_phone` no formulário nativo de Utilizadores** — os utilizadores precisam de um número de telefone para o 2FA por SMS. O módulo não contribui com **nenhum endpoint `react-api` nem com capacidades** próprias; as definições da API Primotexto (`url`, `api_key`, `sender`) são renderizadas pela secção de configuração 2FA partilhada, propriedade do núcleo 2FA, e não por este módulo.

## Configuração

```php
// config/autoload/primotexto.local.php  (do NOT commit real keys)
return [
    'melis_login_2fa_primotexto' => [
        'url'     => 'https://api.primotexto.com/v2/notification/messages/send',
        'api_key' => 'YOUR_API_KEY',   // override per environment
        'sender'  => 'Melis',
    ],
];
```

> **Aviso.** O `config/module.config.php` incluído no repositório contém um marcador de posição literal para `api_key`. Substitua-o sempre num ficheiro de configuração local/específico do ambiente e rode qualquer chave real que possa ter sido submetida no repositório.

## Serviços principais

| Alias do serviço | Função |
| --- | --- |
| `SmsService` | Invoca a API HTTP da Primotexto para entregar o SMS com o OTP; normaliza os números franceses `0…` para `+33…`; regista falhas de curl/HTTP em `CmaErrorLogsTable` |
| `MelisLogin2faPrimotextoControllerPlugin` | Plugin de controlador que expõe `canSend($userData)` e `sendUserCode($user, $code)`; controla o `SmsService` |

## Ouvintes de eventos

| Ouvinte | Evento | Comportamento |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Devolve `['melis-login-2fa-primotexto' => bool]`; se não conseguir enviar mas o email for o próximo na ordem, guarda uma `twofa_fallback_message` na sessão `melis_login_2fa` |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | Atua apenas quando ainda não foi enviado e este canal é `orderedModules[0]`; reutiliza/cria a linha `melis_core_login_2fa_codes`, envia através do `SmsService`, define `sent=true`, invoca `stopPropagation` |

## Tabelas da base de dados

| Tabela | Contém |
| --- | --- |
| `melis_core_user` | Ganha uma coluna `usr_phone` anulável (adicionada pelo `dbdeploy` deste módulo) — o número de telefone para o qual os códigos OTP são enviados |
| `melis_core_login_2fa_codes` | Códigos OTP (propriedade do núcleo `MelisLogin2fa`; este canal reutiliza/cria linhas através de `MelisLogin2faService` + `MelisLogin2faCodesTable`) |

## Exemplo

```php
// Primotexto API call assembled by SmsService::sendSms()
$url = $config['url'] . '?' . http_build_query([
    'apiKey'     => $config['api_key'],
    'identifier' => $number,           // normalised to +33… for French numbers
    'sender'     => trim($config['sender']),
    'message'    => $message,
]);
// Sent via curl (GET). HTTP >= 400 or curl failure → logged + returns false.
```

## Ressalvas

- **Dependência de `CmaErrorLogsTable`.** O `SmsService` regista falhas em `CmaErrorLogsTable`, de um módulo cliente CMA. Se essa tabela/serviço não estiver registada numa instalação genérica, o caminho de registo de erros falhará. Torne esta dependência opcional se implementar fora do contexto original do cliente.
- **Recurso ao email.** Se a Primotexto for a primeira mas o utilizador não tiver um telefone válido, e existir um canal de email ativo ordenado depois, o código é entregue por email com uma mensagem explicativa.
- **Telefone mascarado na interface.** O ecrã de introdução do código mostra apenas uma versão mascarada do telefone (por exemplo, `+3…**…07`).

## Ficheiros principais

| Assunto | Caminho |
| --- | --- |
| Arranque do módulo | `vendor/melisplatform/melis-login-2fa-primotexto/src/Module.php` |
| Ouvinte `canSend` | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreCanSendListener.php` |
| Ouvinte `sendUserCode` | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreSendUserCodeListener.php` |
| Serviço da API de SMS | `vendor/melisplatform/melis-login-2fa-primotexto/src/Service/SmsService.php` |
| Plugin de controlador | `vendor/melisplatform/melis-login-2fa-primotexto/src/Controller/Plugin/MelisLogin2faPrimotextoControllerPlugin.php` |
| Brick React | `vendor/melisplatform/melis-login-2fa-primotexto/ui-react/src/brick.tsx` |
| Manifesto React | `vendor/melisplatform/melis-login-2fa-primotexto/public/ui-react/brick.manifest.json` |
| Configuração do módulo | `vendor/melisplatform/melis-login-2fa-primotexto/config/module.config.php` |
| Migração da BD | `vendor/melisplatform/melis-login-2fa-primotexto/install/dbdeploy/` |

Ver também: [MelisLogin2fa](/pt/reference/modules/melis-login-2fa) · [MelisLogin2faEmail](/pt/reference/modules/melis-login-2fa-email) · [MelisCore](/pt/reference/modules/melis-core)
