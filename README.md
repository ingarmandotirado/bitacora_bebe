# Bitácora de José Gabriel

App de un solo archivo (`index.html`) para registrar la rutina y la salud del bebé desde el teléfono, con botones grandes y pocos toques. Se sincroniza entre los teléfonos de mamá y papá a través de una **hoja de Google Sheets**.

**App:** https://ingarmandotirado.github.io/bitacora_bebe/

## Qué registra
- **Alimentación:** pecho (temporizador por lado y lado sugerido), biberón (leche materna o fórmula, en **ml u oz**), sólidos y extracción de leche.
- **Pañales:** pipí y popó, con color (tarjeta colorimétrica) y consistencia.
- **Sueño:** temporizador, calidad, lugar y ventana de vigilia según la edad.
- **Tiempo de barriga** con meta diaria por edad.
- **Salud:** temperatura, medicinas, suplementos diarios (vitamina D), síntomas, baño y notas.
- **Vacunas:** Esquema de Vacunación Universal (Cartilla Nacional de Salud) con fecha de cada dosis y su estado.
- **Crecimiento:** peso, talla y perímetro cefálico con percentiles OMS (niños, 0–12 meses).
- **Consultas:** tamizajes, consultas de niño sano y un registro de consultas y estudios.

Avisa cuando se registra lo mismo dos veces en poco tiempo (en medicinas, dentro de 4 h) y muestra alertas como fiebre en menores de 3 meses, heces pálidas o pocos pañales mojados.

## Conectar la hoja de Google (una sola vez, ~3 minutos, desde la computadora)

La hoja **"Bitácora José Gabriel"** ya existe en Google Drive con sus pestañas *Eventos* y *Datos*. Solo falta conectarla:

1. Abre la hoja → menú **Extensiones → Apps Script**.
2. Borra lo que aparece en el editor y pega todo el contenido de [`sheets/Codigo.gs`](sheets/Codigo.gs) (botón *Copy raw file* en GitHub). Pulsa 💾 **Guardar**.
3. Arriba a la derecha: **Implementar → Nueva implementación**.
4. En el engrane ⚙️ junto a *Seleccionar tipo* elige **App web**.
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier usuario**
5. **Implementar** → **Autorizar acceso** → elige tu cuenta.
   Google mostrará "Google no verificó esta app" (es normal: la app eres tú). Toca **Configuración avanzada → Ir a … (no seguro) → Permitir**.
6. Copia la **URL de la app web** (termina en `/exec`) y mándasela a Claude, o pégala en la app en **Ajustes → Sincronización → Conectar**.

Después, en **Ajustes → Copiar enlace para tu pareja**, manda ese enlace por WhatsApp: al abrirlo, su teléfono queda conectado.

> La dirección `/exec` funciona como llave: cualquiera que la tenga puede leer y escribir la bitácora. Compártela solo entre ustedes dos y no la publiques.

## Cómo funciona la sincronización
- Cada registro se guarda como una fila en la pestaña **Eventos** (fecha, hora, tipo, detalle y quién lo registró), así que la hoja también sirve para consultar o analizar.
- Lo que registra uno aparece en el teléfono del otro en unos 20 segundos, o al volver a abrir la app, con un aviso ("Papá registró Pañal 💧").
- Los temporizadores (pecho, sueño, barriga) son compartidos: uno puede iniciarlo y el otro terminarlo.
- **Sin conexión** se sigue registrando; se envía solo al volver la señal.
- No edites a mano las columnas ocultas (ID, Datos, Actualizado, Estado): la app las usa para sincronizar.

## Respaldo
**Ajustes → Exportar / Importar** (archivo `.json`). Además, la hoja de Google es en sí un respaldo.

## Instalar en el teléfono
Abre la app en el navegador del teléfono → compartir / menú → **Agregar a pantalla de inicio**.

> Herramienta de observación; no sustituye la valoración del pediatra.
