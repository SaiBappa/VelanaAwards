
import React from 'react';

// Automatically detect the domain (Localhost or Cloud Run)
// Defaults to the production domain events.macl.aero if window is undefined
export const APP_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://events.macl.aero';

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

export const AWARD_SECTIONS = [
  {
    id: "passenger",
    title: "Passenger Awards",
    description: "Recognizing airlines that have demonstrated exceptional growth and service in connecting the Maldives to the world.",
    categories: [
      "Top Airline for Passenger Growth",
      "Top Domestic Airline for Passenger Growth",
      "Top Passenger Airline",
      "Top Domestic Airline"
    ]
  },
  {
    id: "cargo",
    title: "Cargo Awards",
    description: "Honoring partners who drive global trade through outstanding cargo and logistics operations.",
    categories: [
      "Top Air-to-Air Import Airline",
      "Top Air-to-Air Export Airline",
      "Top Sea-to-Air Export Airline",
      "Top Cargo Partner",
      "Freighter of the Year"
    ]
  },
  {
    id: "lounge",
    title: "Lounge Awards",
    description: "Celebrating the partners who redefine luxury and hospitality in our premium lounges.",
    categories: [
      "Vilu Partner of the Year Award",
      "Maamahi Partner of the Year Award",
      "Leeli Partner of the Year Award"
    ]
  }
];

export const STORAGE_KEY = 'velana_guests_v2';

export const DEFAULT_GUEST_CATEGORIES = [
  "Not an Award Recipient", 
  "Nominee / Partner", 
  "VIP", 
  "Media", 
  "Organizing Team", 
  "Government Official", 
  "Sponsor"
];
