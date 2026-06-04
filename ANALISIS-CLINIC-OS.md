# Análisis de competencia → Clinic OS lite de AURA

## Módulos que tienen los líderes (Fresha, Pabau, Flowww)

**Fresha** ("one platform"): calendario/reservas, **POS (punto de venta)**, **pagos integrados + terminal**, **inventario/stock** (niveles, consumo, coste), clientes 360 (lifetime value, preferencias), marketing/recordatorios, **reporting avanzado** (ventas, inventario, equipo), marketplace, depósitos/anti-no-show.

**Pabau** (clínico): scheduling multi-sede, **historia clínica (EMR)**, fotos antes/después, **POS + facturas + Stripe + terminal**, **stock management**, depósitos y self-pay (link de pago), **membresías/bonos**, marketing (email/SMS, lealtad, reseñas), **50+ informes**, IA (notas clínicas), telemedicina. Cobra por créditos.

**Flowww** (España): agenda inteligente, **captación omnicanal + cita online (WhatsApp)**, historia clínica + firma digital, **trazabilidad de stock**, **presupuestos + planes de tratamiento + pagos integrados**, marketing automatizado post-tratamiento, **estadísticas/informes en tiempo real**, IA médica.

## Patrón común del dashboard (lo que SIEMPRE hay)
1. Calendario/agenda como pantalla central.
2. Ficha de cliente 360 (historial, fotos, gastos, preferencias).
3. **POS/cobro** en el momento de la visita (efectivo/tarjeta/link).
4. **Inventario/stock** con consumo por tratamiento y coste.
5. **Bonos/packs/membresías** (sesiones prepagadas).
6. **Caja e informes** (ventas del día, KPIs).
7. Marketing/recordatorios.

## Carencias / dónde AURA puede diferenciarse (lo que ellos hacen mal o no hacen)
- **Captación con IA de verdad:** Fresha/Pabau dependen de marketplace o widgets; no tienen embudo + chat IA + quiz como AURA. → Ventaja AURA.
- **Seguimiento agresivo del lead** (recall, reactivación, link mágico, "próximo día abierto"): casi nadie lo hace bien. → Ventaja AURA.
- **ROI explícito por clínica** ("te hemos traído X pacientes = Y €"): no lo muestran claro. → DIFERENCIADOR.
- **Margen real por tratamiento** (precio − coste de producto) visible en el cierre: poco común y muy útil. → DIFERENCIADOR.
- **Complejidad/curva de aprendizaje:** Pabau/Flowww son potentes pero complejos y caros (créditos). AURA puede ganar en **simplicidad** (lite, en español, móvil). → Ventaja AURA.

## Clinic OS lite de AURA — alcance (MVP "lo tengo todo")
Construir, integrado en el cierre de visita y en una nueva sección "Caja":

1. **Cobro en el cierre de visita**: método (efectivo/tarjeta/Bizum/link), importe, estado (pagado/señal/pendiente). (Parcial ya existe en treatments_log → ampliar.)
2. **Caja del día**: resumen de ingresos del día, desglose por método, nº de tickets, comparado con ayer.
3. **Bonos/Packs**: vender pack de N sesiones, descontar sesión al cerrar visita, saldo de sesiones por paciente.
4. **Inventario ligero**: productos con stock; al cerrar visita se descuenta el producto usado; alerta de stock bajo; coste → margen.
5. **Ticket simple**: documento descargable/printable del cobro (no factura fiscal completa).

### Diferenciadores propios (que otros no resaltan)
- **Panel de ROI**: "AURA te ha traído N pacientes nuevos este mes = X €" (cruzando leads de embudo con cobros).
- **Margen por tratamiento** automático (precio − coste producto del inventario).
- Todo **mobile-first, en español, sin créditos** ocultos.

### Frontera (NO hacer en lite)
Contabilidad fiscal, nóminas, EMR médico legal con firma, inventario con proveedores/órdenes de compra, terminal de pago físico propio.

## Datos/tablas necesarias (backend)
- Ampliar `treatments_log` (ya tiene amount, pay_status) con `method`.
- `products` (id, tenant_id, name, stock, cost, unit, low_alert).
- `product_usage` (treatment/visit → product → qty) o campo simple en cierre.
- `bonos` (id, tenant_id, lead_id, name, total_sessions, used_sessions, amount, created_at).
- Caja: se calcula por agregación de treatments_log por fecha (no nueva tabla).
