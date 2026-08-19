# Bug: Código JS visible en el embudo

## Síntoma
Al abrir el embudo (tanto en el preview del panel como directamente en el navegador),
se ve el texto `function startQuiz(){ applyQuizContent(); qi=0; renderQ(); trackFunnelEvent('quiz_start'); }`
fuera del marco del teléfono, a la derecha de la pantalla.

## Causa raíz
En `mvp/_t/index.html` hay un `<script>` cuyo contenido se está escapando del tag
o hay un tag `<script>` que no se cierra correctamente, provocando que el navegador
lo interprete como texto visible en vez de código ejecutable.

## Archivo afectado
`/home/ubuntu/aura-presentation/mvp/_t/index.html`

## Acción
Localizar el script que contiene `function startQuiz()` y verificar que está
correctamente encerrado en `<script>...</script>` sin caracteres que rompan el tag.
