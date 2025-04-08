const express = require('express');
const router = express.Router();
const defaultController = require('../controllers/defaultController');

router.get('/ping', defaultController.ping);
router.get('/auth', defaultController.auth);

module.exports = router;