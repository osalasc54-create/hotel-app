console.log('register.js cargado');

const registerForm = document.getElementById('registerForm');

if (!registerForm) {
  console.error('No se encontró el formulario registerForm');
}

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log('Submit de registro detectado');

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  console.log({ name, email, password });

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    console.log('Respuesta backend:', data);

    if (!res.ok) {
      alert(data.message || 'Error al registrarse');
      return;
    }

    alert('Registrado correctamente. Ahora inicia sesión.');
    window.location.href = 'login.html';

  } catch (error) {
    console.error('Error en fetch:', error);
    alert('Error de conexión con el servidor');
  }
});
