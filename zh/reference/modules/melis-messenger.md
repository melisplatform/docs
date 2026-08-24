# MelisMessenger

> Melis 后台内置的用户间私信系统，在 React 后台中以顶栏通知图标以及"我的账户"中的"Melis Messenger"标签页的形式呈现。软件包 `melisplatform/melis-messenger`。

## 用途

MelisMessenger 添加了一套轻量级的私信系统，让后台协作者之间能够相互交流。用户可以与一个或多个其他用户发起会话，消息按轮询间隔进行交换和刷新，并且未读徽标会在任意界面上提示新消息。它是一个仅限后台的工具——不包含任何前台组件。

在 React 后台（`/melis-react`）中，它是一个**特殊的原生 React 砖块（brick），而不是左侧菜单工具**。它**没有侧边栏条目、也没有路由**（`route`、`forwardKey`、`melisKey` 均为 `null`），而是将**两个小部件（widget）**接入宿主的扩展点：

1. 一个带有未读计数徽标的**顶栏 Messenger 图标**（`MessengerHeader.tsx`），以及
2. **"我的账户"内的"Melis Messenger"标签页**（`MessengerTab.tsx`），一个原生 React 聊天面板。

这些 React 组件**不附带 `react-api`，也不携带任何 capabilities（能力）**——它们复用了该模块已有的传统 JSON 端点。业务逻辑保留在服务端的 `MelisMessengerService` 中。

## 启用

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisMessenger',
];
```

需要 `melisplatform/melis-core`。该模块的分类为 `core` 且启用了 `dbdeploy`，因此其数据表通过 dbdeploy 机制安装。两个 React 界面**仅在模块处于激活状态时**才会出现——账户标签页由 `window.__melisIsModuleActive('MelisMessenger')` 守护，而顶栏小部件通过砖块注册，宿主只会为已激活的模块加载该砖块。

## 在 React 后台中

Messenger **没有侧边栏条目**。你可以通过两种方式访问它：

- **顶栏图标**——位于后台页头中的聊天气泡图标，紧邻语言切换器。当你有未读消息时，图标上会显示一个红色徽标标出未读数量（超过 99 时显示 `99+`）。点击它会打开**我的账户**并预先选中 **Melis Messenger** 标签页。

![顶栏 Messenger 图标（高亮显示）位于语言切换器和其他页头小部件旁边；当你有未读消息时，图标上会出现一个红色徽标。](/screenshots/react/melis-messenger/melismessenger-platformheader-iconmessenger.png)

- **Melis Messenger 标签页**——位于我的账户内（聊天气泡图标，紧邻 Profile）。这是一个原生 React 面板，在所选**会话**线程（你的气泡显示在右侧）旁展示你的**联系人（Contacts）**（会话，按最近优先排序）。**+** 按钮会打开用户搜索以发起新会话，底部的输入框让你撰写消息并**发送（Send）**。打开某个会话会将其标记为已读，因此页头徽标会立即下降。

![我的账户内的 React "Melis Messenger" 标签页——联系人（Contacts）列表（带有用于发起新会话的 "+"）、所选会话的消息气泡线程，以及 "Write a message… / Send"（撰写消息…… / 发送）输入框。右上角的 New/Old（新版/旧版）开关可回退到传统 profile。](/screenshots/react/melis-messenger/melismessenger-tool-profile-tab-messenger.png)

徽标和打开的线程会在定时器触发时、浏览器标签页重新获得焦点时，以及你一打开会话时立即刷新。在窄屏（约小于 560px）上，标签页会折叠为一次只显示一列（联系人**或**会话），并带有返回按钮，类似移动端聊天应用。账户页面上的 **New / Old**（新版 / 旧版）开关会在 iframe 中回退到传统 profile；在这种情况下，页头图标会驱动 iframe 的 DOM，转而打开传统的 Messenger 标签页。

## 砖块（brick）

React UI 位于 `ui-react/` 中，并构建（Vite IIFE，React/ReactRouter 外置为宿主全局变量）为 `public/ui-react/brick.js`，与 `brick.manifest.json` 并列。清单（manifest）声明这不是一个工具——注意其中的 null 值：

```json
{ "id": "messenger", "route": null, "label": "Messenger",
  "forwardKey": null, "melisKey": null, "entry": "brick.js" }
