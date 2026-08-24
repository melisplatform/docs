---
layout: home

hero:
  name: Melis Platform v6
  text: توثيق المطورين
  tagline: أنشئ ووسّع وشغّل المواقع والتطبيقات على المنصّة مفتوحة المصدر القائمة على Laminas — مع واجهة إدارة خلفية حديثة مبنية على React.
  actions:
    - theme: brand
      text: ابدأ الآن ←
      link: /ar/guide/getting-started
    - theme: alt
      text: مرجع الوحدات ←
      link: /ar/reference/modules

features:
  - icon:
      light: /icons/bolt-light.svg
      dark: /icons/bolt-dark.svg
    title: التثبيت في دقائق
    details: ثلاثة مسارات — Docker أو Composer أو المصدر من GitHub. اختر ما يناسب سير عملك واحصل على واجهة إدارة خلفية جاهزة للعمل في دقائق.
    link: /ar/guide/getting-started
    linkText: دليل التثبيت
  - icon:
      light: /icons/layers-light.svg
      dark: /icons/layers-dark.svg
    title: البنية والمفاهيم
    details: الوحدات، وشجرة الإعدادات، ومفاتيح melis، والمناطق وعمليات التوجيه (forwards) — خمسة مفاهيم تفتح لك كل جزء من المنصّة.
    link: /ar/guide/concepts
    linkText: اقرأ المفاهيم
  - icon:
      light: /icons/globe-light.svg
      dark: /icons/globe-dark.svg
    title: بناء موقع ويب (CMS)
    details: الصفحات، والقوالب، وأشجار المواقع، والروابط اللطيفة (slugs)، وتعدد اللغات — كل ما تحتاجه لتقديم موقع قائم على المحتوى باستخدام MelisCms.
    link: /ar/guide/build-a-site
    linkText: ابنِ موقعًا
  - icon:
      light: /icons/wrench-light.svg
      dark: /icons/wrench-dark.svg
    title: أنشئ أدواتك الخاصة
    details: أضف أداة إدارة خلفية متكاملة — متحكمات، وخدمات، وواجهات عرض Laminas، وإدارة الصلاحيات وأكثر.
    link: /ar/guide/create-a-tool
    linkText: أنشئ أداة
  - icon:
      light: /icons/bag-light.svg
      dark: /icons/bag-dark.svg
    title: التجارة الإلكترونية
    details: المنتجات، والطلبات، والعملاء، والفواتير — يمنحك MelisCommerce طبقة تجارة إلكترونية معيارية فوق نظام إدارة المحتوى.
    link: /ar/guide/commerce
    linkText: دليل التجارة
  - icon:
      src: /icons/melis-ai.svg
    title: الذكاء الاصطناعي وMCP
    details: يأتي MelisAI مزوّدًا بإطار عمل مدمج للوكلاء وخادم MCP بحيث تستطيع أدوات نماذج اللغة الكبيرة قراءة منصّتك والكتابة إليها عبر واجهات برمجية منظّمة.
    link: /ar/guide/ai
    linkText: دليل الذكاء الاصطناعي
  - icon:
      light: /icons/cube-light.svg
      dark: /icons/cube-dark.svg
    title: 50 وحدة موثّقة
    details: كل وحدة في الإصدار المجتمعي (Community Edition) — الغرض، والخدمات، وأدوات الإدارة الخلفية، ومساعِدات الواجهة الأمامية، وجداول قاعدة البيانات وأمثلة برمجية حقيقية.
    link: /ar/reference/modules
    linkText: مرجع الوحدات
  - icon:
      light: /icons/sliders-light.svg
      dark: /icons/sliders-dark.svg
    title: مرجع الإعدادات
    details: كل مفتاح إعدادات تقرأه المنصّة، مع النوع والقيمة الافتراضية والأمثلة — مصدر موحّد للحقيقة لـ MELIS_PLATFORM وما يرتبط به.
    link: /ar/reference/configuration
    linkText: مرجع الإعدادات
---

## ما هي Melis Platform؟

**Melis Platform** هي نظام إدارة محتوى ومنصّة تطبيقات مفتوحة المصدر مبنية على
**[Laminas](https://getlaminas.org/)** (خليفة Zend Framework / ZF2). تأتي بواجهة **إدارة خلفية**
معيارية لإدارة المواقع، والصفحات، والتجارة الإلكترونية، والمحتوى وأكثر — وهي مصمّمة
لتكون قابلة **للتوسيع** بوحداتك وأدواتك الخاصة.

يغطّي هذا التوثيق الإصدار **v6**، الذي يحافظ على نفس إطار العمل والوحدات وواجهات البرمجة بينما
يستبدل الإدارة الخلفية بـ **واجهة React حديثة** على المسار `/melis-react`. أُعيد بناء الأدوات على هيئة
"لبنات" (bricks) أصلية بـ React، لكل منها مفتاح تبديل بين الجديد والقديم للرجوع إلى الأداة الكلاسيكية داخل iframe، كما تتوفّر
طبقة عائمة عامة لـ **المساعد الذكي (AI Assistant)** عبر الواجهة بأكملها.

وهو موجّه إلى **المطورين**: من التثبيت الأول مرورًا بالبنية، وبناء المواقع والأدوات،
ودمج التجارة الإلكترونية، وإضافة قدرات الذكاء الاصطناعي، وصولًا إلى مرجع واجهة برمجة الوحدات الكامل.
للاطلاع على المنتج، تفضّل بزيارة **[melisplatform.com](https://www.melisplatform.com/)**.

> يبقى توثيق الإصدار v5 متاحًا ضمن **[/legacy/](/legacy/)**.

> 🇫🇷 Cette documentation est aussi disponible en **[français](/fr/)**.
