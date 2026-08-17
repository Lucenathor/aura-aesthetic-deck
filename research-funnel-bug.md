# Diagnóstico: Embudos muestran la landing de AURA en vez del embudo del tratamiento

## Problema
Cuando el usuario accede a /c/aura-demo?t=labios, se muestra la LANDING PAGE DE AURA (index.html)
en vez del embudo del tratamiento (_t/index.html).

## Causa raíz
La ruta /c/* debería redirigir a /_t/index.html según el _redirects:
```
/c/*  /_t/index.html  200
```

PERO lo que se ve en el navegador es la landing principal de AURA (index.html) con:
- "Tu clínica estética pierde pacientes por WhatsApp"
- "AURA los convierte en citas y ventas"
- Input "Escribe el nombre de tu clínica"

Esto NO es el embudo del tratamiento. El embudo debería mostrar:
- "Tus labios, naturales y perfectos."
- Quiz de 4 preguntas
- Chat IA

## Hipótesis
1. El _redirects no está funcionando correctamente en Cloudflare Pages
2. O hay un conflicto con el custom domain auracrm.co que no usa Pages sino el Worker
3. El Worker podría estar interceptando /c/* y devolviendo otra cosa

## Verificación necesaria
- Probar en el dominio directo de Pages (aura-mvp.pages.dev)
- Verificar si el Worker tiene una ruta que intercepta /c/
