import { AppError } from '../errors/AppError.js';
import { Administrator } from '../models/Administrator.js';
import { Farmer } from '../models/Farmer.js';

/**
 * Maps a raw joined row from users + farmers/administrators to domain instance
 * @param {Object} row
 * @returns {Farmer | Administrator | null}
 */
function mapUserRow(row) {
  if (!row) return null;
  if (row.user_type === 'farmer') {
    return Farmer.fromRow(row);
  }
  if (row.user_type === 'administrator') {
    return Administrator.fromRow(row);
  }
  return null;
}

// Requirement: Auth.Register
export async function createUser(
  exec,
  {
    firebase_uid,
    user_type,
    name,
    email,
    phone = null,
    address = null,
    status = 'active',
    created_at,
    updated_at,
  }
) {
  try {
    const result = await exec.run(
      `INSERT INTO users (firebase_uid, user_type, name, email, phone, address, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firebase_uid,
        user_type,
        name,
        email.toLowerCase(),
        phone,
        address,
        status,
        created_at,
        updated_at,
      ]
    );
    return result.lastID;
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed: users.email')) {
      throw AppError.emailAlreadyExists();
    }
    throw err;
  }
}

// Requirement: Auth.Register
export async function createFarmer(exec, { user_id, farm_count = 0 }) {
  const result = await exec.run(
    `INSERT INTO farmers (user_id, farm_count) VALUES (?, ?)`,
    [user_id, farm_count]
  );
  return result.lastID;
}

// Requirement: scripts/seedAdmin.js
export async function createAdministrator(exec, { user_id, role }) {
  const result = await exec.run(
    `INSERT INTO administrators (user_id, role) VALUES (?, ?)`,
    [user_id, role]
  );
  return result.lastID;
}

// Requirement: Auth.Login, SE-1
export async function findUserByFirebaseUid(exec, firebase_uid) {
  const row = await exec.get(
    `SELECT u.*, f.farmer_id, f.farm_count, a.admin_id, a.role
     FROM users u
     LEFT JOIN farmers f ON u.user_id = f.user_id
     LEFT JOIN administrators a ON u.user_id = a.user_id
     WHERE u.firebase_uid = ?`,
    [firebase_uid]
  );
  return mapUserRow(row);
}

// Requirement: Auth.Profile.View
export async function findUserById(exec, user_id) {
  const row = await exec.get(
    `SELECT u.*, f.farmer_id, f.farm_count, a.admin_id, a.role
     FROM users u
     LEFT JOIN farmers f ON u.user_id = f.user_id
     LEFT JOIN administrators a ON u.user_id = a.user_id
     WHERE u.user_id = ?`,
    [user_id]
  );
  return mapUserRow(row);
}

// Requirement: Auth.Register duplicate check
export async function findUserByEmail(exec, email) {
  const row = await exec.get(
    `SELECT u.*, f.farmer_id, f.farm_count, a.admin_id, a.role
     FROM users u
     LEFT JOIN farmers f ON u.user_id = f.user_id
     LEFT JOIN administrators a ON u.user_id = a.user_id
     WHERE u.email = ? COLLATE NOCASE`,
    [email.toLowerCase()]
  );
  return mapUserRow(row);
}

// Requirement: Auth.Profile.Update
export async function updateUserProfile(exec, user_id, { name, phone, address, updated_at }) {
  await exec.run(
    `UPDATE users
     SET name = COALESCE(?, name),
         phone = COALESCE(?, phone),
         address = COALESCE(?, address),
         updated_at = ?
     WHERE user_id = ?`,
    [name, phone, address, updated_at, user_id]
  );
  return findUserById(exec, user_id);
}

// Requirement: D7, Manage Farmer Accounts
export async function updateUserStatus(exec, user_id, status, updated_at) {
  await exec.run(
    `UPDATE users
     SET status = ?, updated_at = ?
     WHERE user_id = ?`,
    [status, updated_at, user_id]
  );
}

// Requirement: D5, D7, Manage Farmer Accounts delete
export async function deleteUserById(exec, user_id) {
  const result = await exec.run(`DELETE FROM users WHERE user_id = ?`, [user_id]);
  return result.changes > 0;
}
