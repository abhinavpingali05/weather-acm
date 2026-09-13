import path from 'path';
import { fileURLToPath } from 'url';
import exp from 'express';
import { connect } from 'mongoose';
import { weatherRoute } from './APIs/weatherAPI.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = exp();

app.use(exp.json());

// Connect to DB
async function connectDB() {
    try {
        await connect("mongodb://localhost:27017/weatherDB");
        console.log("DB connected successfully");
        app.listen(5000, () => { console.log("Server is running on port 5000") });
    } catch (err) {
        console.log("Error in DB connection", err);
    }
}

connectDB();


app.use("/weather-api", weatherRoute);

app.use(exp.static(path.join(__dirname, 'weather-frontend/dist')));

app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/weather-api')) {
        res.sendFile(path.join(__dirname, 'weather-frontend/dist/index.html'));
    } else {
        next();
    }
});

app.use((err, req, res, next) => {
    console.log("Error is", err);
    res.json({ success: false, error: err.message });
});