const observabilityService = require("../services/observability.service");

class ObservabilityController {
  getMetrics(req, res) {
    try {
      const metrics = observabilityService.getMetrics();
      res.json({ success: true, metrics });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch metrics" });
    }
  }

  getTraces(req, res) {
    try {
      const { role, endpoint, status, errorsOnly } = req.query;
      const filters = { role, endpoint, status, errorsOnly };
      const traces = observabilityService.getTraces(filters);
      res.json({ success: true, traces });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch traces" });
    }
  }
}

module.exports = new ObservabilityController();
