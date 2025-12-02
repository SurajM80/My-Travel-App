import React, { useState } from 'react';
import { generateItinerary } from '../services/geminiService';
import { AIItineraryResponse } from '../types';
import { Button } from './Button';
import { Sparkles, Map, Loader2 } from 'lucide-react';

export const AIPlanner: React.FC = () => {
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState(3);
  const [interests, setInterests] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [itinerary, setItinerary] = useState<AIItineraryResponse | null>(null);

  const handlePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) return;
    
    setIsLoading(true);
    const result = await generateItinerary(destination, duration, interests || 'general sightseeing');
    setItinerary(result);
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <Sparkles className="text-yellow-300 h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold">AI Trip Planner</h2>
        </div>
        <p className="text-indigo-100 mb-6 max-w-xl">
          Let Gemini create the perfect itinerary for you. Just tell us where you want to go and what you love.
        </p>

        <form onSubmit={handlePlan} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="block text-xs uppercase tracking-wide text-indigo-200 font-bold mb-1">Destination</label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Paris"
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/50"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs uppercase tracking-wide text-indigo-200 font-bold mb-1">Days</label>
            <input
              type="number"
              min="1"
              max="14"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/50"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs uppercase tracking-wide text-indigo-200 font-bold mb-1">Interests</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. food, museums, hiking"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-indigo-300 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/50"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-white text-indigo-600 font-bold px-6 py-3 rounded-lg hover:bg-indigo-50 transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Plan'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {itinerary && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Map className="text-indigo-500" />
              Itinerary for {itinerary.destination}
            </h3>
            <span className="text-sm font-medium bg-green-100 text-green-800 px-3 py-1 rounded-full">
              Est. Cost: {itinerary.estimatedCost.replace('$', '₹')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itinerary.days.map((day) => (
              <div key={day.day} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-indigo-50 p-4 border-b border-indigo-100">
                  <span className="text-indigo-600 font-bold text-sm uppercase tracking-wider">Day {day.day}</span>
                  <h4 className="font-bold text-gray-900 mt-1">{day.title}</h4>
                </div>
                <div className="p-4">
                  <ul className="space-y-3">
                    {day.activities.map((activity, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-600 text-sm">
                        <span className="block w-1.5 h-1.5 mt-1.5 rounded-full bg-indigo-400 flex-shrink-0"></span>
                        {activity}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};