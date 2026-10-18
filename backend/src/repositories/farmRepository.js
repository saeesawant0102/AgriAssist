import { Farm } from '../models/Farm.js';

// Requirement: Farm.Add, BR-1, BR-2
export async function insertFarm(
  exec,
  {
    farmer_id,
    farm_name,
    location,
    area,
    latitude,
    longitude,
    created_at,
    updated_at,
  }
) {
  const result = await exec.run(
    `INSERT INTO farms (farmer_id, farm_name, location, area, latitude, longitude, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      farmer_id,
      farm_name,
      location,
      area,
      latitude,
      longitude,
      created_at,
      updated_at,
    ]
  );
  return result.lastID;
}

// Requirement: Farm.View
export async function findFarmById(exec, farm_id) {
  const row = await exec.get(`SELECT * FROM farms WHERE farm_id = ?`, [farm_id]);
  return Farm.fromRow(row);
}

// Requirement: Farm.View (Farmer)
export async function findFarmsByFarmerId(exec, farmer_id) {
  const rows = await exec.all(
    `SELECT * FROM farms WHERE farmer_id = ? ORDER BY farm_id ASC`,
    [farmer_id]
  );
  return rows.map((r) => Farm.fromRow(r));
}

// Requirement: Farm.View (Admin: all farms, optional filter)
export async function findAllFarms(exec, filterFarmerId = null) {
  if (filterFarmerId) {
    const rows = await exec.all(
      `SELECT * FROM farms WHERE farmer_id = ? ORDER BY farm_id ASC`,
      [filterFarmerId]
    );
    return rows.map((r) => Farm.fromRow(r));
  }
  const rows = await exec.all(`SELECT * FROM farms ORDER BY farm_id ASC`);
  return rows.map((r) => Farm.fromRow(r));
}

// Requirement: Farm.Edit
export async function updateFarm(
  exec,
  farm_id,
  { farm_name, location, area, latitude, longitude, updated_at }
) {
  await exec.run(
    `UPDATE farms
     SET farm_name = COALESCE(?, farm_name),
         location = COALESCE(?, location),
         area = COALESCE(?, area),
         latitude = COALESCE(?, latitude),
         longitude = COALESCE(?, longitude),
         updated_at = ?
     WHERE farm_id = ?`,
    [farm_name, location, area, latitude, longitude, updated_at, farm_id]
  );
  return findFarmById(exec, farm_id);
}

// Requirement: Farm.Delete
export async function deleteFarm(exec, farm_id) {
  const result = await exec.run(`DELETE FROM farms WHERE farm_id = ?`, [farm_id]);
  return result.changes > 0;
}

// Requirement: Admin add on behalf of farmer validation
export async function findFarmerByFarmerId(exec, farmer_id) {
  return exec.get(`SELECT * FROM farmers WHERE farmer_id = ?`, [farmer_id]);
}

// Requirement: D8, Administrator.manage_system
export async function countFarms(exec) {
  const row = await exec.get(`SELECT COUNT(*) as count FROM farms`);
  return row ? Number(row.count) : 0;
}

// Requirement: D10, Farmer.view_dashboard
export async function countFarmsByFarmerId(exec, farmer_id) {
  const row = await exec.get(`SELECT COUNT(*) as count FROM farms WHERE farmer_id = ?`, [farmer_id]);
  return row ? Number(row.count) : 0;
}
