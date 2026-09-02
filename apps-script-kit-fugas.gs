/*
 * AQUAELITE | PORTAL UNIFICADO DE CLIENTES
 *
 * Este archivo reemplaza el control exclusivo del Kit de Fugas.
 * Se publica como aplicación web de Google Apps Script y administra:
 * - ingreso de clientes con código de 6 dígitos;
 * - activaciones de compra con enlace único;
 * - permisos PRO y/o FUGAS;
 * - vigencias y renovaciones de 6 o 12 meses;
 * - panel privado para aquaelitecapacitaciones@gmail.com;
 * - actualización del único CRM comercial (CRM MAESTRO AQUAELITE).
 */

const ACCESS_SPREADSHEET_ID = "1n-HDB2oNl9PU3vJYM_TSyCuyHLOERvC-hTqWirUXX_I";
const CRM_SPREADSHEET_ID = "18lMKYK86sLZecqBFZ5WZQJ4jqQBv76zM9IlY1HcOj60";
const CRM_SHEET_NAME = "PROSPECTOS";
const ADMIN_EMAIL = "aquaelitecapacitaciones@gmail.com";
const PORTAL_URL = "https://aquaelitecapacitaciones.github.io/aquaelite-acceso-clientes/";
const ADMIN_URL = PORTAL_URL + "admin/";
const ACTIVATION_URL = PORTAL_URL + "activar/";
const WHATSAPP_AQUAELITE = "970 683 322";
const CODE_MINUTES = 15;
const SESSION_HOURS = 48;
const ACTIVATION_HOURS = 48;

const SHEETS = {
  USERS: "Usuarios Portal",
  PERMISSIONS: "Permisos",
  ACTIVATIONS: "Activaciones",
  ADMINS: "Administradores",
  LEGACY_FUGAS: "Kit de Fugas y Pruebas",
  LEGACY_PRO: "Accesos A130"
};

const HEADERS = {
  USERS: ["Correo", "Nombre", "WhatsApp", "Fecha registro", "Código", "Código enviado", "Código vence", "Token sesión", "Sesión vence", "Último acceso", "N.º accesos"],
  PERMISSIONS: ["Clave", "Correo", "Permiso", "Producto origen", "Inicio acceso", "Vencimiento acceso", "Estado", "Última renovación", "Aviso enviado"],
  ACTIVATIONS: ["Token", "Código producto", "Producto", "Fecha creación", "Vence", "Estado", "Correo utilizado", "Fecha uso", "Creado por"],
  ADMINS: ["Correo", "Código", "Código vence", "Token sesión", "Sesión vence", "Último acceso"]
};

const PRODUCTS = {
  AQUAELITE_PRO: {label: "Aquaelite PRO", permissions: ["PRO"], months: 6},
  FUGAS_DIGITAL_PRO: {label: "Fugas Digital PRO", permissions: ["FUGAS"], months: 6},
  KIT_PROFESIONAL_BOSCH: {label: "Kit Profesional Aquaelite con Bosch", permissions: ["FUGAS"], months: 6},
  KIT_PRUEBAS_HIDRAULICAS: {label: "Kit de Pruebas Hidráulicas", permissions: ["PRO", "FUGAS"], months: 6},
  PARTNER_AQUAELITE: {label: "Partner Aquaelite", permissions: ["PRO", "FUGAS"], months: 6}
};

function doGet(e) {
  const data = e && e.parameter ? e.parameter : {};
  const action = clean(data.action || "status");
  const callback = clean(data.callback || "aquaeliteCallback");
  let result;
  try {
    ensureTechnicalSheets();
    if (action === "request_code") result = requestCode(data);
    else if (action === "verify_code") result = verifyCode(data);
    else if (action === "check_session") result = checkSession(data);
    else if (action === "request_admin_code") result = requestAdminCode(data);
    else if (action === "verify_admin_code") result = verifyAdminCode(data);
    else if (action === "check_admin_session") result = checkAdminSession(data);
    else if (action === "create_activation") result = createActivation(data);
    else if (action === "activate_purchase") result = activatePurchase(data);
    else if (action === "lookup_client") result = lookupClient(data);
    else if (action === "renew_access") result = renewAccess(data);
    else result = {ok: true, system: "Aquaelite | Portal unificado", message: "Control de accesos activo"};
  } catch (err) {
    result = {ok: false, message: "Ocurrió un error interno.", error: String(err)};
  }
  return jsonp(result, callback);
}