```

`ui-react/src/brick.tsx` 为 id `messenger` 注册了**两个宿主界面**，两者均以模块激活为前提：

```tsx
// 1) My-Account tab — modular extension point
window.__melisAccountTabs.push({
  id: 'messenger', label: 'Melis Messenger', icon: <ChatIcon />, order: 10,
  render: () => <MessengerTab />,
})
window.dispatchEvent(new CustomEvent('melis-account-tabs-changed'))

// 2) Topbar icon — the brick's Header widget
window.__melisRegisterBrick?.({ id: 'messenger', Header: MessengerHeader })
```

| 组件 | 职责 |
| --- | --- |
| `brick.tsx` | 入口点。注册 Header 小部件并推送"我的账户"标签页。 |
| `MessengerHeader.tsx` | 顶栏图标 + 未读徽标。轮询 `getNewMessage` 获取计数，将上一次计数缓存到 `sessionStorage` 以便即时渲染，在焦点/可见性变化以及 `melis-messenger-unread-changed` 事件时重新计数。点击后打开我的账户并预先选中 Messenger 标签页。 |
| `MessengerTab.tsx` | 原生 React 聊天面板：联系人列表、会话线程、输入框、"新会话"用户搜索。读写传统 JSON 端点；自适应布局；在将会话标记为已读时派发 `melis-messenger-unread-changed`。 |

由于该 bundle 仅将 `react` / `react-dom` / `react-router-dom` 外置为宿主全局变量（它无法导入 Tailwind/shadcn/lucide/i18n），因此组件使用内联样式配合宿主 CSS 变量，以及一个基于 `document.documentElement.lang` 索引的文件内 `{fr,en}` 字典。

## 复用的端点

该模块**不附带 `config/react-api.php`**。两个 React 组件都调用 `MelisMessenger\Controller\MelisMessengerController` 位于 `/melis/MelisMessenger/MelisMessenger/…` 下的现有传统 JSON 端点，并发送 `X-Requested-With: XMLHttpRequest` 和 `credentials: 'include'`。

**Header（`MessengerHeader.tsx`）——徽标轮询器：**

| 方法及 URL | 用途 |
| --- | --- |
| `GET …/getNewMessage` | 未读消息 → `{ messages: [...] }`；徽标计数 = `messages.length`。 |
| `GET …/getMsgTimeInterval` | 平台轮询间隔 `{ interval }`（默认 60 000 毫秒）。 |

Header 将轮询上限设为 `min(interval, 10 000 ms)`，以保证这个始终可见的徽标保持灵敏。

**我的账户标签页（`MessengerTab.tsx`）——聊天面板：**

| 方法及 URL | 用途 |
| --- | --- |
| `GET …/getContactListByDate` | 按最后消息日期排序的会话 → `{ data: ContactRow[] }`。 |
| `GET …/getConversation/:id?limit=&offset=` | 某会话的消息 → `{ data: Message[], user_id }`。 |
| `GET …/getUserListForConversation?search=` | 用于"新会话"的用户搜索 → `{ data: UserRow[] }`。 |
| `POST …/createConversation` | 发起会话（`mbrids=<userId>`）→ `{ conversationId }`。 |
| `POST …/saveMessage` | 发送消息（`msgr_msg_id`、`msgr_msg_cont_message`）→ `{ success }`。 |
| `POST …/updateMessageStatus` | 将打开的会话标记为已读（`id=<convoId>`）——在打开/回复时触发。 |
| `GET …/getMsgTimeInterval` | 线程刷新的轮询间隔。 |

`getContactListByDate` 和 `getUserListForConversation` 专门由 React 标签页使用（按日期排序的列表 + 服务端用户搜索）；较旧的 `getContactList` / `renderMessenger*` 操作仍然驱动传统工具，保持不变。

## 关键服务

| 别名 | 职责 |
| --- | --- |
| `MelisMessengerService` | 用于消息收发的公开服务：发送并读取消息/会话。 |
| `MelisMessengerMsgTable` | `melis_messenger_msg` 的表网关。 |
| `MelisMessengerMsgContentTable` | `melis_messenger_msg_content` 的表网关。 |
| `MelisMessengerMsgMembersTable` | `melis_messenger_msg_members` 的表网关。 |

`MelisMessengerService` 的方法会为每次读取/列表调用触发 `melismessenger_*_start` / `*_end` 事件（例如 `melismessenger_get_conversation_start` / `_end`）：

| 方法 | 职责 |
| --- | --- |
| `saveMsg($data)` | 创建/更新会话；返回会话 id。 |
| `saveMsgMembers($data)` | 将某用户关联到会话。 |
| `saveMsgContent($data)` | 在会话中保存一条消息。 |
| `getConversation($id)` | 按 id 获取完整会话。 |
| `getConversationWithLimit($id, $limit, $offset)` | 分页获取会话。 |
| `getNewMessage($id)` | 获取自上次轮询以来的新消息/未读消息。 |
| `updateMessageStatus($data, $msg_id, $user_id)` | 为某用户将消息标记为已读。 |
| `getContactList($convo_id, $user_id)` | 解析某会话的联系人。 |
| `prepareConversationId($userId)` | 列出某用户所属的会话 id。 |
| `getUserRightsForMessenger()` | 检查当前用户对该模块的访问权限。 |

## 数据表

| 数据表 | 存储内容 |
| --- | --- |
| `melis_messenger_msg` | 每个会话一行（`msgr_msg_id`、`msgr_msg_creator_id`、`msgr_msg_date_created`）。 |
| `melis_messenger_msg_members` | 参与会话的用户（`msgr_msg_mbr_id`、`msgr_msg_id`、`msgr_msg_mbr_usr_id`）。 |
| `melis_messenger_msg_content` | 单条消息（`msgr_msg_cont_id`、发送者、消息文本、日期、状态）。 |

## Capabilities（能力）

**无。** 该模块没有 `config/react.capabilities.php`，也没有携带权限的菜单节点——它不是菜单工具。访问由传统端点守护，这些端点要求已认证的后台会话，并且各界面均以模块激活为前提。Messenger 没有需要声明或检查的 `MelisCan(...)` capability 字符串。

## 示例

```php
$messenger = $this->getServiceManager()->get('MelisMessengerService');

