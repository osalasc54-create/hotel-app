const stripe = Stripe("pk_test_51T4oCQ45fAEaD6ZMLR57YlV2PfsZe1OGq0kBD5yXVkLTsOVEGavJjd98U29kJhiiF1Hd0lPuJnstTyVGV59ycJzq00wI0kfaVE"); 

// Decodificar JWT 
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

// Proteger página 
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

// Botón Crear Hotel SOLO ADMIN 
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

// Cargar hoteles 
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
        <div class="hotel-card" onclick="openHotelModal(${hotel.id}, '${hotel.name}', '${hotel.location}', ${hotel.price}, '${hotel.image_url || ''}')">
          <img src="${hotel.image_url || 'https://picsum.photos/400/300?random=' + hotel.id}">
          <div class="hotel-info">
            <h3>${hotel.name}</h3>
            <p>${hotel.location}</p>
            <span>$${hotel.price} / noche</span>
            <div class="hotel-actions">
              <button onclick="event.stopPropagation(); reserveHotel(${hotel.id}, '${hotel.name}', ${hotel.price})">Reservar</button>
              ${user.role === 'admin' ? `
                <button onclick="event.stopPropagation(); editHotel(${hotel.id}, '${hotel.name}', '${hotel.location}', ${hotel.price})">Editar</button>
                <button onclick="event.stopPropagation(); deleteHotel(${hotel.id})">Eliminar</button>
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

// 🔥 MODAL RESERVA → CON VALIDACIÓN DE FECHAS OCUPADAS Y TOTAL CORRECTO 
async function reserveHotel(hotelId, hotelName, pricePerNight) { 
  if (document.getElementById('reservationModal')) return; 
  const modal = document.createElement('div'); 
  modal.id = 'reservationModal'; 
  modal.innerHTML = `
    <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; z-index:2000;">
      <div style="background:white; padding:30px; border-radius:12px; width:400px;">
        <h2>${hotelName}</h2>
        <label>Fecha de entrada</label>
        <input type="date" id="startDate" style="width:100%; margin-bottom:10px;">
        <label>Fecha de salida</label>
        <input type="date" id="endDate" style="width:100%; margin-bottom:15px;">
        <label>Huéspedes</label>
        <input type="number" id="guests" min="1" value="1" style="width:100%; margin-bottom:10px;">
        <label>Habitaciones</label>
        <input type="number" id="rooms" min="1" value="1" style="width:100%; margin-bottom:15px;">
        <div id="reservationSummary" style="margin-bottom:15px; font-weight:bold;"></div>
        <button id="goToPayment">Proceder al pago</button>
        <button id="closeReservation">Cancelar</button>
      </div>
    </div>
  `; 
  document.body.appendChild(modal); 

  const startInput = document.getElementById('startDate'); 
  const endInput = document.getElementById('endDate'); 
  const summary = document.getElementById('reservationSummary'); 

  // 🔥 Bloquear fechas pasadas 
  const today = new Date().toISOString().split('T')[0]; 
  startInput.min = today; 
  endInput.min = today; 

  // 🔥 Obtener reservas existentes 
  const response = await fetch(`/api/reservations/hotel/${hotelId}`); 
  const reservedDates = await response.json(); 

  function isDateBlocked(start, end) { 
    return reservedDates.some(reservation => { 
      const reservedStart = new Date(reservation.start_date); 
      const reservedEnd = new Date(reservation.end_date); 
      return !(end <= reservedStart || start >= reservedEnd); 
    }); 
  } 

  function updateCalculation() {

    if (!startInput.value || !endInput.value) {
      summary.innerHTML = '';
      return;
    }

    const start = new Date(startInput.value);
    const end = new Date(endInput.value);

    if (end <= start) {
      summary.innerHTML = 'La fecha de salida debe ser posterior';
      return;
    }

    if (isDateBlocked(start, end)) {
      summary.innerHTML = 'Esas fechas ya están reservadas';
      return;
    }

    const diffTime = end - start;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const guestsInput = document.getElementById('guests');
    const roomsInput = document.getElementById('rooms');

    const guests = parseInt(guestsInput.value) || 1;
    let rooms = parseInt(roomsInput.value) || 1;

    // 🔥 Regla: máximo 2 huéspedes por habitación
    const minRoomsRequired = Math.ceil(guests / 2);

    if (rooms < minRoomsRequired) {
      rooms = minRoomsRequired;
      roomsInput.value = rooms;
    }

    const total = nights * pricePerNight * rooms;

    summary.innerHTML = `
      Noches: ${nights}<br>
      Habitaciones: ${rooms}<br>
      Huéspedes: ${guests}<br>
      Precio por noche: $${pricePerNight}<br>
      Total estimado: $${total}
    `;
  }

  startInput.addEventListener('change', updateCalculation); 
  endInput.addEventListener('change', updateCalculation); 
  document.getElementById('guests').addEventListener('change', updateCalculation);
  document.getElementById('rooms').addEventListener('change', updateCalculation);

  document.getElementById('closeReservation').onclick = () => modal.remove(); 

  document.getElementById('goToPayment').onclick = () => { 
    if (!startInput.value || !endInput.value) { 
      alert('Selecciona fechas válidas'); 
      return; 
    } 
    const start = new Date(startInput.value); 
    const end = new Date(endInput.value); 
    if (isDateBlocked(start, end)) { 
      alert('No puedes reservar fechas ocupadas'); 
      return; 
    } 
    // ✅ Cálculo del total y llamada correcta con 4 parámetros 
    const diffTime = end - start; 
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    const guests = parseInt(document.getElementById('guests').value) || 1;
    const rooms = parseInt(document.getElementById('rooms').value) || 1;

    const total = nights * pricePerNight * rooms;

    showPaymentModal(hotelId, startInput.value, endInput.value, total);
  }; 
} 

// 💳 MODAL DE PAGO 
async function showPaymentModal(hotelId, startDate, endDate, totalAmount) { 
  if (document.getElementById('paymentModal')) return; 
  const paymentModal = document.createElement('div'); 
  paymentModal.id = 'paymentModal'; 
  paymentModal.innerHTML = `
    <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:3000;">
      <div style="background:white; padding:30px; border-radius:12px; width:400px;">
        <h2>Pago Seguro</h2>
        <p>Total a pagar: <strong>$${totalAmount}</strong></p>
        <form id="payment-form">
          <div id="card-element" style="margin-bottom:15px;"></div>
          <div id="card-errors" style="color:red; margin-bottom:10px;"></div>
          <button type="submit">Pagar ahora</button>
          <button type="button" id="cancelPayment">Cancelar</button>
        </form>
      </div>
    </div>
  `; 
  document.body.appendChild(paymentModal); 

  document.getElementById('cancelPayment').onclick = () => { 
    paymentModal.remove(); 
  }; 

  // 🔥 1️⃣ Crear PaymentIntent 
  const response = await fetch('/api/payments/create-payment-intent', { 
    method: 'POST', 
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': 'Bearer ' + token 
    }, 
    body: JSON.stringify({ 
      hotel_id: hotelId, 
      start_date: startDate, 
      end_date: endDate,
      guests: parseInt(document.getElementById('guests').value) || 1,
      rooms: parseInt(document.getElementById('rooms').value) || 1
    }) 
  }); 
  const data = await response.json(); 
  if (!response.ok) { 
    alert(data.message || 'Error creando pago'); 
    paymentModal.remove(); 
    return; 
  } 
  const clientSecret = data.clientSecret; 

  // 🔥 2️⃣ Stripe Elements 
  const elements = stripe.elements(); 
  const card = elements.create("card"); 
  card.mount("#card-element"); 

  card.on('change', function(event) { 
    const displayError = document.getElementById('card-errors'); 
    if (event.error) { 
      displayError.textContent = event.error.message; 
    } else { 
      displayError.textContent = ''; 
    } 
  }); 

  // 🔥 3️⃣ Confirmar pago 
  document.getElementById('payment-form').addEventListener('submit', async function(e) { 
    e.preventDefault(); 
    const { paymentIntent, error } = await stripe.confirmCardPayment( 
      clientSecret, 
      { payment_method: { card: card } } 
    ); 

    if (error) { 
      document.getElementById('card-errors').textContent = error.message; 
      return; 
    } 

    if (paymentIntent.status === "succeeded") { 
      const reservationResponse = await fetch('/api/reservations', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': 'Bearer ' + token 
        }, 
       body: JSON.stringify({ 
          hotel_id: hotelId, 
         start_date: startDate, 
         end_date: endDate,
         guests: parseInt(document.getElementById('guests').value) || 1,
          rooms: parseInt(document.getElementById('rooms').value) || 1
        })
      }); 
      const reservationData = await reservationResponse.json(); 
      if (!reservationResponse.ok) { 
        alert(reservationData.message || 'Error creando reserva'); 
        return; 
      } 
      alert(`✅ Pago exitoso\nReserva confirmada\nTotal pagado: $${reservationData.total_price}`); 
      document.getElementById('reservationModal')?.remove(); 
      paymentModal.remove(); 
    } 
  }); 
} 

// Modal Crear Hotel 
function showCreateForm() { 
  if (document.getElementById('adminModal')) return; 
  const modal = document.createElement('div'); 
  modal.id = 'adminModal'; 
  modal.innerHTML = `
    <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; z-index:1000;">
      <div style="background:white; padding:25px; border-radius:10px; width:320px;">
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
    <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; z-index:1000;">
      <div style="background:white; padding:25px; border-radius:10px; width:320px;">
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

// =============================
// MODAL DETALLE HOTEL
// =============================
function openHotelModal(id, name, location, price, imageUrl) {
  const modal = document.getElementById('hotelModal');
  const modalBody = document.getElementById('hotelModalBody');
  const image = imageUrl && imageUrl !== 'null' 
    ? imageUrl 
    : `https://picsum.photos/900/600?random=${id}`;
  modalBody.innerHTML = `
    <img src="${image}">
    <div class="hotel-modal-info">
      <h2>${name}</h2>
      <p><strong>Ubicación:</strong> ${location}</p>
      <p><strong>Precio:</strong> $${price} por noche</p>
      <p>Disfruta de una experiencia única en este hotel exclusivo con excelente servicio y comodidad premium.</p>
      <button onclick="reserveHotel(${id}, '${name}', ${price})">Reservar ahora</button>
    </div>
  `;
  modal.style.display = 'flex';
}

// Cerrar modal
document.addEventListener('click', function(e) {
  const modal = document.getElementById('hotelModal');
  if (e.target.classList.contains('close-modal') || e.target === modal) {
    modal.style.display = 'none';
  }
});

// =============================
// VER MIS RESERVAS
// =============================

async function viewMyReservations() {
  try {
    const res = await fetch('/api/reservations/my', {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    const reservations = await res.json();

    if (!res.ok) {
      alert('Error obteniendo reservaciones');
      return;
    }

    showReservationsModal(reservations);

  } catch (error) {
    alert('Error de conexión');
  }
}

function showReservationsModal(reservations) {
  if (document.getElementById('myReservationsModal')) return;

  const modal = document.createElement('div');
  modal.id = 'myReservationsModal';

  modal.innerHTML = `
    <div style="
      position:fixed;
      top:0;
      left:0;
      width:100%;
      height:100%;
      background:rgba(0,0,0,0.7);
      display:flex;
      justify-content:center;
      align-items:center;
      z-index:6000;
    ">
      <div style="
        background:white;
        width:600px;
        max-height:80vh;
        overflow:auto;
        padding:25px;
        border-radius:12px;
      ">
        <h2>Mis Reservaciones</h2>
        <div id="reservationsList"></div>
        <button onclick="document.getElementById('myReservationsModal').remove()">
          Cerrar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const container = document.getElementById('reservationsList');

  if (!reservations.length) {
    container.innerHTML = '<p>No tienes reservaciones aún.</p>';
    return;
  }

  reservations.forEach(r => {
    const start = r.start_date.split('T')[0];
    const end = r.end_date.split('T')[0];

    container.innerHTML += `
  <div style="
    border:1px solid #eee;
    padding:12px;
    margin-bottom:12px;
    border-radius:8px;
  ">
    <strong>${r.name}</strong><br>
    Ubicación: ${r.location}<br>
    Entrada: ${start}<br>
    Salida: ${end}<br>
    Huéspedes: ${r.guests}<br>
    Habitaciones: ${r.rooms}<br>
    Total pagado: $${r.total_price}<br><br>

    <button onclick="editReservation(${r.id}, '${start}', '${end}', ${r.guests}, ${r.rooms})"
      style="
        background:#3b82f6;
        color:white;
        border:none;
        padding:6px 12px;
        border-radius:6px;
        cursor:pointer;
        margin-right:8px;
      ">
      Modificar
    </button>

    <button onclick="cancelReservation(${r.id})"
      style="
        background:#ef4444;
        color:white;
        border:none;
        padding:6px 12px;
        border-radius:6px;
        cursor:pointer;
      ">
      Cancelar reserva
    </button>
  </div>
`;
  });
}

// =============================
// CANCELAR RESERVA FRONTEND
// =============================

async function cancelReservation(reservationId) {

  const confirmCancel = confirm('¿Seguro que quieres cancelar esta reserva?');

  if (!confirmCancel) return;

  try {
    const res = await fetch('/api/reservations/' + reservationId, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'Error cancelando reserva');
      return;
    }

    alert('Reserva cancelada correctamente');

    // Cerrar modal actual
    document.getElementById('myReservationsModal')?.remove();

    // Volver a abrir actualizado
    viewMyReservations();

  } catch (error) {
    alert('Error de conexión');
  }
}

function editReservation(id, startDate, endDate, guests, rooms) {

  if (document.getElementById('editReservationModal')) return;

  const modal = document.createElement('div');
  modal.id = 'editReservationModal';

  modal.innerHTML = `
    <div style="
      position:fixed;
      top:0;
      left:0;
      width:100%;
      height:100%;
      background:rgba(0,0,0,0.7);
      display:flex;
      justify-content:center;
      align-items:center;
      z-index:7000;
    ">
      <div style="
        background:white;
        padding:25px;
        border-radius:12px;
        width:400px;
      ">
        <h3>Modificar reserva</h3>

        <label>Fecha entrada</label>
        <input type="date" id="editStart" value="${startDate}" style="width:100%; margin-bottom:10px;">

        <label>Fecha salida</label>
        <input type="date" id="editEnd" value="${endDate}" style="width:100%; margin-bottom:10px;">

        <label>Huéspedes</label>
        <input type="number" id="editGuests" value="${guests}" min="1" style="width:100%; margin-bottom:10px;">

        <label>Habitaciones</label>
        <input type="number" id="editRooms" value="${rooms}" min="1" style="width:100%; margin-bottom:15px;">

        <button onclick="updateReservationWithPayment(${id})">Continuar al pago</button>
        <button onclick="document.getElementById('editReservationModal').remove()">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
const guestsInput = document.getElementById('editGuests');
const roomsInput = document.getElementById('editRooms');

function enforceRoomRule() {
  const guests = parseInt(guestsInput.value) || 1;
  let rooms = parseInt(roomsInput.value) || 1;

  const minRoomsRequired = Math.ceil(guests / 2);

  if (rooms < minRoomsRequired) {
    rooms = minRoomsRequired;
    roomsInput.value = rooms;
  }
}

guestsInput.addEventListener('input', enforceRoomRule);
roomsInput.addEventListener('input', enforceRoomRule);

}

async function updateReservation(reservationId) {

  const startDate = document.getElementById('editStart').value;
  const endDate = document.getElementById('editEnd').value;
  const guests = parseInt(document.getElementById('editGuests').value) || 1;
  const rooms = parseInt(document.getElementById('editRooms').value) || 1;

  if (!startDate || !endDate) {
    alert('Selecciona fechas válidas');
    return;
  }

  try {

    const response = await fetch('/api/reservations/' + reservationId, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        guests,
        rooms
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || 'Error actualizando reserva');
      return;
    }

    alert('Reserva actualizada. Nuevo total: $' + data.total_price);

    document.getElementById('editReservationModal')?.remove();
    document.getElementById('myReservationsModal')?.remove();

    viewMyReservations();

  } catch (error) {
    alert('Error de conexión');
  }
}

async function updateReservationWithPayment(reservationId) {

  const startDate = document.getElementById('editStart').value;
  const endDate = document.getElementById('editEnd').value;
  const guests = parseInt(document.getElementById('editGuests').value) || 1;
  const rooms = parseInt(document.getElementById('editRooms').value) || 1;

  if (!startDate || !endDate) {
    alert('Selecciona fechas válidas');
    return;
  }

  // 1️⃣ Primero pedimos al backend que nos calcule el nuevo total (SIN guardar)
  const previewResponse = await fetch('/api/payments/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      reservation_id: reservationId,
      start_date: startDate,
      end_date: endDate,
      guests,
      rooms
    })
  });

  const data = await previewResponse.json();

  if (!previewResponse.ok) {
    alert(data.message || 'Error preparando pago');
    return;
  }

  const clientSecret = data.clientSecret;

  // 2️⃣ Mostrar Stripe
  showEditPaymentModal(clientSecret, reservationId, startDate, endDate, guests, rooms, data.total);
}

