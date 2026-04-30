async function test() {
  try {
    console.log('Testing /api/auth/login...');
    const res = await fetch('http://localhost:5000/api/auth/login', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lovechourasia04@gmail.com' }) 
    });
    const data = await res.json();
    console.log('Status Code:', res.status);
    console.log('Login Response:', data);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

test();
