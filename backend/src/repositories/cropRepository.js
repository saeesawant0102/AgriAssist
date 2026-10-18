import { Crop } from '../models/Crop.js';

// Requirement: Crop.Add, BR-3
export async function insertCrop(
  exec,
  {
    farm_id,
    crop_name,
    variety,
    sowing_date,
    harvest_date,
    growth_stage = 'Sowing',
    created_at,
    updated_at,
  }
) {
  const result = await exec.run(
    `INSERT INTO crops (farm_id, crop_name, variety, sowing_date, harvest_date, growth_stage, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      farm_id,
      crop_name,
      variety || null,
      sowing_date,
      harvest_date || null,
      growth_stage,
      created_at,
      updated_at,
    ]
  );
  return result.lastID;
}

// Requirement: Crop.View
export async function findCropById(exec, crop_id) {
  const row = await exec.get(`SELECT * FROM crops WHERE crop_id = ?`, [crop_id]);
  return Crop.fromRow(row);
}

// Requirement: Crop.View
export async function findCropsByFarmId(exec, farm_id) {
  const rows = await exec.all(
    `SELECT * FROM crops WHERE farm_id = ? ORDER BY sowing_date DESC, crop_id DESC`,
    [farm_id]
  );
  return rows.map((r) => Crop.fromRow(r));
}

// Requirement: Crop.Edit, BR-3 (farm_id immutable, never updated)
export async function updateCrop(
  exec,
  crop_id,
  { crop_name, variety, sowing_date, harvest_date, growth_stage, updated_at }
) {
  await exec.run(
    `UPDATE crops
     SET crop_name = COALESCE(?, crop_name),
         variety = COALESCE(?, variety),
         sowing_date = COALESCE(?, sowing_date),
         harvest_date = ?,
         growth_stage = COALESCE(?, growth_stage),
         updated_at = ?
     WHERE crop_id = ?`,
    [crop_name, variety, sowing_date, harvest_date, growth_stage, updated_at, crop_id]
  );
  return findCropById(exec, crop_id);
}

// Requirement: Crop.Stage.Update
export async function updateCropStage(exec, crop_id, growth_stage, updated_at) {
  await exec.run(
    `UPDATE crops
     SET growth_stage = ?,
         updated_at = ?
     WHERE crop_id = ?`,
    [growth_stage, updated_at, crop_id]
  );
  return findCropById(exec, crop_id);
}

// Requirement: Crop.Delete, D5
export async function deleteCrop(exec, crop_id) {
  const result = await exec.run(`DELETE FROM crops WHERE crop_id = ?`, [crop_id]);
  return result.changes > 0;
}

// Requirement: Ownership verification helper
export async function findFarmOwnerByFarmId(exec, farm_id) {
  return exec.get(
    `SELECT farm_id, farmer_id, farm_name FROM farms WHERE farm_id = ?`,
    [farm_id]
  );
}

// Requirement: D8, Administrator.manage_system
export async function countCrops(exec) {
  const row = await exec.get(`SELECT COUNT(*) as count FROM crops`);
  return row ? Number(row.count) : 0;
}

// Requirement: D10, Farmer.view_dashboard
export async function countCropsByFarmerId(exec, farmer_id) {
  const row = await exec.get(
    `SELECT COUNT(c.crop_id) as count
     FROM crops c
     INNER JOIN farms f ON c.farm_id = f.farm_id
     WHERE f.farmer_id = ?`,
    [farmer_id]
  );
  return row ? Number(row.count) : 0;
}
