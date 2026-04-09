const { z } = require('zod');

// Authentication Schemas
const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    role: z.enum(['ADMIN', 'FACULTY', 'FINANCE_OFFICER']).optional(),
    department: z.string().min(1, 'Department is required'),
    centre: z.string().optional(),
  }),
});

// Project Schema
const projectSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(3, 'Description must be at least 3 characters'),
    sanctionedBudget: z.number().nonnegative(),
    // Exactly matches DB ENUM values in Project model
    fundingSource: z.enum(['PFMS', 'INSTITUTIONAL', 'OTHERS']),
    projectType: z.string().optional(),
    publisher: z.string().optional().nullable(),
    publicationYear: z.number().optional(),
    // status is intentionally excluded — backend controller always overrides it
    facultyId: z.string().uuid().optional().nullable(),
    pi: z.string().optional(),
    department: z.string().optional(),
    centre: z.string().optional(),
    verificationScreenshot: z.string().optional().nullable(),
  })
});

// OD Request Schema
const odRequestSchema = z.object({
  body: z.object({
    // FIX: Expand enum to all types the frontend can send
    type: z.enum(['ACADEMIC', 'INTERNATIONAL', 'JOURNAL', 'ADMINISTRATIVE', 'EXAM_DUTY', 'CONFERENCE', 'OTHER']),
    purpose: z.string().min(3, 'Purpose must be at least 3 characters'),
    // FIX: Accept empty string or null gracefully (backend validates actual date separately)
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format (YYYY-MM-DD)'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format (YYYY-MM-DD)'),
    days: z.number().nonnegative(),
    isFullDay: z.boolean().optional(),
    startTime: z.string().optional().nullable(),
    endTime: z.string().optional().nullable(),
  }),
});

// Fund Request Schema
const fundRequestSchema = z.object({
  body: z.object({
    projectTitle: z.string().min(5, 'Project title must be at least 5 characters'),
    requestedAmount: z.number().positive('Amount must be positive'),
    purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
    source: z.enum(['PFMS', 'INSTITUTIONAL', 'OTHERS']),
    department: z.string().optional(),
    centre: z.string().optional(),
  }),
});

const notificationSchema = z.object({
  body: z.object({
    title: z.string().max(255).optional(),
    message: z.string().min(1, 'Notification message is required').max(1000),
    type: z.string().max(50).optional(),
    role: z.enum(['ADMIN', 'FACULTY', 'FINANCE_OFFICER']).optional().nullable(),
    targetUserId: z.string().uuid().optional().nullable(),
    relatedId: z.string().max(1000).optional().nullable(),
    actionUrl: z.string().max(1000).optional().nullable(),
  }).refine(
    (data) => Boolean(data.role || data.targetUserId),
    { message: 'Either role or targetUserId is required' }
  ),
});

// Validation Middleware Helper
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    const issues = error.issues || error.errors || [];
    const errorMessages = issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    return res.status(400).json({
      success: false,
      message: errorMessages.map(e => e.message).join(', '),
      errors: errorMessages,
    });
  }
};

module.exports = {
  validate,
  loginSchema,
  registerSchema,
  odRequestSchema,
  fundRequestSchema,
  notificationSchema,
  projectSchema
};
