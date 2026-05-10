async function simulate() {
  const baseUrl = 'http://localhost:5000'; 
  
  console.log("Starting traffic simulation...");

  for (let i = 0; i < 30; i++) {
    // 200 OK
    try {
      await fetch(`${baseUrl}/health`);
    } catch (e) {}

    // 404
    try {
      await fetch(`${baseUrl}/not-found-simulate-404`);
    } catch (e) {}

    // 429
    try {
      await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', body: JSON.stringify({ email: "invalid", password: "invalid" }), headers: { 'Content-Type': 'application/json' } });
    } catch (e) {}

    // AI endpoints
    try {
      await fetch(`${baseUrl}/api/recommendations/mock`);
    } catch (e) {}
  }
  
  console.log("Simulation complete!");
}

simulate();
