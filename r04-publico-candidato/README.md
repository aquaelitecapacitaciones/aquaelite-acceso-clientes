# AQUAELITE R04 — candidato de backend gratuito (NO PUBLICAR)

Se desarrollaron dos archivos nuevos para **un proyecto Apps Script independiente**:
- `Code.gs`: alta gratuita, código por correo, verificación, sesión FREE, cuotas, hash con secreto y almacenamiento en una hoja exclusiva.
- `FreePortal.html`: interfaz de pruebas HtmlService con `google.script.run`; no recibe claves del servidor y no utiliza JSONP.

**Ningún archivo fue desplegado ni conectado al CRM original.** No copiar estos archivos encima del laboratorio administrador o del proyecto de acceso comercial.

## Preparación pendiente en cuenta Google (necesita al propietario)
1. Crear nuevo proyecto Apps Script R04 FREE y una hoja de cálculo exclusiva; no reutilizar hoja del laboratorio ni CRM Maestro.
2. Incorporar `Code.gs` y `FreePortal.html`.
3. Configurar propiedades de secuencia de comandos: `AQ_FREE_SHEET_ID` (ID de hoja aislada) y `AQ_FREE_SECRET` (clave aleatoria de al menos 32 caracteres). No publicar la clave.
4. Ejecutar prueba cerrada y autorizar permisos para Sheets y Mail. Verificar consumo de cuotas y envíos; comprobar que los registros nuevos no modifican clientes comerciales.
5. Antes de abrir a todo público, desarrollar y probar mitigación de abuso (cuotas **por IP/globales** y correo, CAPTCHA/antibots, límites de recursos y expiración de contadores), aviso de privacidad y mecanismo para revocar sesiones.
6. No activar sincronización CRM hasta que esté auditada con copia y aprobada.

## Limitaciones deliberadas
- El candidato funciona como aplicación gratuita de Apps Script **separada**. La integración directa con el Portal alojado en GitHub Pages está pendiente: Apps Script HtmlService `google.script.run` no es API JSONP externa. No cambiar a JSONP para exponer tokens de sesión y datos personales sin un diseño de seguridad revisado.
- Se conservan los permisos `PRO` y `FUGAS` únicamente en el Portal comercial existente. `FREE` no proporciona derechos sobre ellos.
- Los enlaces a AC-NEG-001 y AF-01 del cliente HtmlService apuntan a las rutas **públicas existentes**. R17 candidata solo está en rama de revisión, no publicada.
- Las pruebas de extremo a extremo (navegadores, emails, rebotes, cuota de MailApp, errores, red y CRM) aún no se han ejecutado en una implementación real.

## Criterios de aceptación
- Registro FREE con correo válido y consentimiento explícito; sin incremento de permisos comerciales.
- OTP único y vencimiento de 15 min, cinco intentos, espera de 60 s entre envíos, 5/h y 12/día por correo; verificar cambios de fecha/hora.
- `freeVerifyCode` devuelve `permissions:['FREE']`, token y vencimiento epoch ms; `freeCheckSession` exige coincidencia del hash y vigencia.
- Alta de cliente comercial y registro gratuito independientes, sin filtración entre sesiones.
- Aprobación expresa de publicación tras pruebas reales.

**Fecha:** 16/11/2026. **Estado:** borrador técnico seguro por defecto, sin despliegue público.
