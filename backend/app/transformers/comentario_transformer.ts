import { BaseTransformer } from '@adonisjs/core/transformers'
import type Comentario from '#models/comentario'

/** Formato en el que SQLite guarda `creado_en`; el legacy lo devolvía sin tocar. */
const FORMATO_FECHA_SQL = 'yyyy-MM-dd HH:mm:ss'

/**
 * Reproduce la fila de `comentarios` que el legacy devolvía con `select *`, incluido
 * `autor_email`. Quitarlo es un cambio de contrato pendiente, no parte de este refactor.
 */
export default class ComentarioTransformer extends BaseTransformer<Comentario> {
  toObject() {
    const comentario = this.resource
    return {
      id: comentario.id,
      post_id: comentario.postId,
      autor_nombre: comentario.autorNombre,
      autor_email: comentario.autorEmail,
      cuerpo: comentario.cuerpo,
      estado: comentario.estado,
      creado_en: comentario.creadoEn ? comentario.creadoEn.toFormat(FORMATO_FECHA_SQL) : null,
      padre_id: comentario.padreId,
    }
  }

  toBorrado() {
    return { borrado: true }
  }
}
