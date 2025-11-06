import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { TeamMember, HolidayPeriod, Application, DailyAssignment } from './types';
import TeamMemberManager from './components/TeamMemberManager';
import HolidayManager from './components/HolidayManager';
import HolidayDetail from './components/HolidayDetail';
import HolidayOverview from './components/HolidayOverview';
import HelpModal from './components/HelpModal';
import QuestionMarkCircleIcon from './components/icons/QuestionMarkCircleIcon';

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

const App: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [holidays, setHolidays] = useState<HolidayPeriod[]>([]);
  const [defaultPreference, setDefaultPreference] = useState(8);
  const [selectedHolidayId, setSelectedHolidayId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // 從雲端載入資料
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('無法從伺服器獲取資料');
        const data = await response.json();
        setTeamMembers(data.teamMembers || []);
        setHolidays(data.holidays || []);
        setDefaultPreference(data.defaultPreference || 8);
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
  
  const updateTeamMember = useCallback((memberId: string, newName: string) => {
    if (!newName.trim()) return;

    setTeamMembers(prev =>
      prev.map(member =>
        member.id === memberId ? { ...member, name: newName } : member
      )
    );

    setHolidays(prevHolidays =>
      prevHolidays.map(holiday => ({
        ...holiday,
        applications: holiday.applications.map(app =>
          app.memberId === memberId ? { ...app, memberName: newName } : app
        ),
        ...(holiday.dailyAssignments && {
          dailyAssignments: holiday.dailyAssignments.map(da =>
            da.memberId === memberId ? { ...da, memberName: newName } : da
          )
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
    };

    if (isSpecialLottery) {
        const dates = getDatesBetween(startDate, endDate);
        const chineseDayLabels = ["除夕", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十"];
        newHoliday.dailyLabels = {};
        newHoliday.dailyAssignments = [];
        dates.forEach((date, index) => {
            newHoliday.dailyLabels[date] = chineseDayLabels[index] || `第 ${index + 1} 天`;
        });
    }

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

  const updateHolidayDetails = useCallback((holidayId: string, details: Partial<Pick<HolidayPeriod, 'name' | 'startDate' | 'endDate' | 'slots'>>) => {
    setHolidays(prev => 
      prev.map(h => 
        h.id === holidayId ? { ...h, ...details } : h
      )
    );
  }, []);

  const addApplication = useCallback((holidayId: string, memberId: string, preference: number) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    const newApplication: Application = {
      id: crypto.randomUUID(),
      memberId,
      memberName: member.name,
      preference,
    };

    setHolidays(prev =>
      prev.map(h =>
        h.id === holidayId
          ? { ...h, applications: [...h.applications, newApplication] }
          : h
      )
    );
  }, [teamMembers]);

  const removeApplication = useCallback((holidayId: string, applicationId: string) => {
    setHolidays(prev =>
      prev.map(h => {
        if (h.id === holidayId) {
          return {
            ...h,
            applications: h.applications.filter(app => app.id !== applicationId),
          };
        }
        return h;
      })
    );
  }, []);

  const updateApplicationPreference = useCallback((holidayId: string, applicationId: string, newPreference: number) => {
    setHolidays(prev =>
      prev.map(h => {
        if (h.id === holidayId) {
          return {
            ...h,
            applications: h.applications.map(app =>
              app.id === applicationId ? { ...app, preference: newPreference } : app
            ),
          };
        }
        return h;
      })
    );
  }, []);

  const addDailyAssignment = useCallback((holidayId: string, memberId: string, date: string) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    const newAssignment: DailyAssignment = {
      date,
      memberId,
      memberName: member.name,
      type: 'volunteer',
    };

    setHolidays(prev =>
      prev.map(h => {
        if (h.id === holidayId) {
          const existingAssignments = h.dailyAssignments || [];
          return {
            ...h,
            dailyAssignments: [...existingAssignments, newAssignment],
          };
        }
        return h;
      })
    );
  }, [teamMembers]);

  const removeDailyAssignment = useCallback((holidayId: string, date: string) => {
    setHolidays(prev =>
      prev.map(h => {
        if (h.id === holidayId) {
          return {
            ...h,
            dailyAssignments: (h.dailyAssignments || []).filter(da => da.date !== date),
          };
        }
        return h;
      })
    );
  }, []);

  const runLottery = useCallback((holidayId: string) => {
    setHolidays(prev =>
      prev.map(h => {
        if (h.id !== holidayId || !h.isSpecialLottery) return h;

        const dates = getDatesBetween(h.startDate, h.endDate);
        const assignedMemberIds = new Set((h.dailyAssignments || []).map(da => da.memberId));
        const unassignedDates = dates.filter(date => !(h.dailyAssignments || []).some(da => da.date === date));
        
        let availableMembers = teamMembers.filter(m => !assignedMemberIds.has(m.id));
        // Shuffle available members
        availableMembers.sort(() => Math.random() - 0.5);

        const newAssignments: DailyAssignment[] = [];
        unassignedDates.forEach(date => {
          if (availableMembers.length > 0) {
            const member = availableMembers.pop()!;
            newAssignments.push({
              date,
              memberId: member.id,
              memberName: member.name,
              type: 'lottery',
            });
          }
        });

        return {
          ...h,
          dailyAssignments: [...(h.dailyAssignments || []), ...newAssignments],
        };
      })
    );
  }, [teamMembers]);

  const clearLottery = useCallback((holidayId: string) => {
    setHolidays(prev =>
      prev.map(h => {
        if (h.id === holidayId) {
          return {
            ...h,
            dailyAssignments: (h.dailyAssignments || []).filter(da => da.type !== 'lottery'),
          };
        }
        return h;
      })
    );
  }, []);
  
  const autoAssignHolidays = useCallback(() => {
    setHolidays(prevHolidays => {
      let holidaysCopy = JSON.parse(JSON.stringify(prevHolidays));
      let changed = true;

      while (changed) {
        changed = false;

        const memberHolidayCounts = teamMembers.map(member => {
            const count = holidaysCopy.reduce((acc: number, h: HolidayPeriod) => {
                if (h.isSpecialLottery) {
                    return acc + (h.dailyAssignments?.filter(da => da.memberId === member.id).length || 0);
                }
                const sortedApps = [...h.applications].sort((a, b) => a.preference - b.preference);
                const approvedApps = sortedApps.slice(0, h.slots);
                return acc + (approvedApps.some(app => app.memberId === member.id) ? 1 : 0);
            }, 0);
            return { memberId: member.id, count };
        }).sort((a, b) => a.count - b.count);

        const leastHolidayMemberId = memberHolidayCounts[0]?.memberId;
        if (!leastHolidayMemberId) break;

        for (const holiday of holidaysCopy) {
            if (holiday.isSpecialLottery || holiday.applications.length >= holiday.slots || !holiday.startDate) continue;

            const memberAlreadyApplied = holiday.applications.some(app => app.memberId === leastHolidayMemberId);
            if (memberAlreadyApplied) continue;

            const holidayYear = new Date(holiday.startDate).getFullYear();
            const usedPrefs = holidaysCopy
                .filter((h: HolidayPeriod) => !h.isSpecialLottery && h.startDate && new Date(h.startDate).getFullYear() === holidayYear)
                .flatMap((h: HolidayPeriod) => h.applications)
                .filter((app: Application) => app.memberId === leastHolidayMemberId)
                .map((app: Application) => app.preference);

            const allPossiblePrefs = Array.from({ length: defaultPreference }, (_, i) => i + 1);
            const availablePrefs = allPossiblePrefs.filter(p => !usedPrefs.includes(p));
            
            if (availablePrefs.length > 0) {
                // 原本是取最大值(最低優先)，改為隨機選取一個可用的權重以增加公平性
                const preferenceToUse = availablePrefs[Math.floor(Math.random() * availablePrefs.length)];
                const member = teamMembers.find(m => m.id === leastHolidayMemberId);
                if (member) {
                    holiday.applications.push({
                        id: crypto.randomUUID(),
                        memberId: member.id,
                        memberName: member.name,
                        preference: preferenceToUse
                    });
                    changed = true;
                    break; 
                }
            }
        }
      }
      return holidaysCopy;
    });
    alert('已為休假最少的成員自動分配剩餘假期名額。');
  }, [teamMembers, defaultPreference]);

  const updateDailyLabel = useCallback((holidayId: string, date: string, newLabel: string) => {
    setHolidays(prev =>
      prev.map(h => {
        if (h.id === holidayId) {
          return {
            ...h,
            dailyLabels: {
              ...(h.dailyLabels || {}),
              [date]: newLabel,
            },
          };
        }
        return h;
      })
    );
  }, []);

  const selectedHoliday = useMemo(() => {
    return holidays.find(h => h.id === selectedHolidayId) || null;
  }, [holidays, selectedHolidayId]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-screen text-xl">載入中...</div>;
  }

  return (
    <>
      <div className="min-h-screen container mx-auto p-4 md:p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white">快樂署北PA假日抽籤許願系統</h1>
            <p className="text-gray-400 mt-1">一個公平、透明的假期排班解決方案。</p>
          </div>
          <button 
            onClick={() => setIsHelpModalOpen(true)}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <QuestionMarkCircleIcon className="w-6 h-6"/>
            說明
          </button>
        </header>

        {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">{error}</div>}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-1 flex flex-col gap-8">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-white">全域設定</h2>
                <div className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="default-preference" className="block text-sm font-medium text-gray-300 mb-1">預設權重 (及權重上限)</label>
                        <input
                            type="number"
                            id="default-preference"
                            value={defaultPreference}
                            onChange={(e) => setDefaultPreference(Math.max(1, Math.min(10, Number(e.target.value))))}
                            min="1"
                            max="10"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
                        />
                    </div>
                    <button 
                        onClick={autoAssignHolidays}
                        className="w-full bg-indigo-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-indigo-500 transition-colors duration-200"
                    >
                        自動分配剩餘假期
                    </button>
                </div>
            </div>

            <TeamMemberManager 
              members={teamMembers} 
              onAddMember={addTeamMember} 
              onRemoveMember={removeTeamMember} 
              onUpdateMember={updateTeamMember}
            />
            <HolidayManager
              holidays={holidays}
              selectedHolidayId={selectedHolidayId}
              onAddHoliday={addHoliday}
              onRemoveHoliday={removeHoliday}
              onSelectHoliday={setSelectedHolidayId}
              onMoveHoliday={moveHoliday}
            />
          </aside>
          <main className="lg:col-span-2">
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
                onUpdateDailyLabel={updateDailyLabel}
              />
            ) : (
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg h-full flex justify-center items-center">
                <p className="text-gray-500 text-xl">請從左側選擇一個假期以查看詳情。</p>
              </div>
            )}
          </main>
        </div>
        <HolidayOverview holidays={holidays} teamMembers={teamMembers} />
      </div>
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      {isSaving && <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">儲存中...</div>}
    </>
  );
};

export default App;
