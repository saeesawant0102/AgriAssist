export class FarmController {
  /**
   * @param {Object} deps
   * @param {import('../services/farmService.js').FarmService} deps.farmService
   */
  constructor({ farmService }) {
    this.farmService = farmService;
  }

  // Requirement: Farm.Add
  addFarm = async (req, res, next) => {
    try {
      const farm = await this.farmService.addFarm(req.user, req.body);
      res.status(201).json({ data: farm });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Farm.View
  getFarms = async (req, res, next) => {
    try {
      const farms = await this.farmService.getFarms(req.user, req.query.farmer_id);
      res.status(200).json({ data: farms });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Farm.View
  getFarmById = async (req, res, next) => {
    try {
      const farm = await this.farmService.getFarmById(req.user, req.params.farmId);
      res.status(200).json({ data: farm });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Farm.Edit
  updateFarm = async (req, res, next) => {
    try {
      const updated = await this.farmService.updateFarm(req.user, req.params.farmId, req.body);
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Farm.Delete
  deleteFarm = async (req, res, next) => {
    try {
      const result = await this.farmService.deleteFarm(req.user, req.params.farmId);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
