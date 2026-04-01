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

// OD Request Schema
const odRequestSchema = z.object({
  body: z.object({
    type: z.enum(['ACADEMIC', 'INTERNATIONAL', 'JOURNAL']),
    purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format (YYYY-MM-DD)'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format (YYYY-MM-DD)'),
    days: z.number().positive(),
    isFullDay: z.boolean().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  }),
});

// Fund Request Schema
const fundRequestSchema = z.object({
  body: z.object({
    projectTitle: z.string().min(5, 'Project title must be at least 5 characters'),
    requestedAmount: z.number().positive('Amount must be positive'),
    purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
    source: z.enum(['PFMS', 'DIRECTOR_INNOVATION']),
    department: z.string().optional(),
    centre: z.string().optional(),
  }),
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
    const errorMessages = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
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
};
