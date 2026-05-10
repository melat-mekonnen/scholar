const axios = require('axios');

axios.post('http://127.0.0.1:4000/api/auth/login', {
  email: 'admin@ethioscholar.com',
  password: 'admin@123',
}, { validateStatus: () => true })
  .then(({ data, status, headers }) => {
    console.log(status);
    console.log(JSON.stringify(data, null, 2));
    console.log(headers['set-cookie']);
  })
  .catch((err) => {
    console.error(err.toString());
    if (err.response) console.error(JSON.stringify(err.response.data, null, 2));
  });