function instalarPortalUnificado() {
  ensureTechnicalSheets();
  const admins = getAccessSheet(SHEETS.ADMINS);
  if (!findRowByValue(admins, 1, ADMIN_EMAIL)) admins.appendRow([ADMIN_EMAIL, "", "", "", "", ""]);
  instalarControlVencimientos();
  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: "Portal privado de administración | Aquaelite",
    htmlBody: emailShell(
      "Portal privado de Aquaelite",
      "Tu correo administrador ya está autorizado. Desde este panel podrás generar enlaces de activación y renovar accesos por 6 o 12 meses.",
      ADMIN_URL,
      "ABRIR PORTAL ADMINISTRATIVO"
    )
  });
  return "Portal unificado instalado. Invitación enviada a " + ADMIN_EMAIL;
}

/* ---------------- ACCESO DEL CLIENTE ---------------- */

function requestCode(data) {
  const email = clean(data.correo).toLowerCase();
  if (!validEmail(email)) return fail("Ingresa un correo válido.");

  migrateLegacyAccess(email);
  const active = getActivePermissions(email, true);
  if (!active.permissions.length) {
    return {ok: false, notRegistered: true, message: "Este correo no tiene herramientas vigentes. Verifica que sea el mismo correo registrado con Aquaelite."};
  }

  const users = getAccessSheet(SHEETS.USERS);
  let row = findRowByValue(users, 1, email);
  if (!row) {
    users.appendRow([email, "", "", new Date(), "", "", "", "", "", "", 0]);
    row = users.getLastRow();
  }

  const code = sixDigitCode();
  const now = new Date();
  const expires = new Date(now.getTime() + CODE_MINUTES * 60000);
  users.getRange(row, 5, 1, 3).setValues([[code, now, expires]]);

  MailApp.sendEmail({
    to: email,
    subject: "Código de acceso | Herramientas Aquaelite",
    htmlBody: '<div style="font-family:Arial,sans-serif;color:#102a43;max-width:560px;margin:auto">' +
      '<h2 style="color:#0b2748">AQUAELITE®</h2><p>Tu código personal para ingresar al portal es:</p>' +
      '<div style="font-size:34px;font-weight:800;letter-spacing:7px;color:#155a96;margin:22px 0">' + code + '</div>' +
      '<p>Vence en <b>' + CODE_MINUTES + ' minutos</b>.</p></div>'
  });
  return {ok: true, maskedEmail: maskEmail(email), expiresAt: expires.getTime(), permissions: active.permissions};
}

function verifyCode(data) {
  const email = clean(data.correo).toLowerCase();
  const code = clean(data.codigo);
  if (!validEmail(email) || !/^\d{6}$/.test(code)) return fail("Correo o código no válido.");

  const users = getAccessSheet(SHEETS.USERS);
  const row = findRowByValue(users, 1, email);
  if (!row) return fail("Usuario no registrado.", {notRegistered: true});

  const values = users.getRange(row, 1, 1, HEADERS.USERS.length).getValues()[0];
  if (clean(values[4]) !== code) return fail("El código ingresado no es correcto.");
  const codeExpires = asDate(values[6]);
  if (!codeExpires || new Date() > codeExpires) return fail("El código venció. Solicita uno nuevo.", {expired: true});

  const access = getActivePermissions(email, true);
  if (!access.permissions.length) return fail("Tu periodo de acceso ha finalizado. Comunícate con Aquaelite para renovar.", {commercialExpired: true});

  const now = new Date();
  const token = randomToken();
  const sessionExpires = new Date(now.getTime() + SESSION_HOURS * 3600000);
  const count = Number(values[10] || 0) + 1;
  users.getRange(row, 5).clearContent();
  users.getRange(row, 8, 1, 4).setValues([[token, sessionExpires, now, count]]);

  return {
    ok: true,
    correo: email,
    nombre: clean(values[1]),
    token: token,
    expiresAt: sessionExpires.getTime(),
    permissions: access.permissions,
    access: access.access
  };
}

