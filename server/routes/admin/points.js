const express = require('express')
const router = express.Router()
const controller = require("../../controllers/admin/points")
const is_admin = require("../../middleware/admin/is-admin")

router.get('/points',is_admin, controller.index);
router.post('/points',is_admin, controller.index);
router.get('/points/levels',is_admin, controller.levels);
router.post('/points/levels',is_admin, controller.levels);
router.post("/points/approve/:id?",is_admin,controller.approve)
module.exports = router;