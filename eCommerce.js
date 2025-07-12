let user = null;
let charts = { salesChart: null };

function getUserData() {
  const key = user.username + '_data';
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : { products: [] };
}

function saveUserData(data) {
  const key = user.username + '_data';
  localStorage.setItem(key, JSON.stringify(data));
}

function login() {
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!username || !password) {
    alert('Please fill all fields');
    return;
  }

  const storedUserRaw = localStorage.getItem(username);
  if (storedUserRaw) {
    const storedUser = JSON.parse(storedUserRaw);
    if (storedUser.password !== password) {
      alert('Wrong password!');
      return;
    }
    user = storedUser;
  } else {
    user = { username, password };
    localStorage.setItem(username, JSON.stringify(user));
  }

  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  showTab('home');
  renderHomePage();
}

function logout() {
  user = null;
  location.reload();
}

function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(div => div.classList.add('hidden'));
  document.getElementById(tab).classList.remove('hidden');
  document.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('tab-active'));
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('tab-active');
}

function renderHomePage() {
  const home = document.getElementById('home');
  home.innerHTML = `
    <h2 class="text-xl font-semibold mb-2">Welcome, ${user.username}!</h2>
    <p>This is your home page. Track your progress in the Dashboard tab.</p>
  `;
}

function renderDashboard() {
  const dashboard = document.getElementById('dashboard');
  dashboard.innerHTML = `
    <h2 class="text-xl font-semibold mb-4">Dashboard</h2>

    <form id="product-form" class="mb-6 space-y-4 bg-[#2d3236] p-4 rounded">
      <h3 class="text-lg font-bold mb-2 text-white">Add Product</h3>
      <input type="text" id="product-name" placeholder="Product Name" required class="w-full p-2 rounded bg-[#181a1b] border border-gray-600 text-gray-200" />
      <input type="text" id="product-category" placeholder="Category" required class="w-full p-2 rounded bg-[#181a1b] border border-gray-600 text-gray-200" />
      <input type="number" id="product-price" placeholder="Price" required min="0" step="0.01" class="w-full p-2 rounded bg-[#181a1b] border border-gray-600 text-gray-200" />
      <input type="number" id="product-quantity" placeholder="Quantity" required min="0" class="w-full p-2 rounded bg-[#181a1b] border border-gray-600 text-gray-200" />
      <input type="number" id="product-discount" placeholder="Discount (0–1)" min="0" max="1" step="0.01" class="w-full p-2 rounded bg-[#181a1b] border border-gray-600 text-gray-200" />
      <input type="number" id="product-handling" placeholder="Handling (0–1)" min="0" max="1" step="0.01" class="w-full p-2 rounded bg-[#181a1b] border border-gray-600 text-gray-200" />
      <input type="number" id="product-seasonality" placeholder="Seasonality Multiplier (e.g. 1.0)" min="0" step="0.01" class="w-full p-2 rounded bg-[#181a1b] border border-gray-600 text-gray-200" />
      <textarea id="product-description" placeholder="Description (optional)" rows="2" class="w-full p-2 rounded bg-[#181a1b] border border-gray-600 text-gray-200"></textarea>
      <button type="submit" class="btn bg-blue-600 text-white px-4 py-2 rounded">Add Product</button>
    </form>

    <div id="product-list" class="space-y-2 mb-6"></div>

    <div id="assessment" class="mt-6 bg-[#23272a] p-4 rounded hidden">
      <h3 class="text-lg font-bold mb-2 text-white">Assessment</h3>
      <pre id="assessment-text" class="whitespace-pre-wrap text-gray-200"></pre>
    </div>

    <div id="e-total" class="mt-4 p-4 bg-[#2d3236] rounded">
      <h3 class="text-lg font-bold mb-1 text-white">Total Adjusted Value (E_total)</h3>
      <p id="e-total-value" class="text-2xl font-semibold text-green-400">$0.00</p>
    </div>

    <canvas id="salesChart" class="w-full max-w-3xl mt-6"></canvas>
  `;

  document.getElementById('product-form').onsubmit = (e) => {
    e.preventDefault();
    addProduct();
  };

  renderProductList();
  generateAssessment();
  renderChart();
  updateETotalDisplay();
}

