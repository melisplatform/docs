# التثبيت

إصدار المجتمع من Melis Platform هو **مجاني ومفتوح المصدر** (OSL-3.0). تتوفر ثلاثة مسارات للتثبيت — اختر المسار الذي يناسب سير عملك.

يحتفظ Melis v6 بنفس إطار العمل والوحدات وقاعدة البيانات الموجودة في v5. أما ما تغيّر فهو **الواجهة الخلفية (back-office)**: توجد الآن واجهة React جديدة على المسار **`/melis-react`**، إلى جانب الأدوات الكلاسيكية. عملية التثبيت متطابقة — تنطبق الأقسام أدناه دون تغيير، ويشرح قسم [تعرّف على الواجهة الخلفية بتقنية React](#meet-the-react-back-office) ما ستراه بمجرد تسجيل الدخول.

## أين تجد Melis Platform

تتواجد جميع المستودعات الرسمية ضمن منظّمة **[melisplatform](https://github.com/melisplatform)** على GitHub:

| المستودع | ما هو |
|---|---|
| [melis-docker-react](https://github.com/melisplatform/melis-docker-react) | حزم Docker جاهزة للتشغيل مع **تفعيل الواجهة الخلفية بتقنية React افتراضيًا** — أسرع مسار للوصول إلى منصّة v6 عاملة |
| [melis-platform-skeleton](https://github.com/melisplatform/melis-platform-skeleton) | هيكل المشروع الأساسي لعمليات التثبيت عبر Composer والمصدر |

يتوفر الهيكل الأساسي أيضًا على **Packagist** باسم
[`melisplatform/melis-platform-skeleton`](https://packagist.org/packages/melisplatform/melis-platform-skeleton)،
وتُنشر صور Docker على **Docker Hub** — ويجري سحبها تلقائيًا عند تشغيل حزمة Compose.

::: tip حزمة Docker الكلاسيكية (v5)
لا تزال حزمة [`melis-docker`](https://github.com/melisplatform/melis-docker) السابقة على React موجودة؛ وهي مشمولة في [دليل التثبيت القديم (v5)](/legacy/guide/getting-started).
:::

## اختر مسار التثبيت الخاص بك

| المسار | الأمر | الأنسب لـ |
|---|---|---|
| **Docker** | `git clone https://github.com/melisplatform/melis-docker-react.git` | العروض التوضيحية، التطوير المحلي، دون إعداد PHP محلي — **الواجهة الخلفية بتقنية React افتراضيًا** |
| **Composer** | `composer create-project melisplatform/melis-platform-skeleton` | المشاريع الجديدة على حزمة Apache/PHP الخاصة بك |
| **مصدر GitHub** | `git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git` | المساهمون والفرق التي تريد سجلّ Git كاملًا |

---

## المتطلبات

بالنسبة إلى Docker، كل شيء مُجمَّع — انتقل إلى [الخيار A](#option-a-docker-recommended) أدناه.
بالنسبة إلى عمليات التثبيت عبر Composer أو المصدر:

- **PHP 8.3 (موصى به)** أو 8.4 (تجريبي) مع الامتدادات: `intl`، `mysqli`،
  `pdo_mysql`، `gd` (freetype/jpeg/webp)، `zip`، `curl`، `mbstring`، `exif`، `xml` (ويُنصح بـ `opcache`). إصدار PHP 8.5 غير قابل للاستخدام بعد (تعتمد Laminas على حدٍّ أقصى عند 8.4).
- **MySQL 8** (تستخدم الحزمة MySQL 8.4).
- **Composer 2** و**Git** (لمساري Composer والمصدر).
- **Apache أو Nginx** مع `mod_rewrite` / `try_files` موجَّهين إلى `public/`.

## الخيار A — Docker (موصى به)

يوفّر Melis مستودع **Docker مخصّصًا لإصدار React**،
[`melis-docker-react`](https://github.com/melisplatform/melis-docker-react)، حيث **تفعّل كل حزمة الواجهة الخلفية بتقنية React افتراضيًا** (`WITH_REACT=1`) — فتحصل على `/melis` (الكلاسيكية) **و** `/melis-react` جاهزين للاستخدام. استنسخه مرة واحدة، ثم اختر حزمة (كل مجلد قائم بذاته، وله ملف `docker-compose.yml` و`.env.example` و`conf/` و`README.md` الخاصة به):

```bash
git clone https://github.com/melisplatform/melis-docker-react.git
cd melis-docker-react
```

| الحزمة (المجلد)  | ما الذي تحصل عليه | الأنسب لـ |
|---|---|---|
| **`prebuilt/`**  | تسحب صورة جاهزة للتشغيل + MySQL — دون بناء محلي | التقييم الأسرع |
| **`install/`**   | تبني هيكلًا جديدًا داخل `./melis` على جهازك المضيف (قابل للتحرير) + خادم تطوير Vite | العمل على الشيفرة / واجهة React |
| **`fpm/`**       | nginx + PHP-FPM، مع دمج الهيكل داخل الصورة | طوبولوجيا بأسلوب الإنتاج |
| **`app/latest/`**| تركّب مشروع Melis **موجودًا مسبقًا** (تعيد كتابة ملف `composer.json` الخاص بك — احفظ التغييرات أولًا) | المشاريع التي لديك بالفعل |
| **`dev/`**       | صور أساسية لكل إصدار PHP فقط (Apache/FPM، PHP 8.1–8.5) | بناء صورك الخاصة |

كل مسار ينتهي بالطريقة نفسها: **مثبّت الويب الأصلي لـ Melis** على
<http://localhost:8080> (`/melis/setup`) يُعدّ مخطط قاعدة البيانات، ومستخدم المسؤول، والموقع التجريبي الاختياري. عملية التثبيت **ليست** مؤتمتة عبر السكربتات — مثبّت الويب هو المرجع المعتمد.

### الأسرع — الصورة الجاهزة مسبقًا

```bash
cd prebuilt
cp .env.example .env
docker compose up -d
# Open http://localhost:8080 and follow the web installer
```

عندما يطلب المثبّت بيانات قاعدة البيانات، استخدم القيم الافتراضية في `.env`:

| الحقل | القيمة |
|---|---|
| Host | `melis-db` &nbsp;*(بدون `:port`)* |
| Database / User / Password | `melis` / `melis` / `melis` |

### بناء جاهز للتشغيل (شيفرة قابلة للتحرير على جهازك المضيف)

يشغّل الإقلاع الأول أمر `composer create-project` للهيكل داخل `./melis` (بضع دقائق)؛ تبقى الشيفرة على جهازك المضيف وقابلة للتحرير. تشغّل هذه الحزمة أيضًا **خادم تطوير Vite** لإعادة التحميل الفوري لواجهة React:

```bash
cd install
cp .env.example .env
mkdir -p melis            # pre-create the bind mount (WSL / Rancher Desktop)
docker compose up -d --build
```

تعرض الحزمة ما يلي:

| الخدمة | الرابط |
| --- | --- |
| الواجهة الأمامية | <http://localhost:8080> |
| **الواجهة الخلفية بتقنية React** | <http://localhost:8080/melis-react> |
| الأدوات الكلاسيكية | <http://localhost:8080/melis> |
| واجهة React مع إعادة التحميل الفوري (Vite) | <http://localhost:5173> |

::: tip القيم الافتراضية والنصائح
مضيف قاعدة البيانات `melis-db` (بدون منفذ)، وقاعدة البيانات / المستخدم / كلمة المرور `melis` / `melis` / `melis`. غيّر `HOST_PORT` في `.env` إذا كان المنفذ 8080 مستخدمًا. **لا حاجة إلى رمز GitHub** — تُحلّ كل حزمة (وحدات React ونسخ `laminas-*` المتفرّعة) من Packagist. اختصارات `make`: `make up STACK=install`، `make logs`، `make shell`، `make down`، `make up VITE=1`، `make adminer`.
:::

::: warning غيّر بيانات الاعتماد قبل الانتقال إلى الإنتاج
بيانات الاعتماد الافتراضية `melis` / `melis` وكلمة مرور قاعدة البيانات مخصّصة للتطوير المحلي فقط.
غيّرها قبل عرض أي نسخة للعموم.
:::

### كيف تُفعَّل الواجهة الخلفية بتقنية React

يسحب Composer الإصدارات المستقرة **6.x** لثلاث وحدات: [`melis-core`](/ar/reference/modules/melis-core)
(تتضمّن بناء إنتاج مثبّتًا لتطبيق React، يُقدَّم تحت `/MelisCore/ui-react/` — دون Node.js
أثناء التشغيل)، و[`melis-react-api`](/ar/reference/modules/melis-react-api) (واجهة JSON البرمجية تحت
`/melis/react-api/*`)، و[`melis-react-override`](/ar/reference/modules/melis-react-override) (مسار
SPA على `/melis-react` + جسر iframe الذي يعرض الأدوات التي لم تُرحَّل بعد داخل قشرة React). هل تفضّل Melis القديمة العادية؟ اضبط `WITH_REACT=0` في `.env` قبل أول `up`.

لتشغيل عدة حزم في وقت واحد دون التلاعب بالمنافذ، يوجد وسيط `nginx-proxy` مشترك اختياري في
`local-proxy/` يوجّه أسماء المضيفين `*.local` — راجع ملف README الخاص بالمستودع.

## الخيار B — Composer (مشروع جديد على حزمتك)

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

وجّه مضيفًا افتراضيًا (virtual host) في Apache إلى دليل **`public/`** الخاص بالمشروع، وأعلن عن متغيّري بيئة Melis الاثنين:

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

أضف `127.0.0.1 www.mysite.local` إلى ملف hosts لديك، وأعد تحميل Apache، ثم افتح
`http://www.mysite.local/melis-react`.

## الخيار C — مصدر GitHub (المساهمون)

تتواجد كل وحدة في مستودعها الخاص، مُضمَّنة كوحدة Git فرعية (submodule):

```bash
git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git
# Already cloned? Pull all submodules:
git submodule update --init --recursive

cd melis-platform-skeleton
composer install
```

ثم اتّبع الإعداد نفسه للمضيف الافتراضي وقاعدة البيانات كما في الخيار B أعلاه.

## متغيّرا بيئة Melis الاثنان

كل عملية تثبيت لـ Melis مدفوعة بمتغيّرين (يُضبطان في `docker-compose.yml` لـ Docker، أو عبر
`SetEnv` لـ Apache):

- **`MELIS_PLATFORM`** — يحدّد البيئة. وهو يختار ملف الإعداد
  `config/autoload/platforms/<MELIS_PLATFORM>.php`، الذي يحمل **اتصال قاعدة البيانات** (وبذلك
  يحمّل `MELIS_PLATFORM=local` الملف `config/autoload/platforms/local.php`).
- **`MELIS_MODULE`** — يحدّد أي **وحدة موقع** تُقدَّم كواجهة أمامية لهذا النطاق.

## تعرّف على الواجهة الخلفية بتقنية React

افتح **`/melis-react`** وسجّل الدخول — يعرض تطبيق React شاشة تسجيل دخول خاصة به ويتولّى المصادقة بنفسه. بمجرد دخولك، تصل إلى لوحة المعلومات: فقاعات الإشعارات، وعدّادات مؤشرات الأداء الرئيسية (المستخدمون / المواقع / الصفحات / اللغات)، ونشاط عمليات تسجيل الدخول الأخيرة، وتخطيط البطاقات المحفوظ لديك.

بعض الأمور الجديرة بالمعرفة عند التعامل الأول:

- **القائمة الجانبية.** شجرة التنقّل بأكملها موجودة هناك، **مصفّاة مسبقًا وفق صلاحياتك** — تظهر الأداة فقط إذا كانت وحدتها مفعّلة وكنت مخوَّلًا لاستخدامها. انقر على مدخل لفتح الأداة المقابلة في اللوحة الرئيسية.
- **أدوات React الأصلية ("bricks").** أُعيدت كتابة العديد من الأدوات كصفحات React أصلية لتجربة أسرع وأكثر سلاسة. يحمل كل منها مفتاح تبديل **New (React) / Old (iframe)** حتى يمكنك التبديل إلى النسخة الكلاسيكية من الأداة نفسها متى احتجت.
- **الأدوات الكلاسيكية لا تزال تعمل.** تُفتح أي أداة لم تُعَد كتابتها بعد بسلاسة داخل القشرة — بنفس جداول DataTables والنماذج والتبويبات والنوافذ المنبثقة وأزرار الحفظ كما كانت. تبدو وتتصرف تمامًا مثل الواجهة الخلفية الكلاسيكية `/melis`، لكن مؤطّرة داخل واجهة React.
- **رابطان، منصّة واحدة.** `/melis-react` هي التجربة الجديدة؛ وتبقى الواجهة الخلفية الكلاسيكية متاحة على **`/melis`** إن فضّلتها في أي وقت. كلاهما يدير البيانات والصلاحيات والوحدات نفسها.

::: tip المساعد الذكي دائمًا على بُعد نقرة واحدة
يوجد زر **المساعد الذكي (AI Assistant)** عائم في ركن كل شاشة من شاشات الواجهة الخلفية. افتحه للدردشة مع مساعد Melis المدمج دون مغادرة الأداة التي تعمل عليها.

![زر المساعد الذكي العائم في الواجهة الخلفية بتقنية React](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)
:::

راجع [البنية والمفاهيم](./concepts) للنموذج الذهني الكامن وراء القشرة والـ bricks وجسر الأدوات الكلاسيكية، و[مرجع الوحدات](/ar/reference/modules/melis-core) لمعرفة ما تفعله كل أداة.

## الخطوات التالية

- [البنية والمفاهيم](./concepts) — النموذج الذهني الكامن وراء Melis.
- [بناء موقع ويب (CMS)](./build-a-site) — الصفحات والقوالب وأشجار المواقع.
- [أنشئ أداتك الأولى](./create-a-tool) — أضف أداة الواجهة الخلفية الخاصة بك.
- [العمل مع الذكاء الاصطناعي](./ai) — المساعد والوكلاء وMCP داخل Melis.
