const loginForm = document.getElementById('loginForm');

/* =========================
   LOGIN NORMAL
========================= */

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Credenciales incorrectas');
        return;
      }

      localStorage.setItem('token', data.token);
      window.location.href = 'index.html';

    } catch (error) {
      alert('Error de conexión');
    }
  });
}

/* =========================
   GOOGLE LOGIN (IMPORTANTE)
========================= */

window.handleCredentialResponse = function (response) {
  fetch('/api/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      credential: response.credential
    })
  })
  .then(res => res.json())
  .then(data => {
    if (!data.token) {
      alert(data.message || 'Error al autenticar con Google');
      return;
    }

    localStorage.setItem('token', data.token);
    window.location.href = 'index.html';
  })
  .catch(err => {
    console.error(err);
    alert('Error al conectar con el servidor');
  });
};