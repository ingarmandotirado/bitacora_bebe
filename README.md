# Bitácora de José Gabriel

App de un solo archivo (`index.html`) para registrar la rutina y la salud del bebé desde el teléfono, con botones grandes y pocos toques. Se sincroniza entre los teléfonos de mamá y papá con **Firebase** (gratis).

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

## Activar la sincronización (una sola vez, ~10 minutos, desde la computadora)

### 1. Crear el proyecto
1. Entra a https://console.firebase.google.com con tu cuenta de Google.
2. **Crear un proyecto** → nombre `bitacora-bebe` → desactiva Google Analytics → **Crear**.

### 2. Cuentas de mamá y papá
1. Menú izquierdo **Compilación → Authentication → Comenzar**.
2. Pestaña **Método de acceso** → **Correo electrónico/contraseña** → activa el primer interruptor → **Guardar**.
3. Pestaña **Usuarios** → **Agregar usuario** → tu correo y una contraseña. Repite con el correo de tu pareja.
4. Pestaña **Configuración** → **Acciones del usuario** → **desmarca "Habilitar la creación (registro)"** → Guardar. Así nadie más puede crear cuentas.

### 3. Base de datos
1. **Compilación → Firestore Database → Crear base de datos**.
2. Ubicación: `nam5 (United States)` → **Iniciar en modo de producción** → Crear.
3. Pestaña **Reglas**: borra lo que hay, pega el contenido de [`firestore.rules`](firestore.rules), **cambia los dos correos por los de ustedes** y pulsa **Publicar**.

### 4. Conectar la app
1. Engrane ⚙️ → **Configuración del proyecto** → **General** → abajo, en *Tus apps*, el ícono **`</>`** (Web).
2. Apodo `bitacora` (no marques Hosting) → **Registrar app**.
3. Copia los valores del objeto `firebaseConfig` que aparece (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
4. En GitHub abre [`config.js`](config.js) → lápiz ✏️ → pega cada valor en su lugar → **Commit changes**.

En 1 o 2 minutos GitHub Pages publica el cambio. Abre la app en cada teléfono, entra con su correo y contraseña, y listo. Si un teléfono ya tenía registros guardados, la app ofrece **subirlos a la bitácora compartida**.

> Los valores de `config.js` identifican el proyecto y pueden ser públicos. Lo que protege los datos del bebé son las reglas de Firestore (solo sus dos correos) y que el registro de cuentas nuevas esté desactivado.

## Cómo funciona la sincronización
- Lo que registra uno aparece en el teléfono del otro en segundos, con un aviso ("Papá registró Pañal 💧").
- Los temporizadores (pecho, sueño, barriga) son compartidos: uno puede iniciarlo y el otro terminarlo.
- **Sin conexión** se sigue registrando; se envía solo al volver la señal.
- El plan gratuito de Firebase (Spark) alcanza de sobra para una familia.

## Dónde se guardan los datos
| Situación | Datos |
|---|---|
| `config.js` con tu proyecto de Firebase | Compartidos y sincronizados entre teléfonos |
| `config.js` sin configurar (`PEGA_AQUI`) | Solo en el navegador de ese teléfono |

Respaldo manual en cualquier momento: **Ajustes → Exportar / Importar** (archivo `.json`).

## Instalar en el teléfono
Abre la app en el navegador del teléfono → compartir / menú → **Agregar a pantalla de inicio**.

> Herramienta de observación; no sustituye la valoración del pediatra.
