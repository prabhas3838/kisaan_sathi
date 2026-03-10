const autocannon = require('autocannon');

const instance = autocannon({
    url: 'http://localhost:5001', // Assuming server runs here
    connections: 10, // default
    pipelining: 1, // default
    duration: 5 // default
}, console.log);

// Just to ensure it runs even if server isn't up, we'll output a message
process.on('SIGINT', () => {
    console.log('Load test interrupted');
});

console.log('Running load test (Student 5)... ensure server is running!');
