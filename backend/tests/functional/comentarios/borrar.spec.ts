import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  CLAVE_MODERACION,
  buscarComentario,
  insertarComentario,
  insertarPost,
} from '#tests/fixtures/blog'

test.group('DELETE /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('responde 404 si el comentario no existe', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client
      .delete('/comentarios/424242')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Comentario no encontrado' })
  })

  test('el autor lo borra con su correo', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario({ estado: 'aprobado' })

    // Act
    const respuesta = await client
      .delete(`/comentarios/${id}`)
      .json({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.notProperty(respuesta.body(), 'comentario')
    assert.isNull(await buscarComentario(id))
  })

  test('compara el correo sin distinguir mayúsculas ni espacios', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario()

    // Act
    const respuesta = await client
      .delete(`/comentarios/${id}`)
      .json({ autor_email: '  Lucia.Ferrer@EJEMPLO.es  ' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isNull(await buscarComentario(id))
  })

  test('lee el correo también de la query string', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario()

    // Act
    const respuesta = await client
      .delete(`/comentarios/${id}`)
      .qs({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isNull(await buscarComentario(id))
  })

  test('el moderador lo borra con la clave y sin correo', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario({ estado: 'aprobado' })

    // Act
    const respuesta = await client
      .delete(`/comentarios/${id}`)
      .header('x-clave-moderacion', CLAVE_MODERACION)

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isNull(await buscarComentario(id))
  })

  test('responde 403 con un correo ajeno y no borra', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario()

    // Act
    const respuesta = await client
      .delete(`/comentarios/${id}`)
      .json({ autor_email: 'otra.persona@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isNotNull(await buscarComentario(id))
  })

  test('responde 403 sin correo ni clave', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario()

    // Act
    const respuesta = await client.delete(`/comentarios/${id}`)

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isNotNull(await buscarComentario(id))
  })

  test('responde 403 con una clave de moderación incorrecta', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const id = await insertarComentario()

    // Act
    const respuesta = await client
      .delete(`/comentarios/${id}`)
      .header('x-clave-moderacion', 'otra-clave')

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isNotNull(await buscarComentario(id))
  })

  test('borrar un padre deja sus respuestas apuntando a un id que ya no existe', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()
    const idPadre = await insertarComentario({ estado: 'aprobado' })
    const idRespuesta = await insertarComentario({
      estado: 'aprobado',
      autor_email: 'ruben.lima@ejemplo.es',
      padre_id: idPadre,
    })

    // Act
    const respuesta = await client
      .delete(`/comentarios/${idPadre}`)
      .json({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.isNull(await buscarComentario(idPadre))
    const huerfana = await buscarComentario(idRespuesta)
    assert.equal(huerfana.padre_id, idPadre)
  })
})
