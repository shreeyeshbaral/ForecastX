const canvas = document.getElementById('weather-canvas');
const ctx = canvas.getContext('2d');
const apiKey = '8677f5ce7a23e35ca4107d4b10b414c6';
let particles = [];
let animationFrame;

// 1. Setup
function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', initCanvas);
initCanvas();

// 2. Data Fetching
document.getElementById('searchBtn').addEventListener('click', () => {
    const city = document.getElementById('cityInput').value;
    if(city) fetchWeather(city);
});

async function fetchWeather(city) {
    try {
        const geo = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`).then(r => r.json());
        if(!geo.length) return alert("City not found");
        const { lat, lon, name, country } = geo[0];

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto`;
        const res = await fetch(weatherUrl).then(r => r.json());
        updateUI(res, `${name}, ${country}`);
    } catch (e) { console.error(e); }
}

function updateUI(data, label) {
    const { current, daily } = data;
    const weather = interpretWMO(current.weather_code);
    
    document.getElementById('cityName').innerText = label;
    document.getElementById('mainTemp').innerText = `${Math.round(current.temperature_2m)}°`;
    document.getElementById('maxTemp').innerText = Math.round(daily.temperature_2m_max[0]);
    document.getElementById('minTemp').innerText = Math.round(daily.temperature_2m_min[0]);
    document.getElementById('weatherDesc').innerText = weather.desc;
    document.getElementById('mainIcon').innerText = weather.emoji;
    document.getElementById('humidity').innerText = `${current.relative_humidity_2m}%`;
    document.getElementById('pressure').innerText = current.surface_pressure;
    document.getElementById('rainChance').innerText = `${daily.precipitation_probability_max[0]}%`;
    document.getElementById('windSpeed').innerText = current.wind_speed_10m;
    document.getElementById('windNeedle').style.transform = `translateX(-50%) rotate(${current.wind_direction_10m}deg)`;
    document.getElementById('uvValue').innerText = daily.uv_index_max[0];
    document.getElementById('uvPointer').style.left = `${(daily.uv_index_max[0]/12)*100}%`;
    document.getElementById('sunrise').innerText = new Date(daily.sunrise[0]).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    document.getElementById('sunset').innerText = new Date(daily.sunset[0]).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

    // Background & Animation Logic
    let mode = weather.type.toLowerCase();
    if(current.is_day === 0 && (mode === 'sunny' || mode === 'cloudy')) mode = 'stars';
    
    
    const body = document.body;
    
    // Reset classes
    body.className = ''; 
    body.classList.remove('sunny-text-mode');

    // 1. Set Background Image Class
    body.classList.add(current.is_day === 0 ? 'weather-night' : `weather-${mode === 'stars' ? 'sunny' : mode}`);
    if(mode === 'storm') body.classList.add('weather-storm');

    // 2. CONDITION: IF Sunny (Code 0) and Day (1), turn text BLACK
    if (current.weather_code === 0 && current.is_day === 1) {
        body.classList.add('sunny-text-mode');
    }
   

    initParticles(mode);
    renderForecast(daily);
}

// 3. Animation Engine
function initParticles(mode) {
    particles = []; 
    const count = (mode === 'stars' || mode === 'sunny') ? 120 : 100;
    
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
           
            speed: mode === 'rain' ? (10 + Math.random() * 5) : 
                   mode === 'snow' ? (0.5 + Math.random() * 0.5) : 
                   mode === 'storm' ? (15 + Math.random() * 10) : 0,
            size: mode === 'rain' ? 2 : (mode === 'stars' ? Math.random() * 2 : 4),
            opacity: Math.random(),
            mode: mode
        });
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(p => {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.beginPath();
        
        if (p.mode === 'rain' || p.mode === 'storm') {
            ctx.rect(p.x, p.y, 1, 20); 
            p.y += p.speed;
        } 
        else if (p.mode === 'snow') {
            ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
            p.y += p.speed; 
            p.x += Math.sin(Date.now() * 0.001 + p.y * 0.01) * 0.5; 
        } 
        else if (p.mode === 'stars') {
            ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
            p.opacity = 0.2 + Math.abs(Math.sin(Date.now() * 0.001 + p.x));
        }
        else if (p.mode === 'sunny') {
            ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
            p.y -= 0.3; 
        }

        ctx.fill();

        if (p.y > canvas.height) {
            p.y = -20;
            p.x = Math.random() * canvas.width;
        }
        if (p.y < -50 && p.mode === 'sunny') {
            p.y = canvas.height + 20;
        }
    });

    requestAnimationFrame(animate);
}

function triggerLightning() {
    const flash = document.getElementById('lightning-flash');
    flash.style.opacity = '0.4';
    setTimeout(() => flash.style.opacity = '0', 50);
}

// 4. Forecast Grid
function renderForecast(daily) {
    const grid = document.getElementById('forecastGrid');
    grid.innerHTML = '';
    for(let i=0; i<5; i++) {
        const date = new Date(daily.time[i]).toLocaleDateString('en', {weekday: 'short'});
        const w = interpretWMO(daily.weather_code[i]);
        grid.innerHTML += `
            <div class="forecast-card p-3 text-center flex-fill">
                <div class="small mb-1">${date}</div>
                <div class="fs-2 my-1">${w.emoji}</div>
                <div class="fw-bold">${Math.round(daily.temperature_2m_max[i])}°</div>
                <div class="small">UV ${Math.round(daily.uv_index_max[i])}</div>
            </div>`;
    }
}

function interpretWMO(code) {
    if (code === 0) return { desc: 'Clear Skies', type: 'Sunny', emoji: '☀️' };
    if (code <= 3) return { desc: 'Partly Cloudy', type: 'Cloudy', emoji: '🌤️' };
    if (code >= 51 && code <= 67) return { desc: 'Rainy', type: 'Rain', emoji: '🌧️' };
    if (code >= 71 && code <= 77) return { desc: 'Snowy', type: 'Snow', emoji: '❄️' };
    if (code >= 95) return { desc: 'Stormy', type: 'Storm', emoji: '⛈️' };
    return { desc: 'Clear', type: 'Sunny', emoji: '☀️' };
}

fetchWeather('Bhubaneswar');
animate();