const express = require('express');
const router = express.Router();
const statController = require('../controllers/statController');

router.post('/stats', statController.stats);

module.exports = router;