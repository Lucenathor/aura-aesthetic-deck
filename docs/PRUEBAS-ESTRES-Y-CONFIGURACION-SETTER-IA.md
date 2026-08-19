# Pruebas de estrés y configuración del Setter IA

**Fecha:** 19 de agosto de 2026  
**Ámbito:** biblioteca de recursos por clínica/tratamiento, carga de vídeo de gran tamaño y cerebro aislado por embudo.

## Arquitectura aplicada

| Capa | Implementación | Efecto operativo |
|---|---|---|
| Aislamiento | Ruta R2 `setter/{tenant}/{treatment}/...` y autorización de tenant en cada endpoint. | Un propietario trabaja solo con los recursos y el cerebro de su clínica. |
| Vídeo grande | Carga multipart a R2: sesión persistente, fragmentos de 5 MB, reintentos y finalización explícita. | Un corte de red no obliga a que el Worker reciba el vídeo completo en una única petición. |
| Límite | El endpoint multipart acepta vídeos de hasta **500 MB**; las imágenes mantienen un máximo de 10 MB. | El panel admite una explicación larga del equipo, no solo clips cortos. |
| Reproducción | Servicio `/img/` con soporte HTTP `Range`, `206 Partial Content` y `Accept-Ranges: bytes`. | El reproductor puede empezar sin descargar el vídeo completo. |
| Biblioteca | Casos antes/después, vídeo explicado, finalidad por objeción, estado y autorización. | El Setter puede recuperar la prueba que corresponde a una duda y evita enviar borradores. |
| Cerebro por embudo | Objetivo, cualificación natural, límites clínicos, instrucciones, conocimiento, voz, ciudad y promoción. | La misma base del Setter se especializa de forma independiente por clínica y tratamiento. |

## Prueba de carga realizada

Se preparó un vídeo público MP4 de **104.047.011 bytes** (aprox. 100 MB) y se cargó desde la biblioteca real de `aura-demo`, junto con una foto antes y una foto después. La carga inicial directa reveló correctamente el límite de una petición única; se sustituyó por multipart autenticado a R2.

| Prueba | Resultado |
|---|---|
| Inicio multipart | Sesión persistente creada correctamente en D1. |
| Vídeo público de 100 MB | Subida finalizada desde el panel mediante fragmentos y con progreso visible. |
| Dos imágenes en el mismo caso | Ambas aparecieron en sus previews independientes de antes y después. |
| Vídeo en el panel | Reproductor HTML5 con `readyState=4` y controles activos. |
| HTTP Range tras la mejora | Solicitud `bytes=0-1023`: `206`, `Content-Range: bytes 0-1023/104047011`, `Accept-Ranges: bytes`, 1.024 bytes servidos. |
| Organización | Los objetos quedaron bajo `setter/aura-demo/aumento-de-labios/` para el vídeo y en la carpeta del tratamiento indicada para las fotos. |
| Limpieza | Los tres objetos de ensayo fueron eliminados de R2 y sus URLs devuelven `404`; no se autorizó ni se guardó ningún caso de prueba para el chat. |

## Configuración recomendada de cada cerebro

> **Clínica → Embudo/tratamiento → objetivo → cualificación → límites → conocimiento aprobado → casos autorizados → playground y pruebas.**

El objetivo debe describir el siguiente paso deseado, no una presión de cierre. La cualificación debe limitarse a datos que ayuden a la persona del equipo a continuar la conversación. Los límites clínicos deben indicar cuándo el Setter deja de responder sobre salud y deriva el caso a la doctora o al equipo.

## Nota de uso

El soporte técnico de archivos no equivale a autorización de uso. La clínica debe activar un caso únicamente cuando cuente con la autorización necesaria para enviar sus imágenes, vídeos o testimonios. Los borradores permanecen fuera del repertorio del Setter.
