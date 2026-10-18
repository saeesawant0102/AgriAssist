/**
 * Controller for Irrigation Scheduling endpoints.
 * Requirement: Irrigation.Generate, Irrigation.View, Irrigation.Update, Irrigation.Skip, Section 12.7
 */
export class IrrigationController {
  /**
   * @param {Object} deps
   * @param {import('../services/irrigationService.js').IrrigationService} deps.irrigationService
   */
  constructor({ irrigationService }) {
    this.irrigationService = irrigationService;
  }

  // Requirement: Irrigation.Generate (POST /crops/:cropId/irrigation-schedules)
  generateSchedule = async (req, res, next) => {
    try {
      const cropId = Number(req.params.cropId);
      const schedule = await this.irrigationService.generateSchedule(cropId, req.user);
      res.status(201).json({ data: schedule });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Irrigation.View (GET /crops/:cropId/irrigation-schedules)
  getSchedules = async (req, res, next) => {
    try {
      const cropId = Number(req.params.cropId);
      const schedules = await this.irrigationService.getSchedules(cropId, req.user);
      res.status(200).json({ data: schedules });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Irrigation.Update, Irrigation.Skip (POST /irrigation-schedules/:scheduleId/refresh)
  refreshSchedule = async (req, res, next) => {
    try {
      const scheduleId = Number(req.params.scheduleId);
      const schedule = await this.irrigationService.refreshSchedule(scheduleId, req.user);
      res.status(200).json({ data: schedule });
    } catch (err) {
      next(err);
    }
  };
}
