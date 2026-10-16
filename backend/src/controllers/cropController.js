export class CropController {
  /**
   * @param {Object} deps
   * @param {import('../services/cropService.js').CropService} deps.cropService
   */
  constructor({ cropService }) {
    this.cropService = cropService;
  }

  // Requirement: Crop.Add
  addCrop = async (req, res, next) => {
    try {
      const crop = await this.cropService.addCrop(req.user, req.params.farmId, req.body);
      res.status(201).json({ data: crop });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Crop.View
  getCropsByFarm = async (req, res, next) => {
    try {
      const crops = await this.cropService.getCropsByFarm(req.user, req.params.farmId);
      res.status(200).json({ data: crops });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Crop.View
  getCropById = async (req, res, next) => {
    try {
      const crop = await this.cropService.getCropById(req.user, req.params.cropId);
      res.status(200).json({ data: crop });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Crop.Edit
  updateCrop = async (req, res, next) => {
    try {
      const updated = await this.cropService.updateCrop(
        req.user,
        req.params.cropId,
        req.body
      );
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Crop.Stage.Update
  updateCropStage = async (req, res, next) => {
    try {
      const updated = await this.cropService.updateCropStage(
        req.user,
        req.params.cropId,
        req.body.growth_stage
      );
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  // Requirement: Crop.Delete
  deleteCrop = async (req, res, next) => {
    try {
      const result = await this.cropService.deleteCrop(req.user, req.params.cropId);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
