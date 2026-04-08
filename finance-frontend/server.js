const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve the static files from the React app build folder
app.use(express.static(path.join(__dirname, 'build')));

// Catch-all route to serve index.html for any request that doesn't match a static file
// This is what makes React Router work on direct navigation (like /admin/dashboard)
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Frontend server is running on port ${PORT}`);
});
