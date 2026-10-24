import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  CAMPOS_COMENTARIO,
  CLAVE_MODERACION,
  ID_POST,
  buscarComentario,
  insertarComentario,
  insertarPost,
} from '#tests/fixtures/blog'

const CUERPO_ORIGINAL = 'Un comentario suficientemente largo.'
const CUERPO_NUEVO = 'Lo reescribo con más calma.'

async function cuerpoGuardado(id: number) {
  const fila = await buscarComentario(id)
  return fila.cuerpo
}

test.group('PATCH /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('responde 404 si el comentario no existe', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client
      .patch('/comentarios/424242')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: CUERPO_NUEVO })

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Comentario no encontrado' })
  })

  test('el autor edita su comentario pendiente y recibe la fila completa', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario()

    // Act
    const respuesta = await client
      .patch(`/comentarios/${id}`)
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: CUERPO_NUEVO })

    // Assert
    respuesta.assertStatus(200)
    const cuerpo = respuesta.body()
    assert.sameMembers(Object.keys(cuerpo), ['comentario'])
    assert.sameMembers(Object.keys(cuerpo.comentario), CAMPOS_COMENTARIO)
    assert.deepEqual(cuerpo.comentario, {
      id,
      post_id: ID_POST,
      autor_nombre: 'Lucía Ferrer',
      // Caracteriza el comportamiento de hoy: la respuesta devuelve el correo de quien comenta.
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: CUERPO_NUEVO,
      estado: 'pendiente',
      creado_en: '2026-01-02 09:30:00',
      padre_id: null,
    })
    assert.notProperty(cuerpo.comentario, 'created_at')
    assert.notProperty(cuerpo.comentario, 'updated_at')

    const fila = await buscarComentario(id)
    assert.equal(fila.cuerpo, CUERPO_NUEVO)
    assert.equal(fila.creado_en, '2026-01-02 09:30:00')
  })

  test('devuelve creado_en a null si la fila no tiene fecha', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario({ creado_en: null })

    // Act
    const respuesta = await client
      .patch(`/comentarios/${id}`)
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: CUERPO_NUEVO })

    // Assert
    respuesta.assertStatus(200)
    assert.property(respuesta.body().comentario, 'creado_en')
    assert.isNull(respuesta.body().comentario.creado_en)
  })

  test('acepta un cuerpo de un solo carácter', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario()

    // Act
    const respuesta = await client
      .patch(`/comentarios/${id}`)
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'x' })

    // Assert
    respuesta.assertStatus(200)
    assert.equal(respuesta.body().comentario.cuerpo, 'x')
  })

  test('responde 403 si el correo cambia de mayúsculas', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario()

    // Act
    const respuesta = await client
      .patch(`/comentarios/${id}`)
      .json({ autor_email: 'Lucia.Ferrer@ejemplo.es', cuerpo: CUERPO_NUEVO })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
    assert.equal(await cuerpoGuardado(id), CUERPO_ORIGINAL)
  })

  test('responde 403 si el comentario ya está aprobado, aunque el correo coincida', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario({ estado: 'aprobado' })

    // Act
    const respuesta = await client
      .patch(`/comentarios/${id}`)
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: CUERPO_NUEVO })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
    assert.equal(await cuerpoGuardado(id), CUERPO_ORIGINAL)
  })

  test('responde 403 con la clave de moderación: aquí no sirve', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario()

    // Act
    const respuesta = await client
      .patch(`/comentarios/${id}`)
      .header('x-clave-moderacion', CLAVE_MODERACION)
      .json({ cuerpo: CUERPO_NUEVO })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
    assert.equal(await cuerpoGuardado(id), CUERPO_ORIGINAL)
  })

  test('responde 400 si falta el cuerpo y no toca la fila', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario()

    // Act
    const respuesta = await client
      .patch(`/comentarios/${id}`)
      .json({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'Falta el cuerpo' })
    assert.equal(await cuerpoGuardado(id), CUERPO_ORIGINAL)
  })

  test('comprueba el permiso antes que la entrada: 403 aunque falte el cuerpo', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario()

    // Act
    const respuesta = await client
      .patch(`/comentarios/${id}`)
      .json({ autor_email: 'otra.persona@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
  })
})
