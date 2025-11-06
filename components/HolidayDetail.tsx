// Fix: Import `useCallback` from 'react'.
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { HolidayPeriod, TeamMember, HolidayPeriod as AllHolidays, Application } from '../types';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';

interface HolidayDetailProps {
  holiday: HolidayPeriod;
  allHolidays: AllHolidays[];
  teamMembers: TeamMember[];
  defaultPreference: number;
  onAddApplication: (holidayId: string, memberId: string, preference: number) => void;
  onRemoveApplication: (holidayId: string, applicationId: string) => void;
  onUpdateApplicationPreference: (holidayId: string, applicationId: string, newPreference: number) => void;
  onAddDailyAssignment: (holidayId: string, memberId: string, date: string) => void;
  onRemoveDailyAssignment: (holidayId: string, date: string) => void;
  onRunLottery: (holidayId: string) => void;
  onClearLottery: (holidayId: string) => void;
  onUpdateHolidayDetails: (holidayId: string, details: Partial<Pick<HolidayPeriod, 'startDate' | 'endDate' | 'slots'>>) => void;
  onUpdateDailyLabel: (holidayId: string, date: string, newLabel: string) => void;
}

const getDatesBetween = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  if (!startDate || !endDate) return dates;
  let currentDate = new Date(new Date(startDate).toISOString().slice(0, 10));
  const end = new Date(new Date(endDate).toISOString().slice(0, 10));

  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

