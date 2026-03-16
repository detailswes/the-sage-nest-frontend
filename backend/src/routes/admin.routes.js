const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const {
  listExperts,
  approveExpert,
  rejectExpert,
  toggleApproval,
  sendPasswordReset,
  resendVerification,
  manuallyVerify,
  suspendExpert,
  reactivateExpert,
} = require('../controllers/admin.controller');

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /admin/experts — list all experts
router.get('/experts', listExperts);

// POST /admin/experts/:id/approve — approve an expert
router.post('/experts/:id/approve', approveExpert);

// POST /admin/experts/:id/reject — reject an expert
router.post('/experts/:id/reject', rejectExpert);

// PATCH /admin/experts/:id/toggle — toggle bookable state
router.patch('/experts/:id/toggle', toggleApproval);

// POST /admin/experts/:id/send-password-reset — trigger password reset email
router.post('/experts/:id/send-password-reset', sendPasswordReset);

// POST /admin/experts/:id/resend-verification — resend verification email
router.post('/experts/:id/resend-verification', resendVerification);

// POST /admin/experts/:id/verify — manually verify expert email
router.post('/experts/:id/verify', manuallyVerify);

// POST /admin/experts/:id/suspend — suspend an expert account
router.post('/experts/:id/suspend', suspendExpert);

// POST /admin/experts/:id/reactivate — reactivate a suspended expert
router.post('/experts/:id/reactivate', reactivateExpert);

module.exports = router;
