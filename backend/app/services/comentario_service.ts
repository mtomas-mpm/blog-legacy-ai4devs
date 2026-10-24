import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import type Comentario from '#models/comentario'
import type Post from '#models/post'
import ComentarioRepository from '#repositories/comentario_repository'
import NoEncontradoException from '#exceptions/no_encontrado_exception'
import ProhibidoException from '#exceptions/prohibido_exception'

/**
 * Clave de moderación escrita en el código, como estaba en `start/routes.ts`.
 * TODO(2024-11): sacarla a variables de entorno antes de subir a producción.
 */
const CLAVE_MODERACION = 'dev-secret-cambiar'

type Credenciales = { autorEmail?: unknown; claveModeracion?: unknown }

type EntradaCredenciales = {
  autor_email?: unknown
  headers: { 'x-clave-moderacion'?: unknown }
}

type EntradaComentario = {
  autor_nombre?: any
  autor_email?: any
  cuerpo?: any
  padre_id?: any
}

/** El legacy usaba `request.input('autor_email', '')`: solo `undefined` pasa a ''. */
function correoRecibido(credenciales: Credenciales) {
  return credenciales.autorEmail === undefined ? '' : credenciales.autorEmail
}

function normalizar(correo: unknown) {
  return String(correo).toLowerCase().trim()
}

export function puedeBorrar(comentario: { autorEmail: string }, credenciales: Credenciales) {
  const esModerador = credenciales.claveModeracion === CLAVE_MODERACION
  const esAutor = normalizar(comentario.autorEmail) === normalizar(correoRecibido(credenciales))
  return esModerador || esAutor
}

/** Distinta a `puedeBorrar` a propósito: es la regla que hoy aplica PATCH. */
export function puedeEditar(
  comentario: { autorEmail: string; estado: string },
  credenciales: Credenciales
) {
  return comentario.autorEmail === correoRecibido(credenciales) && comentario.estado === 'pendiente'
}

function aCredenciales(entrada: EntradaCredenciales): Credenciales {
  return {
    autorEmail: entrada.autor_email,
    claveModeracion: entrada.headers['x-clave-moderacion'],
  }
}

@inject()
export class ComentarioService {
  constructor(private repositorio: ComentarioRepository) {}

  async buscarPostPublicado(slug: string) {
    const post = await this.repositorio.buscarPostPublicado(slug)
    if (!post) throw new NoEncontradoException('Post no encontrado')
    return post
  }

  async crear(post: Post, entrada: EntradaComentario) {
    await this.repositorio.crear({
      postId: post.id,
      autorNombre: entrada.autor_nombre,
      autorEmail: entrada.autor_email,
      cuerpo: entrada.cuerpo,
      estado: 'pendiente',
      creadoEn: DateTime.utc(),
      padreId: entrada.padre_id ?? null,
    })
    return this.repositorio.ultimoCreado()
  }

  async borrar(id: string, entrada: EntradaCredenciales) {
    const comentario = await this.buscar(id)
    if (!puedeBorrar(comentario, aCredenciales(entrada))) {
      throw new ProhibidoException('No puedes borrar este comentario')
    }
    await this.repositorio.borrar(comentario)
    return comentario
  }

  async autorizarEdicion(id: string, entrada: EntradaCredenciales) {
    const comentario = await this.buscar(id)
    if (!puedeEditar(comentario, aCredenciales(entrada))) {
      throw new ProhibidoException('No puedes editar este comentario')
    }
    return comentario
  }

  /** Relee la fila tras guardar, como el legacy: devuelve lo que quedó en la base. */
  async editar(comentario: Comentario, cuerpo: string) {
    await this.repositorio.actualizarCuerpo(comentario, cuerpo)
    return this.buscar(comentario.id)
  }

  private async buscar(id: string | number) {
    const comentario = await this.repositorio.buscarPorId(id)
    if (!comentario) throw new NoEncontradoException('Comentario no encontrado')
    return comentario
  }
}
