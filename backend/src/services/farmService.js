import { AppError } from '../errors/AppError.js';
import * as farmRepository from '../repositories/farmRepository.js';
import { geocodeLocation } from '../weather/geocoding.js';

export class FarmService {
  /**
   * @param {Object} deps
   * @param {import('../db/connection.js').Database} deps.db
   * @param {import('../utils/clock.js').Clock} deps.clock
   * @param {Function} [deps.geocoder]
   */
  constructor({ db, clock, geocoder = geocodeLocation }) {
    this.db = db;
    this.clock = clock;
    this.geocoder = geocoder;
  }

  // Requirement: Farm.Add, Farm.Validate, BR-1, BR-2, D6
  async addFarm(currentUser, data) {
    let targetFarmerId;

    if (currentUser.user_type === 'farmer') {
      targetFarmerId = currentUser.farmer_id;
    } else if (currentUser.user_type === 'administrator') {
      if (!data.farmer_id) {
        throw AppError.badRequest('farmer_id is required when adding a farm as administrator');
      }
      targetFarmerId = Number(data.farmer_id);
      const farmerRecord = await farmRepository.findFarmerByFarmerId(this.db, targetFarmerId);
      if (!farmerRecord) {
        throw AppError.notFound('Target farmer account not found');
      }
    } else {
      throw AppError.forbidden();
    }

    // Determine coordinates (R1)
    let latitude;
    let longitude;

    if (
      data.latitude !== undefined &&
      data.latitude !== null &&
      data.longitude !== undefined &&
      data.longitude !== null
    ) {
      latitude = Number(data.latitude);
      longitude = Number(data.longitude);
    } else {
      // Geocode location
      const geoResult = await this.geocoder(data.location);
      latitude = geoResult.latitude;
      longitude = geoResult.longitude;
    }

    const nowIso = this.clock.iso();
    const farmId = await farmRepository.insertFarm(this.db, {
      farmer_id: targetFarmerId,
      farm_name: data.farm_name,
      location: data.location,
      area: Number(data.area),
      latitude,
      longitude,
      created_at: nowIso,
      updated_at: nowIso,
    });

    const createdFarm = await farmRepository.findFarmById(this.db, farmId);
    return createdFarm.toJSON();
  }

  // Requirement: Farm.View, D6
  async getFarms(currentUser, filterFarmerId = null) {
    if (currentUser.user_type === 'farmer') {
      const farms = await farmRepository.findFarmsByFarmerId(this.db, currentUser.farmer_id);
      return farms.map((f) => f.toJSON());
    }

    if (currentUser.user_type === 'administrator') {
      const parsedFilter = filterFarmerId ? Number(filterFarmerId) : null;
      const farms = await farmRepository.findAllFarms(this.db, parsedFilter);
      return farms.map((f) => f.toJSON());
    }

    throw AppError.forbidden();
  }

  // Requirement: Farm.View, SE-5
  async getFarmById(currentUser, farmId) {
    const farm = await farmRepository.findFarmById(this.db, farmId);
    if (!farm) {
      throw AppError.notFound('Farm not found');
    }

    if (currentUser.user_type === 'farmer' && farm.farmer_id !== currentUser.farmer_id) {
      throw AppError.forbidden('Forbidden: you do not own this farm');
    }

    return farm.toJSON();
  }

  // Requirement: Farm.Edit, Farm.Validate, D6, SE-5
  async updateFarm(currentUser, farmId, data) {
    if (currentUser.user_type === 'administrator') {
      throw AppError.forbidden('Administrators cannot edit farms');
    }

    const farm = await farmRepository.findFarmById(this.db, farmId);
    if (!farm) {
      throw AppError.notFound('Farm not found');
    }

    if (farm.farmer_id !== currentUser.farmer_id) {
      throw AppError.forbidden('Forbidden: you do not own this farm');
    }

    let latitude = data.latitude !== undefined && data.latitude !== null ? Number(data.latitude) : undefined;
    let longitude = data.longitude !== undefined && data.longitude !== null ? Number(data.longitude) : undefined;

    // If location changed and explicit coordinates were not provided, re-geocode
    if (data.location && data.location !== farm.location && (latitude === undefined || longitude === undefined)) {
      const geoResult = await this.geocoder(data.location);
      latitude = geoResult.latitude;
      longitude = geoResult.longitude;
    }

    const nowIso = this.clock.iso();
    const updatedFarm = await farmRepository.updateFarm(this.db, farmId, {
      farm_name: data.farm_name,
      location: data.location,
      area: data.area !== undefined ? Number(data.area) : undefined,
      latitude,
      longitude,
      updated_at: nowIso,
    });

    return updatedFarm.toJSON();
  }

  // Requirement: Farm.Delete, D5, D6, SE-5
  async deleteFarm(currentUser, farmId) {
    const farm = await farmRepository.findFarmById(this.db, farmId);
    if (!farm) {
      throw AppError.notFound('Farm not found');
    }

    if (currentUser.user_type === 'farmer' && farm.farmer_id !== currentUser.farmer_id) {
      throw AppError.forbidden('Forbidden: you do not own this farm');
    }

    await farmRepository.deleteFarm(this.db, farmId);
    return { deleted: true, id: Number(farmId) };
  }
}
