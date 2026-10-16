import { describe, expect, it } from 'vitest';
import { Administrator } from '../../src/models/Administrator.js';
import { Farmer } from '../../src/models/Farmer.js';
import { User } from '../../src/models/User.js';

describe('Domain Models (User, Farmer, Administrator)', () => {
  it('User.Abstract: throws an error when trying to instantiate User directly', () => {
    expect(() => {
      new User({ name: 'Direct User', email: 'test@example.com', firebase_uid: 'uid123' });
    }).toThrow('Cannot instantiate abstract class User directly');
  });

  it('Farmer.Serialization: toJSON never exposes password or firebase_uid', () => {
    const farmer = new Farmer({
      user_id: 1,
      firebase_uid: 'secret-firebase-uid-999',
      name: 'Ramesh Patel',
      email: 'Ramesh@Example.com',
      phone: '+919876543210',
      address: 'Village Green, Farm 12',
      status: 'active',
      farmer_id: 42,
      farm_count: 3,
      created_at: '2026-04-15T10:00:00.000Z',
      updated_at: '2026-04-15T10:00:00.000Z',
    });

    const json = farmer.toJSON();

    expect(json.user_id).toBe(1);
    expect(json.farmer_id).toBe(42);
    expect(json.farm_count).toBe(3);
    expect(json.email).toBe('ramesh@example.com');
    expect(json.user_type).toBe('farmer');

    // Security check: Never expose credentials or provider IDs in JSON
    expect(json.firebase_uid).toBeUndefined();
    expect(json.password).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain('secret-firebase-uid-999');
  });

  it('Administrator.Serialization: toJSON never exposes password or firebase_uid', () => {
    const admin = new Administrator({
      user_id: 2,
      firebase_uid: 'secret-admin-uid-111',
      name: 'System Admin',
      email: 'admin@agriassist.local',
      role: 'super_admin',
      status: 'active',
      admin_id: 5,
      created_at: '2026-04-15T10:00:00.000Z',
      updated_at: '2026-04-15T10:00:00.000Z',
    });

    const json = admin.toJSON();

    expect(json.user_id).toBe(2);
    expect(json.admin_id).toBe(5);
    expect(json.role).toBe('super_admin');
    expect(json.user_type).toBe('administrator');

    expect(json.firebase_uid).toBeUndefined();
    expect(json.password).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain('secret-admin-uid-111');
  });

  it('Farmer.fromRow: maps database rows to Farmer instance accurately', () => {
    const row = {
      user_id: 10,
      firebase_uid: 'uid-abc',
      user_type: 'farmer',
      name: 'Suresh',
      email: 'suresh@farm.in',
      phone: '9876543210',
      address: null,
      status: 'active',
      farmer_id: 101,
      farm_count: 2,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    };

    const farmer = Farmer.fromRow(row);
    expect(farmer).toBeInstanceOf(Farmer);
    expect(farmer.farmer_id).toBe(101);
    expect(farmer.farm_count).toBe(2);
    expect(farmer.email).toBe('suresh@farm.in');
  });
});
