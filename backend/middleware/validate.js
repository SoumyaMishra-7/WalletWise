const validate = (schema) => (req, res, next) => {
  try {
    // Parse the request body against the schema
    // strip() removes unknown keys not defined in the schema
    const parsedData = schema.parse(req.body);
    
    // Replace req.body with the sanitized, parsed data
    req.body = parsedData;
    
    next();
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    next(error);
  }
};

module.exports = validate;
