import exp from 'express';
import { Weather } from '../models/weatherModel.js';

export const weatherRoute = exp.Router();

weatherRoute.post('/get-weather', async (req, res, next) => {
    try {
        const city = req.body.city;
        
        if (!city) {
            return res.json({ success: false, error: "City name is required" });
        }

        // 1. Convert city name to latitude and longitude
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            return res.json({ success: false, error: "Invalid or unavailable city name" });
        }

        const lat = geoData.results[0].latitude;
        const lon = geoData.results[0].longitude;
        const exactCityName = geoData.results[0].name;

        // 2. Fetch the past 10 days of historical weather data
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&past_days=10&forecast_days=1&daily=temperature_2m_max,wind_speed_10m_max,precipitation_sum,weather_code,relative_humidity_2m_max&timezone=auto`);
        const weatherData = await weatherResponse.json();

        // 3. Extract and save the daily data to MongoDB
        const daily = weatherData.daily;
        const savedData = [];

        for (let i = 0; i < 10; i++) {
            const currentDate = daily.time[i];
            
            // Check if this date's weather is already saved for this city to prevent duplicates
            const existingRecord = await Weather.findOne({ city: exactCityName, date: currentDate });
            
            if (!existingRecord) {
                const newRecord = new Weather({
                    city: exactCityName,
                    date: currentDate,
                    temperature: daily.temperature_2m_max[i],
                    windSpeed: daily.wind_speed_10m_max[i],
                    humidity: daily.relative_humidity_2m_max[i],
                    weatherCondition: daily.weather_code[i].toString(),
                    rainfall: daily.precipitation_sum[i]
                });
                
                await newRecord.save();
                savedData.push(newRecord);
            }
        }

        res.json({ 
            success: true, 
            message: "Weather data retrieved and stored successfully!", 
            city: exactCityName,
            newRecordsSaved: savedData.length
        });

    } catch (error) {
        next(error);
    }
});

// Route to retrieve saved weather history for a specific city
weatherRoute.get('/history/:city', async (req, res, next) => {
    try {
        // Grab the city name from the URL
        const cityParam = req.params.city;
        
        // Find all records for this city, case-insensitive, sorted by date (newest first)
        const weatherHistory = await Weather.find({ 
            city: new RegExp('^' + cityParam + '$', 'i') 
        }).sort({ date: -1 });

        if (weatherHistory.length === 0) {
            return res.json({ success: false, message: "No weather data found for this city in the database." });
        }

        res.json({ 
            success: true, 
            count: weatherHistory.length, 
            data: weatherHistory 
        });

    } catch (error) {
        next(error);
    }
});
// Route to delete weather history for a specific city
weatherRoute.delete('/history/:city', async (req, res, next) => {
    try {
        const cityParam = req.params.city;
        
        // Delete all records for this city, case-insensitive
        const result = await Weather.deleteMany({ 
            city: new RegExp('^' + cityParam + '$', 'i') 
        });

        if (result.deletedCount === 0) {
            return res.json({ success: false, message: "No weather data found to delete for this city." });
        }

        res.json({ 
            success: true, 
            message: `Successfully deleted ${result.deletedCount} weather records for ${cityParam}.` 
        });

    } catch (error) {
        next(error);
    }
});

// Route to update a specific weather record by its unique database ID
weatherRoute.put('/history/:id', async (req, res, next) => {
    try {
        const recordId = req.params.id;
        
        // Find by exact MongoDB _id and update
        const updatedRecord = await Weather.findByIdAndUpdate(
            recordId,
            { $set: req.body }, 
            { new: true }       
        );

        if (!updatedRecord) {
            return res.json({ success: false, message: "No record found with that ID." });
        }

        res.json({ 
            success: true, 
            message: "Weather record updated successfully!",
            data: updatedRecord 
        });

    } catch (error) {
        next(error);
    }
});