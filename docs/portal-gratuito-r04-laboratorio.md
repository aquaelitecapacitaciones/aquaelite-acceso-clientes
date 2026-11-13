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