const HolidayDetail: React.FC<HolidayDetailProps> = ({ 
  holiday,
  allHolidays,
  teamMembers,
  defaultPreference,
  onAddApplication, 
  onRemoveApplication,
  onUpdateApplicationPreference,
  onAddDailyAssignment,
  onRemoveDailyAssignment,
  onRunLottery, 
  onClearLottery,
  onUpdateHolidayDetails,
  onUpdateDailyLabel
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [preference, setPreference] = useState<string>(String(defaultPreference));
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editingPreference, setEditingPreference] = useState<string>('');
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedDetails, setEditedDetails] = useState({
    startDate: holiday.startDate,
    endDate: holiday.endDate,
    slots: holiday.slots,
  });
  const [editingLabel, setEditingLabel] = useState<{date: string; text: string} | null>(null);

  useEffect(() => {
    setIsEditingDetails(false);
  }, [holiday.id]);

  const handleDetailsEdit = () => {
    setEditedDetails({
      startDate: holiday.startDate,
      endDate: holiday.endDate,
      slots: holiday.slots,
    });
    setIsEditingDetails(true);
  };

  const handleDetailsSave = () => {
    onUpdateHolidayDetails(holiday.id, {
        startDate: editedDetails.startDate,
        endDate: editedDetails.endDate,
        slots: Number(editedDetails.slots),
    });
    setIsEditingDetails(false);
  };

  const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleLabelEdit = (date: string, currentLabel: string) => {
    setEditingLabel({ date, text: currentLabel });
  };

  const handleLabelSave = () => {
    if (editingLabel) {
      onUpdateDailyLabel(holiday.id, editingLabel.date, editingLabel.text);
      setEditingLabel(null);
    }
  };


  const assignedMemberIds = useMemo(() => {
    const memberIds = new Set<string>();
    if (holiday.isSpecialLottery) {
      holiday.dailyAssignments?.forEach(da => memberIds.add(da.memberId));
    } else {
      holiday.applications?.forEach(app => memberIds.add(app.memberId));
    }
    return memberIds;
  }, [holiday]);

  const availableMembers = useMemo(() => {
    return teamMembers.filter(member => !assignedMemberIds.has(member.id));
  }, [teamMembers, assignedMemberIds]);

  const getAvailablePreferences = useCallback((memberId: string, isEditing: boolean, currentPref?: number) => {
    if (!memberId || !holiday.startDate) return [];

    const holidayYear = parseInt(holiday.startDate.split('-')[0], 10);
    if (isNaN(holidayYear)) return [];

    const usedPrefs = allHolidays
      .filter(h => {
        if (h.isSpecialLottery || !h.startDate) return false;
        const year = parseInt(h.startDate.split('-')[0], 10);
        return year === holidayYear;
      })
      .flatMap(h => h.applications)
      .filter(app => app.memberId === memberId)
      .map(app => app.preference);
    
    const uniqueUsedPrefs = new Set(usedPrefs);
    const allPossiblePrefs = Array.from({ length: defaultPreference }, (_, i) => i + 1);
    
    const available = allPossiblePrefs.filter(p => !uniqueUsedPrefs.has(p));
    if(isEditing && currentPref) {
      available.push(currentPref)
      available.sort((a,b) => a-b);
    }
    return available;
  }, [allHolidays, holiday.startDate, defaultPreference]);

  const newApplicationPrefs = useMemo(() => getAvailablePreferences(selectedMemberId, false), [selectedMemberId, getAvailablePreferences]);
  
  useEffect(() => {
    if (selectedMemberId && newApplicationPrefs.length > 0) {
        const currentPrefNumber = Number(preference);
        if (!newApplicationPrefs.includes(currentPrefNumber)) {
            if (newApplicationPrefs.includes(defaultPreference) && defaultPreference <= newApplicationPrefs[newApplicationPrefs.length - 1]) {
                setPreference(String(defaultPreference));
            } else {
                setPreference(String(newApplicationPrefs[0]));
            }
        }
    } else if (selectedMemberId) {
       setPreference('');
    }
    
    if (!selectedMemberId) {
        setPreference(String(defaultPreference));
    }
  }, [selectedMemberId, newApplicationPrefs, defaultPreference, preference]);


  const handleAddPreferenceApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberId && preference) {
      onAddApplication(holiday.id, selectedMemberId, Number(preference));
      setSelectedMemberId('');
      setPreference(String(defaultPreference));
    }
  };

  const handleEditClick = (app: Application) => {
    setEditingAppId(app.id);
    setEditingPreference(String(app.preference));
  };

  const handleSaveEdit = (appId: string) => {
    onUpdateApplicationPreference(holiday.id, appId, Number(editingPreference));
    setEditingAppId(null);
  };

  const sortedApplications = useMemo(() => {
    if (holiday.isSpecialLottery) return [];
    return [...holiday.applications].sort((a, b) => a.preference - b.preference);
  }, [holiday.applications, holiday.isSpecialLottery]);
  
  const renderHeader = () => (
    <div className="mb-6">
      <div className="flex justify-between items-start">
        <h2 className="text-3xl font-bold text-white">{holiday.name}</h2>
        { !isEditingDetails ? (
           <button onClick={handleDetailsEdit} className="text-gray-400 hover:text-blue-400 transition-colors">
              <PencilIcon className="w-6 h-6"/>
            </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={handleDetailsSave} className="bg-blue-600 text-white text-sm font-bold px-4 py-1.5 rounded-md">儲存</button>
            <button onClick={() => setIsEditingDetails(false)} className="text-gray-400 hover:text-white text-sm font-bold px-4 py-1.5 rounded-md">取消</button>
          </div>
        )}
      </div>
      { isEditingDetails ? (
         <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-700/50 p-3 rounded-lg">
            <div>
              <label className="text-xs text-gray-400">起始日</label>
              <input type="date" name="startDate" value={editedDetails.startDate} onChange={handleDetailChange} className="w-full bg-gray-600 border border-gray-500 rounded-md px-2 py-1.5 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400">結束日</label>
              <input type="date" name="endDate" value={editedDetails.endDate} min={editedDetails.startDate} onChange={handleDetailChange} className="w-full bg-gray-600 border border-gray-500 rounded-md px-2 py-1.5 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400">名額</label>
              <input type="number" name="slots" value={editedDetails.slots} min="1" onChange={handleDetailChange} className="w-full bg-gray-600 border border-gray-500 rounded-md px-2 py-1.5 text-white" />
            </div>
         </div>
      ) : (
        <>
            <p className="text-gray-400">{holiday.startDate} to {holiday.endDate}</p>
            <p className="text-gray-300 font-semibold mt-1">
              可用名額： <span className="text-blue-400 text-xl">{holiday.slots}</span>
            </p>
        </>
      )}
    </div>
  );
  
  if (holiday.isSpecialLottery) {
    const dates = useMemo(() => getDatesBetween(holiday.startDate, holiday.endDate), [holiday.startDate, holiday.endDate]);
    const assignmentsByDate = useMemo(() => {
      const map = new Map();
      holiday.dailyAssignments?.forEach(da => map.set(da.date, da));
      return map;
    }, [holiday.dailyAssignments]);
    
    const canRunLottery = dates.some(date => !assignmentsByDate.has(date)) && availableMembers.length > 0;
    const hasLotteryAssignments = holiday.dailyAssignments?.some(da => da.type === 'lottery');

    return (
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg h-full flex flex-col">
        {renderHeader()}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-3 text-white">自願登記與抽籤</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-700 p-4 rounded-lg">
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="bg-gray-600 border border-gray-500 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>選擇成員以登記自願</option>
              {availableMembers.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
            <div className="flex gap-4">
              <button 
                onClick={() => onRunLottery(holiday.id)}
                disabled={!canRunLottery}
                className="flex-1 bg-indigo-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-indigo-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                執行抽籤
              </button>
              <button
                onClick={() => onClearLottery(holiday.id)}
                disabled={!hasLotteryAssignments}
                className="flex-1 bg-gray-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-gray-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                清除抽籤
              </button>
            </div>
          </div>
        </div>

        <div className="flex-grow flex flex-col min-h-0">
          <h3 className="text-xl font-semibold mb-3 text-white">每日排班表</h3>
          <div className="space-y-3 overflow-y-auto pr-2 flex-grow bg-gray-900/50 p-3 rounded-lg">
            {dates.map((date) => {
              const assignment = assignmentsByDate.get(date);
              const dayLabel = holiday.dailyLabels?.[date] || date;
              const isEditingLabel = editingLabel?.date === date;
              return (
                <div key={date} className="grid grid-cols-3 gap-4 items-center bg-gray-700 p-3 rounded-md">
                  <div className="font-semibold text-gray-300">
                    <p>{date}</p>
                    <div className="text-sm text-blue-300 flex items-center gap-2">
                       {isEditingLabel ? (
                          <input
                            type="text"
                            value={editingLabel.text}
                            onChange={(e) => setEditingLabel({ ...editingLabel, text: e.target.value })}
                            className="bg-gray-800 border-b border-blue-400 text-white w-full"
                            onBlur={handleLabelSave}
                            onKeyDown={(e) => e.key === 'Enter' && handleLabelSave()}
                            autoFocus
                          />
                        ) : (
                          <>
                            <span>{dayLabel}</span>
                            <button onClick={() => handleLabelEdit(date, dayLabel)} className="text-gray-500 hover:text-blue-300">
                               <PencilIcon className="w-3.5 h-3.5"/>
                            </button>
                          </>
                        )}
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    {assignment ? (
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${assignment.type === 'volunteer' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                          {assignment.type === 'volunteer' ? '自願' : '抽籤'}
                        </span>
                        <span className="text-white font-medium">{assignment.memberName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">待安排...</span>
                    )}

                    {assignment && assignment.type === 'volunteer' && (
                       <button onClick={() => onRemoveDailyAssignment(holiday.id, date)} className="text-gray-500 hover:text-red-500 transition-colors">
                         <TrashIcon className="w-5 h-5" />
                       </button>
                    )}
                    {!assignment && selectedMemberId && (
                       <button 
                        onClick={() => {
                          onAddDailyAssignment(holiday.id, selectedMemberId, date)
                          setSelectedMemberId('');
                        }}
                        className="bg-blue-600 text-white text-sm font-semibold px-3 py-1 rounded-md hover:bg-blue-500 transition-colors"
                       >
                        自願此日
                       </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Original render logic for preference-based holiday
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg h-full">
      {renderHeader()}

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3 text-white">登記此假期</h3>
        <form onSubmit={handleAddPreferenceApplication} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-700 p-4 rounded-lg">
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            required
            className="md:col-span-1 bg-gray-600 border border-gray-500 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>選擇成員</option>
            {availableMembers.map(member => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
          <select
            value={preference}
            onChange={(e) => setPreference(e.target.value)}
            required
            disabled={!selectedMemberId || newApplicationPrefs.length === 0}
            className="md:col-span-1 bg-gray-600 border border-gray-500 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" disabled>權重排名</option>
            {selectedMemberId ? 
              newApplicationPrefs.length > 0 ? 
                newApplicationPrefs.map(p => (
                  <option key={p} value={p}>{p}</option>
                )) : 
                <option disabled>無可用權重</option>
              :
              <option disabled>請先選擇成員</option>
            }
          </select>
          <button
            type="submit"
            disabled={!selectedMemberId || !preference}
            className="md:col-span-1 bg-blue-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            提交申請
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-3 text-white">目前登記狀況</h3>
        <p className="text-sm text-gray-500 mb-3 -mt-2">按權重排名數字正序排列（數字越小，順位越優先）。</p>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {sortedApplications.length > 0 ? sortedApplications.map((app, index) => {
            const isApproved = index < holiday.slots;
            const isEditing = editingAppId === app.id;
            const editingPrefs = isEditing ? getAvailablePreferences(app.memberId, true, app.preference) : [];
            
            return (
              <div key={app.id} className={`p-4 rounded-lg border-l-4 transition-colors ${isApproved ? 'bg-green-900/50 border-green-500' : 'bg-yellow-900/50 border-yellow-500'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {isEditing ? (
                       <select
                         value={editingPreference}
                         onChange={(e) => setEditingPreference(e.target.value)}
                         className="bg-gray-600 border border-gray-500 rounded-md px-2 py-1 text-white text-lg font-bold mr-4 w-20"
                       >
                         {editingPrefs.map(p => <option key={p} value={p}>{p}</option>)}
                       </select>
                    ) : (
                      <span className="text-lg font-bold text-gray-400 mr-4 w-6 text-center">{app.preference}</span>
                    )}
                    <div>
                      <p className="font-semibold text-white">{app.memberName}</p>
                      <span className={`text-xs font-bold uppercase ${isApproved ? 'text-green-400' : 'text-yellow-400'}`}>
                        {isApproved ? '已批准' : '候補'}
                      </span>
                    </div>
                  </div>
                   <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSaveEdit(app.id)} className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded">儲存</button>
                        <button onClick={() => setEditingAppId(null)} className="text-gray-400 hover:text-white text-xs font-bold px-3 py-1 rounded">取消</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEditClick(app)} className="text-gray-400 hover:text-blue-400 transition-colors">
                            <PencilIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={() => onRemoveApplication(holiday.id, app.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          }) : <p className="text-gray-500 text-center py-6">此假期尚無人申請。</p>}
        </div>
      </div>
    </div>
  );
};

export default HolidayDetail;