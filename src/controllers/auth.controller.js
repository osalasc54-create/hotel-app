const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

    // 🔐 VALIDACIÓN CLAVE (esto te faltaba)
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email y contraseña son obligatorios'
      });
    }

    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?',
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

    // 🔐 VERIFICACIÓN DE JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET no definido');
      return res.status(500).json({
        message: 'Error de configuración del servidor'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });

  } catch (error) {
    console.error('LOGIN ERROR REAL:', error);
    res.status(500).json({
      message: 'Error al iniciar sesión'
    });
  }
};
