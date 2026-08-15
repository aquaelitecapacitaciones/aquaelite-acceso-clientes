const ADMIN_EMAIL = "aquaelitecapacitaciones@gmail.com";
const MASTER_SPREADSHEET_NAME = "Aquaelite PRO - Accesos A130";
const SHEET_NAME = "Kit de Fugas y Pruebas";
const TOOL_NAME = "KIT-FUGAS-Y-PRUEBAS";

function doGet(e) {
  try {
    const data = (e && e.parameter) ? e.parameter : {};
    const action = data.action || "status";
    const callback = data.callback || "aquaeliteCallback";
    let result;

    if (action === "register_application") result = registerApplication(data);
    else if (action === "register_access") result = registerAccess(data);
    else if (action === "check_access") result = checkAccess(data);
    else result = {
      ok: true,
      system: "Aquaelite - Kit de Fugas y Pruebas",
      message: "Control de accesos activo"
    };

    return jsonp(result, callback);
  } catch (err) {
    return jsonp({
      ok: false,
      message: "Error interno.",
      error: String(err)
    }, (e && e.parameter && e.parameter.callback) || "aquaeliteCallback");
  }
}

/* =========================================================
   AUTORREGISTRO DEL COMPRADOR
   - El cliente llena sus datos.
   - La fila se crea automáticamente como PENDIENTE.
   - Aquaelite solo cambia Estado a ACTIVO o REVOCADO.
========================================================= */
function registerApplication(data) {
  const nombre = clean(data.nombre);
  const correo = clean(data.correo).toLowerCase();
  const whatsapp = normalizePhone(data.whatsapp);

  if (!nombre || !validEmail(correo) || whatsapp.length < 9) {
    return { ok: false, message: "Completa correctamente nombre, WhatsApp y correo." };
  }

  const sheet = getSheet();
  const byEmail = findByEmail(sheet, correo);
  const byWhatsapp = findByWhatsapp(sheet, whatsapp);

  /* Evitar que un correo y un WhatsApp queden en filas distintas */
  if (byEmail && byWhatsapp && byEmail.rowNumber !== byWhatsapp.rowNumber) {
    return {
      ok: false,
      conflict: true,
      message: "El correo o WhatsApp ya está asociado a otro registro. Comunícate con Aquaelite."
    };
  }

  const row = byEmail || byWhatsapp;
  const now = new Date();

  if (row) {
    const v = row.values;
    const estado = String(v[5] || "PENDIENTE").toUpperCase().trim();
    const correoActual = String(v[1] || "").toLowerCase().trim();
    const whatsappActual = normalizePhone(v[2]);

    if (correoActual && correoActual !== correo) {
      return { ok: false, conflict: true, message: "Este WhatsApp ya está asociado a otro correo." };
    }
    if (whatsappActual && whatsappActual !== whatsapp) {
      return { ok: false, conflict: true, message: "Este correo ya está asociado a otro WhatsApp." };
    }
    if (estado === "REVOCADO") {
      return { ok: false, revoked: true, estado: "REVOCADO", message: "Este acceso fue revocado. Comunícate con Aquaelite." };
    }

    sheet.getRange(row.rowNumber, 1).setValue(nombre);
    sheet.getRange(row.rowNumber, 2).setValue(correo);
    sheet.getRange(row.rowNumber, 3).setValue(whatsapp);
    if (!v[3]) sheet.getRange(row.rowNumber, 4).setValue(now);
    sheet.getRange(row.rowNumber, 14).setValue(TOOL_NAME);

    if (estado === "ACTIVO") {
      return {
        ok: true,
        approved: true,
        estado: "ACTIVO",
        nombre,
        correo,
        whatsapp,
        message: "Tu registro ya fue autorizado por Aquaelite."
      };
    }

    /* Cualquier estado distinto de ACTIVO/REVOCADO se normaliza a PENDIENTE */
    sheet.getRange(row.rowNumber, 6).setValue("PENDIENTE");

    return {
      ok: true,
      approved: false,
      pending: true,
      estado: "PENDIENTE",
      nombre,
      correo,
      whatsapp,
      message: "Tu solicitud está pendiente de aprobación por Aquaelite."
    };
  }

  /* Nuevo registro: toda la fila se crea automáticamente */
  sheet.appendRow([
    nombre,                 // A Nombre
    correo,                 // B Correo
    whatsapp,               // C WhatsApp
    now,                    // D Fecha registro
    "",                     // E Código
    "PENDIENTE",            // F Estado
    "",                     // G Código enviado
    "",                     // H Código vence
    "",                     // I Primer acceso
    "",                     // J Último acceso
    0,                      // K N.º accesos
    "",                     // L Token sesión
    "",                     // M Sesión vence
    TOOL_NAME               // N Herramienta
  ]);

  try {
    MailApp.sendEmail(
      ADMIN_EMAIL,
      "Solicitud pendiente | Kit de Fugas y Pruebas | " + nombre,
      "Se registró automáticamente una nueva solicitud.\n\n" +
      "Nombre: " + nombre +
      "\nCorreo: " + correo +
      "\nWhatsApp: " + whatsapp +
      "\nFecha: " + formatDate(now) +
      "\nEstado: PENDIENTE\n\n" +
      "Para autorizar, cambia la columna Estado a ACTIVO en la pestaña '" + SHEET_NAME + "'."
    );
  } catch (e) {}

  return {
    ok: true,
    approved: false,
    pending: true,
    estado: "PENDIENTE",
    nombre,
    correo,
    whatsapp,
    firstRegistration: true,
    message: "Solicitud registrada. Aquaelite debe autorizar tu acceso."
  };
}

