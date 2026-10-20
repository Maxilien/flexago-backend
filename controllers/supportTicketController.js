/* ============================================================
   FLEXAGO SUPPORT TICKET CONTROLLER

   Handles:
   - Ticket creation
   - User ticket history
   - User ticket details
   - Admin ticket visibility
   - Admin status and resolution updates
   - Admin/support notes
============================================================ */

const crypto = require("crypto");
const mongoose = require("mongoose");

const SupportTicket = require(
  "../models/SupportTicket"
);

const Delivery = require(
  "../models/Delivery"
);

/* ============================================================
   CONSTANTS
============================================================ */

const VALID_ROLES = [
  "sender",
  "traveler"
];

const VALID_CATEGORIES = [
  "account",
  "verification",
  "payment",
  "payout",
  "delivery",
  "chat",
  "safety",
  "technical",
  "other"
];

const VALID_STATUSES = [
  "open",
  "in_progress",
  "waiting_user",
  "resolved",
  "closed"
];

const VALID_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent"
];

/* ============================================================
   HELPERS
============================================================ */

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(
    value
  );
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeRole(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function getRequestingUser(req) {
  const userId = normalizeText(
    req.headers["x-user-id"]
  );

  const userRole = normalizeRole(
    req.headers["x-user-role"]
  );

  return {
    userId,
    userRole
  };
}

function getDefaultPriority(category) {
  if (category === "safety") {
    return "urgent";
  }

  if (
    category === "payment" ||
    category === "payout"
  ) {
    return "high";
  }

  return "normal";
}

function buildTicketNumber() {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const randomPart = crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();

  return `FX-${datePart}-${randomPart}`;
}

async function createUniqueTicketNumber() {
  for (
    let attempt = 0;
    attempt < 5;
    attempt += 1
  ) {
    const ticketNumber =
      buildTicketNumber();

    const exists =
      await SupportTicket.exists({
        ticketNumber
      });

    if (!exists) {
      return ticketNumber;
    }
  }

  throw new Error(
    "Unable to generate a unique ticket number."
  );
}

async function authorizeDeliveryReference(
  deliveryId,
  userId,
  userRole
) {
  if (!deliveryId) {
    return {
      authorized: true,
      delivery: null
    };
  }

  if (!isValidObjectId(deliveryId)) {
    return {
      authorized: false,
      statusCode: 400,
      error: "Invalid delivery ID."
    };
  }

  const delivery = await Delivery.findById(
    deliveryId
  )
    .select("senderId travelerId")
    .lean();

  if (!delivery) {
    return {
      authorized: false,
      statusCode: 404,
      error: "Delivery not found."
    };
  }

  const deliverySenderId =
    normalizeText(
      delivery.senderId
        ? String(delivery.senderId)
        : ""
    );

  const deliveryTravelerId =
    normalizeText(
      delivery.travelerId
        ? String(delivery.travelerId)
        : ""
    );

  const belongsToSender =
    userRole === "sender" &&
    deliverySenderId === userId;

  const belongsToTraveler =
    userRole === "traveler" &&
    deliveryTravelerId === userId;

  if (
    !belongsToSender &&
    !belongsToTraveler
  ) {
    return {
      authorized: false,
      statusCode: 403,
      error:
        "You are not authorized to reference this delivery."
    };
  }

  return {
    authorized: true,
    delivery
  };
}

function parsePositiveInteger(
  value,
  fallback,
  maximum
) {
  const parsed = Number.parseInt(
    value,
    10
  );

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return Math.min(
    parsed,
    maximum
  );
}

function getAdminIdentity(req) {
  return normalizeText(
    req.admin?.email ||
    req.admin?.name ||
    req.admin?.id ||
    req.user?.email ||
    req.user?.name ||
    req.user?.id ||
    req.headers["x-admin-id"] ||
    "admin"
  );
}

/* ============================================================
   CREATE SUPPORT TICKET
   POST /api/support-tickets
============================================================ */

async function createSupportTicket(
  req,
  res
) {
  try {
    const {
      userId,
      userRole
    } = getRequestingUser(req);

    if (
      !userId ||
      !isValidObjectId(userId)
    ) {
      return res.status(401).json({
        success: false,
        error:
          "Valid user authentication is required."
      });
    }

    if (
      !VALID_ROLES.includes(userRole)
    ) {
      return res.status(401).json({
        success: false,
        error:
          "A valid user role is required."
      });
    }

    const category = normalizeText(
      req.body?.category
    ).toLowerCase();

    const subject = normalizeText(
      req.body?.subject
    );

    const description = normalizeText(
      req.body?.description
    );

    const deliveryId = normalizeText(
      req.body?.deliveryId
    );

    if (
      !VALID_CATEGORIES.includes(
        category
      )
    ) {
      return res.status(400).json({
        success: false,
        error:
          "A valid support category is required."
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        error:
          "Ticket subject is required."
      });
    }

    if (subject.length > 200) {
      return res.status(400).json({
        success: false,
        error:
          "Ticket subject cannot exceed 200 characters."
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        error:
          "Ticket description is required."
      });
    }

    if (description.length > 5000) {
      return res.status(400).json({
        success: false,
        error:
          "Ticket description cannot exceed 5000 characters."
      });
    }

    const deliveryAuthorization =
      await authorizeDeliveryReference(
        deliveryId,
        userId,
        userRole
      );

    if (
      !deliveryAuthorization.authorized
    ) {
      return res
        .status(
          deliveryAuthorization.statusCode
        )
        .json({
          success: false,
          error:
            deliveryAuthorization.error
        });
    }

    const ticketNumber =
      await createUniqueTicketNumber();

    const ticket =
      await SupportTicket.create({
        ticketNumber,
        userId,
        userRole,

        requesterName: normalizeText(
          req.body?.requesterName
        ),

        requesterEmail: normalizeEmail(
          req.body?.requesterEmail
        ),

        requesterPhone: normalizeText(
          req.body?.requesterPhone
        ),

        category,
        subject,
        description,

        deliveryId:
          deliveryId || null,

        priority:
          getDefaultPriority(category),

        status: "open"
      });

    return res.status(201).json({
      success: true,
      message:
        "Support ticket submitted successfully.",
      data: ticket
    });

  } catch (error) {
    console.error(
      "Create support ticket error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to create support ticket."
    });
  }
}

