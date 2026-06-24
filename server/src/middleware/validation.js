export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.reduce((acc, err) => {
      const field = err.path.join('.');
      acc[field] = err.message;
      return acc;
    }, {});
    
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors,
    });
  }
  
  req.validatedBody = result.data;
  next();
};