function checkSession(data) {
  const email = clean(data.correo).toLowerCase();
  const token = clean(data.token);
  if (!validEmail(email) || !token) return fail("Sesión no válida.");

  const users = getAccessSheet(SHEETS.USERS);
  const row = findRowByValue(users, 1, email);
  if (!row) return fail("Usuario no registrado.", {notRegistered: true});
  const values = users.getRange(row, 1, 1, HEADERS.USERS.length).getValues()[0];
  const expires = asDate(values[8]);
  if (clean(values[7]) !== token || !expires || new Date() > expires) return fail("Tu sesión venció. Solicita un nuevo código.", {expired: true});

  const access = getActivePermissions(email, true);
  if (!access.permissions.length) return fail("Tu periodo de acceso ha finalizado. Comunícate con Aquaelite para renovar.", {commercialExpired: true});
  users.getRange(row, 10).setValue(new Date());
  return {ok: true, correo: email, nombre: clean(values[1]), expiresAt: expires.getTime(), permissions: access.permissions, access: access.access};
}

/* ---------------- ACCESO DEL ADMINISTRADOR ---------------- */

function requestAdminCode(data) {
  const email = clean(data.correo).toLowerCase();
  if (email !== ADMIN_EMAIL) return fail("Este correo no está autorizado.");
  const admins = getAccessSheet(SHEETS.ADMINS);
  let row = findRowByValue(admins, 1, email);
  if (!row) {
    admins.appendRow([email, "", "", "", "", ""]);
    row = admins.getLastRow();
  }
  const code = sixDigitCode();
  const expires = new Date(Date.now() + CODE_MINUTES * 60000);
  admins.getRange(row, 2, 1, 2).setValues([[code, expires]]);
  MailApp.sendEmail({
    to: email,
    subject: "Código administrador | Aquaelite",
    htmlBody: '<div style="font-family:Arial,sans-serif;color:#102a43;max-width:560px;margin:auto"><h2>AQUAELITE®</h2><p>Tu código para ingresar al panel administrativo es:</p><div style="font-size:34px;font-weight:800;letter-spacing:7px;color:#155a96;margin:22px 0">' + code + '</div><p>Vence en 15 minutos.</p></div>'
  });
  return {ok: true, maskedEmail: maskEmail(email)};
}

function verifyAdminCode(data) {
  const email = clean(data.correo).toLowerCase();
  const code = clean(data.codigo);
  if (email !== ADMIN_EMAIL || !/^\d{6}$/.test(code)) return fail("Correo o código no válido.");
  const admins = getAccessSheet(SHEETS.ADMINS);
  const row = findRowByValue(admins, 1, email);
  if (!row) return fail("Administrador no registrado.");
  const values = admins.getRange(row, 1, 1, HEADERS.ADMINS.length).getValues()[0];
  const codeExpires = asDate(values[2]);
  if (clean(values[1]) !== code) return fail("El código no es correcto.");
  if (!codeExpires || new Date() > codeExpires) return fail("El código venció. Solicita uno nuevo.");
  const token = randomToken();
  const sessionExpires = new Date(Date.now() + SESSION_HOURS * 3600000);
  admins.getRange(row, 2).clearContent();
  admins.getRange(row, 4, 1, 3).setValues([[token, sessionExpires, new Date()]]);
  return {ok: true, correo: email, token: token, expiresAt: sessionExpires.getTime()};
}

function checkAdminSession(data) {
  const auth = authenticateAdmin(data);
  return auth.ok ? {ok: true, correo: ADMIN_EMAIL, expiresAt: auth.expires.getTime()} : auth;
}

