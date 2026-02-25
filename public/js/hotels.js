//  Decodificar JWT
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
}

//  Proteger página
const token = localStorage.getItem('token');

if (!token) {
  window.location.href = 'login.html';
}

const user = parseJwt(token);

if (!user) {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

// 🚪 Logout
const logoutBtn = document.getElementById('logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  });
}

//  Botón Crear Hotel SOLO ADMIN
if (user.role === 'admin') {
  const createBtn = document.createElement('button');
  createBtn.textContent = 'Crear Hotel';
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

//  Cargar hoteles
async function loadHotels() {
  try {
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

            <div class="hotel-actions">
              <button class="reserve-btn"
                onclick="reserveHotel(${hotel.id}, '${hotel.name}')">
                Reservar
              </button>

              ${user.role === 'admin' ? `
                <button onclick="editHotel(${hotel.id}, '${hotel.name}', '${hotel.location}', ${hotel.price})">
                  Editar
                </button>

                <button onclick="deleteHotel(${hotel.id})">
                  Eliminar
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    });

  } catch (error) {
    console.error('Error cargando hoteles');
  }
}

//  Reservar hotel
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

    alert(
      `✅ Reserva confirmada\n\n` +
     `Noches: ${data.nights}\n` +
      `Precio por noche: $${data.price_per_night}\n` +
     `Total a pagar: $${data.total_price}`
      );    

  } catch (error) {
    alert('Error de conexión');
  }
}

//  Modal Crear Hotel
function showCreateForm() {

  if (document.getElementById('adminModal')) return;

  const modal = document.createElement('div');
  modal.id = 'adminModal';

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
        
        <button id="saveHotel">Guardar</button>
        <button id="closeModal">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('closeModal').onclick = () => modal.remove();

  document.getElementById('saveHotel').onclick = async () => {
    const name = document.getElementById('hotelName').value.trim();
    const location = document.getElementById('hotelLocation').value.trim();
    const price = document.getElementById('hotelPrice').value.trim();

    if (!name || !location || !price) {
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
        body: JSON.stringify({ name, location, price })
      });

      if (!res.ok) {
        alert('Error creando hotel');
        return;
      }

      alert('Hotel creado correctamente');
      modal.remove();
      loadHotels();

    } catch (error) {
      alert('Error de conexión');
    }
  };
}

// ✏️ Editar hotel
function editHotel(id, name, location, price) {

  if (document.getElementById('adminModal')) return;

  const modal = document.createElement('div');
  modal.id = 'adminModal';

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
        <h3>Editar Hotel</h3>
        <input id="editName" value="${name}" style="width:100%; margin-bottom:10px;" />
        <input id="editLocation" value="${location}" style="width:100%; margin-bottom:10px;" />
        <input id="editPrice" type="number" value="${price}" style="width:100%; margin-bottom:10px;" />
        
        <button id="updateHotel">Actualizar</button>
        <button id="closeModal">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('closeModal').onclick = () => modal.remove();

  document.getElementById('updateHotel').onclick = async () => {
    const updatedName = document.getElementById('editName').value;
    const updatedLocation = document.getElementById('editLocation').value;
    const updatedPrice = document.getElementById('editPrice').value;

    try {
      const res = await fetch('/api/hotels/' + id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          name: updatedName,
          location: updatedLocation,
          price: updatedPrice
        })
      });

      if (!res.ok) {
        alert('Error actualizando');
        return;
      }

      alert('Hotel actualizado');
      modal.remove();
      loadHotels();

    } catch (err) {
      alert('Error de conexión');
    }
  };
}

// 🗑 Eliminar hotel
async function deleteHotel(id) {

  const confirmDelete = confirm('¿Seguro que quieres eliminar este hotel?');
  if (!confirmDelete) return;

  try {
    const res = await fetch('/api/hotels/' + id, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    if (!res.ok) {
      alert('Error eliminando');
      return;
    }

    alert('Hotel eliminado');
    loadHotels();

  } catch (err) {
    alert('Error de conexión');
  }
}

//  Inicializar
loadHotels();