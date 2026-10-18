/**
 * Controller for Administrator endpoints.
 * Requirements: Section 12.10, D7, D8, D9, D19
 */
export class AdminController {
  /**
   * @param {Object} deps
   * @param {import('../services/adminService.js').AdminService} deps.adminService
   * @param {import('../services/farmService.js').FarmService} [deps.farmService]
   */
  constructor({ adminService, farmService }) {
    this.adminService = adminService;
    this.farmService = farmService;
  }

  // Requirement: GET /api/v1/admin/stats
  getStats = async (req, res, next) => {
    try {
      const data = await this.adminService.getSystemStats();
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: GET /api/v1/admin/reports
  getAllReports = async (req, res, next) => {
    try {
      const data = await this.adminService.getAllReports();
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: GET /api/v1/admin/users
  listUsers = async (req, res, next) => {
    try {
      const { status, limit, cursor } = req.query;
      const { data, next_cursor } = await this.adminService.listFarmerAccounts({
        status,
        limit,
        cursor,
      });
      res.status(200).json({ data, next_cursor });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: GET /api/v1/admin/users/:userId
  getUser = async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      const data = await this.adminService.getFarmerAccount(userId);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: PUT /api/v1/admin/users/:userId
  updateUser = async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      const data = await this.adminService.updateFarmerProfile(userId, req.user, req.body);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: PATCH /api/v1/admin/users/:userId/status
  updateStatus = async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      const data = await this.adminService.updateFarmerStatus(userId, req.user, req.body.status);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: DELETE /api/v1/admin/users/:userId
  deleteUser = async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      const data = await this.adminService.deleteFarmerAccount(userId, req.user);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: GET /api/v1/admin/farms
  listFarms = async (req, res, next) => {
    try {
      if (!this.farmService) {
        return res.status(200).json({ data: [] });
      }
      const filterFarmerId = req.query.farmer_id ? Number(req.query.farmer_id) : null;
      const farms = await this.farmService.getFarms(req.user, filterFarmerId);
      res.status(200).json({ data: farms });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: POST /api/v1/admin/farms
  addFarm = async (req, res, next) => {
    try {
      if (!this.farmService) {
        throw new Error('FarmService not available');
      }
      const farm = await this.farmService.addFarm(req.user, req.body);
      res.status(201).json({ data: farm });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: DELETE /api/v1/admin/farms/:farmId
  deleteFarm = async (req, res, next) => {
    try {
      if (!this.farmService) {
        throw new Error('FarmService not available');
      }
      const farmId = Number(req.params.farmId);
      const result = await this.farmService.deleteFarm(req.user, farmId);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
