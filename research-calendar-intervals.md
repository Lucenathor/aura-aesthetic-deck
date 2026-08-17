# Investigación: Intervalos de tiempo en agendas de CRMs

## Hallazgos clave

### Mangomint
- **Appointment Increments**: Configurable por clínica en Settings > Calendar & Appointments > Scheduling Options
- Determina a qué intervalos se pueden reservar citas y establecer duraciones de servicio
- Opciones típicas: 5, 10, 15, 30, 60 minutos
- La duración real de la cita la define cada servicio/tratamiento

### Pabau
- **Time slot size**: Configurable en Calendar Settings > Configuration
- Si eliges 15 min, los slots aparecen como 9:00, 9:15, 9:30...
- **Resource view timeslot length**: Controla cómo se ven los slots por profesional/sala
- La duración de la cita se auto-rellena según el servicio seleccionado
- Tiene "extra time" (processing time + blocked time) configurable por servicio

### MyTime (3 niveles independientes)
- **Appointment time picker intervals**: Lo que ve el staff al crear cita (ej: 5 min)
- **Appointment schedule intervals**: Cómo se segmenta el calendario visual (ej: 15 min)
- **Online booking intervals**: Lo que ve el paciente al reservar online (ej: 30 o 60 min)
- Los tres son independientes y configurables por clínica

### Setmore
- **Custom Time Slot**: Puramente visual, no afecta cómo se reservan las citas
- Opciones: 15, 30, 60 min
- Solo cambia la densidad visual del calendario

### Zenoti
- Buffer time entre citas: típicamente 10-15 min para preparación/limpieza
- Configurable por tipo de servicio

## Conclusiones para AURA

### La lógica correcta es:
1. **El intervalo visual del calendario es personalizable por clínica** (5, 10, 15, 30 min)
2. **La duración real de cada cita la define el tratamiento** (ej: Botox = 30 min, Aumento labios = 45 min)
3. **El booking online puede tener un intervalo diferente** (más amplio, ej: 30 min)
4. **Buffer time opcional por servicio** (tiempo de preparación/limpieza entre citas)

### Valores por defecto recomendados para clínicas estéticas:
- **Intervalo visual calendario**: 15 minutos (estándar del sector)
- **Intervalo booking online**: 30 minutos (simplifica para el paciente)
- **Duración por defecto de cita**: Según tratamiento configurado
- **Buffer time**: 0 por defecto, configurable por servicio

### Lo que ya tiene AURA:
- Selector de intervalo 15/30 min (visual)
- Duración de cita definida por tratamiento (duration_min en appointments)

### Lo que falta:
- Que cada clínica pueda personalizar su intervalo predeterminado en Ajustes
- Que se guarde la preferencia y se aplique al cargar la agenda
- Opción de 5 y 10 minutos para clínicas con muchos servicios rápidos
- Buffer time configurable por servicio (nice to have)
