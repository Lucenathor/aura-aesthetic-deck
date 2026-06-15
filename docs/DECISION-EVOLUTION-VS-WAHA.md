# Decisión: Evolution API vs WAHA para AURA

He analizado las dos a fondo (documentación oficial, GitHub, hilos de comunidad n8n, comparativas). Aquí está la decisión razonada.

## Tabla de decisión (lo que importa para AURA)

| Criterio | Evolution API | WAHA |
|---|---|---|
| **Licencia / coste** | Apache 2.0, **100% libre** también para multi-instancia | Core gratis, pero la versión seria (**WAHA Plus**, multi-sesión) es **de pago** |
| **Multi-cliente (cada clínica un QR)** | **Nativo y gratis**, gestión multi-instancia de serie | Multi-sesión real requiere WAHA Plus (pago) |
| **API + webhooks para desarrollar** | REST muy completa, webhooks de todo, "production-ready" | REST limpia, Swagger, webhooks; muy buena DX |
| **Estabilidad en producción** | **Reportada como más estable** (ver foros) | Usuarios reportan **timeouts y reinstalaciones** frecuentes |
| **Comunidad / soporte** | Enorme (España/LATAM), nodo n8n sólido, mucho material | Buena y en inglés, pero menor |
| **Facilidad de arranque** | Fácil (Docker, deploy en Railway/VPS en minutos) | Muy fácil ("un comando"), doc en inglés |
| **Idioma de la doc** | Mucho en portugués (con versión EN) | Inglés |
| **Madurez** | Estándar de facto del sector | Sólida pero más pequeña |

## El dato que inclina la balanza
En la **comunidad oficial de n8n** (abril 2026), un usuario harto de WAHA escribe: *"WAHA me da timeouts una y otra vez, a veces tengo que reinstalarlo entero. Pienso pasarme a Evolution"* → respuesta del top supporter: ***"Cámbiate a Evolution API, es mucho más estable que WAHA y el nodo de la comunidad funciona sólido."***

Y el punto de coste: **WAHA cobra por la multi-sesión** (justo lo que AURA necesita: muchas clínicas, muchos números). **Evolution API da multi-instancia gratis** bajo licencia Apache 2.0. Para escalar a 140 clínicas, esto es determinante.

## DECISIÓN: **Evolution API** ✅

**Por qué, en una frase:** es **gratis incluso en multi-cliente** (clave para escalar a muchas clínicas sin coste de licencia por sesión), es la **más estable** en producción según la propia comunidad, tiene la **API y webhooks más completos** para desarrollar todo lo que quieras encima, y es el **estándar del sector** con la mayor comunidad en español. WAHA es excelente y más simple en inglés, pero su multi-sesión de pago y los timeouts reportados la dejan en segundo lugar para nuestro caso.

### Cómo encaja en AURA (resumen del plan)
1. **Servidor:** un VPS con Evolution API en Docker (un servidor pequeño aguanta muchas instancias de clínicas).
2. **Conexión por clínica:** botón "Conectar WhatsApp" en el panel → muestra el QR de su instancia → la clínica lo escanea → conectada. Configuración tan fácil como Wazzap.
3. **Bandeja de chat en AURA:** los mensajes entran por webhook de Evolution → se guardan en la BD ligados a la ficha del paciente (trazabilidad con pipeline y agenda) → se responden desde el panel.
4. **Uso de bajo riesgo:** cliente inicia, sin spam (recordatorios siguen por SMS), número real de la clínica, calentamiento gradual → riesgo de baneo bajo.

### Lo único a asumir
Un **servicio propio siempre encendido** (el VPS con Evolution). Es estándar, barato y bajo nuestro control. A cambio: cero coste de licencia, multi-cliente ilimitado y API total para construir.

**Conclusión: vamos con Evolution API.**
