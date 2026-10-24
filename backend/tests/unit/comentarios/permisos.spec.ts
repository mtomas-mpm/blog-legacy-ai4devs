import { test } from '@japa/runner'
import { puedeBorrar, puedeEditar } from '#services/comentario_service'

const DE_LUCIA = { autorEmail: 'lucia.ferrer@ejemplo.es', estado: 'pendiente' }

test.group('puedeBorrar', () => {
  test('deja borrar a quien trae el mismo correo', ({ assert }) => {
    // Arrange
    const credenciales = { autorEmail: 'lucia.ferrer@ejemplo.es' }

    // Act
    const permitido = puedeBorrar(DE_LUCIA, credenciales)

    // Assert
    assert.isTrue(permitido)
  })

  test('compara el correo sin distinguir mayúsculas ni espacios', ({ assert }) => {
    // Arrange
    const credenciales = { autorEmail: '  Lucia.Ferrer@EJEMPLO.es ' }

    // Act
    const permitido = puedeBorrar(DE_LUCIA, credenciales)

    // Assert
    assert.isTrue(permitido)
  })

  test('deja borrar a quien trae la clave de moderación, sin correo', ({ assert }) => {
    // Arrange
    const credenciales = { claveModeracion: 'dev-secret-cambiar' }

    // Act
    const permitido = puedeBorrar(DE_LUCIA, credenciales)

    // Assert
    assert.isTrue(permitido)
  })

  test('no deja borrar con un correo ajeno', ({ assert }) => {
    // Arrange
    const credenciales = { autorEmail: 'otra.persona@ejemplo.es' }

    // Act
    const permitido = puedeBorrar(DE_LUCIA, credenciales)

    // Assert
    assert.isFalse(permitido)
  })

  test('no deja borrar sin credenciales ni con una clave incorrecta', ({ assert }) => {
    // Arrange
    const sinNada = {}
    const claveMala = { claveModeracion: 'otra-clave' }

    // Act
    const permitidoSinNada = puedeBorrar(DE_LUCIA, sinNada)
    const permitidoConClaveMala = puedeBorrar(DE_LUCIA, claveMala)

    // Assert
    assert.isFalse(permitidoSinNada)
    assert.isFalse(permitidoConClaveMala)
  })
})

test.group('puedeEditar', () => {
  test('deja editar al autor exacto si el comentario sigue pendiente', ({ assert }) => {
    // Arrange
    const credenciales = { autorEmail: 'lucia.ferrer@ejemplo.es' }

    // Act
    const permitido = puedeEditar(DE_LUCIA, credenciales)

    // Assert
    assert.isTrue(permitido)
  })

  test('compara el correo tal cual: otra capitalización no vale', ({ assert }) => {
    // Arrange
    const credenciales = { autorEmail: 'Lucia.Ferrer@ejemplo.es' }

    // Act
    const permitido = puedeEditar(DE_LUCIA, credenciales)

    // Assert
    assert.isFalse(permitido)
  })

  test('no deja editar un comentario que ya no está pendiente', ({ assert }) => {
    // Arrange
    const aprobado = { ...DE_LUCIA, estado: 'aprobado' }
    const credenciales = { autorEmail: 'lucia.ferrer@ejemplo.es' }

    // Act
    const permitido = puedeEditar(aprobado, credenciales)

    // Assert
    assert.isFalse(permitido)
  })

  test('la clave de moderación no sirve para editar', ({ assert }) => {
    // Arrange
    const credenciales = { claveModeracion: 'dev-secret-cambiar' }

    // Act
    const permitido = puedeEditar(DE_LUCIA, credenciales)

    // Assert
    assert.isFalse(permitido)
  })
})
