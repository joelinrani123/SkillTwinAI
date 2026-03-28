
module.exports = function requireRole(...roles) {

  const expanded = roles.flatMap(r => r === 'candidate' ? ['user', 'candidate'] : r === 'user' ? ['user', 'candidate'] : [r]);
  const allowed  = new Set(expanded);

  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorised' });
    if (!allowed.has(req.user.role)) {
      return res.status(403).json({ message: `Access restricted to: ${[...roles].join(', ')}` });
    }
    next();
  };
};