function authenticateAdmin(data) {
  const email = clean(data.correo).toLowerCase();
  const token = clean(data.token);
  if (email !== ADMIN_EMAIL || !token) return fail("Sesión administrativa no válida.");
  const admins = getAccessSheet(SHEETS.ADMINS);
  const row = findRowByValue(admins, 1, email);
  if (!row) return fail("Administrador no registrado.");
  const values = admins.getRange(row, 1, 1, HEADERS.ADMINS.length).getValues()[0];
  const expires = asDate(values[4]);
  if (clean(values[3]) !== token || !expires || new Date() > expires) return fail("La sesión administrativa venció.", {expired: true});
  admins.getRange(row, 6).setValue(new Date());
  return {ok: true, expires: expires};
}

/* ---------------- ACTIVACIÓN Y RENOVACIÓN ---------------- */

function createActivation(data) {
  const auth = authenticateAdmin(data);
  if (!auth.ok) return auth;
  const productCode = clean(data.producto).toUpperCase();
  const product = PRODUCTS[productCode];
  if (!product) return fail("Selecciona un producto válido.");

  const token = randomToken();
  const now = new Date();
  const expires = new Date(now.getTime() + ACTIVATION_HOURS * 3600000);
  getAccessSheet(SHEETS.ACTIVATIONS).appendRow([token, productCode, product.label, now, expires, "PENDIENTE", "", "", ADMIN_EMAIL]);
  return {ok: true, product: product.label, permissions: product.permissions, expiresAt: expires.getTime(), activationUrl: ACTIVATION_URL + "?token=" + encodeURIComponent(token)};
}

function activatePurchase(data) {
  const token = clean(data.activation_token || data.token);
  const name = clean(data.nombre);
  const whatsapp = normalizeWhatsApp(data.whatsapp);
  const email = clean(data.correo).toLowerCase();
  if (!token) return fail("El enlace de activación no es válido.");
  if (name.length < 3) return fail("Ingresa tu nombre y apellido.");
  if (whatsapp.length < 9) return fail("Ingresa un número de WhatsApp válido.");
  if (!validEmail(email)) return fail("Ingresa un correo válido.");

  const activations = getAccessSheet(SHEETS.ACTIVATIONS);
  const row = findRowByValue(activations, 1, token);
  if (!row) return fail("El enlace de activación no existe.");
  const values = activations.getRange(row, 1, 1, HEADERS.ACTIVATIONS.length).getValues()[0];
  if (clean(values[5]).toUpperCase() !== "PENDIENTE") return fail("Este enlace ya fue utilizado.", {used: true});
  const expires = asDate(values[4]);
  if (!expires || new Date() > expires) return fail("Este enlace de activación venció. Solicita uno nuevo a Aquaelite.", {expired: true});

  const productCode = clean(values[1]);
  const product = PRODUCTS[productCode];
  if (!product) return fail("El producto asociado no es válido.");

  upsertUser(email, name, whatsapp);
  const grants = [];
  product.permissions.forEach(function(permission) {
    grants.push(grantPermission(email, permission, product.label, product.months));
  });
  upsertMasterCrm(name, whatsapp, email, product.label);
  activations.getRange(row, 6, 1, 3).setValues([["UTILIZADO", email, new Date()]]);

  MailApp.sendEmail({
    to: email,
    subject: "Tu acceso Aquaelite está habilitado",
    htmlBody: emailShell(
      "Acceso habilitado",
      "Hola " + escapeHtml(name) + ". Ya activamos " + escapeHtml(product.label) + ". Ingresa con este mismo correo y recibirás un código personal de 6 dígitos.",
      PORTAL_URL,
      "INGRESAR A MIS HERRAMIENTAS"
    )
  });
  return {ok: true, product: product.label, permissions: product.permissions, access: grants, portalUrl: PORTAL_URL, message: "Tu acceso quedó habilitado."};
}

function lookupClient(data) {
  const auth = authenticateAdmin(data);
  if (!auth.ok) return auth;
  const query = clean(data.busqueda);
  if (!query) return fail("Ingresa el correo o WhatsApp del cliente.");
  const email = query.indexOf("@") >= 0 ? query.toLowerCase() : findEmailByWhatsApp(normalizeWhatsApp(query));
  if (!email) return fail("No encontramos un cliente con ese dato.");
  const users = getAccessSheet(SHEETS.USERS);
  const row = findRowByValue(users, 1, email);
  const user = row ? users.getRange(row, 1, 1, HEADERS.USERS.length).getValues()[0] : [];
  const access = getAllPermissions(email);
  return {ok: true, cliente: {correo: email, nombre: clean(user[1]), whatsapp: clean(user[2])}, access: access};
}

