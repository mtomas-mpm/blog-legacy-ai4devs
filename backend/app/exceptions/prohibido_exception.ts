import { Exception } from '@adonisjs/core/exceptions'

export default class ProhibidoException extends Exception {
  static status = 403
  static code = 'E_PROHIBIDO'
}
