# Patrones para una biblioteca y evaluación de Setter IA

## Hallazgos aplicables

Los SaaS de IA conversacional más maduros no tratan el prompt como un bloque único. Separan **objetivo**, **instrucciones de comportamiento**, **fuentes de conocimiento**, **acciones permitidas**, **pruebas** y **evaluación de cada respuesta**. Ese patrón permite que cada clínica y cada embudo mantenga su propia configuración sin contaminar a otra clínica.

| Patrón observado | Referente | Aplicación en AURA |
|---|---|---|
| Pruebas agrupadas con preguntas manuales, preguntas reales y CSV | Intercom Fin | Banco de pruebas por embudo para objeciones de precio, miedo, primera vez, resultado natural, recuperación y reserva. |
| Simulación por usuario, audiencia o marca | Intercom Fin | Pruebas por clínica, tratamiento, ciudad/promo y tipo de paciente antes de activar cambios. |
| Inspección de tono, guidance, fuentes y automatizaciones que guiaron la respuesta | Intercom Fin | Panel de diagnóstico del Playground: etapa, señales, recurso elegido, regla aplicada y fuente usada. |
| Objetivo, contexto, tareas y dato a guardar por cada paso de IA | Manychat AI Step | Cerebro por embudo con objetivo de conversión, límites clínicos, preguntas de cualificación y campos que se guardan en el lead. |
| Fuentes de conocimiento separadas: rich text, archivos, FAQ, tablas y web | GoHighLevel | Biblioteca de fuentes por clínica/embudo, con tipo, título, estado y control de aprobación. |
| Recuperación con re-ranking y atribución de la fuente concreta | GoHighLevel | El Setter debe elegir el caso/fuente aprobada más pertinente para la objeción, mostrando al operador qué utilizó. |
| Evaluar respuestas por causa raíz | Intercom Fin | Calificar pruebas como correcta, tono inadecuado, fuente incorrecta, falta de aclaración o cierre inapropiado; convertir el hallazgo en ajuste del cerebro. |

## Decisiones de arquitectura

La estructura recomendada para AURA es:

```text
Clínica (tenant)
  └── Embudo / tratamiento
        ├── Objetivo y reglas del Setter
        ├── Voz, límites y promociones activas
        ├── Biblioteca de casos: antes/después, vídeo y finalidad
        ├── Fuentes de conocimiento: texto, documento, tabla/FAQ y audio transcrito
        ├── Playground de conversación
        └── Banco de pruebas y resultados evaluados
```

Los archivos grandes no deben atravesar una única petición del Worker. Para permitir vídeos de aproximadamente 100 MB sin convertir el Worker en cuello de botella, AURA debe realizar cargas multipart a R2: el navegador parte el archivo, envía fragmentos pequeños autenticados y el Worker los compone en R2. Esto conserva aislamiento por tenant, permite reintentos y evita que una conexión débil obligue a empezar de cero.

## Referencias

[1] [Intercom, Batch test Fin AI Agent](https://www.intercom.com/help/en/articles/10521711-batch-test-fin-ai-agent).

[2] [Manychat, AI Step](https://help.manychat.com/hc/en-us/articles/14281187288860-Manychat-AI-Step).

[3] [Manychat, AI Knowledge](https://help.manychat.com/hc/en-us/articles/25626595060124-Manychat-AI-Knowledge).

[4] [GoHighLevel, Conversation AI Knowledge Sources & Quality Upgrades](https://help.gohighlevel.com/support/solutions/articles/155000006456-conversation-ai-new-knowledge-sources-quality-upgrades).
