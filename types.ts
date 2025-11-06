export interface TeamMember {
  id: string;
  name: string;
}

export interface Application {
  id: string;
  memberId: string;
  memberName: string;
  preference: number;
}

export interface DailyAssignment {
  date: string;
  memberId: string;
  memberName: string;
  type: 'volunteer' | 'lottery';
}

export interface HolidayPeriod {
  id:string;
  name: string;
  startDate: string;
  endDate: string;
  slots: number;
  applications: Application[];
  isSpecialLottery?: boolean;
  dailyAssignments?: DailyAssignment[];
  dailyLabels?: { [date: string]: string };
}