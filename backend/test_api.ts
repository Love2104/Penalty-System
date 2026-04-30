async function test() {
  try {
    console.log('Testing /api/health...');
    let res = await fetch('http://localhost:5000/api/health');
    let data = await res.json();
    console.log('Health:', data);

    console.log('Testing /api/auth/login...');
    res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lovechourasia04@gmail.com' })
    });
    data = await res.json();
    console.log('Login Response:', data);

    console.log('Testing /api/students/search (without auth)...');
    res = await fetch('http://localhost:5000/api/students/search?limit=1');
    data = await res.json();
    console.log('Search response without auth:', data);

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

test();
