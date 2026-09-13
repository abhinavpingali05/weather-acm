# Weather Prediction App

This is a simple full-stack app built to pull the last 10 days of weather for any city, save it to a local database, and use Gemini AI to predict tomorrow's weather based on those historical trends. 

## Tech Stack
* **Frontend:** React (Vite)
* **Backend:** Node.js & Express
* **Database:** MongoDB
* **APIs:** Open-Meteo (for the raw weather data) and Google Gemini (for the AI predictions)

## Structure
The setup is fairly straightforward. The main root folder holds the Node/Express backend logic and database models, while the `weather-frontend` folder inside it contains the entire React user interface. 
