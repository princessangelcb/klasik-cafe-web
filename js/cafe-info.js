import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch the data from Supabase
    const { data: cafeInfo, error } = await supabase
        .from('cafe_info')
        .select('*')
        .eq('id', 1)
        .single();

    if (error) {
        console.error("Error loading cafe info:", error.message);
        return;
    }

    if (cafeInfo) {
        // 2. Find the HTML elements on your page
        const aboutElement = document.getElementById('cafe-about-text');
        const phoneElement = document.getElementById('cafe-phone');
        const emailElement = document.getElementById('cafe-email');
        const addressElement = document.getElementById('cafe-address');
        const hoursElement = document.getElementById('cafe-hours');

        // 3. Update the text on the screen
        if (aboutElement) aboutElement.textContent = cafeInfo.about_text;
        if (phoneElement) phoneElement.textContent = cafeInfo.phone;
        if (emailElement) emailElement.textContent = cafeInfo.email;
        if (addressElement) addressElement.textContent = cafeInfo.address;
        if (hoursElement) hoursElement.textContent = cafeInfo.opening_hours;
    }
});