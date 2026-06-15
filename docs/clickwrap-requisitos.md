# Clickwrap legal — requisitos para que sea vinculante (resumen de investigación)

Fuentes: Ironclad (6 componentes), RSign, UpCounsel, casos Specht v. Netscape, Feldman v. Google, Bragg v. Linden.

## Los 6 componentes de un clickwrap válido
1. **Consentimiento activo y afirmativo**: el usuario DEBE hacer clic en "Acepto" o marcar una casilla NO pre-marcada. Nada de casillas pre-marcadas ni aceptación pasiva.
2. **Aviso razonable y visible de los términos**: enlaces a los documentos en fuente/color claramente clicable, accesibles antes de aceptar.
3. **Comprensible para una persona media**: lenguaje claro, no solo jerga legal.
4. **No abusar de la posición dominante**: términos "tómalo o déjalo" sí; "nos lo quedamos todo y tú nada" no (riesgo de inaplicabilidad por abusivo/unconscionable).
5. **Consentimientos específicos distinguibles**: las cláusulas sensibles (p. ej. tratamiento de datos por cuenta de la clínica) deben destacarse, no enterrarse.
6. **Registro backend + control de versión**: guardar quién aceptó, qué versión, cuándo. Sin prueba de quién aceptó qué versión, NO es exigible.

## Qué registrar como prueba (audit trail)
- Timestamp de aceptación
- Identificación del usuario (email)
- IP y user-agent del navegador
- Versión exacta del documento aceptado
- Método (clic/checkbox)

## Aplicación a AURA
- Pantalla bloqueante en el PRIMER acceso del DUEÑO (rol owner) de cada clínica.
- Tres documentos: Términos, Privacidad y DPA (Contrato de Encargado de Tratamiento).
- Checkboxes separadas, sin premarcar, + escribir el nombre como firma.
- Datos de la clínica precargados (ya viene del onboarding).
- Guardar en tabla legal_acceptances: tenant_id, email, nombre_firmante, ip, user_agent, version, docs, accepted_at.
- Mientras no acepte, no puede usar el panel.
