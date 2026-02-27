const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* =========================
   REGISTER
========================= */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Datos incompletos' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), email.trim(), hashedPassword]
    );

    res.status(201).json({
      message: 'Usuario registrado correctamente'
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        message: 'El correo ya está registrado'
      });
    }

    console.error('REGISTER ERROR:', error);
    res.status(500).json({
      message: 'Error al registrar usuario'
    });
  }
};

/* =========================
   LOGIN
========================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email y contraseña son obligatorios'
      });
    }

    const [rows] = await db.query(
      'SELECT id, email, password, role FROM users WHERE email = ?',
      [email.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: 'Credenciales incorrectas'
      });
    }

    const user = rows[0];

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        message: 'Credenciales incorrectas'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET no definido');
      return res.status(500).json({
        message: 'Error de configuración del servidor'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      role: user.role
    });

  } catch (error) {
    console.error('LOGIN ERROR REAL:', error);
    res.status(500).json({
      message: 'Error al iniciar sesión'
    });
  }
};

/* =========================
   GOOGLE LOGIN
========================= */
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: 'Token de Google requerido'
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    const [rows] = await db.query(
      'SELECT id, email, role FROM users WHERE email = ?',
      [email]
    );

    let user;

    if (rows.length === 0) {
      const randomPassword = await bcrypt.hash(
        Math.random().toString(36),
        10
      );

      const [result] = await db.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, randomPassword, 'normal']
      );

      const [newUserRows] = await db.query(
        'SELECT id, email, role FROM users WHERE id = ?',
        [result.insertId]
      );

      user = newUserRows[0];

    } else {
      user = rows[0];
    }

    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token: jwtToken,
      role: user.role
    });

  } catch (error) {
    console.error('GOOGLE LOGIN ERROR REAL:', error);
    res.status(401).json({
      message: 'Error al autenticar con Google'
    });
  }
};