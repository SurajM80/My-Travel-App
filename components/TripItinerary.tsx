import React, { useState } from 'react';
import { Trip, Activity } from '../types';
import { Plus, CheckCircle, Circle, Trash2, Calendar, MinusCircle, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { addDays, getDaysArray } from '../utils/dateUtils';

interface TripItineraryProps {
  trip: Trip;
  activities: Activity[];
  onAddActivity: (date: string, description: string) => void;
  onDeleteActivity: (id: string) => void;
  onToggleActivity: (id: string) => void;
  onTripUpdate: (tripId: string, newStart: string, newEnd: string) => Promise<void>;
  onRemoveDay: (dateStr: string) => Promise<void>;
}

export const TripItinerary: React.FC<TripItineraryProps> = ({ 
  trip, 
  activities, 
  onAddActivity, 
  onDeleteActivity, 
  onToggleActivity,
  onTripUpdate,
  onRemoveDay
}) => {
  const [newActivity, setNewActivity] = useState<{date: string, desc: string}>({ date: '', desc: '' });
  const [activeDateInput, setActiveDateInput] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);

  const days = getDaysArray(trip.startDate, trip.endDate);

  const handleAddSubmit = (dateStr: string) => {
    if (!newActivity.desc.trim()) return;
    onAddActivity(dateStr, newActivity.desc);
    setNewActivity({ date: '', desc: '' });
    setActiveDateInput(null);
  };

  // Function to extend trip by 1 day at the end
  const handleExtendTrip = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const newEnd = addDays(trip.endDate, 1);
      await onTripUpdate(trip.id, trip.startDate, newEnd);
    } finally {
      setIsUpdating(false);
    }
  };

  // Function to remove a specific day
  const handleRemoveClick = async (dateStr: string, index: number) => {
    if (days.length <= 1) {
      alert("A trip must have at least one day.");
      return;
    }
    if (isUpdating || deletingDate) return;

    if(confirm(`Remove Day ${index + 1} (${dateStr})?\n\nThis will delete activities on this day and adjust the itinerary.`)) {
      setDeletingDate(dateStr);
      try {
        await onRemoveDay(dateStr);
      } finally {
        setDeletingDate(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="text-indigo-600" />
          Trip Itinerary
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Plan your days. Add activities, reservations, and reminders.
        </p>

        <div className="space-y-8">
          {days.length === 0 ? (
             <div className="text-center text-gray-400 py-4">No days in this trip. Extend your trip to see itinerary.</div>
          ) : days.map((dateObj, index) => {
            const dateStr = dateObj.toISOString().split('T')[0];
            const dayActivities = activities.filter(a => a.date === dateStr);
            const isDeletingThis = deletingDate === dateStr;
            
            return (
              <div key={dateStr} className="relative pl-8 border-l-2 border-indigo-100 last:border-0 pb-2">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm"></div>
                
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Day {index + 1}</h3>
                    <span className="text-sm text-gray-500 font-medium">
                      {dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Add Activity Button */}
                    <button 
                      onClick={() => setActiveDateInput(activeDateInput === dateStr ? null : dateStr)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full transition-colors"
                    >
                      + Add Activity
                    </button>

                    {/* Delete Day Button (Any Day) */}
                    {days.length > 1 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveClick(dateStr, index);
                        }}
                        disabled={!!deletingDate || isUpdating}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors p-1.5 rounded disabled:opacity-50"
                        title="Remove this day"
                      >
                         {isDeletingThis ? <Loader2 size={18} className="animate-spin" /> : <MinusCircle size={18} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* List of Activities for this day */}
                <div className={`space-y-2 mb-3 transition-opacity duration-300 ${isDeletingThis ? 'opacity-50' : ''}`}>
                  {dayActivities.length === 0 && activeDateInput !== dateStr && (
                    <p className="text-sm text-gray-400 italic">No activities planned yet.</p>
                  )}
                  
                  {dayActivities.map(activity => (
                    <div key={activity.id} className="group flex items-center gap-3 bg-gray-50 p-3 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all">
                      <button 
                        onClick={() => onToggleActivity(activity.id)}
                        className={`flex-shrink-0 ${activity.isCompleted ? 'text-green-500' : 'text-gray-300 hover:text-indigo-500'}`}
                      >
                        {activity.isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
                      </button>
                      
                      <span className={`flex-1 text-sm ${activity.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        {activity.description}
                      </span>
                      
                      <button 
                        onClick={() => onDeleteActivity(activity.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Input Form for this day */}
                {activeDateInput === dateStr && !isDeletingThis && (
                  <div className="flex gap-2 animate-fade-in mt-2">
                    <input
                      autoFocus
                      type="text"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. Visit Louvre Museum at 10 AM"
                      value={newActivity.desc}
                      onChange={(e) => setNewActivity({ date: dateStr, desc: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSubmit(dateStr);
                        if (e.key === 'Escape') setActiveDateInput(null);
                      }}
                    />
                    <button 
                      onClick={() => handleAddSubmit(dateStr)}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Extend Trip Button */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
            <Button variant="secondary" onClick={handleExtendTrip} disabled={isUpdating || !!deletingDate} className="w-full md:w-auto">
               {isUpdating && !deletingDate ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus size={16} />}
               Extend Trip (Add Day)
            </Button>
        </div>
      </div>
    </div>
  );
};
