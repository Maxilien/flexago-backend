/* ============================================================
   FLEXAGO SUPPORT TICKET ROUTES

   User routes:
   POST /api/support-tickets
   GET  /api/support-tickets/my
   GET  /api/support-tickets/my/:ticketId

   Admin routes:
   GET   /api/support-tickets/admin
   GET   /api/support-tickets/admin/:ticketId
   PATCH /api/support-tickets/admin/:ticketId
   POST  /api/support-tickets/admin/:ticketId/notes

   Security:
   - Sender and Traveler identity is validated by the controller
     using x-user-id and x-user-role.
   - Admin routes require the existing adminAuth JWT middleware.
============================================================ */

const express = require("express");

const {
  createSupportTicket,
  getMySupportTickets,
  getMySupportTicket,
  getAllSupportTickets,
  getSupportTicketForAdmin,
  updateSupportTicket,
  addSupportNote
} = require(
  "../controllers/supportTicketController"
);

const adminAuth = require(
  "../middleware/adminAuth"
);

const router = express.Router();

/* ============================================================
   USER: CREATE SUPPORT TICKET

   Required headers:
   x-user-id
   x-user-role

   Body:
   category
   subject
   description

   Optional:
   deliveryId
   requesterName
   requesterEmail
   requesterPhone
============================================================ */

router.post(
  "/",
  createSupportTicket
);

/* ============================================================
   USER: GET MY SUPPORT TICKETS

   Optional query parameters:
   status
   category
============================================================ */

router.get(
  "/my",
  getMySupportTickets
);

/* ============================================================
   USER: GET ONE OF MY SUPPORT TICKETS
============================================================ */

router.get(
  "/my/:ticketId",
  getMySupportTicket
);

/* ============================================================
   ADMIN: GET ALL SUPPORT TICKETS

   Requires:
   Authorization: Bearer <admin-token>

   Optional query parameters:
   status
   category
   userRole
   priority
   deliveryId
   search
   page
   limit
============================================================ */

router.get(
  "/admin",
  adminAuth,
  getAllSupportTickets
);

/* ============================================================
   ADMIN: GET ONE SUPPORT TICKET
============================================================ */

router.get(
  "/admin/:ticketId",
  adminAuth,
  getSupportTicketForAdmin
);

/* ============================================================
   ADMIN: UPDATE SUPPORT TICKET

   Supported body fields:
   status
   priority
   assignedTo
   resolution
   visibleToUser
============================================================ */

router.patch(
  "/admin/:ticketId",
  adminAuth,
  updateSupportTicket
);

/* ============================================================
   ADMIN: ADD INTERNAL SUPPORT NOTE

   Body:
   message
============================================================ */

router.post(
  "/admin/:ticketId/notes",
  adminAuth,
  addSupportNote
);

/* ============================================================
   EXPORT
============================================================ */

module.exports = router;