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

## Pruebas de R17 candidata — 15/11/2026
**Modalidad:** análisis de fuente y ejecución aislada de funciones JavaScript; NO equivale a pruebas E2E con navegador.

### Aprobado
- Sintaxis: los cuatro bloques JavaScript inline compilan sin errores de sintaxis.
- HTML: no se identificaron IDs duplicados (47 IDs únicos).
- Referencias de botones: todas las funciones citadas en los `onclick` estáticos tienen definiciones.
- Cálculos de la función real `calc(false)`: 5/5 casos correctos:
  1. 20→30 m³ / 30→30 días = +50% consumo diario; diferencia +10 m³; montos S/100→S/150, diferencia S/50.
  2. 20→30 m³ / 20→30 días = 0% variación del consumo diario (períodos distintos).
  3. Rechaza días anteriores iguales a cero.
  4. Rechaza consumo anterior negativo.
  5. Ante consumo anterior cero y consumo actual positivo retorna variación porcentual `null` (sin división por cero).

### Observaciones pendientes
- **Identificación incorrecta:** el título HTML sigue indicando `Candidata visual R08` aunque el commit de origen señala R17; aparecen cinco menciones de R08 y ninguna etiqueta R17 dentro del contenido.
- **Exportación PDF:** existe la función `downloadPdf()`, con html2pdf externo; no hay botón `aqDownloadPdfBtn` ni llamada de la interfaz a dicha función. La opción visible es `IMPRIMIR O GUARDAR EXPEDIENTE COMPLETO EN PDF`, que usa impresión del navegador.
- **Funciones duplicadas:** 11 nombres de funciones se definen dos veces, entre ellas `calc`, `evaluateAll`, `syncOfficial` y `printOfficial`. La última definición prevalece; requiere regresión para comprobar que se conserva toda la funcionalidad esperada.
- Pendientes pruebas reales en navegador: flujo completo, Formato N.º 2, firmas, paginación, archivo PDF descargado, interfaz móvil y biblioteca CDN.

**Conclusión:** lógica de cálculo básica aprobada en pruebas aisladas; NO se aprueba aún la R17 para producción.

## Conciliación con pruebas históricas R17 — 15/11/2026
Se recuperó el historial del **05/11/2026**. La evaluación de sintaxis y pruebas unitarias de 15/11 **no invalida** las pruebas funcionales anteriores.

### Evidencia histórica ya realizada
- R16: validación de diagnóstico incompleto, caso de cálculo orientativo, fotografías múltiples y PDF Chromium, inicialmente con una hoja casi vacía.
- R17 candidata: ajuste de paginación de 5 a **4 páginas** en Chromium: páginas 1–2 diagnóstico y evidencias, página 3 Formato N.º 2 y firmas, página 4 reverso. Se informó recorrido sin errores JS.
- El archivo candidato R17 fue preservado en la rama de revisión con commit `0e5dc9b40ff8763272ae5dd1cf699918f60495b7`, integrado a este laboratorio.
- La revisión actual cambió exclusivamente el título visible de la pestaña de `Candidata visual R08` a `R17 candidata`; los comentarios históricos R08 dentro de CSS no constituyen fallo funcional.
- Once nombres de función redefinidos proceden del desarrollo incremental; no son, por sí solos, evidencia de error. Las pruebas históricas prevalecen para los recorridos que cubrieron.

### Aún no acreditado
- Regresión real en Edge, Safari/iPhone y Android, incluida paginación y firmas en PDF.
- Revisión normativa/legal definitiva del modelo del Formato N.º 2 frente a fuente SUNASS vigente.
- Despliegue de registro gratuito R04 para usuarios externos, sincronización CRM original y regresión de permisos comerciales.
- Aprobación de fusión a `main`.

**Conclusión reconciliada:** R17 pasó las pruebas funcionales Chromium documentadas; se mantiene como candidata de producción por controles multidispositivo, normativos y de integración no finalizados. No repetir como pendientes las pruebas Chromium ya efectuadas salvo regresión por modificaciones posteriores.

## Formulario gratuito aislado — 15/11/2026
Se añadió a la rama de laboratorio una pantalla de registro con nombre, correo, WhatsApp, perfil y consentimiento para gestionar el acceso, incluyendo retorno al Portal. El botón de envío se mantiene **deshabilitado** deliberadamente: esta interfaz NO escribe en CRM, NO registra cuentas y NO envía códigos. Su propósito es validar presentación y estructura antes de conectar el backend apto para público.

