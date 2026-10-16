import { describe, expect, it } from 'vitest';
import { registerSchema, updateProfileSchema } from '../../src/validators/authValidators.js';

describe('Auth Validators (authValidators.js)', () => {
  it('Auth.Validate.Register: accepts valid farmer registration payload', () => {
    const valid = {
      name: 'Ramesh Kumar',
      email: 'Ramesh@Example.com',
      password: 'StrongPassword123',
      phone: '+919876543210',
      address: 'Plot 4, Green Valley',
    };

    const parsed = registerSchema.parse(valid);
    expect(parsed.email).toBe('ramesh@example.com');
    expect(parsed.name).toBe('Ramesh Kumar');
  });

  it('Auth.Validate.Register: rejects password shorter than 8 characters', () => {
    const invalid = {
      name: 'Ramesh',
      email: 'ramesh@example.com',
      password: 'short',
    };

    expect(() => registerSchema.parse(invalid)).toThrow();
  });

  it('Auth.Validate.Register: rejects invalid email and malformed phone', () => {
    expect(() =>
      registerSchema.parse({
        name: 'Ramesh',
        email: 'not-an-email',
        password: 'Password123',
      })
    ).toThrow();

    expect(() =>
      registerSchema.parse({
        name: 'Ramesh',
        email: 'ramesh@example.com',
        password: 'Password123',
        phone: '123', // too short
      })
    ).toThrow();
  });

  it('Auth.Validate.UpdateProfile: accepts partial updates and rejects extra fields', () => {
    const validUpdate = {
      name: 'Updated Name',
      phone: '9876543210',
    };

    const parsed = updateProfileSchema.parse(validUpdate);
    expect(parsed.name).toBe('Updated Name');
    expect(parsed.phone).toBe('9876543210');
  });
});
