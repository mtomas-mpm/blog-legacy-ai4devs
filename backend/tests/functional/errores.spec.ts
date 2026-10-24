import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Manejador de errores', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('un error de validación ajeno a comentarios conserva la forma por defecto', async ({
    client,
    assert,
  }) => {
    // Arrange
    const entradaVacia = {}

    // Act
    const respuesta = await client.post('/api/v1/auth/signup').json(entradaVacia)

    // Assert
    respuesta.assertStatus(422)
    const cuerpo = respuesta.body()
    assert.sameMembers(Object.keys(cuerpo), ['errors'])
    assert.isArray(cuerpo.errors)
    assert.isNotEmpty(cuerpo.errors)
    assert.containsSubset(cuerpo.errors, [{ field: 'email', rule: 'required' }])
    assert.notProperty(cuerpo, 'error')
    assert.notProperty(cuerpo, 'ok')
  })
})
