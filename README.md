# DITT UNAB — sitio listo para Vercel

Implementación profesionalizada del sitio público de la Dirección de Innovación y Transferencia Tecnológica UNAB.

## Qué incluye

- Sitio estático sin dependencias externas de build.
- Rutas reales para Inicio, Servicios, Portafolio, Postulación, Contacto, Recursos, páginas institucionales, Privacidad y Accesibilidad.
- Subpáginas de servicios y fichas individuales de tecnologías.
- Header y footer con enlaces reales.
- Menú mobile accesible, filtros de portafolio y formularios progresivos con validación.
- Funciones serverless para Vercel en `/api/contact` y `/api/postular`.
- Assets optimizados localmente, favicon, Open Graph, sitemap y robots.txt.

## Comandos

```bash
npm run validate
npm run build
npm run dev
```

`npm run build` ejecuta la validación de enlaces internos y assets. El sitio ya está construido como archivos estáticos en la raíz del proyecto.

## Deploy en Vercel

Configuración recomendada:

- Framework Preset: Other
- Build Command: `npm run build`
- Output Directory: `public`


Puedes subir el proyecto de dos formas:

1. Conectar un repositorio Git en Vercel.
2. Arrastrar la carpeta del proyecto desde el panel de Vercel.

La configuración `vercel.json` mantiene URLs limpias, cabeceras básicas de seguridad y cache para assets.

## Formularios

Los formularios llaman a:

- `POST /api/contact`
- `POST /api/postular`

Por defecto validan datos, generan una referencia y responden correctamente. Para reenviar los datos a un CRM, Make, Zapier, Google Apps Script u otro endpoint, configura una de estas variables de entorno en Vercel:

```bash
FORM_WEBHOOK_URL=https://tu-endpoint.example/webhook
DITT_FORMS_WEBHOOK_URL=https://tu-endpoint.example/webhook
```

También puedes enviar correos mediante Resend configurando:

```bash
RESEND_API_KEY=
SUBMISSION_TO_EMAIL=
SUBMISSION_FROM_EMAIL=
```

## Estructura

```txt
/
  index.html
  servicios/
  portafolio/
  postular/
  contacto/
  recursos/
  institucional/
  assets/
  api/
  scripts/
  docs/
```

## Licencia y restricciones de uso

Este proyecto esta sujeto a una licencia de uso restringido. No se autoriza la copia, reproduccion, redistribucion, modificacion, despliegue, sublicenciamiento ni reutilizacion total o parcial sin autorizacion previa, expresa y por escrito de la OTL UNAB.

Las autorizaciones deben solicitarse al correo `otl@unab.cl`. Ver `LICENSE.md`.

## Notas editoriales

- Actualizar dominio final en `sitemap.xml` y metadatos si no se usará `https://ditt-unab.vercel.app`.
- Reemplazar fichas demo por tecnologías oficialmente aprobadas.
- Validar textos legales y datos de contacto con la unidad responsable.

## Licencia

Este proyecto se entrega bajo una licencia de uso restringido. La copia, reproducción, distribución, modificación o reutilización total o parcial sin autorización previa y escrita de la OTL UNAB está prohibida.

Las autorizaciones deben solicitarse a `otl@unab.cl`. Revisa `LICENSE.md` para el texto completo.
