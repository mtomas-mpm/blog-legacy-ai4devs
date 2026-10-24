import db from '@adonisjs/lucid/services/db'

export const ID_POST = 9001
export const SLUG_POST = 'post-de-prueba'
export const CLAVE_MODERACION = 'dev-secret-cambiar'
export const FORMATO_FECHA_SQL = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

/** Las columnas de `comentarios`, que hoy salen tal cual en las respuestas. */
export const CAMPOS_COMENTARIO = [
  'id',
  'post_id',
  'autor_nombre',
  'autor_email',
  'cuerpo',
  'estado',
  'creado_en',
  'padre_id',
]

export function unPostPublicado(cambios: Record<string, unknown> = {}) {
  return {
    id: ID_POST,
    titulo: 'Post de prueba',
    slug: SLUG_POST,
    resumen: 'Resumen de prueba',
    cuerpo: '## Cuerpo de prueba',
    imagen_portada: null,
    estado: 'publicado',
    publicado_en: '2026-01-01 10:00:00',
    autor_id: 1,
    categoria_id: 1,
    autor_nombre: 'Marta Ruiz Calvo',
    autor_email: 'marta.ruiz@corriente.es',
    categoria_nombre: 'Noticias',
    etiquetas: 'Artículos',
    created_at: '2026-01-01 10:00:00',
    updated_at: '2026-01-01 10:00:00',
    ...cambios,
  }
}

export function unComentario(cambios: Record<string, unknown> = {}) {
  return {
    post_id: ID_POST,
    autor_nombre: 'Lucía Ferrer',
    autor_email: 'lucia.ferrer@ejemplo.es',
    cuerpo: 'Un comentario suficientemente largo.',
    estado: 'pendiente',
    creado_en: '2026-01-02 09:30:00',
    padre_id: null,
    ...cambios,
  }
}

export async function insertarPost(cambios: Record<string, unknown> = {}) {
  await db.table('posts').insert(unPostPublicado(cambios))
}

export async function insertarComentario(cambios: Record<string, unknown> = {}) {
  const [id] = await db.table('comentarios').insert(unComentario(cambios))
  return Number(id)
}

export function buscarComentario(id: number) {
  return db.from('comentarios').where('id', id).first()
}
