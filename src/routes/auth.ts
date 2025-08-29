import { Router } from 'express';
import { AuthController } from '@/controllers/authController';
import { authenticateToken, AuthRequest } from '@/middlewares/auth';
import { validate, loginSchema, registerUserSchema, forgotPasswordSchema, resetPasswordSchema } from '@/middlewares/validation';
import { authRateLimiter } from '@/middlewares/rateLimit';

const router = Router();

// Registrar novo usuário
router.post('/register', 
  authRateLimiter,
  validate(registerUserSchema),
  AuthController.register
);

// Login
router.post('/login',
  authRateLimiter,
  validate(loginSchema),
  AuthController.login
);

// Renovar token
router.post('/refresh',
  AuthController.refresh
);

// Logout
router.post('/logout',
  authenticateToken,
  AuthController.logout
);

// Recuperar senha
router.post('/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  AuthController.forgotPassword
);

// Redefinir senha
router.post('/reset-password',
  validate(resetPasswordSchema),
  AuthController.resetPassword
);

// Verificar token (rota protegida)
router.get('/verify',
  authenticateToken,
  AuthController.verifyToken
);

export default router;
