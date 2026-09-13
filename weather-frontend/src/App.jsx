import { useState } from 'react';
import './App.css';

function App() {
  const [city, setCity] = useState('');
  const [historyData, setHistoryData] = useState([]);
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentCityName, setCurrentCityName] = useState('');

  const fetchWeather = async () => {
    if (!city) return alert("Please enter a city name.");
    setLoading(true);
    setMessage("Fetching and saving weather data from backend...");
    setHistoryData([]);
    setPrediction('');
    setCurrentCityName('');
    
    try {
      // 1. Ask backend to fetch from Open-Meteo and save to DB
      const saveRes = await fetch('/weather-api/get-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city })
      });
      const saveData = await saveRes.json();
      
      if (!saveData.success) {
        throw new Error(saveData.error || "Failed to fetch weather data.");
      }
      
      setCurrentCityName(saveData.city);

      // 2. Retrieve the history from DB
      const historyRes = await fetch(`/weather-api/history/${saveData.city}`);
      const historyJson = await historyRes.json();
      
      if (historyJson.success) {
        setHistoryData(historyJson.data);
        setMessage("Data successfully retrieved from database.");
      } else {
        setMessage(historyJson.message);
      }
    } catch (err) {
      setMessage("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const predictNextDay = async () => {
    if (historyData.length === 0) return alert("Please fetch weather data first.");
    setLoading(true);
    setPrediction('');
    setMessage(`Asking Gemini to predict the next day's weather...`);
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key is missing in frontend .env");
      }
      
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" }); 
      
      // Prepare historical data for prompt
      const historySummary = historyData.slice(0, 10).map(d => 
        `${d.date}: ${d.temperature}°C, Wind ${d.windSpeed}km/h, Humidity ${d.humidity}%, Rain ${d.rainfall}mm, Condition ${getWeatherDescription(d.weatherCondition)}`
      ).join('\n');

      const prompt = `Based on the following 10 days of historical weather data for ${currentCityName}, predict the weather for the NEXT DAY.
Historical Data:
${historySummary}

Please provide a highly structured and easy-to-read summary in this exact format:

- **Expected Temperature:** [Your prediction]
- **Weather Condition:** [Your prediction]
- **Rain Probability:** [Your prediction]
- **Other Relevant Info:** [Your advice or info]

Do not write long paragraphs. Keep the text clean and well-ordered.`;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      setPrediction(text);
      setMessage("");
    } catch (err) {
      setMessage("Error from Gemini: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherDescription = (code) => {
    const codeNum = parseInt(code);
    if (codeNum <= 3) return "Clear / Partly Cloudy";
    if (codeNum <= 49) return "Fog / Overcast";
    if (codeNum <= 69) return "Rainy";
    if (codeNum <= 79) return "Snowy";
    return "Stormy";
  };

  return (
    <div className="container">
      <h1>Weather Prediction App</h1>
      
      <div className="search-section">
        <input 
          type="text" 
          placeholder="Enter a city..." 
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchWeather()}
        />
        <button onClick={fetchWeather} disabled={loading}>
          Search
        </button>
      </div>

      {message && <p><strong>Status:</strong> {message}</p>}

      {historyData.length > 0 && (
        <div>
          <h2>Past 10 Days Weather for {currentCityName}</h2>
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Temp (°C)</th>
                <th>Humidity (%)</th>
                <th>Wind (km/h)</th>
                <th>Rainfall (mm)</th>
                <th>Condition</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((record) => (
                <tr key={record._id}>
                  <td>{record.date}</td>
                  <td>{record.temperature}</td>
                  <td>{record.humidity ?? 'N/A'}</td>
                  <td>{record.windSpeed}</td>
                  <td>{record.rainfall ?? 'N/A'}</td>
                  <td>{getWeatherDescription(record.weatherCondition)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={predictNextDay} disabled={loading} style={{ marginTop: '20px' }}>
            Predict Next Day Weather (AI)
          </button>
        </div>
      )}

      {prediction && (
        <div className="prediction-section">
          <h3>Next Day Prediction</h3>
          <div style={{ whiteSpace: 'pre-wrap' }}>{prediction}</div>
          <p style={{ marginTop: '10px', fontSize: '0.85em', color: '#666', fontStyle: 'italic' }}>
            * This prediction is an AI-generated estimate and not an actual weather forecast.
          </p>
        </div>
      )}
    </div>
  );
}

export default App;