/* ============================================================
   GET LOGGED-IN USER TICKETS
   GET /api/support-tickets/my
============================================================ */

async function getMySupportTickets(
  req,
  res
) {
  try {
    const {
      userId,
      userRole
    } = getRequestingUser(req);

    if (
      !userId ||
      !isValidObjectId(userId) ||
      !VALID_ROLES.includes(userRole)
    ) {
      return res.status(401).json({
        success: false,
        error:
          "Valid user authentication is required."
      });
    }

    const filter = {
      userId,
      userRole,
      visibleToUser: true
    };

    const status = normalizeText(
      req.query?.status
    ).toLowerCase();

    const category = normalizeText(
      req.query?.category
    ).toLowerCase();

    if (
      VALID_STATUSES.includes(status)
    ) {
      filter.status = status;
    }

    if (
      VALID_CATEGORIES.includes(category)
    ) {
      filter.category = category;
    }

    const tickets =
      await SupportTicket.find(filter)
        .sort({
          createdAt: -1
        })
        .lean();

    return res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });

  } catch (error) {
    console.error(
      "Get user support tickets error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to load support tickets."
    });
  }
}

/* ============================================================
   GET ONE USER TICKET
   GET /api/support-tickets/my/:ticketId
============================================================ */

async function getMySupportTicket(
  req,
  res
) {
  try {
    const {
      userId,
      userRole
    } = getRequestingUser(req);

    const ticketId = normalizeText(
      req.params?.ticketId
    );

    if (
      !userId ||
      !isValidObjectId(userId) ||
      !VALID_ROLES.includes(userRole)
    ) {
      return res.status(401).json({
        success: false,
        error:
          "Valid user authentication is required."
      });
    }

    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid support ticket ID."
      });
    }

    const ticket =
      await SupportTicket.findOne({
        _id: ticketId,
        userId,
        userRole,
        visibleToUser: true
      }).lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error:
          "Support ticket not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: ticket
    });

  } catch (error) {
    console.error(
      "Get support ticket error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to load support ticket."
    });
  }
}

/* ============================================================
   ADMIN: GET ALL SUPPORT TICKETS
   GET /api/support-tickets/admin

   Protect this route with Admin authentication middleware.
============================================================ */

async function getAllSupportTickets(
  req,
  res
) {
  try {
    const filter = {};

    const status = normalizeText(
      req.query?.status
    ).toLowerCase();

    const category = normalizeText(
      req.query?.category
    ).toLowerCase();

    const userRole = normalizeRole(
      req.query?.userRole
    );

    const priority = normalizeText(
      req.query?.priority
    ).toLowerCase();

    const deliveryId = normalizeText(
      req.query?.deliveryId
    );

    const search = normalizeText(
      req.query?.search
    );

    if (
      VALID_STATUSES.includes(status)
    ) {
      filter.status = status;
    }

    if (
      VALID_CATEGORIES.includes(category)
    ) {
      filter.category = category;
    }

    if (
      VALID_ROLES.includes(userRole)
    ) {
      filter.userRole = userRole;
    }

    if (
      VALID_PRIORITIES.includes(priority)
    ) {
      filter.priority = priority;
    }

    if (
      deliveryId &&
      isValidObjectId(deliveryId)
    ) {
      filter.deliveryId = deliveryId;
    }

    if (search) {
      filter.$or = [
        {
          ticketNumber: {
            $regex: search,
            $options: "i"
          }
        },
        {
          subject: {
            $regex: search,
            $options: "i"
          }
        },
        {
          requesterName: {
            $regex: search,
            $options: "i"
          }
        },
        {
          requesterEmail: {
            $regex: search,
            $options: "i"
          }
        }
      ];
    }

    const page = parsePositiveInteger(
      req.query?.page,
      1,
      100000
    );

    const limit = parsePositiveInteger(
      req.query?.limit,
      25,
      100
    );

    const skip =
      (page - 1) * limit;

    const [tickets, total] =
      await Promise.all([
        SupportTicket.find(filter)
          .sort({
            createdAt: -1
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        SupportTicket.countDocuments(
          filter
        )
      ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,

      totalPages: Math.max(
        1,
        Math.ceil(total / limit)
      ),

      data: tickets
    });

  } catch (error) {
    console.error(
      "Admin support ticket list error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to load support tickets."
    });
  }
}

/* ============================================================
   ADMIN: GET ONE SUPPORT TICKET
   GET /api/support-tickets/admin/:ticketId
============================================================ */

async function getSupportTicketForAdmin(
  req,
  res
) {
  try {
    const ticketId = normalizeText(
      req.params?.ticketId
    );

    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid support ticket ID."
      });
    }

    const ticket =
      await SupportTicket.findById(
        ticketId
      ).lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error:
          "Support ticket not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: ticket
    });

  } catch (error) {
    console.error(
      "Admin support ticket detail error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to load support ticket."
    });
  }
}

