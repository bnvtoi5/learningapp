import React, { useMemo } from 'react';
import { School, Layers, Filter } from 'lucide-react';
import { Classroom } from '../types';
import { useTheme } from '../context/ThemeContext';
import { getDistinctClassNames, getClassroomsByName } from '../utils/classroomHelpers';

export interface ClassroomCascadingFilterProps {
  classrooms: Classroom[];
  selectedClassName: string;
  onSelectClassName: (name: string) => void;
  selectedClassId: string;
  onSelectClassId: (classId: string) => void;
  showAllOption?: boolean;
  allOptionLabel?: string;
  allNameLabel?: string;
  allCodeLabel?: string;
  layout?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md';
  className?: string;
}

export const ClassroomCascadingFilter: React.FC<ClassroomCascadingFilterProps> = ({
  classrooms = [],
  selectedClassName,
  onSelectClassName,
  selectedClassId,
  onSelectClassId,
  showAllOption = true,
  allOptionLabel,
  allNameLabel = allOptionLabel || 'Tất cả Tên Lớp',
  allCodeLabel = 'Tất cả Mã Lớp',
  layout = 'horizontal',
  size = 'sm',
  className = '',
}) => {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();

  // Danh sách Tên Lớp duy nhất (ví dụ: ["Lớp 9", "Lớp 8", ...])
  const distinctNames = useMemo(() => getDistinctClassNames(classrooms), [classrooms]);

  // Danh sách các Mã lớp tương ứng với Tên Lớp đã chọn
  const availableClassrooms = useMemo(() => {
    if (selectedClassName === 'all') {
      return classrooms;
    }
    return getClassroomsByName(classrooms, selectedClassName);
  }, [classrooms, selectedClassName]);

  const handleNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newName = e.target.value;
    onSelectClassName(newName);

    if (newName === 'all') {
      onSelectClassId('all');
    } else {
      const matched = getClassroomsByName(classrooms, newName);
      if (matched.length > 0) {
        if (!showAllOption) {
          // If required selection (no 'all' option), auto select first classroom ID
          onSelectClassId(matched[0].id);
        } else {
          // Keep 'all' or reset to 'all' within this class name
          onSelectClassId('all');
        }
      } else {
        onSelectClassId('all');
      }
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClassId = e.target.value;
    onSelectClassId(newClassId);

    // If a specific classId is picked while selectedClassName is 'all', auto sync selectedClassName
    if (newClassId !== 'all' && selectedClassName === 'all') {
      const target = classrooms.find(c => c.id === newClassId);
      if (target) {
        onSelectClassName(target.name.trim());
      }
    }
  };

  const isSmall = size === 'sm';
  const paddingClass = isSmall ? 'py-1.5 px-2.5 text-xs' : 'py-2.5 px-3 text-xs font-semibold';
  const iconSize = isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-wrap sm:flex-nowrap'} items-center gap-2 ${className}`}>
      {/* Tầng 1: Chọn Tên Lớp */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto flex-1 min-w-[140px]">
        <div className={`p-1.5 rounded-lg ${theme.badgeBg} text-emerald-500 shrink-0`}>
          <School className={iconSize} />
        </div>
        <select
          value={selectedClassName}
          onChange={handleNameChange}
          className={`w-full ${paddingClass} rounded-xl ${theme.inputBg} border ${theme.border} font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer transition-all`}
          title="Tầng 1: Chọn Tên Lớp"
        >
          {showAllOption && (
            <option value="all">{allNameLabel}</option>
          )}
          {distinctNames.map(name => {
            const count = classrooms.filter(c => c.name.trim() === name).length;
            return (
              <option key={name} value={name}>
                {name} ({count} mã lớp)
              </option>
            );
          })}
        </select>
      </div>

      {/* Tầng 2: Chọn Mã Lớp */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto flex-1 min-w-[140px]">
        <div className={`p-1.5 rounded-lg ${theme.badgeBg} text-sky-500 shrink-0`}>
          <Layers className={iconSize} />
        </div>
        <select
          value={selectedClassId}
          onChange={handleCodeChange}
          disabled={availableClassrooms.length === 0}
          className={`w-full ${paddingClass} rounded-xl ${theme.inputBg} border ${theme.border} font-mono text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer disabled:opacity-50 transition-all`}
          title="Tầng 2: Chọn Mã Lớp cụ thể"
        >
          {showAllOption && (
            <option value="all">
              {selectedClassName === 'all' ? allCodeLabel : `Tất cả mã lớp (${selectedClassName})`}
            </option>
          )}
          {availableClassrooms.map(c => (
            <option key={c.id} value={c.id}>
              Mã: {c.code} {selectedClassName === 'all' ? `(${c.name})` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
