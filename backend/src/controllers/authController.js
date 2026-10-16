export class AuthController {
  /**
   * @param {Object} deps
   * @param {import('../services/authService.js').AuthService} deps.authService
   * @param {import('../services/profileService.js').ProfileService} deps.profileService
   */
  constructor({ authService, profileService }) {
    this.authService = authService;
    this.profileService = profileService;
  }

  // Requirement: Auth.Register
  register = async (req, res, next) => {
    try {
      const profile = await this.authService.register(req.body);
      res.status(201).json({ data: profile });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Auth.Login
  login = async (req, res, next) => {
    try {
      const profile = await this.authService.login(req.user);
      res.status(200).json({ data: profile });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Auth.Logout
  logout = async (req, res, next) => {
    try {
      const result = await this.authService.logout(req.user);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Auth.Profile.View
  getProfile = async (req, res, next) => {
    try {
      const profile = await this.profileService.getProfile(req.user.user_id);
      res.status(200).json({ data: profile });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Auth.Profile.Update
  updateProfile = async (req, res, next) => {
    try {
      const updated = await this.profileService.updateProfile(req.user.user_id, req.body);
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  };
}
