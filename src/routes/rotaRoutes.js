const express = require('express');
const router = express.Router();
const rotaController = require('../controllers/rotaController');

router.get('/rota', rotaController.rota);
router.post('/updateRota', rotaController.updateRota);
router.get('/userDuties', rotaController.userDuties);

module.exports = router;