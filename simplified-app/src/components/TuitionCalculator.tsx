import { useState } from 'react';
import tuitionData from '../data/tuition-rates.json';

export function TuitionCalculator() {
  const [schedule, setSchedule] = useState('full-day');
  const [tier, setTier] = useState('A');
  
  const selectedTier = tuitionData.tiers.find(t => t.name === tier);
  const tuition = schedule === 'full-day' ? selectedTier?.fullDay : selectedTier?.threeDay;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-earth-brown">Tuition Calculator</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Income Tier
          </label>
          <select 
            value={tier} 
            onChange={(e) => setTier(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-forest-canopy"
          >
            {tuitionData.tiers.map(t => (
              <option key={t.name} value={t.name}>
                {t.label} ({t.incomeRange})
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-600 mt-1">{selectedTier?.description}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Program
          </label>
          <div className="space-y-2">
            {tuitionData.programs.map(program => (
              <label key={program.id} className="flex items-start">
                <input
                  type="radio"
                  name="schedule"
                  value={program.id}
                  checked={schedule === program.id}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium">{program.name}</div>
                  <div className="text-sm text-gray-600">{program.schedule} • {program.hours}</div>
                  <div className="text-sm text-gray-500">{program.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-stone-beige rounded-lg">
          <div className="text-lg font-medium text-earth-brown">
            Annual Tuition: <span className="text-2xl font-bold">${tuition?.toLocaleString()}</span>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Monthly: ${Math.round((tuition || 0) / 10).toLocaleString()} (10 payments)
          </div>
        </div>
        
        <div className="text-sm text-gray-600 mt-4">
          <p className="font-medium mb-2">Included Services:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Before care from 7:30 AM</li>
            <li>After care until 5:30 PM (Monday-Thursday)</li>
            <li>All materials and supplies</li>
            <li>Healthy snacks</li>
          </ul>
          <p className="mt-2 text-xs italic">
            Note: No after care on Fridays - pickup by 3:00 PM
          </p>
        </div>
      </div>
    </div>
  );
}