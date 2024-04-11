var map = L.map('map').setView([51.505, -0.09], 13);
var circles = []; // Array to hold all circle objects

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Function to add a circle to the map
function addCircle(lat, lng, radius) {
    var circle = L.circle([lat, lng], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.2, // Very light shade
        radius: radius * 1000 // Convert km to meters
    }).addTo(map).on('click', selectCircle);

    circle.draggable = new L.Draggable(circle._path);
    circle.draggable.enable();

    circles.push(circle);
}

// Select a circle to move or delete
var selectedCircle;
function selectCircle(e) {
    if (selectedCircle) {
        selectedCircle.setStyle({ fillColor: '#f03' }); // Deselect previous circle
    }
    selectedCircle = e.target;
    selectedCircle.setStyle({ fillColor: '#00f' }); // Highlight selected circle
    L.DomEvent.stopPropagation(e); // Stop the map click event
}

// Attach a click event to the map to place a circle
map.on('click', function(e) {
    var radius = document.getElementById('radius').value;
    addCircle(e.latlng.lat, e.latlng.lng, radius);
});

function placeCircle() {
    var radius = document.getElementById('radius').value;
    var center = map.getCenter();
    addCircle(center.lat, center.lng, radius);
}

// Clear all circles from the map
function clearCircles() {
    circles.forEach(function(circle) {
        map.removeLayer(circle);
    });
    circles = []; // Clear the array
}

// Delete selected circle with the Delete key
document.addEventListener('keydown', function(event) {
    if (event.key === "Delete" && selectedCircle) {
        map.removeLayer(selectedCircle);
        circles = circles.filter(function(circle) {
            return circle !== selectedCircle;
        });
        selectedCircle = undefined;
    }
});
