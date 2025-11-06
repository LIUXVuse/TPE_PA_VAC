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

  const updateHolidayDetails = useCallback((holidayId: string, details: Partial<Pick<HolidayPeriod, 'startDate' | 'endDate' | 'slots'>>) => {
    