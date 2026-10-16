/**
 * Controller for Crop Advisory endpoints.
 * Requirement: Advisory.Generate, Advisory.Display, Section 12.6
 */
export class AdvisoryController {
  /**
   * @param {Object} deps
   * @param {import('../services/advisoryService.js').AdvisoryService} deps.advisoryService
   */
  constructor({ advisoryService }) {
    this.advisoryService = advisoryService;
  }

  generateAdvisory = async (req, res, next) => {
    try {
      const cropId = Number(req.params.cropId);
      const data = await this.advisoryService.generateAdvisory(cropId, req.user);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  getAdvisories = async (req, res, next) => {
    try {
      const cropId = Number(req.params.cropId);
      const data = await this.advisoryService.getAdvisoriesByCrop(cropId, req.user);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  getLatestAdvisory = async (req, res, next) => {
    try {
      const cropId = Number(req.params.cropId);
      const data = await this.advisoryService.getLatestAdvisoryByCrop(cropId, req.user);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };
}
