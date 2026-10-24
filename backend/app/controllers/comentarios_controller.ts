import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ComentarioService } from '#services/comentario_service'
import ComentarioTransformer from '#transformers/comentario_transformer'
import {
  crearComentarioValidator,
  credencialesComentarioValidator,
  editarComentarioValidator,
} from '#validators/comentario'

/**
 * El orden de cada método es el contrato de hoy: primero el recurso (404), después el
 * permiso (403) y al final la entrada.
 */
@inject()
export default class ComentariosController {
  constructor(private servicio: ComentarioService) {}

  async store({ params, request, response, serialize }: HttpContext) {
    const post = await this.servicio.buscarPostPublicado(params.slug)
    const entrada = await request.validateUsing(crearComentarioValidator)
    const comentario = await this.servicio.crear(post, entrada)

    response.status(201)
    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(comentario) })
  }

  async destroy({ params, request, serialize }: HttpContext) {
    const credenciales = await request.validateUsing(credencialesComentarioValidator)
    const comentario = await this.servicio.borrar(params.id, credenciales)

    return serialize.withoutWrapping(
      ComentarioTransformer.transform(comentario).useVariant('toBorrado')
    )
  }

  async update({ params, request, serialize }: HttpContext) {
    const credenciales = await request.validateUsing(credencialesComentarioValidator)
    const comentario = await this.servicio.autorizarEdicion(params.id, credenciales)
    const { cuerpo } = await request.validateUsing(editarComentarioValidator)
    const editado = await this.servicio.editar(comentario, cuerpo)

    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(editado) })
  }
}
