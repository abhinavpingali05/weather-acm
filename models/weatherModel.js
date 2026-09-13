import { Schema, model } from 'mongoose';

const weatherSchema = new Schema({
    city: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    temperature: {
        type: Number
    },
    humidity: {
        type: Number
    },
    windSpeed: {
        type: Number
    },
    weatherCondition: {
        type: String
    },
    rainfall: {
        type: Number
    }
});

export const Weather = model('Weather', weatherSchema);