const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const logger = require('../utils/logger');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* =========================
   REGISTER
========================= */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    logger.info(`Intento de registro para email: ${email || 'sin_email'}`);

    if (!name || !email || !password) {
      logger.error('Registro fallido: datos incompletos');
      return res.status(400).json({ message: 'Datos incompletos' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), email.trim(), hashedPassword]
    );

    logger.info(`Usuario registrado correctamente: ${email}`);

    res.status(201).json({
      message: 'Usuario registrado correctamente'
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      logger.error(`Registro fallido: correo duplicado ${req.body.email || 'sin_email'}`);
      return res.status(400).json({
        message: 'El correo ya está registrado'
      });
    }

    console.error('REGISTER ERROR:', error);
    logger.error(`Error al registrar usuario: ${error.message}`);
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

    logger.info(`Intento de login para email: ${email || 'sin_email'}`);

    if (!email || !password) {
      logger.error('Login fallido: email o contraseña faltantes');
      return res.status(400).json({
        message: 'Email y contraseña son obligatorios'
      });
    }

    const [rows] = await db.query(
      'SELECT id, email, password, role FROM users WHERE email = ?',
      [email.trim()]
    );

    if (rows.length === 0) {
      logger.error(`Login fallido: usuario no encontrado ${email}`);
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
      logger.error(`Login fallido: contraseña incorrecta para ${email}`);
      return res.status(401).json({
        message: 'Credenciales incorrectas'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET no definido');
      logger.error('JWT_SECRET no definido en el servidor');
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

    logger.info(`Login exitoso para email: ${email}`);

    res.json({
      token,
      role: user.role
    });

  } catch (error) {
    console.error('LOGIN ERROR REAL:', error);
    logger.error(`Error en login: ${error.message}`);
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

    logger.info('Intento de login con Google');

    if (!credential) {
      logger.error('Google login fallido: token no enviado');
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
        [name, email, randomPassword, 'user']
      );

      const [newUserRows] = await db.query(
        'SELECT id, email, role FROM users WHERE id = ?',
        [result.insertId]
      );

      user = newUserRows[0];
      logger.info(`Usuario creado con Google: ${email}`);
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

    logger.info(`Google login exitoso para email: ${email}`);

    res.json({
      token: jwtToken,
      role: user.role
    });

  } catch (error) {
    console.error('GOOGLE LOGIN ERROR REAL:', error);
    logger.error(`Error en Google login: ${error.message}`);
    res.status(401).json({
      message: 'Error al autenticar con Google'
    });
  }
};