// Leica DISTO E7500i BLE Integration

// UUIDs for Leica DISTO
const SERVICE_UUID = '3ab10100-f831-4395-b29d-570977d5bf94';
const CHARACTERISTIC_UUID = '3ab10101-f831-4395-b29d-570977d5bf94';

const connectBtn = document.getElementById('connectBtn');
const measurementDisplay = document.getElementById('measurement');
const measurementImperialDisplay = document.getElementById('measurementImperial');
const statusText = document.getElementById('statusText');

let device;
let server;
let service;
let characteristic;

async function connectDISTO() {
    try {
        updateStatus('Connecting...', false);

        // Request Bluetooth Device
        device = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'DISTO' }],
            optionalServices: [SERVICE_UUID]
        });

        device.addEventListener('gattserverdisconnected', onDisconnected);

        // Connect to GATT Server
        server = await device.gatt.connect();

        // Get Service
        service = await server.getPrimaryService(SERVICE_UUID);

        // Get Characteristic
        characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

        // Start Notifications
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handleMeasurementUpdate);

        updateStatus('Connected', true);
        connectBtn.style.display = 'none'; // Hide button after connection

    } catch (error) {
        console.error('Connection Error:', error);
        updateStatus('Connection Failed', false);
        alert('Failed to connect: ' + error.message);
    }
}

function handleMeasurementUpdate(event) {
    const dataView = event.target.value;

    // Leica DISTO sends data as 32-bit Float (Little Endian)
    if (dataView.byteLength >= 4) {
        const value = dataView.getFloat32(0, true); // true = little-endian
        updateMeasurement(value);
    } else {
        console.warn('Received data with unexpected length:', dataView.byteLength);
    }
}

function updateMeasurement(meters) {
    // 1. Update Metric Display
    measurementDisplay.innerText = meters.toFixed(3) + " m";

    // 2. Update Imperial Display
    const imperialString = convertToImperial(meters);
    measurementImperialDisplay.innerText = imperialString;
}

function convertToImperial(meters) {
    // 1 meter = 39.3700787 inches
    const totalInches = meters * 39.3700787;

    let feet = Math.floor(totalInches / 12);
    let inches = totalInches % 12;

    // Round inches to nearest 0.25
    let roundedInches = Math.round(inches * 4) / 4;

    // Handle overflow if rounding pushes inches to 12
    if (roundedInches >= 12) {
        feet += 1;
        roundedInches = 0;
    }

    // Format inches string
    let inchesStr = "";
    const wholeInches = Math.floor(roundedInches);
    const fraction = roundedInches - wholeInches;

    // Pad whole inches with leading zero if needed (e.g. 04, 09, 11)
    inchesStr += wholeInches.toString().padStart(2, '0');

    // Add fraction part if it exists
    if (fraction > 0) {
        // Remove the "0" from "0.25", "0.5", "0.75"
        inchesStr += fraction.toString().substring(1);
    }

    return `${feet}' ${inchesStr}"`;
}

function onDisconnected(event) {
    const device = event.target;
    console.log(`Device ${device.name} is disconnected.`);
    updateStatus('Disconnected', false);
    connectBtn.style.display = 'inline-flex';
    measurementDisplay.innerText = '-- m';
    measurementImperialDisplay.innerText = '--\' --"';
}

function updateStatus(text, isConnected) {
    statusText.innerText = text;
    if (isConnected) {
        statusText.classList.add('connected');
    } else {
        statusText.classList.remove('connected');
    }
}

// Attach event listener
document.addEventListener('DOMContentLoaded', () => {
    connectBtn.addEventListener('click', connectDISTO);
});
