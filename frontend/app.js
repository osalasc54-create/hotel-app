const API = 'http://localhost:3000';



// LOGIN
async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem('token', data.token);
    window.location.href = 'index.html';
  } else {
    document.getElementById('msg').innerText = 'Login incorrecto';
  }
}

// LISTAR HOTELES
async function loadHotels() {
  const res = await fetch(`${API}/api/hotels`);
  const hotels = await res.json();

  const list = document.getElementById('hotelList');
  if (!list) return;

  list.innerHTML = '';
  hotels.forEach(h => {
    const li = document.createElement('li');
    li.innerText = `${h.name} - ${h.location} ($${h.price})`;
    list.appendChild(li);
  });
}

// AGREGAR HOTEL
async function addHotel() {
  const token = localStorage.getItem('token');

  await fetch(`${API}/api/hotels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: name.value,
      location: location.value,
      price: price.value
    })
  });

  loadHotels();
}
async function register() {
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });

  const data = await res.json();

  if (res.ok) {
    document.getElementById('msg').innerText =
      'Cuenta creada. Ahora puedes iniciar sesión.';
  } else {
    document.getElementById('msg').innerText =
      data.message || 'Error al crear cuenta';
  }
}


loadHotels();
