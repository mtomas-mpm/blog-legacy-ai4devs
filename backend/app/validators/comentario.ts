import vine, { SimpleMessagesProvider } from '@vinejs/vine'

/**
 * Las reglas copian las comprobaciones del legacy tal cual (valor falsy, `indexOf('@')`,
 * `String(valor).length`), así que se usa `vine.any()` en vez de `vine.string()`: un tipo
 * más estricto rechazaría entradas que hoy se aceptan.
 *
 * Cada fallo se reporta con un código, y `app/exceptions/handler.ts` traduce ese código
 * a la respuesta que el endpoint devuelve hoy.
 */
const presente = vine.createRule((valor, _opciones, campo) => {
  if (!valor) campo.report('El campo {{ field }} es obligatorio', 'presente', campo)
})

const contieneArroba = vine.createRule((valor, _opciones, campo) => {
  if (String(valor).indexOf('@') === -1) {
    campo.report('El campo {{ field }} no es un correo', 'contieneArroba', campo)
  }
})

const longitudMinima = vine.createRule<{ min: number }>((valor, opciones, campo) => {
  if (String(valor).length < opciones.min) {
    campo.report('El campo {{ field }} es demasiado corto', 'longitudMinima', campo)
  }
})

export const CODIGOS_DE_ERROR = {
  nombreObligatorio: 'comentario.nombre_obligatorio',
  faltaEmail: 'comentario.falta_email',
  emailNoValido: 'comentario.email_no_valido',
  cuerpoCorto: 'comentario.cuerpo_corto',
  faltaCuerpo: 'comentario.falta_cuerpo',
} as const

/**
 * El orden de los campos es el orden de comprobación del legacy: con varios fallos,
 * gana el primero.
 */
export const crearComentarioValidator = vine.create({
  autor_nombre: vine.any().use(presente()),
  autor_email: vine.any().use(presente()).use(contieneArroba()),
  cuerpo: vine
    .any()
    .use(presente())
    .use(longitudMinima({ min: 5 })),
  padre_id: vine.any().nullable().optional(),
})

crearComentarioValidator.messagesProvider = new SimpleMessagesProvider({
  'autor_nombre.required': CODIGOS_DE_ERROR.nombreObligatorio,
  'autor_nombre.presente': CODIGOS_DE_ERROR.nombreObligatorio,
  'autor_email.required': CODIGOS_DE_ERROR.faltaEmail,
  'autor_email.presente': CODIGOS_DE_ERROR.faltaEmail,
  'autor_email.contieneArroba': CODIGOS_DE_ERROR.emailNoValido,
  'cuerpo.required': CODIGOS_DE_ERROR.cuerpoCorto,
  'cuerpo.presente': CODIGOS_DE_ERROR.cuerpoCorto,
  'cuerpo.longitudMinima': CODIGOS_DE_ERROR.cuerpoCorto,
})

/** Quién pide borrar o editar: el correo (cuerpo o query) y la cabecera de moderación. */
export const credencialesComentarioValidator = vine.create({
  autor_email: vine.any().nullable().optional(),
  headers: vine.object({
    'x-clave-moderacion': vine.any().optional(),
  }),
})

export const editarComentarioValidator = vine.create({
  cuerpo: vine.any().use(presente()),
})

editarComentarioValidator.messagesProvider = new SimpleMessagesProvider({
  'cuerpo.required': CODIGOS_DE_ERROR.faltaCuerpo,
  'cuerpo.presente': CODIGOS_DE_ERROR.faltaCuerpo,
})
