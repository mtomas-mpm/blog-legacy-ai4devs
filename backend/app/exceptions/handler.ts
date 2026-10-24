import app from '@adonisjs/core/services/app'
import { errors as errorsVine } from '@vinejs/vine'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { CODIGOS_DE_ERROR } from '#validators/comentario'
import NoEncontradoException from '#exceptions/no_encontrado_exception'
import ProhibidoException from '#exceptions/prohibido_exception'

/**
 * Contrato de error que los endpoints de comentarios tienen hoy. Es incoherente (cuatro
 * formas y un 200 para un fallo), pero cambiarlo es otra tarea con su propio test.
 */
const RESPUESTAS_DE_VALIDACION: Record<string, { status: number; cuerpo: object }> = {
  [CODIGOS_DE_ERROR.nombreObligatorio]: {
    status: 400,
    cuerpo: { error: 'El nombre es obligatorio' },
  },
  [CODIGOS_DE_ERROR.faltaEmail]: { status: 422, cuerpo: { message: 'Falta el email' } },
  [CODIGOS_DE_ERROR.emailNoValido]: { status: 400, cuerpo: { errores: ['email no válido'] } },
  [CODIGOS_DE_ERROR.cuerpoCorto]: {
    status: 200,
    cuerpo: { ok: false, motivo: 'comentario demasiado corto' },
  },
  [CODIGOS_DE_ERROR.faltaCuerpo]: { status: 400, cuerpo: { error: 'Falta el cuerpo' } },
}

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /** El legacy respondía estos 404/403 sin dejar rastro en el log. */
  protected ignoreCodes = [NoEncontradoException.code, ProhibidoException.code]

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof errorsVine.E_VALIDATION_ERROR) {
      const respuesta = RESPUESTAS_DE_VALIDACION[error.messages[0]?.message]
      if (respuesta) return ctx.response.status(respuesta.status).send(respuesta.cuerpo)
    }

    if (error instanceof NoEncontradoException || error instanceof ProhibidoException) {
      return ctx.response.status(error.status).send({ error: error.message })
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
