import { GROWTH_STAGES } from '../config/constants.js';
import { AppError } from '../errors/AppError.js';
import * as cropRepository from '../repositories/cropRepository.js';

export class CropService {
  /**
   * @param {Object} deps
   * @param {import('../db/connection.js').Database} deps.db
   * @param {import('../utils/clock.js').Clock} deps.clock
   */
  constructor({ db, clock }) {
    this.db = db;
    this.clock = clock;
  }

  // Requirement: Crop.Add, BR-3, SE-5, D6
  async addCrop(currentUser, farmId, data) {
    if (currentUser.user_type === 'administrator') {
      throw AppError.forbidden('Administrators cannot add crops');
    }

    const farm = await cropRepository.findFarmOwnerByFarmId(this.db, farmId);
    if (!farm) {
      throw AppError.notFound('Farm not found');
    }

    if (farm.farmer_id !== currentUser.farmer_id) {
      throw AppError.forbidden('Forbidden: you do not own this farm');
    }

    if (data.harvest_date && data.harvest_date < data.sowing_date) {
      throw AppError.validation('Harvest date must be on or after sowing date');
    }

    const stage = data.growth_stage || 'Sowing';
    if (!GROWTH_STAGES.includes(stage)) {
      throw AppError.validation(`Invalid growth stage: ${stage}`);
    }

    const nowIso = this.clock.iso();
    const cropId = await cropRepository.insertCrop(this.db, {
      farm_id: Number(farmId),
      crop_name: data.crop_name,
      variety: data.variety || null,
      sowing_date: data.sowing_date,
      harvest_date: data.harvest_date || null,
      growth_stage: stage,
      created_at: nowIso,
      updated_at: nowIso,
    });

    const createdCrop = await cropRepository.findCropById(this.db, cropId);
    return createdCrop.toJSON();
  }

  // Requirement: Crop.View, SE-5, D6
  async getCropsByFarm(currentUser, farmId) {
    const farm = await cropRepository.findFarmOwnerByFarmId(this.db, farmId);
    if (!farm) {
      throw AppError.notFound('Farm not found');
    }

    if (currentUser.user_type === 'farmer' && farm.farmer_id !== currentUser.farmer_id) {
      throw AppError.forbidden('Forbidden: you do not own this farm');
    }

    const crops = await cropRepository.findCropsByFarmId(this.db, farmId);
    return crops.map((c) => c.toJSON());
  }

  // Requirement: Crop.View, SE-5, D6
  async getCropById(currentUser, cropId) {
    const crop = await cropRepository.findCropById(this.db, cropId);
    if (!crop) {
      throw AppError.notFound('Crop not found');
    }

    const farm = await cropRepository.findFarmOwnerByFarmId(this.db, crop.farm_id);
    if (!farm) {
      throw AppError.notFound('Associated farm not found');
    }

    if (currentUser.user_type === 'farmer' && farm.farmer_id !== currentUser.farmer_id) {
      throw AppError.forbidden('Forbidden: you do not own this crop');
    }

    return crop.toJSON();
  }

  // Requirement: Crop.Edit, BR-3, SE-5, D6
  async updateCrop(currentUser, cropId, data) {
    if (currentUser.user_type === 'administrator') {
      throw AppError.forbidden('Administrators cannot edit crops');
    }

    const crop = await cropRepository.findCropById(this.db, cropId);
    if (!crop) {
      throw AppError.notFound('Crop not found');
    }

    const farm = await cropRepository.findFarmOwnerByFarmId(this.db, crop.farm_id);
    if (!farm || farm.farmer_id !== currentUser.farmer_id) {
      throw AppError.forbidden('Forbidden: you do not own this crop');
    }

    // Verify dates relationship
    const effectiveSowing = data.sowing_date !== undefined ? data.sowing_date : crop.sowing_date;
    const effectiveHarvest = data.harvest_date !== undefined ? data.harvest_date : crop.harvest_date;
    if (effectiveHarvest && effectiveHarvest < effectiveSowing) {
      throw AppError.validation('Harvest date must be on or after sowing date');
    }

    if (data.growth_stage && !GROWTH_STAGES.includes(data.growth_stage)) {
      throw AppError.validation(`Invalid growth stage: ${data.growth_stage}`);
    }

    const nowIso = this.clock.iso();
    const updatedCrop = await cropRepository.updateCrop(this.db, cropId, {
      crop_name: data.crop_name,
      variety: data.variety,
      sowing_date: data.sowing_date,
      harvest_date: data.harvest_date !== undefined ? data.harvest_date : crop.harvest_date,
      growth_stage: data.growth_stage,
      updated_at: nowIso,
    });

    return updatedCrop.toJSON();
  }

  // Requirement: Crop.Stage.Update, D3, SE-5, D6
  async updateCropStage(currentUser, cropId, growthStage) {
    if (currentUser.user_type === 'administrator') {
      throw AppError.forbidden('Administrators cannot update crop stage');
    }

    const crop = await cropRepository.findCropById(this.db, cropId);
    if (!crop) {
      throw AppError.notFound('Crop not found');
    }

    const farm = await cropRepository.findFarmOwnerByFarmId(this.db, crop.farm_id);
    if (!farm || farm.farmer_id !== currentUser.farmer_id) {
      throw AppError.forbidden('Forbidden: you do not own this crop');
    }

    if (!GROWTH_STAGES.includes(growthStage)) {
      throw AppError.validation(`Growth stage must be one of: ${GROWTH_STAGES.join(', ')}`);
    }

    const nowIso = this.clock.iso();
    const updatedCrop = await cropRepository.updateCropStage(
      this.db,
      cropId,
      growthStage,
      nowIso
    );

    return updatedCrop.toJSON();
  }

  // Requirement: Crop.Delete, D5, SE-5, D6
  async deleteCrop(currentUser, cropId) {
    if (currentUser.user_type === 'administrator') {
      throw AppError.forbidden('Administrators cannot delete crops');
    }

    const crop = await cropRepository.findCropById(this.db, cropId);
    if (!crop) {
      throw AppError.notFound('Crop not found');
    }

    const farm = await cropRepository.findFarmOwnerByFarmId(this.db, crop.farm_id);
    if (!farm || farm.farmer_id !== currentUser.farmer_id) {
      throw AppError.forbidden('Forbidden: you do not own this crop');
    }

    await cropRepository.deleteCrop(this.db, cropId);
    return { deleted: true, id: Number(cropId) };
  }
}
