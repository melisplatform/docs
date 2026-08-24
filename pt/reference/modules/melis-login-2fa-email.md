# MelisLogin2faEmail

> Canal de envio por email para o sistema 2FA do Melis — envia o código de início de sessão de utilização única por email. Pacote `melisplatform/melis-login-2fa-email`.

## Objetivo

O MelisLogin2faEmail é o canal de email **predefinido e incluído** para o [MelisLogin2fa](/pt/reference/modules/melis-login-2fa). Trata dos eventos `canSend` e `sendUserCode` despoletados pelo núcleo 2FA, decidindo se um utilizador pode ser contactado por email e enviando depois o código de 6 dígitos. Uma vez que o núcleo requer este módulo e este módulo requer o núcleo, são instalados como um par — o email é sempre o canal alternativo disponível.

## Presença no back-office React

Este módulo é um **plugin de método 2FA**, não uma ferramenta: **não tem brick React, rota `react-api`, capacidades nem interface própria**. Nunca surge como entrada na barra lateral ou no menu do `/melis-react`. Em vez disso, o canal de email aparece apenas *dentro* de ecrãs pertencentes ao MelisLogin2fa / MelisCore:

- **Como método 2FA selecionável e ordenável** na **secção de definições 2FA** que o núcleo contribui para a ferramenta *Other config*. Os administradores ativam-no e definem a sua ordem aí; a ordem determina qual o canal ativo que é tentado primeiro.
- **Como o passo de email + introdução do código no início de sessão** — quando o 2FA está ativo e o email é o canal escolhido, o fluxo de início de sessão envia o código de 6 dígitos por email e apresenta o ecrã de introdução do código. A confirmação mostra um endereço **mascarado** (por exemplo, `jo****@…`).

**Não existem capturas de ecrã React** para este módulo, porque não tem qualquer ecrã próprio.

## Ativá-lo

Este módulo é requerido pelo `melis-login-2fa` e é instalado automaticamente juntamente com ele. Não é necessária uma entrada separada no ficheiro de carregamento de módulos, para além de carregar o `MelisLogin2fa`.

Para ativar o canal de email, abra as definições 2FA disponibilizadas no back-office React:

**System config → Other config → 2FA** — ative o **Email** como método de envio e defina a sua ordem entre os canais ativos.

O email de BO da plataforma também tem de estar ativo (configurado através das definições de email do MelisCore).

## Serviços principais

| Alias do serviço | Função |
| --- | --- |
| `Melis2faBOEmailService` | Estende `MelisCoreBOEmailService`; substitui `sendBoEmailByCode()` / `sendEmail()` para definir o remetente correto do envelope (`email_from` em vez do endereço do destinatário). Carrega o modelo de email pelo respetivo codename, substitui os marcadores `[TAG]`, envolve-o no layout e envia através de `Laminas\Mail`. |
| `MelisLogin2faEmailControllerPlugin` | Plugin de controlador — ponto de entrada invocado por ambos os listeners; expõe `canSend($userData)` e `sendUserCode($user, $code)`. |

## Listeners

| Listener | Evento | Comportamento |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Devolve `['melis-login-2fa-email' => <bool>]` — `true` quando o utilizador tem um `usr_email` utilizável (não vazio e que passe `Laminas\Validator\EmailAddress`). |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | Atua apenas quando ainda não foi enviado **e** este canal é o primeiro em `orderedModules` (`orderedModules[0] === 'melis-login-2fa-email'`). Reutiliza ou cria uma linha `melis_core_login_2fa_codes`, resolve a localização, envia o código e depois define `sent=true`, invoca `stopPropagation` e devolve `['sent'=>true, 'hash'=>…, 'message'=>'<sent-to> '.maskEmail($email)]`. |

O identificador utilizado ao longo da seleção e ordenação de métodos é a cadeia de carateres `melis-login-2fa-email`.

## Localização e ligação de recuperação

`sendUserCode()` resolve a **localização** do destinatário (o próprio `usr_lang_id` do destinatário em contexto de BO, com recurso à localização da sessão; o idioma da página principal do site em contexto de FO) para que o assunto e o corpo do email estejam no idioma do destinatário.

A ligação de *forgot-password* do email adapta-se ao back-office de onde o utilizador veio: um utilizador de BO que solicitou o seu código **a partir da shell React** recebe a ligação apontada para **`/melis-react/forgot-password`** em vez do legado `/melis/lost-password`. Isto é condicionado por `($user['ui_origin'] ?? null) === 'react'`, em que `ui_origin` é derivado (baseado no Referer, com predefinição `'legacy'`) pelo `Login2faController::request2faCodeAction()` do núcleo. Nada mais no fluxo é específico do React.

## Configuração

Declarada sob a chave de configuração `melis_login_2fa_email`:

| Chave | Predefinição | Descrição |
| --- | --- | --- |
| `email_from` | `noreply@melistechnology.com` | Endereço do remetente do envelope |
| `from_name` | `Melis Platform` | Nome de apresentação do remetente |
| `reply_to` | — | Endereço de resposta |

## Tabelas da base de dados

| Tabela | Contém |
| --- | --- |
| `melis_core_login_2fa_codes` | Códigos de utilização única (partilhados com o núcleo 2FA); as linhas são reutilizadas enquanto ainda forem válidas ou criadas de novo por `MelisLogin2faService::generate2faCode()`. |

## Ficheiros principais

| Aspeto | Caminho |
| --- | --- |
| Arranque do módulo | `vendor/melisplatform/melis-login-2fa-email/src/Module.php` |
| Configuração do módulo | `vendor/melisplatform/melis-login-2fa-email/config/module.config.php` |
| Listener `canSend` | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreCanSendListener.php` |
| Listener `sendUserCode` | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreSendUserCodeListener.php` |
| Plugin de controlador | `vendor/melisplatform/melis-login-2fa-email/src/Controller/Plugin/MelisLogin2faEmailControllerPlugin.php` |
| Serviço de email | `vendor/melisplatform/melis-login-2fa-email/src/Service/Melis2faBOEmailService.php` |

## Metadados

| Item | Valor |
| --- | --- |
| Pacote | `melisplatform/melis-login-2fa-email` |
| Tipo | `melisplatform-module` · categoria `core` · `dbdeploy: true` |
| Namespace | `MelisLogin2faEmail\` (PSR-4 → `src/`) |
| Requer | `melisplatform/melis-login-2fa` `^5.3` · PHP `^8.1\|^8.3` |
| Presença React | Nenhuma — sem brick, sem `react-api`, sem capacidades, sem interface |

Ver também: [MelisLogin2fa](/pt/reference/modules/melis-login-2fa) · [MelisCore](/pt/reference/modules/melis-core)
