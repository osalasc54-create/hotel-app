function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'No tienes permisos para esta acción'
      });
    }
    next();
  };
}

module.exports = authorizeRoles;