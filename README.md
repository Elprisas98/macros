# Macros

Web app instalable en iPhone para contar macros con balanza de cocina.

- **Escribir:** "180 g de pollo a la plancha y 150 g de arroz" → macros por alimento.
- **Etiqueta:** foto de la tabla nutricional → valores por 100 g, se guarda en *Mis alimentos*.
- **Foto del plato:** Claude identifica cada componente y estima los gramos (corrígelos con la balanza).
- **Mis alimentos:** lo guardado se agrega sin IA, solo con los gramos.
- Datos: calorías, proteína, carbos, grasa, fibra, azúcar, grasa saturada, sodio.

Todo se guarda en el teléfono (localStorage). La IA usa tu API key de Anthropic, que se guarda solo en el teléfono y se envía únicamente a `api.anthropic.com`.

## Instalar en el iPhone
1. Abre la URL de GitHub Pages en **Safari**.
2. Toca Compartir → **Agregar a pantalla de inicio**.
3. Abre la app → Ajustes → pega tu API key (console.anthropic.com → API Keys).

## Actualizar
Sitio estático sin build. Edita los archivos, sube `VERSION` en `sw.js` y haz push a `main`.
Íconos: `node tools/make-icons.js`.
