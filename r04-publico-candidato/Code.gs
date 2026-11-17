/**
 * AQUAELITE® | R04 PUBLICO — CANDIDATO SIN DESPLEGAR
 * Crear como proyecto Apps Script INDEPENDIENTE del laboratorio y del Portal comercial.
 * Requiere propiedades: AQ_FREE_SHEET_ID y AQ_FREE_SECRET (secreto aleatorio de al menos 32 caracteres).
 * NO conectar CRM Maestro; almacenamiento aislado en hoja "ACCESOS_FREE".
 * Transporta datos mediante google.script.run en su propio origen, no JSONP ni token en URLs.
 * AUN NO APROBADO PARA PUBLICO: auditoria de privacidad, abuso y E2E pendientes.
 */
const FREE_R04=Object.freeze({
 tab:'ACCESOS_FREE', otpMs:15*60*1000,sessionMs:48*60*60*1000,
 resendMs:60*1000,maxAttempts:5,maxHour:5,maxDay:12,
 fields:['Correo','Nombre','WhatsApp','Perfil','Consentimiento','Fecha solicitud','Estado',
 'Codigo hash','Codigo vence','Ultimo envio','Intentos','Token hash','Sesion vence','Ultimo acceso']
});
function freeProp_(k){return PropertiesService.getScriptProperties().getProperty(k)}
function freeSetupCheck_(){
 const id=freeProp_('AQ_FREE_SHEET_ID'),secret=freeProp_('AQ_FREE_SECRET');
 if(!id||!secret||secret.length<32)throw Error('Falta configurar AQ_FREE_SHEET_ID o AQ_FREE_SECRET');
 return {id,secret};
}
function freeSheet_(){
 const cfg=freeSetupCheck_(), ss=SpreadsheetApp.openById(cfg.id);
 let sh=ss.getSheetByName(FREE_R04.tab);
 if(!sh){sh=ss.insertSheet(FREE_R04.tab);sh.appendRow(FREE_R04.fields);sh.setFrozenRows(1)}
 if(sh.getRange(1,1,1,FREE_R04.fields.length).getDisplayValues()[0].join('|')!==FREE_R04.fields.join('|'))throw Error('Cabecera de base FREE inesperada');
 return sh;
}
/** START multiorigen: etiquetas de atribución, no comprobantes de procedencia. */
const FREE_START_ORIGINS=Object.freeze(['DIRECTO','WEB_CORPORATIVA','KIT_FUGAS','KIT_PRUEBAS','REDES_SOCIALES']);
const FREE_START_EVENTS_TAB='EVENTOS_START';
const FREE_START_EVENTS_HEADERS=['Correo','Categoria','Origen','Campania','Fecha ingreso'];
function freeStartOrigin_(v){
 const x=String(v||'DIRECTO').trim().toUpperCase();
 return FREE_START_ORIGINS.includes(x)?x:'DIRECTO';
}
function freeStartCampaign_(v){
 const x=String(v||'').trim().toUpperCase();
 return /^[A-Z0-9_-]{0,40}$/.test(x)?x:'';
}
function freeStartEvent_(email,origin,campaign){
 const ss=SpreadsheetApp.openById(freeSetupCheck_().id);
 let sh=ss.getSheetByName(FREE_START_EVENTS_TAB);
 if(!sh){sh=ss.insertSheet(FREE_START_EVENTS_TAB);sh.appendRow(FREE_START_EVENTS_HEADERS);sh.setFrozenRows(1)}
 if(sh.getRange(1,1,1,5).getDisplayValues()[0].join('|')!==FREE_START_EVENTS_HEADERS.join('|'))
  throw Error('Cabecera de EVENTOS_START inesperada');
 sh.appendRow([email,'START',freeStartOrigin_(origin),freeStartCampaign_(campaign),new Date()]);
}
function freeEmail_(v){return String(v||'').trim().toLowerCase()}
function freeValidEmail_(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254}
function freeClean_(v,n){return String(v||'').trim().replace(/[<>]/g,'').slice(0,n)}
function freeDigest_(value){
 const cfg=freeSetupCheck_();return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(value),cfg.secret,Utilities.Charset.UTF_8));
}
function freeFind_(sh,email){
 const last=sh.getLastRow();if(last<2)return 0;
 const hit=sh.getRange(2,1,last-1,1).createTextFinder(email).matchEntireCell(true).matchCase(false).findNext();
 return hit?hit.getRow():0;
}
function freeLocked_(fn){
 const lock=LockService.getScriptLock();if(!lock.tryLock(8000))return {ok:false,message:'Servidor ocupado, inténtalo nuevamente.'};
 try{return fn()}catch(err){console.error(err);return {ok:false,message:'No pudimos completar la solicitud.'}}
 finally{lock.releaseLock()}
}
function freeCounters_(email){
 const digest=freeDigest_(email).slice(0,18), now=new Date(), hour=Utilities.formatDate(now,'GMT','yyyyMMddHH'),day=Utilities.formatDate(now,'GMT','yyyyMMdd');
 const props=PropertiesService.getScriptProperties();
 const hk='AQ_FREE_MAIL_H_'+digest+'_'+hour,dk='AQ_FREE_MAIL_D_'+digest+'_'+day;
 return {props,hk,dk,h:Number(props.getProperty(hk)||0),d:Number(props.getProperty(dk)||0)};
}
function freeRegister(data){
 return freeLocked_(()=>{
  const d=data||{}, email=freeEmail_(d.correo),name=freeClean_(d.nombre,100),
   phone=String(d.whatsapp||'').replace(/\D/g,''),profile=freeClean_(d.perfil,40);
  if(!freeValidEmail_(email)||name.length<5||phone.length<9||phone.length>15||!['persona','servicios','empresa'].includes(profile)||d.consentimiento!=='SI')
   return {ok:false,message:'Revisa los datos y acepta el registro.'};
  const sh=freeSheet_(),row=freeFind_(sh,email);
  if(row){
   const state=String(sh.getRange(row,7).getValue());
   // No modificar perfil/identidad ya verificados sin control de reautenticación.
   if(state==='VERIFICADO')return {ok:true,message:'Si ya estás registrado, solicita un código para ingresar.'};
   sh.getRange(row,2,1,5).setValues([[name,phone,profile,'SI',new Date()]]);
  }else{
   sh.appendRow([email,name,phone,profile,'SI',new Date(),'PENDIENTE','','','',0,'','','']);
  }
  return {ok:true,message:'Registro recibido. Solicita el código de verificación.'};
 });
}
function freeRequestCode(correo){
 return freeLocked_(()=>{
  const email=freeEmail_(correo);
  if(!freeValidEmail_(email))return {ok:false,message:'Correo inválido.'};
  const sh=freeSheet_(),row=freeFind_(sh,email);
  // No detallar si existe un correo; UX igual para evitar enumeración básica.
  if(!row)return {ok:true,message:'Si el correo está registrado, recibirá un código.'};
  const now=Date.now(),v=sh.getRange(row,1,1,14).getValues()[0];
  if(now-Number(v[9]||0)<FREE_R04.resendMs)return {ok:false,message:'Espera un minuto antes de solicitar otro código.'};
  const q=freeCounters_(email);
  if(q.h>=FREE_R04.maxHour||q.d>=FREE_R04.maxDay)return {ok:false,message:'Se alcanzó el límite de envíos. Intenta más tarde.'};
  const pin=String(100000+(parseInt(Utilities.getUuid().replace(/-/g,'').slice(0,12),16)%900000));
  MailApp.sendEmail({to:email,subject:'Aquaelite | Código de acceso gratuito',body:'Tu código de verificación: '+pin+'\nVence en 15 minutos. Si no lo solicitaste, ignora este correo.'});
  // Incrementar solo tras envío satisfactorio; no reiniciar contadores con nuevos códigos.
  q.props.setProperties({[q.hk]:String(q.h+1),[q.dk]:String(q.d+1)},false);
  sh.getRange(row,8,1,6).setValues([[freeDigest_(email+':'+pin),now+FREE_R04.otpMs,now,0,'','']]);
  return {ok:true,message:'Si el correo está registrado, recibirá un código.'};
 });
}
function freeVerifyCode(correo,codigo,origen,campania){
 return freeLocked_(()=>{
  const email=freeEmail_(correo),pin=String(codigo||'').trim();
  if(!freeValidEmail_(email)||!/^\d{6}$/.test(pin))return {ok:false,message:'Código incorrecto o vencido.'};
  const sh=freeSheet_(),row=freeFind_(sh,email);
  if(!row)return {ok:false,message:'Código incorrecto o vencido.'};
  const v=sh.getRange(row,1,1,14).getValues()[0],now=Date.now();
  if(Number(v[10]||0)>=FREE_R04.maxAttempts||!v[7]||now>=Number(v[8]||0))
    return {ok:false,message:'Código incorrecto o vencido. Solicita uno nuevo.'};
  if(String(v[7])!==freeDigest_(email+':'+pin)){
   sh.getRange(row,11).setValue(Number(v[10]||0)+1);
   return {ok:false,message:'Código incorrecto o vencido.'};
  }
  const token=Utilities.getUuid()+Utilities.getUuid(),expiresAt=now+FREE_R04.sessionMs;
  sh.getRange(row,7).setValue('VERIFICADO');
  sh.getRange(row,8,1,6).setValues([['','','',0,freeDigest_(email+':'+token),expiresAt]]);
  sh.getRange(row,14).setValue(new Date());
  // La atribución no bloquea el acceso si falla el registro de marketing.
  try{freeStartEvent_(email,origen,campania)}catch(err){console.error('START evento no registrado:',err)}
  return {ok:true,correo:email,nombre:String(v[1]||''),token,expiresAt,permissions:['FREE']};
 });
}
function freeCheckSession(correo,token){
 const email=freeEmail_(correo);
 if(!freeValidEmail_(email)||!token||String(token).length>150)return {ok:false,message:'Sesión inválida.'};
 const sh=freeSheet_(),row=freeFind_(sh,email);
 if(!row)return {ok:false,message:'Sesión inválida.'};
 const v=sh.getRange(row,1,1,14).getValues()[0], expiresAt=Number(v[12]||0);
 if(v[6]!=='VERIFICADO'||expiresAt<=Date.now()||String(v[11])!==freeDigest_(email+':'+token))
  return {ok:false,message:'Sesión inválida o vencida.'};
 return {ok:true,correo:email,nombre:String(v[1]||''),expiresAt,permissions:['FREE']};
}
function doGet(e){
 const p=(e&&e.parameter)||{};
 const t=HtmlService.createTemplateFromFile('FreePortal');
 // Solo valores acotados y aprobados se imprimen en el HTML.
 t.startAttribution=JSON.stringify({origen:freeStartOrigin_(p.src),campania:freeStartCampaign_(p.cmp)});
 return t.evaluate().setTitle('Aquaelite | Acceso gratuito');
}
