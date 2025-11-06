import React, { useState, useRef } from 'react';
import { HolidayPeriod } from '../types';
import CalendarPlusIcon from './icons/CalendarPlusIcon';
import TrashIcon from './icons/TrashIcon';
import ChevronUpIcon from './icons/ChevronUpIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import Bars3Icon from './icons/Bars3Icon';

interface HolidayManagerProps {
  holidays: HolidayPeriod[];
  selectedHolidayId: string | null;
  onAddHoliday: (name: string, startDate: string, endDate: string, slots: number, isSpecialLottery: boolean) => void;
  onRemoveHoliday: (id: string) => void;
  onSelectHoliday: (id: string | null) => void;
  onMoveHoliday: (reorderedHolidays: HolidayPeriod[]) => void;
}

const HolidayManager: React.FC<HolidayManagerProps> = ({ holidays, selectedHolidayId, onAddHoliday, onRemoveHoliday, onSelectHoliday, onMoveHoliday }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [slots, setSlots] = useState(1);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSpecial, setIsSpecial] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    onAddHoliday(name, startDate, endDate, slots, isSpecial);
    setName('');
    setStartDate('');
    setEndDate('');
    setSlots(1);
    setIsSpecial(false);
    setIsFormVisible(false);
  };
  
  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    
    const holidaysCopy = [...holidays];
    const draggedItemContent = holidaysCopy.splice(dragItem.current, 1)[0];
    holidaysCopy.splice(dragOverItem.current, 0, draggedItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    
    onMoveHoliday(holidaysCopy);
  };
  
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    if (newStartDate > endDate) {
      setEndDate(newStartDate);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsFormVisible(!isFormVisible)}
      >
        <h2 className="text-2xl font-bold text-white flex items-center">
          <CalendarPlusIcon className="w-6 h-6 mr-3 text-blue-400" />
          假期期間
        </h2>
        {isFormVisible ? <ChevronUpIcon className="w-6 h-6 text-gray-400" /> : <ChevronDownIcon className="w-6 h-6 text-gray-400" />}
      </div>
      
      {isFormVisible && (
        <form onSubmit={handleAddHoliday} className="mt-4 space-y-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="假期名稱" required className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={startDate} onChange={handleStartDateChange} required className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <input type="number" value={slots} onChange={e => setSlots(Number(e.target.value))} min="1" placeholder="可用名額" required className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="is-special-lottery"
              checked={isSpecial}
              onChange={e => setIsSpecial(e.target.checked)}
              className="h-4 w-4 rounded border-gray-500 bg-gray-600 text-blue-500 focus:ring-blue-600"
            />
            <label htmlFor="is-special-lottery" className="text-gray-300">
              春節特殊抽籤模式
            </label>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-500 transition-colors duration-200">新增假期</button>
        </form>
      )}

      <div className="mt-6 space-y-2 max-h-60 overflow-y-auto pr-2">
        {holidays.length > 0 ? holidays.map((holiday, index) => (
          <div
            key={holiday.id}
            draggable
            onDragStart={() => dragItem.current = index}
            onDragEnter={() => dragOverItem.current = index}
            onDragEnd={handleDragSort}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => onSelectHoliday(holiday.id)}
            className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-all duration-200 ${selectedHolidayId === holiday.id ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            <div className="flex items-center">
               <Bars3Icon className="w-5 h-5 mr-3 text-gray-500 cursor-grab" />
               <div>
                <p className="font-semibold">{holiday.name}</p>
                <p className={`text-sm ${selectedHolidayId === holiday.id ? 'text-blue-200' : 'text-gray-400'}`}>
                    {holiday.isSpecialLottery 
                        ? `${holiday.dailyAssignments?.length || 0} 人已排班` 
                        : `${holiday.applications.length} / ${holiday.slots} 人已登記`
                    }
                </p>
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onRemoveHoliday(holiday.id); }} className={`ml-2 ${selectedHolidayId === holiday.id ? 'text-blue-100 hover:text-white' : 'text-gray-400 hover:text-red-500'}`}>
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        )) : <p className="text-gray-500 text-center py-4">尚未建立任何假期。</p>}
      </div>
    </div>
  );
};

export default HolidayManager;