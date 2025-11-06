import React, { useMemo } from 'react';
import { HolidayPeriod, TeamMember } from '../types';
import ClipboardDocumentListIcon from './icons/ClipboardDocumentListIcon';

interface HolidayOverviewProps {
  holidays: HolidayPeriod[];
  teamMembers: TeamMember[];
}

interface AssignedDay {
  holidayName: string;
  dateInfo: string;
  type: 'holiday' | 'onduty';
}

const HolidayOverview: React.FC<HolidayOverviewProps> = ({ holidays, teamMembers }) => {
  const overviewData = useMemo(() => {
    const data: Map<string, { memberName: string; assignedDays: AssignedDay[] }> = new Map();

    teamMembers.forEach(member => {
      data.set(member.id, { memberName: member.name, assignedDays: [] });
    });

    holidays.forEach(holiday => {
      if (holiday.isSpecialLottery) {
        holiday.dailyAssignments?.forEach(assignment => {
          const memberData = data.get(assignment.memberId);
          if (memberData) {
            const label = holiday.dailyLabels?.[assignment.date] || '';
            memberData.assignedDays.push({
              holidayName: `${holiday.name} (${label})`,
              dateInfo: assignment.date,
              type: 'onduty',
            });
          }
        });
      } else {
        const sortedApps = [...holiday.applications].sort((a, b) => a.preference - b.preference);
        const approvedApps = sortedApps.slice(0, holiday.slots);

        approvedApps.forEach(app => {
          const memberData = data.get(app.memberId);
          if (memberData) {
            memberData.assignedDays.push({
              holidayName: holiday.name,
              dateInfo: `${holiday.startDate} ~ ${holiday.endDate}`,
              type: 'holiday',
            });
          }
        });
      }
    });
    
    return Array.from(data.values()).sort((a, b) => {
        const aHolidayCount = a.assignedDays.filter(d => d.type === 'holiday').length;
        const bHolidayCount = b.assignedDays.filter(d => d.type === 'holiday').length;
        return bHolidayCount - aHolidayCount;
    });

  }, [holidays, teamMembers]);

  return (
    <div className="mt-12">
      <h2 className="text-3xl font-bold mb-6 text-white flex items-center">
        <ClipboardDocumentListIcon className="w-8 h-8 mr-3 text-indigo-400" />
        年度假期總覽
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {overviewData.map(({ memberName, assignedDays }) => {
          const approvedHolidays = assignedDays.filter(d => d.type === 'holiday');
          const onDutyDays = assignedDays.filter(d => d.type === 'onduty');

          return (
            <div key={memberName} className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col">
              <div className="flex justify-between items-baseline mb-4">
                <h3 className="text-xl font-bold text-white">{memberName}</h3>
                <div className="text-lg font-semibold text-blue-400 bg-blue-900/50 px-3 py-1 rounded-full">
                   <span>{approvedHolidays.length} 天休假</span>
                   {onDutyDays.length > 0 && (
                     <span className="text-yellow-400"> / {onDutyDays.length} 天值班</span>
                   )}
                </div>
              </div>
              <div className="flex-grow space-y-2 overflow-y-auto max-h-48 pr-2 custom-scrollbar">
                {assignedDays.length > 0 ? (
                  assignedDays.map((d, index) => (
                    <div key={index} className="bg-gray-700 p-2.5 rounded-md text-sm flex items-start gap-2">
                       <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${
                         d.type === 'holiday'
                           ? 'bg-green-500/20 text-green-300'
                           : 'bg-yellow-500/20 text-yellow-300'
                       }`}>
                         {d.type === 'holiday' ? '休' : '班'}
                       </span>
                      <div>
                        <p className="font-semibold text-gray-200">{d.holidayName}</p>
                        <p className="text-xs text-gray-400">{d.dateInfo}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500 text-sm">今年尚無已批准假期或值班。</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HolidayOverview;