function renewAccess(data) {
  const auth = authenticateAdmin(data);
  if (!auth.ok) return auth;
  const email = clean(data.cliente_correo).toLowerCase();
  const scope = clean(data.permiso).toUpperCase();
  const months = Number(data.meses);
  if (!validEmail(email)) return fail("Primero busca y selecciona un cliente válido.");
  if ([6, 12].indexOf(months) === -1) return fail("La renovación debe ser de 6 o 12 meses.");
  const wanted = scope === "AMBOS" ? ["PRO", "FUGAS"] : [scope];
  if (wanted.some(function(p) { return ["PRO", "FUGAS"].indexOf(p) === -1; })) return fail("Selecciona PRO, FUGAS o AMBOS.");

  const current = getAllPermissions(email);
  const existing = current.map(function(item) { return item.permission; });
  const applicable = wanted.filter(function(permission) { return existing.indexOf(permission) >= 0; });
  if (!applicable.length) return fail("El cliente no tiene ese permiso para renovar. Primero verifica el producto adquirido.");

  const renewed = applicable.map(function(permission) { return extendPermission(email, permission, months); });
  MailApp.sendEmail({
    to: email,
    subject: "Renovación confirmada | Aquaelite",
    htmlBody: emailShell(
      "Renovación confirmada",
      "Renovamos tu acceso " + applicable.join(" + ") + " por " + months + " meses. La nueva vigencia ya está disponible en tu portal.",
      PORTAL_URL,
      "INGRESAR A MIS HERRAMIENTAS"
    )
  });
  return {ok: true, correo: email, renewed: renewed, message: "Renovación aplicada correctamente."};
}

/* ---------------- PERMISOS ---------------- */

function grantPermission(email, permission, product, months) {
  const sheet = getAccessSheet(SHEETS.PERMISSIONS);
  const key = permissionKey(email, permission);
  const row = findRowByValue(sheet, 1, key);
  const now = new Date();
  if (row) {
    const values = sheet.getRange(row, 1, 1, HEADERS.PERMISSIONS.length).getValues()[0];
    const oldExpiry = asDate(values[5]);
    const base = oldExpiry && oldExpiry > now ? oldExpiry : now;
    const expiry = addMonths(base, months);
    sheet.getRange(row, 4, 1, 6).setValues([[product, asDate(values[4]) || now, expiry, "ACTIVO", now, ""]]);
    return permissionSummary(permission, product, asDate(values[4]) || now, expiry, "ACTIVO");
  }
  const expiry = addMonths(now, months);
  sheet.appendRow([key, email, permission, product, now, expiry, "ACTIVO", now, ""]);
  return permissionSummary(permission, product, now, expiry, "ACTIVO");
}

function extendPermission(email, permission, months) {
  const sheet = getAccessSheet(SHEETS.PERMISSIONS);
  const row = findRowByValue(sheet, 1, permissionKey(email, permission));
  if (!row) throw new Error("Permiso inexistente: " + permission);
  const values = sheet.getRange(row, 1, 1, HEADERS.PERMISSIONS.length).getValues()[0];
  const now = new Date();
  const oldExpiry = asDate(values[5]);
  const base = oldExpiry && oldExpiry > now ? oldExpiry : now;
  const expiry = addMonths(base, months);
  sheet.getRange(row, 6, 1, 4).setValues([[expiry, "ACTIVO", now, ""]]);
  return permissionSummary(permission, clean(values[3]), asDate(values[4]) || now, expiry, "ACTIVO");
}

