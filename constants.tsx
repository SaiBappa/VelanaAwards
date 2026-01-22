
import React from 'react';

export const EVENT_DETAILS = {
  name: "Velana Awards 2026",
  date: "12th February 2026, Thursday",
  time: "1915 HRS",
  location: "Crossroads Maldives",
  subLocation: "Departure from Jetty-1 from Male’",
  description: "Honoring excellence and celebrating innovation in the heart of our community."
};

// Known nominees for auto-categorization
export const NOMINEE_ORGANIZATIONS = [
  "Maldivian", 
  "Emirates", 
  "Qatar Airways", 
  "SriLankan Airlines", 
  "FlyDubai", 
  "Singapore Airlines", 
  "Turkish Airlines", 
  "Aeroflot", 
  "Indigo", 
  "British Airways",
  "Trans Maldivian Airways",
  "Manta Air"
];

// List of all invited organizations for "Did Not RSVP" tracking
export const INVITED_ORGANIZATIONS = [
  ...NOMINEE_ORGANIZATIONS,
  "Villa Air", 
  "Island Aviation", 
  "Maldives Airports Company Ltd", 
  "Ministry of Transport",
  "Maldives Customs Service",
  "Immigration Maldives"
];

export const STORAGE_KEY = 'velana_guests_v2';
