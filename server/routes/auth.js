import express from 'express';

const router = express.Router();

/**
 * POST /api/auth/login
 * Proxies login request to Rian API
 * Follows the same pattern as RND Documents portal
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: 0,
      message: 'Email and password required'
    });
  }

  try {
    const RIAN_API_BASE = process.env.RIAN_API_BASE_URL || 'https://api.rian.io/v1';

    // Call Rian API login endpoint
    const response = await fetch(`${RIAN_API_BASE}/Auth/LoginUser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        em: email,
        pw: password,
      }),
    });

    const data = await response.json();

    // Validate Rian API response
    if (data.status !== 1) {
      return res.status(401).json({
        status: 0,
        message: data.message || 'Invalid credentials',
      });
    }

    // Store auth tokens in session
    req.session.userId = email; // Use email as user ID
    req.session.userEmail = email;
    req.session.userName = data.data.userName || email;
    req.session.accessToken = data.data.at;
    req.session.refreshToken = data.data.rt;

    // Return success response matching Rian API format
    res.json({
      status: 1,
      message: 'Login successful',
      data: {
        at: data.data.at,
        rt: data.data.rt,
        userName: data.data.userName || email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 0,
      message: 'Authentication failed'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  const { at, rt } = req.body;

  if (!at || !rt) {
    return res.status(400).json({
      status: 0,
      message: 'Access token and refresh token required',
    });
  }

  try {
    const RIAN_API_BASE = process.env.RIAN_API_BASE_URL || 'https://api.rian.io/v1';

    // Call Rian API refresh endpoint
    const response = await fetch(`${RIAN_API_BASE}/Auth/RefreshToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ at, rt }),
    });

    const data = await response.json();

    if (data.status !== 1) {
      // Token refresh failed, clear session
      req.session.destroy(() => {});
      return res.status(401).json({
        status: 0,
        message: 'Token refresh failed',
      });
    }

    // Update session with new tokens
    req.session.accessToken = data.data.at;
    req.session.refreshToken = data.data.rt;

    res.json({
      status: 1,
      data: {
        at: data.data.at,
        rt: data.data.rt,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      status: 0,
      message: 'Token refresh failed',
    });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ status: 0, message: 'Logout failed' });
    }
    res.json({ status: 1, message: 'Logged out successfully' });
  });
});

/**
 * GET /api/auth/me
 * Check current session
 */
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      status: 0,
      message: 'Not authenticated',
    });
  }

  res.json({
    status: 1,
    user: {
      email: req.session.userEmail,
      name: req.session.userName,
    },
  });
});

export default router;
