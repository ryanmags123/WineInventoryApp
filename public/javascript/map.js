// Tracks if we are editing an existing winery ID
    let currentEditId = null;
    let loadedWineries = [];

    // Minimize / Expand Form Toggle Logic
    const toggleBtn = document.getElementById('toggle-btn');
    const formContent = document.getElementById('form-content');
    const panel = document.getElementById('add-winery-panel');

    toggleBtn.addEventListener('click', function () {
      formContent.classList.toggle('minimized');
      panel.classList.toggle('panel-minimized');
      toggleBtn.textContent = formContent.classList.contains('minimized') ? '+' : '−';
    });

    // Initialize Leaflet Map
    const map = L.map('map').setView([38.5, -122.5], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Helper: Plot Single Winery Marker with Edit Button
    function addWineryToMap(winery) {
      const isVisited = String(winery.visited).toLowerCase() === 'yes';
      const iconColor = isVisited ? 'blue' : 'red';

      const wineIcon = L.divIcon({
        html: `<i class="fa-solid fa-wine-glass" style="color: ${iconColor}; font-size: 24px;"></i>`,
        className: 'wine-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });

      const longitude = winery.lng !== undefined ? winery.lng : winery.long;

      if (winery.lat && longitude) {
        const marker = L.marker([parseFloat(winery.lat), parseFloat(longitude)], { icon: wineIcon })
          .addTo(map)
          .bindPopup(`
            <strong>${winery.name}</strong><br>
            <strong>${winery.location || ''}</strong><br>
            <span style="color: #800080; font-weight: bold; font-size: 1.1em;">${winery.ava || ''}</span><br><br>
            <strong>Visited:</strong> ${isVisited ? 'Yes' : 'No'}<br><br>
            <strong>Grapes:</strong> ${winery.grapes || ''}<br><br>
            <button onclick="populateEditForm(${winery.id})" style="background:#7b2cbf; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">
              <i class="fa-solid fa-pen"></i> Edit Winery
            </button>
            <button onclick="deleteWinery(${winery.id})" style="background:#c0392b; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; margin-left:4px;">
              <i class="fa-solid fa-trash"></i> Delete Winery
            </button>
          `);
      }
    }


    // Delete Winery
    window.deleteWinery = async function(id) {
      const winery = loadedWineries.find(w => w.id === id);
      if (!winery) return;

      const confirmed = confirm(`Are you sure you want to delete "${winery.name}"?`);
      if (!confirmed) return;

      try {
        const response = await fetch(`/api/wineries/${id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete winery');
        }

        await fetchWineriesFromDB();

        if (currentEditId === id) {
          resetFormState();
        }

        alert('Winery deleted successfully!');
      } catch (err) {
        console.error('Delete error:', err);
        alert('Error deleting winery from database.');
      }
    };

    // Populate Form for Editing
    window.populateEditForm = function(id) {
      const winery = loadedWineries.find(w => w.id === id);
      if (!winery) return;

      currentEditId = id;
      document.getElementById('winery-name').value = winery.name || '';
      document.getElementById('winery-location').value = winery.location || '';
      document.getElementById('winery-ava').value = winery.ava || '';
      document.getElementById('winery-grapes').value = winery.grapes || '';
      document.getElementById('winery-lat').value = parseFloat(winery.lat).toFixed(6);
      document.getElementById('winery-long').value = parseFloat(winery.lng !== undefined ? winery.lng : winery.long).toFixed(6);
      document.getElementById('winery-visited').value = String(winery.visited).toLowerCase();

      // Change button label and panel header
      document.querySelector('#add-winery-panel h4').textContent = 'Edit Winery';
      document.querySelector('#winery-form button[type="submit"]').textContent = 'Update Winery';

      // Reopen panel if closed
      if (formContent.classList.contains('minimized')) {
        formContent.classList.remove('minimized');
        panel.classList.remove('panel-minimized');
        toggleBtn.textContent = '−';
      }
    };

    // Reset Form back to Add mode
    function resetFormState() {
      currentEditId = null;
      document.getElementById('winery-form').reset();
      document.querySelector('#add-winery-panel h4').textContent = 'Add Winery';
      document.querySelector('#winery-form button[type="submit"]').textContent = 'Save Winery';
    }

    // Fetch Wineries from Database
    async function fetchWineriesFromDB() {
      try {
        const response = await fetch('/api/wineries');
        if (!response.ok) throw new Error('Failed to fetch wineries');

        loadedWineries = await response.json();
        
        // Clear old markers if reloading
        map.eachLayer(layer => {
          if (layer instanceof L.Marker) map.removeLayer(layer);
        });

        loadedWineries.forEach(winery => addWineryToMap(winery));
      } catch (err) {
        console.error('Error fetching wineries:', err);
      }
    }
    fetchWineriesFromDB();

    // Map Click Handler
    map.on('click', function (e) {
      document.getElementById('winery-lat').value = e.latlng.lat.toFixed(6);
      document.getElementById('winery-long').value = e.latlng.lng.toFixed(6);

      if (formContent.classList.contains('minimized')) {
        formContent.classList.remove('minimized');
        panel.classList.remove('panel-minimized');
        toggleBtn.textContent = '−';
      }
    });

    // Unified Form Submit (Handles both CREATE and UPDATE)
    document.getElementById('winery-form').addEventListener('submit', async function (e) {
      e.preventDefault();

      const wineryData = {
        name: document.getElementById('winery-name').value.trim(),
        location: document.getElementById('winery-location').value.trim(),
        ava: document.getElementById('winery-ava').value.trim(),
        grapes: document.getElementById('winery-grapes').value.trim(),
        lat: parseFloat(document.getElementById('winery-lat').value),
        lng: parseFloat(document.getElementById('winery-long').value),
        visited: document.getElementById('winery-visited').value
      };

      const isEditing = currentEditId !== null;
      const endpoint = isEditing ? `/api/wineries/${currentEditId}` : '/api/wineries';
      const method = isEditing ? 'PUT' : 'POST';

      try {
        const response = await fetch(endpoint, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(wineryData)
        });

        if (!response.ok) throw new Error('Failed to save winery');

        await fetchWineriesFromDB(); // Refresh map with updated dataset
        resetFormState();
        alert(isEditing ? 'Winery updated successfully!' : 'Winery added successfully!');
      } catch (err) {
        console.error('Save error:', err);
        alert('Error saving changes to database.');
      }
    });