function addProduct() {
  const name = document.getElementById('product-name').value.trim();
  const category = document.getElementById('product-category').value.trim();
  const price = parseFloat(document.getElementById('product-price').value);
  const quantity = parseInt(document.getElementById('product-quantity').value);
  const description = document.getElementById('product-description').value.trim();
  const discount = parseFloat(document.getElementById('product-discount').value) || 0;
  const handling = parseFloat(document.getElementById('product-handling').value) || 0;
  const seasonality = parseFloat(document.getElementById('product-seasonality').value) || 1;

  if (!name || !category || isNaN(price) || isNaN(quantity)) {
    alert('Please fill all required fields correctly.');
    return;
  }

  const data = getUserData();
  data.products.push({ name, category, price, quantity, description, discount, handling, seasonality });
  saveUserData(data);

  document.getElementById('product-form').reset();
  renderProductList();
  generateAssessment();
  renderChart();
  updateETotalDisplay();
}

function renderProductList() {
  const data = getUserData();
  const list = document.getElementById('product-list');

  if (data.products.length === 0) {
    list.innerHTML = '<p>No products added yet.</p>';
    return;
  }

  list.innerHTML = data.products.map((p, i) => `
    <div class="p-2 bg-[#181a1b] rounded flex justify-between items-center">
      <div>
        <strong class="text-white">${p.name}</strong> (${p.category}) - $${p.price.toFixed(2)} x ${p.quantity}<br/>
        <small class="text-gray-400">Discount: ${p.discount ?? 0}, Handling: ${p.handling ?? 0}, Seasonality: ${p.seasonality ?? 1}</small>
        <p class="text-sm text-gray-400">${p.description || ''}</p>
      </div>
      <button onclick="removeProduct(${i})" class="btn bg-red-600 px-2 py-1 rounded">Remove</button>
    </div>
  `).join('');
}

function removeProduct(index) {
  const data = getUserData();
  data.products.splice(index, 1);
  saveUserData(data);
  renderProductList();
  generateAssessment();
  renderChart();
  updateETotalDisplay();
}

function calculateTotalE() {
  const data = getUserData();
  return data.products.reduce((sum, p) => {
    const D = p.discount || 0;
    const H = p.handling || 0;
    const S = p.seasonality || 1;
    return sum + (p.price * p.quantity * (1 - D) * (1 + H) * S);
  }, 0).toFixed(2);
}

function updateETotalDisplay() {
  const total = calculateTotalE();
  document.getElementById('e-total-value').textContent = `$${total}`;
}

async function generateAssessment() {
  const data = getUserData();

  if (data.products.length === 0) {
    document.getElementById('assessment').classList.add('hidden');
    return;
  }

  document.getElementById('assessment-text').textContent = 'Generating assessment...';
  document.getElementById('assessment').classList.remove('hidden');

  try {
    // Use OpenAI API to generate assessment
    const prompt = `Give business advice based on (don't just repeat stats):\n\n${JSON.stringify(data.products, null, 2)}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer YOUR API KEY HERE`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', 
        messages: [
          { role: 'system', content: 'You are an ecommerce expert assistant with a PhD in business and digital marketing from Wharton (Upenn).' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.1,
      })
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

    const result = await response.json();
    const assessment = result.choices[0].message.content.trim();

    document.getElementById('assessment-text').textContent = assessment;

  } catch (error) {
    document.getElementById('assessment-text').textContent = 'Failed to generate assessment.';
    console.error(error);
  }
}


function renderChart() {
  const data = getUserData();
  const ctx = document.getElementById('salesChart').getContext('2d');

  const labels = data.products.map(p => p.name);
  const values = data.products.map(p => p.price * p.quantity);

  if (charts.salesChart) {
    charts.salesChart.destroy();
  }

  charts.salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Inventory Value ($)',
        data: values,
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { labels: { color: '#cbd5e1' } }
      }
    }
  });
}

// Initialize auth screen on page load
document.addEventListener('DOMContentLoaded', () => {
  // No user logged in yet, just show login screen
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('main-app').classList.add('hidden');
});
