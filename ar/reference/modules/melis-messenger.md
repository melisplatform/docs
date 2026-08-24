# MelisMessenger

> نظام مراسلة داخلي بين المستخدمين ضمن الواجهة الخلفية لـ Melis، يظهر في الواجهة الخلفية بتقنية React على هيئة أيقونة إشعار في الشريط العلوي وعلامة تبويب "Melis Messenger" في حسابي (My Account). الحزمة `melisplatform/melis-messenger`.

## الغرض

يضيف MelisMessenger نظام مراسلة خاصًا خفيف الوزن بحيث يمكن للمتعاونين في الواجهة الخلفية التحدث فيما بينهم. يبدأ المستخدم محادثة مع مستخدم واحد أو أكثر من المستخدمين الآخرين، وتُتبادَل الرسائل ويُعاد تحميلها على فترات استطلاع دورية، وتُظهر شارة الرسائل غير المقروءة الرسائلَ الجديدة من أي شاشة. إنها أداة خاصة بالواجهة الخلفية فقط — ولا يوجد أي مكوّن للواجهة الأمامية.

في الواجهة الخلفية بتقنية React (`/melis-react`) تُعدّ **لَبِنة (brick) React أصيلة خاصة، وليست أداة قائمة جانبية**. ليس لها **أي مدخل في الشريط الجانبي ولا أي مسار (route)** (`route` و`forwardKey` و`melisKey` جميعها `null`)، وبدلًا من ذلك توصِّل **عنصرَي واجهة (widget)** إلى نقاط توسعة المضيف:

1. **أيقونة مراسلة في الشريط العلوي** مع شارة عدّاد للرسائل غير المقروءة (`MessengerHeader.tsx`)، و
2. **علامة تبويب "Melis Messenger" داخل حسابي (My Account)** (`MessengerTab.tsx`)، وهي لوحة دردشة React أصيلة.

لا تشحن مكوّنات React **أي `react-api` ولا أي قدرات (capabilities)** — فهي تعيد استخدام نقاط النهاية القديمة الموجودة من نوع JSON الخاصة بالوحدة. يبقى منطق العمل من جانب الخادم في `MelisMessengerService`.

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisMessenger',
];
```

تتطلب `melisplatform/melis-core`. فئة الوحدة هي `core` مع تفعيل `dbdeploy`، لذا تُثبَّت جداولها عبر آلية dbdeploy. يظهر كِلا سطحَي React **فقط عندما تكون الوحدة نشطة** — إذ تُحرَس علامة تبويب الحساب بواسطة `window.__melisIsModuleActive('MelisMessenger')`، ويُسجَّل عنصر واجهة الشريط العلوي عبر اللبنة (brick)، التي لا يحمّلها المضيف إلا للوحدات النشطة.

## في الواجهة الخلفية بتقنية React

**لا يوجد مدخل في الشريط الجانبي** لـ Messenger. تصل إليها بطريقتين:

- **أيقونة الشريط العلوي** — فقاعة دردشة في رأس الواجهة الخلفية، بجوار مبدّل اللغة.
  تُظهر شارة حمراء عدد رسائلك غير المقروءة (`99+` عند تجاوز 99). النقر عليها يفتح **حسابي (My Account)** مع تحديد علامة تبويب **Melis Messenger** مسبقًا.

![أيقونة المراسلة في الشريط العلوي (مُبرَزة) موضوعة بجوار مبدّل اللغة وبقية عناصر واجهة الرأس؛ تظهر عليها شارة حمراء عندما تكون لديك رسائل غير مقروءة.](/screenshots/react/melis-messenger/melismessenger-platformheader-iconmessenger.png)

- **علامة تبويب Melis Messenger** — داخل حسابي (My Account) (أيقونة فقاعة دردشة، بجوار الملف الشخصي Profile). لوحة React أصيلة تعرض **جهات الاتصال (Contacts)** الخاصة بك (المحادثات، الأحدث أولًا) إلى جانب سلسلة **المحادثة** المحدّدة (فقاعاتك على اليمين). يفتح زر **+** بحثًا عن مستخدم لبدء محادثة جديدة، ويتيح لك محرّر الإنشاء في الأسفل الكتابة والإرسال (**Send**). يؤدي فتح محادثة إلى وضع علامة مقروءة عليها، فتنخفض شارة الرأس فورًا.

![علامة تبويب React "Melis Messenger" داخل حسابي (My Account) — قائمة جهات الاتصال (Contacts) (مع "+" لبدء محادثة جديدة)، وسلسلة فقاعات رسائل المحادثة المحدّدة، ومحرّر الإنشاء "Write a message… / Send". يمكن لمبدّل New/Old (أعلى اليمين) الرجوع إلى الملف الشخصي القديم.](/screenshots/react/melis-messenger/melismessenger-tool-profile-tab-messenger.png)

تُحدَّث الشارة والسلسلة المفتوحة بمؤقّت، وعندما يستعيد تبويب المتصفح التركيز، وبمجرد أن تفتح محادثة. على الشاشات الضيقة (~أقل من 560 بكسل) تنطوي علامة التبويب إلى عمود واحد في كل مرة (جهات الاتصال *أو* المحادثة) مع زر رجوع، مثل تطبيق دردشة على الجوال. يؤدي مبدّل **New / Old** في صفحة الحساب إلى الرجوع إلى الملف الشخصي القديم داخل iframe؛ وفي تلك الحالة تحرّك أيقونة الرأس شجرة DOM الخاصة بالـ iframe لفتح علامة تبويب Messenger القديمة بدلًا من ذلك.

## اللَّبِنة (brick)

توجد واجهة React في `ui-react/` وتُبنى (Vite IIFE، مع إخراج React/ReactRouter كعناصر خارجية إلى المتغيّرات العامة للمضيف) إلى `public/ui-react/brick.js` إلى جانب `brick.manifest.json`. يعلن الملف التعريفي (manifest) أن هذه ليست أداة — لاحِظ قيم null:

```json
{ "id": "messenger", "route": null, "label": "Messenger",
  "forwardKey": null, "melisKey": null, "entry": "brick.js" }
