import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { TeamMember, HolidayPeriod, Application, DailyAssignment } from './types';
import TeamMemberManager from './components/TeamMemberManager';
import HolidayManager from './components/HolidayManager';
import HolidayDetail from './components/HolidayDetail';

const App: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [holidays, setHolidays] = useState<HolidayPeriod[]>([]);
  const [defaultPreference, setDefaultPreference] = useState(5);
  const [selectedHolidayId, setSelectedHolidayId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 從雲端載入資料
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('無法從伺服器獲取資料');
        const data = await response.json();
        setTeamMembers(data.teamMembers || []);
        setHolidays(data.holidays || []);
        setDefaultPreference(data.defaultPreference || 5);
        if (data.holidays && data.holidays.length > 0 && !selectedHolidayId) {
          setSelectedHolidayId(data.holidays[0].id);
        }
      } catch (e) {
        setError('無法從雲端載入資料。');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 當資料變化時，延遲後自動儲存到雲端
  useEffect(() => {
    if (isLoading) return;

    setIsSaving(true);
    const handler = setTimeout(async () => {
      try {
        const stateToSave = { teamMembers, holidays, defaultPreference };
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stateToSave),
        });
      } catch (e) {
        console.error("無法儲存資料到雲端", e);
        setError("儲存失敗！");
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [teamMembers, holidays, defaultPreference, isLoading]);


  const addTeamMember = useCallback((name: string) => {
    if (name.trim() === '') return;
    const newMember: TeamMember = { id: crypto.randomUUID(), name };
    setTeamMembers(prev => [...prev, newMember]);
  }, []);

  const removeTeamMember = useCallback((id: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== id));
    setHolidays(prevHolidays => 
      prevHolidays.map(holiday => ({
        ...holiday,
        applications: holiday.applications.filter(app => app.memberId !== id),
        ...(holiday.dailyAssignments && {
          dailyAssignments: holiday.dailyAssignments.filter(da => da.memberId !== id)
        })
      }))
    );
  }, []);

  const addHoliday = useCallback((name: string, startDate: string, endDate: string, slots: number, isSpecialLottery: boolean) => {
    if (name.trim() === '' || slots <= 0) return;
    const newHoliday: HolidayPeriod = {
      id: crypto.randomUUID(),
      name,
      startDate,
      endDate,
      slots,
      applications: [],
      isSpecialLottery,
      ...(isSpecialLottery && { dailyAssignments: [] }),
    };
    setHolidays(prev => [...prev, newHoliday]);
  }, []);
  
  const removeHoliday = useCallback((id: string) => {
    setHolidays(prev => prev.filter(holiday => holiday.id !== id));
    if (selectedHolidayId === id) {
      setSelectedHolidayId(null);
    }
  }, [selectedHolidayId]);
  
  const moveHoliday = useCallback((reorderedHolidays: HolidayPeriod[]) => {
    setHolidays(reorderedHolidays);
  }, []);

  const updateHolidayDetails = useCallback((holidayId: string, details: Partial<Pick<HolidayPeriod, 'startDate' | 'endDate' | 'slots'>>) => {
    setHolidays(prev => 
      prev.map(h => 
        h.id === holidayId ? { ...h, ...details } : h
      )
    );
  }, []);

  const addApplication = useCallback((holidayId: string, memberId: string, preference: number) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    setHolidays(prevHolidays => {
      return prevHolidays.map(holiday => {
        if (holiday.id === holidayId) {
          if (holiday.applications.some(app => app.memberId === memberId)) {
            alert(`${member.name} 已經申請過这个假期了。`);
            return holiday;
          }
          const newApplication: Application = {
            id: crypto.randomUUID(),
            memberId,
            memberName: member.name,
            preference,
          };
          return { ...holiday, applications: [...holiday.applications, newApplication] };
        }
        return holiday;
      });
    });
  }, [teamMembers]);

  const removeApplication = useCallback((holidayId: string, applicationId: string) => {
    setHolidays(prevHolidays => 
      prevHolidays.map(holiday => 
        holiday.id === holidayId 
          ? { ...holiday, applications: holiday.applications.filter(app => app.id !== applicationId) } 
          : holiday
      )
    );
  }, []);
  
  const updateApplicationPreference = useCallback((holidayId: string, applicationId: string, newPreference: number) => {
    setHolidays(prevHolidays =>
      prevHolidays.map(holiday => {
        if (holiday.id === holidayId) {
          return {
            ...holiday,
            applications: holiday.applications.map(app =>
              app.id === applicationId ? { ...app, preference: newPreference } : app
            ),
          };
        }
        return holiday;
      })
    );
  }, []);

  const addDailyAssignment = useCallback((holidayId: string, memberId: string, date: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    setHolidays(prev => prev.map(h => {
      if (h.id === holidayId) {
        const newAssignment: DailyAssignment = { date, memberId, memberName: member.name, type: 'volunteer' };
        return { ...h, dailyAssignments: [...(h.dailyAssignments || []), newAssignment] };
      }
      return h;
    }));
  }, [teamMembers]);

  const removeDailyAssignment = useCallback((holidayId: string, date: string) => {
    setHolidays(prev => prev.map(h => 
      h.id === holidayId 
        ? { ...h, dailyAssignments: h.dailyAssignments?.filter(da => da.date !== date) } 
        : h
    ));
  }, []);
  
  const getDatesBetween = (startDate: string, endDate: string) => {
    const dates = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };
  
  const runLottery = useCallback((holidayId: string) => {
    setHolidays(prevHolidays => {
      const holiday = prevHolidays.find(h => h.id === holidayId);
      if (!holiday || !holiday.isSpecialLottery) return prevHolidays;

      const allDates = getDatesBetween(holiday.startDate, holiday.endDate);
      const assignedDates = new Set(holiday.dailyAssignments?.map(da => da.date));
      const unassignedDates = allDates.filter(d => !assignedDates.has(d));

      const assignedMemberIds = new Set(holiday.dailyAssignments?.map(da => da.memberId));
      const availableMembers = teamMembers.filter(m => !assignedMemberIds.has(m.id));

      if (unassignedDates.length === 0 || availableMembers.length === 0) return prevHolidays;

      const shuffledMembers = [...availableMembers].sort(() => 0.5 - Math.random());
      
      const newAssignments: DailyAssignment[] = [];
      const slotsToFill = Math.min(unassignedDates.length, shuffledMembers.length);

      for(let i=0; i < slotsToFill; i++) {
        const member = shuffledMembers[i];
        const date = unassignedDates[i];
        newAssignments.push({ date, memberId: member.id, memberName: member.name, type: 'lottery' });
      }

      return prevHolidays.map(h => 
        h.id === holidayId 
          ? { ...h, dailyAssignments: [...(h.dailyAssignments || []), ...newAssignments] } 
          : h
      );
    });
  }, [teamMembers]);

  const clearLottery = useCallback((holidayId: string) => {
    setHolidays(prevHolidays => 
      prevHolidays.map(h => 
        h.id === holidayId 
          ? { ...h, dailyAssignments: h.dailyAssignments?.filter(da => da.type !== 'lottery') } 
          : h
      )
    );
  }, []);

  const selectedHoliday = useMemo(() => holidays.find(h => h.id === selectedHolidayId), [holidays, selectedHolidayId]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-xl text-gray-400">載入雲端資料中...</div>
  }
  
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-xl text-red-400">{error}</div>
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6 lg:p-8">
       <div className="fixed top-4 right-4 text-xs bg-gray-700 text-white px-3 py-1 rounded-full transition-opacity duration-300 z-50
        ${isSaving ? 'opacity-100' : 'opacity-0'}">
        自動儲存中...
      </div>
      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">
          快樂署北PA假日抽前系統
        </h1>
        <p className="text-gray-400 mt-2">透過期望排名或特殊抽籤模式管理團隊的假期排程。</p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        <div className="lg:col-span-1 flex flex-col gap-8">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-white">
              全域設定
            </h2>
            <label htmlFor="default-pref" className="block text-sm font-medium text-gray-300">
              預設權重
            </label>
            <input
              id="default-pref"
              type="number"
              value={defaultPreference}
              onChange={(e) => setDefaultPreference(Math.max(1, Number(e.target.value)))}
              min="1"
              className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <TeamMemberManager 
            members={teamMembers} 
            onAddMember={addTeamMember} 
            onRemoveMember={removeTeamMember}
          />
          <HolidayManager 
            holidays={holidays}
            selectedHolidayId={selectedHolidayId}
            onAddHoliday={addHoliday}
            onRemoveHoliday={removeHoliday}
            onSelectHoliday={setSelectedHolidayId}
            onMoveHoliday={moveHoliday}
          />
        </div>

        <div className="lg:col-span-2">
          {selectedHoliday ? (
             <HolidayDetail 
                key={selectedHoliday.id}
                holiday={selectedHoliday}
                allHolidays={holidays}
                teamMembers={teamMembers}
                defaultPreference={defaultPreference}
                onAddApplication={addApplication}
                onRemoveApplication={removeApplication}
                onUpdateApplicationPreference={updateApplicationPreference}
                onAddDailyAssignment={addDailyAssignment}
                onRemoveDailyAssignment={removeDailyAssignment}
                onRunLottery={runLottery}
                onClearLottery={clearLottery}
                onUpdateHolidayDetails={updateHolidayDetails}
             />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-800 rounded-xl p-6 border border-gray-700">
                <p className="text-gray-400 text-lg">請選擇一個假期以查看詳細資訊。</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;