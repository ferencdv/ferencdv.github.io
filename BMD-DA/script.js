var map = L.map('map').setView([36.6002, -121.8947], 6);

var oviforms = []; // Array to hold all oviform objects
var selectedOviform = null; // Track the currently selected oviform

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

function calculateOviformPoints(RFE, RBE, RSE) {
    const L = 2 * RFE;   // Total length of the oviform curve
    const B = RBE;       // Breadth of the oviform curve
    const w = RSE;       // Width parameter of the oviform curve
    let points = [];     // Array to store the points of the curve
    
    for (let x = -L / 2; x <= L / 2; x += 0.01) {
        let y = (B / 2) * Math.sqrt((L ** 2 - 4 * x ** 2) / (L ** 2 + 8 * w * x + 4 * w ** 2));
        points.push([x, y]);
    }

    for (let x = L / 2; x >= -L / 2; x -= 0.01) {
        let y = (B / 2) * Math.sqrt((L ** 2 - 4 * x ** 2) / (L ** 2 + 8 * w * x + 4 * w ** 2));
        points.push([x, -y]);
    }

    return points;
}

function addOviform(RFE, RBE, RSE) {
    let latlngPoints = calculateOviformPoints(RFE, RBE, RSE).map(point => {
        return [map.getCenter().lat + (point[1] / 111), map.getCenter().lng + (point[0] / 111)];
    });

    var oviform = L.polygon(latlngPoints, {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.2,
    }).addTo(map);

    oviforms.push(oviform);
    makeDraggable(oviform);
    addDeleteCapability(oviform);
    addRotationHandle(oviform); // Add a rotation handle for the new oviform
}




function makeDraggable(oviform) {
    var lastPos;
    oviform.on('mousedown', function (e) {
        lastPos = map.mouseEventToLatLng(e.originalEvent);
        map.dragging.disable();
    });

    map.on('mousemove', function (e) {
        if (lastPos) {
            var newPos = map.mouseEventToLatLng(e.originalEvent);
            var latDiff = newPos.lat - lastPos.lat;
            var lngDiff = newPos.lng - lastPos.lng;

            // Update oviform position
            oviform.setLatLngs(oviform.getLatLngs().map(polygon => polygon.map(point => {
                return [point.lat + latDiff, point.lng + lngDiff];
            })));

            // Update rotation handle position if the oviform has one
            if (oviform.rotationHandle) {
                var handlePos = oviform.rotationHandle.getLatLng();
                var newHandlePos = new L.LatLng(handlePos.lat + latDiff, handlePos.lng + lngDiff);
                oviform.rotationHandle.setLatLng(newHandlePos);
            }

            lastPos = newPos;
        }
    });

    map.on('mouseup', function (e) {
        lastPos = null;
        map.dragging.enable();
    });
}
function rotateOviform(oviform, handlePosition) {
    var oviformCenter = oviform.getBounds().getCenter();
    var currentAngle = Math.atan2(handlePosition.lat - oviformCenter.lat, handlePosition.lng - oviformCenter.lng);

    if (typeof window.lastAngle === 'undefined') {
        window.lastAngle = currentAngle;
    }

    var angleDifference = currentAngle - window.lastAngle;

    // Correctly rotate each point around the oviform's center
    var newLatLngs = oviform.getLatLngs()[0].map(latlng => {
        return rotatePoint(oviformCenter, latlng, angleDifference);
    });

    oviform.setLatLngs([newLatLngs]);
    window.lastAngle = currentAngle; // Update for the next rotation
}