function getActivePermissions(email, sendNotice) {
  const all = getAllPermissions(email);
  const now = new Date();
  const active = [];
  all.forEach(function(item) {
    if (item.status === "ACTIVO" && item.expiresAt && now.getTime() <= item.expiresAt) active.push(item);
    else if (item.status !== "REVOCADO" && item.expiresAt && now.getTime() > item.expiresAt) markExpiredAndNotify(email, item.permission, sendNotice);
  });
  return {permissions: active.map(function(item) { return item.permission; }), access: active};
}

function getAllPermissions(email) {
  const sheet = getAccessSheet(SHEETS.PERMISSIONS);
  if (sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.PERMISSIONS.length).getValues();
  return values.filter(function(row) { return clean(row[1]).toLowerCase() === email; }).map(function(row) {
    return permissionSummary(clean(row[2]), clean(row[3]), asDate(row[4]), asDate(row[5]), clean(row[6]).toUpperCase());
  });
}

function markExpiredAndNotify(email, permission, sendNotice) {
  const sheet = getAccessSheet(SHEETS.PERMISSIONS);
  const row = findRowByValue(sheet, 1, permissionKey(email, permission));
  if (!row) return;
  const values = sheet.getRange(row, 1, 1, HEADERS.PERMISSIONS.length).getValues()[0];
  sheet.getRange(row, 7).setValue("VENCIDO");
  if (!sendNotice || values[8]) return;
  MailApp.sendEmail({
    to: email,
    subject: "Tu acceso Aquaelite ha finalizado",
    htmlBody: '<div style="font-family:Arial,sans-serif;color:#102a43;max-width:560px;margin:auto"><h2>AQUAELITE®</h2><p>Tu acceso <b>' + escapeHtml(permission) + '</b> ha finalizado.</p><p>Comunícate con Aquaelite para renovarlo por 6 o 12 meses.</p><p><b>WhatsApp: ' + WHATSAPP_AQUAELITE + '</b></p></div>'
  });
  sheet.getRange(row, 9).setValue(new Date());
}

/* ---------------- MIGRACIÓN DE ACCESOS ANTERIORES ---------------- */

function migrateLegacyAccess(email) {
  migrateLegacyFugas(email);
  migrateLegacyPro(email);
}

function migrateLegacyFugas(email) {
  const ss = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.LEGACY_FUGAS);
  if (!sheet || sheet.getLastRow() < 2) return;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), 20)).getValues();
  rows.forEach(function(v) {
    if (clean(v[1]).toLowerCase() !== email || clean(v[5]).toUpperCase() !== "ACTIVO") return;
    const start = asDate(v[14]) || asDate(v[3]) || new Date();
    const expiry = asDate(v[15]) || addMonths(start, 6);
    importPermission(email, "FUGAS", "Acceso anterior Kit de Fugas y Pruebas", start, expiry);
    upsertUser(email, clean(v[0]), clean(v[2]));
  });
}

function migrateLegacyPro(email) {
  const ss = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.LEGACY_PRO);
  if (!sheet || sheet.getLastRow() < 2) return;
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(normalizeText);
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastColumn).getValues();
  rows.forEach(function(v) {
    const rowEmail = valueByHeader(v, headers, ["CORREO", "EMAIL", "CORREO ELECTRONICO"]);
    if (clean(rowEmail).toLowerCase() !== email) return;
    const status = normalizeText(valueByHeader(v, headers, ["ESTADO", "STATUS"]));
    const plan = normalizeText(valueByHeader(v, headers, ["PRODUCTO", "PLAN", "ACCESO COMERCIAL", "TIPO DE ACCESO"]));
    const eligible = status === "CO FUNDADOR" || status === "ACTIVO" && (plan.indexOf("AQUAELITE PRO") >= 0 || plan.indexOf("ACCESO PROFESIONAL") >= 0 || plan === "PRO");
    if (!eligible || status === "REVOCADO") return;
    const start = asDate(valueByHeader(v, headers, ["INICIO ACCESO", "FECHA INICIO", "INICIO"])) || new Date();
    const expiry = asDate(valueByHeader(v, headers, ["VENCIMIENTO ACCESO", "FECHA VENCIMIENTO", "VENCIMIENTO"])) || addMonths(start, 6);
    const name = valueByHeader(v, headers, ["NOMBRE", "NOMBRES", "CLIENTE"]);
    const whatsapp = valueByHeader(v, headers, ["WHATSAPP", "CELULAR", "TELEFONO"]);
    importPermission(email, "PRO", status === "CO FUNDADOR" ? "Aquaelite PRO · Cofundador" : "Aquaelite PRO anterior", start, expiry);
    upsertUser(email, clean(name), clean(whatsapp));
  });
}

