# Notas de implementación

## Cambios realizados

- Sustitución del HTML autoempaquetado por una estructura de producción.
- Reemplazo de navegación por estado React por URLs reales.
- Creación de subpáginas para servicios, tecnologías, recursos, legales e institucionales.
- Mejora responsive con grillas adaptativas y menú móvil accesible.
- Formularios conectados a funciones API de Vercel.
- Limpieza visual manteniendo azul #0C2340, rojo #A6192E, Montserrat vía Google Fonts, cards y lenguaje institucional.

## Pendientes editoriales antes de producción oficial

- Confirmar datos de contacto definitivos.
- Reemplazar fichas de tecnología demo por fichas aprobadas.
- Validar textos legales con la unidad responsable.
- Configurar dominio final y actualizar `siteUrl` en sitemap/metadata si no será `ditt-unab.vercel.app`.

## Assets y tipografía

- Los logos del prototipo se optimizaron como PNG separados dentro de `assets/images/logos`.
- No se incluyen archivos de fuentes locales en el paquete; la tipografía Montserrat se carga desde Google Fonts y mantiene fallback a Helvetica/Arial.
