import React, { useState, useMemo, useEffect } from 'react';
import { HolidayPeriod, TeamMember, HolidayPeriod as AllHolidays } from '../types';
import TrashIcon from './icons/TrashIcon';

interface HolidayDetailProps {
  holiday: HolidayPeriod;
  allHolidays: AllHolidays[];
  teamMembers: TeamMember[];
  defaultPreference: number;
  onAddApplication: (holidayId: string, memberId: string, preference: number) => void;
  onRemoveApplication: (holidayId: string, applicationId: string) => void;
  onAddDailyAssignment: (holidayId: string, memberId: string, date: string) => void;
  onRemoveDailyAssignment: (holidayId: string, date: string) => void;
  onRunLottery: (holidayId: string) => void;
  onClearLottery: (holidayId: string) => void;
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

const chineseDayLabels = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五"];

const HolidayDetail: React.FC<HolidayDetailProps> = ({ 
  holiday,
  allHolidays,
  teamMembers,
  defaultPreference,
  onAddApplication, 
  onRemoveApplication,
  onAddDailyAssignment,
  onRemoveDailyAssignment,
  onRunLottery, 
  onClearLottery 
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [preference, setPreference] = useState<string>(String(defaultPreference));

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

  const availablePreferences = useMemo(() => {
    if (!selectedMemberId || !holiday.startDate) return [];
    
    // 使用字串解析年份以避免 new Date() 的時區問題
    const holidayYear = parseInt(holiday.startDate.split('-')[0], 10);
    if (isNaN(holidayYear)) return [];

    const usedPrefs = allHolidays
      .filter(h => {
        if (h.isSpecialLottery || !h.startDate) return false;
        const year = parseInt(h.startDate.split('-')[0], 10);
        return year === holidayYear;
      })
      .flatMap(h => h.applications)
      .filter(app => app.memberId === selectedMemberId)
      .map(app => app.preference);
    
    const uniqueUsedPrefs = new Set(usedPrefs);
    const allPossiblePrefs = Array.from({ length: 10 }, (_, i) => i + 1);
    
    return allPossiblePrefs.filter(p => !uniqueUsedPrefs.has(p));
  }, [selectedMemberId, allHolidays, holiday.startDate]);
  
  useEffect(() => {
    if (selectedMemberId && availablePreferences.length > 0) {
        const currentPrefNumber = Number(preference);
        if (!availablePreferences.includes(currentPrefNumber)) {
            if (availablePreferences.includes(defaultPreference)) {
                setPreference(String(defaultPreference));
            } else {
                setPreference(String(availablePreferences[0]));
            }
        }
    }
    if (!selectedMemberId) {
        setPreference(String(defaultPreference));
    }
  }, [selectedMemberId, availablePreferences, defaultPreference, preference]);


  const handleAddPreferenceApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberId && preference) {
      onAddApplication(holiday.id, selectedMemberId, Number(preference));
      setSelectedMemberId('');
      setPreference(String(defaultPreference));
    }
  };

  const sortedApplications = useMemo(() => {
    if (holiday.isSpecialLottery) return [];
    return [...holiday.applications].sort((a, b) => a.preference - b.preference);
  }, [holiday.applications, holiday.isSpecialLottery]);
  
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
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white">{holiday.name}</h2>
          <p className="text-gray-400">{holiday.startDate} to {holiday.endDate}</p>
          <p className="text-gray-300 font-semibold mt-1">
            每日名額： <span className="text-blue-400 text-xl">{holiday.slots}</span>
          </p>
        </div>

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
            {dates.map((date, index) => {
              const assignment = assignmentsByDate.get(date);
              const dayLabel = chineseDayLabels[index] || `第 ${index + 1} 天`;
              return (
                <div key={date} className="grid grid-cols-3 gap-4 items-center bg-gray-700 p-3 rounded-md">
                  <div className="font-semibold text-gray-300">
                    <p>{date}</p>
                    <p className="text-sm text-blue-300">{dayLabel}</p>
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
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white">{holiday.name}</h2>
        <p className="text-gray-400">{holiday.startDate} to {holiday.endDate}</p>
        <p className="text-gray-300 font-semibold mt-1">
          可用名額： <span className="text-blue-400 text-xl">{holiday.slots}</span>
        </p>
      </div>

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
            disabled={!selectedMemberId || availablePreferences.length === 0}
            className="md:col-span-1 bg-gray-600 border border-gray-500 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" disabled>期望排名</option>
            {selectedMemberId ? 
              availablePreferences.length > 0 ? 
                availablePreferences.map(p => (
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
        <p className="text-sm text-gray-500 mb-3 -mt-2">按期望排名數字正序排列（數字越小，候補順位越優先）。</p>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {sortedApplications.length > 0 ? sortedApplications.map((app, index) => {
            const isApproved = index < holiday.slots;
            return (
              <div key={app.id} className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${isApproved ? 'bg-green-900/50 border-green-500' : 'bg-yellow-900/50 border-yellow-500'}`}>
                <div className="flex items-center">
                  <span className="text-lg font-bold text-gray-400 mr-4 w-6 text-center">{app.preference}</span>
                  <div>
                    <p className="font-semibold text-white">{app.memberName}</p>
                    <span className={`text-xs font-bold uppercase ${isApproved ? 'text-green-400' : 'text-yellow-400'}`}>
                      {isApproved ? '已批准' : '候補'}
                    </span>
                  </div>
                </div>
                <button onClick={() => onRemoveApplication(holiday.id, app.id)} className="text-gray-500 hover:text-red-500 transition-colors">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            );
          }) : <p className="text-gray-500 text-center py-6">此假期尚無人申請。</p>}
        </div>
      </div>
    </div>
  );
};

export default HolidayDetail;