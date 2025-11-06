import React, { useState } from 'react';
import { TeamMember } from '../types';
import UserPlusIcon from './icons/UserPlusIcon';
import TrashIcon from './icons/TrashIcon';

interface TeamMemberManagerProps {
  members: TeamMember[];
  onAddMember: (name: string) => void;
  onRemoveMember: (id: string) => void;
}

const TeamMemberManager: React.FC<TeamMemberManagerProps> = ({ members, onAddMember, onRemoveMember }) => {
  const [newMemberName, setNewMemberName] = useState('');

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    onAddMember(newMemberName);
    setNewMemberName('');
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-white flex items-center">
        <UserPlusIcon className="w-6 h-6 mr-3 text-blue-400" />
        團隊成員
      </h2>
      <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newMemberName}
          onChange={(e) => setNewMemberName(e.target.value)}
          placeholder="新成員姓名"
          className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-500 transition-colors duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!newMemberName.trim()}
        >
          新增
        </button>
      </form>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
        {members.length > 0 ? members.map(member => (
          <div key={member.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-md">
            <span className="text-gray-200">{member.name}</span>
            <button onClick={() => onRemoveMember(member.id)} className="text-gray-400 hover:text-red-500 transition-colors">
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        )) : <p className="text-gray-500 text-center py-4">尚無團隊成員。</p>}
      </div>
    </div>
  );
};

export default TeamMemberManager;