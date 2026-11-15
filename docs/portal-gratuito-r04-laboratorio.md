# Portal gratuito Aquaelite — propuesta R04 (laboratorio)

**Estado:** Diseño y arquitectura de prueba. No desplegar a producción sin aprobación.

## Distribución solicitada
- **Columna izquierda, Grupo 1:** «Revisa tú mismo tu instalación». Diagnóstico gratuito **AC-NEG-001** y **AF-01**.
- **Columna izquierda, Grupo 2:** «Herramientas para empresas de servicios». **AF-02** y otras herramientas profesionales existentes. Su visualización no supone acceso gratuito: permisos a validar en servidor.
- **Columna derecha:** Herramientas existentes agrupadas por especialidad técnica, manteniendo títulos, enlaces, imágenes y vigencias actuales.

## Hallazgos del portal existente (index.html)
- Inicio de sesión comercial por código de seis dígitos; backend de producción definido en `API`.
- Panel basado en permisos `PRO` y `FUGAS`; presenta NPSH con una regla propia.
- Enlaces actuales a `AF-02`, `AF-03`, `AF-04`, `AF-06`, `AF-07`, `AC-RNE-001`, `AC-RNE-002`, `AC-PCI-001`, `AC-PCI-002`, `AC-PCI-003` y NPSH.
- La portada solo contempla el texto «correo con el que activaste tu compra».

## Condiciones antes de conectar
1. Confirmar URL definitiva de registro gratuito, no usar el laboratorio R04 (restringido al administrador) para público.
2. Definir `permissions` y `access` del backend seguro para perfiles gratuitos, sin conceder por defecto `PRO` o `FUGAS`.
3. Confirmar URLs reales y controles de acceso de AC-NEG-001 y AF-01.
4. Mantener la comprobación de vigencias comerciales (6/12 meses) y evitar que un enlace directo equivalga a autorización.
5. Probar de extremo a extremo registro → correo → sesión → permisos → herramientas, con el CRM Maestro original fuera del entorno de pruebas.
6. Publicar solo por autorización expresa.

## Política de seguridad
No poner códigos, tokens, correos ni contraseñas en el repositorio. No sustituir el backend comercial de producción por R04 laboratorio. No editar el portal en `main` antes de aprobar las pruebas.

## Auditoría de rutas reales — 15/11/2026
- **AC-NEG-001** existe en `evento-10-09/aquacheck/index.html`. Ruta relativa desde la raíz del Portal: `evento-10-09/aquacheck/`.
- **AF-01** existe como `AF-01_Protocolo_Aquaelite_Diagnostico_Localizacion_Fugas_V1.pdf` en la raíz del Portal. Se conservó también el acceso comercial preexistente al PDF.
- **AF-02** sigue en el grupo de servicios con permiso comercial `FUGAS`. Su presencia visual no concede acceso público.
- La nueva portada del Portal indica «registro gratuito próximamente» con botón deshabilitado: aún no hay backend R04 público validado.
- La sección de autodiagnóstico está visible dentro del panel para sesiones comerciales existentes; el ingreso de perfiles `FREE` no está conectado todavía.

## Riesgo de permisos: imprescindible antes de producción
Los archivos estáticos y las aplicaciones GitHub Pages con URL pública no pueden protegerse realmente solo mediante un botón oculto o un estado de sesión en JavaScript. Antes de comercializar herramientas profesionales restringidas debe evaluarse la comprobación **en el servidor / entrega controlada del recurso**. Para AC-NEG-001 y AF-01, hoy públicos, es válido tratarlos como contenido gratuito, sin afirmar exclusividad de acceso.

## Criterios de aceptación pendientes
- Registro gratuito real, OTP y sesión desde un backend R04 apto para público y revisado, no el laboratorio restringido al administrador.
- Autorización expresa para escribir en CRM Maestro original, con deduplicación y trazabilidad.
- Pruebas de regresión de clientes con `PRO`, `FUGAS`, vencidos y renovados (6/12 meses).
- Validación de enlaces, carga, responsive y accesibilidad antes de fusionar.

## R17 localizada y conservada — 15/11/2026
- Historial de la rama `revision-portal-2026-11-02`: commit `0e5dc9b40ff8763272ae5dd1cf699918f60495b7`, «Ajustar paginación del Formato 2 en candidato AC-NEG-001 R17 sin publicar».
- Se copió el **mismo blob Git** `f952f2bbea5058b79a1c8fb4fe2d438cd03b53fc` a `evento-10-09/aquacheck/index.html` de esta rama de laboratorio; no se reescribió el contenido de AC-NEG-001.
- `main` conserva la versión previamente publicada. La R17 sigue siendo **candidata**: no hay constancia de aprobación final normativa ni de pruebas visuales Edge/Safari/móvil.
- En el Portal de laboratorio se identifica como «R17 candidata». No confundir el enlace de producción con la revisión preparada en esta rama.
- Validación pendiente: cálculo de consumos, pruebas hidráulicas opcionales, resultados, exportación PDF de cuatro páginas, paginación y firmas del Formato N.º 2.
