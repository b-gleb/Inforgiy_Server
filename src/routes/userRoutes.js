const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/users', userController.users);
router.post('/updateUser', userController.updateUser);
router.post('/removeUser', userController.removeUser);

module.exports = router;