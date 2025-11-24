import React from 'react';
import { GROUPS, GroupId } from '../types';

interface GroupSelectorProps {
  selectedGroup: GroupId | 'all';
  onSelect: (id: GroupId | 'all') => void;
}

const GroupSelector: React.FC<GroupSelectorProps> = ({ selectedGroup, onSelect }) => {
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-border-light p-6 mb-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-primary">그룹별 모아보기</h3>
        <button 
          onClick={() => onSelect('all')}
          className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors ${
            selectedGroup === 'all' 
              ? 'bg-primary text-white shadow-md' 
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          전체 보기
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {GROUPS.map((group) => (
          <button
            key={group.id}
            onClick={() => onSelect(group.id)}
            className={`
              flex items-center justify-center px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap snap-center transition-all duration-200 border-2
              ${selectedGroup === group.id 
                ? `${group.color} border-primary/20 text-primary shadow-md scale-105` 
                : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }
            `}
          >
            {group.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GroupSelector;