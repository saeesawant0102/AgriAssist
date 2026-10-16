import { AppError } from '../errors/AppError.js';
import * as userRepository from '../repositories/userRepository.js';

export class ProfileService {
  /**
   * @param {Object} deps
   * @param {import('../db/connection.js').Database} deps.db
   * @param {import('../utils/clock.js').Clock} deps.clock
   */
  constructor({ db, clock }) {
    this.db = db;
    this.clock = clock;
  }

  // Requirement: Auth.Profile.View
  async getProfile(userId) {
    const user = await userRepository.findUserById(this.db, userId);
    if (!user) {
      throw AppError.notFound('User profile not found', 'PROFILE_NOT_FOUND');
    }
    return user.toJSON();
  }

  // Requirement: Auth.Profile.Update, D2
  async updateProfile(userId, { name, phone, address }) {
    const nowIso = this.clock.iso();
    const updatedUser = await userRepository.updateUserProfile(this.db, userId, {
      name,
      phone,
      address,
      updated_at: nowIso,
    });

    if (!updatedUser) {
      throw AppError.notFound('User profile not found', 'PROFILE_NOT_FOUND');
    }

    return updatedUser.toJSON();
  }
}
