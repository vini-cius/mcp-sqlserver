import { sanitizeParameters } from '../../src/utils/sanitize-parameters'

describe('sanitizeParameters', () => {
  describe('success cases', () => {
    it('should return valid parameters unchanged', () => {
      const parameters = {
        name: 'John',
        age: 25,
        isActive: true,
        score: 95.5,
        data: null,
        items: ['item1', 'item2'],
      }

      const result = sanitizeParameters(parameters)

      expect(result).toEqual(parameters)
    })

    it('should accept parameter names with underscores', () => {
      const parameters = {
        first_name: 'Maria',
        last_name: 'Silva',
        _private: 'value',
        user_id: 123,
      }

      const result = sanitizeParameters(parameters)

      expect(result).toEqual(parameters)
    })

    it('should accept parameter names with numbers', () => {
      const parameters = {
        param1: 'value1',
        param2: 'value2',
        test123: 'test',
      }

      const result = sanitizeParameters(parameters)

      expect(result).toEqual(parameters)
    })

    it('should accept strings with exactly 8000 characters', () => {
      const longString = 'a'.repeat(8000)
      const parameters = {
        longParam: longString,
      }

      const result = sanitizeParameters(parameters)

      expect(result).toEqual(parameters)
    })

    it('should accept empty object', () => {
      const parameters = {}

      const result = sanitizeParameters(parameters)

      expect(result).toEqual({})
    })

    it('should accept non-string values of any size', () => {
      const largeArray = new Array(10000).fill('item')
      const parameters = {
        largeArray,
        largeNumber: 999999999999999,
        complexObject: { nested: { deep: { value: 'test' } } },
      }

      const result = sanitizeParameters(parameters)

      expect(result).toEqual(parameters)
    })
  })

  describe('error cases - invalid parameter names', () => {
    it('should reject names starting with numbers', () => {
      const parameters = {
        '1invalid': 'value',
      }

      expect(() => sanitizeParameters(parameters)).toThrow(
        'Nome de parâmetro inválido: 1invalid'
      )
    })

    it('should reject names with special characters', () => {
      const parameters = {
        'param-name': 'value',
      }

      expect(() => sanitizeParameters(parameters)).toThrow(
        'Nome de parâmetro inválido: param-name'
      )
    })

    it('should reject names with spaces', () => {
      const parameters = {
        'param name': 'value',
      }

      expect(() => sanitizeParameters(parameters)).toThrow(
        'Nome de parâmetro inválido: param name'
      )
    })

    it('should reject names with dots', () => {
      const parameters = {
        'param.name': 'value',
      }

      expect(() => sanitizeParameters(parameters)).toThrow(
        'Nome de parâmetro inválido: param.name'
      )
    })

    it('should reject empty names', () => {
      const parameters = {
        '': 'value',
      }

      expect(() => sanitizeParameters(parameters)).toThrow(
        'Nome de parâmetro inválido: '
      )
    })

    it('should reject names with special symbols', () => {
      const invalidNames = ['@param', '#param', '$param', '%param', '&param']

      invalidNames.forEach((name) => {
        const parameters = {
          [name]: 'value',
        }

        expect(() => sanitizeParameters(parameters)).toThrow(
          `Nome de parâmetro inválido: ${name}`
        )
      })
    })
  })

  describe('error cases - values too long', () => {
    it('should reject strings with more than 8000 characters', () => {
      const longString = 'a'.repeat(8001)
      const parameters = {
        longParam: longString,
      }

      expect(() => sanitizeParameters(parameters)).toThrow(
        'Valor muito longo para parâmetro: longParam'
      )
    })

    it('should reject very long strings', () => {
      const veryLongString = 'x'.repeat(10000)
      const parameters = {
        testParam: veryLongString,
      }

      expect(() => sanitizeParameters(parameters)).toThrow(
        'Valor muito longo para parâmetro: testParam'
      )
    })

    it('should handle multiple parameters with one being too long', () => {
      const longString = 'a'.repeat(8001)
      const parameters = {
        validParam: 'valid',
        invalidParam: longString,
        anotherValid: 123,
      }

      expect(() => sanitizeParameters(parameters)).toThrow(
        'Valor muito longo para parâmetro: invalidParam'
      )
    })
  })

  describe('edge cases', () => {
    it('should handle parameter names at regex boundaries', () => {
      const parameters = {
        a: 'single char',
        _: 'underscore only',
        a1: 'letter then number',
        _a1: 'underscore, letter, number',
      }

      const result = sanitizeParameters(parameters)

      expect(result).toEqual(parameters)
    })

    it('should handle string length at exact boundary', () => {
      const exactString = 'b'.repeat(8000)
      const parameters = {
        exactParam: exactString,
      }

      const result = sanitizeParameters(parameters)

      expect(result).toEqual(parameters)
    })

    it('should handle mixed valid and invalid scenarios', () => {
      const parameters = {
        validParam: 'valid',
        'invalid-param': 'invalid name',
      }

      expect(() => sanitizeParameters(parameters)).toThrow(
        'Nome de parâmetro inválido: invalid-param'
      )
    })

    it('should handle special JavaScript values', () => {
      const parameters = {
        undefinedValue: undefined,
        nullValue: null,
        zeroValue: 0,
        falseValue: false,
        emptyString: '',
        emptyArray: [],
        emptyObject: {},
      }

      const result = sanitizeParameters(parameters)

      expect(result).toEqual(parameters)
    })
  })
})
