import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  CAMPOS_COMENTARIO,
  FORMATO_FECHA_SQL,
  ID_POST,
  buscarComentario,
  insertarComentario,
  insertarPost,
} from '#tests/fixtures/blog'

const RUTA = '/posts/post-de-prueba/comentarios'

const ENTRADA_VALIDA = {
  autor_nombre: 'Lucía Ferrer',
  autor_email: 'lucia.ferrer@ejemplo.es',
  cuerpo: 'Un comentario suficientemente largo.',
}

async function contarComentariosDelPost() {
  const [fila] = await db.from('comentarios').where('post_id', ID_POST).count('* as total')
  return Number(fila.total)
}

test.group('POST /posts/:slug/comentarios', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('crea un comentario pendiente y devuelve la fila completa', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client.post(RUTA).json(ENTRADA_VALIDA)

    // Assert
    respuesta.assertStatus(201)
    const cuerpo = respuesta.body()
    assert.sameMembers(Object.keys(cuerpo), ['comentario'])
    assert.notProperty(cuerpo, 'ok')

    const comentario = cuerpo.comentario
    assert.sameMembers(Object.keys(comentario), CAMPOS_COMENTARIO)
    assert.isNumber(comentario.id)
    assert.isString(comentario.estado)
    assert.match(comentario.creado_en, FORMATO_FECHA_SQL)
    assert.deepEqual(comentario, {
      id: comentario.id,
      post_id: ID_POST,
      autor_nombre: 'Lucía Ferrer',
      // Caracteriza el comportamiento de hoy: la respuesta devuelve el correo de quien comenta.
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Un comentario suficientemente largo.',
      estado: 'pendiente',
      creado_en: comentario.creado_en,
      padre_id: null,
    })
    assert.notProperty(comentario, 'post')
    assert.notProperty(comentario, 'created_at')
    assert.notProperty(comentario, 'updated_at')
  })

  test('guarda la fila como pendiente con la fecha en UTC y en formato SQL', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client.post(RUTA).json(ENTRADA_VALIDA)

    // Assert
    respuesta.assertStatus(201)
    const fila = await buscarComentario(respuesta.body().comentario.id)
    assert.equal(fila.estado, 'pendiente')
    assert.equal(fila.post_id, ID_POST)
    assert.match(fila.creado_en, FORMATO_FECHA_SQL)
    assert.equal(fila.creado_en, respuesta.body().comentario.creado_en)
    const desfase = DateTime.utc().diff(DateTime.fromSQL(fila.creado_en, { zone: 'utc' }), 'seconds')
    assert.isBelow(Math.abs(desfase.seconds), 60)
  })

  test('guarda el padre_id que llega aunque ese comentario no exista', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client.post(RUTA).json({ ...ENTRADA_VALIDA, padre_id: 424242 })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.padre_id, 424242)
    const fila = await buscarComentario(respuesta.body().comentario.id)
    assert.equal(fila.padre_id, 424242)
  })

  test('guarda el padre_id de un comentario existente', async ({ client, assert }) => {
    // Arrange
    await insertarPost()
    const idPadre = await insertarComentario({ estado: 'aprobado' })

    // Act
    const respuesta = await client.post(RUTA).json({ ...ENTRADA_VALIDA, padre_id: idPadre })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.padre_id, idPadre)
  })

  test('acepta un cuerpo de exactamente cinco caracteres', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client.post(RUTA).json({ ...ENTRADA_VALIDA, cuerpo: 'Hola!' })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.cuerpo, 'Hola!')
  })

  test('recorta los espacios del cuerpo antes de medirlo y lo guarda recortado', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()

    // Act
    const corto = await client.post(RUTA).json({ ...ENTRADA_VALIDA, cuerpo: '   Hola   ' })
    const justo = await client.post(RUTA).json({ ...ENTRADA_VALIDA, cuerpo: '   Hola!   ' })

    // Assert
    corto.assertStatus(200)
    assert.deepEqual(corto.body(), { ok: false, motivo: 'comentario demasiado corto' })
    justo.assertStatus(201)
    assert.equal(justo.body().comentario.cuerpo, 'Hola!')
  })

  test('un cuerpo de solo espacios cuenta como ausente: 200 {ok:false}', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client.post(RUTA).json({ ...ENTRADA_VALIDA, cuerpo: '     ' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { ok: false, motivo: 'comentario demasiado corto' })
    assert.equal(await contarComentariosDelPost(), 0)
  })

  test('responde 404 si el post no existe y no guarda nada', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json(ENTRADA_VALIDA)

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
    assert.equal(await contarComentariosDelPost(), 0)
  })

  test('responde 404 si el post es un borrador', async ({ client, assert }) => {
    // Arrange
    await insertarPost({ estado: 'borrador', publicado_en: null })

    // Act
    const respuesta = await client.post(RUTA).json(ENTRADA_VALIDA)

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
    assert.equal(await contarComentariosDelPost(), 0)
  })

  test('comprueba el post antes que la entrada: 404 aunque el cuerpo esté vacío', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json({})

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
  })

  test('responde 400 con {error} si falta el nombre', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client.post(RUTA).json({ ...ENTRADA_VALIDA, autor_nombre: '' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'El nombre es obligatorio' })
    assert.equal(await contarComentariosDelPost(), 0)
  })

  test('responde 422 con {message} si falta el correo', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client
      .post(RUTA)
      .json({ autor_nombre: 'Lucía Ferrer', cuerpo: 'Un comentario suficientemente largo.' })

    // Assert
    respuesta.assertStatus(422)
    assert.deepEqual(respuesta.body(), { message: 'Falta el email' })
    assert.equal(await contarComentariosDelPost(), 0)
  })

  test('responde 400 con {errores} si el correo no tiene arroba', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client
      .post(RUTA)
      .json({ ...ENTRADA_VALIDA, autor_email: 'lucia.ferrer.ejemplo.es' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { errores: ['email no válido'] })
    assert.equal(await contarComentariosDelPost(), 0)
  })

  test('responde 200 {ok:false} si el cuerpo tiene cuatro caracteres, y no guarda nada', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client.post(RUTA).json({ ...ENTRADA_VALIDA, cuerpo: 'Hola' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { ok: false, motivo: 'comentario demasiado corto' })
    assert.notProperty(respuesta.body(), 'comentario')
    assert.equal(await contarComentariosDelPost(), 0)
  })

  test('responde 200 {ok:false} si falta el cuerpo', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client
      .post(RUTA)
      .json({ autor_nombre: 'Lucía Ferrer', autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { ok: false, motivo: 'comentario demasiado corto' })
  })

  test('con todo vacío gana el error del nombre', async ({ client, assert }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client.post(RUTA).json({})

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'El nombre es obligatorio' })
  })

  test('sin correo y con el cuerpo corto gana el error del correo', async ({
    client,
    assert,
  }) => {
    // Arrange
    await insertarPost()

    // Act
    const respuesta = await client.post(RUTA).json({ autor_nombre: 'Lucía Ferrer', cuerpo: 'Hola' })

    // Assert
    respuesta.assertStatus(422)
    assert.deepEqual(respuesta.body(), { message: 'Falta el email' })
  })
})
