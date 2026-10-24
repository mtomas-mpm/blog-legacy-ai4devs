import Comentario from '#models/comentario'
import Post from '#models/post'

type NuevoComentario = Pick<
  Comentario,
  'postId' | 'autorNombre' | 'autorEmail' | 'cuerpo' | 'estado' | 'creadoEn' | 'padreId'
>

export default class ComentarioRepository {
  buscarPostPublicado(slug: string) {
    return Post.query().where('slug', slug).where('estado', 'publicado').first()
  }

  async crear(datos: NuevoComentario) {
    await Comentario.create(datos)
  }

  /** Igual que el legacy: la última fila de la tabla, no necesariamente la recién creada. */
  ultimoCreado() {
    return Comentario.query().orderBy('id', 'desc').firstOrFail()
  }

  buscarPorId(id: string | number) {
    return Comentario.find(id)
  }

  async borrar(comentario: Comentario) {
    await comentario.delete()
  }

  async actualizarCuerpo(comentario: Comentario, cuerpo: string) {
    comentario.cuerpo = cuerpo
    await comentario.save()
  }
}