function importPermission(email, permission, product, start, expiry) {
  const sheet = getAccessSheet(SHEETS.PERMISSIONS);
  const key = permissionKey(email, permission);
  if (findRowByValue(sheet, 1, key)) return;
  sheet.appendRow([key, email, permission, product, start, expiry, new Date() <= expiry ? "ACTIVO" : "VENCIDO", new Date(), ""]);
}

/* ---------------- USUARIOS Y CRM ---------------- */

function upsertUser(email, name, whatsapp) {
  const sheet = getAccessSheet(SHEETS.USERS);
  let row = findRowByValue(sheet, 1, email);
  if (!row) {
    sheet.appendRow([email, name, whatsapp, new Date(), "", "", "", "", "", "", 0]);
    return sheet.getLastRow();
  }
  if (name) sheet.getRange(row, 2).setValue(name);
  if (whatsapp) sheet.getRange(row, 3).setValue(whatsapp);
  return row;
}

function upsertMasterCrm(name, whatsapp, email, product) {
  const ss = SpreadsheetApp.openById(CRM_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CRM_SHEET_NAME);
  if (!sheet) throw new Error("No se encontró la pestaña CRM: " + CRM_SHEET_NAME);
  const normalized = normalizeWhatsApp(whatsapp);
  let row = 0;
  if (sheet.getLastRow() >= 2) {
    const phones = sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).getDisplayValues();
    for (let i = 0; i < phones.length; i++) {
      if (normalizeWhatsApp(phones[i][0]) === normalized) { row = i + 2; break; }
    }
  }
  const now = new Date();
  if (!row) {
    const id = "AQ-" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
    sheet.appendRow([id, now, name, whatsapp, "INTEKITFUGAS2 · COMPRA", product, "COMPRADOR", "PAGADO", "CLIENTE", "PAGADO", "", "", now, "Enviar bienvenida y verificar ingreso", "", "NO", "Correo de acceso: " + email]);
    return;
  }
  const currentProduct = clean(sheet.getRange(row, 6).getDisplayValue());
  if (currentProduct && currentProduct.indexOf(product) === -1) product = currentProduct + " + " + product;
  sheet.getRange(row, 3).setValue(name);
  sheet.getRange(row, 6, 1, 5).setValues([[product, "COMPRADOR", "PAGADO", "CLIENTE", "PAGADO"]]);
  sheet.getRange(row, 13).setValue(now);
  sheet.getRange(row, 14).setValue("Enviar bienvenida y verificar ingreso");
  const notes = clean(sheet.getRange(row, 17).getDisplayValue());
  const emailNote = "Correo de acceso: " + email;
  if (notes.indexOf(emailNote) === -1) sheet.getRange(row, 17).setValue(notes ? notes + " | " + emailNote : emailNote);
}

function findEmailByWhatsApp(whatsapp) {
  const sheet = getAccessSheet(SHEETS.USERS);
  if (sheet.getLastRow() < 2) return "";
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getDisplayValues();
  for (let i = 0; i < rows.length; i++) if (normalizeWhatsApp(rows[i][2]) === whatsapp) return clean(rows[i][0]).toLowerCase();
  return "";
}

/* ---------------- INSTALACIÓN Y CONTROL DIARIO ---------------- */

function ensureTechnicalSheets() {
  const ss = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID);
  ensureSheet(ss, SHEETS.USERS, HEADERS.USERS);
  ensureSheet(ss, SHEETS.PERMISSIONS, HEADERS.PERMISSIONS);
  ensureSheet(ss, SHEETS.ACTIVATIONS, HEADERS.ACTIVATIONS);
  ensureSheet(ss, SHEETS.ADMINS, HEADERS.ADMINS);
}

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  let initialized = false;
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initialized = true;
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    initialized = true;
  }
  else {
    const current = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
    if (current.join("|") !== headers.join("|")) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      initialized = true;
    }
  }
  if (sheet.getFrozenRows() !== 1) sheet.setFrozenRows(1);
  if (initialized) sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0b2748").setFontColor("#ffffff");
  return sheet;
}

