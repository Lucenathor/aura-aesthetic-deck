# Por qué las gestionadas aguantan (y nosotros no) — mismo código, distinta operación

Tienes razón: WasenderApi, 2Chat, Evolution Cloud usan **el mismo motor que nosotros** (Baileys, la librería que imita WhatsApp Web). El código es casi idéntico. La diferencia NO está en el código, está en **cómo lo instalan y lo operan**. Aquí está, punto por punto, dónde nos superan.

---

## Dónde nos superan (las 6 diferencias reales)

### 1. La IP del servidor (lo más importante)
- **Nosotros (Railway):** IP de datacenter compartida. WhatsApp sabe que es un servidor, no un móvil/casa → la marca como sospechosa → rechaza vinculaciones y tira la sesión. Por eso salía "no se pueden vincular".
- **Ellos:** usan **IPs limpias/residenciales o dedicadas con buena reputación**, a veces una IP distinta por sesión. La conexión parece "de verdad".
- **Fuente:** los foros lo confirman ("WhatsApp bans when IP reputation is low"; "cada sesión en infraestructura optimizada, no expone tu IP").

### 2. Recursos del servidor (RAM/CPU)
- **Nosotros:** contenedor pequeño en Railway. Cuando Baileys genera claves + llega el historial, se satura → timeout 408 → cae.
- **Ellos:** servidores dimensionados (mín. 4-8 GB RAM por nodo), con el motor "NOWEB" (sin navegador Chromium, mucho más ligero) y reparto de sesiones (sharding). Aguantan cientos de sesiones sin ahogarse.

### 3. Reconexión automática y "auto-reparación"
- **Nosotros:** si la sesión cae, se queda caída hasta que recreamos a mano.
- **Ellos:** **auto-reconnect con backoff exponencial**, vigilancia de salud de sesión, y re-login automático. "Las sesiones siguen online 24/7" porque tienen un sistema que las levanta solas.

### 4. Versión de WhatsApp Web siempre al día
- **Nosotros:** teníamos que adivinar/fijar el número de versión a mano (y caducaba cada pocos días → QR vacío).
- **Ellos:** **actualizan la versión automáticamente** cada vez que WhatsApp cambia el protocolo. Nunca se quedan desfasados.

### 5. Comportamiento "humano" (anti-detección)
- Hay middleware (ej. `baileys-antiban`) que inyecta **señales humanas**: indicadores de "escribiendo", lecturas con retraso, presencia que va y viene, ritmo con variación (jitter gaussiano), calentamiento de 7 días para números nuevos.
- WhatsApp marca lo "demasiado perfecto" como bot. Ellos imitan a un humano. Nosotros no hacíamos nada de esto.

### 6. Caché y persistencia bien montadas
- Redis dedicado, almacenamiento de sesión persistente, cada worker con su base. Evita el "session_not_found" y el "connection_closed" tras reinicios.

---

## Resumen brutal (la frase clave)
> El código de Baileys es gratis y abierto. Lo que cuesta dinero —y es donde ellos ganan— es **la operación: IPs limpias, servidores grandes, reconexión automática, versión siempre actualizada y comportamiento humano.** Eso es lo que convierte "el mismo código" en un servicio que "simplemente funciona".

Para una clínica, su WhatsApp es sagrado. Replicar TODO esto nosotros (IPs residenciales rotativas, sharding, auto-reparación, anti-ban, mantenimiento de versión) es **montar una empresa de infraestructura entera** — justo lo que ellos venden por 6-30$/mes.

---

## Qué podemos hacer (3 caminos)

### Camino A — Mejorar NUESTRA instalación de Evolution (para que aguante más)
Aplicable ya, mejora bastante la estabilidad (aunque no nos hace inmunes):
1. **Subir recursos del servidor** (Railway a 4-8 GB RAM) → evita el 408 y caídas por saturación.
2. **Mantener la versión de WhatsApp Web auto-actualizada** (un job que lea la versión vigente y la actualice sola).
3. **Reconexión automática** (que al caer una sesión se reconecte sola con backoff).
4. **Modo sin historial** (ya lo tenemos: evita el tsunami que satura).
5. **Opcional avanzado:** un **proxy residencial** por instancia (IP limpia) → esto es lo que más sube la fiabilidad, pero añade coste y complejidad.

### Camino B — Usar una gestionada (que ya hace TODO lo de arriba)
WasenderApi / 2Chat. Pagas 6-30$/mes y te olvidas de IP, RAM, versión, reconexión y anti-ban. Es comprar hecho lo que el Camino A intenta replicar.

### Camino C — API oficial de Meta (360dialog)
Cero de todo esto (no es Baileys, es el canal oficial). Máxima estabilidad, pero alta por clínica.

---

## Mi recomendación honesta
- **Para que AURA sea un producto serio para clínicas, NO deberíamos mantener nosotros la infraestructura de Baileys.** Es un trabajo a tiempo completo (IPs, RAM, versiones, anti-ban, reconexión) y aun así no igualaríamos a quien se dedica a eso.
- **Lo inteligente:** usar una **gestionada** (WasenderApi/2Chat) que ya hace todo esto por 6-30$/mes, o la **oficial (360dialog)** para escala seria. Nosotros nos centramos en lo que aporta valor: la bandeja, la IA, la ficha del paciente (que ya está construida).
- El Camino A (mejorar Railway) sirve para **seguir probando/demostrando** ahora que ya conecta, pero **no lo usaría en producción** con el WhatsApp real de clínicas.

En una frase: **no es que lo hayamos hecho "mal"; es que ellos operan una infraestructura especializada que no tiene sentido replicar.** Su negocio es justo vendernos esa operación hecha.