function addRotationHandle(oviform) {
    var oviformBounds = oviform.getBounds();
    var oviformCenter = oviformBounds.getCenter();
    // Position the handle to the north of the oviform center by a fixed distance
    var handleDistance = 0.005; // Adjust based on your map's scale
    var handlePosition = { lat: oviformCenter.lat + handleDistance, lng: oviformCenter.lng };

    var rotationHandleIcon = L.divIcon({
        className: 'rotation-handle-icon',
        html: '<div style="background-color: #ff0000; width: 8px; height: 8px; border-radius: 50%;"></div>',
        iconAnchor: [4, 4], // Center the icon
    });

    var rotationHandle = L.marker(handlePosition, {
        icon: rotationHandleIcon,
        draggable: true,
    }).addTo(map);
    oviform.rotationHandle = rotationHandle;

    // Step 3: Implement the rotation logic
    // Step 3: Modified rotation logic to make the rotation slower
    rotationHandle.on('drag', function(e) {
        var newHandlePos = e.target.getLatLng();
        var oviformCenter = oviform.getBounds().getCenter();

        var newAngle = Math.atan2(newHandlePos.lat - oviformCenter.lat, newHandlePos.lng - oviformCenter.lng);
        if (typeof window.lastAngle === 'undefined') {
            window.lastAngle = newAngle;
        }

        // Calculate the angle difference and apply a scaling factor to slow down the rotation
        var angleDifference = newAngle - window.lastAngle;
        var rotationSensitivity = 1; // Lower this value to make rotation slower
        var scaledAngleDifference = angleDifference * rotationSensitivity;

        // Rotate the oviform by the scaled angle difference
        var newLatLngs = oviform.getLatLngs()[0].map(function(latlng) {
            return rotatePoint(oviformCenter, latlng, scaledAngleDifference);
        });
        oviform.setLatLngs([newLatLngs]);

        // Optionally, update the rotation handle's position if needed
        // This step might not be necessary if the handle should stay at a fixed distance from the oviform center
        // and the visual feedback of the handle's movement is not required to be proportional to the drag distance

        // Update window.lastAngle for the next calculation
        window.lastAngle = newAngle;
    });
}


// Utility function to rotate a point around a center by a given angle
function rotatePoint(center, point, angle) {
    var cosAngle = Math.cos(angle);
    var sinAngle = Math.sin(angle);

    // Translate point to origin (center of rotation)
    var dx = point.lng - center.lng;
    var dy = point.lat - center.lat;

    // Apply rotation
    var rotatedLng = cosAngle * dx - sinAngle * dy + center.lng;
    var rotatedLat = sinAngle * dx + cosAngle * dy + center.lat;

    return new L.LatLng(rotatedLat, rotatedLng);
}

function addDeleteCapability(oviform) {
    oviform.on('click', function () {
        if (selectedOviform) { // Deselect previous if any
            selectedOviform.setStyle({ color: 'red' });
        }
        selectedOviform = oviform; // Set new selected oviform
        selectedOviform.setStyle({ color: 'blue' }); // Highlight selected oviform
    });
}

// Listening for the "Delete" key press to remove selected Oviform
// ... (previous code)

// Listening for the "Delete" key press to remove selected Oviform
document.addEventListener('keydown', function (event) {
    if (event.key === "Delete" && selectedOviform) {
        // Check if the selected oviform has an associated rotation handle
        if (selectedOviform.rotationHandle) {
            // Remove the rotation handle from the map
            map.removeLayer(selectedOviform.rotationHandle);
            // Clear the reference to the handle from the oviform
            selectedOviform.rotationHandle = null;
        }

        // Remove the selected oviform from the map
        map.removeLayer(selectedOviform);

        // Update the array of oviforms to exclude the deleted oviform
        oviforms = oviforms.filter(function(o) {
            return o !== selectedOviform;
        });

        // Reset the selected oviform to null
        selectedOviform = null;
    }
});

// ... (remaining code)



function placeOviform() {
    var RFE = parseFloat(document.getElementById('R_FE').value);
    var RBE = parseFloat(document.getElementById('R_BE').value);
    var RSE = parseFloat(document.getElementById('R_SE').value);

    if (!isNaN(RFE) && !isNaN(RBE) && !isNaN(RSE)) {
        addOviform(RFE, RBE, RSE);
    } else {
        alert("Please enter valid numbers for R_FE, R_BE, and R_SE.");
    }
}

function clearOviforms() {
    oviforms.forEach(function(oviform) {
        map.removeLayer(oviform);
    });
    oviforms = [];
}