function showEditPaymentModal(clientSecret, reservationId, startDate, endDate, guests, rooms, totalAmount) {

  const modal = document.createElement('div');
  modal.id = 'editPaymentModal';

  modal.innerHTML = `
    <div style="position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:8000;">
      <div style="background:white;padding:30px;border-radius:12px;width:400px;">
        <h2>Pago adicional</h2>
        <p>Total nuevo: <strong>$${totalAmount}</strong></p>
        <form id="edit-payment-form">
          <div id="edit-card-element" style="margin-bottom:15px;"></div>
          <div id="edit-card-errors" style="color:red;margin-bottom:10px;"></div>
          <button type="submit">Pagar</button>
          <button type="button" onclick="document.getElementById('editPaymentModal').remove()">Cancelar</button>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const elements = stripe.elements();
  const card = elements.create("card");
  card.mount("#edit-card-element");

  document.getElementById('edit-payment-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const { paymentIntent, error } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: { card: card } }
    );

    if (error) {
      document.getElementById('edit-card-errors').textContent = error.message;
      return;
    }

    if (paymentIntent.status === "succeeded") {

      // 3️⃣ Ahora sí actualizamos la reserva
      await fetch('/api/reservations/' + reservationId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          guests,
          rooms
        })
      });

      alert('Reserva modificada correctamente');

      document.getElementById('editPaymentModal')?.remove();
      document.getElementById('editReservationModal')?.remove();
      document.getElementById('myReservationsModal')?.remove();

      viewMyReservations();
    }
  });
}

loadHotels();