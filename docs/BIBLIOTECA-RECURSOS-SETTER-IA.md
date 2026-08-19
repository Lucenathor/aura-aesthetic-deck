# Biblioteca de recursos del Setter IA

**Fecha:** 19 de agosto de 2026  
**Propósito:** permitir que cada clínica cargue y organice pruebas comerciales reales y autorizadas para que el Setter IA seleccione el recurso más útil ante una objeción concreta.

## Experiencia para el equipo de la clínica

Cada tratamiento tiene una biblioteca independiente. En vez de pegar enlaces, el usuario crea un caso y sube directamente sus materiales mediante arrastrar y soltar o mediante selector de archivos.

| Elemento | Uso en la biblioteca | Regla de seguridad |
|---|---|---|
| Foto **antes** | Contexto visual del mismo caso. | Solo se muestra si forma parte de un recurso aprobado y autorizado. |
| Foto **después** | Resultado del caso, separado de la foto previa. | No se presenta como resultado garantizado; requiere pie descriptivo y autorización. |
| Vídeo del equipo | Debe explicar un único tema: valoración, procedimiento, seguridad, naturalidad, recuperación o presentación de la doctora. | Se etiqueta por finalidad para que el Setter sepa cuándo aporta valor. |
| Finalidad comercial | Relaciona el caso con precio, miedo, primera vez, resultado artificial, recuperación o indecisión. | El Setter rota recursos aprobados y prioriza la finalidad que corresponde a la duda. |
| Estado | Borrador, revisión o aprobado. | Solo los aprobados con confirmación explícita pueden usarse en chat. |

## Organización y almacenamiento

Los archivos se cargan directamente en Cloudflare R2 bajo el espacio del tenant y del tratamiento. Una clínica no necesita URL ni puede escribir en el espacio de otra.

```text
setter/{tenant}/{treatment}/before_{id}.webp
setter/{tenant}/{treatment}/after_{id}.webp
setter/{tenant}/{treatment}/video_{id}.mp4
```

El campo **Tratamiento del caso** debe indicarse antes de subir. Esto evita recursos en una carpeta genérica y muestra una instrucción clara si falta ese dato.

## Validación realizada

| Prueba | Resultado |
|---|---|
| CSS de las dropzones renderizado como texto | Corregido: las reglas están dentro del bloque de estilos; no queda código CSS visible en el DOM. |
| Preview de recursos antiguos con URL pública | Corregido: se normalizan las URL externas y se muestran sin prefijos inválidos del Worker. |
| Subida de foto antes desde la interfaz | Correcta: archivo recibido en R2 y preview cargado. |
| Subida de foto después desde la interfaz | Correcta: archivo recibido en R2 y preview cargado. |
| Subida de vídeo desde la interfaz | Correcta: archivo recibido en R2 y reproductor cargado. |
| Aislamiento de prueba | Los tres objetos temporales se eliminaron de R2 al terminar; no se guardó ningún recurso de prueba ni se autorizó para el chat. |

## Límites actuales

Las imágenes admiten JPG, PNG y WebP hasta 10 MB; los vídeos MP4, WebM o MOV hasta 25 MB. La clínica debe confirmar que dispone de autorización para usar cada material. Esta confirmación es un control de interfaz y no sustituye su obligación legal de recabar y conservar los consentimientos aplicables.
