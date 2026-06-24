export const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err.message || err);

  // MongoDB CastError — invalid ObjectId format
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid Clinic ID — please check the ID and try again.',
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'An unexpected error occurred on the server',
    errors: err.errors || null,
  });
};
