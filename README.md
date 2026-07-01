# DITT UNAB — sitio web

Implementacióndel sitio público de la Dirección de Innovación y Transferencia Tecnológica UNAB.

## Qué incluye

- Sitio estático sin dependencias externas de build.
- Rutas reales para Inicio, Servicios, Portafolio, Declaración de invención, Contacto, Recursos, páginas institucionales, Privacidad y Accesibilidad.
- Subpáginas de servicios y fichas individuales de tecnologías.
- Header y footer con enlaces reales.
- Menú mobile accesible, filtros de portafolio y formularios progresivos con validación.
- Funciones serverless para Vercel en `/api/contact` y `/api/declarar`.
- Assets optimizados localmente, favicon, Open Graph, sitemap y robots.txt.

## Comandos

```bash
npm run validate
npm run build
npm run dev
```

`npm run build` ejecuta la validación de enlaces internos y assets. El sitio ya está construido como archivos estáticos en la raíz del proyecto.

## Portafolio de tecnologías

Las páginas de `/portafolio` (grid, filtros, ficha por tecnología y las 3 destacadas del home) se generan con `scripts/build-portfolio.mjs` a partir de fichas `.md` (formato: plantilla institucional de fichas) en `content/fichas/`, carpeta que **no** se sube al repositorio (ver `.gitignore`) porque las fichas suelen traer datos de contacto y notas internas "no publicar".

Flujo para cargar o actualizar tecnologías:

```bash
# 1. coloca/actualiza los .md en content/fichas/
npm run portfolio   # regenera portafolio/, el home y sitemap.xml
npm run validate
git add portafolio/ index.html sitemap.xml && git commit -m "..."
```

Este paso es local: `npm run build` (el que corre Vercel) no depende de `content/fichas/`, solo valida y copia el HTML ya generado y commiteado.

## Deploy en Vercel

Configuración recomendada:

- Framework Preset: Other
- Build Command: `npm run build`
- Output Directory: `public`


## Formularios

Los formularios llaman a:

- `POST /api/contact`
- `POST /api/declarar`

Por defecto validan datos, generan una referencia y responden correctamente. Para reenviar los datos a un CRM, Make, Zapier, Google Apps Script u otro endpoint, configura una de estas variables de entorno en Vercel:

```bash
FORM_WEBHOOK_URL=https://tu-endpoint.example/webhook
DITT_FORMS_WEBHOOK_URL=https://tu-endpoint.example/webhook
```

### Entrega por correo a OTL@UNAB.CL (conector Resend de Vercel)

Las funciones usan **Resend** como conector de correo. Para activarlo:

1. En el panel del proyecto Vercel (`web-ditt-unab-1-0`) → pestaña **Integrations** →
   **Browse Marketplace** → **Resend** → **Add Integration**, y vincúlala a este proyecto.
   Esto crea automáticamente la variable `RESEND_API_KEY` en el proyecto.
   (Alternativa manual: crea la API key en resend.com y agrégala en
   **Settings → Environment Variables** como `RESEND_API_KEY`.)
2. **Verifica un dominio remitente** en Resend (Domains → Add Domain, p. ej. `unab.cl` o un
   subdominio como `mail.ditt.unab.cl`) y publica los registros DNS que indica. Esto es
   **obligatorio para entregar a buzones externos** como `OTL@UNAB.CL`.
3. Configura las variables del remitente/destinatario en Vercel
   (**Settings → Environment Variables**, target *Production*):

   ```bash
   RESEND_API_KEY=re_...            # la crea el conector del Marketplace
   SUBMISSION_FROM_EMAIL=DITT UNAB <notificaciones@TU-DOMINIO-VERIFICADO>
   SUBMISSION_TO_EMAIL=OTL@UNAB.CL  # opcional; OTL@UNAB.CL es el valor por defecto
   ```

4. Vuelve a desplegar (**Deployments → Redeploy**) para que las funciones tomen las variables.

> **Modo de prueba sin dominio:** si dejas el remitente por defecto
> (`onboarding@resend.dev`), Resend en modo prueba **solo entrega al correo dueño de la cuenta
> Resend**, no a terceros. Sirve para validar el flujo, pero para llegar a `OTL@UNAB.CL` en
> producción necesitas el paso 2 (dominio verificado).

Alternativa o complemento (CRM, Make, Zapier, Google Apps Script): reenvío por webhook con

```bash
FORM_WEBHOOK_URL=https://tu-endpoint.example/webhook
```

Si **ningún** canal está configurado o todos fallan, la función registra el envío completo en los
logs de Vercel a nivel `error` (`[contact] SIN ENTREGA...`) para que ninguna postulación se pierda.

### Seguridad de los endpoints

- **CORS**: las funciones responden con `Access-Control-Allow-Origin` fijado al dominio de
  producción. Configura `ALLOWED_ORIGIN` para apuntar a tu dominio final:

  ```bash
  ALLOWED_ORIGIN=https://ditt-unab.vercel.app
  ```

- **Rate-limit**: cada función limita los envíos por IP (5 cada 10 minutos) como defensa
  "best-effort" contra ráfagas. En serverless el estado es por instancia y efímero, por lo que
  no es una garantía absoluta; complementa al honeypot. Para una protección más robusta puede
  añadirse en el futuro un CAPTCHA (p. ej. Cloudflare Turnstile).

## Estructura

```txt
/
  index.html
  servicios/
  portafolio/
  declarar/
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