// Create a conversation, add a member, then post a message
$convoId = $messenger->saveMsg($data);
$messenger->saveMsgMembers(['msgr_msg_id' => $convoId, 'msgr_msg_mbr_usr_id' => $userId]);
$messenger->saveMsgContent(['msgr_msg_id' => $convoId, 'msgr_msg_cont_message' => 'Hi']);

// Read messages
$thread = $messenger->getConversation($convoId);
$page   = $messenger->getConversationWithLimit($convoId, 10, 0);
$new    = $messenger->getNewMessage($convoId);

// Mark read
$messenger->updateMessageStatus($data, $msgId, $userId);
```

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块配置（路由、服务、控制器） | `vendor/melisplatform/melis-messenger/config/module.config.php` |
| 接口声明（传统 Profile 标签页 + 页头图标） | `vendor/melisplatform/melis-messenger/config/app.interface.php` |
| 表单配置 | `vendor/melisplatform/melis-messenger/config/app.forms.php` |
| 工具配置 | `vendor/melisplatform/melis-messenger/config/app.tools.php` |
| 公开服务 | `vendor/melisplatform/melis-messenger/src/Service/MelisMessengerService.php` |
| 主控制器（React 复用的 JSON 端点） | `vendor/melisplatform/melis-messenger/src/Controller/MelisMessengerController.php` |
| 表网关 | `vendor/melisplatform/melis-messenger/src/Model/Tables/` |
| React 砖块（Header 小部件 + 我的账户标签页） | `vendor/melisplatform/melis-messenger/ui-react/src/` |
| 构建后的砖块 + 清单 | `vendor/melisplatform/melis-messenger/public/ui-react/brick.js`、`brick.manifest.json` |
| 数据库安装增量 | `vendor/melisplatform/melis-messenger/install/` |

另请参阅：[melis-core](/zh/reference/modules/melis-core)
