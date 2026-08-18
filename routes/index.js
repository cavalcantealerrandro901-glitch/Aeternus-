const express = require('express');
const router = express.Router();

const geralRoutes = require('./geral');
const welcomeRoutes = require('./welcome');

// Une todos os submódulos de rotas
router.use('/', geralRoutes);
router.use('/', welcomeRoutes);

module.exports = router;
