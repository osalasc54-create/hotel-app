const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Error al iniciar sesión');
        return;
      }

      // guardar token
      localStorage.setItem('token', data.token);
      const decoded = JSON.parse(atob(data.token.split('.')[1]));

      localStorage.setItem('role', decoded.role);

      // redirigir
      window.location.href = 'index.html';

    } catch (error) {
      alert('Error de conexión con el servidor');
    }
  });
}
