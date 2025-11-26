async function testBooking() {
    try {
        const res = await fetch('http://localhost:5000/api/bookings');
        const data = await res.json();
        console.log('Status code:', res.status);
        console.log('Response body:', data);

        if (res.status === 200) {
            console.log('Test passed');
        } else {
            console.log('Test failed');
        }
    } catch (err) {
        console.error('Test failed:', err);
    }
}

testBooking();