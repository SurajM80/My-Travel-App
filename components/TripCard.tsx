import React from 'react';
import { Trip } from '../types';
import { Calendar, DollarSign, MapPin, Trash2 } from 'lucide-react';

interface TripCardProps {
  trip: Trip;
  totalSpent: number;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const TripCard: React.FC<TripCardProps> = ({ trip, totalSpent, onClick, onDelete }) => {
  const isOverBudget = totalSpent > trip.budget;
  const progress = Math.min((totalSpent / trip.budget) * 100, 100);

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-gray-100 group flex flex-col h-full"
    >
      <div className="h-32 w-full bg-gray-200 relative overflow-hidden">
        <img 
          src={trip.imageUrl || `https://picsum.photos/seed/${trip.id}/400/200`} 
          alt={trip.destination}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
          <h3 className="text-white font-bold text-xl flex items-center gap-2">
            <MapPin size={18} /> {trip.destination}
          </h3>
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center text-gray-500 text-sm mb-4">
          <Calendar size={14} className="mr-2" />
          {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
        </div>

        <div className="mt-auto">
          <div className="flex justify-between text-sm font-medium mb-1">
            <span className="text-gray-600">Spent</span>
            <span className={`${isOverBudget ? 'text-red-500' : 'text-green-600'}`}>
              ₹{totalSpent.toFixed(0)} / ₹{trip.budget}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-indigo-500'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1.5 rounded hover:bg-red-50 transition-colors -ml-2"
          >
            <Trash2 size={14} />
            Delete Trip
          </button>
        </div>
      </div>
    </div>
  );
};