**Seguridad conservada:** endpoint y API comercial originales sin cambios, sin inserción de tokens, sin enlace al laboratorio Apps Script restringido. Pantalla de registro independiente de la sesión comercial.

**Verificaciones automáticas:** JavaScript de index.html compila; no hay IDs duplicados ni referencias DOM ausentes; `main/index.html` conserva su SHA de producción; el formulario no tiene envío activo.

**Pendiente clave:** implementar una API R04 pública con validación de correo, límites, sesión, permiso FREE, aislamiento de PRO/FUGAS, consentimiento y CRM Maestro; probar antes de activar botón. No copiar la lógica de la rama previa `revision-portal-2026-11-02` que mostraba todo como gratuito y no respetaba las autorizaciones comerciales.

## Unificación de interfaz y sesiones — 15/11/2026

Se incorporó en `index.html` de laboratorio una sola experiencia visual, manteniendo el flujo comercial existente y añadiendo un flujo gratuito técnicamente separado:

- Login comercial original conserva el endpoint `API`, acciones `request_code`, `verify_code`, `check_session` y llaves de sesión comerciales `aq_portal_*`.
- Login gratuito y formulario de alta comparten interfaz, pero utilizan `FREE_CONFIG`, sesiones independientes `aq_free_*` y backend R04 separado.
- El panel gratuito se abre **solo si el servidor devuelve `ok:true` y `permissions` incluye `FREE`**; aun entonces oculta explícitamente `proGroup`, `fugasGroup`, `servicesIntro` y `npshAllGroup`.
- La pantalla comercial conserva sus permisos `PRO` y `FUGAS` y las etiquetas de vigencia como estaban.
- `FREE_CONFIG.endpoint` se deja vacío y `enabled:false` hasta validar y publicar un endpoint R04 autorizado para público. No se utiliza el laboratorio restringido al administrador en un Portal público.
- El botón de registro gratuito sigue deshabilitado por la misma condición, pero el flujo de funciones y validaciones está preparado.
- El consentimiento de alta refiere exclusivamente a gestión del acceso; las comunicaciones comerciales exigirán consentimiento independiente, nunca inferido de este checkbox.

### Contrato mínimo de integración R04 pendiente de validar con Apps Script

Todas las respuestas JSONP deben estar estrictamente saneadas y vinculadas al correo autenticado.

| Acción | Parámetros | Respuesta requerida |
|---|---|---|
| `register_free` | nombre, correo, whatsapp, perfil, consentimiento | `ok`, `maskedEmail` opcional, `codeSent` o `codigoEnviado` si se remitió código |
| `request_code` | correo | `ok`, `maskedEmail` |
| `verify_code` | correo, codigo | `ok`, `correo`, `nombre`, `token`, `expiresAt` (epoch **milisegundos**), `permissions:['FREE']` |
| `check_session` | correo, token | `ok`, `correo`, `nombre`, `permissions:['FREE']` |

Si el backend devuelve otros nombres de campos o acciones, ajustar el adaptador después de observar respuestas auténticas en laboratorio; **no cambiar el backend probado por conjetura**.

### Controles antes de activar

1. Verificar que el backend R04 de acceso público mantenga cuota de correos por hora/día, espera entre códigos, límite de intentos, caducidad, hash de códigos/tokens, autorización por correo y consentimiento.
2. Mantener protección de recursos comerciales del lado del servidor; ocultar tarjetas o rutas públicas no constituye autorización.
3. Separar almacenamiento y trazabilidad gratuita de las vigencias de licencias comerciales.
4. Probar FREE, PRO, FUGAS, acceso vencido, renovación 6/12 meses, un usuario de prueba y un usuario externo, incluyendo móvil.
5. Integrar con CRM Maestro original únicamente mediante escritura aprobada, idempotente y auditada.
6. Sólo entonces completar FREE_CONFIG y habilitar el botón con aprobación de publicación.

### Validación de código de esta unificación
- Compila el JavaScript de `index.html`.
- No hay identificadores HTML duplicados ni referencias DOM inexistentes.
- Endpoint comercial conservado textualmente.
- Sesiones comerciales y gratuitas usan conjuntos independientes de claves.
- Pantalla gratuita exige permiso del servidor y oculta grupos profesionales.
- **No se ha realizado una prueba real de correo R04 público ni del CRM original.**