```

يسجّل `ui-react/src/brick.tsx` **سطحَي مضيف** للمعرّف `messenger`، وكلاهما مشروط بتفعيل الوحدة:

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

| المكوّن | الدور |
| --- | --- |
| `brick.tsx` | نقطة الدخول. يسجّل عنصر واجهة الرأس (Header) ويدفع علامة تبويب حسابي (My-Account). |
| `MessengerHeader.tsx` | أيقونة الشريط العلوي + شارة الرسائل غير المقروءة. يستطلع `getNewMessage` للحصول على العدّاد، ويخزّن آخر عدّاد في `sessionStorage` للرسم الفوري، ويعيد العدّ عند التركيز/الظهور وعند حدث `melis-messenger-unread-changed`. تفتح النقرة حسابي (My Account) وتحدّد علامة تبويب Messenger مسبقًا. |
| `MessengerTab.tsx` | لوحة دردشة React الأصيلة: قائمة جهات الاتصال، وسلسلة المحادثة، ومحرّر الإنشاء، وبحث المستخدمين لـ "محادثة جديدة". يقرأ/يكتب نقاط النهاية القديمة من نوع JSON؛ متجاوب؛ يطلق `melis-messenger-unread-changed` عندما يضع علامة مقروءة على محادثة. |

بما أن الحزمة تخرج فقط `react` / `react-dom` / `react-router-dom` كعناصر خارجية إلى المتغيّرات العامة للمضيف (فهي لا تستطيع استيراد Tailwind/shadcn/lucide/i18n)، تستخدم المكوّنات أنماطًا مضمّنة (inline styles) مع متغيّرات CSS الخاصة بالمضيف وقاموس `{fr,en}` داخل الملف مفتوحه `document.documentElement.lang`.

## نقاط النهاية المُعاد استخدامها

لا تشحن الوحدة **أي `config/react-api.php`**. يستدعي كِلا مكوّنَي React نقاطَ النهاية القديمة الموجودة من نوع JSON الخاصة بـ `MelisMessenger\Controller\MelisMessengerController` تحت `/melis/MelisMessenger/MelisMessenger/…`، مع إرسال `X-Requested-With: XMLHttpRequest` و`credentials: 'include'`.

**الرأس (`MessengerHeader.tsx`) — مُستطلِع الشارة:**

| الطريقة والعنوان (URL) | الغرض |
| --- | --- |
| `GET …/getNewMessage` | الرسائل غير المقروءة → `{ messages: [...] }`؛ عدّاد الشارة = `messages.length`. |
| `GET …/getMsgTimeInterval` | فترة الاستطلاع الخاصة بالمنصّة `{ interval }` (الافتراضي 60 000 مللي ثانية). |

يقيّد الرأس الاستطلاع إلى `min(interval, 10 000 ms)` بحيث تبقى الشارة الظاهرة دومًا متجاوبة.

**علامة تبويب حسابي (`MessengerTab.tsx`) — لوحة الدردشة:**

| الطريقة والعنوان (URL) | الغرض |
| --- | --- |
| `GET …/getContactListByDate` | المحادثات مرتّبة حسب تاريخ آخر رسالة → `{ data: ContactRow[] }`. |
| `GET …/getConversation/:id?limit=&offset=` | رسائل محادثة ما → `{ data: Message[], user_id }`. |
| `GET …/getUserListForConversation?search=` | بحث المستخدمين لـ "محادثة جديدة" → `{ data: UserRow[] }`. |
| `POST …/createConversation` | بدء محادثة (`mbrids=<userId>`) → `{ conversationId }`. |
| `POST …/saveMessage` | إرسال رسالة (`msgr_msg_id`، `msgr_msg_cont_message`) → `{ success }`. |
| `POST …/updateMessageStatus` | وضع علامة مقروءة على المحادثة المفتوحة (`id=<convoId>`) — يُطلَق عند الفتح/الرد. |
| `GET …/getMsgTimeInterval` | فترة الاستطلاع لتحديث السلسلة. |

يُستخدَم `getContactListByDate` و`getUserListForConversation` تحديدًا في علامة تبويب React (قائمة مرتّبة حسب التاريخ + بحث مستخدمين من جانب الخادم)؛ أما إجراءات `getContactList` / `renderMessenger*` الأقدم فما زالت تشغّل الأداة القديمة وتُترَك دون تغيير.

## الخدمات الأساسية

| الاسم المستعار (Alias) | الدور |
| --- | --- |
| `MelisMessengerService` | خدمة عامة للمراسلة: إرسال وقراءة الرسائل/المحادثات. |
| `MelisMessengerMsgTable` | بوابة جدول لـ `melis_messenger_msg`. |
| `MelisMessengerMsgContentTable` | بوابة جدول لـ `melis_messenger_msg_content`. |
| `MelisMessengerMsgMembersTable` | بوابة جدول لـ `melis_messenger_msg_members`. |

تطلق طرق `MelisMessengerService` أحداث `melismessenger_*_start` / `*_end` لكل استدعاء قراءة/سرد (مثل `melismessenger_get_conversation_start` / `_end`):

| الطريقة | الدور |
| --- | --- |
| `saveMsg($data)` | إنشاء/تحديث محادثة؛ يُعيد معرّف المحادثة. |
| `saveMsgMembers($data)` | إرفاق مستخدم بمحادثة. |
| `saveMsgContent($data)` | حفظ رسالة داخل محادثة. |
| `getConversation($id)` | جلب محادثة كاملة بواسطة المعرّف. |
| `getConversationWithLimit($id, $limit, $offset)` | جلب محادثة بترقيم الصفحات. |
| `getNewMessage($id)` | جلب الرسائل الجديدة/غير المقروءة منذ آخر استطلاع. |
| `updateMessageStatus($data, $msg_id, $user_id)` | وضع علامة مقروءة على الرسائل لمستخدم ما. |
| `getContactList($convo_id, $user_id)` | تحديد جهات اتصال محادثة ما. |
| `prepareConversationId($userId)` | سرد معرّفات المحادثات التي ينتمي إليها مستخدم. |
| `getUserRightsForMessenger()` | التحقق من حقوق وصول المستخدم الحالي إلى الوحدة. |

## جداول قاعدة البيانات

| الجدول | يحتوي على |
| --- | --- |
| `melis_messenger_msg` | صف واحد لكل محادثة (`msgr_msg_id`، `msgr_msg_creator_id`، `msgr_msg_date_created`). |
| `melis_messenger_msg_members` | المستخدمون المشاركون في محادثة (`msgr_msg_mbr_id`، `msgr_msg_id`، `msgr_msg_mbr_usr_id`). |
| `melis_messenger_msg_content` | الرسائل الفردية (`msgr_msg_cont_id`، المُرسِل، نص الرسالة، التاريخ، الحالة). |

## القدرات (Capabilities)

**لا شيء.** لا تملك الوحدة أي `config/react.capabilities.php` ولا أي عقدة قائمة حاملة للحقوق — فهي ليست أداة قائمة. يُحرَس الوصول عبر نقاط النهاية القديمة التي تتطلب جلسة واجهة خلفية مُصادَقة، والسطوح مشروطة بتفعيل الوحدة. لا توجد سلاسل قدرات `MelisCan(...)` يجب الإعلان عنها أو التحقق منها لـ Messenger.

## مثال

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

## الملفات الأساسية

| الشأن | المسار |
| --- | --- |
| إعداد الوحدة (المسارات، الخدمات، المتحكّمات) | `vendor/melisplatform/melis-messenger/config/module.config.php` |
| إعلان الواجهة (علامة تبويب Profile القديمة + أيقونة الرأس) | `vendor/melisplatform/melis-messenger/config/app.interface.php` |
| إعداد النماذج | `vendor/melisplatform/melis-messenger/config/app.forms.php` |
| إعداد الأدوات | `vendor/melisplatform/melis-messenger/config/app.tools.php` |
| الخدمة العامة | `vendor/melisplatform/melis-messenger/src/Service/MelisMessengerService.php` |
| المتحكّم الرئيسي (نقاط نهاية JSON المُعاد استخدامها بواسطة React) | `vendor/melisplatform/melis-messenger/src/Controller/MelisMessengerController.php` |
| بوابات الجداول | `vendor/melisplatform/melis-messenger/src/Model/Tables/` |
| لَبِنة React (عنصر واجهة الرأس + علامة تبويب حسابي) | `vendor/melisplatform/melis-messenger/ui-react/src/` |
| اللَّبِنة المبنيّة + الملف التعريفي | `vendor/melisplatform/melis-messenger/public/ui-react/brick.js`، `brick.manifest.json` |
| فرق تثبيت قاعدة البيانات (DB install delta) | `vendor/melisplatform/melis-messenger/install/` |

انظر أيضًا: [melis-core](/ar/reference/modules/melis-core)
