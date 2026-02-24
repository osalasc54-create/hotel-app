// 🔐 Mostrar panel admin si corresponde
const role = localStorage.getItem('role');

if (role === 'admin') {
  const adminPanel = document.getElementById('adminPanel');
  if (adminPanel) {
    adminPanel.style.display = 'block';
  }
}

// 🔒 proteger página
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'login.html';
}

// 🚪 logout
document.getElementById('logout').addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
});

// 🏨 cargar hoteles
async function loadHotels() {
  const res = await fetch('/api/hotels');
  const hotels = await res.json();

  const container = document.getElementById('hotelList');
  container.innerHTML = '';

  if (hotels.length === 0) {
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

// 📅 reservar hotel con fechas
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

function mostrarFormulario() {
  document.getElementById('formContainer').style.display = 'block';
}

async function crearHotel() {
  const token = localStorage.getItem('token');

  const name = document.getElementById('hotelName').value;
  const location = document.getElementById('hotelLocation').value;
  const price = document.getElementById('hotelPrice').value;

  try {
    const res = await fetch('/api/hotels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ name, location, price })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'No tienes permisos');
      return;
    }

    alert('Hotel creado correctamente');
    location.reload();

  } catch (error) {
    alert('Error creando hotel');
  }
}

// 🚀 iniciar
loadHotels();