/* =========================================================
   REGISTRAR INGRESO SOLO SI ESTÁ ACTIVO
========================================================= */
function registerAccess(data) {
  const correo = clean(data.correo).toLowerCase();
  if (!validEmail(correo)) return { ok: false, message: "Correo no válido." };

  const sheet = getSheet();
  const row = findByEmail(sheet, correo);
  if (!row) {
    return {
      ok: false,
      notRegistered: true,
      message: "No encontramos una solicitud para este correo. Registra primero tu compra."
    };
  }

  const v = row.values;
  const estado = String(v[5] || "PENDIENTE").toUpperCase().trim();

  if (estado === "REVOCADO") {
    return { ok: false, revoked: true, estado: "REVOCADO", message: "Este acceso fue revocado." };
  }
  if (estado !== "ACTIVO") {
    return { ok: false, pending: true, estado: "PENDIENTE", message: "Tu acceso aún está pendiente de aprobación." };
  }

  const now = new Date();
  if (!v[8]) sheet.getRange(row.rowNumber, 9).setValue(now);
  sheet.getRange(row.rowNumber, 10).setValue(now);
  const accesses = Number(v[10] || 0) + 1;
  sheet.getRange(row.rowNumber, 11).setValue(accesses);
  sheet.getRange(row.rowNumber, 14).setValue(TOOL_NAME);

  return {
    ok: true,
    estado: "ACTIVO",
    nombre: v[0],
    correo,
    whatsapp: normalizePhone(v[2]),
    accesos
  };
}

/* =========================================================
   VIGILANCIA DE ACTIVO / REVOCADO
========================================================= */
function checkAccess(data) {
  const correo = clean(data.correo).toLowerCase();
  if (!validEmail(correo)) return { ok: false, message: "Correo no válido." };

  const sheet = getSheet();
  const row = findByEmail(sheet, correo);
  if (!row) return { ok: false, notRegistered: true, message: "Usuario no registrado." };

  const v = row.values;
  const estado = String(v[5] || "PENDIENTE").toUpperCase().trim();
  if (estado === "REVOCADO") return { ok: false, revoked: true, estado: "REVOCADO", message: "Acceso revocado." };
  if (estado !== "ACTIVO") return { ok: false, pending: true, estado: "PENDIENTE", message: "Acceso pendiente de aprobación." };

  sheet.getRange(row.rowNumber, 10).setValue(new Date());
  return { ok: true, estado: "ACTIVO", nombre: v[0], correo };
}

/* =========================================================
   GOOGLE SHEET MAESTRO
========================================================= */
function getSheet() {
  const files = DriveApp.getFilesByName(MASTER_SPREADSHEET_NAME);
  let ss = null;

  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      ss = SpreadsheetApp.openById(file.getId());
      break;
    }
  }

  if (!ss) throw new Error("No se encontró el Google Sheet maestro: " + MASTER_SPREADSHEET_NAME);

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Nombre","Correo","WhatsApp","Fecha registro","Código","Estado",
      "Código enviado","Código vence","Primer acceso","Último acceso",
      "N.º accesos","Token sesión","Sesión vence","Herramienta"
    ]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function findByWhatsapp(sheet, phone) {
  if (sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getValues();
  for (let i = 0; i < values.length; i++) {
    if (normalizePhone(values[i][2]) === phone) return { rowNumber: i + 2, values: values[i] };
  }
  return null;
}

function findByEmail(sheet, email) {
  if (sheet.getLastRow() < 2) return null;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][1] || "").toLowerCase().trim() === email) return { rowNumber: i + 2, values: values[i] };
  }
  return null;
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length > 9 ? digits.slice(-9) : digits;
}
function clean(value) { return String(value || "").trim(); }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function formatDate(date) { return Utilities.formatDate(new Date(date), "America/Lima", "dd/MM/yyyy HH:mm:ss"); }
function jsonp(obj, callback) {
  const safe = /^[a-zA-Z0-9_.$]+$/.test(callback) ? callback : "aquaeliteCallback";
  return ContentService.createTextOutput(safe + "(" + JSON.stringify(obj) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
