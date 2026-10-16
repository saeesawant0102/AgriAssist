import { GROWTH_STAGES } from '../config/constants.js';

/**
 * Crop domain model mapped from Class Diagram and Section 8.
 * Requirement: R2, Crop.Add, Crop.View, Crop.Edit, Crop.Delete, Crop.Stage.Update
 */
export class Crop {
  constructor({
    crop_id = null,
    farm_id,
    crop_name,
    variety = null,
    sowing_date,
    harvest_date = null,
    growth_stage = 'Sowing',
    created_at = null,
    updated_at = null,
  }) {
    this.crop_id = crop_id ? Number(crop_id) : null;
    this.farm_id = Number(farm_id);
    this.crop_name = crop_name;
    this.variety = variety || null;
    this.sowing_date = sowing_date;
    this.harvest_date = harvest_date || null;
    this.growth_stage = growth_stage;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  // Operations defined in Class Diagram
  async addCrop() {
    return true;
  }

  async updateCrop(data) {
    if (data.crop_name !== undefined) this.crop_name = data.crop_name;
    if (data.variety !== undefined) this.variety = data.variety || null;
    if (data.sowing_date !== undefined) this.sowing_date = data.sowing_date;
    if (data.harvest_date !== undefined) this.harvest_date = data.harvest_date || null;
    if (data.growth_stage !== undefined && GROWTH_STAGES.includes(data.growth_stage)) {
      this.growth_stage = data.growth_stage;
    }
    this.updated_at = new Date().toISOString();
  }

  async updateStage(newStage) {
    if (!GROWTH_STAGES.includes(newStage)) {
      throw new Error(`Invalid growth stage: ${newStage}`);
    }
    this.growth_stage = newStage;
    this.updated_at = new Date().toISOString();
  }

  async deleteCrop() {
    return true;
  }

  async viewCrop() {
    return this.toJSON();
  }

  toJSON() {
    return {
      crop_id: this.crop_id,
      farm_id: this.farm_id,
      crop_name: this.crop_name,
      variety: this.variety,
      sowing_date: this.sowing_date,
      harvest_date: this.harvest_date,
      growth_stage: this.growth_stage,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  static fromRow(row) {
    if (!row) return null;
    return new Crop({
      crop_id: row.crop_id,
      farm_id: row.farm_id,
      crop_name: row.crop_name,
      variety: row.variety,
      sowing_date: row.sowing_date,
      harvest_date: row.harvest_date,
      growth_stage: row.growth_stage,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
}