/* ============================================================
   ADMIN: UPDATE SUPPORT TICKET
   PATCH /api/support-tickets/admin/:ticketId
============================================================ */

async function updateSupportTicket(
  req,
  res
) {
  try {
    const ticketId = normalizeText(
      req.params?.ticketId
    );

    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid support ticket ID."
      });
    }

    const ticket =
      await SupportTicket.findById(
        ticketId
      );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error:
          "Support ticket not found."
      });
    }

    const status = normalizeText(
      req.body?.status
    ).toLowerCase();

    const priority = normalizeText(
      req.body?.priority
    ).toLowerCase();

    const resolution = normalizeText(
      req.body?.resolution
    );

    const assignedTo = normalizeText(
      req.body?.assignedTo
    );

    if (status) {
      if (
        !VALID_STATUSES.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid ticket status."
        });
      }

      ticket.status = status;

      if (status === "resolved") {
        ticket.resolvedAt =
          ticket.resolvedAt ||
          new Date();

        ticket.closedAt = null;
      }

      if (status === "closed") {
        ticket.closedAt =
          new Date();

        ticket.resolvedAt =
          ticket.resolvedAt ||
          new Date();
      }

      if (
        status === "open" ||
        status === "in_progress" ||
        status === "waiting_user"
      ) {
        ticket.resolvedAt = null;
        ticket.closedAt = null;
      }
    }

    if (priority) {
      if (
        !VALID_PRIORITIES.includes(
          priority
        )
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid ticket priority."
        });
      }

      ticket.priority = priority;
    }

    if (
      req.body &&
      Object.prototype.hasOwnProperty.call(
        req.body,
        "resolution"
      )
    ) {
      if (resolution.length > 5000) {
        return res.status(400).json({
          success: false,
          error:
            "Resolution cannot exceed 5000 characters."
        });
      }

      ticket.resolution =
        resolution;
    }

    if (
      req.body &&
      Object.prototype.hasOwnProperty.call(
        req.body,
        "assignedTo"
      )
    ) {
      if (
        assignedTo &&
        !isValidObjectId(assignedTo)
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid Admin assignment ID."
        });
      }

      ticket.assignedTo =
        assignedTo || null;
    }

    if (
      req.body &&
      Object.prototype.hasOwnProperty.call(
        req.body,
        "visibleToUser"
      )
    ) {
      ticket.visibleToUser =
        Boolean(
          req.body.visibleToUser
        );
    }

    await ticket.save();

    return res.status(200).json({
      success: true,
      message:
        "Support ticket updated successfully.",
      data: ticket
    });

  } catch (error) {
    console.error(
      "Update support ticket error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to update support ticket."
    });
  }
}

/* ============================================================
   ADMIN: ADD SUPPORT NOTE
   POST /api/support-tickets/admin/:ticketId/notes
============================================================ */

async function addSupportNote(
  req,
  res
) {
  try {
    const ticketId = normalizeText(
      req.params?.ticketId
    );

    const message = normalizeText(
      req.body?.message
    );

    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid support ticket ID."
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error:
          "Support note is required."
      });
    }

    if (message.length > 3000) {
      return res.status(400).json({
        success: false,
        error:
          "Support note cannot exceed 3000 characters."
      });
    }

    const ticket =
      await SupportTicket.findById(
        ticketId
      );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error:
          "Support ticket not found."
      });
    }

    ticket.supportNotes.push({
      message,
      addedBy:
        getAdminIdentity(req)
    });

    await ticket.save();

    return res.status(201).json({
      success: true,
      message:
        "Support note added successfully.",
      data: ticket
    });

  } catch (error) {
    console.error(
      "Add support note error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Unable to add support note."
    });
  }
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  createSupportTicket,
  getMySupportTickets,
  getMySupportTicket,
  getAllSupportTickets,
  getSupportTicketForAdmin,
  updateSupportTicket,
  addSupportNote
};