import { AppError } from '../errors/AppError.js';
import { countCrops } from '../repositories/cropRepository.js';
import { countFarms } from '../repositories/farmRepository.js';
import { countFinancialRecords } from '../repositories/financialRepository.js';
import { getAllOverallProfitability } from '../repositories/profitabilityRepository.js';
import {
  countFarmers,
  deleteUserById,
  findUserById,
  listFarmerUsers,
  updateUserProfile,
  updateUserStatus,
} from '../repositories/userRepository.js';

/**
 * Service for Administrator operations.
 * Requirements: Administrator.manage_system (D8), Administrator.view_all_reports (D9),
 * Administrator.manage_users (D7, D19), Section 12.10
 */
export class AdminService {
  /**
   * @param {Object} deps
   * @param {import('../db/connection.js').Database} deps.db
   * @param {import('../auth/AuthGateway.js').AuthGateway} deps.authGateway
   * @param {import('../utils/clock.js').Clock} deps.clock
   */
  constructor({ db, authGateway, clock }) {
    this.db = db;
    this.authGateway = authGateway;
    this.clock = clock;
  }

  /**
   * Retrieves overall system statistics.
   * Requirement: Administrator.manage_system, D8, Section 12.10
   * @returns {Promise<Object>}
   */
  async getSystemStats() {
    const [farmerCount, farmCount, cropCount, financialRecordCount] = await Promise.all([
      countFarmers(this.db),
      countFarms(this.db),
      countCrops(this.db),
      countFinancialRecords(this.db),
    ]);

    return {
      farmer_count: farmerCount,
      farm_count: farmCount,
      crop_count: cropCount,
      financial_record_count: financialRecordCount,
    };
  }

  /**
   * Retrieves overall profitability for every farm across all farmers.
   * Requirement: Administrator.view_all_reports, D9, Section 12.10
   * @returns {Promise<Array<Object>>}
   */
  async getAllReports() {
    return getAllOverallProfitability(this.db);
  }

  /**
   * Lists farmer accounts with keyset pagination and optional status filter.
   * Requirement: Administrator.manage_users, D7, D19, Section 12.10
   * @param {Object} options
   * @param {string} [options.status]
   * @param {number} [options.limit=20]
   * @param {number} [options.cursor]
   * @returns {Promise<{ data: Array<Object>, next_cursor: number | null }>}
   */
  async listFarmerAccounts({ status = null, limit = 20, cursor = null } = {}) {
    const result = await listFarmerUsers(this.db, { status, limit, cursor });
    return {
      data: result.users.map((u) => u.toJSON()),
      next_cursor: result.next_cursor,
    };
  }

  /**
   * Views a farmer account profile by user_id.
   * Requirement: Section 12.10 GET /admin/users/:userId
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  async getFarmerAccount(userId) {
    const user = await findUserById(this.db, userId);
    if (!user) {
      throw AppError.notFound('Farmer account not found', 'USER_NOT_FOUND');
    }

    if (user.user_type !== 'farmer') {
      throw AppError.forbidden('Only farmer accounts can be managed', 'FORBIDDEN');
    }

    return user.toJSON();
  }

  /**
   * Updates a farmer's profile (name, phone, address).
   * Requirement: Section 12.10 PUT /admin/users/:userId
   * @param {number} userId
   * @param {Object} currentAdmin
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateFarmerProfile(userId, currentAdmin, data) {
    const user = await findUserById(this.db, userId);
    if (!user) {
      throw AppError.notFound('Farmer account not found', 'USER_NOT_FOUND');
    }

    if (user.user_type !== 'farmer' || user.user_id === currentAdmin.user_id) {
      throw AppError.forbidden('Cannot modify administrator accounts', 'FORBIDDEN');
    }

    const nowIso = this.clock.now().toISOString();
    const updated = await updateUserProfile(this.db, userId, {
      name: data.name,
      phone: data.phone,
      address: data.address,
      updated_at: nowIso,
    });

    return updated.toJSON();
  }

  /**
   * Updates a farmer's account status (active/disabled).
   * Disabling disables Firebase user and revokes tokens.
   * Enabling restores login in Firebase.
   * Requirement: Section 12.10 PATCH /admin/users/:userId/status
   * @param {number} userId
   * @param {Object} currentAdmin
   * @param {'active' | 'disabled'} status
   * @returns {Promise<Object>}
   */
  async updateFarmerStatus(userId, currentAdmin, status) {
    const user = await findUserById(this.db, userId);
    if (!user) {
      throw AppError.notFound('Farmer account not found', 'USER_NOT_FOUND');
    }

    if (user.user_type !== 'farmer' || user.user_id === currentAdmin.user_id) {
      throw AppError.forbidden('Cannot modify administrator accounts', 'FORBIDDEN');
    }

    const nowIso = this.clock.now().toISOString();

    if (status === 'disabled') {
      // 1. Disable in Firebase
      await this.authGateway.setDisabled(user.firebase_uid, true);
      // 2. Revoke refresh tokens
      await this.authGateway.revokeRefreshTokens(user.firebase_uid);
      // 3. Update local SQLite status
      await updateUserStatus(this.db, userId, 'disabled', nowIso);
    } else {
      // 1. Enable in Firebase
      await this.authGateway.setDisabled(user.firebase_uid, false);
      // 2. Update local SQLite status
      await updateUserStatus(this.db, userId, 'active', nowIso);
    }

    const updated = await findUserById(this.db, userId);
    return updated.toJSON();
  }

  /**
   * Deletes a farmer account.
   * Safe order: delete Firebase user (idempotent / ignore not-found) -> delete SQLite user (FK cascade).
   * Requirement: Section 12.10 DELETE /admin/users/:userId, D5
   * @param {number} userId
   * @param {Object} currentAdmin
   * @returns {Promise<{ deleted: boolean, id: number }>}
   */
  async deleteFarmerAccount(userId, currentAdmin) {
    const user = await findUserById(this.db, userId);
    if (!user) {
      throw AppError.notFound('Farmer account not found', 'USER_NOT_FOUND');
    }

    if (user.user_type !== 'farmer' || user.user_id === currentAdmin.user_id) {
      throw AppError.forbidden('Cannot delete administrator accounts', 'FORBIDDEN');
    }

    // Safe step 1: delete Firebase user. Treat "user not found" as success so retries succeed.
    try {
      await this.authGateway.deleteUser(user.firebase_uid);
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      if (!msg.includes('not found') && err.code !== 'auth/user-not-found') {
        throw err;
      }
    }

    // Safe step 2: delete local user row. SQLite FK cascades handle all dependent records.
    await deleteUserById(this.db, userId);

    return {
      deleted: true,
      id: userId,
    };
  }
}