function dailyExpiryCheck() {
  ensureTechnicalSheets();
  const sheet = getAccessSheet(SHEETS.PERMISSIONS);
  if (sheet.getLastRow() < 2) return;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.PERMISSIONS.length).getValues();
  rows.forEach(function(v, index) {
    const expiry = asDate(v[5]);
    if (clean(v[6]).toUpperCase() === "ACTIVO" && expiry && new Date() > expiry) {
      const row = index + 2;
      sheet.getRange(row, 7).setValue("VENCIDO");
      if (!v[8]) markExpiredAndNotify(clean(v[1]).toLowerCase(), clean(v[2]), true);
    }
  });
}

function instalarControlVencimientos() {
  const handlers = ScriptApp.getProjectTriggers().map(function(t) { return t.getHandlerFunction(); });
  if (handlers.indexOf("dailyExpiryCheck") === -1) ScriptApp.newTrigger("dailyExpiryCheck").timeBased().everyDays(1).atHour(9).create();
  return "Control diario instalado.";
}

/* ---------------- AYUDANTES ---------------- */

function getAccessSheet(name) {
  const sheet = SpreadsheetApp.openById(ACCESS_SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error("No se encontró la pestaña: " + name);
  return sheet;
}

function findRowByValue(sheet, column, value) {
  if (sheet.getLastRow() < 2) return 0;
  const finder = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).createTextFinder(String(value)).matchEntireCell(true).matchCase(false).findNext();
  return finder ? finder.getRow() : 0;
}

function permissionKey(email, permission) { return email.toLowerCase() + "|" + permission.toUpperCase(); }
function permissionSummary(permission, product, start, expiry, status) {
  return {permission: permission, product: product, startsAt: start ? start.getTime() : null, expiresAt: expiry ? expiry.getTime() : null, status: status};
}
function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}
function valueByHeader(row, headers, names) {
  for (let i = 0; i < names.length; i++) {
    const index = headers.indexOf(normalizeText(names[i]));
    if (index >= 0) return row[index];
  }
  return "";
}
function normalizeText(value) { return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(); }
function normalizeWhatsApp(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.indexOf("51") === 0) digits = digits.slice(2);
  return digits;
}
function asDate(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
function sixDigitCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
function randomToken() { return Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, ""); }
function clean(value) { return String(value || "").trim(); }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function maskEmail(email) {
  const parts = String(email).split("@");
  if (parts.length !== 2) return email;
  const user = parts[0];
  return (user.length <= 2 ? user.charAt(0) + "*" : user.slice(0, 2) + "***" + user.slice(-1)) + "@" + parts[1];
}
function fail(message, extra) {
  const result = {ok: false, message: message};
  if (extra) Object.keys(extra).forEach(function(key) { result[key] = extra[key]; });
  return result;
}
function escapeHtml(value) {
  return clean(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function emailShell(title, text, url, button) {
  return '<div style="font-family:Arial,sans-serif;color:#102a43;max-width:560px;margin:auto"><h2 style="color:#0b2748">AQUAELITE®</h2><h3>' + title + '</h3><p style="line-height:1.6">' + text + '</p><p style="margin:28px 0"><a href="' + url + '" style="background:#108fc7;color:white;text-decoration:none;padding:13px 20px;border-radius:7px;font-weight:bold">' + button + '</a></p><p style="font-size:12px;color:#6b7c8f">Aquaelite · Soluciones Integrales en Agua</p></div>';
}
function jsonp(obj, callback) {
  const safe = /^[a-zA-Z0-9_.$]+$/.test(callback) ? callback : "aquaeliteCallback";
  return ContentService.createTextOutput(safe + "(" + JSON.stringify(obj) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
}
