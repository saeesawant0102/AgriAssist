/**
 * Controller for Weather Dashboard and Alerts endpoints.
 * Requirement: Weather.Fetch, Weather.Display, Weather Alert Notification, Section 12.5
 */
export class WeatherController {
  /**
   * @param {Object} deps
   * @param {import('../services/weatherDashboardService.js').WeatherDashboardService} deps.weatherDashboardService
   */
  constructor({ weatherDashboardService }) {
    this.weatherDashboardService = weatherDashboardService;
  }

  getCurrentWeather = async (req, res, next) => {
    try {
      const farmId = Number(req.params.farmId);
      const data = await this.weatherDashboardService.getCurrentWeather(farmId, req.user);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  getForecast = async (req, res, next) => {
    try {
      const farmId = Number(req.params.farmId);
      const days = req.query.days ? Number(req.query.days) : 7;
      const data = await this.weatherDashboardService.getForecast(farmId, days, req.user);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  getAlerts = async (req, res, next) => {
    try {
      const farmId = Number(req.params.farmId);
      const data = await this.weatherDashboardService.getAlerts(farmId, req.user);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };
}
