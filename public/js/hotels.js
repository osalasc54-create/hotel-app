// =======================
// 🔐 Decodificar JWT
// =======================
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

// =======================
// 🔒 Proteger página
// =======================
const token = localStorage.getItem('token');

if (!token) {
  window.location.href = 'login.html';
}

const user = parseJwt(token);

// =======================
// 🚪 Logout
// =======================
document.getElementById('logout').addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
});

// =======================
// 👑 Botón Crear Hotel SOLO ADMIN
// =======================
if (user.role === 'admin') {
  const createBtn = document.createElement('button');
  createBtn.textContent = 'Crear Hotel';
  createBtn.className = 'create-hotel-btn';
  createBtn.style.margin = '20px';
  createBtn.style.padding = '10px 15px';
  createBtn.style.background = '#4f46e5';
  createBtn.style.color = 'white';
  createBtn.style.border = 'none';
  createBtn.style.borderRadius = '6px';
  createBtn.style.cursor = 'pointer';

  document.body.prepend(createBtn);

  createBtn.addEventListener('click', showCreateForm);
}

// =======================
// 🏨 Cargar hoteles
// =======================
async function loadHotels() {
  const res = await fetch('/api/hotels');
  const hotels = await res.json();

  const container = document.getElementById('hotelList');
  container.innerHTML = '';

  if (!hotels.length) {
    container.innerHTML = '<p>No hay hoteles disponibles</p>';
    return;
  }

  hotels.forEach(hotel => {
    container.innerHTML += `
      <div class="hotel-card">
        <img 
          src="${hotel.image_url || 'https://picsum.photos/400/300?random=' + hotel.id}"
          onerror="this.src='https://picsum.photos/400/300?random=${hotel.id}'"
        >
        <div class="hotel-info">
          <h3>${hotel.name}</h3>
          <p>${hotel.location}</p>
          <span>$${hotel.price} / noche</span>

          <button class="reserve-btn" onclick="reserveHotel(${hotel.id}, '${hotel.name}')">
            Reservar
          </button>
        </div>
      </div>
    `;
  });
}

// =======================
// 📅 Reservar hotel
// =======================
async function reserveHotel(hotelId, hotelName) {
  const startDate = prompt(`Fecha de entrada para ${hotelName} (YYYY-MM-DD)`);
  if (!startDate) return;

  const endDate = prompt(`Fecha de salida para ${hotelName} (YYYY-MM-DD)`);
  if (!endDate) return;

  try {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        hotel_id: hotelId,
        start_date: startDate,
        end_date: endDate
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'Error al reservar');
      return;
    }

    alert('✅ Reserva confirmada');

  } catch (error) {
    alert('Error de conexión');
  }
}

// =======================
// 🏗️ Modal Crear Hotel
// =======================
function showCreateForm() {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div style="
      position:fixed;
      top:0;
      left:0;
      width:100%;
      height:100%;
      background:rgba(0,0,0,0.6);
      display:flex;
      justify-content:center;
      align-items:center;
      z-index:1000;
    ">
      <div style="
        background:white;
        padding:25px;
        border-radius:10px;
        width:320px;
      ">
        <h3>Crear Hotel</h3>
        <input id="hotelName" placeholder="Nombre" style="width:100%; margin-bottom:10px;" />
        <input id="hotelLocation" placeholder="Ubicación" style="width:100%; margin-bottom:10px;" />
        <input id="hotelPrice" type="number" placeholder="Precio" style="width:100%; margin-bottom:10px;" />
        
        <button id="saveHotel" style="margin-right:10px;">Guardar</button>
        <button id="closeModal">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('closeModal').onclick = () => modal.remove();

  document.getElementById('saveHotel').onclick = async () => {
    const name = document.getElementById('hotelName').value;
    const locationValue = document.getElementById('hotelLocation').value;
    const price = document.getElementById('hotelPrice').value;

    if (!name || !locationValue || !price) {
      alert('Completa todos los campos');
      return;
    }

    try {
      const res = await fetch('/api/hotels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ name, location: locationValue, price })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'No autorizado');
        return;
      }

      alert('Hotel creado correctamente');
      modal.remove();
      loadHotels();

    } catch (error) {
      alert('Error creando hotel');
    }
  };
}

// =======================
// 🚀 Inicializar
// =======================
loadHotels();